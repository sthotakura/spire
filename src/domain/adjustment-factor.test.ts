import { describe, expect, it } from 'vitest'
import { calculationSteps } from '../content/calculation'
import { sampleBySlug } from '../content/examples'
import { paymentFormula, paymentInWords } from '../content/formula'
import { explainOutcome } from '../content/outcome'
import { lineStages } from '../content/path'
import { summarize } from '../content/summary'
import { redemptionOutcome } from './autocall'
import { maturityPayment, paymentBreakdown, productIssues, validateProduct, type Product } from './note'

const deltaOne = sampleBySlug('delta-one-note')!.product
const withFactor = (product: Product, adjustmentFactor: number): Product => ({ ...product, redemption: { ...product.redemption, adjustmentFactor } })
const initial = 1100

describe('the delta one note', () => {
  it('starts at a factor of 1, so it pays the underlier one for one', () => {
    expect(deltaOne.redemption.adjustmentFactor).toBeUndefined()
    for (const final of [0, 550, 1100, 1650, 2200]) expect(maturityPayment(deltaOne, { initial, final })).toBeCloseTo(1000 * final / initial, 9)
  })

  it('has no floor, so a final level of zero pays nothing', () => {
    expect(maturityPayment(deltaOne, { initial, final: 0 })).toBe(0)
  })

  // The filing's table, No. 1,411, on its hypothetical initial level of 1,100. It prints payments to ten cents.
  it.each([
    [2200, 1987], [2090, 1887.7], [1980, 1788.3], [1870, 1689], [1760, 1589.6], [1650, 1490.3], [1540, 1390.9], [1430, 1291.6],
    [1320, 1192.2], [1210, 1092.9], [1107.2, 1000], [1105.5, 998.5], [1100, 993.5], [990, 894.1], [880, 794.8], [770, 695.4],
    [660, 596.1], [550, 496.7], [440, 397.4], [330, 298], [220, 198.7], [110, 99.3], [0, 0],
  ])('at the filing\'s 99.35%, a final level of %s pays %s', (final, payment) => {
    expect(Math.abs(maturityPayment(withFactor(deltaOne, 0.9935), { initial, final }) - payment)).toBeLessThanOrEqual(0.05 + 1e-9)
  })

  // A factor above 1, from No. 1,408, read on its level alone: that note's level also carries a currency, which this does not model.
  it.each([[1120, 2020], [560, 1010], [554.46, 1000], [336, 606], [0, 0]])('at 101%%, a final level of %s on an initial level of 560 pays %s', (final, payment) => {
    expect(Math.abs(maturityPayment(withFactor(deltaOne, 1.01), { initial: 560, final }) - payment)).toBeLessThanOrEqual(0.05)
  })
})

describe('the adjustment factor', () => {
  const plain = (terms: Partial<Product> = {}): Product => ({ ...deltaOne, underlier: sampleBySlug('capped-barrier-note')!.product.underlier, ...terms })

  it('is the same product at 1 as with no factor', () => {
    const levels = { initial: 100, final: 120 }
    expect(paymentBreakdown(withFactor(plain(), 1), levels)).toEqual(paymentBreakdown(plain(), levels))
  })

  it('states the return the payoff reads and the underlier\'s own', () => {
    const breakdown = paymentBreakdown(withFactor(plain(), 0.9), { initial: 100, final: 110 })
    expect(breakdown.unadjustedReturn).toBeCloseTo(0.1, 12)
    expect(breakdown.underlierReturn).toBeCloseTo(-0.01, 12)
    expect(breakdown.direction).toBe('downside')
  })

  it('moves where each direction starts, so the two rates meet at the level where the adjusted return is zero', () => {
    const note: Product = withFactor({ ...plain(), payoff: { participations: [{ direction: 'downside', rate: 0.5 }, { direction: 'upside', rate: 2 }] } }, 0.8)
    expect(maturityPayment(note, { initial: 100, final: 125 })).toBeCloseTo(1000, 9)
    expect(maturityPayment(note, { initial: 100, final: 150 })).toBeCloseTo(1000 * (1 + 2 * 0.2), 9)
    expect(maturityPayment(note, { initial: 100, final: 100 })).toBeCloseTo(1000 * (1 - 0.5 * 0.2), 9)
  })

  it('applies before a cap and a protection floor', () => {
    const note = withFactor({ ...plain(), payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1, cap: 0.1 }], principalProtection: 0.9 } }, 0.95)
    expect(maturityPayment(note, { initial: 100, final: 110 })).toBeCloseTo(1045, 9)
    expect(maturityPayment(note, { initial: 100, final: 200 })).toBeCloseTo(1100, 9)
    expect(maturityPayment(note, { initial: 100, final: 50 })).toBeCloseTo(900, 9)
  })

  it('applies to the maturity payment of an autocall, and leaves its trigger and call amount alone', () => {
    const redemption: Product['redemption'] = { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, callAmount: 0.08 }], adjustmentFactor: 0.9 }
    const note: Product = { ...plain(), redemption }
    expect(validateProduct(note)).toEqual([])
    expect(redemptionOutcome(note, [100], { initial: 100, final: 100 })).toMatchObject({ calledAtReview: 1, payment: 1080 })
    expect(redemptionOutcome(note, [90], { initial: 100, final: 110 }).payment).toBeCloseTo(990, 9)
  })

  it('applies to the maturity payment of an issuer call that is not called, and leaves a call alone', () => {
    const redemption: Product['redemption'] = { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'semi-annual' }, callAmount: 0.05 }], adjustmentFactor: 0.9 }
    const note: Product = { ...plain(), redemption }
    expect(validateProduct(note)).toEqual([])
    expect(maturityPayment(note, { initial: 100, final: 110 })).toBeCloseTo(990, 9)
    expect(redemptionOutcome(note, [], { initial: 100, final: 110 }, 1).payment).toBeCloseTo(1050, 9)
  })

  it.each([0, -0.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects a factor of %s', (factor) => {
    expect(productIssues(withFactor(plain(), factor)).map(({ field }) => field)).toEqual(['adjustmentFactor'])
  })

  it.each<[string, Product['payoff']]>([
    ['a buffer', { participations: [{ direction: 'downside', buffer: 0.1, rate: 1 }] }],
    ['a downside barrier', { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }],
    ['an upside barrier', { participations: [{ direction: 'upside', barrier: { level: 1.3, observation: 'final' }, rate: 1 }] }],
    ['a digital return', { participations: [], digitalReturn: { amount: 0.1, barrier: { level: 1, observation: 'final' } } }],
    ['barrier absolute return', { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.7, observation: 'final' }, upperBarrier: { level: 1.3, observation: 'final' } } }],
  ])('rejects a factor other than 1 beside %s, and allows 1', (_, payoff) => {
    const note: Product = { ...plain(), payoff }
    expect(productIssues(withFactor(note, 0.99)).map(({ field }) => field)).toEqual(['adjustmentFactor'])
    expect(productIssues(withFactor(note, 1))).toEqual([])
  })

  it('rejects a factor other than 1 beside delivery', () => {
    const note: Product = { ...plain(), settlement: 'delivery', underlier: { kind: 'single', components: [{ asset: { kind: 'equity', name: 'Synthetic Stock' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } } }
    expect(productIssues(withFactor(note, 0.99)).map(({ field }) => field)).toEqual(['adjustmentFactor'])
    expect(productIssues(withFactor(note, 1))).toEqual([])
  })
})

describe('the adjustment factor in the page\'s words', () => {
  const note = withFactor({ ...deltaOne, underlier: sampleBySlug('capped-barrier-note')!.product.underlier }, 0.9935)
  const levels = { initial: 1100, final: 1320 }
  const breakdown = paymentBreakdown(note, levels)

  it('adds a calculation step, and the underlier\'s own return stays its own', () => {
    const steps = calculationSteps(note, breakdown, [1320], [])
    expect(steps.find(({ title }) => title.endsWith('return') && title !== 'Adjusted return' && title !== 'Annualised return')?.value).toBe('+20%')
    expect(steps.find(({ title }) => title === 'Adjusted return')).toMatchObject({ how: '1,320 × 99.35% ÷ 1,100 − 1', value: '+19.2%', concept: 'adjustment-factor' })
  })

  it('adds no step at 1', () => {
    expect(calculationSteps(deltaOne, paymentBreakdown(deltaOne, levels), [1320, 1320, 1320, 1320, 1320], []).some(({ title }) => title === 'Adjusted return')).toBe(false)
  })

  it('defines the adjusted return in the formula, and the payment reads it', () => {
    const lines = paymentFormula(note)
    expect(lines.find(({ lead }) => lead === 'Adjusted return')?.segments[0].text).toBe('(1 + Return) × Adjustment factor − 1')
    expect(lines.find(({ lead }) => lead === 'Payment')?.segments.map(({ text }) => text).join('')).toBe('Principal × (1 + Upside × max(Adjusted return, 0) + Downside × min(Adjusted return, 0))')
  })

  it('states the level where the return is zero in words', () => {
    expect(paymentInWords(note)).toContain('multiplied by 99.35%, so the return is zero when Synthetic Index ends at about 100.65% of its initial level')
  })

  it('explains the outcome from the underlier\'s move, then the factor', () => {
    expect(explainOutcome(note, breakdown)).toContain('The underlier rose 20%. The adjustment factor of 99.35% makes that a return of +19.22%.')
  })

  it('draws a stage for the factor, between the 1:1 line and the participation', () => {
    const stages = lineStages(note, breakdown, levels)
    expect(stages[0].amount).toBeCloseTo(1200, 9)
    expect(stages[1]).toMatchObject({ step: 'Adjusted return', concept: 'adjustment-factor' })
    expect(stages[1].amount).toBeCloseTo(1192.2, 9)
    expect(stages.at(-1)?.amount).toBeCloseTo(1192.2, 9)
  })

  it('names the factor in the summary sentence only when it changes something', () => {
    const text = (product: Product) => summarize(product).map(({ text: part }) => part).join('')
    expect(text(note)).toContain('at maturity with an adjustment factor of 99.35%')
    expect(text(deltaOne)).not.toContain('adjustment factor')
  })
})
