import type { ParticipationDirection, PaymentBreakdown, ProtectedParticipationNote } from '../domain/note'
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
function participationStep(note: ProtectedParticipationNote, breakdown: PaymentBreakdown, direction: ParticipationDirection): Omit<CalculationStep, 'n'> {
  const title = direction === 'upside' ? 'Upside participation' : 'Downside participation'
  const rate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  if (rate === undefined) {
    const how = direction === 'upside' ? 'Not selected, so a rise does not add to principal' : 'Not selected, so a fall does not reduce principal'
    return { title, how, value: 'Not added', muted: true, concept: direction }
  }
  const contribution = direction === breakdown.direction ? breakdown.participatedReturn : 0
  const how = `${formatPercent(rate)} × ${direction === 'upside' ? 'max' : 'min'}(${signedPercent(breakdown.underlierReturn)}, 0)`
  return contribution === 0
    ? { title, how: `${how} · applies only when the return is ${direction === 'upside' ? 'positive' : 'negative'}`, value: '0%', muted: true, concept: direction }
    : { title, how, value: signedPercent(contribution), concept: direction }
}

// The worked calculation of the maturity payment at one final level. Every number comes from the payment breakdown.
export function calculationSteps(note: ProtectedParticipationNote, breakdown: PaymentBreakdown, finalLevel: number): CalculationStep[] {
  const b = breakdown
  const [component] = note.underlier.components
  const principal = note.principalAmount
  const { cap, principalProtection } = note.payoff
  const withCap = cap !== undefined
  const withProtection = principalProtection !== undefined
  const hasDownside = note.payoff.participations.some(({ direction }) => direction === 'downside')
  const steps: Array<Omit<CalculationStep, 'n'>> = [
    { title: `${component.asset.name.trim() || 'Underlier'} return`, how: `${formatAmount(finalLevel)} ÷ ${formatAmount(component.initialLevel)} − 1`, value: signedPercent(b.underlierReturn), concept: 'determination' },
    participationStep(note, b, 'downside'),
    participationStep(note, b, 'upside'),
    { title: withCap ? 'Payment before cap' : 'Payment before protection', how: `${formatAmount(principal)} × (1 ${b.participatedReturn < 0 ? '−' : '+'} ${formatPercent(Math.abs(b.participatedReturn))})`, value: formatAmount(b.uncappedPayment) },
  ]
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
