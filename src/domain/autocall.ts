import { barrierLevelAt, callAmountAtReview, couponPerReview, firstCallReview, lastCallReview, maturityPayment, monthsPerReview, triggerAtReview, paymentBreakdown, reviewCount, validateProduct, type DeterminedLevels, type PaymentBreakdown, type Product } from './note'

// The level at or above which the final review calls the product, from the determined initial level. Undefined when the final review
// is not a call.
export function finalCallLevel(note: Product, initialLevel: number): number | undefined {
  const { redemption } = note
  const reviews = reviewCount(note)
  if (redemption === 'bullet' || redemption.kind !== 'autocall' || !redemption.callOnFinalReview || reviews === undefined) return undefined
  return barrierLevelAt(triggerAtReview(redemption, reviews), initialLevel)
}

// The coupon barrier as an underlier level, from the determined initial level. Undefined when the product has no coupon.
export const couponBarrierLevel = (note: Product, initialLevel: number): number | undefined =>
  note.coupon === undefined ? undefined : barrierLevelAt(note.coupon.barrier, initialLevel)

// What the product pays at the end of its term for a final level, if no earlier review called it: the payoff, or, when the final
// review is a call and the final level is at or above its trigger, principal plus the call amount. With a coupon, a final level at or
// above the coupon barrier adds the last review's own coupon; coupons remembered from earlier reviews depend on the path, so they are
// left out. This is the payment the payoff chart draws against the final level. It equals the maturity payment when the final review
// is not a call and there is no coupon.
export function paymentAtEnd(note: Product, levels: DeterminedLevels): number {
  const { redemption } = note
  const call = finalCallLevel(note, levels.initial)
  const couponBarrier = couponBarrierLevel(note, levels.initial)
  const coupon = couponBarrier !== undefined && levels.final >= couponBarrier ? couponPerReview(note) : 0
  if (redemption !== 'bullet' && call !== undefined && levels.final >= call) {
    return note.principalAmount * (1 + callAmountAtReview(redemption, note.term.months)) + coupon
  }
  return maturityPayment(note, levels) + coupon
}

// One review at which the call is tested, as the call reads it.
export interface ReviewTest {
  // Numbered from 1.
  review: number
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

// One review on which the coupon is tested.
export interface CouponTest {
  // Numbered from 1.
  review: number
  // The level of the underlier on the review, as the call reads it. The last review reads the determined final level.
  level: number
  // The coupon barrier as an underlier level, and whether the review's level is at or above it.
  barrierLevel: number
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
  // The number of the review the product was called on, or undefined when it ran to the end of the term. An issuer call has no
  // tests: nothing reads a level on its reviews.
  calledAtReview?: number
  // The number of reviews, the last of which is the end of the term.
  reviews: number
  // The reviews up to and including the call, or every review that is tested when there is none.
  tests: ReviewTest[]
  // How long the product lasted, in months: the term unless it was called.
  months: number
  // What the product paid, on the review that called it or at maturity, including that review's coupon.
  payment: number
  // The coupon tests, from the first review to the one the product ended on. Empty without a coupon.
  coupons: CouponTest[]
  // Everything the product paid over its life: the coupons on the reviews before it ended, and the payment.
  totalPaid: number
  // What the payoff pays at the end of the term from the final levels, whether or not the product got there: the payment if it is
  // held to maturity.
  maturity: PaymentBreakdown
}

// How a product with a schedule ends in a scenario. `reviewLevels` are the levels of the underlier on each review before the last, in
// order: the asset's level, or for a basket its level from basketLevelFrom. `levels` are the determined levels the payoff reads at
// the end of the term, as for paymentBreakdown. An autocall is called on the first review at or above the trigger, which is then
// not tested again. The last review is the end of the term: it pays the payoff, unless the product also calls on the final review,
// in which case the final level is tested against the trigger like any other review.
//
// An issuer call reads no level on a review, so it takes no review levels. The issuer's choice is a scenario input,
// `issuerCallsOnReview`: the number of the review it calls on, or undefined when it does not call, and the product runs to maturity.
export function redemptionOutcome(note: Product, reviewLevels: number[], levels: DeterminedLevels, issuerCallsOnReview?: number): RedemptionOutcome {
  const errors = validateProduct(note)
  if (errors.length) throw new Error(errors.join(' '))
  const maturity = paymentBreakdown(note, levels)
  const reviews = reviewCount(note)!
  const atMaturity = { reviews, tests: [], months: note.term.months, payment: maturity.payment, maturity, coupons: [], totalPaid: maturity.payment }
  if (note.redemption === 'bullet') {
    if (reviewLevels.length > 0) throw new Error('A product with no autocall has no reviews before the last.')
    if (issuerCallsOnReview !== undefined) throw new Error('Only an issuer call is called by the issuer.')
    return atMaturity
  }
  const { redemption } = note
  if (redemption.kind === 'issuer-call') {
    if (reviewLevels.length > 0) throw new Error('An issuer call reads no review levels.')
    if (issuerCallsOnReview === undefined) return atMaturity
    const first = firstCallReview(redemption)
    const last = lastCallReview(redemption, reviews)
    if (!Number.isInteger(issuerCallsOnReview) || issuerCallsOnReview < first || issuerCallsOnReview > last) throw new Error(`The issuer can call on reviews ${first} to ${last}.`)
    const months = issuerCallsOnReview * monthsPerReview[note.schedule!.frequency]
    const payment = note.principalAmount * (1 + callAmountAtReview(redemption, months))
    return { calledAtReview: issuerCallsOnReview, reviews, tests: [], months, payment, maturity, coupons: [], totalPaid: payment }
  }
  if (issuerCallsOnReview !== undefined) throw new Error('Only an issuer call is called by the issuer.')
  if (reviewLevels.length !== reviews - 1) throw new Error(`Expected a level for each of ${reviews - 1} reviews before the last.`)
  if (reviewLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Review levels must be zero or greater.')
  const tested = redemption.callOnFinalReview ? [...reviewLevels, levels.final] : reviewLevels
  const tests: ReviewTest[] = []
  for (const [index, level] of tested.entries()) {
    const review = index + 1
    const months = review * monthsPerReview[note.schedule!.frequency]
    const triggerLevel = barrierLevelAt(triggerAtReview(redemption, review), levels.initial)
    const callable = review > (redemption.nonCallReviews ?? 0)
    const test = { review, level, triggerLevel, callable, called: callable && level >= triggerLevel, callAmount: callAmountAtReview(redemption, months) }
    tests.push(test)
    if (test.called) break
  }
  const called = tests.find((test) => test.called)
  // The coupon is tested on every review up to the one the product ends on, the last reading the final level. The review that ends
  // the product pays its coupon with the call or the maturity payment; the reviews before it pay theirs on their own.
  const coupons = couponTests(note, [...reviewLevels, levels.final].slice(0, called?.review ?? reviews), levels.initial)
  const ending = coupons.at(-1)?.paid ?? 0
  const earlier = coupons.slice(0, -1).reduce((sum, { paid }) => sum + paid, 0)
  if (called) {
    const payment = note.principalAmount * (1 + called.callAmount) + ending
    return { calledAtReview: called.review, reviews, tests, months: called.review * monthsPerReview[note.schedule!.frequency], payment, maturity, coupons, totalPaid: earlier + payment }
  }
  const payment = maturity.payment + ending
  return { reviews, tests, months: note.term.months, payment, maturity, coupons, totalPaid: earlier + payment }
}

// The coupon on each review, in order, from its level. A review at or above the barrier pays its coupon and, with memory, every
// coupon missed before it; a review below it pays nothing, and with memory its coupon is remembered.
function couponTests(note: Product, levels: number[], initialLevel: number): CouponTest[] {
  if (note.coupon === undefined) return []
  const barrierLevel = barrierLevelAt(note.coupon.barrier, initialLevel)
  const each = couponPerReview(note)
  let remembered = 0
  return levels.map((level, index) => {
    const met = level >= barrierLevel
    const coupons = met ? 1 + remembered : 0
    remembered = met ? 0 : note.coupon!.memory ? remembered + 1 : 0
    return { review: index + 1, level, barrierLevel, met, coupons, paid: coupons * each, remembered }
  })
}
