import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type SingleProduct } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { calculationSteps } from './calculation'
import { paymentFormula, paymentInWords } from './formula'
import { marketingNames } from './names'
import { explainOutcome } from './outcome'
import { isHighlighted } from './selection'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// The synthetic examples in docs/deposit.md: a capped deposit, and a deposit with a minimum return.
const deposit: SingleProduct = { ...startingProduct, wrapper: 'deposit', term: { months: 60 }, payoff: { participations: [{ direction: 'upside', rate: 1 }] } }
const capped: SingleProduct = { ...deposit, payoff: { participations: [{ direction: 'upside', rate: 1, cap: 0.3 }] } }
const withMinimum: SingleProduct = { ...deposit, term: { months: 84 }, payoff: { ...deposit.payoff, minimumReturn: 0.0525 } }

const sentence = (product: SingleProduct) => summarize(product).map(({ text }) => text).join('')
const steps = (product: SingleProduct, final: number) => calculationSteps(product, paymentBreakdown(product, { initial: 100, final }), [final], [])
const step = (product: SingleProduct, final: number, title: string) => steps(product, final).find((candidate) => candidate.title === title)
const formulaText = (product: SingleProduct) => paymentFormula(product).map(({ lead, segments }) => `${lead ? `${lead} = ` : ''}${segments.map(({ text }) => text).join('')}`)

describe('a deposit in the summary', () => {
  it('names the wrapper with the term', () => {
    expect(sentence(capped)).toBe('A 5-year deposit that redeems at maturity and pays 100% of the upside of Synthetic Index, measured point-to-point from 100, with a maximum return of 30%.')
  })

  it('states the minimum return to two decimal places, after the cap', () => {
    expect(sentence(withMinimum)).toBe('A 7-year deposit that redeems at maturity and pays 100% of the upside of Synthetic Index, measured point-to-point from 100, with a minimum return of 5.25%.')
    expect(sentence({ ...capped, payoff: { ...capped.payoff, minimumReturn: 0.05 } })).toMatch(/with a maximum return of 30% and a minimum return of 5%\.$/)
    expect(summarize(withMinimum).find(({ concept }) => concept === 'minimum-return')?.text).toBe('a minimum return of 5.25%')
  })
})

describe('a deposit in the Structure JSON', () => {
  it('tags the minimum return with its own concept, which the payoff selects', () => {
    expect(structureLines(withMinimum).filter(({ concept }) => concept === 'minimum-return').map(({ text }) => text.trim())).toEqual(['"minimumReturn": 0.0525'])
    expect(isHighlighted('payoff', 'minimum-return')).toBe(true)
  })
})

describe('a deposit in the payment rule', () => {
  it('floors the payment at the minimum return', () => {
    expect(formulaText(withMinimum)).toEqual(['Return = Final level ÷ Initial level − 1', 'Payment = Principal × (1 + Upside × max(Return, 0))', 'floored at Principal × (1 + Minimum)'])
  })

  it('has no floor line without a minimum, since nothing reduces principal', () => {
    expect(formulaText(capped)).toEqual(['Return = Final level ÷ Initial level − 1', 'Payment = Principal × (1 + Upside × max(Return, 0))', 'capped at Principal × (1 + Cap)'])
  })

  it('states the minimum payment in words', () => {
    expect(paymentInWords(withMinimum)).toBe('Each 1% rise in Synthetic Index adds 1% of principal. The payment never goes below 1,052.5.')
    expect(paymentInWords(capped)).toBe('Each 1% rise in Synthetic Index adds 1% of principal. A fall leaves principal unchanged. The payment never goes above 1,300.')
    expect(paymentInWords({ ...withMinimum, payoff: { participations: [], minimumReturn: 0.0525 } })).toBe('The payment is always principal plus the minimum return, 1,052.5, whatever Synthetic Index does.')
  })
})

describe('a deposit in the calculation', () => {
  it('ends with the minimum return in place of the protection floor, then the payment and its annual rate', () => {
    expect(steps(withMinimum, 50).map(({ n, title, how, value }) => [n, title, how, value]).slice(3)).toEqual([
      [4, 'Payment before minimum', '1,000 × (1 + 0%)', '1,000'],
      [5, 'Minimum return', '1,000 × (1 + 5.25%) · applies here', '1,052.5'],
      [6, 'Payment at maturity', '1,000, floored at 1,052.5', '1,052.5'],
      [7, 'Annualised return', '(1,052.5 ÷ 1,000)^(1 ÷ 7 years) − 1', '0.73% a year'],
    ])
  })

  it('says a deposit has no downside participation, rather than that it was not selected', () => {
    expect(step(capped, 50, 'Downside participation')).toMatchObject({ how: 'Not on a deposit, which repays principal in full', muted: true })
  })

  it('says why a deposit without a minimum still repays principal', () => {
    expect(step(capped, 50, 'Minimum return')).toMatchObject({ how: 'Not added. A deposit repays principal in full, so the payment is never below it', muted: true })
    expect(step(capped, 160, 'Payment at maturity')).toMatchObject({ how: '1,600, capped at 1,300', value: '1,300' })
    expect(step(deposit, 110, 'Payment at maturity')).toMatchObject({ how: 'Same as the payment before minimum', value: '1,100' })
  })

  it('states the annualised return for a note too, since every product has a term', () => {
    expect(step({ ...startingProduct, term: { months: 12 } }, 110, 'Annualised return')).toMatchObject({ how: '(1,000 ÷ 1,000)^(1 ÷ 1 year) − 1', value: '0% a year' })
  })
})

describe('a deposit in the outcome', () => {
  it('says a fall does not reduce principal, and when the minimum applies', () => {
    expect(explainOutcome(withMinimum, paymentBreakdown(withMinimum, { initial: 100, final: 90 }))).toBe('The underlier fell 10%. A deposit repays principal in full, so a fall does not reduce it. The 1,052.5 minimum applies, so the contractual payment is 1,052.5, 52.5 more than principal.')
    expect(explainOutcome(withMinimum, paymentBreakdown(withMinimum, { initial: 100, final: 120 }))).toBe('The underlier rose 20%. Upside participation of 100% adds 20% to principal. The 1,052.5 minimum does not apply, so the contractual payment is 1,200, 200 more than principal.')
  })
})

describe('a deposit in the marketing names', () => {
  const names = (product: SingleProduct) => marketingNames(product).map(({ name }) => name)

  it('calls a deposit with upside participation a market-linked deposit, and adds capped participation with a cap', () => {
    expect(names(deposit)).toEqual(['Market-linked deposit'])
    expect(names(capped)).toEqual(['Market-linked deposit', 'Capped participation'])
  })

  it('gives a deposit none of the names that describe notes', () => {
    expect(names(deposit)).not.toContain('Participation note')
    expect(names({ ...deposit, wrapper: 'note' })).toEqual(['Participation note'])
  })
})
