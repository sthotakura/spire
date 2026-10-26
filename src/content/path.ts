import { couponBarrierLevel, finalCallLevel, paymentAtEnd, type RedemptionOutcome } from '../domain/autocall'
import { callAmountAtReview, couponPerReview, downsideOf, upsideOf, type DeterminedLevels, type PaymentBreakdown, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

// One stage of the calculation path: the payment at one final level after the payoff's rules up to this one. Drawn at every final
// level, the stages build the payoff line one rule at a time, from a payment moving 1:1 with the underlier to the line itself.
export interface LineStage {
  // The title of the calculation step the stage explains, as "How the payment is worked out" lists it. The call on the last review has
  // a title of its own: the list's Redemption step is how the scenario ended, which can be a call on an earlier review.
  step: string
  concept: ConceptId
  // What the rule does to every outcome, in a few words, for the bar under the chart. It reads the terms only, not the level.
  detail: string
  amount: number
}

const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(2).replace(/\.?0+$/, '')}%`
const ofInitial = (note: Product, level: number) => `${formatPercent(level)} of the ${note.underlier.kind === 'basket' ? 'starting' : 'initial'} level`

// The stages at one final level, from its payment breakdown, in the order the calculation applies the rules. The amount is principal ×
// (1 + the return still moving 1:1 + the terms the rules have settled so far); each rule turns part of the first into the second. A
// product has the same stages at every final level, and the last is the payment the payoff chart draws there.
export function lineStages(note: Product, b: PaymentBreakdown, levels: DeterminedLevels): LineStage[] {
  const principal = note.principalAmount
  const r = b.underlierReturn
  let pending = r
  let settled = 0
  const amount = () => principal * (1 + pending + settled)
  const stages: LineStage[] = []
  const add = (step: string, concept: ConceptId, detail: string) => stages.push({ step, concept, detail, amount: amount() })

  const isBasket = note.underlier.kind === 'basket'
  const name = note.underlier.kind === 'single' ? note.underlier.components[0].asset.name.trim() : ''
  add(isBasket ? 'Basket level' : `${name || 'Underlier'} return`, isBasket ? 'basket-return' : 'determination', `A payment that moves 1:1 with the ${isBasket ? 'basket' : 'underlier'}`)

  const bothWays = note.payoff.barrierAbsoluteReturn
  if (bothWays && b.barrierAbsolute) {
    const ba = b.barrierAbsolute
    add('Lower barrier', 'barrier', `The absolute return ends below ${ofInitial(note, bothWays.lowerBarrier.level)}`)
    add('Upper barrier', 'barrier', `The absolute return ends above ${ofInitial(note, bothWays.upperBarrier.level)}`)
    pending = 0
    settled = ba.reached ? 0 : b.participatedReturn
    add('Absolute return', 'absolute-return', `Between the barriers it pays ${formatPercent(bothWays.rate)} of the size of the move, a rise or a fall alike`)
    if (bothWays.conditionalReturn !== undefined) {
      settled = b.participatedReturn
      add('Conditional return', 'barrier', `Beyond a barrier it pays ${formatPercent(bothWays.conditionalReturn)} in place of the absolute return`)
    }
  }

  const downside = downsideOf(note)
  if (downside?.buffer !== undefined) {
    if (b.bufferAbsorbs) pending = r + b.bufferAbsorbs
    add('Buffer', 'buffer', `Absorbs the first ${formatPercent(downside.buffer)} of a fall`)
  }
  if (downside?.barrier !== undefined && b.barrierLevel !== undefined) {
    // Not reached, a fall does not reduce principal.
    if (b.barrierReached !== true && r < 0) pending = 0
    add('Downside barrier', 'barrier', `A fall does not reduce principal unless the level ends below ${ofInitial(note, downside.barrier.level)}`)
  }
  if (downside?.absoluteReturn !== undefined) {
    if (b.absoluteReturnApplies) {
      pending = 0
      settled += b.downsideTerm
    }
    add('Absolute return', 'absolute-return', `A fall the ${downside.buffer !== undefined ? 'buffer absorbs' : 'barrier protects'} is paid as a gain, at ${formatPercent(downside.absoluteReturn.rate)} of its size`)
  }
  const upside = upsideOf(note)
  if (upside?.barrier !== undefined && b.upsideBarrierLevel !== undefined) {
    const reached = b.upsideBarrierReached === true
    if (reached && b.direction === 'upside') pending = 0
    add('Upside barrier', 'barrier', `Upside participation ends above ${ofInitial(note, upside.barrier.level)}`)
    if (upside.barrier.rebate !== undefined) {
      if (reached) settled += b.upsideTerm
      add('Rebate', 'barrier', `Above the barrier it pays ${formatPercent(upside.barrier.rebate)} in place of upside participation`)
    }
  }
  if (!bothWays) {
    if (b.direction === 'downside') {
      if (pending !== 0) settled += b.downsideTerm
      pending = 0
    }
    add('Downside participation', 'downside', downside === undefined ? 'None: a fall leaves principal unchanged' : `A fall${downside.buffer !== undefined ? ' beyond the buffer' : ''} reduces principal by ${formatPercent(downside.rate)} of its size`)
    if (b.direction === 'upside') {
      if (b.upsideBarrierReached !== true) settled += b.upsideTerm
      pending = 0
    }
    add('Upside participation', 'upside', upside === undefined ? 'None: a rise leaves principal unchanged' : `A rise adds ${formatPercent(upside.rate)} of its size`)
  }

  if (upside?.cap !== undefined) {
    if (b.capApplies) settled = upside.cap
    add('Cap', 'cap', `The payment is at most ${formatAmount(principal * (1 + upside.cap))}`)
  }
  const floorTo = (floor: number) => {
    if (amount() < floor) {
      pending = 0
      settled = floor / principal - 1
    }
  }
  if (note.wrapper === 'deposit') {
    if (note.payoff.minimumReturn !== undefined) {
      floorTo(b.floor)
      add('Minimum return', 'minimum-return', `The payment is at least ${formatAmount(b.floor)}`)
    }
  } else {
    const digital = note.payoff.digitalReturn
    if (digital && b.digitalReturn) {
      if (b.digitalReturn.reached) floorTo(b.digitalReturn.floor)
      add('Digital return', 'digital-return', `At or above ${ofInitial(note, digital.barrier.level)}, the payment is at least ${formatAmount(principal * (1 + digital.amount))}`)
    }
    const protection = note.payoff.principalProtection
    if (protection !== undefined) {
      floorTo(principal * protection)
      add('Protection floor', 'protection', `The payment is at least ${formatAmount(principal * protection)}`)
    }
  }
  // Without a floor a note cannot pay less than zero.
  pending = 0
  settled = b.payment / principal - 1
  add('Payment at maturity', 'payoff', `What the ${note.wrapper} pays at maturity`)

  // The line draws the last review: an autocall that calls on it, and a coupon paid on it.
  const { redemption } = note
  const call = finalCallLevel(note, levels.initial)
  if (redemption !== 'bullet' && call !== undefined) {
    const called = principal * (1 + callAmountAtReview(redemption, note.term.months))
    if (levels.final >= call) settled = called / principal - 1
    add('Call on the last review', 'call-amount', `At or above the trigger on the last review, ${formatAmount(call)}, it is called: it pays ${formatAmount(called)}`)
  }
  if (note.coupon !== undefined) {
    const barrier = couponBarrierLevel(note, levels.initial)
    if (barrier === undefined || levels.final >= barrier) settled += couponPerReview(note) / principal
    add('Paid at maturity', 'coupon', `Adds the last review’s coupon, ${formatAmount(couponPerReview(note))}${barrier === undefined ? '' : `, at or above the coupon barrier, ${formatAmount(barrier)}`}`)
  }
  return stages
}

// What the scenario pays that the line does not draw: a call before the last review or by the issuer, coupons remembered to the last
// review, a barrier reached on an earlier close, and the coupons paid before the end. Empty when the line's payment is the whole story.
export function scenarioAside(note: Product, levels: DeterminedLevels, outcome?: RedemptionOutcome): string {
  const { redemption } = note
  const before = outcome ? outcome.totalPaid - outcome.payment : 0
  const coupons = before > 0 ? ` It also pays ${formatAmount(before)} in coupons on earlier reviews.` : ''
  const issuer = redemption !== 'bullet' && redemption.kind === 'issuer-call'
  if (outcome?.calledAtReview !== undefined && (issuer || outcome.calledAtReview < outcome.reviews)) {
    return `In this scenario ${issuer ? 'the issuer calls it' : 'it is called'} on review ${outcome.calledAtReview} and pays ${formatAmount(outcome.payment)}, which the line does not show.${coupons}`
  }
  const onLine = paymentAtEnd(note, { initial: levels.initial, final: levels.final })
  const withCloses = paymentAtEnd(note, levels)
  const reasons = [
    ...(Math.abs(withCloses - onLine) > 1e-9 ? ['a close reached a barrier'] : []),
    ...(outcome && Math.abs(outcome.payment - withCloses) > 1e-9 ? ['it adds coupons remembered from earlier reviews'] : []),
  ]
  const paid = outcome?.payment ?? withCloses
  return `${reasons.length ? `In this scenario it pays ${formatAmount(paid)}: ${reasons.join(', and ')}, which the line does not show.` : ''}${coupons}`.trim()
}
