import { downsideOf, upsideOf, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

export interface MarketingName {
  name: string
  // Where the label comes from: plain-language regulator wording, or the Swiss Structured Products Association's product types.
  vocabulary: 'US descriptive' | 'SSPA' | 'Market usage'
  reason: string
  // The parts of the note that make the name fit.
  concepts: ConceptId[]
}

const isRate = (rate: number | undefined): rate is number => rate !== undefined && Number.isFinite(rate) && rate > 0
const percentText = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`

export interface ProductCategory {
  name: 'Capital Protection' | 'Participation'
  reason: string
  // The parts of the note that place it in the category.
  concepts: ConceptId[]
}

// The Swiss taxonomy's broad category for the note, or none when the model's terms do not place it. One category at most.
// Protection decides first: any protection above 0% is Capital Protection, so a buffer or a cap does not change it.
// The rules are recorded in docs/marketing-names.md.
export function productCategory(note: Product): ProductCategory | undefined {
  const protection = note.payoff.principalProtection
  const upside = upsideOf(note)?.rate
  const downside = downsideOf(note)?.rate

  if (protection !== undefined && Number.isFinite(protection) && protection > 0) {
    return {
      name: 'Capital Protection',
      reason: protection === 1
        ? 'The principal is repaid in full at maturity, whatever the underlier does, subject to the issuer’s ability to pay.'
        : `Part of the principal is repaid whatever the underlier does. The Swiss taxonomy sets partial protection at 90% to 100% of principal; here any level above 0% is placed in this category.`,
      concepts: ['protection'],
    }
  }
  // A deposit repays principal in full, which is what places it here.
  if (note.wrapper === 'deposit' && isRate(upside)) {
    return {
      name: 'Capital Protection',
      reason: 'The deposit repays the principal in full at the end of the term, and only the return depends on the underlier.',
      concepts: ['wrapper', 'upside'],
    }
  }
  if (note.wrapper === 'note' && (isRate(upside) || isRate(downside))) {
    return {
      name: 'Participation',
      reason: 'The payment follows the underlier, at a participation rate for each direction that is selected, with no protection of principal.',
      concepts: isRate(upside) && isRate(downside) ? ['upside', 'downside'] : isRate(upside) ? ['upside'] : ['downside'],
    }
  }
  return undefined
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
      reason: `The payment at maturity is at least the full principal, subject to the issuer's ability to pay.${upside ? ' In the Swiss taxonomy this is a Capital Protection Note with Participation.' : ''}`,
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
  // These names describe notes, so a deposit gets none of them.
  const unprotected = protection === undefined || protection === 0
  if (note.wrapper === 'note' && unprotected && buffer === undefined && barrier === undefined && upsideBarrier === undefined && cap === undefined && isRate(upside) && (downside === undefined || isRate(downside))) {
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

  if (hasCap && upside !== undefined) {
    names.push({ name: 'Capped participation', vocabulary: 'US descriptive', reason: 'Upside participation stops at a maximum return, so the payment cannot rise past the cap.', concepts: ['upside', 'cap'] })
  }

  return names
}
