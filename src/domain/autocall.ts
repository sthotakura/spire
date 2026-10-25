import { barrierLevelAt, callAmountAtReview, callReviewCount, couponPerReview, firstCallReview, lastCallReview, maturityPayment, monthsPerReview, reviewCount, reviewDates, triggerAtReview, paymentBreakdown, validateProduct, type DeterminedLevels, type PaymentBreakdown, type Product } from './note'

// The level at or above which the final review calls the product, from the determined initial level. Undefined when the final review
// is not a call.
export function finalCallLevel(note: Product, initialLevel: number): number | undefined {
  const { redemption } = note
  const reviews = callReviewCount(note)
  if (redemption === 'bullet' || redemption.kind !== 'autocall' || !redemption.callOnFinalReview || reviews === undefined) return undefined
  return barrierLevelAt(triggerAtReview(redemption, reviews), initialLevel)
}

// The coupon barrier as an underlier level, from the determined initial level. Undefined when the product has no coupon, or a fixed
// coupon, which has no barrier.
export const couponBarrierLevel = (note: Product, initialLevel: number): number | undefined =>
  note.coupon?.barrier === undefined ? undefined : barrierLevelAt(note.coupon.barrier, initialLevel)

// What the product pays at the end of its term for a final level, if no earlier review called it: the payoff, or, when the final
// review is a call and the final level is at or above its trigger, principal plus the call amount. With a contingent coupon, a final
// level at or above the coupon barrier adds the last review's own coupon; coupons remembered from earlier reviews depend on the path, so
// they are left out. A fixed coupon adds the last coupon at every level. This is the payment the payoff chart draws against the final
// level. It equals the maturity payment when the final review is not a call and there is no coupon.
export function paymentAtEnd(note: Product, levels: DeterminedLevels): number {
  const { redemption } = note
  const call = finalCallLevel(note, levels.initial)
  const couponBarrier = couponBarrierLevel(note, levels.initial)
  const coupon = note.coupon !== undefined && (couponBarrier === undefined || levels.final >= couponBarrier) ? couponPerReview(note) : 0
  if (redemption !== 'bullet' && call !== undefined && levels.final >= call) {
    return note.principalAmount * (1 + callAmountAtReview(redemption, note.term.months)) + coupon
  }
  return maturityPayment(note, levels) + coupon
}

// One review at which the call is tested, as the call reads it.
export interface ReviewTest {
  // Numbered from 1, among the call's reviews.
  review: number
  // Its month from the start of the term.
  month: number
  // The level of the underlier on the review: the asset's, or the basket level for a basket.
  level: number
  // The trigger as an underlier level on this review, and whether the review's level is at or above it.
  triggerLevel: number
  // Whether the review can call. A review in the non-call period cannot, whatever its level.
  callable: boolean
  called: boolean
  // What a call on this review would pay above principal, as a fraction of principal.
  callAmount: number
}

// One review on which the coupon is tested, or for a fixed coupon paid.
export interface CouponTest {
  // Numbered from 1, among the coupon's reviews.
  review: number
  // Its month from the start of the term.
  month: number
  // The level of the underlier on the review. The last review reads the determined final level. Undefined for a fixed coupon, which
  // reads no level.
  level?: number
  // The coupon barrier as an underlier level, and whether the review's level is at or above it. A fixed coupon has no barrier, and
  // every review meets it.
  barrierLevel?: number
  met: boolean
  // The number of coupons the review pays: its own and, with memory, those missed before it. Zero when it misses the barrier.
  coupons: number
  // What the review pays in coupons, as an amount.
  paid: number
  // With memory, the coupons missed so far and not yet paid, after this review. Zero without memory, since a missed coupon is lost.
  remembered: number
}

// How the product ends. A bullet product ends at maturity; an autocall ends on the first review that calls it, or at maturity.
export interface RedemptionOutcome {
  // The number of the call review the product was called on, or undefined when it ran to the end of the term.
  calledAtReview?: number
  // The number of the call's reviews, the last of which is the end of the term: one for a bullet product.
  reviews: number
  // The call reviews up to and including the call, or every call review that is tested when there is none. An issuer call has no
  // tests: nothing reads a level for it.
  tests: ReviewTest[]
  // How long the product lasted, in months: the term unless it was called.
  months: number
  // What the product paid when it ended, on the review that called it or at maturity, including the coupon of a coupon review on that date.
  payment: number
  // What the payoff pays at the end of the term from the final levels, whether or not the product got there: the payment if it is
  // held to maturity.
  maturity: PaymentBreakdown
  // The coupon tests, from the first coupon review to the last one on or before the date the product ended. Empty without a coupon.
  coupons: CouponTest[]
  // Everything the product paid over its life: the coupons on the dates before it ended, and the payment.
  totalPaid: number
}

// How a product ends in a scenario, and what its coupon pays. `reviewLevels` are the levels of the underlier on each date before the
// last of reviewDates, in order: the dates an autocall or a coupon reads, a date on both once. Each is the asset's level, or for a
// basket its level from basketLevelFrom. `levels` are the determined levels the payoff reads at the end of the term, as for
// paymentBreakdown, and the last date reads the final level. An autocall is called on the first call review at or above the trigger,
// after which no date is read. The last call review is the end of the term: it pays the payoff, unless the product also calls on the
// final review, in which case the final level is tested against the trigger like any other review.
//
// An issuer call reads no level. The issuer's choice is a scenario input, `issuerCallsOnReview`: the number of the call review it calls
// on, or undefined when it does not call, and the product runs to maturity.
//
// A coupon is tested on each of its reviews up to the date the product ends. A coupon review on that date pays with the call or the
// maturity payment; the ones before pay on their own. A fixed coupon reads no level, so its reviews are not among reviewDates: each pays.
export function redemptionOutcome(note: Product, reviewLevels: number[], levels: DeterminedLevels, issuerCallsOnReview?: number): RedemptionOutcome {
  const errors = validateProduct(note)
  if (errors.length) throw new Error(errors.join(' '))
  const maturity = paymentBreakdown(note, levels)
  const reviews = callReviewCount(note)!
  const dates = reviewDates(note)
  const before = Math.max(dates.length - 1, 0)
  const { redemption } = note
  if (reviewLevels.length !== before) {
    if (!dates.length) throw new Error(redemption !== 'bullet' && redemption.kind === 'issuer-call' ? 'An issuer call with no coupon reads no review levels.' : 'A product with no autocall or coupon has no reviews before the last.')
    throw new Error(`Expected a level for each of ${before} reviews before the last.`)
  }
  if (reviewLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Review levels must be zero or greater.')
  if (issuerCallsOnReview !== undefined && (redemption === 'bullet' || redemption.kind !== 'issuer-call')) throw new Error('Only an issuer call is called by the issuer.')
  const levelOn = (index: number) => (index < before ? reviewLevels[index] : levels.final)

  const tests: ReviewTest[] = []
  let called: { review: number; month: number; callAmount: number } | undefined
  if (redemption !== 'bullet' && redemption.kind === 'issuer-call' && issuerCallsOnReview !== undefined) {
    const first = firstCallReview(redemption)
    const last = lastCallReview(redemption, reviews)
    if (!Number.isInteger(issuerCallsOnReview) || issuerCallsOnReview < first || issuerCallsOnReview > last) throw new Error(`The issuer can call on reviews ${first} to ${last}.`)
    const month = issuerCallsOnReview * monthsPerReview[redemption.schedule.frequency]
    called = { review: issuerCallsOnReview, month, callAmount: callAmountAtReview(redemption, month) }
  }
  if (redemption !== 'bullet' && redemption.kind === 'autocall') {
    for (const [index, { call: review, month }] of dates.entries()) {
      // The last review is the end of the term and is not tested, unless the final review is a call too.
      if (review === undefined || (review === reviews && !redemption.callOnFinalReview)) continue
      const level = levelOn(index)
      const triggerLevel = barrierLevelAt(triggerAtReview(redemption, review), levels.initial)
      const callable = review > (redemption.nonCallReviews ?? 0)
      const test = { review, month, level, triggerLevel, callable, called: callable && level >= triggerLevel, callAmount: callAmountAtReview(redemption, month) }
      tests.push(test)
      if (test.called) {
        called = test
        break
      }
    }
  }

  const months = called?.month ?? note.term.months
  const couponReviews = note.coupon?.barrier === undefined
    ? fixedCouponReviews(note).filter(({ month }) => month <= months)
    : dates.flatMap((date, index) => (date.coupon !== undefined && date.month <= months ? [{ review: date.coupon, month: date.month, level: levelOn(index) }] : []))
  const coupons = couponTests(note, couponReviews, levels.initial)
  const ending = coupons.find((test) => test.month === months)?.paid ?? 0
  const earlier = coupons.filter((test) => test.month < months).reduce((sum, { paid }) => sum + paid, 0)
  const payment = (called ? note.principalAmount * (1 + called.callAmount) : maturity.payment) + ending
  return { calledAtReview: called?.review, reviews, tests, months, payment, maturity, coupons, totalPaid: earlier + payment }
}

// The reviews of a fixed coupon, with no level: it reads none. Empty without a coupon or when its schedule does not divide the term.
function fixedCouponReviews(note: Product): Array<{ review: number; month: number }> {
  const schedule = note.coupon?.schedule
  const count = schedule === undefined ? undefined : reviewCount({ term: note.term, schedule })
  if (schedule === undefined || count === undefined) return []
  return Array.from({ length: count }, (_, index) => ({ review: index + 1, month: (index + 1) * monthsPerReview[schedule.frequency] }))
}

// The coupon on each of its reviews, in order, from its level. A review at or above the barrier pays its coupon and, with memory, every
// coupon missed before it; a review below it pays nothing, and with memory its coupon is remembered. Every review of a fixed coupon pays.
function couponTests(note: Product, reviews: Array<{ review: number; month: number; level?: number }>, initialLevel: number): CouponTest[] {
  const { coupon } = note
  if (coupon === undefined) return []
  const barrierLevel = coupon.barrier === undefined ? undefined : barrierLevelAt(coupon.barrier, initialLevel)
  const each = couponPerReview(note)
  let remembered = 0
  return reviews.map(({ review, month, level }) => {
    const met = barrierLevel === undefined || level! >= barrierLevel
    const coupons = met ? 1 + remembered : 0
    remembered = met ? 0 : coupon.memory ? remembered + 1 : 0
    return { review, month, level, barrierLevel, met, coupons, paid: coupons * each, remembered }
  })
}
