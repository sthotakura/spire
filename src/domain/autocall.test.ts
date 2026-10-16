import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from './autocall'
import { basketLevelFrom, productIssues, reviewCount, validateProduct, type Autocall, type BasketUnderlier, type Product, type Schedule } from './note'
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

  it.each([[0, true], [0.05, true], [-0.01, false], [Number.NaN, false]])('a trigger step-down of %s is accepted: %s', (triggerStepDown, ok) => {
    expect(fieldsOf(callable({ redemption: autocall({ triggerStepDown }) }))).toEqual(ok ? [] : ['triggerStepDown'])
  })

  it('needs the trigger to stay above zero on the last review that is tested', () => {
    // Twelve reviews: the last one tested is 11 unless the final review calls too.
    expect(validateProduct(callable({ redemption: autocall({ triggerStepDown: 0.09 }) }))).toEqual([])
    expect(fieldsOf(callable({ redemption: autocall({ triggerStepDown: 0.1 }) }))).toEqual(['triggerStepDown'])
    expect(validateProduct(callable({ redemption: autocall({ triggerStepDown: 0.1, callOnFinalReview: true }) }))).not.toEqual([])
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
    redemption: autocall({ trigger: 1, triggerStepDown: 0.05, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true }),
    payoff: { participations: [{ direction: 'downside', barrier: { level: 0.5, observation: 'final' }, rate: 1 }] },
  })
  const never = [90, 85, 80, 70, 60]

  it('is valid', () => {
    expect(validateProduct(stepped)).toEqual([])
  })

  it('lowers the trigger level by the step-down on each review', () => {
    const outcome = redemptionOutcome(stepped, never, { initial: 100, final: 60 })
    expect(outcome.tests.map(({ triggerLevel }) => triggerLevel)).toEqual([100, 95, 90, 85, 80, 75])
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
    const note = callable({ ...stepped, redemption: autocall({ trigger: 1, triggerStepDown: 0.05, callAmount: 0.1, callAmountBasis: 'per-year' }) })
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
describe('the book example', () => {
  const note = callable({ payoff: { participations: [{ direction: 'downside', rate: 1 }] } })
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
