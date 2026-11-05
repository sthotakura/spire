import { downsideOf, upsideOf, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

export interface MarketingName {
  name: string
  // Where the label comes from: plain-language regulator wording, the Swiss Structured Products Association's product types, or the title on one issuer's filings.
  vocabulary: 'US descriptive' | 'SSPA' | 'Market usage' | 'Issuer title'
  reason: string
  // The parts of the note that make the name fit.
  concepts: ConceptId[]
}

const isRate = (rate: number | undefined): rate is number => rate !== undefined && Number.isFinite(rate) && rate > 0
const percentText = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`

export type ProductCategory = 'Capital Protection' | 'Yield Enhancement' | 'Participation'

// The Swiss taxonomy's broad category for the note, or none when the model's terms do not place it. One category at most.
// Protection decides first: any protection above 0% is Capital Protection, so a buffer or a cap does not change it.
// A deposit repays principal in full, which is what places it there. The rules are recorded in docs/marketing-names.md.
export function productCategory(note: Product): ProductCategory | undefined {
  const protection = note.payoff.principalProtection
  const upside = upsideOf(note)?.rate
  const downside = downsideOf(note)?.rate

  if (protection !== undefined && Number.isFinite(protection) && protection > 0) return 'Capital Protection'
  if (note.wrapper === 'deposit' && isRate(upside)) return 'Capital Protection'
  // A coupon in place of upside, fixed or contingent, as in the Swiss Express and reverse convertible types, with or without a call.
  if (note.wrapper === 'note' && note.coupon !== undefined && upside === undefined) return 'Yield Enhancement'
  // A call without a coupon, or a coupon beside upside participation, is not placed, so it gets no category.
  if (note.wrapper === 'note' && note.redemption === 'bullet' && note.coupon === undefined && (isRate(upside) || isRate(downside))) return 'Participation'
  return undefined
}

// The names below describe the payment at maturity. A call or a coupon changes what the product pays, so the reason says so.
function maturityOnlyNote(note: Product, name: string): string {
  const parts: string[] = []
  if (note.redemption !== 'bullet') parts.push(`The name describes the payment at maturity; ${note.redemption.kind === 'autocall' ? 'an autocall' : 'an issuer call'} can end the product earlier.`)
  if (note.coupon !== undefined) parts.push(note.coupon.barrier === undefined ? 'The name does not cover the fixed coupon, paid on every coupon review.' : 'The name does not cover the contingent coupon, paid on the reviews that meet its barrier.')
  if (note.payoff.digitalReturn !== undefined && name !== 'Digital return note') parts.push('The name does not cover the digital return, a fixed return paid as a minimum at or above its barrier.')
  return parts.join(' ')
}

// Names a structure like this one is commonly sold under. They are hints, not definitions, and several can apply at once.
// The rules are recorded in docs/marketing-names.md. A note that fits none returns an empty list.
export function marketingNames(note: Product): MarketingName[] {
  const protection = note.payoff.principalProtection
  const upside = upsideOf(note)?.rate
  const downside = downsideOf(note)?.rate
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
  const upsideBarrier = upsideOf(note)?.barrier
  const hasProtection = protection !== undefined && Number.isFinite(protection) && protection > 0
  const hasCap = cap !== undefined && Number.isFinite(cap) && cap > 0
  const names: MarketingName[] = []

  if (hasProtection && protection === 1) {
    names.push({
      name: 'Principal-protected note',
      vocabulary: 'US descriptive',
      reason: `The payment at maturity is at least the full principal, subject to the issuer's ability to pay.${upside ? ' In the Swiss taxonomy this is a Capital Protection Note with Participation.' : note.coupon?.barrier !== undefined ? ' In the Swiss taxonomy this is a Capital Protection Certificate with Coupon.' : ''}`,
      concepts: ['protection'],
    })
  } else if (hasProtection && protection < 1) {
    names.push({
      name: 'Partially principal-protected note',
      vocabulary: 'US descriptive',
      reason: 'Only part of the principal is protected. The Swiss taxonomy uses "partial capital protection" for 90% to 100% of principal; US investor material uses it for any level below 100%.',
      concepts: ['protection'],
    })
  }

  // Losses start only past the buffer, at the downside participation rate.
  if (buffer !== undefined && Number.isFinite(buffer) && buffer > 0 && buffer <= 1 && isRate(downside)) {
    names.push({
      name: 'Buffered note',
      vocabulary: 'US descriptive',
      reason: `The first ${percentText(buffer)} of a fall is absorbed. A larger fall reduces principal by the amount it goes past the buffer, at the downside participation rate.`,
      concepts: ['buffer', 'downside'],
    })
  }

  // A deposit repays principal in full, and its return depends on the underlier.
  if (note.wrapper === 'deposit' && isRate(upside)) {
    names.push({
      name: 'Market-linked deposit',
      vocabulary: 'US descriptive',
      reason: 'Principal is repaid in full at the end of the term, and the return depends on the underlier. In the US it is sold as a market-linked CD; EU and UK rules call it a structured deposit.',
      concepts: ['wrapper', 'upside'],
    })
  }

  // Without protection, a buffer, a barrier (on either direction) or a cap. A value that is present but invalid is not absent, so a draft with one gets no name here.
  // These names describe notes, so a deposit gets none of them. They describe a note that only follows the underlier to maturity,
  // so a call or a coupon rules them out.
  const unprotected = protection === undefined || protection === 0
  if (note.wrapper === 'note' && note.redemption === 'bullet' && note.coupon === undefined && note.payoff.digitalReturn === undefined && unprotected && buffer === undefined && barrier === undefined && upsideBarrier === undefined && cap === undefined && isRate(upside) && (downside === undefined || isRate(downside))) {
    if (downside === 1 && upside === 1) {
      names.push({ name: 'Tracker', vocabulary: 'SSPA', reason: 'The payment follows the underlier one for one, up and down.', concepts: ['upside', 'downside'] })
    } else if (downside === 1 && upside > 1) {
      names.push({ name: 'Outperformance', vocabulary: 'SSPA', reason: 'The payment gains more than one for one when the underlier rises and follows it one for one when it falls.', concepts: ['upside', 'downside'] })
    } else {
      names.push({
        name: 'Participation note',
        vocabulary: 'SSPA',
        reason: downside === undefined
          ? 'The payment shares in a rise of the underlier at the upside participation rate. A fall does not reduce principal.'
          : 'The payment follows the underlier up and down, at a participation rate for each direction.',
        concepts: downside === undefined ? ['upside'] : ['upside', 'downside'],
      })
    }
  }

  // Upside participation up to an upside barrier, and a rebate or nothing from it on. Seller usage, not a regulator's or the
  // SSPA's. The name follows the shape of the payoff chart, so it fits either observation; sellers observe the barrier on every
  // close, so the reason says how a barrier read on the final date differs. With full protection it is a "Shark fin PP";
  // otherwise a fall must leave principal unchanged, so there is no downside participation.
  const sharkFinShape = note.wrapper === 'note' && isRate(upside) && upsideBarrier !== undefined && Number.isFinite(upsideBarrier.level) && upsideBarrier.level > 1
  const sharkFinCaveat = upsideBarrier?.observation === 'daily-close'
    ? 'The name comes from the shape of the payoff chart. The barrier is observed on every close, so a rebate is paid if the underlier ever closed above it, even if it later fell back.'
    : 'The name comes from the shape of the payoff chart. Sellers usually observe the barrier on every trading day, so a rebate is paid if the underlier ever closed above it; this barrier is observed only on the final date, so the contract differs.'
  if (sharkFinShape && protection === 1) {
    names.push({
      name: 'Shark fin PP',
      vocabulary: 'Market usage',
      reason: `Principal is protected and the payment follows a rise up to the upside barrier. Above it, participation ends and a fixed rebate, if there is one, is paid. PP stands for principal protected. ${sharkFinCaveat}`,
      concepts: ['protection', 'upside', 'barrier'],
    })
  } else if (sharkFinShape && downside === undefined) {
    names.push({
      name: 'Shark fin note',
      vocabulary: 'Market usage',
      reason: `The payment follows a rise up to the upside barrier. Above it, participation ends and a fixed rebate, if there is one, is paid. A fall leaves principal unchanged, since there is no downside participation. ${sharkFinCaveat}`,
      concepts: ['upside', 'barrier'],
    })
  }

  // Principal plus the absolute value of the return until a barrier on either side is reached. The name is the product title in
  // public pricing supplements; it is seller usage, not a regulator's or the SSPA's name.
  if (note.wrapper === 'note' && note.payoff.barrierAbsoluteReturn !== undefined) {
    names.push({
      name: 'Barrier absolute return note',
      vocabulary: 'Market usage',
      reason: 'The payment is principal plus the absolute value of the underlier’s return, a rise or a fall alike, until it goes beyond a barrier on either side. Then it is a fixed return. The name is the product title in public pricing supplements, not a regulator’s or the Swiss taxonomy’s.',
      concepts: ['absolute-return', 'barrier'],
    })
  }

  // The Swiss Bonus, Bonus Outperformance and Twin Win types: a barrier below the initial level that, until it is reached, leaves at least principal,
  // and once reached makes the note follow the underlier one for one. They describe a note that only follows the underlier to maturity.
  const absoluteReturn = downsideOf(note)?.absoluteReturn
  const initialLookback = note.underlier.determination.initial.kind === 'lookback'
  if (note.wrapper === 'note' && note.redemption === 'bullet' && note.coupon === undefined && note.payoff.digitalReturn === undefined && unprotected && buffer === undefined && barrier !== undefined && cap === undefined && upsideBarrier === undefined && downside === 1 && isRate(upside)) {
    const observed = barrier.observation === 'daily-close'
      ? 'The Swiss barrier is observed during the product’s life, as this one is, on every close.'
      : 'The Swiss barrier is observed during the product’s life; this one is read on the final date only, so the contract differs.'
    const lookback = initialLookback ? ' The initial level here is a lookback level, which the Swiss type does not have.' : ''
    const below = `Below the barrier level, ${percentText(barrier.level)} of the initial level, the whole fall counts one for one, as in a tracker.`
    if (absoluteReturn !== undefined) {
      names.push({
        name: 'Twin-win certificate',
        vocabulary: 'SSPA',
        reason: `A fall that ends at or above the barrier is paid as a gain, ${percentText(absoluteReturn.rate)} of its size, so the holder can gain whether the underlier rises or falls. ${below} The Swiss taxonomy calls this a Twin Win Certificate (1340); it does not state the rates, which here are ${percentText(upside)} of a rise and ${percentText(absoluteReturn.rate)} of a fall. ${observed}${lookback}`,
        concepts: ['upside', 'downside', 'barrier', 'absolute-return'],
      })
    } else if (upside === 1) {
      names.push({
        name: 'Bonus certificate',
        vocabulary: 'SSPA',
        reason: `The payment is at least principal while the downside barrier is not reached, and a rise is shared one for one. ${below} The Swiss taxonomy calls this a Bonus Certificate (1320), and notes that a worst-of basket allows a higher bonus level or a lower barrier. ${observed}${lookback}`,
        concepts: ['upside', 'downside', 'barrier'],
      })
    } else if (upside > 1) {
      names.push({
        name: 'Bonus outperformance certificate',
        vocabulary: 'SSPA',
        reason: `The payment is at least principal while the downside barrier is not reached, and a rise is shared more than one for one, at ${percentText(upside)}. ${below} The Swiss taxonomy calls this a Bonus Outperformance Certificate (1330), and notes that a worst-of basket allows a higher bonus level or a lower barrier. ${observed}${lookback}`,
        concepts: ['upside', 'downside', 'barrier'],
      })
    }
  }

  // A fixed return on principal paid as a floor while the final level is at or above its barrier. Issuers put "digital" in the titles of
  // public pricing supplements for this payoff; it is seller usage, not a regulator's or the SSPA's name.
  if (note.wrapper === 'note' && note.payoff.digitalReturn !== undefined) {
    const { amount, barrier: digitalBarrier } = note.payoff.digitalReturn
    names.push({
      name: 'Digital return note',
      vocabulary: 'Market usage',
      reason: `A fixed return of ${(amount * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}% on principal is paid as a minimum while the final level is at or above ${percentText(digitalBarrier.level)} of the initial level. Below that level the digital return pays nothing. The name is the word issuers use in the titles of public pricing supplements for this payoff, not a regulator’s or the Swiss taxonomy’s.`,
      concepts: ['digital-return'],
    })
  }

  if (hasCap && upside !== undefined) {
    names.push({ name: 'Capped participation', vocabulary: 'US descriptive', reason: 'Upside participation stops at a maximum return, so the payment cannot rise past the cap.', concepts: ['upside', 'cap'] })
  }

  // A rise shared at more than 100%, whatever else the note does. The name describes the upside only. A value that is present but invalid
  // is not absent, so a draft with one gets no name here.
  if (note.wrapper === 'note' && isRate(upside) && upside > 1 && (cap === undefined || hasCap) && (downside === undefined || isRate(downside))) {
    names.push({
      name: 'Leveraged participation note',
      vocabulary: 'US descriptive',
      reason: `A rise pays ${percentText(upside)} of its size, more than one for one. US investor material calls this a leveraged or enhanced participation rate. The name describes the upside and says nothing about a fall.`,
      concepts: ['upside'],
    })
  }

  const maturityNames = names.map((name) => {
    const caveat = maturityOnlyNote(note, name.name)
    return caveat ? { ...name, reason: `${name.reason} ${caveat}` } : name
  })
  return [...maturityNames, ...leveragedUpsideNames(note), ...callAndCouponNames(note)]
}

// Issuer titles for a rise shared at more than 100%. The plain titles describe the upside, so they apply whatever the fall does, and a note
// that differs from the filings says so. A title that names a downside shape, such as Buffered PLUS, needs that shape and principal at risk.
// The filings pay only at maturity, in cash, so a call, a coupon or delivery rules them all out. The rules and sources are in docs/marketing-names.md.
function leveragedUpsideNames(note: Product): MarketingName[] {
  const { payoff } = note
  const upside = upsideOf(note)
  const downside = downsideOf(note)
  const protection = payoff.principalProtection
  const cap = upside?.cap
  if (note.wrapper !== 'note' || note.redemption !== 'bullet' || note.coupon !== undefined || note.settlement === 'delivery') return []
  if (payoff.minimumReturn !== undefined || payoff.barrierAbsoluteReturn !== undefined) return []
  if (protection !== undefined && !(Number.isFinite(protection) && protection >= 0 && protection <= 1)) return []
  if (upside === undefined || !isRate(upside.rate) || upside.rate <= 1 || upside.barrier !== undefined) return []
  if (downside !== undefined && !isRate(downside.rate)) return []
  if (cap !== undefined && !(Number.isFinite(cap) && cap > 0)) return []

  const hasCap = cap !== undefined
  const rise = `A rise pays ${percentText(upside.rate)} of its size${hasCap ? `, up to the ${percentText(cap)} cap` : ''}.`
  // A title is capped on every filing read, on none, or on some (left undefined). A note that differs says so, as the shark fin reason does for its barrier.
  const titled = (name: string, terms: string, source: string, concepts: ConceptId[], capInSources?: boolean): MarketingName => {
    const differs = capInSources === undefined || capInSources === hasCap ? '' : capInSources ? ' The filings read have a maximum return and this note has none, so the contract differs.' : ' The filings read have no maximum return and this note has a cap, so the contract differs.'
    return { name, vocabulary: 'Issuer title', reason: `${rise} ${terms} ${source}${differs}`, concepts }
  }
  const digital = payoff.digitalReturn
  const plusSource = 'Morgan Stanley uses the title; PLUS stands for Performance Leveraged Upside Securities, its service mark.'

  if (digital === undefined && downside?.buffer === undefined && downside?.barrier === undefined && downside?.absoluteReturn === undefined) {
    const isProtected = protection !== undefined && protection > 0
    const fall = downside?.rate === 1 && !isProtected
      ? 'A fall costs principal one for one.'
      : `${downside === undefined && !isProtected ? 'A fall leaves principal unchanged here.' : 'A fall does not cost principal one for one here.'} The name describes the upside; the filings read lose principal one for one on a fall, so the contract differs.`
    return [
      titled('PLUS', fall, plusSource, ['upside'], true),
      titled('Accelerated return note', fall, 'BofA uses the title; Accelerated Return Notes and ARNs are its registered service marks.', ['upside'], true),
      titled('Return enhanced note', fall, 'JPMorgan uses the title.', ['upside'], true),
    ]
  }
  // The other titles name a downside shape, so they need that shape and principal at risk.
  if (downside === undefined || (protection !== undefined && protection !== 0)) return []
  const { rate, buffer, barrier, absoluteReturn } = downside
  const oneForOne = rate === 1

  if (digital !== undefined) {
    // The fixed return is a floor, so at or above a 100% barrier the note pays the greater of it and the leveraged rise.
    if (!oneForOne || hasCap || buffer !== undefined || barrier !== undefined || absoluteReturn !== undefined || digital.barrier.level !== 1 || digital.barrier.observation !== 'final') return []
    return [titled('Leveraged market-linked step up note', `At or above the initial level the payment is the greater of that and a fixed return of ${percentText(digital.amount)}. Below it a fall costs one for one.`, 'Barclays uses the title, where the step-up is a fixed return paid at maturity.', ['upside', 'digital-return'])]
  }

  if (buffer !== undefined) {
    if (!Number.isFinite(buffer) || buffer <= 0 || buffer >= 1) return []
    const absorbed = `The first ${percentText(buffer)} of a fall is absorbed.`
    if (absoluteReturn !== undefined) {
      if (!oneForOne) return []
      return [titled('Dual directional buffered PLUS', `${absorbed} A fall within the buffer is paid as a gain, and a larger one costs principal one for one past the buffer.`, plusSource, ['upside', 'buffer', 'absolute-return'])]
    }
    if (oneForOne) return [titled('Buffered PLUS', `${absorbed} A larger fall costs principal one for one past the buffer.`, plusSource, ['upside', 'buffer'], true)]
    // JPMorgan's downside rate restores the whole fall once past the buffer. The tolerance matches a filing's printed 1.1765 for a 15% buffer.
    if (Math.abs(rate * (1 - buffer) - 1) < 1e-4) return [titled('Buffered return enhanced note', `${absorbed} Past the buffer the rate of ${percentText(rate)} wins back what it absorbed, so a total loss is possible.`, 'JPMorgan uses the title, with or without a maximum return.', ['upside', 'buffer'])]
    return []
  }

  if (barrier !== undefined) {
    if (!oneForOne || barrier.observation !== 'final') return []
    if (absoluteReturn !== undefined) {
      return [titled('Dual directional trigger PLUS', `A fall that ends at or above ${percentText(barrier.level)} of the initial level is paid as a gain, ${percentText(absoluteReturn.rate)} of its size, and below that the whole fall counts one for one.`, `${plusSource} The trigger is this barrier.`, ['upside', 'barrier', 'absolute-return'])]
    }
    const held = `Principal is repaid while the final level is at or above ${percentText(barrier.level)} of the initial level, and below that the whole fall counts one for one.`
    return [
      titled('Trigger PLUS', held, `${plusSource} The trigger is this barrier.`, ['upside', 'barrier']),
      titled('Accelerated barrier note', held, 'JPMorgan uses the title.', ['upside', 'barrier'], false),
      titled('Enhanced return note', held, 'BofA uses the title, where the barrier is called a threshold value, on the least performing of several underliers.', ['upside', 'barrier'], false),
    ]
  }

  return []
}

// Names for how the product ends and what it pays while it lasts. Each is its own chip, beside the names for the maturity payment.
// The rules are recorded in docs/call-and-coupon-names.md.
function callAndCouponNames(note: Product): MarketingName[] {
  if (note.wrapper !== 'note') return []
  const { redemption, coupon } = note
  const names: MarketingName[] = []

  if (redemption !== 'bullet' && redemption.kind === 'autocall') {
    names.push({
      name: 'Autocallable note',
      vocabulary: 'US descriptive',
      reason: 'The product ends early on the first review that can call where the underlier is at or above the call trigger, and repays principal plus the call amount. Otherwise it runs to maturity.',
      concepts: ['redemption'],
    })
  }
  // A call amount for each year elapsed grows the longer the product goes uncalled, which sellers call a snowball. Market usage only,
  // and some sellers' snowballs add a barrier observed every day, so the reason says this one's fall is as its payoff states.
  if (redemption !== 'bullet' && redemption.kind === 'autocall' && redemption.callAmountBasis === 'per-year' && isRate(redemption.callAmount)) {
    names.push({
      name: 'Snowball autocall',
      vocabulary: 'Market usage',
      reason: `A call pays ${percentText(redemption.callAmount)} for each year elapsed, so every review the product is not called adds to what the next call pays, and the payment snowballs. Sellers use the name; some of their snowballs also have a barrier observed on every close, while what this one pays below the trigger at maturity is as its payoff states.`,
      concepts: ['redemption', 'call-amount'],
    })
    // The same call payment under an issuer's title. "Step up" in other titles is a fixed return at maturity, so the reason says which.
    names.push({
      name: 'Autocallable note with step-up premium',
      vocabulary: 'Market usage',
      reason: `The call premium steps up by ${percentText(redemption.callAmount)} for each year elapsed, so it rises on every review the product is not called. Some issuers put this in the title. It is not a step-up note, whose step-up is a fixed return paid at maturity.`,
      concepts: ['redemption', 'call-amount'],
    })
  }
  if (redemption !== 'bullet' && redemption.kind === 'issuer-call') {
    names.push({
      name: 'Callable note',
      vocabulary: 'US descriptive',
      reason: 'The issuer may end the product early on a review that can call, and need not. Whether it does is the issuer’s choice, not a test of the underlier, so the scenario chooses the review.',
      concepts: ['redemption'],
    })
  }
  if (coupon?.barrier !== undefined) {
    names.push({
      name: 'Contingent coupon note',
      vocabulary: 'US descriptive',
      reason: `A coupon is paid on each coupon review where the underlier is at or above the coupon barrier, and missed below it.${coupon.memory ? ' With memory, a missed coupon is paid later, with the next coupon that meets the barrier.' : ''} US offering documents call it contingent interest, contingent income or a contingent coupon; the Swiss taxonomy calls it a conditional coupon.`,
      concepts: ['coupon'],
    })
  }

  // The Swiss Express-Barrier-Certificate: coupons in place of upside, an autocall, and a barrier below which the holder bears the fall.
  // Without a barrier the Swiss type's maturity payment is unverified, so a buffer or no downside feature gets no Express name. Its
  // coupon "depends on conditions", so a fixed coupon gets none either.
  const protection = note.payoff.principalProtection
  const unprotected = protection === undefined || protection === 0
  const downside = downsideOf(note)
  if (redemption !== 'bullet' && redemption.kind === 'autocall' && coupon?.barrier !== undefined && unprotected && upsideOf(note) === undefined && note.payoff.barrierAbsoluteReturn === undefined && downside?.barrier !== undefined && downside.buffer === undefined) {
    names.push({
      name: 'Express certificate',
      vocabulary: 'SSPA',
      reason: 'The return is the coupons, with no share in a rise. The product is called early when the underlier is at or above the trigger on a review, and below the downside barrier at maturity the holder bears the fall. The Swiss taxonomy calls this an Express-Barrier-Certificate.',
      // The autocall is what makes it an Express certificate, so the chip highlights the redemption, not the whole payoff.
      concepts: ['redemption'],
    })
  }

  // The Swiss Reverse Convertible (1220) and Barrier Reverse Convertible (1230): a fixed coupon in place of upside, and shares or their
  // value below a strike. Neither name depends on settlement, since the Swiss type allows either and a US note on an index pays cash. The
  // rules and sources are in docs/call-and-coupon-names.md.
  if (coupon !== undefined && coupon.barrier === undefined && unprotected && upsideOf(note) === undefined && note.payoff.barrierAbsoluteReturn === undefined && note.payoff.digitalReturn === undefined && downside !== undefined && downside.absoluteReturn === undefined) {
    const settled = note.settlement === 'delivery'
      ? 'Otherwise it delivers shares of the underlier, worth the payment shown on the final date.'
      : 'Otherwise issuers settle in cash or in shares of the underlier, and the payment shown is the value on the final date.'
    const strike = 1 - (downside.buffer ?? 0)
    // A strike below the initial level pays principal × final ÷ strike, which is a buffer at a rate of 1 ÷ strike. The tolerance lets a rate
    // typed to two decimal places of a percentage, such as 111.11%, state a strike of 90%.
    if (downside.barrier === undefined && Math.abs(downside.rate * strike - 1) < 1e-4) {
      names.push({
        name: 'Reverse convertible',
        vocabulary: 'SSPA',
        reason: `A fixed coupon is paid whatever the underlier does, with no share in a rise. Principal is repaid at or above ${strike === 1 ? 'a strike at the initial level' : `a strike of ${percentText(strike)} of the initial level`}, with no barrier to reach first. ${settled} The Swiss taxonomy calls this a Reverse Convertible (1220); US documents also say reverse exchangeable.`,
        concepts: ['coupon', 'downside'],
      })
    } else if (downside.barrier !== undefined && downside.buffer === undefined && downside.rate === 1) {
      names.push({
        name: 'Barrier reverse convertible',
        vocabulary: 'SSPA',
        reason: `A fixed coupon is paid whatever the underlier does, with no share in a rise. Principal is repaid unless the underlier has reached the ${percentText(downside.barrier.level)} barrier and ends below its initial level. ${settled} The Swiss taxonomy calls this a Barrier Reverse Convertible (1230); US documents call the barrier a knock-in.`,
        concepts: ['coupon', 'barrier'],
      })
    }
  }

  return names
}
