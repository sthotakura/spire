import { describe, expect, it } from 'vitest'
import { basketBreakdown, paymentBreakdown, type BasketUnderlier, type Note } from '../domain/note'
import { calculationSteps } from './calculation'
import { paymentFormula, paymentInWords } from './formula'
import { explainOutcome } from './outcome'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// The worked example in docs/basket.md: Synthetic Index A starts at 100 and Synthetic Co at 40, each weighted 50%.
const basket: BasketUnderlier = {
  kind: 'basket',
  components: [
    { asset: { kind: 'equity-index', name: 'Synthetic Index A' } },
    { asset: { kind: 'equity', name: 'Synthetic Co' } },
  ],
  determination: {
    initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Co', level: 40 }] },
    final: { kind: 'final-date' },
  },
  combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: 0.5 }, { asset: 'Synthetic Co', weight: 0.5 }] },
}
const note: Note = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: basket,
  payoff: { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1 }] },
  principalAmount: 1000,
}
const weighted = (a: number, b: number): Note => ({ ...note, underlier: { ...basket, combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: a }, { asset: 'Synthetic Co', weight: b }] } } })
const sentence = (n: Note) => summarize(n).map(({ text }) => text).join('')
// Index A +30% and Co −10% make a basket level of 110.
const measured = basketBreakdown(basket, [[130], [36]])
const breakdown = paymentBreakdown(note, measured.levels)

describe('a basket in words', () => {
  it('names an equally weighted basket and its assets', () => {
    expect(sentence(note)).toBe('A note that redeems at maturity and pays 100% of the upside and 100% of the downside of an equally weighted basket of Synthetic Index A and Synthetic Co, measured point-to-point from each asset’s initial level, with a barrier at 70% of the initial basket level.')
    expect(summarize(note).find(({ text }) => text === 'equally weighted basket')?.concept).toBe('combination')
    expect(summarize(note).find(({ text }) => text === 'Synthetic Co')?.concept).toBe('asset')
  })

  it('states unequal weights beside each asset, to two decimal places of a percent', () => {
    expect(sentence(weighted(0.6667, 0.3333))).toContain('of a weighted basket of Synthetic Index A (66.67%) and Synthetic Co (33.33%),')
  })

  it('writes the payment rule for the basket level', () => {
    const lines = paymentFormula(note).map(({ lead, segments }) => `${lead ? `${lead} = ` : ''}${segments.map((segment) => segment.text).join('')}`)
    expect(lines).toEqual([
      'Asset return = Final level ÷ Initial level − 1, for each asset',
      'Return = Sum of Weight × Asset return',
      'Basket level = 100 × (1 + Return)',
      'Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return, 0))',
      'downside only when Basket level < Barrier × 100',
      'floored at 0',
    ])
    expect(paymentInWords(note)).toBe('Each 1% rise in the basket adds 1% of principal, and each 1% fall takes 1% away, but only if the basket ends below 70% of its initial level. The payment never goes below zero.')
  })

  it('explains the outcome for the basket', () => {
    expect(explainOutcome(note, breakdown)).toBe('The basket rose 10%. Upside participation of 100% adds 10% to principal. The contractual payment is 1,100, 100 more than principal.')
  })
})

describe('a basket in the calculation', () => {
  it('measures each asset, then weights the returns into the basket level the payoff reads', () => {
    const steps = calculationSteps(note, breakdown, [], [], measured)
    expect(steps.slice(0, 5).map(({ title, how, value, concept }) => [title, how, value, concept])).toEqual([
      ['Synthetic Index A return', '130 ÷ 100 − 1', '+30%', 'determination'],
      ['Synthetic Co return', '36 ÷ 40 − 1', '−10%', 'determination'],
      ['Basket return', '50% × +30% + 50% × −10%', '+10%', 'combination'],
      ['Basket level', '100 × (1 + 10%)', '110', 'combination'],
      ['Barrier', '70% × 100 · basket level 110 is not below it, so a fall does not reduce principal', '70', 'barrier'],
    ])
    expect(steps.at(-1)?.value).toBe('1,100')
  })

  it('averages each asset before measuring its return', () => {
    const averaged: BasketUnderlier = { ...basket, determination: { ...basket.determination, final: { kind: 'averaging', observationCount: 2 } } }
    const averagedNote: Note = { ...note, underlier: averaged }
    const levels = basketBreakdown(averaged, [[110, 130], [44, 36]])
    const titles = calculationSteps(averagedNote, paymentBreakdown(averagedNote, levels.levels), [], [], levels).slice(0, 4).map(({ title, how, value }) => `${title}: ${how} = ${value}`)
    expect(titles).toEqual(['Final level of Synthetic Index A: (110 + 130) ÷ 2 = 120', 'Synthetic Index A return: 120 ÷ 100 − 1 = +20%', 'Final level of Synthetic Co: (44 + 36) ÷ 2 = 40', 'Synthetic Co return: 40 ÷ 40 − 1 = +0%'])
  })
})

describe('a basket in the structure JSON', () => {
  it('tags the combination, and each initial level with the initial level', () => {
    const lines = structureLines(note)
    expect(lines.filter(({ concept }) => concept === 'combination').map(({ text }) => text.trim())).toContain('"weight": 0.5')
    expect(lines.find(({ text }) => text.includes('"level": 40'))?.concept).toBe('initial-level')
  })

  it('highlights the combination with the underlier', () => {
    expect(isHighlighted('underlier', 'combination')).toBe(true)
    expect(isHighlighted('determination', 'combination')).toBe(false)
  })
})
