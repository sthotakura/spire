import { describe, expect, it } from 'vitest'
import { paymentAtEnd, redemptionOutcome } from './autocall'
import { couponPerReview, productIssues, reviewDates, validateProduct, type Autocall, type Coupon, type Product } from './note'
import { startingProduct } from './starting-note'

// Synthetic: the worked example in docs/contingent-coupon.md. A 12-month note of 1,000 on one index with an initial level of 100,
// reviewed monthly, a 12% coupon a year (10 a review) at a 70% barrier, called at 100% from review 4, and a 60% downside barrier.
const autocall = (terms: Partial<Autocall> = {}): Autocall => ({ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 3, callAmount: 0, ...terms })
const coupon = (terms: Partial<Coupon> = {}): Coupon => ({ schedule: { frequency: 'monthly' }, rate: 0.12, barrier: 0.7, memory: true, ...terms })
const withCoupon = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  redemption: autocall(),
  coupon: coupon(),
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  ...overrides,
})
const fieldsOf = (product: Product) => productIssues(product).map(({ field }) => field)
// The worked example's path: 95, 65, 102 (in the non-call period), 68, then 104, which calls it. The reviews after a call are not read.
const path = [95, 65, 102, 68, 104, 90, 90, 90, 90, 90, 90]
// A path that is never called: every review below the trigger.
const neverCalled = [95, 65, 60, 68, 90, 50, 80, 90, 90, 90, 65]

describe('validation of a contingent coupon', () => {
  it('accepts the worked example', () => {
    expect(validateProduct(withCoupon())).toEqual([])
  })

  it.each([[0, false], [0.0001, true], [0.5, true], [-0.1, false], [Number.NaN, false]])('a rate of %s is accepted: %s', (rate, ok) => {
    expect(fieldsOf(withCoupon({ coupon: coupon({ rate }) }))).toEqual(ok ? [] : ['coupon'])
  })

  it.each([[0, false], [0.01, true], [1, true], [2, true], [2.01, false], [Number.NaN, false]])('a barrier of %s is accepted: %s', (barrier, ok) => {
    expect(fieldsOf(withCoupon({ coupon: coupon({ barrier }) }))).toEqual(ok ? [] : ['coupon'])
  })

  it('goes with any redemption: a bullet note, an autocall or an issuer call', () => {
    expect(validateProduct(withCoupon({ redemption: 'bullet' }))).toEqual([])
    expect(validateProduct(withCoupon({ redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 } }))).toEqual([])
  })

  it('needs its own schedule, which must divide the term, and can have a single review', () => {
    expect(fieldsOf(withCoupon({ coupon: { ...coupon(), schedule: undefined as never } }))).toEqual(['couponSchedule'])
    expect(fieldsOf(withCoupon({ term: { months: 18 }, redemption: 'bullet', coupon: coupon({ schedule: { frequency: 'annual' } }) }))).toEqual(['couponSchedule'])
    expect(validateProduct(withCoupon({ redemption: 'bullet', coupon: coupon({ schedule: { frequency: 'annual' } }) }))).toEqual([])
  })

  it('can be combined with lookback, measuring its barrier from the lookback level, but not with a barrier observed on every close', () => {
    const lookback: Product['underlier'] = { ...startingProduct.underlier, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } }
    const product = withCoupon({ redemption: 'bullet', underlier: lookback })
    expect(fieldsOf(product)).toEqual([])
    // A lookback level of 90: the 70% barrier is 63.
    expect(redemptionOutcome(product, Array.from({ length: 11 }, () => 64), { initial: 90, final: 100 }).coupons[0]).toMatchObject({ barrierLevel: 63, met: true })
    expect(fieldsOf(withCoupon({ redemption: 'bullet', payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'daily-close' } }] } }))).toEqual(['couponSchedule'])
  })

  it('is optional, and memory defaults to off', () => {
    expect(validateProduct(withCoupon({ coupon: undefined }))).toEqual([])
    expect(validateProduct(withCoupon({ coupon: { schedule: { frequency: 'monthly' }, rate: 0.12, barrier: 0.7 } }))).toEqual([])
  })
})

describe('the dates a level is read on', () => {
  it('are the call reviews and the coupon reviews, a date on both once, in order of month', () => {
    const product = withCoupon({ redemption: autocall({ schedule: { frequency: 'quarterly' }, nonCallReviews: 0 }), coupon: coupon({ schedule: { frequency: 'monthly' } }) })
    const dates = reviewDates(product)
    expect(dates.map(({ month }) => month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(dates[2]).toEqual({ month: 3, call: 1, coupon: 3 })
    expect(dates[3]).toEqual({ month: 4, coupon: 4 })
  })

  it('can have call reviews that are not coupon reviews', () => {
    const product = withCoupon({ redemption: autocall({ schedule: { frequency: 'monthly' }, nonCallReviews: 0 }), coupon: coupon({ schedule: { frequency: 'quarterly' } }) })
    expect(reviewDates(product).filter((date) => date.coupon === undefined)).toHaveLength(8)
  })

  it('are the coupon reviews alone for a bullet note or an issuer call, which reads no level', () => {
    expect(reviewDates(withCoupon({ redemption: 'bullet', coupon: coupon({ schedule: { frequency: 'quarterly' } }) })).map(({ month }) => month)).toEqual([3, 6, 9, 12])
    expect(reviewDates(withCoupon({ redemption: { kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0 }, coupon: coupon({ schedule: { frequency: 'semi-annual' } }) })).map(({ month }) => month)).toEqual([6, 12])
  })

  it('are none for a bullet note with no coupon', () => {
    expect(reviewDates(withCoupon({ redemption: 'bullet', coupon: undefined }))).toEqual([])
  })
})

describe('the coupon on each review', () => {
  it('is principal × rate × the months between reviews ÷ 12', () => {
    expect(couponPerReview(withCoupon())).toBeCloseTo(10, 9)
    expect(couponPerReview(withCoupon({ coupon: coupon({ schedule: { frequency: 'quarterly' } }) }))).toBeCloseTo(30, 9)
    expect(couponPerReview(withCoupon({ coupon: undefined }))).toBe(0)
  })

  it('pays the worked example with memory: 10, 0, 20, 0, then 1,000 + 20 on the call', () => {
    const outcome = redemptionOutcome(withCoupon(), path, { initial: 100, final: 90 })
    expect(outcome.calledAtReview).toBe(5)
    expect(outcome.coupons.map(({ paid }) => paid)).toEqual([10, 0, 20, 0, 20].map((amount) => expect.closeTo(amount, 9)))
    expect(outcome.coupons.map(({ remembered }) => remembered)).toEqual([0, 1, 0, 1, 0])
    expect(outcome.payment).toBeCloseTo(1020, 9)
    expect(outcome.totalPaid).toBeCloseTo(1050, 9)
    expect(outcome.months).toBe(5)
  })

  it('pays the worked example without memory: a missed coupon is lost', () => {
    const outcome = redemptionOutcome(withCoupon({ coupon: coupon({ memory: false }) }), path, { initial: 100, final: 90 })
    expect(outcome.coupons.map(({ paid }) => paid)).toEqual([10, 0, 10, 0, 10].map((amount) => expect.closeTo(amount, 9)))
    expect(outcome.coupons.every(({ remembered }) => remembered === 0)).toBe(true)
    expect(outcome.payment).toBeCloseTo(1010, 9)
    expect(outcome.totalPaid).toBeCloseTo(1030, 9)
  })

  it('is tested in the non-call period, where a review at or above the trigger is not called', () => {
    const outcome = redemptionOutcome(withCoupon(), path, { initial: 100, final: 90 })
    expect(outcome.tests[2]).toMatchObject({ review: 3, callable: false, called: false })
    expect(outcome.coupons[2]).toMatchObject({ met: true, coupons: 2 })
  })

  it('is met at the barrier and missed just below it', () => {
    const at = redemptionOutcome(withCoupon(), [70, ...neverCalled.slice(1)], { initial: 100, final: 90 })
    const below = redemptionOutcome(withCoupon(), [69.99, ...neverCalled.slice(1)], { initial: 100, final: 90 })
    expect(at.coupons[0].met).toBe(true)
    expect(below.coupons[0].met).toBe(false)
  })

  it('stops when the product is called: the reviews after the call are not tested', () => {
    expect(redemptionOutcome(withCoupon(), path, { initial: 100, final: 90 }).coupons).toHaveLength(5)
  })
})

describe('a product with a coupon that is never called', () => {
  it('tests the last review on the final level, and pays its coupon with the maturity payment', () => {
    const outcome = redemptionOutcome(withCoupon(), neverCalled, { initial: 100, final: 75 })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.coupons).toHaveLength(12)
    expect(outcome.coupons[11]).toMatchObject({ review: 12, level: 75, met: true })
    // Reviews 2, 3 and 4 are missed and paid on review 5; reviews 6 and 11 are missed and paid on reviews 7 and 12.
    expect(outcome.coupons.map(({ coupons }) => coupons)).toEqual([1, 0, 0, 0, 4, 0, 2, 1, 1, 1, 0, 2])
    expect(outcome.maturity.payment).toBeCloseTo(1000, 9)
    expect(outcome.payment).toBeCloseTo(1020, 9)
    expect(outcome.totalPaid).toBeCloseTo(1120, 9)
  })

  it('loses the remembered coupons when the last review is below the barrier', () => {
    const outcome = redemptionOutcome(withCoupon(), neverCalled, { initial: 100, final: 55 })
    expect(outcome.coupons[11]).toMatchObject({ met: false, coupons: 0, remembered: 2 })
    // The downside barrier is reached at 55, so the payoff bears the whole 45% fall.
    expect(outcome.payment).toBeCloseTo(550, 9)
    expect(outcome.totalPaid).toBeCloseTo(550 + 100, 9)
  })

  it('reads the averaged final level on the last review, as the maturity payment does', () => {
    const averaging = withCoupon({ underlier: { ...startingProduct.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 2 } } } })
    const outcome = redemptionOutcome(averaging, neverCalled, { initial: 100, final: 69 })
    expect(outcome.coupons[11]).toMatchObject({ level: 69, met: false })
  })
})

describe('the coupon with a call on the final review', () => {
  it('pays principal, the call amount and the last coupon when the final level calls it', () => {
    const product = withCoupon({ redemption: autocall({ callOnFinalReview: true, callAmount: 0.05 }), coupon: coupon({ memory: false }) })
    const outcome = redemptionOutcome(product, neverCalled, { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(12)
    expect(outcome.payment).toBeCloseTo(1060, 9)
  })
})

describe('a call on a review that misses the coupon', () => {
  it('pays no coupon on that review when the trigger has stepped below the barrier, and loses what was remembered', () => {
    // The trigger starts at 100% and falls 8 points a review, to 68% on review 5, below the 70% coupon barrier.
    const product = withCoupon({ redemption: autocall({ triggerStep: -0.08 }) })
    const outcome = redemptionOutcome(product, [95, 65, 50, 40, 69, 90, 90, 90, 90, 90, 90], { initial: 100, final: 90 })
    expect(outcome.calledAtReview).toBe(5)
    expect(outcome.coupons[4]).toMatchObject({ met: false, paid: 0, remembered: 4 })
    expect(outcome.payment).toBeCloseTo(1000, 9)
    expect(outcome.totalPaid).toBeCloseTo(1010, 9)
  })
})

describe('the payment at the end of the term with a coupon', () => {
  it('adds the last review\'s own coupon at and above the coupon barrier', () => {
    expect(paymentAtEnd(withCoupon(), { initial: 100, final: 70 })).toBeCloseTo(1010, 9)
    expect(paymentAtEnd(withCoupon(), { initial: 100, final: 69.99 })).toBeCloseTo(1000, 9)
  })

  it('drops at a coupon barrier equal to the downside barrier, as the Apple note\'s table does', () => {
    // Synthetic version of that table: quarterly reviews over a year, 11.5% a year (28.75 a review), both barriers at 70%.
    const product = withCoupon({
      redemption: autocall({ schedule: { frequency: 'quarterly' }, nonCallReviews: 0 }),
      coupon: coupon({ schedule: { frequency: 'quarterly' }, rate: 0.115, memory: false }),
      payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'final' } }] },
    })
    expect(paymentAtEnd(product, { initial: 100, final: 70 })).toBeCloseTo(1028.75, 9)
    expect(paymentAtEnd(product, { initial: 100, final: 69.99 })).toBeCloseTo(699.9, 9)
  })

  it('is the payoff alone without a coupon', () => {
    expect(paymentAtEnd(withCoupon({ coupon: undefined }), { initial: 100, final: 90 })).toBeCloseTo(1000, 9)
  })
})

describe('a coupon on its own schedule', () => {
  // A quarterly call that can call from its first review, and a monthly coupon with memory: twelve dates, the call on months 3, 6 and 9.
  const quarterlyCall = withCoupon({ redemption: autocall({ schedule: { frequency: 'quarterly' }, nonCallReviews: 0 }) })

  it('tests the coupon every month and the call every quarter, and pays the coupon of the call month with the call', () => {
    // Month 3 is below the trigger; month 6 calls it. Months 2 and 4 are below the coupon barrier.
    const outcome = redemptionOutcome(quarterlyCall, [95, 65, 90, 60, 95, 104, 90, 90, 90, 90, 90], { initial: 100, final: 90 })
    expect(outcome.calledAtReview).toBe(2)
    expect(outcome.months).toBe(6)
    expect(outcome.tests.map(({ review, month, called }) => [review, month, called])).toEqual([[1, 3, false], [2, 6, true]])
    expect(outcome.coupons.map(({ month, paid }) => [month, paid])).toEqual([[1, 10], [2, 0], [3, 20], [4, 0], [5, 20], [6, 10]].map(([month, paid]) => [month, expect.closeTo(paid, 9)]))
    expect(outcome.payment).toBeCloseTo(1010, 9)
    expect(outcome.totalPaid).toBeCloseTo(1060, 9)
  })

  it('pays no coupon with a call on a month that is not a coupon review', () => {
    const monthlyCall = withCoupon({ redemption: autocall({ schedule: { frequency: 'monthly' }, nonCallReviews: 0 }), coupon: coupon({ schedule: { frequency: 'quarterly' } }) })
    // Called in month 4. The coupon was tested in month 3 only, a quarter's coupon of 30.
    const outcome = redemptionOutcome(monthlyCall, [95, 95, 95, 104, 90, 90, 90, 90, 90, 90, 90], { initial: 100, final: 90 })
    expect(outcome.calledAtReview).toBe(4)
    expect(outcome.coupons.map(({ month }) => month)).toEqual([3])
    expect(outcome.payment).toBeCloseTo(1000, 9)
    expect(outcome.totalPaid).toBeCloseTo(1030, 9)
  })
})

describe('a coupon on a bullet note', () => {
  const bullet = withCoupon({ redemption: 'bullet', coupon: coupon({ schedule: { frequency: 'quarterly' }, memory: false }) })

  it('reads a level on each coupon review and pays the last coupon with the maturity payment', () => {
    const outcome = redemptionOutcome(bullet, [95, 65, 80], { initial: 100, final: 75 })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.tests).toEqual([])
    expect(outcome.coupons.map(({ paid }) => paid)).toEqual([30, 0, 30, 30].map((amount) => expect.closeTo(amount, 9)))
    expect(outcome.payment).toBeCloseTo(1030, 9)
    expect(outcome.totalPaid).toBeCloseTo(1090, 9)
  })

  it('expects a level for each coupon review before the last', () => {
    expect(() => redemptionOutcome(bullet, [95, 65], { initial: 100, final: 75 })).toThrow(/3 reviews/)
  })
})

describe('a coupon with an issuer call', () => {
  const issuer = withCoupon({ redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 } })

  it('reads the coupon reviews only, and pays the coupon of the call month with the call', () => {
    const outcome = redemptionOutcome(issuer, [95, 65, 90, 60, 95, 90, 90, 90, 90, 90, 90], { initial: 100, final: 90 }, 2)
    expect(outcome.months).toBe(6)
    expect(outcome.coupons).toHaveLength(6)
    expect(outcome.payment).toBeCloseTo(1010, 9)
    expect(outcome.totalPaid).toBeCloseTo(1060, 9)
  })
})
