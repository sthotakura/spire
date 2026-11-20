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
// principal × i ÷ (1 − (1 + i)^−n). The power is taken through log1p and expm1, so that a rate near zero, where 1 − (1 + i)^−n
// would round to zero, still gives principal ÷ n, and a high rate stays exact.
export const levelPayment = (principal: number, ratePerPeriod: number, periods: number): number =>
  (principal * ratePerPeriod) / -Math.expm1(-periods * Math.log1p(ratePerPeriod))

// What is outstanding after k of n level payments: principal × (1 − (1 + i)^(k − n)) ÷ (1 − (1 + i)^−n), the payments still to come
// discounted at the rate. Each balance is computed from the terms, not by subtracting each repayment from the last balance, which at a
// high rate multiplies a rounding error by (1 + i) on every period.
const outstandingAfter = (principal: number, ratePerPeriod: number, periods: number, paid: number): number => {
  const growth = Math.log1p(ratePerPeriod)
  return (principal * Math.expm1((paid - periods) * growth)) / Math.expm1(-periods * growth)
}

// The instalments of a level payment, review by review. Amounts are not rounded: the Barclays schedule read for docs/amortization.md
// agrees to the cent with an unrounded schedule, and drifts from a schedule rounded to the cent on each row. Each instalment repays
// the fall in what is outstanding, so the last repays all of it, and coupon plus principal is the level payment up to floating point.
export function levelPaymentSchedule(principal: number, ratePerPeriod: number, reviews: Array<{ review: number; month: number }>): Instalment[] {
  const periods = reviews.length
  return reviews.map(({ review, month }, index) => {
    const outstanding = index === 0 ? principal : outstandingAfter(principal, ratePerPeriod, periods, index)
    const remaining = index === periods - 1 ? 0 : outstandingAfter(principal, ratePerPeriod, periods, index + 1)
    const coupon = outstanding * ratePerPeriod
    const repaid = outstanding - remaining
    return { review, month, outstanding, coupon, principal: repaid, amount: coupon + repaid, remaining }
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
