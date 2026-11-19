import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import type { Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { amortizationFormula, amortizationSteps, explainAmortization } from './amortization'
import { marketingNames, productCategory } from './names'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Synthetic: the worked example in docs/amortization.md. A 12-month note of 1,000 with a fixed coupon of 6% a year and quarterly
// level-payment amortization: 259.44 a quarter.
const product = (overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  term: { months: 12 },
  redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'amortization', schedule: { frequency: 'quarterly' }, method: 'level-payment' }] },
  coupon: { schedule: { frequency: 'quarterly' }, rate: 0.06 },
  payoff: { participations: [] },
  ...overrides,
})
const monthly = product({ term: { months: 24 }, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'amortization', schedule: { frequency: 'monthly' }, method: 'level-payment' }] }, coupon: { schedule: { frequency: 'monthly' }, rate: 0.05 } })
const outcomeOf = (note: Product) => redemptionOutcome(note, [], { initial: 100, final: 100 })
const text = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join('')

describe('an amortizing note in the summary', () => {
  it('says how it repays principal and what its coupon is measured on, and names no underlier', () => {
    const segments = summarize(product())
    expect(text(segments)).toBe('A 1-year note that repays its principal in level quarterly instalments. Each includes a fixed coupon of 6% a year (1.5% a review) on the principal still outstanding, and repays principal with the rest, whatever the underlier does.')
    expect(segments.find((segment) => segment.text.startsWith('level'))?.concept).toBe('amortization')
  })
})

describe('an amortizing note in the rule', () => {
  it('states the level instalment, the coupon on what is outstanding, and the principal repaid', () => {
    expect(amortizationFormula().map((line) => line.lead)).toEqual(['Instalment', 'Coupon', 'Principal repaid'])
    expect(text(amortizationFormula()[0].segments)).toContain('Principal × i ÷ (1 − (1 + i)^−n)')
  })
})

describe('an amortizing note in the calculation', () => {
  it('works out the instalment and each review, then the total paid and the returns', () => {
    const steps = amortizationSteps(product(), outcomeOf(product()))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([
      ['Rate a review', '1.5%'],
      ['Instalment', '259.44'],
      ['Review 1 of 4, month 3', '259.44'],
      ['Review 2 of 4, month 6', '259.44'],
      ['Review 3 of 4, month 9', '259.44'],
      ['Review 4 of 4, month 12', '259.44'],
      ['Total paid', '1,037.78'],
      ['Total return', '+3.78%'],
      ['Annualised return', '6.14% a year'],
    ])
    expect(steps[2].how).toBe('Coupon 1,000 × 1.5% = 15 + principal 259.44 − 15 = 244.44, leaving 755.56')
    expect(steps[5].how).toBe('Coupon 255.61 × 1.5% = 3.83 + principal 255.61, all that is outstanding')
  })

  it('groups the reviews between the first and the last, and marks a rounded rate as approximate', () => {
    const steps = amortizationSteps(monthly, outcomeOf(monthly))
    expect(steps.map(({ title }) => title)).toEqual(['Rate a review', 'Instalment', 'Review 1 of 24, month 1', 'Reviews 2–23 of 24, months 2–23', 'Review 24 of 24, month 24', 'Total paid', 'Total return', 'Annualised return'])
    expect(steps[0].value).toBe('≈0.4167%')
  })
})

describe('an amortizing note in the outcome', () => {
  it('says what the instalments paid, whatever the underlier did', () => {
    expect(explainAmortization(product(), outcomeOf(product()))).toBe('It repaid its principal in 4 quarterly instalments of 259.44, whatever the underlier did: 1,000 of principal and 37.78 in coupons, which fell as the principal outstanding fell. In all it paid 1,037.78, a total return of +3.78% over 12 months, or 6.14% a year.')
  })
})

describe('an amortizing note elsewhere', () => {
  it('gets no name and no category: it reads no underlier', () => {
    expect(marketingNames(product())).toEqual([])
    expect(productCategory(product())).toBeUndefined()
  })

  it('tags its mechanism in the structure as amortization', () => {
    const lines = structureLines(product())
    expect(lines.filter(({ concept }) => concept === 'amortization').map(({ text }) => text.trim())).toEqual(['{', '"kind": "amortization",', '"schedule": {', '"frequency": "quarterly"', '},', '"method": "level-payment"', '}'])
  })
})

describe('the rates of an amortizing note', () => {
  it('shows a stated rate in full, and rounds only the rate a review it derives', () => {
    const barclays = product({ coupon: { schedule: { frequency: 'monthly' }, rate: 0.0359231 }, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'amortization', schedule: { frequency: 'monthly' }, method: 'level-payment' }] } })
    expect(text(summarize(barclays))).toContain('a fixed coupon of 3.59231% a year (≈0.2994% a review)')
    expect(amortizationSteps(barclays, outcomeOf(barclays))[0].how).toBe('3.59231% a year × 1/12')
  })
})
