import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type Product, type SingleProduct } from '../domain/note'
import { calculationSteps } from './calculation'
import { payoffLabels } from './chart-labels'
import { sampleBySlug } from './examples'
import { paymentFormula, paymentInWords } from './formula'
import { marketingNames } from './names'
import { explainOutcome } from './outcome'
import { lineStages } from './path'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Synthetic: the worked example in docs/participation-above-digital.md. A 20% digital return at 100%, 150% upside participation measured
// from it, and a 70% downside barrier, on one index starting at 100. The threshold is 120.
const base: SingleProduct = {
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 60 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: {
    participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'final' } }, { direction: 'upside', rate: 1.5, measuredFrom: 'digital-return' }],
    digitalReturn: { amount: 0.2, barrier: { level: 1, observation: 'final' } },
  },
  principalAmount: 1000,
}
const fromInitial: SingleProduct = { ...base, payoff: { ...base.payoff, participations: [base.payoff.participations[0], { direction: 'upside', rate: 1.5 }] } }
const at = (product: SingleProduct, final: number) => paymentBreakdown(product, { initial: 100, final })
const upsideStep = (final: number) => calculationSteps(base, at(base, final), [final], []).find(({ title }) => title === 'Upside participation')
const nameOf = (product: Product) => marketingNames(product).map(({ name }) => name)

describe('the calculation', () => {
  it('adds the rate on the rise beyond the threshold to the digital return', () => {
    expect(upsideStep(140)).toMatchObject({ how: '20% + 150% × (+40% − 20%), above 120', value: '+50%' })
  })

  it('is muted at or below the threshold, and says why', () => {
    expect(upsideStep(110)).toMatchObject({ how: '150% × max(+10% − 20%, 0) · applies only above 120, 100% plus the digital return', value: '0%', muted: true })
    expect(upsideStep(120)).toMatchObject({ value: '0%', muted: true })
  })

  it('keeps the form from the initial level as it was', () => {
    expect(calculationSteps(fromInitial, at(fromInitial, 140), [140], []).find(({ title }) => title === 'Upside participation')).toMatchObject({ how: '150% × max(+40%, 0)', value: '+60%' })
  })
})

describe('the outcome sentence', () => {
  it('says what it pays beyond the threshold', () => {
    expect(explainOutcome(base, at(base, 140))).toContain('It ended above 120, 100% plus the 20% digital return, so it pays that digital return and 150% of the rise beyond it, 50% in all.')
  })

  it('says participation adds nothing at or below it, and the digital return still pays', () => {
    const sentence = explainOutcome(base, at(base, 110))
    expect(sentence).toContain('It ended at or below 120, 100% plus the 20% digital return, so upside participation of 150% adds nothing.')
    expect(sentence).toContain('the payment is at least 1,200')
  })
})

describe('the payment rule, the summary and the label', () => {
  it('writes the rule with the digital return added, and the condition as its own concept', () => {
    const line = paymentFormula(base).flatMap(({ segments }) => segments)
    expect(line.map(({ text }) => text).join('')).toContain('(Digital + Upside × (Return − Digital), when Return > Digital)')
    expect(line.find(({ text }) => text === ', when Return > Digital')?.concept).toBe('measured-from')
  })

  it('says it in words', () => {
    expect(paymentInWords(base)).toContain('Each 1% rise in Synthetic Index beyond 120% of its initial level adds 1.5% of principal to the digital return')
  })

  it('names the threshold in the summary', () => {
    expect(summarize(base).find(({ concept }) => concept === 'measured-from')?.text).toBe(' beyond 120% of the initial level')
    expect(summarize(fromInitial).some(({ concept }) => concept === 'measured-from')).toBe(false)
  })

  it('labels the line from the threshold, and where a cap is reached', () => {
    expect(payoffLabels(base).upside).toBe('Each 1% rise beyond +20% adds 1.5%')
    const capped: SingleProduct = { ...base, payoff: { ...base.payoff, participations: [base.payoff.participations[0], { direction: 'upside', rate: 1.5, measuredFrom: 'digital-return', cap: 0.5 }] } }
    expect(payoffLabels(capped).cap).toContain('Capped at 1,500')
  })
})

describe('selection and the structure', () => {
  it('nests under upside participation, and writes the term on its own line', () => {
    expect(isHighlighted('upside', 'measured-from')).toBe(true)
    expect(structureLines(base).find(({ text }) => text.includes('"measuredFrom"'))?.concept).toBe('measured-from')
  })

  it('writes nothing when measured from the initial level', () => {
    expect(structureLines(fromInitial).some(({ text }) => text.includes('measuredFrom'))).toBe(false)
  })
})

describe('the calculation path', () => {
  it('ends on the payment at every level, and the line has no jump at the threshold', () => {
    for (const final of [69, 70, 100, 110, 120, 120.5, 140, 160]) {
      const stages = lineStages(base, at(base, final), { initial: 100, final })
      expect(stages.at(-1)?.amount).toBeCloseTo(at(base, final).payment, 6)
    }
  })
})

describe('names', () => {
  // A bullet note with 1:1 on a fall, no barrier, and a 100% digital barrier is what the title's greater-of describes.
  const stepUp: SingleProduct = { ...fromInitial, payoff: { ...fromInitial.payoff, participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }] } }
  const measured: SingleProduct = { ...stepUp, payoff: { ...stepUp.payoff, participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5, measuredFrom: 'digital-return' }] } }

  it('does not call it a leveraged market-linked step up note, which pays the greater of the two', () => {
    expect(nameOf(stepUp)).toContain('Leveraged market-linked step up note')
    expect(nameOf(measured)).not.toContain('Leveraged market-linked step up note')
  })

  it('says what the leverage reads', () => {
    expect(marketingNames(measured).find(({ name }) => name === 'Leveraged participation note')?.reason).toContain('Beyond the digital return, a rise pays 150% of what lies beyond it')
  })
})

describe('the sample', () => {
  it('reproduces the filing it is modelled on', () => {
    const sample = sampleBySlug('worst-of-digital-note-with-leverage-above-the-digital-return')!.product
    const paid = (final: number) => paymentBreakdown(sample, { initial: 100, final }).payment
    for (const [final, payment] of [[180, 1920], [157, 1575], [156, 1560], [100, 1560], [99.99, 1000], [70, 1000], [69.99, 699.9]]) expect(paid(final)).toBeCloseTo(payment, 6)
  })
})
