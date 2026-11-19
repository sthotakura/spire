import { amortizationOf, monthsPerReview, scheduleReviews, type Product } from './note'

// One review of an amortizing product: what was outstanding before it, and what it paid. The coupon is interest on the principal
// outstanding before the review, for the period that ends on it; the rest of the instalment repays principal.
export interface Instalment {
  // Numbered from 1, among the amortization's reviews.
  review: number
  // Its month from the start of the term.
  month: number
  outstanding: number
  coupon: number
  principal: number
  // Coupon plus principal: the level payment.
  amount: number
  // What is outstanding after the review. Zero after the last.
  remaining: number
}

// The level payment that repays a principal over a number of periods at a rate per period, with interest on what is outstanding:
// principal × i ÷ (1 − (1 + i)^−n).
export const levelPayment = (principal: number, ratePerPeriod: number, periods: number): number =>
  (principal * ratePerPeriod) / (1 - (1 + ratePerPeriod) ** -periods)

// The instalments of a level payment, review by review. Amounts are not rounded: the Barclays schedule read for docs/amortization.md
// agrees to the cent with an unrounded schedule, and drifts from a schedule rounded to the cent on each row. The last review repays
// what is outstanding, which differs from the level payment only by floating point.
export function levelPaymentSchedule(principal: number, ratePerPeriod: number, reviews: Array<{ review: number; month: number }>): Instalment[] {
  const amount = levelPayment(principal, ratePerPeriod, reviews.length)
  let outstanding = principal
  return reviews.map(({ review, month }, index) => {
    const coupon = outstanding * ratePerPeriod
    const repaid = index === reviews.length - 1 ? outstanding : amount - coupon
    const instalment = { review, month, outstanding, coupon, principal: repaid, amount: coupon + repaid, remaining: index === reviews.length - 1 ? 0 : outstanding - repaid }
    outstanding = instalment.remaining
    return instalment
  })
}

// The instalments of an amortizing product, from its fixed coupon's rate and the amortization's schedule. Empty when the product does
// not amortize, or its terms do not give a schedule.
export function amortizationSchedule(note: Product): Instalment[] {
  const amortization = amortizationOf(note.redemption)
  if (amortization === undefined || note.coupon === undefined) return []
  const reviews = scheduleReviews(note.term, amortization.schedule)
  if (reviews === undefined) return []
  return levelPaymentSchedule(note.principalAmount, (note.coupon.rate * monthsPerReview[amortization.schedule.frequency]) / 12, reviews)
}
