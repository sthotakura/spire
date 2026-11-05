import { describe, expect, it } from 'vitest'
import { annualisedReturnOfPayments, redemptionOutcome, type Payment } from './autocall'
import { annualisedReturn, reviewDates, type Autocall, type Coupon, type Product } from './note'
import { startingProduct } from './starting-note'
import { sampleProducts } from '../content/examples'

// Synthetic: the worked examples in docs/cash-flow-result.md, on a note of 1,000 paying 10 a month.
const paid = (...flows: Array<[number, number]>): Payment[] => flows.map(([month, amount]) => ({ month, coupon: 0, redemption: amount, amount }))
const monthly = (months: number, last: number) => paid(...Array.from({ length: months }, (_, i): [number, number] => [i + 1, i + 1 === months ? last + 10 : 10]))
const rate = (payments: Payment[]) => annualisedReturnOfPayments(payments, 1000)

describe('the return a year over several payments', () => {
  it('reads when each payment was made: the same total gives different returns', () => {
    expect(rate(monthly(12, 1000))).toBeCloseTo(0.1268, 4)
    expect(rate(paid([7, 70], [8, 10], [9, 10], [10, 10], [11, 10], [12, 1010]))).toBeCloseTo(0.1245, 4)
    expect(rate(paid([12, 1120]))).toBeCloseTo(0.12, 10)
  })

  it('gives a call the return of the months it lasted', () => {
    expect(rate(monthly(3, 1000))).toBeCloseTo(0.1268, 4)
  })

  it('reads a loss, and is not the total return over a year', () => {
    expect(rate(monthly(12, 600))).toBeCloseTo(-0.2974, 4)
    expect(rate(monthly(12, 0))).toBeCloseTo(-0.959, 4)
  })

  it('is the worked memory example, with and without memory', () => {
    expect(rate(paid([1, 10], [3, 20], [5, 1020]))).toBeCloseTo(0.1263, 4)
    expect(rate(paid([1, 10], [3, 10], [5, 1010]))).toBeCloseTo(0.0744, 4)
  })

  it('equals the formula for one payment', () => {
    for (const [months, amount] of [[7, 1080], [84, 1052.5], [12, 400], [1, 1080], [120, 2700], [1, 50000]]) {
      // As a ratio: 50 times the principal in one month is a very large rate.
      expect(rate(paid([months, amount])) / annualisedReturn(amount, 1000, months)).toBeCloseTo(1, 8)
    }
  })

  it('is −100% when nothing is paid, and exactly 0 when the payments add up to principal', () => {
    expect(rate(paid([12, 0]))).toBe(-1)
    const zero = rate(paid([6, 500], [12, 500]))
    expect(zero).toBe(0)
    expect(Object.is(zero, -0)).toBe(false)
  })

  it('discounts the payments back to principal', () => {
    const payments = monthly(36, 400)
    const r = rate(payments)
    expect(payments.reduce((sum, { month, amount }) => sum + amount / (1 + r) ** (month / 12), 0)).toBeCloseTo(1000, 6)
  })
})

const autocall = (terms: Partial<Autocall> = {}): Autocall => ({ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, firstReviewMonth: 4, callAmount: 0, ...terms })
const coupon = (terms: Partial<Coupon> = {}): Coupon => ({ schedule: { frequency: 'monthly' }, rate: 0.12, barrier: 0.7, memory: true, ...terms })
const product = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  redemption: autocall(),
  coupon: coupon(),
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  ...overrides,
})
// The worked example's path: 95, 65, 102, 68, then 104, which calls it in month 5.
const called = [95, 65, 102, 68, 104, 90, 90, 90, 90, 90, 90]

describe('the payments of a scenario', () => {
  it('lists the dates that paid, with memory, and counts a coupon on the date of the call once', () => {
    const outcome = redemptionOutcome(product(), called, { initial: 100, final: 90 })
    expect(outcome.payments).toEqual([
      { month: 1, coupon: 10, redemption: 0, amount: 10 },
      { month: 3, coupon: 20, redemption: 0, amount: 20 },
      { month: 5, coupon: 20, redemption: 1000, amount: 1020 },
    ])
    expect(outcome.totalPaid).toBe(1050)
  })

  it('lists one payment without a coupon', () => {
    const plain = product({ coupon: undefined })
    const outcome = redemptionOutcome(plain, [90, 90, 90, 90, 90, 90, 90, 90], { initial: 100, final: 70 })
    expect(outcome.payments).toEqual([{ month: 12, coupon: 0, redemption: 1000, amount: 1000 }])
  })

  it('keeps the date it ended when that pays nothing', () => {
    const outcome = redemptionOutcome(product(), Array<number>(11).fill(50), { initial: 100, final: 0 })
    expect(outcome.payments).toEqual([{ month: 12, coupon: 0, redemption: 0, amount: 0 }])
    expect(annualisedReturnOfPayments(outcome.payments, 1000)).toBe(-1)
  })

  it('adds up to the total paid and ends on the date the product ended, on every sample and several paths', () => {
    for (const { product: note } of sampleProducts) {
      for (const level of [40, 75, 100, 130]) {
        const reviewLevels = Array<number>(Math.max(reviewDates(note).length - 1, 0)).fill(level)
        const outcome = redemptionOutcome(note, reviewLevels, { initial: 100, final: level })
        expect(outcome.payments.reduce((sum, { amount }) => sum + amount, 0)).toBeCloseTo(outcome.totalPaid, 8)
        expect(outcome.payments.at(-1)).toMatchObject({ month: outcome.months, amount: outcome.payment })
        const months = outcome.payments.map(({ month }) => month)
        expect(new Set(months).size).toBe(months.length)
        expect(months).toEqual([...months].sort((a, b) => a - b))
      }
    }
  })
})
