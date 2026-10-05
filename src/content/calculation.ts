import { annualisedReturn, downsideOf, finalLevelFrom, initialLevelFrom, upsideOf, type BasketBreakdown, type ParticipationDirection, type PaymentBreakdown, type Product, type SingleProduct } from '../domain/note'
import type { ConceptId } from './concepts'

export interface CalculationStep {
  n: number
  title: string
  how: string
  value: string
  muted?: boolean
  result?: boolean
  concept?: ConceptId
}

const formatAmount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const formatPercent = (value: number) => `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
// Weights are stated to two decimal places of a percent, such as 33.34%.
const weightPercent = (fraction: number) => `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
// Minimum returns and annual yields are stated to two decimal places of a percent, such as 5.25% or 0.73%.
const twoDecimalPercent = (fraction: number) => `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
const signedPercent =(fraction: number) => `${fraction < 0 ? '−' : '+'}${formatPercent(Math.abs(fraction))}`

// Each direction is its own step, as in the payment rule, so a selected rate stays visible even when the return does not reach it.
function participationStep(note: Product, breakdown: PaymentBreakdown, direction: ParticipationDirection): Omit<CalculationStep, 'n'> {
  const title = direction === 'upside' ? 'Upside participation' : 'Downside participation'
  const rate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  if (rate === undefined) {
    const how = direction === 'upside' ? 'Not added, so a rise leaves principal unchanged'
      : note.wrapper === 'deposit' ? 'Not on a deposit, which repays principal in full' : 'Not added, so a fall leaves principal unchanged'
    return { title, how, value: 'Not added', muted: true, concept: direction }
  }
  // A fall paid as a gain is absolute return's contribution, not downside participation's.
  // At or above the upside barrier the rebate replaces upside participation, and its own step carries it.
  const knockedOut = direction === 'upside' && breakdown.upsideBarrierReached === true
  const contribution = direction === breakdown.direction && !breakdown.absoluteReturnApplies && !knockedOut ? breakdown.participatedReturn : 0
  const buffer = direction === 'downside' ? downsideOf(note)?.buffer : undefined
  const how = `${formatPercent(rate)} × ${direction === 'upside' ? 'max' : 'min'}(${signedPercent(breakdown.underlierReturn)}${buffer === undefined ? '' : ` + ${formatPercent(buffer)}`}, 0)`
  // The buffer and the barrier belong to downside participation, so only its step gives them as the reason.
  const reason = knockedOut ? 'the upside barrier is reached, so participation ends'
    : buffer !== undefined && breakdown.underlierReturn < 0 ? 'the buffer absorbs the whole fall'
    : direction === 'downside' && breakdown.belowBarrier === false && breakdown.underlierReturn < 0 ? `the ${note.underlier.kind === 'basket' ? 'basket' : 'final'} level is not below the downside barrier`
      : `applies only when the return is ${direction === 'upside' ? 'positive' : 'negative'}`
  return contribution === 0
    ? { title, how: `${how} · ${reason}`, value: '0%', muted: true, concept: direction }
    : { title, how, value: signedPercent(contribution), concept: direction }
}

// How much of the fall the buffer absorbs. Downside participation then applies to what is left.
function bufferStep(buffer: number, breakdown: PaymentBreakdown): Omit<CalculationStep, 'n'> {
  const absorbs = breakdown.bufferAbsorbs ?? 0
  const title = 'Buffer'
  if (absorbs === 0) return { title, how: `Absorbs the first ${formatPercent(buffer)} of a fall · applies only when the return is negative`, value: '0%', muted: true, concept: 'buffer' }
  const how = absorbs < buffer ? 'absorbs the whole fall here' : `absorbs ${formatPercent(absorbs)} of the ${formatPercent(-breakdown.underlierReturn)} fall here`
  return { title, how: `Absorbs the first ${formatPercent(buffer)} of a fall · ${how}`, value: `+${formatPercent(absorbs)}`, concept: 'buffer' }
}

// A fall within the buffer, paid as a gain. Beyond the buffer, or on a rise, it pays nothing.
function absoluteReturnStep(rate: number, breakdown: PaymentBreakdown, withBarrier: boolean): Omit<CalculationStep, 'n'> {
  const how = `${formatPercent(rate)} × |${signedPercent(breakdown.underlierReturn)}|`
  const title = 'Absolute return'
  if (breakdown.absoluteReturnApplies) return { title, how, value: signedPercent(breakdown.participatedReturn), concept: 'absolute-return' }
  const past = withBarrier ? 'the level ends below the downside barrier' : 'the fall is beyond the buffer'
  if (breakdown.direction === 'downside') return { title, how: `${how} · ${past}, so it pays no gain`, value: '0%', muted: true, concept: 'absolute-return' }
  // On a rise there is no fall to pay, so the step states the feature, as the buffer step does.
  return { title, how: `Pays ${formatPercent(rate)} of a fall ${withBarrier ? 'that ends at or above the downside barrier' : 'within the buffer'} as a gain · applies only when the return is negative`, value: '0%', muted: true, concept: 'absolute-return' }
}

// Whether the final level is below the barrier. Only then does downside participation apply, to the whole fall.
function barrierStep(level: number, breakdown: PaymentBreakdown, finalName: string, finalLevel: number): Omit<CalculationStep, 'n'> {
  const barrierLevel = breakdown.barrierLevel ?? 0
  const how = `${formatPercent(level)} × ${formatAmount(breakdown.initialLevel)} · ${finalName} ${formatAmount(finalLevel)} is ${breakdown.belowBarrier ? 'below it, so downside participation applies' : 'not below it, so a fall does not reduce principal'}`
  return { title: 'Downside barrier', how, value: formatAmount(barrierLevel), muted: !breakdown.belowBarrier, concept: 'barrier' }
}

// Whether the final level has reached the upside barrier. At or above it, upside participation ends and the rebate, if there is one, is paid.
function upsideBarrierStep(level: number, breakdown: PaymentBreakdown, finalName: string, finalLevel: number): Omit<CalculationStep, 'n'> {
  const reached = breakdown.upsideBarrierReached === true
  const how = `${formatPercent(level)} × ${formatAmount(breakdown.initialLevel)} · ${finalName} ${formatAmount(finalLevel)} is ${reached ? 'at or above it, so upside participation ends' : 'below it, so upside participation applies'}`
  return { title: 'Upside barrier', how, value: formatAmount(breakdown.upsideBarrierLevel ?? 0), muted: !reached, concept: 'barrier' }
}

// The fixed return paid in place of upside participation once the upside barrier is reached.
function rebateStep(rebate: number, breakdown: PaymentBreakdown): Omit<CalculationStep, 'n'> {
  const title = 'Rebate'
  if (breakdown.upsideBarrierReached) return { title, how: 'Paid in place of upside participation', value: signedPercent(rebate), concept: 'barrier' }
  return { title, how: `Pays ${formatPercent(rebate)} in place of upside participation · the upside barrier is not reached`, value: '0%', muted: true, concept: 'barrier' }
}

// How a single asset's levels give its return: the lookback level and the averaged final level when the note has them, then the return.
function singleSteps(note: SingleProduct, breakdown: PaymentBreakdown, observedLevels: number[], initialObservations: number[]): Array<Omit<CalculationStep, 'n'>> {
  const name = note.underlier.components[0].asset.name.trim()
  const { determination } = note.underlier
  const initialLevel = initialLevelFrom(determination.initial, initialObservations)
  const finalLevel = finalLevelFrom(determination.final, observedLevels)
  const steps: Array<Omit<CalculationStep, 'n'>> = []
  if (determination.initial.kind === 'lookback') {
    steps.push({ title: `Lookback level of ${name || 'the underlier'}`, how: `min(${initialObservations.map(formatAmount).join(', ')})`, value: formatAmount(initialLevel), concept: 'initial-level' })
  }
  if (determination.final.kind === 'averaging') {
    steps.push({ title: `Final level of ${name || 'the underlier'}`, how: `(${observedLevels.map(formatAmount).join(' + ')}) ÷ ${observedLevels.length}`, value: formatAmount(finalLevel), concept: 'final-level' })
  }
  steps.push({ title: `${name || 'Underlier'} return`, how: `${formatAmount(finalLevel)} ÷ ${formatAmount(initialLevel)} − 1`, value: signedPercent(breakdown.underlierReturn), concept: 'determination' })
  return steps
}

// How a basket's assets give its level: each asset's averaged final level when the note averages, each asset's return,
// then the weighted return and the basket level it moves.
function basketSteps(basket: BasketBreakdown): Array<Omit<CalculationStep, 'n'>> {
  const steps: Array<Omit<CalculationStep, 'n'>> = []
  for (const { asset, observedLevels, finalLevel, initialLevel, componentReturn } of basket.components) {
    if (observedLevels.length > 1) steps.push({ title: `Final level of ${asset}`, how: `(${observedLevels.map(formatAmount).join(' + ')}) ÷ ${observedLevels.length}`, value: formatAmount(finalLevel), concept: 'final-level' })
    steps.push({ title: `${asset} return`, how: `${formatAmount(finalLevel)} ÷ ${formatAmount(initialLevel)} − 1`, value: signedPercent(componentReturn), concept: 'determination' })
  }
  steps.push(
    { title: 'Basket return', how: basket.components.map(({ weight, componentReturn }) => `${weightPercent(weight)} × ${signedPercent(componentReturn)}`).join(' + '), value: signedPercent(basket.basketReturn), concept: 'basket-return' },
    { title: 'Basket level', how: `${formatAmount(basket.levels.initial)} × (1 ${basket.basketReturn < 0 ? '−' : '+'} ${formatPercent(Math.abs(basket.basketReturn))})`, value: formatAmount(basket.levels.final), concept: 'basket-return' },
  )
  return steps
}

// The worked calculation of the maturity payment from the observed levels: those on the final dates and, for lookback, those
// from the pricing date on. A basket's levels come measured, asset by asset, in its breakdown. Every number comes from the
// payment breakdown.
export function calculationSteps(note: Product, breakdown: PaymentBreakdown, observedLevels: number[], initialObservations: number[], basket?: BasketBreakdown): CalculationStep[] {
  const b = breakdown
  const principal = note.principalAmount
  const { principalProtection } = note.payoff
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
  const upsideBarrier = upsideOf(note)?.barrier
  const absoluteReturn = downsideOf(note)?.absoluteReturn
  const withCap = cap !== undefined
  const withProtection = principalProtection !== undefined
  const hasDownside = downsideOf(note) !== undefined
  const steps = note.underlier.kind === 'basket' ? basketSteps(basket!) : singleSteps({ ...note, underlier: note.underlier }, b, observedLevels, initialObservations)
  if (buffer !== undefined) steps.push(bufferStep(buffer, b))
  if (barrier !== undefined) {
    steps.push(basket ? barrierStep(barrier.level, b, 'basket level', basket.levels.final) : barrierStep(barrier.level, b, 'final level', finalLevelFrom(note.underlier.determination.final, observedLevels)))
  }
  // Absolute return comes after the buffer or barrier that decides whether it pays.
  if (absoluteReturn !== undefined) steps.push(absoluteReturnStep(absoluteReturn.rate, b, barrier !== undefined))
  // The upside barrier decides whether upside participation applies, so it comes before the participation steps.
  if (upsideBarrier !== undefined) {
    steps.push(basket ? upsideBarrierStep(upsideBarrier.level, b, 'basket level', basket.levels.final) : upsideBarrierStep(upsideBarrier.level, b, 'final level', finalLevelFrom(note.underlier.determination.final, observedLevels)))
    if (upsideBarrier.rebate !== undefined) steps.push(rebateStep(upsideBarrier.rebate, b))
  }
  // A deposit's floor is its minimum return; a note's is its protection.
  const deposit = note.wrapper === 'deposit'
  const minimum = note.payoff.minimumReturn
  const withFloor = deposit ? minimum !== undefined : withProtection
  steps.push(
    participationStep(note, b, 'downside'),
    participationStep(note, b, 'upside'),
    { title: withCap ? 'Payment before cap' : deposit ? 'Payment before minimum' : 'Payment before protection', how: `${formatAmount(principal)} × (1 ${b.participatedReturn < 0 ? '−' : '+'} ${formatPercent(Math.abs(b.participatedReturn))})`, value: formatAmount(b.uncappedPayment) },
  )
  if (withCap) steps.push({ title: 'Cap', how: `${formatAmount(principal)} × (1 + ${formatPercent(cap)}) · ${b.capApplies ? 'applies here' : absoluteReturn !== undefined && b.direction === 'downside' ? 'limits a rise only' : 'not binding here'}`, value: formatAmount(b.capAmount ?? 0), muted: !b.capApplies, concept: 'cap' })
  if (deposit) {
    steps.push(minimum !== undefined
      ? { title: 'Minimum return', how: `${formatAmount(principal)} × (1 + ${twoDecimalPercent(minimum)}) · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), muted: !b.floorApplies, concept: 'minimum-return' }
      : { title: 'Minimum return', how: 'Not added. A deposit repays principal in full, so the payment is never below it', value: 'Not added', muted: true, concept: 'minimum-return' })
  } else {
    steps.push(withProtection
      ? { title: 'Protection floor', how: `${formatPercent(principalProtection)} × ${formatAmount(principal)} · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), muted: !b.floorApplies, concept: 'protection' }
      : { title: 'Protection floor', how: hasDownside ? 'Not added, so some or all of the principal can be lost' : 'Not added. Without downside participation, a fall does not reduce principal', value: 'Not added', muted: true, concept: 'protection' })
  }
  // The closing step names the amounts it combines, in the payment rule's words. Without a floor, a note's payment cannot fall
  // below zero; a deposit's cannot fall below principal, which nothing reduces.
  const limits = [
    withCap ? `capped at ${formatAmount(b.capAmount ?? 0)}` : '',
    withFloor ? `floored at ${formatAmount(b.floor)}` : deposit ? '' : 'not below zero',
  ].filter(Boolean)
  const combine = limits.length ? `${formatAmount(b.uncappedPayment)}, ${limits.join(' and ')}` : `Same as the payment before minimum`
  steps.push({ title: 'Payment at maturity', how: combine, value: formatAmount(b.payment), result: true })
  // Derived from the term, as issuers state an annual yield beside each payment. It is not a term of the product.
  const years = note.term.months / 12
  steps.push({ title: 'Annualised return', how: `(${formatAmount(b.payment)} ÷ ${formatAmount(principal)})^(1 ÷ ${formatAmount(years)} ${years === 1 ? 'year' : 'years'}) − 1`, value: `${twoDecimalPercent(annualisedReturn(b.payment, principal, note.term.months))} a year` })
  return steps.map((step, index) => ({ ...step, n: index + 1 }))
}
