import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from './autocall'
import { holderPutOf, productIssues, reviewDates, validateProduct, type EarlyMechanism, type Product, type Underlier } from './note'

const single: Underlier = { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } }
const put = (terms: Partial<Extract<EarlyMechanism, { kind: 'holder-put' }>> = {}): EarlyMechanism => ({ kind: 'holder-put', schedule: { frequency: 'semi-annual' }, firstReviewMonth: 12, ...terms })
// The synthetic Tracker of docs/holder-put.md: 24 months, initial level 100, one for one both ways, put reviews every six months from month 12.
const tracker = (mechanisms: EarlyMechanism[] = [put()], terms: Partial<Product> = {}): Product => ({
  wrapper: 'note',
  principalAmount: 1000,
  term: { months: 24 },
  redemption: { kind: 'early-redemption', mechanisms },
  underlier: single,
  payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] },
  ...terms,
})
const putIssues = (note: Product) => productIssues(note).filter(({ mechanism }) => mechanism === 'holder-put').map(({ message }) => message)

describe('the holder put', () => {
  it('is found among the mechanisms', () => {
    expect(holderPutOf(tracker().redemption)).toEqual(put())
    expect(validateProduct(tracker())).toEqual([])
  })

  it('reads no level of its own on a review: its reviews are not among the dates a level is read on', () => {
    expect(reviewDates(tracker())).toEqual([])
  })

  // The worked examples of docs/holder-put.md.
  it.each([
    ['puts in month 12 at 120', tracker(), { review: 1, level: 120 }, 110, 12, 1200],
    ['puts in month 18 at 80', tracker(), { review: 2, level: 80 }, 110, 18, 800],
    ['does not put, and the level ends at 110', tracker(), undefined, 110, 24, 1100],
    ['puts in month 12 at 120 with an adjustment factor of 99%', { ...tracker(), redemption: { kind: 'early-redemption' as const, mechanisms: [put()], adjustmentFactor: 0.99 } }, { review: 1, level: 120 }, 110, 12, 1188],
  ])('pays the maturity formula at the put date\'s level when the holder %s', (_, note, holderPut, final, months, payment) => {
    const outcome = redemptionOutcome(note, [], { initial: 100, final }, { holderPut })
    expect(outcome.months).toBe(months)
    expect(outcome.payment).toBeCloseTo(payment, 9)
    expect(outcome.endedBy).toBe(holderPut ? 'holder-put' : undefined)
  })

  it('states the put\'s level and its breakdown, and what the payoff would have paid at maturity', () => {
    const outcome = redemptionOutcome(tracker(), [], { initial: 100, final: 90 }, { holderPut: { review: 2, level: 130 } })
    expect(outcome).toMatchObject({ calledAtReview: 2, reviews: 3, put: { level: 130 } })
    expect(outcome.put!.breakdown.payment).toBeCloseTo(1300, 9)
    expect(outcome.maturity!.payment).toBeCloseTo(900, 9)
    expect(outcome.payments).toEqual([{ month: 18, coupon: 0, redemption: outcome.payment, amount: outcome.payment }])
  })

  it('lets the holder put whatever the underlier does: a level of zero pays nothing', () => {
    expect(redemptionOutcome(tracker(), [], { initial: 100, final: 110 }, { holderPut: { review: 1, level: 0 } }).payment).toBe(0)
  })

  it('pays a coupon review on the put date with the put, and the earlier ones on their own', () => {
    const note = tracker([put()], { coupon: { schedule: { frequency: 'semi-annual' }, rate: 0.04 } })
    const outcome = redemptionOutcome(note, [], { initial: 100, final: 110 }, { holderPut: { review: 1, level: 120 } })
    expect(outcome.payments.map(({ month, amount }) => [month, amount])).toEqual([[6, 20], [12, 1220]])
  })

  it('rejects a choice outside its reviews, a missing level, and a put where there is none', () => {
    const levels = { initial: 100, final: 110 }
    expect(() => redemptionOutcome(tracker(), [], levels, { holderPut: { review: 3, level: 100 } })).toThrow('The holder can put on reviews 1 to 2.')
    expect(() => redemptionOutcome(tracker(), [], levels, { holderPut: { review: 1 } })).toThrow('The level on the put review must be zero or greater.')
    expect(() => redemptionOutcome(tracker(), [], levels, { holderPut: { review: 1, level: -1 } })).toThrow('zero or greater')
    const called = tracker([{ kind: 'issuer-call', schedule: { frequency: 'semi-annual' }, callAmount: 0 }])
    expect(() => redemptionOutcome(called, [], levels, { holderPut: { review: 1, level: 100 } })).toThrow('Only a holder put is put by the holder.')
  })
})

describe('the holder put beside the other mechanisms', () => {
  const issuerCall: EarlyMechanism = { kind: 'issuer-call', schedule: { frequency: 'semi-annual' }, firstReviewMonth: 12, callAmount: 0 }
  const autocall = (firstReviewMonth?: number): EarlyMechanism => ({ kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0.08, ...(firstReviewMonth ? { firstReviewMonth } : {}) })

  it('is stopped by an issuer\'s call that comes first', () => {
    const outcome = redemptionOutcome(tracker([issuerCall, put()]), [], { initial: 100, final: 110 }, { issuerCallsOnReview: 1, holderPut: { review: 2, level: 80 } })
    expect(outcome).toMatchObject({ endedBy: 'issuer-call', months: 12, payment: 1000, holderPutNotReached: 2 })
  })

  it('stops a later issuer\'s call', () => {
    const outcome = redemptionOutcome(tracker([issuerCall, put()]), [], { initial: 100, final: 110 }, { issuerCallsOnReview: 2, holderPut: { review: 1, level: 120 } })
    expect(outcome).toMatchObject({ endedBy: 'holder-put', months: 12, issuerCallNotReached: 2 })
    expect(outcome.payment).toBeCloseTo(1200, 9)
  })

  it('comes after the issuer\'s call on the same date', () => {
    const outcome = redemptionOutcome(tracker([issuerCall, put()]), [], { initial: 100, final: 110 }, { issuerCallsOnReview: 1, holderPut: { review: 1, level: 120 } })
    expect(outcome).toMatchObject({ endedBy: 'issuer-call', months: 12, payment: 1000, holderPutNotReached: 1 })
  })

  it('is stopped by an autocall that comes first', () => {
    const note = tracker([autocall(), put()])
    // Month 12 is the autocall's fourth review, so the put reads its level from the review levels.
    const outcome = redemptionOutcome(note, [105, 90, 90, 120, 90, 90, 90], { initial: 100, final: 110 }, { holderPut: { review: 1 } })
    expect(outcome).toMatchObject({ endedBy: 'autocall', months: 3, holderPutNotReached: 1 })
    expect(outcome.payment).toBeCloseTo(1080, 9)
  })

  it('comes before the autocall on the same date, and reads that review\'s level', () => {
    const note = tracker([autocall(12), put()])
    expect(reviewDates(note).map(({ month }) => month)).toEqual([12, 15, 18, 21, 24])
    const outcome = redemptionOutcome(note, [120, 90, 90, 90], { initial: 100, final: 110 }, { holderPut: { review: 1 } })
    expect(outcome).toMatchObject({ endedBy: 'holder-put', months: 12, tests: [], put: { level: 120 } })
    expect(outcome.payment).toBeCloseTo(1200, 9)
  })

  it('does not take a level of its own on a date the review levels already state', () => {
    expect(() => redemptionOutcome(tracker([autocall(12), put()]), [120, 90, 90, 90], { initial: 100, final: 110 }, { holderPut: { review: 1, level: 120 } })).toThrow('reads that review’s level')
  })

  it('reads the review level of a contingent coupon review on the put date', () => {
    const note = tracker([put()], { coupon: { schedule: { frequency: 'semi-annual' }, rate: 0.04, barrier: 0.7 } })
    const outcome = redemptionOutcome(note, [95, 125, 90], { initial: 100, final: 110 }, { holderPut: { review: 1 } })
    expect(outcome.put!.level).toBe(125)
    expect(outcome.payment).toBeCloseTo(1250 + 20, 9)
  })
})

describe('what a holder put combines with', () => {
  it.each([
    ['a cap', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1, cap: 0.3 }] } })],
    ['a buffer', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1, buffer: 0.1 }, { direction: 'upside', rate: 1 }] } })],
    ['a downside barrier', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'final' } }, { direction: 'upside', rate: 1 }] } })],
    ['an upside rate other than 100%', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }] } })],
    ['a downside rate other than 100%', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 0.5 }, { direction: 'upside', rate: 1 }] } })],
    ['no downside participation', tracker([put()], { payoff: { participations: [{ direction: 'upside', rate: 1 }] } })],
    ['principal protection', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], principalProtection: 0.9 } })],
    ['a digital return', tracker([put()], { payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], digitalReturn: { amount: 0.1, barrier: { level: 1, observation: 'final' } } } })],
  ])('needs a tracker, so it rejects %s', (_, note) => {
    expect(putIssues(note)).toEqual([expect.stringContaining('A holder put needs a tracker')])
  })

  it('rejects a worst-of basket, an averaged final level and delivery', () => {
    const names = ['Index A', 'Index B']
    const worstOf: Underlier = { kind: 'basket', components: names.map((name) => ({ asset: { kind: 'equity-index', name } })), determination: { initial: { kind: 'given', levels: names.map((asset) => ({ asset, level: 100 })) }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } } }
    expect(putIssues(tracker([put()], { underlier: worstOf }))).toEqual(['A holder put cannot be combined with a worst-of or best-of basket, whose return bends.'])
    const averaged: Underlier = { ...single, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 5 } } }
    expect(putIssues(tracker([put()], { underlier: averaged }))).toEqual(['A holder put cannot be combined with an averaged final level, which reads dates after the put.'])
    const stock: Underlier = { ...single, components: [{ asset: { kind: 'equity', name: 'Synthetic Stock' } }] }
    expect(putIssues(tracker([put()], { underlier: stock, settlement: 'delivery' }))).toContain('A holder put pays in cash: delivery is defined at the final date.')
  })

  it('allows a weighted basket, a lookback initial level, an adjustment factor, a coupon, an autocall and an issuer call', () => {
    const names = ['Index A', 'Index B']
    const weighted: Underlier = { kind: 'basket', components: names.map((name) => ({ asset: { kind: 'equity-index', name }, weight: 0.5 })), determination: { initial: { kind: 'given', levels: names.map((asset) => ({ asset, level: 100 })) }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } } }
    expect(validateProduct(tracker([put()], { underlier: weighted }))).toEqual([])
    expect(validateProduct(tracker([put()], { underlier: { ...single, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } }))).toEqual([])
    expect(validateProduct({ ...tracker(), redemption: { kind: 'early-redemption', mechanisms: [put()], adjustmentFactor: 0.98 } })).toEqual([])
    expect(validateProduct(tracker([put()], { coupon: { schedule: { frequency: 'quarterly' }, rate: 0.04 } }))).toEqual([])
    expect(validateProduct(tracker([{ kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0.08 }, { kind: 'issuer-call', schedule: { frequency: 'annual' }, callAmount: 0 }, put()]))).toEqual([])
  })

  it('cannot be combined with amortization', () => {
    const note = tracker([{ kind: 'amortization', schedule: { frequency: 'semi-annual' }, method: 'level-payment' }, put()], { coupon: { schedule: { frequency: 'semi-annual' }, rate: 0.04 } })
    expect(validateProduct(note)).toContain('Amortization cannot be combined with an autocall, an issuer call or a holder put in this reference.')
  })

  it('needs at least two reviews and a first review that leaves one before the last', () => {
    expect(putIssues(tracker([put({ schedule: { frequency: 'annual' }, firstReviewMonth: 24 })]))).toEqual(['The first review must leave a review that can put: from month 12 to month 12.'])
    expect(putIssues(tracker([put({ firstReviewMonth: 9 })]))).toEqual(['The first review must be a whole number of review periods in: a multiple of 6 months.'])
    expect(putIssues(tracker([put({ schedule: { frequency: 'annual' }, firstReviewMonth: undefined })], { term: { months: 12 } }))).toEqual(['A holder put needs at least two reviews, so the product can be put before the last.'])
  })
})
