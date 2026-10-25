import { describe, expect, it } from 'vitest'
import { paymentAtEnd, redemptionOutcome } from './autocall'
import { basketLevelFrom, productIssues, reviewDates, validateProduct, type Autocall, type BasketUnderlier, type Coupon, type Product } from './note'
import { startingProduct } from './starting-note'

// Synthetic: the worked example in docs/coupon.md, shaped like the 2019 fixed coupon autocall. An 18-month note of 1,000 on one stock
// with an initial level of 100, a fixed coupon of 12% a year paid quarterly (30 a review), a quarterly autocall that cannot call on
// review 1, a trigger of 100% stepping −5% a review, and a 60% downside barrier read on the final date.
const autocall = (terms: Partial<Autocall> = {}): Autocall => ({ kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, triggerStep: -0.05, nonCallReviews: 1, callAmount: 0, ...terms })
const fixed = (terms: Partial<Coupon> = {}): Coupon => ({ schedule: { frequency: 'quarterly' }, rate: 0.12, ...terms })
const withFixedCoupon = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 18 },
  redemption: autocall(),
  coupon: fixed(),
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  ...overrides,
})
const fieldsOf = (product: Product) => productIssues(product).map(({ field }) => field)
const dailyBarrier: Product['payoff'] = { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'daily-close' } }] }
// Below the trigger on every review that can call: 95%, 90%, 85% and 80% on reviews 2 to 5.
const neverCalled = [80, 90, 85, 80, 75]

describe('validation of a fixed coupon', () => {
  it('accepts a coupon with no barrier, with any redemption', () => {
    expect(validateProduct(withFixedCoupon())).toEqual([])
    expect(validateProduct(withFixedCoupon({ redemption: 'bullet' }))).toEqual([])
    expect(validateProduct(withFixedCoupon({ redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 } }))).toEqual([])
  })

  it('rejects memory, since no fixed coupon is missed, but accepts memory set to false', () => {
    expect(fieldsOf(withFixedCoupon({ coupon: fixed({ memory: true }) }))).toEqual(['coupon'])
    expect(validateProduct(withFixedCoupon({ coupon: fixed({ memory: false }) }))).toEqual([])
  })

  it('still needs a rate above zero and a schedule that divides the term', () => {
    expect(fieldsOf(withFixedCoupon({ coupon: fixed({ rate: 0 }) }))).toEqual(['coupon'])
    expect(fieldsOf(withFixedCoupon({ redemption: 'bullet', coupon: fixed({ schedule: { frequency: 'annual' } }) }))).toEqual(['couponSchedule'])
  })

  it('can be combined with a barrier observed on every close on a bullet note, since it reads no level, but not with a call', () => {
    expect(validateProduct(withFixedCoupon({ redemption: 'bullet', payoff: dailyBarrier }))).toEqual([])
    expect(fieldsOf(withFixedCoupon({ payoff: dailyBarrier }))).toEqual(['schedule'])
    // A contingent coupon reads a level on each review, so it is still not combined with one.
    expect(fieldsOf(withFixedCoupon({ redemption: 'bullet', coupon: fixed({ barrier: 0.7 }), payoff: dailyBarrier }))).toEqual(['couponSchedule'])
  })
})

describe('the dates a level is read on, with a fixed coupon', () => {
  it('are none for a bullet note: a fixed coupon reads no level', () => {
    expect(reviewDates(withFixedCoupon({ redemption: 'bullet' }))).toEqual([])
  })

  it('are the call reviews alone for an autocall, even when the coupon is reviewed more often', () => {
    const monthly = withFixedCoupon({ coupon: fixed({ schedule: { frequency: 'monthly' } }) })
    expect(reviewDates(monthly).map(({ month }) => month)).toEqual([3, 6, 9, 12, 15, 18])
    expect(reviewDates(monthly).every((date) => date.coupon === undefined)).toBe(true)
  })
})

describe('the worked example', () => {
  it('pays 30 on reviews 1 and 2, then 1,000 + 30 when review 3 calls it at its 90% trigger: 1,090 in nine months', () => {
    const outcome = redemptionOutcome(withFixedCoupon(), [80, 92, 91, 90, 90], { initial: 100, final: 90 })
    expect(outcome.tests.map(({ review, called }) => [review, called])).toEqual([[1, false], [2, false], [3, true]])
    expect(outcome.coupons.map(({ review, month, paid }) => [review, month, paid])).toEqual([[1, 3, 30], [2, 6, 30], [3, 9, 30]].map(([review, month, paid]) => [review, month, expect.closeTo(paid, 9)]))
    expect(outcome.coupons.every(({ met, level, barrierLevel }) => met && level === undefined && barrierLevel === undefined)).toBe(true)
    expect(outcome.payment).toBeCloseTo(1030, 9)
    expect(outcome.totalPaid).toBeCloseTo(1090, 9)
    expect(outcome.months).toBe(9)
  })

  it.each([[75, 1030, 1180], [60, 1030, 1180], [50, 530, 680]])('never called with a final level of %s: pays %s at the end of the term, %s in all', (final, payment, total) => {
    const outcome = redemptionOutcome(withFixedCoupon(), neverCalled, { initial: 100, final })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.coupons).toHaveLength(6)
    expect(outcome.coupons.every(({ paid }) => Math.abs(paid - 30) < 1e-9)).toBe(true)
    expect(outcome.payment).toBeCloseTo(payment, 9)
    expect(outcome.totalPaid).toBeCloseTo(total, 9)
  })
})

describe('a fixed coupon on a bullet note', () => {
  // A 12-month note at 6% a year paid monthly: 5 a month.
  const bullet = withFixedCoupon({ term: { months: 12 }, redemption: 'bullet', coupon: fixed({ schedule: { frequency: 'monthly' }, rate: 0.06 }) })

  it('reads no review levels and pays every coupon, the last with the payment at the end of the term', () => {
    const outcome = redemptionOutcome(bullet, [], { initial: 100, final: 50 })
    expect(outcome.coupons).toHaveLength(12)
    expect(outcome.payment).toBeCloseTo(500 + 5, 9)
    expect(outcome.totalPaid).toBeCloseTo(500 + 60, 9)
  })

  it('reads a barrier observed on every close from the closes the scenario gives, in the payment and the total paid', () => {
    const daily = { ...bullet, payoff: dailyBarrier }
    // The final level of 95 is above the 60% barrier, but a close of 50 reached it, so the whole 5% fall counts.
    const outcome = redemptionOutcome(daily, [], { initial: 100, final: 95, lowestClose: 50 })
    expect(outcome.maturity.payment).toBeCloseTo(950, 9)
    expect(outcome.payment).toBeCloseTo(955, 9)
    expect(outcome.totalPaid).toBeCloseTo(1010, 9)
  })

  it('expects no review levels', () => {
    expect(() => redemptionOutcome(bullet, [90], { initial: 100, final: 50 })).toThrow()
  })
})

describe('the payment at the end of the term with a fixed coupon', () => {
  it('adds the last coupon at every final level, with no step', () => {
    expect(paymentAtEnd(withFixedCoupon(), { initial: 100, final: 100 })).toBeCloseTo(1030, 9)
    expect(paymentAtEnd(withFixedCoupon(), { initial: 100, final: 60 })).toBeCloseTo(1030, 9)
    expect(paymentAtEnd(withFixedCoupon(), { initial: 100, final: 10 })).toBeCloseTo(130, 9)
  })
})

describe('the 2019 worst-of fixed coupon autocall, with synthetic assets', () => {
  // The note's hypothetical initial levels of 200, 300 and 10, its 11.72% a year paid quarterly (29.30 a quarter) over 18 months, a
  // call from review 2 at 95% stepping down 5% a review to 80%, and a 60% downside threshold on the worst asset.
  const underlier: BasketUnderlier = {
    kind: 'basket',
    components: [{ asset: { kind: 'equity', name: 'Stock A' } }, { asset: { kind: 'equity', name: 'Stock B' } }, { asset: { kind: 'equity', name: 'Stock C' } }],
    determination: { initial: { kind: 'given', levels: [{ asset: 'Stock A', level: 200 }, { asset: 'Stock B', level: 300 }, { asset: 'Stock C', level: 10 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
  }
  const note = withFixedCoupon({ underlier, coupon: fixed({ rate: 0.1172 }) })
  const level = (a: number, b: number, c: number) => basketLevelFrom(underlier, [a, b, c])

  it('is a valid product, with a coupon of 29.30 a quarter', () => {
    expect(validateProduct(note)).toEqual([])
    const outcome = redemptionOutcome(note, [100, 100, 100, 100, 100], { initial: 100, final: 100 })
    expect(outcome.coupons[0].paid).toBeCloseTo(29.3, 9)
  })

  it('is not called on its first call test with one asset at 85%, and is called on the next at 92.75% against 90%: 1,029.30', () => {
    // The filing's determination dates 1 and 2 are the note's reviews 2 and 3; review 1 is in the non-call period.
    const outcome = redemptionOutcome(note, [100, level(195, 295, 8.5), level(185.5, 280, 9.5), 100, 100], { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(3)
    expect(outcome.payment).toBeCloseTo(1029.3, 9)
    expect(outcome.totalPaid).toBeCloseTo(1000 + 3 * 29.3, 9)
  })

  it.each([
    [[250, 350, 15], 1000],
    [[110, 200, 7.5], 550],
    [[172.5, 165, 5], 500],
    [[100, 165, 8.5], 500],
    [[80, 165, 5], 400],
  ])('never called, with final levels %j: the payoff pays %s, plus the last coupon', (finals, payoff) => {
    const outcome = redemptionOutcome(note, [50, 50, 50, 50, 50], { initial: 100, final: level(finals[0], finals[1], finals[2]) })
    expect(outcome.maturity.payment).toBeCloseTo(payoff, 9)
    expect(outcome.payment).toBeCloseTo(payoff + 29.3, 9)
    expect(outcome.totalPaid).toBeCloseTo(payoff + 6 * 29.3, 9)
  })
})

describe('the 2026 Barclays fixed coupon autocall examples, on one synthetic stock', () => {
  // A 12-month note, 3.605% a quarter (14.42% a year, 36.05 on 1,000), a quarterly call at 100% from review 1, and a 60% threshold.
  const note = withFixedCoupon({ term: { months: 12 }, redemption: autocall({ triggerStep: 0, nonCallReviews: 0 }), coupon: fixed({ rate: 0.1442 }) })

  it('example 1: called on review 2 at the initial level, paying 1,036.05', () => {
    const outcome = redemptionOutcome(note, [90, 100, 100], { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(2)
    expect(outcome.payment).toBeCloseTo(1036.05, 9)
  })

  it('example 2: called on review 3 after coupons on reviews 1 and 2', () => {
    const outcome = redemptionOutcome(note, [95, 65, 125], { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(3)
    expect(outcome.payment).toBeCloseTo(1036.05, 9)
    expect(outcome.totalPaid).toBeCloseTo(1000 + 3 * 36.05, 9)
  })

  it('example 3: never called and below the threshold at 50, paying 536.05', () => {
    expect(redemptionOutcome(note, [45, 47, 45], { initial: 100, final: 50 }).payment).toBeCloseTo(536.05, 9)
  })

  it('example 4: never called and at 65, above the threshold, paying 1,036.05', () => {
    expect(redemptionOutcome(note, [25, 40, 45], { initial: 100, final: 65 }).payment).toBeCloseTo(1036.05, 9)
  })
})
