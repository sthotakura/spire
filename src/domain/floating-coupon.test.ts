import { describe, expect, it } from 'vitest'
import { amortizationSchedule } from './amortization'
import { paymentAtEnd, redemptionOutcome } from './autocall'
import { couponPerReview, couponRateOn, productIssues, reviewDates, validateProduct, type Coupon, type FloatingRate, type Product } from './note'
import { startingProduct } from './starting-note'

// A floating coupon: the reference rate on each review plus the spread, at least the floor and, with a cap, at most the cap
// (docs/floating-coupon.md).
const floating = (terms: Partial<FloatingRate> = {}): FloatingRate => ({ reference: 'Synthetic overnight rate', spread: 0.0275, floor: 0, ...terms })
const coupon = (rate: Partial<FloatingRate> = {}, terms: Partial<Coupon> = {}): Coupon => ({ schedule: { frequency: 'quarterly' }, rate: floating(rate), ...terms })
const issuerCall: Product['redemption'] = { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 }] }
// Synthetic: the worked example in docs/floating-coupon.md, shaped like the Citi note. Two years, principal 1,000, a quarterly floating
// coupon at the reference rate + 2.75% with a 0% floor, an issuer call on any quarterly review, and a 60% downside barrier on the final date.
const note = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 24 },
  redemption: issuerCall,
  coupon: coupon(),
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  ...overrides,
})
const fieldsOf = (product: Product) => productIssues(product).map(({ field }) => field)
const messagesOf = (product: Product) => productIssues(product).map(({ message }) => message)
// The worked example's reference rates, review 1 to 8; the last is read with the final level.
const rates = [0.04, 0.03, 0.015, -0.01, -0.0325, 0, 0.02]
const lastRate = 0.03

describe('validation of a floating rate', () => {
  it('accepts it on a non-contingent coupon, with any redemption, and with or without a cap', () => {
    expect(validateProduct(note())).toEqual([])
    expect(validateProduct(note({ redemption: { kind: 'bullet' } }))).toEqual([])
    expect(validateProduct(note({ coupon: coupon({ cap: 0.07 }) }))).toEqual([])
  })

  it('needs a reference name, a spread from −10% to 10%, a floor from 0% to 20%, and a cap at or above the floor and at most 20%', () => {
    expect(fieldsOf(note({ coupon: coupon({ reference: ' ' }) }))).toEqual(['coupon'])
    for (const spread of [-0.1, 0.1, -0.005]) expect(validateProduct(note({ coupon: coupon({ spread }) }))).toEqual([])
    for (const spread of [-0.11, 0.11, Number.NaN]) expect(fieldsOf(note({ coupon: coupon({ spread }) }))).toEqual(['coupon'])
    for (const floor of [0, 0.2]) expect(validateProduct(note({ coupon: coupon({ floor }) }))).toEqual([])
    for (const floor of [-0.01, 0.21]) expect(fieldsOf(note({ coupon: coupon({ floor }) }))).toEqual(['coupon'])
    expect(validateProduct(note({ coupon: coupon({ floor: 0.03, cap: 0.03 }) }))).toEqual([])
    expect(messagesOf(note({ coupon: coupon({ floor: 0.03, cap: 0.02 }) }))).toEqual(['Cap must be at or above the floor.'])
    expect(fieldsOf(note({ coupon: coupon({ cap: 0.21 }) }))).toEqual(['coupon'])
  })

  it('is not available on a contingent coupon, which is the scope of this reference', () => {
    expect(messagesOf(note({ coupon: coupon({}, { barrier: 0.7 }) }))).toEqual(['A floating rate is available only on a non-contingent coupon in this reference.'])
  })

  it('cannot carry amortization, whose level instalments need a fixed rate', () => {
    const amortizing = note({ redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'amortization', schedule: { frequency: 'quarterly' }, method: 'level-payment' }] }, payoff: { participations: [] } })
    expect(fieldsOf(amortizing)).toEqual(['coupon'])
    expect(amortizationSchedule(amortizing)).toEqual([])
  })

  it('reads no level, so a bullet note with one has no dates a level is read on', () => {
    expect(reviewDates(note({ redemption: { kind: 'bullet' } }))).toEqual([])
  })
})

describe('the coupon rate on a review', () => {
  it('is the reference rate plus the spread, within the floor and any cap', () => {
    expect(couponRateOn(floating(), 0.04)).toBeCloseTo(0.0675, 12)
    expect(couponRateOn(floating(), -0.0325)).toBe(0)
    expect(couponRateOn(floating({ cap: 0.06 }), 0.04)).toBe(0.06)
    expect(couponRateOn(floating({ floor: 0.001, spread: 0.0017 }), -0.002)).toBe(0.001)
  })

  it('needs the reference rate; a fixed rate takes none', () => {
    expect(() => couponRateOn(floating())).toThrow('reference rate')
    expect(couponRateOn(0.12)).toBe(0.12)
  })

  // Citi Floating Rate Trigger Callable Yield Notes, preliminary pricing supplement 2023-USNCH16969: the hypothetical coupon for one
  // coupon payment date on $10.00, at a spread of 2.75% and a minimum interest rate of 0.00%, "$10.00 multiplied by the applicable
  // coupon rate divided by 4". The filing rounds each coupon half up to four decimals, so each is matched to within half a unit there.
  it.each([
    [0.05, 0.0775, 0.1938], [0.04, 0.0675, 0.1688], [0.03, 0.0575, 0.1438], [0.02, 0.0475, 0.1188], [0.01, 0.0375, 0.0938], [0, 0.0275, 0.0688],
    [-0.01, 0.0175, 0.0438], [-0.02, 0.0075, 0.0188], [-0.03, 0, 0], [-0.04, 0, 0], [-0.05, 0, 0],
  ])('reproduces the Citi table at a reference rate of %s', (referenceRate, couponRate, printed) => {
    const citi = note({ principalAmount: 10 })
    expect(couponRateOn(floating(), referenceRate)).toBeCloseTo(couponRate, 12)
    expect(Math.abs(couponPerReview(citi, referenceRate) - printed)).toBeLessThanOrEqual(0.00005 + 1e-12)
  })
})

describe('the outcome of a floating coupon', () => {
  it('pays each review at its own reference rate, the floor holding one at zero, in the worked example', () => {
    const outcome = redemptionOutcome(note(), [], { initial: 100, final: 75, lastReferenceRate: lastRate }, { referenceRates: rates })
    expect(outcome.coupons.map(({ paid }) => paid)).toEqual([16.875, 14.375, 10.625, 4.375, 0, 6.875, 11.875, 14.375].map((amount) => expect.closeTo(amount, 9)))
    expect(outcome.coupons[4]).toMatchObject({ referenceRate: -0.0325, rate: 0, paid: 0 })
    expect(outcome.payment).toBeCloseTo(1014.375, 9)
    expect(outcome.totalPaid).toBeCloseTo(1079.375, 9)
    // A review that pays nothing is not a payment date.
    expect(outcome.payments.map(({ month }) => month)).toEqual([3, 6, 9, 12, 18, 21, 24])
  })

  it('bears the fall below the downside barrier and still pays the last coupon', () => {
    const outcome = redemptionOutcome(note(), [], { initial: 100, final: 50, lastReferenceRate: lastRate }, { referenceRates: rates })
    expect(outcome.payment).toBeCloseTo(514.375, 9)
  })

  it('stops at an issuer call, which pays that review\'s coupon, and reads no rate after it', () => {
    const called = redemptionOutcome(note(), [], { initial: 100, final: 75, lastReferenceRate: lastRate }, { issuerCallsOnReview: 2, referenceRates: rates })
    expect(called.months).toBe(6)
    expect(called.payments).toEqual([
      { month: 3, coupon: expect.closeTo(16.875, 9), redemption: 0, amount: expect.closeTo(16.875, 9) },
      { month: 6, coupon: expect.closeTo(14.375, 9), redemption: 1000, amount: expect.closeTo(1014.375, 9) },
    ])
    const later = redemptionOutcome(note(), [], { initial: 100, final: 75, lastReferenceRate: 0.19 }, { issuerCallsOnReview: 2, referenceRates: [0.04, 0.03, 0.19, 0.19, 0.19, 0.19, 0.19] })
    expect(later).toEqual(called)
  })

  it('applies a cap to a review above it', () => {
    const outcome = redemptionOutcome(note({ coupon: coupon({ cap: 0.06 }) }), [], { initial: 100, final: 75, lastReferenceRate: lastRate }, { referenceRates: rates })
    expect(outcome.coupons[0]).toMatchObject({ rate: 0.06, paid: 15 })
    expect(outcome.coupons[1].paid).toBeCloseTo(14.375, 9)
  })

  it('needs a reference rate for every coupon review, each within this reference\'s limits, and only for a floating coupon', () => {
    const levels = { initial: 100, final: 75, lastReferenceRate: lastRate }
    expect(() => redemptionOutcome(note(), [], levels, { referenceRates: rates.slice(1) })).toThrow('each of the 8 coupon reviews')
    expect(() => redemptionOutcome(note(), [], { initial: 100, final: 75 }, { referenceRates: rates })).toThrow('each of the 8 coupon reviews')
    expect(() => redemptionOutcome(note(), [], levels, { referenceRates: [...rates.slice(0, 6), 0.21] })).toThrow('between −5% and 20%')
    expect(() => redemptionOutcome(note(), [], levels, { referenceRates: [...rates.slice(0, 6), -0.051] })).toThrow('between −5% and 20%')
    const fixed = note({ coupon: { schedule: { frequency: 'quarterly' }, rate: 0.12 } })
    expect(() => redemptionOutcome(fixed, [], levels, { referenceRates: rates })).toThrow('Only a floating coupon')
  })

  it('adds the last review\'s coupon, at its reference rate, to the payment the chart draws at the end of the term', () => {
    expect(paymentAtEnd(note(), { initial: 100, final: 75, lastReferenceRate: lastRate })).toBeCloseTo(1014.375, 9)
    expect(paymentAtEnd(note(), { initial: 100, final: 50, lastReferenceRate: -0.04 })).toBe(500)
    expect(() => paymentAtEnd(note(), { initial: 100, final: 75 })).toThrow('reference rate')
  })
})
