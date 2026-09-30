import { downsideOf, finalLevelFrom, initialLevelFrom, upsideOf, type ParticipationDirection, type PaymentBreakdown, type Note } from '../domain/note'
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
const signedPercent = (fraction: number) => `${fraction < 0 ? '−' : '+'}${formatPercent(Math.abs(fraction))}`

// Each direction is its own step, as in the payment rule, so a selected rate stays visible even when the return does not reach it.
function participationStep(note: Note, breakdown: PaymentBreakdown, direction: ParticipationDirection): Omit<CalculationStep, 'n'> {
  const title = direction === 'upside' ? 'Upside participation' : 'Downside participation'
  const rate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  if (rate === undefined) {
    const how = direction === 'upside' ? 'Not selected, so a rise does not add to principal' : 'Not selected, so a fall does not reduce principal'
    return { title, how, value: 'Not added', muted: true, concept: direction }
  }
  const contribution = direction === breakdown.direction ? breakdown.participatedReturn : 0
  const buffer = direction === 'downside' ? downsideOf(note)?.buffer : undefined
  const how = `${formatPercent(rate)} × ${direction === 'upside' ? 'max' : 'min'}(${signedPercent(breakdown.underlierReturn)}${buffer === undefined ? '' : ` + ${formatPercent(buffer)}`}, 0)`
  const reason = buffer !== undefined && breakdown.underlierReturn < 0 ? 'the buffer absorbs the whole fall'
    : breakdown.belowBarrier === false && breakdown.underlierReturn < 0 ? 'the final level is not below the barrier' : `applies only when the return is ${direction === 'upside' ? 'positive' : 'negative'}`
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
function barrierStep(level: number, breakdown: PaymentBreakdown, finalLevel: number): Omit<CalculationStep, 'n'> {
  const barrierLevel = breakdown.barrierLevel ?? 0
  const how = `${formatPercent(level)} × ${formatAmount(breakdown.initialLevel)} · final level ${formatAmount(finalLevel)} is ${breakdown.belowBarrier ? 'below it, so downside participation applies' : 'not below it, so a fall does not reduce principal'}`
  return { title: 'Barrier', how, value: formatAmount(barrierLevel), muted: !breakdown.belowBarrier, concept: 'barrier' }
}

// The worked calculation of the maturity payment from the observed levels: those on the final dates and, for lookback, those
// after pricing. Every number comes from the payment breakdown.
export function calculationSteps(note: Note, breakdown: PaymentBreakdown, observedLevels: number[], afterPricing: number[]): CalculationStep[] {
  const b = breakdown
  const [component] = note.underlier.components
  const name = component.asset.name.trim()
  const principal = note.principalAmount
  const { principalProtection } = note.payoff
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
  const withCap = cap !== undefined
  const withProtection = principalProtection !== undefined
  const hasDownside = downsideOf(note) !== undefined
  const { determination } = note.underlier
  const initialLevel = initialLevelFrom(determination.initial, component.initialLevel, afterPricing)
  const finalLevel = finalLevelFrom(determination.final, observedLevels)
  const steps: Array<Omit<CalculationStep, 'n'>> = []
  if (determination.initial.kind === 'lookback') {
    steps.push({ title: `Lookback level of ${name || 'the underlier'}`, how: `min(${[component.initialLevel, ...afterPricing].map(formatAmount).join(', ')})`, value: formatAmount(initialLevel), concept: 'initial-level' })
  }
  if (determination.final.kind === 'averaging') {
    steps.push({ title: `Final level of ${name || 'the underlier'}`, how: `(${observedLevels.map(formatAmount).join(' + ')}) ÷ ${observedLevels.length}`, value: formatAmount(finalLevel), concept: 'final-level' })
  }
  steps.push({ title: `${name || 'Underlier'} return`, how: `${formatAmount(finalLevel)} ÷ ${formatAmount(initialLevel)} − 1`, value: signedPercent(b.underlierReturn), concept: 'determination' })
  if (buffer !== undefined) steps.push(bufferStep(buffer, b))
  if (barrier !== undefined) steps.push(barrierStep(barrier.level, b, finalLevel))
  steps.push(
    participationStep(note, b, 'downside'),
    participationStep(note, b, 'upside'),
    { title: withCap ? 'Payment before cap' : 'Payment before protection', how: `${formatAmount(principal)} × (1 ${b.participatedReturn < 0 ? '−' : '+'} ${formatPercent(Math.abs(b.participatedReturn))})`, value: formatAmount(b.uncappedPayment) },
  )
  // Numbers follow the order of the steps, so the closing step can refer to the ones it combines.
  const before = steps.length
  if (withCap) steps.push({ title: 'Cap', how: `${formatAmount(principal)} × (1 + ${formatPercent(cap)}) · ${b.capApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.capAmount ?? 0), concept: 'cap' })
  const capStep = steps.length
  steps.push(withProtection
    ? { title: 'Protection floor', how: `${formatPercent(principalProtection)} × ${formatAmount(principal)} · ${b.floorApplies ? 'applies here' : 'not binding here'}`, value: formatAmount(b.floor), concept: 'protection' }
    : { title: 'Protection floor', how: hasDownside ? 'No protection selected, so some or all of the principal can be lost' : 'No protection selected. Without downside participation, principal is not reduced', value: 'Not added', muted: true, concept: 'protection' })
  const floorStep = steps.length
  const combine = withCap
    ? `The lower of steps ${before} and ${capStep}, then ${withProtection ? `the higher of that and step ${floorStep}` : 'not below zero'}`
    : withProtection ? `The higher of steps ${before} and ${floorStep}` : `The higher of step ${before} and zero`
  steps.push({ title: 'Payment at maturity', how: combine, value: formatAmount(b.payment), result: true })
  return steps.map((step, index) => ({ ...step, n: index + 1 }))
}
