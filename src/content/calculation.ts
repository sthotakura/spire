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
    const how = direction === 'upside' ? 'Not selected, so a rise does not add to principal'
      : note.wrapper === 'deposit' ? 'Not on a deposit, which repays principal in full' : 'Not selected, so a fall does not reduce principal'
    return { title, how, value: 'Not added', muted: true, concept: direction }
  }
  const contribution = direction === breakdown.direction ? breakdown.participatedReturn : 0
  const buffer = direction === 'downside' ? downsideOf(note)?.buffer : undefined
  const how = `${formatPercent(rate)} × ${direction === 'upside' ? 'max' : 'min'}(${signedPercent(breakdown.underlierReturn)}${buffer === undefined ? '' : ` + ${formatPercent(buffer)}`}, 0)`
  // The buffer and the barrier belong to downside participation, so only its step gives them as the reason.
  const reason = buffer !== undefined && breakdown.underlierReturn < 0 ? 'the buffer absorbs the whole fall'
    : direction === 'downside' && breakdown.belowBarrier === false && breakdown.underlierReturn < 0 ? `the ${note.underlier.kind === 'basket' ? 'basket' : 'final'} level is not below the barrier`
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

// Whether the final level is below the barrier. Only then does downside participation apply, to the whole fall.
function barrierStep(level: number, breakdown: PaymentBreakdown, finalName: string, finalLevel: number): Omit<CalculationStep, 'n'> {
  const barrierLevel = breakdown.barrierLevel ?? 0
  const how = `${formatPercent(level)} × ${formatAmount(breakdown.initialLevel)} · ${finalName} ${formatAmount(finalLevel)} is ${breakdown.belowBarrier ? 'below it, so downside participation applies' : 'not below it, so a fall does not reduce principal'}`
  return { title: 'Barrier', how, value: formatAmount(barrierLevel), muted: !breakdown.belowBarrier, concept: 'barrier' }
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
  const withCap = cap !== undefined
  const withProtection = principalProtection !== undefined
  const hasDownside = downsideOf(note) !== undefined
  const steps = note.underlier.kind === 'basket' ? basketSteps(basket!) : singleSteps({ ...note, underlier: note.underlier }, b, observedLevels, initialObservations)
  if (buffer !== undefined) steps.push(bufferStep(buffer, b))
  if (barrier !== undefined) {
    steps.push(basket ? barrierStep(barrier.level, b, 'basket level', basket.levels.final) : barrierStep(barrier.level, b, 'final level', finalLevelFrom(note.underlier.determination.final, observedLevels)))
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
  // Numbers follow the order of the steps, so the closing step can refer to the ones it combines.
  const before = steps.length
  if (withCap) steps.push({ title: 'Cap', how: `${formatAmount(principal)} × (1 + ${formatPercent(cap)}) · ${b.capApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.capAmount ?? 0), concept: 'cap' })
  const capStep = steps.length
  if (deposit) {
    steps.push(minimum !== undefined
      ? { title: 'Minimum return', how: `${formatAmount(principal)} × (1 + ${twoDecimalPercent(minimum)}) · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), concept: 'minimum-return' }
      : { title: 'Minimum return', how: 'Not added. A deposit repays principal in full, so the payment is never below it', value: 'Not added', muted: true, concept: 'minimum-return' })
  } else {
    steps.push(withProtection
      ? { title: 'Protection floor', how: `${formatPercent(principalProtection)} × ${formatAmount(principal)} · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), concept: 'protection' }
      : { title: 'Protection floor', how: hasDownside ? 'No protection selected, so some or all of the principal can be lost' : 'No protection selected. Without downside participation, principal is not reduced', value: 'Not added', muted: true, concept: 'protection' })
  }
  const floorStep = steps.length
  // Without a floor, a note's payment cannot fall below zero; a deposit's cannot fall below principal, which nothing reduces.
  const noFloor = deposit ? '' : withCap ? ', then not below zero' : ''
  const combine = withCap
    ? `The lower of steps ${before} and ${capStep}${withFloor ? `, then the higher of that and step ${floorStep}` : noFloor}`
    : withFloor ? `The higher of steps ${before} and ${floorStep}` : deposit ? `Step ${before}` : `The higher of step ${before} and zero`
  steps.push({ title: 'Payment at maturity', how: combine, value: formatAmount(b.payment), result: true })
  // Derived from the term, as issuers state an annual yield beside each payment. It is not a term of the product.
  const years = note.term.months / 12
  steps.push({ title: 'Annualised return', how: `(${formatAmount(b.payment)} ÷ ${formatAmount(principal)})^(1 ÷ ${formatAmount(years)} ${years === 1 ? 'year' : 'years'}) − 1`, value: `${twoDecimalPercent(annualisedReturn(b.payment, principal, note.term.months))} a year` })
  return steps.map((step, index) => ({ ...step, n: index + 1 }))
}
