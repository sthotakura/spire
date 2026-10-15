import type { RedemptionOutcome } from '../domain/autocall'
import { barrierLevelAt, reviewCount, type Product } from '../domain/note'
import type { CalculationStep } from './calculation'
import type { FormulaLine } from './formula'

const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
const percent = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`
const monthsPhrase = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`

// The sentence about how the product ended, from the reviews. A called product says which review, at what level, and what it
// pays; one that ran to the end of its term says no review reached the trigger, and the maturity payment follows in the outcome.
export function explainRedemption(note: Product, outcome: RedemptionOutcome): string {
  if (note.redemption === 'bullet') return ''
  const { calledAtReview, tests, reviews, months, payment } = outcome
  const test = calledAtReview === undefined ? undefined : tests[calledAtReview - 1]
  if (test === undefined) return `No review before the last was at or above the ${units(tests[0]?.triggerLevel ?? 0)} trigger, so the product ran to the end of its term.`
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  const comparison = difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
  return `The level was ${units(test.level)} on review ${test.review} of ${reviews}, at or above the ${units(test.triggerLevel)} trigger, so the product was called after ${monthsPhrase(months)} and pays ${units(payment)}, ${comparison}.`
}

// The call rule beside the payment rule. It is tested on each review before the last, and the last review pays the payoff.
export function redemptionFormula(note: Product): FormulaLine[] {
  if (note.redemption === 'bullet') return []
  return [{
    lead: 'Call',
    segments: [
      { text: 'On a review before the last, if ' },
      { text: 'Level ≥ Trigger × Initial level', concept: 'redemption' },
      { text: ', pay ' },
      { text: 'Principal × (1 + Call amount)', concept: 'redemption' },
      { text: ' and end' },
    ],
  }]
}

// One step for each review that was tested, and one for how the product ended. Reviews after a call are not shown: the product had
// already ended.
export function redemptionSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.redemption === 'bullet') return []
  const { trigger, callAmount } = note.redemption
  const steps: Array<Omit<CalculationStep, 'n'>> = outcome.tests.map((test) => ({
    title: `Review ${test.review} of ${outcome.reviews}`,
    how: `${units(test.level)} ${test.called ? 'is at or above' : 'is below'} the trigger, ${percent(trigger)} × initial level = ${units(test.triggerLevel)}`,
    value: test.called ? 'Called' : 'Not called',
    muted: !test.called,
    concept: 'redemption',
  }))
  steps.push(outcome.calledAtReview === undefined
    ? { title: 'Redemption', how: `No review before the last reached the trigger, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'At maturity', concept: 'redemption' }
    : { title: 'Redemption', how: `Called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${percent(callAmount)})`, value: units(outcome.payment), result: true, concept: 'redemption' })
  return steps
}

export interface PathScenario {
  name: string
  // The underlier's level on each review before the last, and on the final date.
  reviewLevels: number[]
  finalLevel: number
}

// Named paths a reader can load, since a path is not a grid of inputs: called at once, called late, never called and flat, and
// never called and falling. Each is built from the trigger so it means the same whatever the trigger is.
export function pathScenarios(note: Product, initialLevel: number): PathScenario[] {
  if (note.redemption === 'bullet') return []
  const reviews = reviewCount(note)!
  const before = reviews - 1
  const triggerLevel = barrierLevelAt(note.redemption.trigger, initialLevel)
  // Clearly below the trigger, so the review cannot call.
  const below = triggerLevel * 0.95
  const atTrigger = triggerLevel
  const called = (review: number): PathScenario => ({
    name: review === 1 ? 'Called on the first review' : `Called on review ${review}`,
    reviewLevels: Array.from({ length: before }, (_, index) => (index + 1 < review ? below : atTrigger)),
    finalLevel: atTrigger,
  })
  const falling = Array.from({ length: before }, (_, index) => Math.min(below, initialLevel * (1 - (0.4 * (index + 1)) / before)))
  return [
    called(1),
    ...(before > 1 ? [called(before)] : []),
    { name: 'Never called, ends flat', reviewLevels: Array.from({ length: before }, () => below), finalLevel: initialLevel },
    { name: 'Never called, ends 40% down', reviewLevels: falling, finalLevel: initialLevel * 0.6 },
  ]
}
