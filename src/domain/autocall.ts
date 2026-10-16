import { barrierLevelAt, callAmountAtReview, monthsPerReview, triggerAtReview, paymentBreakdown, reviewCount, validateProduct, type DeterminedLevels, type PaymentBreakdown, type Product } from './note'

// One review at which the call is tested, as the call reads it.
export interface ReviewTest {
  // Numbered from 1.
  review: number
  // The level of the underlier on the review: the asset's, or the basket level for a basket.
  level: number
  // The trigger as an underlier level on this review, and whether the review's level is at or above it.
  triggerLevel: number
  called: boolean
  // What a call on this review would pay above principal, as a fraction of principal.
  callAmount: number
}

// How the product ends. A bullet product ends at maturity; an autocall ends on the first review that calls it, or at maturity.
export interface RedemptionOutcome {
  // The number of the review the product was called on, or undefined when it ran to the end of the term.
  calledAtReview?: number
  // The number of reviews, the last of which is the end of the term.
  reviews: number
  // The reviews up to and including the call, or every review that is tested when there is none.
  tests: ReviewTest[]
  // How long the product lasted, in months: the term unless it was called.
  months: number
  // What the product paid, on the review that called it or at maturity.
  payment: number
  // What the payoff pays at the end of the term from the final levels, whether or not the product got there: the payment if it is
  // held to maturity.
  maturity: PaymentBreakdown
}

// How a product with a schedule ends in a scenario. `reviewLevels` are the levels of the underlier on each review before the last, in
// order: the asset's level, or for a basket its level from basketLevelFrom. `levels` are the determined levels the payoff reads at
// the end of the term, as for paymentBreakdown. The product is called on the first review at or above the trigger, which is then
// not tested again. The last review is the end of the term: it pays the payoff, unless the product also calls on the final review,
// in which case the final level is tested against the trigger like any other review.
export function redemptionOutcome(note: Product, reviewLevels: number[], levels: DeterminedLevels): RedemptionOutcome {
  const errors = validateProduct(note)
  if (errors.length) throw new Error(errors.join(' '))
  const maturity = paymentBreakdown(note, levels)
  const reviews = reviewCount(note)!
  if (note.redemption === 'bullet') {
    if (reviewLevels.length > 0) throw new Error('A product with no autocall has no reviews before the last.')
    return { reviews, tests: [], months: note.term.months, payment: maturity.payment, maturity }
  }
  if (reviewLevels.length !== reviews - 1) throw new Error(`Expected a level for each of ${reviews - 1} reviews before the last.`)
  if (reviewLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Review levels must be zero or greater.')
  const { redemption } = note
  const tested = redemption.callOnFinalReview ? [...reviewLevels, levels.final] : reviewLevels
  const tests: ReviewTest[] = []
  for (const [index, level] of tested.entries()) {
    const review = index + 1
    const months = review * monthsPerReview[note.schedule!.frequency]
    const triggerLevel = barrierLevelAt(triggerAtReview(redemption, review), levels.initial)
    const test = { review, level, triggerLevel, called: level >= triggerLevel, callAmount: callAmountAtReview(redemption, months) }
    tests.push(test)
    if (test.called) return { calledAtReview: review, reviews, tests, months, payment: note.principalAmount * (1 + test.callAmount), maturity }
  }
  return { reviews, tests, months: note.term.months, payment: maturity.payment, maturity }
}
