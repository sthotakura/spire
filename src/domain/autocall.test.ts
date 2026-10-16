import { describe, expect, it } from 'vitest'
import { finalCallLevel, paymentAtEnd, redemptionOutcome } from './autocall'
import { annualisedReturn, basketLevelFrom, productIssues, reviewCount, suggestedFrequency, validateProduct, type Autocall, type BasketUnderlier, type Product, type Schedule } from './note'
import { startingProduct } from './starting-note'

// Synthetic: a 12-month note on one index, reviewed monthly, called when the index is at or above its initial level.
const autocall = (terms: Partial<Autocall> = {}): Autocall => ({ kind: 'autocall', trigger: 1, callAmount: 0.08, ...terms })
const callable = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  schedule: { frequency: 'monthly' },
  redemption: autocall(),
  ...overrides,
})
const levels = { initial: 100, final: 100 }
const flat = (count: number, level = 90) => Array.from({ length: count }, () => level)
const fieldsOf = (product: Product) => productIssues(product).map(({ field }) => field)

describe('review count', () => {
  it.each<[Schedule['frequency'], number, number | undefined]>([
    ['monthly', 12, 12], ['quarterly', 12, 4], ['semi-annual', 36, 6], ['annual', 36, 3],
    ['quarterly', 10, undefined], ['annual', 18, undefined],
  ])('%s over %i months is %s reviews', (frequency, months, expected) => {
    expect(reviewCount({ term: { months }, schedule: { frequency } })).toBe(expected)
  })

  it('is one review, the final date, when there is no schedule', () => {
    expect(reviewCount({ term: { months: 36 } })).toBe(1)
  })
})

describe('the frequency a term starts with', () => {
  it.each<[number, Schedule['frequency']]>([
    [120, 'semi-annual'], [36, 'semi-annual'], [24, 'semi-annual'], [18, 'semi-annual'], [13, 'monthly'], [15, 'quarterly'],
    [12, 'quarterly'], [9, 'quarterly'], [6, 'quarterly'], [7, 'monthly'], [5, 'monthly'], [3, 'monthly'], [2, 'monthly'],
  ])('%i months starts with %s', (months, expected) => {
    expect(suggestedFrequency(months)).toBe(expected)
  })

  it('always starts valid when the term allows at least two reviews', () => {
    for (let months = 2; months <= 120; months++) {
      expect(fieldsOf(callable({ term: { months }, schedule: { frequency: suggestedFrequency(months) } })), `${months} months`).toEqual([])
    }
  })
})

describe('validation of a schedule and an autocall', () => {
  it('accepts a monthly autocall over a year', () => {
    expect(validateProduct(callable())).toEqual([])
  })

  it('needs a schedule', () => {
    expect(fieldsOf(callable({ schedule: undefined }))).toEqual(['schedule'])
  })

  it('rejects a schedule on a bullet product, which nothing would read', () => {
    expect(fieldsOf({ ...callable(), redemption: 'bullet' })).toEqual(['schedule'])
  })

  it('needs a term that holds whole periods', () => {
    expect(fieldsOf(callable({ term: { months: 10 }, schedule: { frequency: 'quarterly' } }))).toEqual(['schedule'])
  })

  it('needs at least two reviews, so it can be called before the last', () => {
    expect(fieldsOf(callable({ schedule: { frequency: 'annual' } }))).toEqual(['schedule'])
    expect(validateProduct(callable({ schedule: { frequency: 'semi-annual' } }))).toEqual([])
  })

  it.each([[0, false], [0.01, true], [2, true], [2.01, false], [-1, false], [Number.NaN, false]])('a trigger of %s is accepted: %s', (trigger, ok) => {
    expect(fieldsOf(callable({ redemption: autocall({ trigger }) }))).toEqual(ok ? [] : ['trigger'])
  })

  it.each([[0, true], [0.5, true], [-0.01, false], [Number.NaN, false]])('a call amount of %s is accepted: %s', (callAmount, ok) => {
    expect(fieldsOf(callable({ redemption: autocall({ callAmount }) }))).toEqual(ok ? [] : ['callAmount'])
  })

  it.each([[0, true], [-0.05, true], [0.05, true], [Number.NaN, false], [Number.POSITIVE_INFINITY, false]])('a trigger step of %s is accepted: %s', (triggerStep, ok) => {
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep }) }))).toEqual(ok ? [] : ['triggerStep'])
  })

  it.each([[0, true], [4, true], [10, true], [11, false], [-1, false], [1.5, false], [Number.NaN, false]])('a non-call period of %s reviews is accepted: %s', (nonCallReviews, ok) => {
    // Twelve reviews: the last that can call is 11, so at most 10 can be skipped, unless the final review calls too.
    expect(fieldsOf(callable({ redemption: autocall({ nonCallReviews }) }))).toEqual(ok ? [] : ['nonCallReviews'])
  })

  it('leaves the last review to call when the final review is a call too', () => {
    expect(validateProduct(callable({ redemption: autocall({ nonCallReviews: 11, callOnFinalReview: true }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ nonCallReviews: 12, callOnFinalReview: true }) }))).toEqual(['nonCallReviews'])
  })

  it('checks the trigger from the first call to the last, and counts the step from review 1', () => {
    // From 100% by +10% a review, review 11 is 200%, so a larger step fails there whatever the non-call period is.
    expect(validateProduct(callable({ redemption: autocall({ triggerStep: 0.1, nonCallReviews: 5 }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: 0.11, nonCallReviews: 5 }) }))).toEqual(['triggerStep'])
    // A step down that reaches zero on review 11 is not rescued by a non-call period: the last review that can call still fails.
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: -0.1, nonCallReviews: 5 }) }))).toEqual(['triggerStep'])
  })

  it('needs the trigger to stay above zero on every review that is tested', () => {
    // Twelve reviews: the last one tested is 11 unless the final review calls too.
    expect(validateProduct(callable({ redemption: autocall({ triggerStep: -0.09 }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: -0.1 }) }))).toEqual(['triggerStep'])
    expect(validateProduct(callable({ redemption: autocall({ triggerStep: -0.09, callOnFinalReview: true }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: -0.1, callOnFinalReview: true }) }))).toEqual(['triggerStep'])
  })

  it('needs the trigger to stay at most 200% on every review that is tested', () => {
    // From 100% by 10% a review, review 11 is 200% and review 12 is 210%.
    expect(validateProduct(callable({ redemption: autocall({ triggerStep: 0.1 }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: 0.11 }) }))).toEqual(['triggerStep'])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStep: 0.1, callOnFinalReview: true }) }))).toEqual(['triggerStep'])
  })

  it('cannot be combined with lookback', () => {
    const lookback = { ...startingProduct.underlier, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } as Product['underlier']
    expect(fieldsOf(callable({ underlier: lookback }))).toEqual(['schedule'])
  })

  it('cannot be combined with a barrier observed on every close, on either side', () => {
    const down: Product['payoff'] = { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'daily-close' }, rate: 1 }] }
    const up: Product['payoff'] = { participations: [{ direction: 'upside', barrier: { level: 1.3, observation: 'daily-close' }, rate: 1 }] }
    expect(fieldsOf(callable({ payoff: down }))).toEqual(['schedule'])
    expect(fieldsOf(callable({ payoff: up }))).toEqual(['schedule'])
  })

  it('allows a barrier read on the final date', () => {
    const payoff: Product['payoff'] = { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }
    expect(validateProduct(callable({ payoff }))).toEqual([])
  })

  it('is allowed on a deposit, which still repays principal in full', () => {
    const deposit = callable({ wrapper: 'deposit', payoff: { participations: [{ direction: 'upside', rate: 1 }] } })
    expect(validateProduct(deposit)).toEqual([])
    expect(redemptionOutcome(deposit, flat(11), { initial: 100, final: 70 }).payment).toBe(1000)
  })
})

describe('how an autocall ends', () => {
  it('is called on the first review at or above the trigger, and pays principal plus the call amount', () => {
    const outcome = redemptionOutcome(callable(), [95, 100, 120, ...flat(8)], levels)
    expect(outcome.calledAtReview).toBe(2)
    expect(outcome.payment).toBe(1080)
    expect(outcome.months).toBe(2)
    expect(outcome.tests.map(({ review, called }) => [review, called])).toEqual([[1, false], [2, true]])
  })

  it('is called on the first review when it is at the trigger', () => {
    expect(redemptionOutcome(callable(), [100, ...flat(10)], levels).calledAtReview).toBe(1)
  })

  it('is not called just below the trigger', () => {
    expect(redemptionOutcome(callable(), flat(11, 99.99), levels).calledAtReview).toBeUndefined()
  })

  it('reads the trigger as a share of the initial level', () => {
    const outcome = redemptionOutcome(callable({ redemption: autocall({ trigger: 0.8 }) }), [79, 80, ...flat(9)], levels)
    expect(outcome.calledAtReview).toBe(2)
    expect(outcome.tests[0].triggerLevel).toBe(80)
  })

  it('counts the months of a quarterly schedule from the review it was called on', () => {
    const outcome = redemptionOutcome(callable({ term: { months: 36 }, schedule: { frequency: 'quarterly' } }), [90, 90, 105, ...flat(8)], levels)
    expect(outcome.reviews).toBe(12)
    expect(outcome.calledAtReview).toBe(3)
    expect(outcome.months).toBe(9)
  })

  it('does not test the last review for a call: it pays the payoff at the end of the term', () => {
    const note = callable({ payoff: { participations: [{ direction: 'downside', rate: 1 }] } })
    // Every review before the last is below the trigger, and the final level is above it: nothing calls, and the final level is read
    // by the payoff, which pays principal on a rise when there is no upside participation.
    const outcome = redemptionOutcome(note, flat(11), { initial: 100, final: 130 })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.payment).toBe(1000)
    expect(outcome.months).toBe(12)
  })

  it('pays the payoff on the final level when it is never called', () => {
    const note = callable({ payoff: { participations: [{ direction: 'downside', rate: 1 }] } })
    const outcome = redemptionOutcome(note, flat(11), { initial: 100, final: 60 })
    expect(outcome.payment).toBe(600)
    expect(outcome.maturity.payment).toBe(600)
  })

  it('keeps what the payoff would pay at maturity even when the product was called', () => {
    const note = callable({ payoff: { participations: [{ direction: 'upside', rate: 1.5 }] } })
    const outcome = redemptionOutcome(note, [110, ...flat(10)], { initial: 100, final: 140 })
    expect(outcome.payment).toBe(1080)
    expect(outcome.maturity.payment).toBeCloseTo(1600, 9)
  })

  it('pays principal only on a call with a call amount of zero', () => {
    expect(redemptionOutcome(callable({ redemption: autocall({ callAmount: 0 }) }), [100, ...flat(10)], levels).payment).toBe(1000)
  })

  it('a bullet product has one review and no tests', () => {
    const outcome = redemptionOutcome(startingProduct, [], levels)
    expect(outcome).toMatchObject({ reviews: 1, tests: [], months: 36, payment: 1000 })
  })

  it('rejects the wrong number of review levels', () => {
    expect(() => redemptionOutcome(callable(), flat(10), levels)).toThrow(/11 reviews/)
    expect(() => redemptionOutcome(startingProduct, [100], levels)).toThrow()
  })

  it('rejects a negative or missing review level', () => {
    expect(() => redemptionOutcome(callable(), [-1, ...flat(10)], levels)).toThrow()
    expect(() => redemptionOutcome(callable(), [Number.NaN, ...flat(10)], levels)).toThrow()
  })

  it('rejects an invalid product', () => {
    expect(() => redemptionOutcome(callable({ schedule: undefined }), flat(11), levels)).toThrow(/review schedule/)
  })
})

// Synthetic: three years reviewed every six months. The trigger starts at 100% and steps down 5% a review to 75% on the last, which is
// also a call. A call pays 10% for each year the product has lasted, so 5% after six months and 30% after three years. A fall of more
// than half at the end pays the loss.
describe('a trigger that steps down, a call amount for each year, and a call on the final review', () => {
  const stepped = callable({
    term: { months: 36 },
    schedule: { frequency: 'semi-annual' },
    redemption: autocall({ trigger: 1, triggerStep: -0.05, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true }),
    payoff: { participations: [{ direction: 'downside', barrier: { level: 0.5, observation: 'final' }, rate: 1 }] },
  })
  const never = [90, 85, 80, 70, 60]

  it('is valid', () => {
    expect(validateProduct(stepped)).toEqual([])
  })

  it('moves the trigger level by the step on each review', () => {
    const outcome = redemptionOutcome(stepped, never, { initial: 100, final: 60 })
    expect(outcome.tests.map(({ triggerLevel }) => triggerLevel)).toEqual([100, 95, 90, 85, 80, 75])
  })

  it('raises the trigger on each review when the step is positive, so a level that called on review 1 may not call later', () => {
    const rising = callable({ redemption: autocall({ trigger: 1, triggerStep: 0.05 }) })
    expect(redemptionOutcome(rising, flat(11), levels).tests.map(({ triggerLevel }) => triggerLevel).slice(0, 4)).toEqual([100, 105, 110, 115])
    // 104 is below review 2's trigger of 105, and 105 is at it.
    expect(redemptionOutcome(rising, [90, 104, ...flat(9)], levels).calledAtReview).toBeUndefined()
    expect(redemptionOutcome(rising, [90, 105, ...flat(9)], levels).calledAtReview).toBe(2)
  })

  it.each([[1, 100, 0.05, 6], [2, 95, 0.1, 12], [3, 90, 0.15, 18], [4, 85, 0.2, 24], [5, 80, 0.25, 30]])('is called on review %i at %s, paying %s above principal after %i months', (review, level, extra, months) => {
    const reviews = [...never.map((value) => value - 40).slice(0, review - 1), level, ...never.slice(review)].slice(0, 5)
    const outcome = redemptionOutcome(stepped, reviews, { initial: 100, final: 60 })
    expect(outcome.calledAtReview).toBe(review)
    expect(outcome.months).toBe(months)
    expect(outcome.payment).toBeCloseTo(1000 * (1 + extra), 9)
  })

  it('is not called when a review is just below its own lowered trigger', () => {
    expect(redemptionOutcome(stepped, [99.99, 94.99, 89.99, 84.99, 79.99], { initial: 100, final: 60 }).calledAtReview).toBeUndefined()
  })

  it('tests the final level on the last review, and pays the call price in place of the payoff', () => {
    const outcome = redemptionOutcome(stepped, never, { initial: 100, final: 75 })
    expect(outcome.calledAtReview).toBe(6)
    expect(outcome.months).toBe(36)
    expect(outcome.payment).toBeCloseTo(1300, 9)
    // The payoff alone would have paid principal here, as the level is above the barrier.
    expect(outcome.maturity.payment).toBe(1000)
  })

  it('pays the payoff when the final level is below the final trigger', () => {
    const outcome = redemptionOutcome(stepped, never, { initial: 100, final: 74 })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.payment).toBe(1000)
    expect(outcome.tests).toHaveLength(6)
  })

  it('pays the payoff on a fall past the barrier', () => {
    expect(redemptionOutcome(stepped, never, { initial: 100, final: 40 }).payment).toBe(400)
  })

  it('does not test the final review when it is not a call', () => {
    const note = callable({ ...stepped, redemption: autocall({ trigger: 1, triggerStep: -0.05, callAmount: 0.1, callAmountBasis: 'per-year' }) })
    const outcome = redemptionOutcome(note, never, { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.tests).toHaveLength(5)
  })

  it('pays the same call amount on every review when the basis is flat', () => {
    const flatNote = callable({ ...stepped, redemption: autocall({ callAmount: 0.1, callAmountBasis: 'flat' }) })
    expect(redemptionOutcome(flatNote, [100, ...never.slice(1)], levels).payment).toBe(1100)
    expect(redemptionOutcome(flatNote, [90, 90, 90, 90, 100], levels).payment).toBe(1100)
  })
})

// A final review that is the only call: upside participation, a trigger above the initial level, and the call amount as what the note
// pays at and above it. Against the final level, that is a shark fin.
describe('a final review that calls, as the payment at the end of the term', () => {
  const fin = callable({
    redemption: autocall({ trigger: 1.2, callAmount: 0.1, callOnFinalReview: true }),
    payoff: { participations: [{ direction: 'upside', rate: 1 }] },
  })

  it('has a final call level at the trigger of the last review', () => {
    expect(finalCallLevel(fin, 100)).toBe(120)
    expect(finalCallLevel(callable({ redemption: autocall({ trigger: 1, triggerStep: -0.05, callOnFinalReview: true }) }), 100)).toBeCloseTo(45, 9)
  })

  it('has none unless the final review is a call', () => {
    expect(finalCallLevel(callable(), 100)).toBeUndefined()
    expect(finalCallLevel(startingProduct, 100)).toBeUndefined()
  })

  it.each([[80, 1000], [100, 1000], [110, 1100], [119.99, 1199.9], [120, 1100], [150, 1100], [200, 1100]])('pays %s at a final level of %s', (final, payment) => {
    expect(paymentAtEnd(fin, { initial: 100, final })).toBeCloseTo(payment, 6)
  })

  it('pays the maturity payment when the final review is not a call', () => {
    const plain = callable({ payoff: { participations: [{ direction: 'upside', rate: 1 }] } })
    for (const final of [60, 100, 130, 180]) expect(paymentAtEnd(plain, { initial: 100, final })).toBe(redemptionOutcome(plain, flat(11), { initial: 100, final }).maturity.payment)
  })

  it('uses the call amount for the whole term when it accrues for each year', () => {
    const perYear = callable({ term: { months: 24 }, schedule: { frequency: 'semi-annual' }, redemption: autocall({ trigger: 1.2, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true }), payoff: { participations: [{ direction: 'upside', rate: 1 }] } })
    expect(paymentAtEnd(perYear, { initial: 100, final: 130 })).toBeCloseTo(1200, 9)
  })
})

// A non-call period: its reviews cannot call, even at or above the trigger. Twelve monthly reviews that can call from
// the sixth, as the public note read for the chapter does, without its coupons.
describe('a non-call period', () => {
  const note = callable({ redemption: autocall({ nonCallReviews: 5 }), payoff: { participations: [{ direction: 'downside', rate: 1 }] } })

  it('does not call a review in the period, even above the trigger', () => {
    const outcome = redemptionOutcome(note, [120, 120, 120, 120, 120, 90, ...flat(5)], levels)
    expect(outcome.tests.slice(0, 5).map(({ callable, called }) => [callable, called])).toEqual(Array(5).fill([false, false]))
    // The sixth review is below the trigger, so the product keeps going.
    expect(outcome.calledAtReview).toBeUndefined()
  })

  it('calls on the first review that can call when it is at the trigger', () => {
    const outcome = redemptionOutcome(note, [90, 90, 90, 90, 90, 100, ...flat(5)], levels)
    expect(outcome.calledAtReview).toBe(6)
    expect(outcome.months).toBe(6)
    expect(outcome.payment).toBe(1080)
    expect(outcome.tests[5].callable).toBe(true)
  })

  it('does not call on a level that would have called on review 5 without the period', () => {
    expect(redemptionOutcome(note, [90, 90, 90, 90, 150, 90, ...flat(5)], levels).calledAtReview).toBeUndefined()
    expect(redemptionOutcome(callable(), [90, 90, 90, 90, 150, 90, ...flat(5)], levels).calledAtReview).toBe(5)
  })

  it('is the same as no period when the period is 0 reviews', () => {
    const early = [100, ...flat(10)]
    expect(redemptionOutcome(callable({ redemption: autocall({ nonCallReviews: 0 }) }), early, levels)).toEqual(redemptionOutcome(callable(), early, levels))
  })

  it('can leave the final review as the only call', () => {
    const only = callable({ redemption: autocall({ nonCallReviews: 11, callOnFinalReview: true }), payoff: { participations: [{ direction: 'downside', rate: 1 }] } })
    const outcome = redemptionOutcome(only, Array(11).fill(150), { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(12)
    expect(outcome.tests.filter(({ callable }) => callable)).toHaveLength(1)
  })

  it('moves the trigger from review 1, so the first review that can call reads the trigger of its own review', () => {
    const stepped = callable({ redemption: autocall({ trigger: 1, triggerStep: -0.05, nonCallReviews: 2 }) })
    const outcome = redemptionOutcome(stepped, [100, 100, 89, 90, ...flat(7)], levels)
    expect(outcome.tests.map(({ triggerLevel }) => triggerLevel).slice(0, 4)).toEqual([100, 95, 90, 85])
    expect(outcome.calledAtReview).toBe(4)
  })
})

describe('a worst-of basket as the underlier of an autocall', () => {
  const worstOf: BasketUnderlier = {
    kind: 'basket',
    components: [{ asset: { kind: 'equity-index', name: 'Index A' } }, { asset: { kind: 'equity-index', name: 'Index B' } }],
    determination: {
      initial: { kind: 'given', levels: [{ asset: 'Index A', level: 200 }, { asset: 'Index B', level: 50 }] },
      final: { kind: 'final-date' },
      basketReturn: { kind: 'worst-of' },
    },
  }

  it('reads the lowest return of the assets, so one asset below the trigger holds the call back', () => {
    // A is +20% and B is −10%: the basket level is that of the worse asset, 90.
    expect(basketLevelFrom(worstOf, [240, 45])).toBeCloseTo(90, 9)
    // Both at or above their initial levels: 100.
    expect(basketLevelFrom(worstOf, [200, 50])).toBeCloseTo(100, 9)
  })

  it('is called on the first review where every asset is at or above the trigger', () => {
    const note = callable({ underlier: worstOf })
    const reviews = [basketLevelFrom(worstOf, [240, 45]), basketLevelFrom(worstOf, [210, 55]), ...flat(9)]
    const outcome = redemptionOutcome(note, reviews, { initial: 100, final: 100 })
    expect(outcome.calledAtReview).toBe(2)
  })

  it('rejects a level count that does not match the assets', () => {
    expect(() => basketLevelFrom(worstOf, [240])).toThrow()
  })
})

// The worked example of the book chapter on reviews and early redemption.
describe('the non-call period example in the book', () => {
  const note = callable({ redemption: autocall({ nonCallReviews: 5 }), payoff: { participations: [{ direction: 'downside', rate: 1 }] } })

  it.each<[string, number[], number, number | undefined, number, number]>([
    ['120 on reviews 1 to 5, below 100 after, ends at 110', [120, 120, 120, 120, 120, ...flat(6, 99)], 110, undefined, 12, 1000],
    ['120 on reviews 1 to 5, 100 on review 6', [120, 120, 120, 120, 120, 100, ...flat(5, 99)], 110, 6, 6, 1080],
  ])('%s', (_, reviews, final, calledAt, months, payment) => {
    const outcome = redemptionOutcome(note, reviews.slice(0, 11), { initial: 100, final })
    expect(outcome.calledAtReview).toBe(calledAt)
    expect(outcome.months).toBe(months)
    expect(outcome.payment).toBeCloseTo(payment, 9)
  })
})

describe('the second book example', () => {
  const note = callable({
    term: { months: 36 },
    schedule: { frequency: 'semi-annual' },
    redemption: autocall({ trigger: 1, triggerStep: -0.05, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true }),
    payoff: { participations: [{ direction: 'downside', barrier: { level: 0.5, observation: 'final' }, rate: 1 }] },
  })

  it.each<[string, number[], number, number | undefined, number, number]>([
    ['called on review 1', [100, 90, 85, 80, 75], 100, 1, 6, 1050],
    ['called on review 3', [95, 89, 90, 80, 75], 100, 3, 18, 1150],
    ['called on review 6', [95, 90, 85, 79, 75], 75, 6, 36, 1300],
    ['not called, final level 70', [95, 90, 85, 79, 75], 70, undefined, 36, 1000],
    ['not called, final level 40', [95, 90, 85, 79, 75], 40, undefined, 36, 400],
  ])('%s', (_, reviews, final, calledAt, months, payment) => {
    const outcome = redemptionOutcome(note, reviews, { initial: 100, final })
    expect(outcome.calledAtReview).toBe(calledAt)
    expect(outcome.months).toBe(months)
    expect(outcome.payment).toBeCloseTo(payment, 9)
  })
})

describe('the book example', () => {
  const note = callable({ payoff: { participations: [{ direction: 'downside', rate: 1 }] } })

  it('annualises a call over the months it lasted', () => {
    expect(annualisedReturn(1080, 1000, 7)).toBeCloseTo(0.141, 3)
    expect(annualisedReturn(1080, 1000, 1)).toBeCloseTo(1.518, 3)
  })
  const below = flat(11, 99)

  it.each<[string, number[], number, number | undefined, number, number]>([
    ['called on review 1', [100, ...flat(10)], 100, 1, 1, 1080],
    ['called on review 7', [99, 99, 99, 99, 99, 99, 102, ...flat(4)], 100, 7, 7, 1080],
    ['never called, ends at 110', below, 110, undefined, 12, 1000],
    ['never called, ends at 70', below, 70, undefined, 12, 700],
  ])('%s', (_, reviews, final, calledAt, months, payment) => {
    const outcome = redemptionOutcome(note, reviews, { initial: 100, final })
    expect(outcome.calledAtReview).toBe(calledAt)
    expect(outcome.months).toBe(months)
    expect(outcome.payment).toBeCloseTo(payment, 9)
  })
})
