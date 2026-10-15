import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import { validateProduct, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { explainRedemption, pathScenarios, redemptionFormula, redemptionSteps } from './autocall'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Keys in the order the structure states them: the schedule follows the term, and the redemption follows the schedule.
const { wrapper, principalAmount, underlier, payoff } = startingProduct
const callable: Product = {
  wrapper,
  principalAmount,
  term: { months: 12 },
  schedule: { frequency: 'monthly' },
  redemption: { kind: 'autocall', trigger: 1, callAmount: 0.08 },
  underlier,
  payoff,
}
const text = (note: Product) => summarize(note).map(({ text }) => text).join('')
const levels = { initial: 100, final: 100 }

describe('summary', () => {
  it('says when the product is called, what it pays, and that it otherwise redeems at maturity', () => {
    expect(text(callable)).toBe('A 1-year note that is called early if Synthetic Index is at or above 100% of its initial level on any monthly review before maturity, paying 8% above principal, and otherwise redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
  })

  it('states a call that pays principal only', () => {
    expect(text({ ...callable, redemption: { kind: 'autocall', trigger: 0.9, callAmount: 0 } })).toContain('at or above 90% of its initial level on any monthly review before maturity, repaying principal, and otherwise')
  })

  it('names the quarterly frequency', () => {
    expect(text({ ...callable, term: { months: 36 }, schedule: { frequency: 'quarterly' } })).toContain('on any quarterly review before maturity')
  })

  it('leaves a bullet product reading as before', () => {
    expect(text(startingProduct)).toBe('A 3-year note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
  })

  it('tags the call clause with the redemption concept', () => {
    const concepts = summarize(callable).filter(({ concept }) => concept === 'redemption').map(({ text }) => text)
    expect(concepts.join('')).toContain('at or above 100%')
    expect(concepts).toContain('at maturity')
  })
})

describe('structure JSON', () => {
  it('tags the schedule and the autocall with the redemption concept, and keeps the shape of the product', () => {
    const lines = structureLines(callable)
    expect(lines.map(({ text }) => text).join('\n')).toBe(JSON.stringify(callable, null, 2))
    const redemptionLines = lines.filter(({ concept }) => concept === 'redemption').map(({ text }) => text.trim())
    expect(redemptionLines).toEqual(['"schedule": {', '"frequency": "monthly"', '},', '"redemption": {', '"kind": "autocall",', '"trigger": 1,', '"callAmount": 0.08', '},'])
  })
})

describe('what a call says and does', () => {
  it('explains a call with its review, level, trigger and payment', () => {
    const outcome = redemptionOutcome(callable, [95, 105, ...Array(9).fill(90)], levels)
    expect(explainRedemption(callable, outcome)).toBe('The level was 105 on review 2 of 12, at or above the 100 trigger, so the product was called after 2 months and pays 1,080, 80 more than principal.')
  })

  it('explains a product that was never called', () => {
    const outcome = redemptionOutcome(callable, Array(11).fill(90), levels)
    expect(explainRedemption(callable, outcome)).toBe('No review before the last was at or above the 100 trigger, so the product ran to the end of its term.')
  })

  it('says one month in the singular', () => {
    const outcome = redemptionOutcome(callable, [100, ...Array(10).fill(90)], levels)
    expect(explainRedemption(callable, outcome)).toContain('after 1 month and')
  })

  it('has nothing to say for a bullet product', () => {
    expect(explainRedemption(startingProduct, redemptionOutcome(startingProduct, [], levels))).toBe('')
    expect(redemptionFormula(startingProduct)).toEqual([])
    expect(redemptionSteps(startingProduct, redemptionOutcome(startingProduct, [], levels))).toEqual([])
  })

  it('writes the call rule beside the payment rule', () => {
    const [line] = redemptionFormula(callable)
    expect(line.lead).toBe('Call')
    expect(line.segments.map(({ text }) => text).join('')).toBe('On a review before the last, if Level ≥ Trigger × Initial level, pay Principal × (1 + Call amount) and end')
  })

  it('shows each review up to the call and then the redemption', () => {
    const steps = redemptionSteps(callable, redemptionOutcome(callable, [90, 100, ...Array(9).fill(90)], levels))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([['Review 1 of 12', 'Not called'], ['Review 2 of 12', 'Called'], ['Redemption', '1,080']])
    expect(steps[2].result).toBe(true)
  })

  it('shows every review before the last, then that it runs to maturity, when it is not called', () => {
    const steps = redemptionSteps(callable, redemptionOutcome(callable, Array(11).fill(90), levels))
    expect(steps).toHaveLength(12)
    expect(steps.at(-1)).toMatchObject({ title: 'Redemption', value: 'At maturity' })
  })
})

describe('named path scenarios', () => {
  it('give a valid path for each name, which ends the way the name says', () => {
    for (const trigger of [1, 0.8, 1.2]) {
      const note: Product = { ...callable, redemption: { kind: 'autocall', trigger, callAmount: 0.08 } }
      expect(validateProduct(note)).toEqual([])
      const results = Object.fromEntries(pathScenarios(note, 100).map(({ name, reviewLevels, finalLevel }) => [name, redemptionOutcome(note, reviewLevels, { initial: 100, final: finalLevel }).calledAtReview]))
      expect(results).toEqual({
        'Called on the first review': 1,
        'Called on review 11': 11,
        'Never called, ends flat': undefined,
        'Never called, ends 40% down': undefined,
      })
    }
  })

  it('has none for a bullet product', () => {
    expect(pathScenarios(startingProduct, 100)).toEqual([])
  })
})
