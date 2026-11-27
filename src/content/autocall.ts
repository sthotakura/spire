import { annualisedReturnOfPayments, type CouponTest, type RedemptionOutcome, type ReviewTest } from '../domain/autocall'
import { amortizationOf, annualisedReturn, autocallOf, barrierLevelAt, callAmountAtReview, callReviewCount, couponPerReview, firstReviewMonthOf, floatingRateOf, holderPutOf, issuerCallOf, mechanismReviewCount, callsOf, monthsPerReview, reviewCount, reviewDates, scheduleReviews, triggerAtReview, type Autocall, type CallMechanism, type HolderPut, type IssuerCall, type Product, type ReviewDate } from '../domain/note'
import type { CalculationStep } from './calculation'
import type { FormulaLine } from './formula'

const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
const percent = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`
const monthsPhrase = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`
const yearsPhrase = (months: number) => `${(months / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${months === 12 ? 'year' : 'years'}`

// The sentence about how the product ended, from the reviews. A called product says which review, at what level, and what it
// pays; one that ran to the end of its term says no review reached the trigger, and the maturity payment follows in the outcome.
export function explainRedemption(note: Product, outcome: RedemptionOutcome): string {
  // Amortization ends nothing; its sentence is explainAmortization's.
  if (note.redemption.kind === 'bullet' || amortizationOf(note.redemption) !== undefined) return ''
  const autocall = autocallOf(note.redemption)
  if (outcome.endedBy === 'holder-put') return explainHolderPut(note, outcome)
  if (autocall === undefined || outcome.endedBy === 'issuer-call') return explainIssuerCall(note, outcome)
  const { calledAtReview, tests, reviews, months, payment } = outcome
  const test = calledAtReview === undefined ? undefined : tests[calledAtReview - 1]
  if (test === undefined) {
    const reviewed = `No review${autocall.callOnFinalReview ? ', including the last,' : ' before the last'} was`
    // The trigger is one level unless it steps, when each review has its own.
    const trigger = autocall.triggerStep ? 'its trigger' : `the ${units(tests[0]?.triggerLevel ?? 0)} trigger`
    const choices = choicesNotMade(note)
    const declined = choices.length === 2 ? `, ${choices[0]} and ${choices[1]}` : choices.length === 1 ? ` and ${choices[0]}` : ''
    return `${reviewed} at or above ${trigger}${declined}, so the product ran to the end of its term.`
  }
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  const comparison = difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
  return `The level was ${units(test.level)} on review ${test.review} of ${reviews}, at or above the ${units(test.triggerLevel)} trigger, so the product was called after ${monthsPhrase(months)} and pays ${units(payment)}, ${comparison}.${outcome.issuerCallNotReached === undefined ? '' : ` The issuer’s call on its review ${outcome.issuerCallNotReached} never happened: the product had already ended.`}${putNotReached(note, outcome)}`
}

// The parties' choices a product has, as declined, for a product that ran to the end of its term.
const choicesNotMade = (note: Product): string[] => [
  ...(issuerCallOf(note.redemption) ? ['the issuer did not call'] : []),
  ...(holderPutOf(note.redemption) ? ['the holder did not put'] : []),
]

// The holder's put that something else ended the product before, or on the same date ahead of it.
function putNotReached(note: Product, outcome: RedemptionOutcome): string {
  const review = outcome.holderPutNotReached
  const holderPut = holderPutOf(note.redemption)
  if (review === undefined || holderPut === undefined) return ''
  const month = firstReviewMonthOf(holderPut) + (review - 1) * monthsPerReview[holderPut.schedule.frequency]
  return month === outcome.months
    ? ' The holder’s put on the same date comes second: the issuer’s call comes first.'
    : ` The holder’s put on its review ${review} never happened: the product had already ended.`
}

// A holder's put: the holder's choice, so the sentence says which review, the level on it, and what the payoff pays at that level. With
// an autocall too, a date that is on both schedules says the holder's put came first.
function explainHolderPut(note: Product, outcome: RedemptionOutcome): string {
  const holderPut = holderPutOf(note.redemption)!
  const reviews = mechanismReviewCount(note.term, holderPut)
  const onAutocall = autocallOf(note.redemption) !== undefined && reviewDates(note).some(({ month, call }) => month === outcome.months && call !== undefined)
  const level = units(outcome.put?.level ?? 0)
  return `The holder put the product on review ${outcome.calledAtReview} of ${reviews}, after ${monthsPhrase(outcome.months)}, and it pays ${units(outcome.payment)}, ${comparedWithPrincipal(note, outcome.payment)}: what the payoff gives at that review’s level of ${level}.${onAutocall ? ' That date is also an autocall review: the holder’s put comes first, so the trigger is not tested.' : ''}${outcome.issuerCallNotReached === undefined ? '' : ` The issuer’s call on its review ${outcome.issuerCallNotReached} never happened: the product had already ended.`}`
}

// A payment against principal, more or less: a put pays the payoff early, which can be below principal.
const comparedWithPrincipal = (note: Product, payment: number) => {
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  return difference > 0 ? `${units(difference)} more than principal` : difference < 0 ? `${units(difference)} less than principal` : 'the same as principal'
}

// The call rule beside the payment rule. It is tested on each review before the last, and the last review pays the payoff unless it
// is a call too. A trigger that steps and a call amount for each year say so in the rule.
// A holder put has a rule of its own: on a review the holder chooses, the payment at maturity read at that review's level.
export const redemptionFormula = (note: Product): FormulaLine[] => {
  const mechanisms = callsOf(note.redemption)
  const holderPut = holderPutOf(note.redemption)
  return [
    ...mechanisms.map((mechanism) => mechanismFormula(mechanism, mechanisms.length === 1 ? 'Call' : mechanism.kind === 'autocall' ? 'Autocall' : 'Issuer call')),
    ...(holderPut === undefined ? [] : [putFormula(holderPut)]),
  ]
}

function putFormula(holderPut: HolderPut): FormulaLine {
  const first = firstReviewMonthOf(holderPut)
  const from = first > monthsPerReview[holderPut.schedule.frequency] ? ` from month ${first}` : ''
  return {
    lead: 'Holder put',
    segments: [
      { text: `On a review${from} before the last, if the holder puts, pay ` },
      { text: 'the payment at maturity, with the level on that review as the final level', concept: 'holder-put' },
      { text: ' and end' },
    ],
  }
}

function mechanismFormula(mechanism: CallMechanism, lead: string): FormulaLine {
  // The reviews start one period in unless the call states a later first review, which the rule then names.
  const first = firstReviewMonthOf(mechanism)
  const from = first > monthsPerReview[mechanism.schedule.frequency] ? ` from month ${first}` : ''
  if (mechanism.kind === 'issuer-call') {
    return {
      lead,
      segments: [
        { text: `On a review${from} before the last, if the issuer calls, pay ` },
        { text: mechanism.callAmountBasis === 'per-year' ? 'Principal × (1 + Call amount × Years elapsed)' : 'Principal × (1 + Call amount)', concept: 'issuer-call-amount' },
        { text: ' and end' },
      ],
    }
  }
  const { triggerStep, callAmountBasis, callOnFinalReview } = mechanism
  const reviews = callOnFinalReview
    ? from ? `On every review${from}, if ` : 'On every review, if '
    : from ? `On a review${from} to the last but one, if ` : 'On a review before the last, if '
  return {
    lead,
    segments: [
      { text: reviews },
      { text: triggerStep ? 'Level ≥ Trigger on that review × Initial level' : 'Level ≥ Trigger × Initial level', concept: 'trigger' },
      { text: ', pay ' },
      { text: callAmountBasis === 'per-year' ? 'Principal × (1 + Call amount × Years elapsed)' : 'Principal × (1 + Call amount)', concept: 'call-amount' },
      { text: ' and end' },
    ],
  }
}

// The coupon rule: tested on each of its reviews until the product ends, paid on its own before then, and with the call or the maturity
// payment on the date the product ends. Memory adds the coupons missed since the last one paid. A fixed coupon is paid on each review
// with no test. Empty without a coupon.
export function couponFormula(note: Product): FormulaLine[] {
  if (note.coupon === undefined) return []
  const floating = floatingRateOf(note.coupon)
  if (floating !== undefined) {
    const bounds = `at least ${floating.floor === 0 ? '0%' : 'Floor'}${floating.cap === undefined ? '' : ' and at most Cap'}`
    return [{
      lead: 'Coupon',
      segments: [
        { text: 'On each ' },
        { text: 'coupon review', concept: 'coupon-schedule' },
        { text: ' until it ends, pay ' },
        { text: 'Principal × Rate × Months between coupon reviews ÷ 12', concept: 'coupon' },
        { text: ', whatever the level, where ' },
        { text: `Rate = Reference rate on the review + Spread, ${bounds}`, concept: 'coupon' },
        { text: '. A coupon review on the date the product ends pays with it' },
      ],
    }]
  }
  if (note.coupon.barrier === undefined) {
    return [{
      lead: 'Coupon',
      segments: [
        { text: 'On each ' },
        { text: 'coupon review', concept: 'coupon-schedule' },
        { text: ' until it ends, pay ' },
        { text: 'Principal × Rate × Months between coupon reviews ÷ 12', concept: 'coupon' },
        { text: ', whatever the level. A coupon review on the date the product ends pays with it' },
      ],
    }]
  }
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
  if (note.redemption.kind === 'bullet') return couponSteps(note, outcome)
  // Amortization has steps of its own, amortizationSteps, in place of these.
  if (amortizationOf(note.redemption) !== undefined) return []
  const redemption = autocallOf(note.redemption)
  if (redemption === undefined) return choiceSteps(note, outcome)
  const { callAmount, callAmountBasis, callOnFinalReview } = redemption
  // With a coupon the call and the coupon can fall on different months, and with a later first review a review's number is not its
  // month, so each step says its month.
  const withMonth = note.coupon !== undefined || firstReviewMonthOf(redemption) > monthsPerReview[redemption.schedule.frequency]
  const title = (test: ReviewTest) => `Review ${test.review} of ${outcome.reviews}${withMonth ? `, month ${test.month}` : ''}`
  const single = (test: ReviewTest) => ({
    title: title(test),
    how: `${units(test.level)} ${test.called ? 'is at or above' : 'is below'} the trigger, ${percent(triggerAtReview(redemption, test.review))} × initial level = ${units(test.triggerLevel)}`,
    value: test.called ? 'Called' : 'Not called',
    muted: !test.called,
    concept: 'trigger' as const,
  })
  // Reviews in a row that did not call. A trigger that steps is a different level on each, so the step gives the first and the last.
  const grouped = (run: ReviewTest[]) => {
    const [first, last] = [run[0], run.at(-1)!]
    const trigger = first.triggerLevel === last.triggerLevel
      ? `the trigger, ${percent(triggerAtReview(redemption, first.review))} × initial level = ${units(first.triggerLevel)}`
      : `its trigger, from ${units(first.triggerLevel)} to ${units(last.triggerLevel)}`
    return {
      title: `Reviews ${first.review}–${last.review} of ${outcome.reviews}${withMonth ? `, months ${first.month}–${last.month}` : ''}`,
      how: `Each level is below ${trigger}; the review table shows each review`,
      value: 'Not called',
      muted: true,
      concept: 'trigger' as const,
    }
  }
  const callSteps = inRuns(outcome.tests, (test) => (test.called ? undefined : 'not called'))
    .flatMap((run) => (run.length >= shortestRun ? [{ month: run[0].month, step: grouped(run) }] : run.map((test) => ({ month: test.month, step: single(test) }))))
  // In order of month, and on a month that is both, the coupon first: it is paid with the call.
  const steps: Array<Omit<CalculationStep, 'n'>> = [...couponEntries(note, outcome), ...callSteps].sort((a, b) => a.month - b.month).map(({ step }) => step)
  const issuerCall = issuerCallOf(note.redemption)
  const holderPut = holderPutOf(note.redemption)
  if (issuerCall !== undefined && outcome.endedBy === 'issuer-call') return [...steps, ...issuerCallEnding(note, issuerCall, outcome)]
  if (holderPut !== undefined && outcome.endedBy === 'holder-put') return [...steps, ...putEnding(note, outcome)]
  if (issuerCall !== undefined && outcome.endedBy === undefined) steps.push({ title: 'Issuer call', how: 'The issuer did not call', value: 'Not called', muted: true, concept: 'issuer-call' })
  if (holderPut !== undefined && outcome.endedBy === undefined) steps.push({ title: 'Holder put', how: 'The holder did not put', value: 'Not put', muted: true, concept: 'holder-put' })
  const withCoupon = callCouponText(note, outcome)
  steps.push(outcome.calledAtReview === undefined
    ? { title: 'Redemption', how: `No review${callOnFinalReview ? ', including the last,' : ' before the last'} reached the trigger, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: 'At maturity', concept: 'redemption' }
    : { title: 'Redemption', how: `Called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${callAmountBasis === 'per-year' ? `${twoDecimalPercent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${percent(outcome.tests[outcome.calledAtReview - 1].callAmount)}` : twoDecimalPercent(callAmount)})${withCoupon}`, value: units(outcome.payment), result: true, concept: 'call-amount' })
  if (outcome.calledAtReview !== undefined) steps.push(...calledSteps(note, outcome))
  return steps
}

// After a call: the annualised return over the months the product lasted, and a heading before the payoff steps, which say what it
// would have paid at maturity. With a coupon the product paid on several reviews, so the total paid and the total return come first,
// and the return a year reads when each payment was made.
const calledSteps = (note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> => [
  note.coupon === undefined
    ? { title: 'Annualised return', how: `(${units(outcome.payment)} ÷ ${units(note.principalAmount)})^(12 ÷ ${monthsPhrase(outcome.months)}) − 1, over the time it lasted`, value: `${signedAnnual(annualisedReturn(outcome.payment, note.principalAmount, outcome.months))} a year`, concept: outcome.endedBy === 'issuer-call' ? 'issuer-call-amount' : outcome.endedBy === 'holder-put' ? 'holder-put' : 'call-amount' }
    : totalPaidStep(outcome),
  ...(note.coupon === undefined ? [] : [totalReturnStep(note, outcome), annualisedReturnStep(note, outcome)]),
  { title: 'If it had run to maturity', how: `It was ${outcome.endedBy === 'holder-put' ? 'put' : 'called'}, so none of this is paid. The steps below are what the payoff would have paid at maturity.`, value: '', heading: true },
]

// A return a year with a true minus when it is a loss, as a put below principal can be.
const signedAnnual = (rate: number) => `${rate < 0 ? '−' : ''}${twoDecimalPercent(Math.abs(rate))}`

const coupons = (n: number) => `${n} ${n === 1 ? 'coupon' : 'coupons'}`

// A run of this many reviews in a row with the same result reads as one step: the review table already shows each review, and a
// monthly schedule over ten years would otherwise list hundreds of steps that say the same thing (docs/calculation-path.md).
const shortestRun = 3

// Splits reviews into runs of reviews in a row with the same key. A review with no key stands alone, since it changes something, such
// as a call or remembered coupons paid; so does the last, which reads the final level and on which the path closes.
function inRuns<T>(items: T[], keyOf: (item: T) => string | undefined): T[][] {
  const runs: T[][] = []
  let previous: string | undefined
  items.forEach((item, index) => {
    const key = index === items.length - 1 ? undefined : keyOf(item)
    if (key !== undefined && key === previous) runs.at(-1)!.push(item)
    else runs.push([item])
    previous = key
  })
  return runs
}

// One step for each review on which the coupon is tested, up to the date the product ends, with its month. The last reads the final
// level. Runs of reviews that paid one coupon each, or missed, read as one step.
function couponEntries(note: Product, outcome: RedemptionOutcome): Array<{ month: number; step: Omit<CalculationStep, 'n'> }> {
  const { coupon } = note
  if (coupon === undefined) return []
  const count = reviewCount({ term: note.term, schedule: coupon.schedule })
  const { barrier: couponBarrier } = coupon
  // A floating coupon's reviews group only while the reference rate stays the same, so a group is one working repeated: reviews at
  // different reference rates can pay the same coupon at a floor or a cap, and grouped they would all read as the first one's rate.
  const keyOf = (test: CouponTest) => (test.coupons > 1 ? undefined : test.met ? `paid ${test.referenceRate ?? ''}` : 'missed')
  // What a non-contingent coupon's step says before its working: fixed, or the review's floating rate and how it came about.
  const unconditional = (test: CouponTest) => (test.referenceRate === undefined ? 'Fixed' : `Floating at ${floatingRateWorking(note, test)}`)
  const grouped = (run: CouponTest[]): Omit<CalculationStep, 'n'> => {
    const [first, last] = [run[0], run.at(-1)!]
    const title = `Coupons on reviews ${first.review}–${last.review} of ${count}, months ${first.month}–${last.month}`
    const paid = units(run.reduce((sum, test) => sum + test.paid, 0))
    if (couponBarrier === undefined || first.barrierLevel === undefined) return { title, how: `${unconditional(first)}, paid whatever the level: ${couponWorking(note, first, run.length)}`, value: paid, concept: 'coupon' }
    const barrier = `the coupon barrier, ${percent(couponBarrier)} × initial level = ${units(first.barrierLevel)}`
    if (!first.met) {
      const after = coupon.memory ? `, so their coupons are remembered: ${coupons(last.remembered)} unpaid` : ', so their coupons are missed and not paid later'
      return { title, how: `Each level is below ${barrier}${after}; the review table shows each review`, value: '0', muted: true, concept: 'coupon' }
    }
    return { title, how: `Each level is at or above ${barrier}: ${couponWorking(note, first, run.length)}; the review table shows each review`, value: paid, concept: 'coupon' }
  }
  const single = (test: CouponTest): Omit<CalculationStep, 'n'> => {
    const title = `Coupon on review ${test.review} of ${count}, month ${test.month}`
    // A fixed coupon reads no level: every review pays. Its tests have no level, and a contingent coupon's always have one.
    if (couponBarrier === undefined || test.barrierLevel === undefined) {
      return { title, how: `${unconditional(test)}, paid whatever the level: ${couponWorking(note, test, test.coupons)}`, value: units(test.paid), concept: 'coupon' as const }
    }
    const level = test.month === note.term.months ? `Final level ${units(test.level)}` : units(test.level)
    const barrier = `the coupon barrier, ${percent(couponBarrier)} × initial level = ${units(test.barrierLevel)}`
    if (!test.met) {
      const after = coupon.memory ? `, so its coupon is remembered: ${coupons(test.remembered)} unpaid` : ', so its coupon is missed and not paid later'
      return { title, how: `${level} is below ${barrier}${after}`, value: '0', muted: true, concept: 'coupon' as const }
    }
    const paid = `: ${couponWorking(note, test, test.coupons)}${test.coupons > 1 ? `, this review’s coupon and ${coupons(test.coupons - 1)} remembered` : ''}`
    return { title, how: `${level} is at or above ${barrier}${paid}`, value: units(test.paid), concept: 'coupon' as const }
  }
  return inRuns(outcome.coupons, keyOf)
    .flatMap((run) => (run.length >= shortestRun ? [{ month: run[0].month, step: grouped(run) }] : run.map((test) => ({ month: test.month, step: single(test) }))))
}

const couponSteps = (note: Product, outcome: RedemptionOutcome) => couponEntries(note, outcome).map(({ step }) => step)

// The coupon paid with a call, for the call's step: that of a coupon review on the date of the call, or none when no coupon review falls on it.
const callCouponText = (note: Product, outcome: RedemptionOutcome): string => {
  if (note.coupon === undefined || outcome.calledAtReview === undefined) return ''
  const onCall = outcome.coupons.find((test) => test.month === outcome.months)
  return onCall === undefined ? ', no coupon review on this date' : ` + coupon ${units(onCall.paid)}`
}

// A row of the review table: a date, the place of its level among the levels the scenario states for the dates before the last, if it
// has one, and whether it is the last date, the end of the term, which reads the final level.
export interface ReviewRow {
  date: ReviewDate
  index?: number
  final?: true
}

// The rows of the review table: each date a level is read on, ending with the last, which reads the final level, and each review of a
// non-contingent coupon that falls between them, which reads no level and has no place. A product with no date that reads a level has
// no table, unless its coupon floats: each of its reviews takes a reference rate, so the table lists them, the last at the end of the term.
export function reviewTableRows(note: Product): ReviewRow[] {
  const dates = reviewDates(note)
  const { coupon } = note
  const floats = coupon !== undefined && floatingRateOf(coupon) !== undefined
  if (!dates.length && !floats) return []
  const read: ReviewRow[] = dates.map((date, index) => (index < dates.length - 1 ? { date, index } : { date, final: true }))
  const months = new Set(dates.map(({ month }) => month))
  const fixed = coupon === undefined || coupon.barrier !== undefined ? [] : scheduleReviews(note.term, coupon.schedule) ?? []
  const unread = fixed.filter(({ month }) => !months.has(month)).map(({ review, month }): ReviewRow => ({ date: { month, coupon: review }, ...(month === note.term.months ? { final: true as const } : {}) }))
  return [...read, ...unread].sort((a, b) => a.date.month - b.date.month)
}

// A coupon review's cell in the review table, with its working: principal × the rate a year × the months between coupon reviews ÷ 12,
// or with memory that many coupons times one. A review below the barrier says it missed, and with memory that its coupon is remembered.
export function couponCell(note: Product, test: CouponTest): string {
  const { coupon } = note
  if (coupon === undefined) return ''
  if (!test.met) return coupon.memory ? 'Missed · remembered' : 'Missed'
  return couponWorking(note, test, test.coupons)
}

// A rate as a percentage to eight decimals, every decimal the interface accepts; a finer rate, which only a structure can state, is
// marked as approximate. A difference below a billionth of a percent is floating-point noise, as in 0.1735 × 100 = 17.349999999999998.
const ratePercent = (fraction: number) => {
  const percent = fraction * 100
  const shown = Math.round(percent * 1e8) / 1e8
  return `${Math.abs(shown - percent) > 1e-9 ? '≈' : ''}${shown < 0 ? '−' : ''}${Math.abs(shown).toLocaleString('en-US', { maximumFractionDigits: 8 })}%`
}

// How a floating coupon's rate on a review came about: the reference rate plus the spread, and the floor or the cap when it applied.
export function floatingRateWorking(note: Product, test: CouponTest): string {
  const floating = note.coupon === undefined ? undefined : floatingRateOf(note.coupon)
  if (floating === undefined || test.referenceRate === undefined) return ''
  const sum = test.referenceRate + floating.spread
  const added = `${ratePercent(test.referenceRate)} ${floating.spread < 0 ? '−' : '+'} ${ratePercent(Math.abs(floating.spread))}`
  if (Math.abs(test.rate - sum) <= 1e-12) return `${added} = ${ratePercent(test.rate)}`
  return `${added} = ${ratePercent(sum)}, ${test.rate === floating.floor ? 'raised to the floor' : 'lowered to the cap'}, ${ratePercent(test.rate)}`
}

// The coupons a review pays, worked out: the number of coupons × principal × the rate a year × the months between coupon reviews ÷ 12.
// Only the result is rounded. A coupon rounded first and then multiplied would show a false sum: 11.5% a year reviewed monthly is
// 9.5833 a review, and 2 × 9.58 is 19.16, not the 19.17 paid. The rate is shown to eight decimals of a percent, every decimal the
// interface accepts; a finer rate, which only a structure can state, is marked as approximate. The review table and the calculation
// both show it, so they read the same.
// A floating coupon is worked out at the review's own rate, from its reference rate.
function couponWorking(note: Product, test: Pick<CouponTest, 'rate' | 'referenceRate'>, count: number): string {
  if (note.coupon === undefined) return ''
  return `${count > 1 ? `${count} × ` : ''}${units(note.principalAmount)} × ${ratePercent(test.rate)} × ${monthsPerReview[note.coupon.schedule.frequency]}/12 = ${units(count * couponPerReview(note, test.referenceRate))}`
}

// Everything paid over the product's life: the coupons on the reviews before it ended, and the payment on the review it ended on.
export const totalPaidStep = (outcome: RedemptionOutcome): Omit<CalculationStep, 'n'> => ({
  title: 'Total paid',
  how: `${units(outcome.totalPaid - outcome.payment)} in coupons on earlier coupon reviews + ${units(outcome.payment)}, over ${monthsPhrase(outcome.months)}`,
  value: units(outcome.totalPaid),
  concept: 'coupon',
})

// The return on principal over the product's life, from the total paid: not a return a year, which reads when each payment was made.
export const totalReturn = (note: Product, outcome: RedemptionOutcome) => outcome.totalPaid / note.principalAmount - 1
export const signedTwoDecimalPercent = (fraction: number) => `${fraction < 0 ? '−' : fraction > 0 ? '+' : ''}${twoDecimalPercent(Math.abs(fraction))}`
export const totalReturnStep = (note: Product, outcome: RedemptionOutcome): Omit<CalculationStep, 'n'> => ({
  title: 'Total return',
  how: `(${units(outcome.totalPaid)} − ${units(note.principalAmount)}) ÷ ${units(note.principalAmount)}, over ${monthsPhrase(outcome.months)}`,
  value: signedTwoDecimalPercent(totalReturn(note, outcome)),
  concept: 'coupon',
})

// The return a year over every payment, each read from its month (docs/cash-flow-result.md). With a loss it has a true minus, as the
// total return does.
export const annualisedOf = (note: Product, outcome: RedemptionOutcome) => {
  const rate = annualisedReturnOfPayments(outcome.payments, note.principalAmount)
  return `${rate < 0 ? '−' : ''}${twoDecimalPercent(Math.abs(rate))} a year`
}
export const annualisedReturnStep = (note: Product, outcome: RedemptionOutcome): Omit<CalculationStep, 'n'> => ({
  title: 'Annualised return',
  how: outcome.payments.length === 1
    ? `(${units(outcome.payment)} ÷ ${units(note.principalAmount)})^(12 ÷ ${monthsPhrase(outcome.months)}) − 1, over the time it lasted`
    : `The rate a year at which the ${outcome.payments.length} payments over ${monthsPhrase(outcome.months)}, each discounted from its month, add up to ${units(note.principalAmount)}`,
  value: annualisedOf(note, outcome),
  concept: 'coupon',
})

// The steps after the payoff for a product with a coupon that ran to the end of its term: the payoff payment plus the last review's
// coupons, then the total paid, the total return and the return a year. A called product states them with the call, so it has none here,
// and nor does an amortizing one, which has no payoff and states them with its instalments.
export function couponClosingSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  if (note.coupon === undefined || outcome.calledAtReview !== undefined || outcome.maturity === undefined) return []
  const last = outcome.coupons.at(-1)?.paid ?? 0
  return [
    { title: 'Paid at maturity', how: `${units(outcome.maturity.payment)} from the payoff + coupon ${units(last)} on the last review`, value: units(outcome.payment), result: true, concept: 'coupon' },
    totalPaidStep(outcome),
    totalReturnStep(note, outcome),
    annualisedReturnStep(note, outcome),
  ]
}

// How the coupons went: how many reviews met the barrier, what they paid, and what was not paid, then the total paid and the total
// return. A fixed coupon says what every review paid. A product called before its first coupon review says so. Empty without a coupon.
export function explainCoupons(note: Product, outcome: RedemptionOutcome): string {
  const { coupon } = note
  if (coupon === undefined) return ''
  const total = ` In all it paid ${units(outcome.totalPaid)}, a total return of ${signedTwoDecimalPercent(totalReturn(note, outcome))} over ${monthsPhrase(outcome.months)}, or ${annualisedOf(note, outcome)}.`
  if (!outcome.coupons.length) return `It ended before its first coupon review, so it paid no coupon.${total}`
  const tested = outcome.coupons.length
  const met = outcome.coupons.filter((test) => test.met).length
  const paid = outcome.coupons.reduce((sum, test) => sum + test.paid, 0)
  const [first] = outcome.coupons
  const floating = floatingRateOf(coupon)
  if (floating !== undefined) {
    const floored = outcome.coupons.filter((test) => test.referenceRate !== undefined && test.rate === floating.floor && test.referenceRate + floating.spread < floating.floor).length
    const capped = outcome.coupons.filter((test) => test.referenceRate !== undefined && floating.cap !== undefined && test.rate === floating.cap && test.referenceRate + floating.spread > floating.cap).length
    const bounds = [floored ? `the floor held ${floored === 1 ? 'one' : floored} at ${ratePercent(floating.floor)}` : '', capped ? `the cap held ${capped === 1 ? 'one' : capped} at ${ratePercent(floating.cap!)}` : ''].filter(Boolean).join(' and ')
    return `It paid its floating coupon on ${tested === 1 ? 'the one coupon review' : `each of the ${tested} coupon reviews`} it lasted for, whatever the underlier did, each at its own reference rate${bounds ? `; ${bounds}` : ''}: ${units(paid)} in coupons.${total}`
  }
  if (coupon.barrier === undefined || first.barrierLevel === undefined) return `It paid its fixed coupon on ${tested === 1 ? 'the one coupon review' : `each of the ${tested} coupon reviews`} it lasted for, whatever the underlier did: ${units(paid)} in coupons.${total}`
  const barrier = units(first.barrierLevel)
  const opening = met === 0
    ? `None of the ${tested} coupon reviews it lasted for was at or above the ${barrier} coupon barrier, so it paid no coupon.`
    : `${met} of the ${tested} coupon reviews it lasted for ${met === 1 ? 'was' : 'were'} at or above the ${barrier} coupon barrier, paying ${units(paid)} in coupons.`
  const unpaid = coupon.memory ? outcome.coupons.at(-1)!.remembered : tested - met
  const lost = unpaid === 0 ? ''
    : coupon.memory ? ` ${coupons(unpaid)} remembered from reviews below the barrier ${unpaid === 1 ? 'was' : 'were'} never paid, since no later review met it.`
      : ` ${coupons(unpaid)} missed below the barrier ${unpaid === 1 ? 'was' : 'were'} not paid, since it has no memory.`
  return `${opening}${lost}${total}`
}

const moreThanPrincipal = (note: Product, payment: number) => {
  const difference = Math.round((payment - note.principalAmount) * 100) / 100
  return difference > 0 ? `${units(difference)} more than principal` : 'the same as principal'
}

// An issuer call: the issuer's choice, so the sentence says which review it called on, or that it did not. With an autocall too, a date
// that is on both schedules says the issuer's call came first.
function explainIssuerCall(note: Product, outcome: RedemptionOutcome): string {
  if (outcome.calledAtReview === undefined) {
    const choices = choicesNotMade(note)
    return `${choices.join(' and ').replace(/^t/, 'T')}, so the product ran to the end of its term.`
  }
  const issuerReviews = mechanismReviewCount(note.term, issuerCallOf(note.redemption)!)
  const onBoth = autocallOf(note.redemption) !== undefined && reviewDates(note).some(({ month, call }) => month === outcome.months && call !== undefined)
  return `The issuer called the product on review ${outcome.calledAtReview} of ${issuerReviews}, after ${monthsPhrase(outcome.months)}, and it pays ${units(outcome.payment)}, ${moreThanPrincipal(note, outcome.payment)}.${onBoth ? ' That date is also an autocall review: the issuer’s call comes first, so the trigger is not tested.' : ''}${putNotReached(note, outcome)}`
}

// With no autocall, the parties' choices: each one's first review when it is later than one period in, the coupon steps when there is a
// coupon, then the call or the put that ended the product and what follows, or that neither party acted. Neither choice reads a level
// on its reviews, so there is no step for each review.
function choiceSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  const issuerCall = issuerCallOf(note.redemption)
  const holderPut = holderPutOf(note.redemption)
  const steps: Array<Omit<CalculationStep, 'n'>> = couponSteps(note, outcome)
  const both = issuerCall !== undefined && holderPut !== undefined
  const firstSteps: Array<Omit<CalculationStep, 'n'>> = []
  if (issuerCall !== undefined && firstReviewMonthOf(issuerCall) > monthsPerReview[issuerCall.schedule.frequency]) firstSteps.push({ title: both ? 'First call review' : 'First review', how: `The issuer cannot call before month ${firstReviewMonthOf(issuerCall)}`, value: `Month ${firstReviewMonthOf(issuerCall)}`, muted: true, concept: 'issuer-first-review' })
  if (holderPut !== undefined && firstReviewMonthOf(holderPut) > monthsPerReview[holderPut.schedule.frequency]) firstSteps.push({ title: both ? 'First put review' : 'First review', how: `The holder cannot put before month ${firstReviewMonthOf(holderPut)}`, value: `Month ${firstReviewMonthOf(holderPut)}`, muted: true, concept: 'put-first-review' })
  steps.unshift(...firstSteps)
  if (issuerCall !== undefined && outcome.endedBy === 'issuer-call') return [...steps, ...issuerCallEnding(note, issuerCall, outcome)]
  if (outcome.endedBy === 'holder-put') return [...steps, ...putEnding(note, outcome)]
  const declined = [...(issuerCall ? ['the issuer did not call'] : []), ...(holderPut ? ['the holder did not put'] : [])].join(' and ')
  steps.push({ title: both ? 'Issuer call and holder put' : issuerCall ? 'Issuer call' : 'Holder put', how: `${declined.replace(/^t/, 'T')}, so the product runs to the end of its ${monthsPhrase(outcome.months)} term`, value: both ? 'Neither' : issuerCall ? 'Not called' : 'Not put', concept: 'redemption' })
  return steps
}

// The holder's put that ended the product: the payment at maturity at the level on the put review, and what follows. The payoff is a
// tracker, so that payment is principal × the level × any adjustment factor ÷ the initial level.
function putEnding(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  const { put } = outcome
  if (put === undefined) return []
  const factor = note.redemption.adjustmentFactor ?? 1
  const working = `${units(note.principalAmount)} × ${units(put.level)}${factor === 1 ? '' : ` × ${twoDecimalPercent(factor)}`} ÷ ${units(put.breakdown.initialLevel)}`
  return [
    { title: 'Holder put', how: `The holder put on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}, with the level at ${units(put.level)}. It is paid the payment at maturity at that level: ${working}${callCouponText(note, outcome)}`, value: units(outcome.payment), result: true, concept: 'holder-put' },
    ...calledSteps(note, outcome),
  ]
}

// The issuer's call that ended the product, and what follows a call.
function issuerCallEnding(note: Product, issuerCall: IssuerCall, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  const { callAmount, callAmountBasis } = issuerCall
  const amount = callAmountBasis === 'per-year' ? `${twoDecimalPercent(callAmount)} a year × ${yearsPhrase(outcome.months)} = ${twoDecimalPercent(callAmountAtReview(issuerCall, outcome.months))}` : twoDecimalPercent(callAmount)
  return [{ title: 'Issuer call', how: `The issuer called on review ${outcome.calledAtReview}, after ${monthsPhrase(outcome.months)}: principal × (1 + ${amount})${callCouponText(note, outcome)}`, value: units(outcome.payment), result: true, concept: 'issuer-call-amount' }, ...calledSteps(note, outcome)]
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
  const autocall = autocallOf(note.redemption)
  const reviews = callReviewCount(note)!
  const triggerLevel = (review: number) => (autocall ? barrierLevelAt(triggerAtReview(autocall, review), initialLevel) : Number.POSITIVE_INFINITY)
  // Clearly below the trigger of a review, so the review cannot call.
  const below = (review: number) => triggerLevel(review) * 0.95
  const calls = (review: number, level: number) => autocall !== undefined && (review < reviews || autocall.callOnFinalReview === true) && level >= triggerLevel(review)
  // The final level of a path that is never called is below the trigger of the last review when that review is a call too.
  const endsBelow = (level: number) => (autocall?.callOnFinalReview ? Math.min(level, below(reviews)) : level)
  // A level on each date before the last, from a level on each call review before the last.
  const spread = (callLevels: number[]) => dates.slice(0, -1).map(({ month }) => callLevels[dates.find((date) => date.month >= month && date.call !== undefined)!.call! - 1] ?? callLevels.at(-1)!)
  return [...(autocall ? callPaths(autocall, initialLevel, reviews, triggerLevel, below, endsBelow).map((path) => ({ ...path, reviewLevels: spread(path.reviewLevels) })) : []), ...couponPaths(note, initialLevel, dates, autocall ? below : () => Number.POSITIVE_INFINITY, endsBelow, calls)]
}

// The autocall's paths, as a level on each call review before the last.
function callPaths(redemption: Autocall, initialLevel: number, reviews: number, triggerLevel: (review: number) => number, below: (review: number) => number, endsBelow: (level: number) => number): PathScenario[] {
  const before = reviews - 1
  const called = (review: number): PathScenario => ({
    name: review === reviews ? 'Called on the final review' : review === 1 ? 'Called on the first review' : `Called on review ${review}`,
    reviewLevels: Array.from({ length: before }, (_, index) => (index + 1 >= review ? triggerLevel(index + 1) : below(index + 1))),
    ...(review === reviews ? { finalLevel: triggerLevel(review) } : {}),
  })
  const falling = Array.from({ length: before }, (_, index) => Math.min(below(index + 1), initialLevel * (1 - (0.4 * (index + 1)) / before)))
  const endsFlat = endsBelow(initialLevel) === initialLevel
  // A fall that recovers: each review is lower than its trigger, rising from 70% of the initial level, until the review before the last
  // reaches its trigger. It needs a review in between to show the recovery.
  const recovers = Array.from({ length: before }, (_, index) => index + 1 === before ? triggerLevel(index + 1) : Math.min(below(index + 1), initialLevel * (0.7 + (0.3 * index) / Math.max(before - 1, 1))))
  // A rise after the last review that is tested: no review called it, and the final level is well above the initial level. When the
  // final review is a call too, that level would call it, so the path is left to the path called on the final review.
  const endsUpLevel = initialLevel * 1.2
  const endsUp = !redemption.callOnFinalReview || endsUpLevel < triggerLevel(reviews)
  return [
    ...(before >= 1 ? [called(1)] : []),
    ...(before > 1 ? [called(before)] : []),
    ...(redemption.callOnFinalReview ? [called(reviews)] : []),
    ...(before - 1 >= 2 ? [{ name: 'Falls first, then recovers: called late', reviewLevels: recovers }] : []),
    ...(endsUp ? [{ name: 'Never called, ends 20% up', reviewLevels: Array.from({ length: before }, (_, index) => below(index + 1)), finalLevel: endsUpLevel }] : []),
    ...(endsFlat ? [{ name: 'Never called, ends flat', reviewLevels: Array.from({ length: before }, (_, index) => below(index + 1)), finalLevel: initialLevel }] : []),
    { name: 'Never called, ends 40% down', reviewLevels: falling, finalLevel: endsBelow(initialLevel * 0.6) },
  ]
}

// With a coupon, two paths that are never called: one below the coupon barrier on the first half of the dates and at it after, so memory
// shows, and one below it throughout. The first is left out when a level at the barrier would call on some review, as the call reads it:
// at or above that review's trigger, and on the last review only when it is a call too.
// A fixed coupon reads no level, so it has none.
function couponPaths(note: Product, initialLevel: number, dates: ReviewDate[], below: (review: number) => number, endsBelow: (level: number) => number, calls: (review: number, level: number) => boolean): PathScenario[] {
  if (note.coupon?.barrier === undefined) return []
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
