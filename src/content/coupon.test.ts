import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import type { Coupon, Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { payoffLabels } from './chart-labels'
import { couponCell, couponClosingSteps, couponFormula, explainCoupons, pathScenarios, redemptionFormula, redemptionSteps } from './autocall'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Synthetic: the worked example in docs/contingent-coupon.md and the book's coupons chapter.
const product = (coupon: Partial<Coupon> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 3, callAmount: 0 },
  coupon: { schedule: { frequency: 'monthly' }, rate: 0.12, barrier: 0.7, memory: true, ...coupon },
  payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
})
const called = [95, 65, 102, 68, 104, 90, 90, 90, 90, 90, 90]
const neverCalled = [95, 65, 60, 68, 90, 50, 80, 90, 90, 90, 65]
const text = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join('')

describe('the coupon in the summary', () => {
  it('states the rate a year and a review, its reviews, the barrier and memory, in a sentence of its own', () => {
    expect(text(summarize(product()))).toMatch(/\. It pays a coupon of 12% a year \(1% a review\) on each monthly review at or above 70% of the initial level, with memory\.$/)
    expect(text(summarize(product({ memory: false })))).toContain('without memory')
  })

  it('states the coupon of a bullet note, on its own frequency', () => {
    const bullet: Product = { ...product({ schedule: { frequency: 'quarterly' } }), redemption: 'bullet' }
    expect(text(summarize(bullet))).toContain('that redeems at maturity')
    expect(text(summarize(bullet))).toContain('It pays a coupon of 12% a year (3% a review) on each quarterly review')
  })

  it('tags each phrase with its concept', () => {
    const segments = summarize(product())
    expect(segments.find((segment) => segment.text.startsWith('a coupon of'))?.concept).toBe('coupon')
    expect(segments.find((segment) => segment.text.startsWith('at or above 70%'))?.concept).toBe('coupon-barrier')
    expect(segments.find((segment) => segment.text === 'with memory')?.concept).toBe('memory')
    expect(segments.filter((segment) => segment.concept === 'coupon-schedule').map(({ text }) => text)).toEqual(['monthly'])
  })
})

describe('the coupon in the rule', () => {
  it('has a coupon line of its own, apart from the call', () => {
    const [coupon] = couponFormula(product())
    expect(coupon.lead).toBe('Coupon')
    expect(text(coupon.segments)).toBe('On each coupon review until it ends, if Level ≥ Coupon barrier × Initial level, pay Principal × Rate × Months between coupon reviews ÷ 12 for this review and for each review missed since the last coupon paid. A coupon review on the date the product ends pays with it')
    expect(redemptionFormula(product()).map(({ lead }) => lead)).toEqual(['Call'])
  })

  it('says a missed coupon is not paid later without memory', () => {
    expect(text(couponFormula(product({ memory: false }))[0].segments)).toContain('a missed coupon is not paid later')
  })

  it('has no coupon line without a coupon', () => {
    expect(couponFormula({ ...product(), coupon: undefined })).toEqual([])
  })
})

describe('the coupon in the calculation', () => {
  it('lists a coupon step for each review up to the call, then the call, its coupon and the total paid', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    expect(steps.filter((step) => step.concept === 'coupon' && step.title.startsWith('Coupon on')).map((step) => step.value)).toEqual(['10', '0', '20', '0', '20'])
    expect(steps.find((step) => step.title === 'Coupon on review 3 of 12, month 3')?.how).toContain('2 × 10, this review’s coupon and 1 coupon remembered')
    // In order of month, the coupon before the call on a month that is both.
    expect(steps.slice(0, 4).map(({ title }) => title)).toEqual(['Coupon on review 1 of 12, month 1', 'Review 1 of 12, month 1', 'Coupon on review 2 of 12, month 2', 'Review 2 of 12, month 2'])
    expect(steps.find((step) => step.title === 'Redemption')).toMatchObject({ how: 'Called on review 5, after 5 months: principal × (1 + 0%) + coupon 20', value: '1,020' })
    expect(steps.find((step) => step.title === 'Total paid')).toMatchObject({ value: '1,050' })
  })

  it('has no annualised return from one payment when the product pays coupons', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    expect(steps.some((step) => step.title === 'Annualised return')).toBe(false)
  })

  it('closes a product that ran to the end with the payoff, the last coupon, the total and the total return', () => {
    const outcome = redemptionOutcome(product(), neverCalled, { initial: 100, final: 75 })
    expect(couponClosingSteps(product(), outcome)).toMatchObject([
      { title: 'Paid at maturity', how: '1,000 from the payoff + coupon 20 on the last review', value: '1,020', result: true },
      { title: 'Total paid', value: '1,120' },
      { title: 'Total return', how: '(1,120 − 1,000) ÷ 1,000, over 12 months', value: '+12%' },
    ])
  })

  it('gives a total return below zero when the coupons do not make up a loss', () => {
    // The 60% downside barrier is reached at 55, so the payoff pays 550; the coupons paid before add 100.
    const outcome = redemptionOutcome(product(), neverCalled, { initial: 100, final: 55 })
    expect(couponClosingSteps(product(), outcome).at(-1)).toMatchObject({ title: 'Total return', value: '−35%' })
  })

  it('gives a called product with a coupon its total return over the months it lasted, and no annualised return', () => {
    const steps = redemptionSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))
    expect(steps.find((step) => step.title === 'Total return')).toMatchObject({ how: '(1,050 − 1,000) ÷ 1,000, over 5 months', value: '+5%' })
  })

  it('has no closing steps for a called product, or without a coupon', () => {
    expect(couponClosingSteps(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))).toEqual([])
    const plain = { ...product(), coupon: undefined }
    expect(couponClosingSteps(plain, redemptionOutcome(plain, neverCalled, { initial: 100, final: 75 }))).toEqual([])
  })
})

describe('the coupon in the outcome sentence', () => {
  it('counts the reviews that paid and what they paid', () => {
    expect(explainCoupons(product(), redemptionOutcome(product(), called, { initial: 100, final: 90 }))).toBe('3 of the 5 coupon reviews it lasted for were at or above the 70 coupon barrier, paying 50 in coupons. In all it paid 1,050, a total return of +5% over 5 months.')
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

  it('keeps the memory path when the barrier is just below the trigger, since a level at the barrier does not call', () => {
    const near = product({ barrier: 0.97 })
    const memory = pathScenarios(near, 100).find((path) => path.name === 'Misses coupons, then pays them by memory')
    expect(memory).toBeDefined()
    const outcome = redemptionOutcome(near, memory!.reviewLevels, { initial: 100, final: memory!.finalLevel! })
    expect(outcome.calledAtReview).toBeUndefined()
    expect(outcome.coupons.find((test) => test.coupons > 1)).toBeDefined()
  })

  it('keeps the memory path with a final review that calls, when the barrier is below the last trigger', () => {
    const near: Product = { ...product({ barrier: 0.97 }), redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 3, callAmount: 0, callOnFinalReview: true } }
    const memory = pathScenarios(near, 100).find((path) => path.name === 'Misses coupons, then pays them by memory')
    expect(memory).toBeDefined()
    expect(redemptionOutcome(near, memory!.reviewLevels, { initial: 100, final: memory!.finalLevel! }).calledAtReview).toBeUndefined()
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

describe('a coupon on its own schedule in the calculation', () => {
  it('says when a call falls on a month that is not a coupon review', () => {
    const monthlyCall: Product = { ...product({ schedule: { frequency: 'quarterly' } }), redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, callAmount: 0 } }
    const outcome = redemptionOutcome(monthlyCall, [95, 95, 95, 104, 90, 90, 90, 90, 90, 90, 90], { initial: 100, final: 90 })
    expect(redemptionSteps(monthlyCall, outcome).find((step) => step.title === 'Redemption')?.how).toBe('Called on review 4, after 4 months: principal × (1 + 0%), no coupon review on this date')
  })

  it('lists the coupon steps of a bullet note', () => {
    const bullet: Product = { ...product({ schedule: { frequency: 'quarterly' }, memory: false }), redemption: 'bullet' }
    const outcome = redemptionOutcome(bullet, [95, 65, 80], { initial: 100, final: 75 })
    expect(redemptionSteps(bullet, outcome).map(({ title, value }) => [title, value])).toEqual([
      ['Coupon on review 1 of 4, month 3', '30'], ['Coupon on review 2 of 4, month 6', '0'], ['Coupon on review 3 of 4, month 9', '30'], ['Coupon on review 4 of 4, month 12', '30'],
    ])
    expect(couponClosingSteps(bullet, outcome).map(({ value }) => value)).toEqual(['1,030', '1,090', '+9%'])
  })

  it('gives a bullet note with a coupon the coupon paths', () => {
    const bullet: Product = { ...product({ schedule: { frequency: 'quarterly' } }), redemption: 'bullet' }
    expect(pathScenarios(bullet, 100).map(({ name, reviewLevels }) => [name, reviewLevels.length])).toEqual([['Misses coupons, then pays them by memory', 3], ['Below the coupon barrier throughout', 3]])
  })
})

describe('the coupon in the review table', () => {
  it('works out the coupon from the rate, and multiplies it by the coupons a review pays with memory', () => {
    const quarterly = product({ schedule: { frequency: 'quarterly' }, rate: 0.1 })
    const outcome = redemptionOutcome(quarterly, [90, 65, 90, 90, 90, 90, 90, 90, 90, 90, 90], { initial: 100, final: 90 })
    const cells = outcome.coupons.map((test) => couponCell(quarterly, test))
    expect(cells[0]).toBe('1,000 × 10% × 3/12 = 25')
  })

  it('shows remembered coupons paid together, and a miss', () => {
    const quarterly = product({ schedule: { frequency: 'quarterly' }, rate: 0.1 })
    // Month 3 at 65 misses; month 6 at 90 pays its own coupon and the one remembered.
    const outcome = redemptionOutcome({ ...quarterly, redemption: 'bullet' }, [65, 90, 90], { initial: 100, final: 90 })
    expect(outcome.coupons.map((test) => couponCell(quarterly, test)).slice(0, 2)).toEqual(['Missed · remembered', '2 × 25 = 50'])
    expect(couponCell(product({ memory: false }), { ...outcome.coupons[0] })).toBe('Missed')
  })
})

describe('a product that ends before its first coupon review', () => {
  it('says so in the outcome sentence, with the total paid and the total return', () => {
    // An issuer call on review 1 of a quarterly call, month 3, beside semi-annual coupons: no coupon review is reached.
    const issuer: Product = { ...product({ schedule: { frequency: 'semi-annual' } }), redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0.01 } }
    const outcome = redemptionOutcome(issuer, [90], { initial: 100, final: 90 }, 1)
    expect(outcome.coupons).toEqual([])
    expect(explainCoupons(issuer, outcome)).toBe('It ended before its first coupon review, so it paid no coupon. In all it paid 1,010, a total return of +1% over 3 months.')
  })
})
