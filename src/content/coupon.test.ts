import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import type { Coupon, Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { payoffLabels } from './chart-labels'
import { couponClosingSteps, explainCoupons, pathScenarios, redemptionFormula, redemptionSteps } from './autocall'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Synthetic: the worked example in docs/contingent-coupon.md and the book's coupons chapter.
const product = (coupon: Partial<Coupon> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  schedule: { frequency: 'monthly' },
  redemption: { kind: 'autocall', trigger: 1, nonCallReviews: 3, callAmount: 0 },
  coupon: { rate: 0.12, barrier: 0.7, memory: true, ...coupon },
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
})
const called = [95, 65, 102, 68, 104, 90, 90, 90, 90, 90, 90]
const neverCalled = [95, 65, 60, 68, 90, 50, 80, 90, 90, 90, 65]
const text = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join('')

describe('the coupon in the summary', () => {
  it('states the rate a year and a review, the barrier and memory', () => {
    expect(text(summarize(product()))).toContain('pays a coupon of 12% a year (1% a review) on each review at or above 70% of its initial level, with memory, and otherwise redeems at maturity')
    expect(text(summarize(product({ memory: false })))).toContain('without memory')
  })

  it('tags each phrase with its concept', () => {
    const segments = summarize(product())
    expect(segments.find((segment) => segment.text.startsWith('a coupon of'))?.concept).toBe('coupon')
    expect(segments.find((segment) => segment.text.startsWith('at or above 70%'))?.concept).toBe('coupon-barrier')
    expect(segments.find((segment) => segment.text === 'with memory')?.concept).toBe('memory')
  })
})

describe('the coupon in the rule', () => {
  it('adds a coupon line before the call, and the review\'s coupon to the call', () => {
    const [coupon, call] = redemptionFormula(product())
    expect(coupon.lead).toBe('Coupon')
    expect(text(coupon.segments)).toBe('On every review until it ends, if Level ≥ Coupon barrier × Initial level, pay Principal × Rate × Months between reviews ÷ 12 for this review and for each review missed since the last coupon paid')
    expect(text(call.segments)).toContain('Principal × (1 + Call amount) + that review’s coupon and end')
  })

  it('says a missed coupon is not paid later without memory', () => {
    expect(text(redemptionFormula(product({ memory: false }))[0].segments)).toContain('a missed coupon is not paid later')
  })
})

describe('the coupon in the calculation', () => {
  it('lists a coupon step for each review up to the call, then the call, its coupon and the total paid', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    expect(steps.filter((step) => step.concept === 'coupon' && step.title.startsWith('Coupon on')).map((step) => step.value)).toEqual(['10', '0', '20', '0', '20'])
    expect(steps.find((step) => step.title === 'Coupon on review 3 of 12')?.how).toContain('2 × 10, this review’s coupon and 1 coupon remembered')
    expect(steps.find((step) => step.title === 'Redemption')).toMatchObject({ how: 'Called on review 5, after 5 months: principal × (1 + 0%) + coupon 20', value: '1,020' })
    expect(steps.find((step) => step.title === 'Total paid')).toMatchObject({ value: '1,050' })
  })

  it('has no annualised return from one payment when the product pays coupons', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    expect(steps.some((step) => step.title === 'Annualised return')).toBe(false)
  })

  it('closes a product that ran to the end with the payoff, the last coupon and the total', () => {
    const outcome = redemptionOutcome(product(), neverCalled, { initial: 100, final: 75 })
    expect(couponClosingSteps(product(), outcome)).toMatchObject([
      { title: 'Paid at maturity', how: '1,000 from the payoff + coupon 20 on the last review', value: '1,020', result: true },
      { title: 'Total paid', value: '1,120' },
    ])
  })

  it('has no closing steps for a called product, or without a coupon', () => {
    expect(couponClosingSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))).toEqual([])
    const plain = { ...product(), coupon: undefined }
    expect(couponClosingSteps(plain, redemptionOutcome(plain, neverCalled, { initial: 100, final: 75 }))).toEqual([])
  })
})

describe('the coupon in the outcome sentence', () => {
  it('counts the reviews that paid and what they paid', () => {
    expect(explainCoupons(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))).toBe('3 of the 5 reviews it lasted for were at or above the 70 coupon barrier, paying 50 in coupons. In all it paid 1,050.')
  })

  it('says when remembered coupons were never paid', () => {
    expect(explainCoupons(product(), redemptionOutcome(product(), neverCalled, { initial: 100, final: 55 }))).toContain('2 coupons remembered from reviews below the barrier were never paid')
  })

  it('says how many missed coupons were not paid without memory', () => {
    const plain = product({ memory: false })
    expect(explainCoupons(plain, redemptionOutcome(plain, called, { initial: 100, final: 90 }))).toContain('2 coupons missed below the barrier were not paid, since it has no memory.')
  })
})

describe('the coupon paths', () => {
  it('adds a path that shows memory and one below the barrier throughout', () => {
    const paths = pathScenarios(product(), 100)
    const memory = paths.find((path) => path.name === 'Misses coupons, then pays them by memory')!
    const outcome = redemptionOutcome(product(), memory.reviewLevels, { initial: 100, final: memory.finalLevel! })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.coupons.find((test) => test.coupons > 1)).toBeDefined()
    const below = paths.find((path) => path.name === 'Below the coupon barrier throughout')!
    expect(redemptionOutcome(product(), below.reviewLevels, { initial: 100, final: below.finalLevel! }).coupons.every((test) => !test.met)).toBe(true)
  })

  it('leaves out the memory path when a level at the barrier would call the product', () => {
    expect(pathScenarios(product({ barrier: 1 }), 100).map((path) => path.name)).not.toContain('Misses coupons, then pays them by memory')
  })
})

describe('the coupon in the structure and the selection', () => {
  it('tags the coupon\'s lines by term', () => {
    const lines = structureLines(product())
    expect(lines.find((line) => line.text.includes('"rate": 0.12'))?.concept).toBe('coupon')
    expect(lines.find((line) => line.text.includes('"barrier": 0.7'))?.concept).toBe('coupon-barrier')
    expect(lines.find((line) => line.text.includes('"memory"'))?.concept).toBe('memory')
  })

  it('selects the barrier and memory with the coupon', () => {
    expect(isHighlighted('coupon', 'coupon-barrier')).toBe(true)
    expect(isHighlighted('coupon', 'memory')).toBe(true)
    expect(isHighlighted('redemption', 'coupon')).toBe(false)
  })
})

describe('the coupon in the chart labels', () => {
  it('adds the last coupon to the pieces that repay principal', () => {
    const labels = payoffLabels(product())
    expect(labels.barrier).toBe('A fall of up to 40% repays principal, plus the last coupon 10 at or above 70%')
    expect(labels.payoff).toBe('Repays principal 1,000, plus the last coupon 10 at or above 70%')
    expect(labels.downside).toBe('A fall past 40% loses 1% per 1% of the whole fall')
  })
})
