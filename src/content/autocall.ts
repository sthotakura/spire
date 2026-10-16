import type { RedemptionOutcome } from '../domain/autocall'
import { annualisedReturn, barrierLevelAt, callAmountAtReview, firstCallReview, reviewCount, triggerAtReview, type Product } from '../domain/note'
import type { CalculationStep } from './calculation'
import type { FormulaLine } from './formula'

const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
const percent = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`
const monthsPhrase = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`
// 1st, 2nd, 3rd, 4th, ... 11th, 12th, 13th, 21st.
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
const yearsPhrase = (months: number) => `${(months / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${months === 12 ? 'year' : 'years'}`

// The sentence about how the product ended, from the reviews. A called product says which review, at what level, and what it
// pays; one that ran to the end of its term says no review reached the trigger, and the maturity payment follows in the outcome.
export function explainRedemption(note: Product, outcome: RedemptionOutcome): string {
  if (note.redemption === 'bullet') return ''
  if (note.redemption.kind === 'issuer-call') return explainIssuerCall(note, outcome)
  const { calledAtReview, tests, reviews, months, payment } = outcome
  const test = calledAtReview === undefined ? undefined : tests[calledAtReview - 1]
  if (test === undefined) {
    const { callOnFinalReview } = note.redemption
    const firstCall = firstCallReview(note.redemption)
    const some = firstCall > 1 ? 'that could call' : ''
    const reviewed = `No review${some ? ` ${some}` : ''}${callOnFinalReview ? ', including the last,' : some ? '' : ' before the last'} was`
    // The trigger is one level unless it steps, when each review has its own.
    const trigger = note.redemption.triggerStep ? 'its trigger' : `the ${units(tests.find((candidate) => candidate.callable)?.triggerLevel ?? 0)} trigger`
    return `${reviewed} at or above ${trigger}, so the product ran to the end of its term.`
  }
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  const comparison = difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
  return `The level was ${units(test.level)} on review ${test.review} of ${reviews}, at or above the ${units(test.triggerLevel)} trigger, so the product was called after ${monthsPhrase(months)} and pays ${units(payment)}, ${comparison}.`
}

// The call rule beside the payment rule. It is tested on each review before the last, and the last review pays the payoff unless it
// is a call too. A trigger that steps and a call amount for each year say so in the rule.
export function redemptionFormula(note: Product): FormulaLine[] {
  if (note.redemption === 'bullet') return []
  if (note.redemption.kind === 'issuer-call') {
    const first = firstCallReview(note.redemption)
    return [{
      lead: 'Call',
      segments: [
        { text: `On a review ${first > 1 ? `from review ${first} ` : ''}before the last, if the issuer calls, pay ` },
        { text: note.redemption.callAmountBasis === 'per-year' ? 'Principal × (1 + Call amount × Years elapsed)' : 'Principal × (1 + Call amount)', concept: 'call-amount' },
        { text: ' and end' },
      ],
    }]
  }
  const { triggerStep, callAmountBasis, callOnFinalReview } = note.redemption
  const firstCall = firstCallReview(note.redemption)
  const reviews = callOnFinalReview
    ? firstCall > 1 ? `On every review from review ${firstCall}, if ` : 'On every review, if '
    : firstCall > 1 ? `On a review from review ${firstCall} to the last but one, if ` : 'On a review before the last, if '
  return [{
    lead: 'Call',
    segments: [
      { text: reviews },
      { text: triggerStep ? 'Level ≥ Trigger on that review × Initial level' : 'Level ≥ Trigger × Initial level', concept: 'trigger' },
      { text: ', pay ' },
      { text: callAmountBasis === 'per-year' ? 'Principal × (1 + Call amount × Years elapsed)' : 'Principal × (1 + Call amount)', concept: 'call-amount' },
      { text: ' and end' },
    ],
  }]
}

const twoDecimalPercent = (fraction: number) => `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`

// One step for each review that was tested, and one for how the product ended. Reviews after a call are not shown: the product had
// already ended. A product that was called also gets its annualised return, over the months it actually lasted, and a heading before
// the payoff steps that follow, which say what it would have paid at maturity.
export function redemptionSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.redemption === 'bullet') return []
  if (note.redemption.kind === 'issuer-call') return issuerCallSteps(note, outcome)
  const { redemption } = note
  const { callAmount, callAmountBasis, callOnFinalReview } = redemption
  const firstCall = firstCallReview(redemption)
  const steps: Array<Omit<CalculationStep, 'n'>> = outcome.tests.map((test) => test.callable
    ? {
        title: `Review ${test.review} of ${outcome.reviews}`,
        how: `${units(test.level)} ${test.called ? 'is at or above' : 'is below'} the trigger, ${percent(triggerAtReview(redemption, test.review))} × initial level = ${units(test.triggerLevel)}`,
        value: test.called ? 'Called' : 'Not called',
        muted: !test.called,
        concept: 'trigger' as const,
      }
    : { title: `Review ${test.review} of ${outcome.reviews}`, how: `${units(test.level)}: in the non-call period, the first ${firstCall - 1} ${firstCall === 2 ? 'review' : 'reviews'} cannot call`, value: 'No call', muted: true, concept: 'non-call' as const })
  steps.push(outcome.calledAtReview === undefined
    ? { title: 'Redemption', how: `No review${firstCall > 1 ? ' that could call' : ''}${callOnFinalReview ? ', including the last,' : firstCall > 1 ? '' : ' before the last'} reached the trigger, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'At maturity', concept: 'redemption' }
    : { title: 'Redemption', how: `Called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${callAmountBasis === 'per-year' ? `${percent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${percent(outcome.tests[outcome.calledAtReview - 1].callAmount)}` : percent(callAmount)})`, value: units(outcome.payment), result: true, concept: 'call-amount' })
  if (outcome.calledAtReview !== undefined) steps.push(...calledSteps(note, outcome))
  return steps
}

// After a call: the annualised return over the months the product lasted, and a heading before the payoff steps, which say what it
// would have paid at maturity.
const calledSteps = (note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> => [
  { title: 'Annualised return', how: `(${units(outcome.payment)} ÷ ${units(note.principalAmount)})^(12 ÷ ${monthsPhrase(outcome.months)}) − 1, over the time it lasted`, value: `${twoDecimalPercent(annualisedReturn(outcome.payment, note.principalAmount, outcome.months))} a year`, concept: 'call-amount' },
  { title: 'If it had run to maturity', how: 'It was called, so none of this is paid. The steps below are what the payoff would have paid at maturity.', value: '', heading: true },
]

const moreThanPrincipal = (note: Product, payment: number) => {
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  return difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
}

// An issuer call: the issuer's choice, so the sentence says which review it called on, or that it did not.
function explainIssuerCall(note: Product, outcome: RedemptionOutcome): string {
  if (outcome.calledAtReview === undefined) return 'The issuer did not call, so the product ran to the end of its term.'
  return `The issuer called the product on review ${outcome.calledAtReview} of ${outcome.reviews}, after ${monthsPhrase(outcome.months)}, and it pays ${units(outcome.payment)}, ${moreThanPrincipal(note, outcome.payment)}.`
}

// The non-call period when there is one, then the call, then what follows a call. No level is read on a review, so there is no step for each review.
function issuerCallSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.redemption === 'bullet' || note.redemption.kind !== 'issuer-call') return []
  const { callAmount, callAmountBasis, nonCallReviews = 0 } = note.redemption
  const steps: Array<Omit<CalculationStep, 'n'>> = []
  if (nonCallReviews > 0) steps.push({ title: 'Non-call period', how: `The first ${nonCallReviews} ${nonCallReviews === 1 ? 'review' : 'reviews'} cannot be called`, value: `${nonCallReviews} ${nonCallReviews === 1 ? 'review' : 'reviews'}`, muted: true, concept: 'non-call' })
  if (outcome.calledAtReview === undefined) {
    steps.push({ title: 'Issuer call', how: `The issuer did not call, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'Not called', concept: 'redemption' })
    return steps
  }
  const amount = callAmountBasis === 'per-year' ? `${percent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${percent(callAmountAtReview(note.redemption, outcome.months))}` : percent(callAmount)
  steps.push({ title: 'Issuer call', how: `The issuer called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${amount})`, value: units(outcome.payment), result: true, concept: 'call-amount' }, ...calledSteps(note, outcome))
  return steps
}

export interface PathScenario {
  name: string
  // The underlier's level on each review before the last, and on the final date.
  reviewLevels: number[]
  // The level on the final date, for a path that gets that far. A path called earlier leaves it alone: the product ends before it.
  finalLevel?: number
}

// Named paths a reader can load, since a path is not a grid of inputs: called at once, called late, called late after a fall, never
// called and ending up, flat, or falling. Each is built from the trigger on each review so it means the same whatever the trigger is. When the
// final review is a call too, there is also a path called only on it, and the paths that are never called end below its trigger.
export function pathScenarios(note: Product, initialLevel: number): PathScenario[] {
  // An issuer call reads no level, so there is no path of levels to load: the issuer's choice is a single review.
  if (note.redemption === 'bullet' || note.redemption.kind === 'issuer-call') return []
  const reviews = reviewCount(note)!
  const before = reviews - 1
  const { redemption } = note
  const triggerLevel = (review: number) => barrierLevelAt(triggerAtReview(redemption, review), initialLevel)
  // Clearly below the trigger of a review, so the review cannot call.
  const below = (review: number) => triggerLevel(review) * 0.95
  const firstCall = firstCallReview(redemption)
  // A review in the non-call period cannot call, so its level is at its trigger to show that it does not.
  const called = (review: number): PathScenario => ({
    name: review === reviews ? 'Called on the final review' : review === firstCall ? (firstCall === 1 ? 'Called on the first review' : 'Called on the first review that can call') : `Called on review ${review}`,
    reviewLevels: Array.from({ length: before }, (_, index) => (index + 1 < firstCall || index + 1 >= review ? triggerLevel(index + 1) : below(index + 1))),
    ...(review === reviews ? { finalLevel: triggerLevel(review) } : {}),
  })
  const falling = Array.from({ length: before }, (_, index) => Math.min(below(index + 1), initialLevel * (1 - (0.4 * (index + 1)) / before)))
  // The final level of a path that is never called is below the trigger of the last review when that review is a call too.
  const endsBelow = (level: number) => (redemption.callOnFinalReview ? Math.min(level, below(reviews)) : level)
  const endsFlat = endsBelow(initialLevel) === initialLevel
  // A fall that recovers: each review is lower than its trigger, rising from 70% of the initial level, until the review before the last
  // reaches its trigger. It needs a review in between to show the recovery.
  const recovers = Array.from({ length: before }, (_, index) => index + 1 === before || index + 1 < firstCall ? triggerLevel(index + 1) : Math.min(below(index + 1), initialLevel * (0.7 + (0.3 * index) / Math.max(before - 1, 1))))
  // A rise after the last review that is tested: no review called it, and the final level is well above the initial level. When the
  // final review is a call too, that level would call it, so the path is left to the path called on the final review.
  const endsUpLevel = initialLevel * 1.2
  const endsUp = !redemption.callOnFinalReview || endsUpLevel < triggerLevel(reviews)
  return [
    ...(firstCall <= before ? [called(firstCall)] : []),
    ...(before > firstCall ? [called(before)] : []),
    ...(redemption.callOnFinalReview ? [called(reviews)] : []),
    ...(before - firstCall >= 2 ? [{ name: 'Falls first, then recovers: called late', reviewLevels: recovers }] : []),
    ...(endsUp ? [{ name: 'Never called, ends 20% up', reviewLevels: Array.from({ length: before }, (_, index) => below(index + 1)), finalLevel: endsUpLevel }] : []),
    ...(endsFlat ? [{ name: 'Never called, ends flat', reviewLevels: Array.from({ length: before }, (_, index) => below(index + 1)), finalLevel: initialLevel }] : []),
    { name: 'Never called, ends 40% down', reviewLevels: falling, finalLevel: endsBelow(initialLevel * 0.6) },
  ]
}
