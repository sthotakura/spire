import { describe, expect, it } from 'vitest'
import { amortizationSchedule, levelPayment, levelPaymentSchedule } from './amortization'
import { annualisedReturnOfPayments, paymentAtEnd, redemptionOutcome } from './autocall'
import { productIssues, reviewDates, scheduleReviews, validateProduct, type Amortization, type Product } from './note'
import { startingProduct } from './starting-note'

// Synthetic: the worked example in docs/amortization.md. A 12-month note of 1,000 with a fixed coupon of 6% a year and quarterly
// level-payment amortization, so 1.5% a quarter over four quarters.
const amortization = (terms: Partial<Amortization> = {}): Amortization => ({ kind: 'amortization', schedule: { frequency: 'quarterly' }, method: 'level-payment', ...terms })
const amortizing = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  redemption: { kind: 'early-redemption', mechanisms: [amortization()] },
  coupon: { schedule: { frequency: 'quarterly' }, rate: 0.06 },
  payoff: { participations: [] },
  ...overrides,
})
const fieldsOf = (product: Product) => productIssues(product).map(({ field }) => field)
const levels = { initial: 100, final: 100 }

describe('validation of amortization', () => {
  it('accepts level-payment amortization with a fixed coupon on the same schedule and no payoff feature', () => {
    expect(validateProduct(amortizing())).toEqual([])
  })

  it('needs a fixed coupon on its own schedule', () => {
    expect(fieldsOf(amortizing({ coupon: undefined }))).toEqual(['coupon'])
    expect(fieldsOf(amortizing({ coupon: { schedule: { frequency: 'quarterly' }, rate: 0.06, barrier: 0.7 } }))).toEqual(['coupon'])
    expect(fieldsOf(amortizing({ coupon: { schedule: { frequency: 'monthly' }, rate: 0.06 } }))).toEqual(['couponSchedule'])
  })

  it('needs a schedule that divides the term into at least two reviews', () => {
    expect(fieldsOf(amortizing({ term: { months: 3 } }))).toEqual(['schedule'])
    expect(fieldsOf(amortizing({ term: { months: 10 }, coupon: { schedule: { frequency: 'monthly' }, rate: 0.06 }, redemption: { kind: 'early-redemption', mechanisms: [amortization({ schedule: { frequency: 'quarterly' } })] } }))).toContain('schedule')
  })

  it('is the only mechanism of its redemption', () => {
    const withCall: Product = amortizing({ redemption: { kind: 'early-redemption', mechanisms: [amortization(), { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 }] } })
    expect(fieldsOf(withCall)).toEqual(['mechanisms'])
  })

  it('cannot be combined with a payoff feature, a deposit or an adjustment factor', () => {
    expect(fieldsOf(amortizing({ payoff: { participations: [{ direction: 'upside', rate: 1 }] } }))).toEqual(['mechanisms'])
    expect(fieldsOf(amortizing({ payoff: { participations: [], principalProtection: 1 } }))).toEqual(['mechanisms'])
    expect(fieldsOf(amortizing({ wrapper: 'deposit' }))).toEqual(['mechanisms'])
    expect(fieldsOf(amortizing({ redemption: { kind: 'early-redemption', mechanisms: [amortization()], adjustmentFactor: 0.99 } }))).toEqual(['adjustmentFactor'])
  })

  it('names amortization as the mechanism of its issues', () => {
    expect(productIssues(amortizing({ coupon: undefined }))[0].mechanism).toBe('amortization')
  })
})

describe('the level-payment schedule', () => {
  it('pays 259.44 a quarter on the synthetic note, 37.78 of it interest', () => {
    const instalments = amortizationSchedule(amortizing())
    expect(instalments.map(({ month }) => month)).toEqual([3, 6, 9, 12])
    for (const { amount } of instalments) expect(amount).toBeCloseTo(259.44, 2)
    expect(instalments.map(({ coupon }) => coupon)).toEqual([expect.closeTo(15, 2), expect.closeTo(11.33, 2), expect.closeTo(7.61, 2), expect.closeTo(3.83, 2)])
    expect(instalments.map(({ principal }) => principal)).toEqual([expect.closeTo(244.44, 2), expect.closeTo(248.11, 2), expect.closeTo(251.83, 2), expect.closeTo(255.61, 2)])
    expect(instalments.map(({ remaining }) => remaining)).toEqual([expect.closeTo(755.56, 2), expect.closeTo(507.44, 2), expect.closeTo(255.61, 2), 0])
    expect(instalments.reduce((sum, { coupon }) => sum + coupon, 0)).toBeCloseTo(37.78, 2)
    expect(instalments.reduce((sum, { principal }) => sum + principal, 0)).toBeCloseTo(1000, 9)
  })

  it('measures each coupon on the principal outstanding before that review', () => {
    for (const { outstanding, coupon } of amortizationSchedule(amortizing())) expect(coupon).toBeCloseTo(outstanding * 0.015, 9)
  })

  // At a high rate (1 + i)^−n is below the precision of 1, and at a rate near zero 1 − (1 + i)^−n rounds away: both once broke the
  // level payment. The validator accepts any positive coupon rate, so every rate must give finite, level instalments that repay principal.
  it('stays level and finite at any rate the validator accepts', () => {
    for (const rate of [4, 1e-16, 1e-9, 0.0001, 0.5, 100, Number.MIN_VALUE]) {
      const note = amortizing({ term: { months: 120 }, redemption: { kind: 'early-redemption', mechanisms: [amortization({ schedule: { frequency: 'monthly' } })] }, coupon: { schedule: { frequency: 'monthly' }, rate } })
      expect(validateProduct(note)).toEqual([])
      const instalments = amortizationSchedule(note)
      const level = levelPayment(1000, rate / 12, 120)
      expect(Number.isFinite(level)).toBe(true)
      for (const { amount, principal, remaining } of instalments) {
        expect(amount).toBeCloseTo(level, 6)
        expect(principal).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(remaining)).toBe(true)
      }
      expect(instalments.reduce((sum, { principal }) => sum + principal, 0)).toBeCloseTo(1000, 6)
    }
  })

  // The largest rates: on a note of 1 in two semi-annual instalments each pays about half the rate, which fits in a number, though the
  // rate times six months does not.
  it('stays finite at a rate near the largest number', () => {
    const note = amortizing({ principalAmount: 1, redemption: { kind: 'early-redemption', mechanisms: [amortization({ schedule: { frequency: 'semi-annual' } })] }, coupon: { schedule: { frequency: 'semi-annual' }, rate: 1e308 } })
    expect(validateProduct(note)).toEqual([])
    const instalments = amortizationSchedule(note)
    expect(instalments.map(({ amount }) => amount)).toEqual([expect.closeTo(5e307, -295), expect.closeTo(5e307, -295)])
    expect(instalments.reduce((sum, { principal }) => sum + principal, 0)).toBe(1)
    expect(redemptionOutcome(note, [], levels).totalPaid).toBe(1e308)
  })

  // At a rate that rounds to zero each instalment is principal ÷ n, which fits in a number even when principal × n does not.
  it('stays finite on a principal near the largest number at a rate that rounds to zero', () => {
    for (const rate of [Number.MIN_VALUE, 1e-310]) {
      const note = amortizing({ principalAmount: 2e306, term: { months: 120 }, redemption: { kind: 'early-redemption', mechanisms: [amortization({ schedule: { frequency: 'monthly' } })] }, coupon: { schedule: { frequency: 'monthly' }, rate } })
      expect(validateProduct(note)).toEqual([])
      const instalments = amortizationSchedule(note)
      for (const { amount, remaining } of instalments) {
        expect(amount / (2e306 / 120)).toBeCloseTo(1, 9)
        expect(Number.isFinite(remaining)).toBe(true)
      }
      expect(redemptionOutcome(note, [], levels).totalPaid / 2e306).toBeCloseTo(1, 9)
    }
  })

  it('repays principal ÷ n at a rate near zero and pays the coupon on principal at a high one', () => {
    expect(levelPayment(1000, 1e-16, 120)).toBeCloseTo(1000 / 120, 9)
    // 400% a year is a third a month: 1.3333^−120 is about 10^−15, so the payment is the coupon on principal, a third of 1,000.
    expect(levelPayment(1000, 4 / 12, 120)).toBeCloseTo(1000 / 3, 9)
  })

  it('is empty for a product that does not amortize', () => {
    expect(amortizationSchedule({ ...amortizing(), redemption: { kind: 'bullet' } })).toEqual([])
  })

  // Barclays Bank PLC, Level-Pay Amortizing Notes due September 1, 2025, pricing supplement dated August 31, 2010: $13,900 a note at
  // an effective rate of 3.59231% a year, 30/360, repaid in 180 monthly payments of $100.00. Its 180-month term is beyond this
  // reference's limit, so the schedule is checked here without a product.
  describe('reproduces the Barclays pricing supplement', () => {
    const months = Array.from({ length: 180 }, (_, index) => ({ review: index + 1, month: index + 1 }))
    const barclays = levelPaymentSchedule(13900, 0.0359231 / 12, months)
    const cents = (value: number) => Math.round(value * 100) / 100

    it('pays $100.00 a month', () => {
      expect(cents(levelPayment(13900, 0.0359231 / 12, 180))).toBe(100)
      expect(barclays.every(({ amount }) => cents(amount) === 100)).toBe(true)
    })

    it('agrees with the first and last rows as printed', () => {
      const printed = [
        [1, 13900.0, 41.61, 58.39, 13841.61],
        [2, 13841.61, 41.44, 58.56, 13783.05],
        [3, 13783.05, 41.26, 58.74, 13724.31],
        [177, 397.02, 1.19, 98.81, 298.21],
        [178, 298.21, 0.89, 99.11, 199.11],
        [179, 199.11, 0.6, 99.4, 99.7],
        [180, 99.7, 0.3, 99.7, 0],
      ]
      for (const [review, outstanding, coupon, principal, remaining] of printed) {
        const row = barclays[review - 1]
        expect([cents(row.outstanding), cents(row.coupon), cents(row.principal), cents(row.remaining)]).toEqual([outstanding, coupon, principal, remaining])
      }
    })
  })
})

describe('what an amortizing product pays', () => {
  it('reads no level and pays each instalment, with its principal under redemption', () => {
    const note = amortizing()
    expect(reviewDates(note)).toEqual([])
    const outcome = redemptionOutcome(note, [], levels)
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.months).toBe(12)
    expect(outcome.payments.map(({ month }) => month)).toEqual([3, 6, 9, 12])
    expect(outcome.payments[0]).toEqual({ month: 3, coupon: expect.closeTo(15, 9), redemption: expect.closeTo(244.4448, 4), amount: expect.closeTo(259.4448, 4) })
    expect(outcome.totalPaid).toBeCloseTo(1037.78, 2)
    expect(outcome.instalments).toEqual(amortizationSchedule(note))
    expect(outcome.coupons.every(({ met, coupons }) => met && coupons === 1)).toBe(true)
  })

  it('pays the same whatever the final level', () => {
    const note = amortizing()
    expect(redemptionOutcome(note, [], { initial: 100, final: 40 }).totalPaid).toBeCloseTo(redemptionOutcome(note, [], { initial: 100, final: 160 }).totalPaid, 9)
    expect(paymentAtEnd(note, { initial: 100, final: 40 })).toBeCloseTo(259.44, 2)
  })

  // The builder hides the final level of an amortizing note, so a level the payoff could not read must not stop the instalments.
  it('pays its instalments with no final level to read, and has no payoff at maturity', () => {
    const outcome = redemptionOutcome(amortizing(), [], { initial: 100, final: Number.NaN })
    expect(outcome.maturity).toBeUndefined()
    expect(outcome.payment).toBeCloseTo(259.44, 2)
    expect(outcome.totalPaid).toBeCloseTo(1037.78, 2)
  })

  // An amortizing product has no issuer call and no reviews to read, so a scenario that gives either is rejected, not ignored.
  it('rejects an issuer\'s call and review levels it does not read', () => {
    expect(() => redemptionOutcome(amortizing(), [], levels, 1)).toThrow('Only an issuer call is called by the issuer.')
    expect(() => redemptionOutcome(amortizing(), [100], levels)).toThrow('has no reviews before the last')
  })

  it('returns the coupon rate a year, compounded on its own reviews', () => {
    const { payments } = redemptionOutcome(amortizing(), [], levels)
    expect(annualisedReturnOfPayments(payments, 1000)).toBeCloseTo(1.015 ** 4 - 1, 9)
  })

  it('has the coupon schedule as its schedule', () => {
    expect(amortizationSchedule(amortizing()).map(({ month }) => month)).toEqual(scheduleReviews({ months: 12 }, { frequency: 'quarterly' })!.map(({ month }) => month))
  })
})
