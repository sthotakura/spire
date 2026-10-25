import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import type { Coupon, Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { payoffLabels } from './chart-labels'
import { couponCell, couponClosingSteps, couponFormula, explainCoupons, pathScenarios, redemptionSteps } from './autocall'
import { marketingNames, productCategory } from './names'
import { scenarioRows } from './scenarios'
import { summarize } from './summary'

// Synthetic: the worked example in docs/coupon.md. An 18-month note of 1,000, a fixed coupon of 12% a year paid quarterly (30 a review),
// a quarterly autocall that cannot call on review 1 with a trigger of 100% stepping −5%, and a 60% downside barrier.
const product = (coupon: Partial<Coupon> = {}): Product => ({
  ...startingProduct,
  term: { months: 18 },
  redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, triggerStep: -0.05, nonCallReviews: 1, callAmount: 0 },
  coupon: { schedule: { frequency: 'quarterly' }, rate: 0.12, ...coupon },
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
})
const bullet: Product = { ...product({ schedule: { frequency: 'monthly' }, rate: 0.06 }), term: { months: 12 }, redemption: 'bullet' }
const called = [80, 92, 91, 90, 90]
const neverCalled = [80, 90, 85, 80, 75]
const text = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join('')

describe('a fixed coupon in the summary', () => {
  it('names it fixed and says it is paid whatever the underlier does, with no barrier or memory', () => {
    const segments = summarize(product())
    expect(text(segments)).toMatch(/\. It pays a fixed coupon of 12% a year \(3% a review\) on each quarterly review, whatever the underlier does\.$/)
    expect(segments.some((segment) => segment.concept === 'coupon-barrier' || segment.concept === 'memory')).toBe(false)
  })
})

describe('a fixed coupon in the rule', () => {
  it('pays on each coupon review with no test', () => {
    expect(text(couponFormula(product())[0].segments)).toBe('On each coupon review until it ends, pay Principal × Rate × Months between coupon reviews ÷ 12, whatever the level. A coupon review on the date the product ends pays with it')
  })
})

describe('a fixed coupon in the calculation', () => {
  it('lists a coupon step on each review up to the call, then the call with its coupon and the total paid', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    const couponSteps = steps.filter((step) => step.title.startsWith('Coupon on'))
    expect(couponSteps.map(({ title, how, value }) => [title, how, value])).toEqual([1, 2, 3].map((review) => [`Coupon on review ${review} of 6, month ${review * 3}`, 'Fixed, paid whatever the level: 1,000 × 12% × 3/12 = 30', '30']))
    expect(steps.find((step) => step.title === 'Redemption')).toMatchObject({ how: 'Called on review 3, after 9 months: principal × (1 + 0%) + coupon 30', value: '1,030' })
    expect(steps.find((step) => step.title === 'Total paid')).toMatchObject({ value: '1,090' })
  })

  it('closes a product that ran to the end with the payoff, the last coupon, the total and the total return', () => {
    const outcome = redemptionOutcome(product(), neverCalled, { initial: 100, final: 50 })
    expect(couponClosingSteps(product(), outcome)).toMatchObject([
      { title: 'Paid at maturity', how: '500 from the payoff + coupon 30 on the last review', value: '530' },
      { title: 'Total paid', value: '680' },
      { title: 'Total return', value: '−32%' },
    ])
  })

  it('lists every coupon of a bullet note, which reads no level', () => {
    const steps = redemptionSteps(bullet, redemptionOutcome(bullet, [], { initial: 100, final: 90 }))
    expect(steps).toHaveLength(12)
    expect(steps.every((step) => step.value === '5')).toBe(true)
  })

  it('shows the working in the review table', () => {
    const outcome = redemptionOutcome(product(), called, { initial: 100, final: 90 })
    expect(couponCell(product(), outcome.coupons[0])).toBe('1,000 × 12% × 3/12 = 30')
  })
})

describe('a fixed coupon in the outcome sentence', () => {
  it('says every review it lasted for paid, whatever the underlier did', () => {
    expect(explainCoupons(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))).toBe('It paid its fixed coupon on each of the 3 coupon reviews it lasted for, whatever the underlier did: 90 in coupons. In all it paid 1,090, a total return of +9% over 9 months.')
  })
})

describe('the paths with a fixed coupon', () => {
  it('has the autocall paths only, since a fixed coupon reads no level', () => {
    const names = pathScenarios(product(), 100).map(({ name }) => name)
    expect(names.some((name) => /coupon/i.test(name))).toBe(false)
    expect(names.length).toBeGreaterThan(0)
  })

  it('has none for a bullet note', () => {
    expect(pathScenarios(bullet, 100)).toEqual([])
  })
})

describe('the scenario table with a fixed coupon', () => {
  it('adds no coupon barrier row and adds the last coupon at every level', () => {
    const rows = scenarioRows(product(), 100)
    expect(rows.some((row) => row.atCouponBarrier)).toBe(false)
    expect(rows.every((row) => Math.abs(row.lastCoupon - 30) < 1e-9)).toBe(true)
  })
})

describe('a fixed coupon in the chart labels', () => {
  it('adds the last coupon to the pieces that repay principal, at every level', () => {
    expect(payoffLabels(product()).payoff).toBe('Repays principal 1,000, plus the last coupon 30')
  })
})

describe('the names of a note with a fixed coupon', () => {
  it('gives no coupon name, no Express certificate, and keeps the autocall and Yield Enhancement', () => {
    const names = marketingNames(product()).map(({ name }) => name)
    expect(names).toContain('Autocallable note')
    expect(names).not.toContain('Contingent coupon note')
    expect(names).not.toContain('Express certificate')
    expect(productCategory(product())).toBe('Yield Enhancement')
  })

  it('does not call a protected note with a fixed coupon a Capital Protection Certificate with Coupon, whose coupon depends on the underlier', () => {
    const protectedNote: Product = { ...bullet, payoff: { participations: [], principalProtection: 1 } }
    expect(marketingNames(protectedNote).find(({ name }) => name === 'Principal-protected note')?.reason).not.toContain('Certificate with Coupon')
  })
})
