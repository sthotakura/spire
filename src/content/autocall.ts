import type { RedemptionOutcome, ReviewTest } from '../domain/autocall'
import { annualisedReturn, barrierLevelAt, callAmountAtReview, callReviewCount, couponPerReview, firstCallReview, reviewCount, reviewDates, triggerAtReview, type Autocall, type Product, type ReviewDate } from '../domain/note'
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

// The coupon rule: tested on each of its reviews until the product ends, paid on its own before then, and with the call or the maturity
// payment on the date the product ends. Memory adds the coupons missed since the last one paid. Empty without a coupon.
export function couponFormula(note: Product): FormulaLine[] {
  if (note.coupon === undefined) return []
  return [{
    lead: 'Coupon',
    segments: [
      { text: 'On each ' },
      { text: 'coupon review', concept: 'coupon-schedule' },
      { text: ' until it ends, if ' },
      { text: 'Level ≥ Coupon barrier × Initial level', concept: 'coupon-barrier' },
      { text: ', pay ' },
      { text: 'Principal × Rate × Months between coupon reviews ÷ 12', concept: 'coupon' },
      note.coupon.memory
        ? { text: ' for this review and for each review missed since the last coupon paid', concept: 'memory' }
        : { text: '; a missed coupon is not paid later', concept: 'memory' },
      { text: '. A coupon review on the date the product ends pays with it' },
    ],
  }]
}

const twoDecimalPercent = (fraction: number) => `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`

// One step for each review that was tested, and one for how the product ended. Reviews after a call are not shown: the product had
// already ended. A product that was called also gets its annualised return, over the months it actually lasted, and a heading before
// the payoff steps that follow, which say what it would have paid at maturity.
export function redemptionSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.redemption === 'bullet') return couponSteps(note, outcome)
  if (note.redemption.kind === 'issuer-call') return issuerCallSteps(note, outcome)
  const { redemption } = note
  const { callAmount, callAmountBasis, callOnFinalReview } = redemption
  const firstCall = firstCallReview(redemption)
  // With a coupon the call and the coupon can fall on different months, so each step says its month.
  const title = (test: ReviewTest) => `Review ${test.review} of ${outcome.reviews}${note.coupon === undefined ? '' : `, month ${test.month}`}`
  const callSteps = outcome.tests.map((test) => ({
    month: test.month,
    step: test.callable
      ? {
          title: title(test),
          how: `${units(test.level)} ${test.called ? 'is at or above' : 'is below'} the trigger, ${percent(triggerAtReview(redemption, test.review))} × initial level = ${units(test.triggerLevel)}`,
          value: test.called ? 'Called' : 'Not called',
          muted: !test.called,
          concept: 'trigger' as const,
        }
      : { title: title(test), how: `${units(test.level)}: in the non-call period, the first ${firstCall - 1} ${firstCall === 2 ? 'review' : 'reviews'} cannot call`, value: 'No call', muted: true, concept: 'non-call' as const },
  }))
  // In order of month, and on a month that is both, the coupon first: it is paid with the call.
  const steps: Array<Omit<CalculationStep, 'n'>> = [...couponEntries(note, outcome), ...callSteps].sort((a, b) => a.month - b.month).map(({ step }) => step)
  const withCoupon = callCouponText(note, outcome)
  steps.push(outcome.calledAtReview === undefined
    ? { title: 'Redemption', how: `No review${firstCall > 1 ? ' that could call' : ''}${callOnFinalReview ? ', including the last,' : firstCall > 1 ? '' : ' before the last'} reached the trigger, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'At maturity', concept: 'redemption' }
    : { title: 'Redemption', how: `Called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${callAmountBasis === 'per-year' ? `${percent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${percent(outcome.tests[outcome.calledAtReview - 1].callAmount)}` : percent(callAmount)})${withCoupon}`, value: units(outcome.payment), result: true, concept: 'call-amount' })
  if (outcome.calledAtReview !== undefined) steps.push(...calledSteps(note, outcome))
  return steps
}

// After a call: the annualised return over the months the product lasted, and a heading before the payoff steps, which say what it
// would have paid at maturity. With a coupon the product paid on several reviews, and a return a year from one payment would ignore
// when the others were paid, so the total paid is shown in its place.
const calledSteps = (note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> => [
  note.coupon === undefined
    ? { title: 'Annualised return', how: `(${units(outcome.payment)} ÷ ${units(note.principalAmount)})^(12 ÷ ${monthsPhrase(outcome.months)}) − 1, over the time it lasted`, value: `${twoDecimalPercent(annualisedReturn(outcome.payment, note.principalAmount, outcome.months))} a year`, concept: 'call-amount' }
    : totalPaidStep(outcome),
  { title: 'If it had run to maturity', how: 'It was called, so none of this is paid. The steps below are what the payoff would have paid at maturity.', value: '', heading: true },
]

const coupons = (n: number) => `${n} ${n === 1 ? 'coupon' : 'coupons'}`

// One step for each review on which the coupon is tested, up to the date the product ends, with its month. The last reads the final level.
function couponEntries(note: Product, outcome: RedemptionOutcome): Array<{ month: number; step: Omit<CalculationStep, 'n'> }> {
  const { coupon } = note
  if (coupon === undefined) return []
  const each = units(couponPerReview(note))
  const count = reviewCount({ term: note.term, schedule: coupon.schedule })
  return outcome.coupons.map((test) => {
    const title = `Coupon on review ${test.review} of ${count}, month ${test.month}`
    const level = test.month === note.term.months ? `Final level ${units(test.level)}` : units(test.level)
    const barrier = `the coupon barrier, ${percent(coupon.barrier)} × initial level = ${units(test.barrierLevel)}`
    if (!test.met) {
      const after = coupon.memory ? `, so its coupon is remembered: ${coupons(test.remembered)} unpaid` : ', so its coupon is missed and not paid later'
      return { month: test.month, step: { title, how: `${level} is below ${barrier}${after}`, value: '0', muted: true, concept: 'coupon' as const } }
    }
    const paid = test.coupons > 1 ? `: ${test.coupons} × ${each}, this review’s coupon and ${coupons(test.coupons - 1)} remembered` : `: ${each}`
    return { month: test.month, step: { title, how: `${level} is at or above ${barrier}${paid}`, value: units(test.paid), concept: 'coupon' as const } }
  })
}

const couponSteps = (note: Product, outcome: RedemptionOutcome) => couponEntries(note, outcome).map(({ step }) => step)

// The coupon paid with a call, for the call's step: that of a coupon review on the date of the call, or none when no coupon review falls on it.
const callCouponText = (note: Product, outcome: RedemptionOutcome): string => {
  if (note.coupon === undefined || outcome.calledAtReview === undefined) return ''
  const onCall = outcome.coupons.find((test) => test.month === outcome.months)
  return onCall === undefined ? ', no coupon review on this date' : ` + coupon ${units(onCall.paid)}`
}

// Everything paid over the product's life: the coupons on the reviews before it ended, and the payment on the review it ended on.
const totalPaidStep = (outcome: RedemptionOutcome): Omit<CalculationStep, 'n'> => ({
  title: 'Total paid',
  how: `${units(outcome.totalPaid - outcome.payment)} in coupons on earlier coupon reviews + ${units(outcome.payment)}, over ${monthsPhrase(outcome.months)}`,
  value: units(outcome.totalPaid),
  concept: 'coupon',
})

// The steps after the payoff for a product with a coupon that ran to the end of its term: the payoff payment plus the last review's
// coupons, then the total paid. A called product states its total with the call, so it has none here.
export function couponClosingSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.coupon === undefined || outcome.calledAtReview !== undefined) return []
  const last = outcome.coupons.at(-1)?.paid ?? 0
  return [
    { title: 'Paid at maturity', how: `${units(outcome.maturity.payment)} from the payoff + coupon ${units(last)} on the last review`, value: units(outcome.payment), result: true, concept: 'coupon' },
    totalPaidStep(outcome),
  ]
}

// How the coupons went: how many reviews met the barrier, what they paid, and what was not paid. Empty without a coupon.
export function explainCoupons(note: Product, outcome: RedemptionOutcome): string {
  const { coupon } = note
  if (coupon === undefined || !outcome.coupons.length) return ''
  const tested = outcome.coupons.length
  const met = outcome.coupons.filter((test) => test.met).length
  const paid = outcome.coupons.reduce((sum, test) => sum + test.paid, 0)
  const barrier = units(outcome.coupons[0].barrierLevel)
  const opening = met === 0
    ? `None of the ${tested} coupon reviews it lasted for was at or above the ${barrier} coupon barrier, so it paid no coupon.`
    : `${met} of the ${tested} coupon reviews it lasted for ${met === 1 ? 'was' : 'were'} at or above the ${barrier} coupon barrier, paying ${units(paid)} in coupons.`
  const unpaid = coupon.memory ? outcome.coupons.at(-1)!.remembered : tested - met
  const lost = unpaid === 0 ? ''
    : coupon.memory ? ` ${coupons(unpaid)} remembered from reviews below the barrier ${unpaid === 1 ? 'was' : 'were'} never paid, since no later review met it.`
      : ` ${coupons(unpaid)} missed below the barrier ${unpaid === 1 ? 'was' : 'were'} not paid, since it has no memory.`
  return `${opening}${lost} In all it paid ${units(outcome.totalPaid)}.`
}

const moreThanPrincipal = (note: Product, payment: number) => {
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  return difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
}

// An issuer call: the issuer's choice, so the sentence says which review it called on, or that it did not.
function explainIssuerCall(note: Product, outcome: RedemptionOutcome): string {
  if (outcome.calledAtReview === undefined) return 'The issuer did not call, so the product ran to the end of its term.'
  return `The issuer called the product on review ${outcome.calledAtReview} of ${outcome.reviews}, after ${monthsPhrase(outcome.months)}, and it pays ${units(outcome.payment)}, ${moreThanPrincipal(note, outcome.payment)}.`
}

// The non-call period when there is one, the coupon steps when there is a coupon, then the call, then what follows a call. The call
// reads no level, so there is no step for each call review.
function issuerCallSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.redemption === 'bullet' || note.redemption.kind !== 'issuer-call') return []
  const { callAmount, callAmountBasis, nonCallReviews = 0 } = note.redemption
  const steps: Array<Omit<CalculationStep, 'n'>> = couponSteps(note, outcome)
  if (nonCallReviews > 0) steps.unshift({ title: 'Non-call period', how: `The first ${nonCallReviews} ${nonCallReviews === 1 ? 'review' : 'reviews'} cannot be called`, value: `${nonCallReviews} ${nonCallReviews === 1 ? 'review' : 'reviews'}`, muted: true, concept: 'non-call' })
  if (outcome.calledAtReview === undefined) {
    steps.push({ title: 'Issuer call', how: `The issuer did not call, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'Not called', concept: 'redemption' })
    return steps
  }
  const amount = callAmountBasis === 'per-year' ? `${percent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${percent(callAmountAtReview(note.redemption, outcome.months))}` : percent(callAmount)
  steps.push({ title: 'Issuer call', how: `The issuer called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${amount})${callCouponText(note, outcome)}`, value: units(outcome.payment), result: true, concept: 'call-amount' }, ...calledSteps(note, outcome))
  return steps
}

export interface PathScenario {
  name: string
  // The underlier's level on each date before the last of reviewDates: the call's reviews and the coupon's, in order of month.
  reviewLevels: number[]
  // The level on the final date, for a path that gets that far. A path called earlier leaves it alone: the product ends before it.
  finalLevel?: number
}

// Named paths a reader can load, since a path is not a grid of inputs. For an autocall: called at once, called late, called late after
// a fall, never called and ending up, flat, or falling. Each is built from the trigger on each call review so it means the same whatever
// the trigger is. When the final review is a call too, there is also a path called only on it, and the paths that are never called end
// below its trigger. With a coupon there are two more: one that shows memory and one below the coupon barrier throughout. The paths are
// set on each date a level is read; a date that is only a coupon review takes the level of the next call review, which it cannot call.
export function pathScenarios(note: Product, initialLevel: number): PathScenario[] {
  const dates = reviewDates(note)
  if (dates.length < 2) return []
  const { redemption } = note
  const autocall = redemption !== 'bullet' && redemption.kind === 'autocall' ? redemption : undefined
  const reviews = callReviewCount(note)!
  const triggerLevel = (review: number) => (autocall ? barrierLevelAt(triggerAtReview(autocall, review), initialLevel) : Number.POSITIVE_INFINITY)
  // Clearly below the trigger of a review, so the review cannot call.
  const below = (review: number) => triggerLevel(review) * 0.95
  const firstCall = autocall ? firstCallReview(autocall) : 1
  const calls = (review: number, level: number) => autocall !== undefined && review >= firstCall && (review < reviews || autocall.callOnFinalReview === true) && level >= triggerLevel(review)
  // The final level of a path that is never called is below the trigger of the last review when that review is a call too.
  const endsBelow = (level: number) => (autocall?.callOnFinalReview ? Math.min(level, below(reviews)) : level)
  // A level on each date before the last, from a level on each call review before the last.
  const spread = (callLevels: number[]) => dates.slice(0, -1).map(({ month }) => callLevels[dates.find((date) => date.month >= month && date.call !== undefined)!.call! - 1] ?? callLevels.at(-1)!)
  return [...(autocall ? callPaths(autocall, initialLevel, reviews, triggerLevel, below, firstCall, endsBelow).map((path) => ({ ...path, reviewLevels: spread(path.reviewLevels) })) : []), ...couponPaths(note, initialLevel, dates, autocall ? below : () => Number.POSITIVE_INFINITY, endsBelow, calls)]
}

// The autocall's paths, as a level on each call review before the last.
function callPaths(redemption: Autocall, initialLevel: number, reviews: number, triggerLevel: (review: number) => number, below: (review: number) => number, firstCall: number, endsBelow: (level: number) => number): PathScenario[] {
  const before = reviews - 1
  // A review in the non-call period cannot call, so its level is at its trigger to show that it does not.
  const called = (review: number): PathScenario => ({
    name: review === reviews ? 'Called on the final review' : review === firstCall ? (firstCall === 1 ? 'Called on the first review' : 'Called on the first review that can call') : `Called on review ${review}`,
    reviewLevels: Array.from({ length: before }, (_, index) => (index + 1 < firstCall || index + 1 >= review ? triggerLevel(index + 1) : below(index + 1))),
    ...(review === reviews ? { finalLevel: triggerLevel(review) } : {}),
  })
  const falling = Array.from({ length: before }, (_, index) => Math.min(below(index + 1), initialLevel * (1 - (0.4 * (index + 1)) / before)))
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

// With a coupon, two paths that are never called: one below the coupon barrier on the first half of the dates and at it after, so memory
// shows, and one below it throughout. The first is left out when a level at the barrier would call on some review, as the call reads it:
// at or above that review's trigger, outside the non-call period, and on the last review only when it is a call too.
function couponPaths(note: Product, initialLevel: number, dates: ReviewDate[], below: (review: number) => number, endsBelow: (level: number) => number, calls: (review: number, level: number) => boolean): PathScenario[] {
  if (note.coupon === undefined) return []
  const earlier = dates.slice(0, -1)
  const barrier = barrierLevelAt(note.coupon.barrier, initialLevel)
  const missing = ({ call }: ReviewDate) => Math.min(call === undefined ? Number.POSITIVE_INFINITY : below(call), barrier * 0.9)
  const half = Math.ceil(earlier.length / 2)
  const recovers = earlier.map((date, index) => (index < half ? missing(date) : barrier))
  const last = dates.at(-1)!
  const recoveryCalls = earlier.some((date, index) => date.call !== undefined && calls(date.call, recovers[index])) || (last.call !== undefined && calls(last.call, barrier))
  return [
    ...(recoveryCalls ? [] : [{ name: note.coupon.memory ? 'Misses coupons, then pays them by memory' : 'Misses coupons, then meets the coupon barrier', reviewLevels: recovers, finalLevel: barrier }]),
    { name: 'Below the coupon barrier throughout', reviewLevels: earlier.map(missing), finalLevel: endsBelow(barrier * 0.9) },
  ]
}
