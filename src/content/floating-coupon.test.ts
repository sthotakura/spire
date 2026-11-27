import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import { type FloatingRate, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { couponCell, couponFormula, explainCoupons, redemptionSteps, reviewTableRows } from './autocall'
import { marketingNames } from './names'
import { summarize } from './summary'

// The worked example in docs/floating-coupon.md: two years, a quarterly floating coupon at the reference rate + 2.75% with a 0% floor,
// an issuer call on any quarterly review, and a 60% downside barrier read on the final date.
const rate = (terms: Partial<FloatingRate> = {}): FloatingRate => ({ reference: 'Synthetic overnight rate', spread: 0.0275, floor: 0, ...terms })
const note = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 24 },
  redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 }] },
  coupon: { schedule: { frequency: 'quarterly' }, rate: rate() },
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  ...overrides,
})
const rates = [0.04, 0.03, 0.015, -0.01, -0.0325, 0, 0.02]
const outcomeOf = (product: Product, issuerCallsOnReview?: number) => redemptionOutcome(product, [], { initial: 100, final: 75, lastReferenceRate: 0.03 }, issuerCallsOnReview, rates)
const sentence = (product: Product) => summarize(product).map(({ text }) => text).join('')

describe('the words for a floating coupon', () => {
  it('states its reference rate, spread and bounds in the summary', () => {
    expect(sentence(note())).toContain('It pays a floating coupon at Synthetic overnight rate plus 2.75% a year, at least 0%, on each quarterly review, whatever the underlier does.')
    expect(sentence(note({ coupon: { schedule: { frequency: 'quarterly' }, rate: rate({ spread: -0.005, floor: 0.001, cap: 0.07 }) } }))).toContain('a floating coupon at Synthetic overnight rate minus 0.5% a year, at least 0.1% and at most 7%,')
  })

  it('gives the rate as the reference rate plus the spread, within its bounds, in the payment rule', () => {
    const text = (product: Product) => couponFormula(product)[0].segments.map((segment) => segment.text).join('')
    expect(text(note())).toContain('Rate = Reference rate on the review + Spread, at least 0%')
    expect(text(note({ coupon: { schedule: { frequency: 'quarterly' }, rate: rate({ floor: 0.01, cap: 0.07 }) } }))).toContain('at least Floor and at most Cap')
  })

  it('works out each review at its own rate, and says when the floor or the cap set it', () => {
    const outcome = outcomeOf(note())
    expect(couponCell(note(), outcome.coupons[0])).toBe('1,000 × 6.75% × 3/12 = 16.88')
    expect(couponCell(note(), outcome.coupons[4])).toBe('1,000 × 0% × 3/12 = 0')
    const how = redemptionSteps(note(), outcome).map((step) => step.how)
    expect(how).toContain('Floating at 4% + 2.75% = 6.75%, paid whatever the level: 1,000 × 6.75% × 3/12 = 16.88')
    expect(how).toContain('Floating at −3.25% + 2.75% = −0.5%, raised to the floor, 0%, paid whatever the level: 1,000 × 0% × 3/12 = 0')
    const capped = note({ coupon: { schedule: { frequency: 'quarterly' }, rate: rate({ cap: 0.06 }) } })
    expect(redemptionSteps(capped, outcomeOf(capped)).map((step) => step.how)).toContain('Floating at 4% + 2.75% = 6.75%, lowered to the cap, 6%, paid whatever the level: 1,000 × 6% × 3/12 = 15')
  })

  // Three reviews capped at 6% pay the same coupon, but from reference rates of 4%, 5% and 6%: grouped as one step, each would read as
  // the first review's 4% + 2.75%.
  it('groups reviews only while the reference rate stays the same, so a grouped step states every review\'s working', () => {
    const capped = note({ term: { months: 12 }, coupon: { schedule: { frequency: 'quarterly' }, rate: rate({ cap: 0.06 }) } })
    const steps = (referenceRates: number[], last: number) => redemptionSteps(capped, redemptionOutcome(capped, [], { initial: 100, final: 75, lastReferenceRate: last }, undefined, referenceRates))
    const varying = steps([0.04, 0.05, 0.06], 0.06)
    expect(varying.filter(({ title }) => title.startsWith('Coupon')).map(({ title }) => title)).toEqual(['Coupon on review 1 of 4, month 3', 'Coupon on review 2 of 4, month 6', 'Coupon on review 3 of 4, month 9', 'Coupon on review 4 of 4, month 12'])
    expect(varying[1].how).toContain('5% + 2.75% = 7.75%, lowered to the cap, 6%')
    const same = steps([0.04, 0.04, 0.04], 0.06)
    expect(same[0]).toMatchObject({ title: 'Coupons on reviews 1–3 of 4, months 3–9', how: 'Floating at 4% + 2.75% = 6.75%, lowered to the cap, 6%, paid whatever the level: 3 × 1,000 × 6% × 3/12 = 45' })
  })

  it('says how the coupons went, and how often the floor held one', () => {
    expect(explainCoupons(note(), outcomeOf(note()))).toMatch(/^It paid its floating coupon on each of the 8 coupon reviews it lasted for, whatever the underlier did, each at its own reference rate; the floor held one at 0%: 79\.38 in coupons\./)
  })

  it('lists every coupon review in the review table, even where no level is read, the last at the end of the term', () => {
    const rows = reviewTableRows(note({ redemption: { kind: 'bullet' } }))
    expect(rows.map(({ date }) => date.month)).toEqual([3, 6, 9, 12, 15, 18, 21, 24])
    expect(rows.at(-1)).toMatchObject({ final: true })
    expect(rows.slice(0, -1).every((row) => row.final === undefined && row.index === undefined)).toBe(true)
    // A fixed coupon on a product that reads no level still has no table.
    expect(reviewTableRows(note({ redemption: { kind: 'bullet' }, coupon: { schedule: { frequency: 'quarterly' }, rate: 0.1 } }))).toEqual([])
  })

  it('names a floating coupon in a name\'s reason, and gives it no reverse convertible name', () => {
    const delivering = note({ redemption: { kind: 'bullet' }, settlement: 'delivery', underlier: { kind: 'single', components: [{ asset: { kind: 'equity', name: 'Synthetic Co' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } } })
    expect(marketingNames(delivering).map(({ name }) => name)).not.toContain('Barrier reverse convertible')
    const fixed = { ...delivering, coupon: { schedule: { frequency: 'quarterly' as const }, rate: 0.1 } }
    expect(marketingNames(fixed).map(({ name }) => name)).toContain('Barrier reverse convertible')
  })
})
