import type { Instalment } from '../domain/amortization'
import type { RedemptionOutcome } from '../domain/autocall'
import { amortizationOf, monthsPerReview, type Product } from '../domain/note'
import { annualisedOf, annualisedReturnStep, signedTwoDecimalPercent, totalReturn, totalReturnStep } from './autocall'
import type { CalculationStep } from './calculation'
import type { FormulaLine } from './formula'
import type { SummarySegment } from './summary'

// The words an amortizing note is explained in. Its payments read no level, so none of them names the underlier. See docs/amortization.md.

const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
// To four decimals of a percent, marked as approximate when it is rounded: 5% a year monthly is ≈0.4167% a review.
const percent = (fraction: number) => {
  const shown = Math.round(fraction * 1e6) / 1e4
  return `${Math.abs(shown - fraction * 100) > 1e-9 ? '≈' : ''}${shown.toLocaleString('en-US', { maximumFractionDigits: 4 })}%`
}
const monthsPhrase = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`

// The rate a review: the coupon rate a year × the months between reviews ÷ 12.
const ratePerReview = (note: Product) => {
  const amortization = amortizationOf(note.redemption)
  return note.coupon === undefined || amortization === undefined ? 0 : (note.coupon.rate * monthsPerReview[amortization.schedule.frequency]) / 12
}

// The summary of an amortizing note: its term, its instalments and the coupon they include.
export function amortizationSummary(note: Product, term: { article: string; text: string }): SummarySegment[] {
  const amortization = amortizationOf(note.redemption)!
  const { coupon } = note
  return [
    { text: term.article },
    { text: `${term.text} ${note.wrapper}`, concept: 'wrapper' },
    { text: ' that repays its principal in ' },
    { text: `level ${amortization.schedule.frequency} instalments`, concept: 'amortization' },
    { text: '.' },
    ...(coupon === undefined ? [] : [
      { text: ' Each includes ' },
      { text: `a fixed coupon of ${percent(coupon.rate)} a year (${percent(ratePerReview(note))} a review)`, concept: 'coupon' as const },
      { text: ' on the principal still outstanding, and repays principal with the rest, whatever the underlier does.' },
    ]),
  ]
}

// The payment rule: the level instalment, the coupon in it, and the principal it repays.
export function amortizationFormula(): FormulaLine[] {
  return [
    {
      lead: 'Instalment',
      segments: [
        { text: 'Principal × i ÷ (1 − (1 + i)^−n)', concept: 'amortization' },
        { text: ' on each ' },
        { text: 'coupon review', concept: 'coupon-schedule' },
        { text: ', where i = ' },
        { text: 'Rate × Months between coupon reviews ÷ 12', concept: 'coupon' },
        { text: ' and n is the number of reviews' },
      ],
    },
    { lead: 'Coupon', segments: [{ text: 'Outstanding principal × i', concept: 'coupon' }, { text: ', interest for the period on what is still owed' }] },
    { lead: 'Principal repaid', segments: [{ text: 'Instalment − Coupon', concept: 'amortization' }, { text: ', until nothing is outstanding at the end of the term' }] },
  ]
}

export const amortizationInWords = (): string =>
  'Each coupon review pays the same instalment: the coupon on the principal still outstanding, and the rest as a repayment of principal, so that nothing is outstanding at the end of the term. No payment depends on the underlier.'

// A run of this many reviews in the middle reads as one step: the payments table shows each, as for coupon reviews.
const shortestRun = 3

// The calculation: the rate a review, the level instalment, the reviews, then the total paid and the returns.
export function amortizationSteps(note: Product, outcome: RedemptionOutcome): Array<Omit<CalculationStep, 'n'>> {
  const instalments = outcome.instalments ?? []
  const count = instalments.length
  if (!count || note.coupon === undefined) return []
  const i = ratePerReview(note)
  const months = monthsPerReview[amortizationOf(note.redemption)!.schedule.frequency]
  const title = ({ review, month }: Instalment) => `Review ${review} of ${count}, month ${month}`
  const single = (instalment: Instalment): Omit<CalculationStep, 'n'> => {
    const last = instalment.review === count
    const principal = last ? `principal ${units(instalment.principal)}, all that is outstanding` : `principal ${units(instalment.amount)} − ${units(instalment.coupon)} = ${units(instalment.principal)}, leaving ${units(instalment.remaining)}`
    return { title: title(instalment), how: `Coupon ${units(instalment.outstanding)} × ${percent(i)} = ${units(instalment.coupon)} + ${principal}`, value: units(instalment.amount), concept: 'amortization' }
  }
  const middle = instalments.slice(1, -1)
  const reviews: Array<Omit<CalculationStep, 'n'>> = middle.length >= shortestRun
    ? [
        single(instalments[0]),
        {
          title: `Reviews ${middle[0].review}–${middle.at(-1)!.review} of ${count}, months ${middle[0].month}–${middle.at(-1)!.month}`,
          how: `Each pays the instalment, the coupon on what is outstanding and the rest as principal, leaving ${units(middle.at(-1)!.remaining)}; the payments table shows each review`,
          value: units(middle.reduce((sum, { amount }) => sum + amount, 0)),
          concept: 'amortization',
        },
        single(instalments.at(-1)!),
      ]
    : instalments.map(single)
  const coupons = instalments.reduce((sum, { coupon }) => sum + coupon, 0)
  return [
    { title: 'Rate a review', how: `${percent(note.coupon.rate)} a year × ${months}/12`, value: percent(i), concept: 'coupon' },
    { title: 'Instalment', how: `${units(note.principalAmount)} × ${percent(i)} ÷ (1 − (1 + ${percent(i)})^−${count})`, value: units(instalments[0].amount), concept: 'amortization' },
    ...reviews,
    { title: 'Total paid', how: `${count} instalments: ${units(coupons)} in coupons + ${units(note.principalAmount)} of principal, over ${monthsPhrase(outcome.months)}`, value: units(outcome.totalPaid), result: true, concept: 'amortization' },
    totalReturnStep(note, outcome),
    annualisedReturnStep(note, outcome),
  ]
}

// The outcome sentence: what the instalments paid, and the returns.
export function explainAmortization(note: Product, outcome: RedemptionOutcome): string {
  const instalments = outcome.instalments ?? []
  if (!instalments.length) return ''
  const frequency = amortizationOf(note.redemption)!.schedule.frequency
  const coupons = instalments.reduce((sum, { coupon }) => sum + coupon, 0)
  return `It repaid its principal in ${instalments.length} ${frequency} instalments of ${units(instalments[0].amount)}, whatever the underlier did: ${units(note.principalAmount)} of principal and ${units(coupons)} in coupons, which fell as the principal outstanding fell. In all it paid ${units(outcome.totalPaid)}, a total return of ${signedTwoDecimalPercent(totalReturn(note, outcome))} over ${monthsPhrase(outcome.months)}, or ${annualisedOf(note, outcome)}.`
}
