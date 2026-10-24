import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type Product, type SingleProduct } from '../domain/note'
import { calculationSteps } from './calculation'
import { payoffLabels } from './chart-labels'
import { paymentFormula, paymentInWords } from './formula'
import { explainOutcome } from './outcome'
import { scenarioRows } from './scenarios'
import { marketingNames } from './names'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Synthetic: the worked examples in docs/digital-return.md, on one index starting at 100. The first note pays the greater of a 26%
// digital return and the return from 70% up; the second has no upside participation, so a rise pays the digital return alone.
const base: SingleProduct = {
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], digitalReturn: { amount: 0.26, barrier: { level: 0.7, observation: 'final' } } },
  principalAmount: 1000,
}
const downsideOnly: SingleProduct = { ...base, payoff: { participations: [{ direction: 'downside', rate: 1 }], digitalReturn: { amount: 0.0808, barrier: { level: 0.71, observation: 'final' } } } }
const noParticipation: SingleProduct = { ...base, payoff: { participations: [], digitalReturn: { amount: 0.26, barrier: { level: 0.7, observation: 'final' } } } }
const sentence = (product: Product) => summarize(product).map(({ text }) => text).join('')
const at = (product: SingleProduct, final: number) => paymentBreakdown(product, { initial: 100, final })
const steps = (product: SingleProduct, final: number) => calculationSteps(product, at(product, final), [final], [])
const step = (product: SingleProduct, final: number, title: string) => steps(product, final).find((candidate) => candidate.title === title)

describe('digital return in the summary', () => {
  it('states the amount and where it is paid, as a part of the digital return', () => {
    expect(sentence(base)).toBe('A 3-year note that redeems at maturity and pays 100% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with a digital return of 26%, paid as a minimum at or above 70% of the initial level.')
    expect(summarize(base).find(({ text }) => text.startsWith('a digital return'))?.concept).toBe('digital-return')
  })

  it('states the barrier for each asset on a worst-of basket', () => {
    const worstOf: Product = {
      ...base,
      underlier: {
        kind: 'basket',
        components: [{ asset: { kind: 'equity-index', name: 'Index A' } }, { asset: { kind: 'equity-index', name: 'Index B' } }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }
    expect(sentence(worstOf)).toContain('paid as a minimum at or above 70% of the initial level of each asset')
  })
})

describe('digital return in the structure JSON', () => {
  it('gives the digital return its lines and its barrier its own', () => {
    const all = structureLines(base)
    const start = all.findIndex(({ text }) => text.includes('"digitalReturn"'))
    expect(all.slice(start, start + 7).map(({ text, concept }) => [text.trim(), concept])).toEqual([
      ['"digitalReturn": {', 'digital-return'],
      ['"amount": 0.26,', 'digital-return'],
      ['"barrier": {', 'digital-barrier'],
      ['"level": 0.7,', 'digital-barrier'],
      ['"observation": "final"', 'digital-barrier'],
      ['}', 'digital-barrier'],
      ['}', 'digital-return'],
    ])
  })
})

describe('digital return in the payment rule', () => {
  it('adds a floor that holds at or above the barrier, before the floor at zero', () => {
    const lines = paymentFormula(base).map(({ segments }) => segments.map(({ text }) => text).join(''))
    expect(lines.slice(-2)).toEqual(['floored at Principal × (1 + Digital) when Final level ≥ Digital barrier × Initial level', 'floored at 0'])
  })

  it('names the concepts in the floor line', () => {
    const line = paymentFormula(base).find(({ segments }) => segments[0]?.text === 'floored at ' && segments[1]?.concept === 'digital-return')
    expect(line?.segments.map(({ concept }) => concept)).toEqual([undefined, 'digital-return', undefined, 'digital-barrier'])
  })

  it('says it in words with the note’s own terms, beside a fall', () => {
    expect(paymentInWords(downsideOnly)).toBe('Each 1% fall in Synthetic Index takes 1% of principal away. A rise leaves principal unchanged. If Synthetic Index ends at or above 71% of its initial level, the payment is at least 1,080.8, principal plus a fixed 8.08%. The payment never goes below zero.')
  })

  it('says it in words when there is no participation', () => {
    expect(paymentInWords(noParticipation)).toBe('The payment is principal, 1,000, unless Synthetic Index ends at or above 70% of its initial level, when it is at least 1,260, principal plus a fixed 26%.')
  })
})

describe('digital return in the calculation', () => {
  it('adds a step between the participation and the protection floor', () => {
    expect(steps(base, 90).map(({ title }) => title)).toEqual(['Synthetic Index return', 'Downside participation', 'Upside participation', 'Payment from participation', 'Digital return', 'Protection floor', 'Payment at maturity', 'Annualised return'])
  })

  it('shows the floor when the barrier is met and the payment is below it', () => {
    expect(step(base, 90, 'Digital return')).toMatchObject({ how: '70% × 100 = 70 · final level 90 is at or above it, so the payment is at least 1,260', value: '1,260', concept: 'digital-return' })
    expect(step(base, 90, 'Digital return')?.muted).toBe(false)
    expect(step(base, 90, 'Payment at maturity')).toMatchObject({ how: '900, floored at 1,260', value: '1,260' })
  })

  it('shows the edge as met', () => {
    expect(step(base, 70, 'Digital return')?.how).toContain('final level 70 is at or above it')
    expect(step(base, 70, 'Payment at maturity')?.value).toBe('1,260')
  })

  it('mutes the step when the participated payment is already higher', () => {
    expect(step(base, 150, 'Digital return')).toMatchObject({ how: '70% × 100 = 70 · final level 150 is at or above it, so the payment is at least 1,260 · not binding here', muted: true })
    expect(step(base, 150, 'Payment at maturity')?.value).toBe('1,500')
  })

  it('mutes the step below the barrier, where the digital return is not paid', () => {
    expect(step(base, 60, 'Digital return')).toMatchObject({ how: '70% × 100 = 70 · final level 60 is below it, so the digital return is not paid', muted: true })
    expect(step(base, 60, 'Payment at maturity')).toMatchObject({ how: '600, not below zero', value: '600' })
  })

  it('states the protection floor on its own, beside the digital floor', () => {
    const protectedNote: SingleProduct = { ...base, payoff: { ...base.payoff, principalProtection: 0.9 } }
    expect(step(protectedNote, 60, 'Protection floor')).toMatchObject({ value: '900', muted: false })
    expect(step(protectedNote, 90, 'Protection floor')).toMatchObject({ value: '900', muted: true })
    expect(step(protectedNote, 90, 'Payment at maturity')).toMatchObject({ how: '900, floored at 1,260', value: '1,260' })
  })
})

describe('digital return in the outcome', () => {
  const explain = (product: SingleProduct, final: number) => explainOutcome(product, at(product, final))

  it('explains a fall that keeps the barrier', () => {
    expect(explain(base, 90)).toBe('The underlier fell 10%. Downside participation of 100% deducts 10% from principal. It ended at or above the 70 digital barrier, so the payment is at least 1,260, principal plus the 26% digital return. The 1,260 floor applies, so the contractual payment is 1,260, 260 more than principal.')
  })

  it('explains a fall below the barrier', () => {
    expect(explain(base, 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal. It ended below the 70 digital barrier, so the 26% digital return is not paid. There is no principal protection, so the contractual payment is 600, 400 less than principal.')
  })

  it('says the floor does not apply when the rise pays more', () => {
    expect(explain(base, 150)).toBe('The underlier rose 50%. Upside participation of 100% adds 50% to principal. It ended at or above the 70 digital barrier, so the payment is at least 1,260, principal plus the 26% digital return. The 1,260 floor does not apply, so the contractual payment is 1,500, 500 more than principal.')
  })
})

describe('digital return in the scenarios', () => {
  const rows = scenarioRows(base, 100)

  it('adds a row at the barrier and one just below it, where the digital return is lost', () => {
    const atBarrier = rows.find((row) => row.atBarrier)
    expect(atBarrier).toMatchObject({ finalLevel: 70 })
    expect(atBarrier?.breakdown.payment).toBeCloseTo(1260, 8)
    const below = rows.find((row) => row.pastBarrier === 'below')
    expect(below?.finalLevel).toBeCloseTo(69, 8)
    expect(below?.breakdown.payment).toBeCloseTo(690, 8)
  })

  it('takes the place of a fixed row at the same level and keeps the table in order', () => {
    const atInitial = scenarioRows({ ...base, payoff: { ...base.payoff, digitalReturn: { amount: 0.15, barrier: { level: 1, observation: 'final' } } } }, 100)
    expect(atInitial.filter((row) => row.finalLevel === 100)).toHaveLength(1)
    expect(atInitial.find((row) => row.finalLevel === 100)?.atBarrier).toBe(true)
    expect(atInitial.map((row) => row.finalLevel)).toEqual([...atInitial.map((row) => row.finalLevel)].sort((a, b) => a - b))
  })

  it('has none without a digital return', () => {
    const plain = scenarioRows({ ...base, payoff: { participations: base.payoff.participations } }, 100)
    expect(plain.some((row) => row.atBarrier || row.pastBarrier !== null)).toBe(false)
  })
})

describe('digital return on the chart and in the outline', () => {
  it('labels the piece it sets', () => {
    expect(payoffLabels(base)['digital-return']).toBe('At or above 70% of the initial level it pays at least 1,260')
  })

  it('highlights the barrier with the digital return and not the other way round', () => {
    expect(isHighlighted('digital-return', 'digital-barrier')).toBe(true)
    expect(isHighlighted('payoff', 'digital-return')).toBe(true)
    expect(isHighlighted('payoff', 'digital-barrier')).toBe(true)
    expect(isHighlighted('digital-barrier', 'digital-return')).toBe(false)
    expect(isHighlighted('upside', 'digital-return')).toBe(false)
  })
})

describe('digital return and the generic names', () => {
  it('rules out the plain participation names, which describe a note that only follows the underlier', () => {
    expect(marketingNames({ ...base, payoff: { participations: base.payoff.participations } }).map(({ name }) => name)).toEqual(['Tracker'])
    expect(marketingNames(base).map(({ name }) => name)).toEqual([])
  })

  it('says beside the names it keeps that they do not cover the digital return', () => {
    const buffered: SingleProduct = { ...base, payoff: { ...base.payoff, participations: [{ direction: 'downside', buffer: 0.2, rate: 1 }] } }
    const [name] = marketingNames(buffered)
    expect(name.name).toBe('Buffered note')
    expect(name.reason).toContain('The name does not cover the digital return')
  })
})
