import { describe, expect, it } from 'vitest'
import { paymentAtEnd, redemptionOutcome } from '../domain/autocall'
import { basketBreakdown, basketStartingLevel, initialObservationCountOf, observationCountOf, paymentBreakdown, reviewDates, type DeterminedLevels, type Product } from '../domain/note'
import { couponClosingSteps, redemptionSteps } from './autocall'
import { calculationSteps } from './calculation'
import { sampleProducts } from './examples'
import { lineStages, scenarioAside } from './path'

type Closes = { lowestClose?: number; highestClose?: number }

// Every level a product reads in a scenario: the initial level, set to 100 or a basket's starting level, the final level, and a level
// on each review before the last. The calculation list is built as the app builds it, so stages can be checked against its titles.
function scenario(note: Product, final: number, review: number, issuerCallsOnReview?: number, closes: Closes = {}) {
  const initial = note.underlier.kind === 'basket' ? basketStartingLevel : note.underlier.determination.initial.kind === 'given' ? note.underlier.determination.initial.level : 100
  const finalLevel = final * initial / 100
  const observed = Array(observationCountOf(note.underlier.determination.final)).fill(finalLevel)
  const initialObservations = note.underlier.kind === 'single' ? Array(initialObservationCountOf(note.underlier.determination.initial)).fill(initial) : []
  const basket = note.underlier.kind === 'basket' ? basketBreakdown(note.underlier, note.underlier.components.map(() => observed)) : undefined
  const levels: DeterminedLevels = { initial, final: finalLevel, ...closes }
  const b = paymentBreakdown(note, levels)
  const reads = reviewDates(note).length > 0 || (note.redemption !== 'bullet' && note.redemption.kind === 'issuer-call' && note.coupon !== undefined)
  const outcome = note.redemption !== 'bullet' || note.coupon ? redemptionOutcome(note, reads ? reviewDates(note).slice(0, -1).map(() => review * initial / 100) : [], levels, issuerCallsOnReview) : undefined
  const maturity = calculationSteps(note, b, observed, initialObservations, basket)
  const titles = outcome ? [...redemptionSteps(note, outcome), ...maturity, ...couponClosingSteps(note, outcome)].map(({ title }) => title) : maturity.map(({ title }) => title)
  return { initial, levels, b, outcome, titles, stages: lineStages(note, b, levels) }
}

const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6)
const finals = [0, 30, 55, 69, 70, 85, 100, 112, 140, 190, 260]

// The checks every line meets, whatever the product and final level: it starts on the 1:1 line, ends at what the chart draws, and
// names steps the calculation lists. A product has the same stages, with the same words, at every final level.
function checkLines(note: Product, closes: (final: number) => Closes = () => ({})) {
  const shape = (stages: ReturnType<typeof lineStages>) => stages.map(({ step, concept, detail }) => [step, concept, detail])
  let first: ReturnType<typeof shape> | undefined
  for (const final of finals) {
    const { levels, b, outcome, titles, stages } = scenario(note, final, 20, undefined, closes(final))
    near(stages[0].amount, note.principalAmount * (1 + b.underlierReturn))
    near(stages[stages.length - 1].amount, paymentAtEnd(note, levels))
    for (const stage of stages) {
      expect(Number.isFinite(stage.amount)).toBe(true)
      // A product called on its last review lists no closing coupon step; the line still draws that coupon. The list has no step for
      // the call on the last review, which is a rule of the line, not how the scenario ended.
      if (stage.step === 'Call on the last review') expect(titles).not.toContain(stage.step)
      else if (!(stage.step === 'Paid at maturity' && outcome?.calledAtReview !== undefined)) expect(titles).toContain(stage.step)
    }
    first ??= shape(stages)
    expect(shape(stages)).toEqual(first)
  }
}

describe('the calculation path', () => {
  for (const { name, product } of sampleProducts) {
    it(`builds the payoff line of ${name}`, () => checkLines(product))
  }

  it('builds a buffered, capped note rule by rule', () => {
    const note: Product = {
      wrapper: 'note', principalAmount: 1000, term: { months: 12 }, redemption: 'bullet', underlier: sampleProducts[0].product.underlier,
      payoff: { participations: [{ direction: 'downside', rate: 1, buffer: 0.1 }, { direction: 'upside', rate: 1.5, cap: 0.2 }] },
    }
    const at = (final: number) => scenario(note, final, 0).stages.map(({ step, amount }) => [step, Math.round(amount * 100) / 100])
    expect(at(60)).toEqual([['Synthetic Index return', 600], ['Buffer', 700], ['Downside participation', 700], ['Upside participation', 700], ['Cap', 700], ['Payment at maturity', 700]])
    expect(at(120)).toEqual([['Synthetic Index return', 1200], ['Buffer', 1200], ['Downside participation', 1200], ['Upside participation', 1300], ['Cap', 1200], ['Payment at maturity', 1200]])
  })

  it('takes a principal-only note at a large rise back to principal', () => {
    const note: Product = { ...sampleProducts[0].product, wrapper: 'note', redemption: 'bullet', coupon: undefined, payoff: { participations: [] } }
    expect(scenario(note, 180, 0).stages.map(({ step, amount }) => [step, amount])).toEqual([
      ['Synthetic Index return', 1800], ['Downside participation', 1800], ['Upside participation', 1000], ['Payment at maturity', 1000],
    ])
  })

  // An autocall that calls on its last review, with a remembered coupon: the line draws the call and the last coupon, not the memory.
  const memory: Product = {
    wrapper: 'note', principalAmount: 1000, term: { months: 12 },
    redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, nonCallReviews: 0, triggerStep: 0, callAmount: 0, callAmountBasis: 'flat', callOnFinalReview: true },
    coupon: { schedule: { frequency: 'quarterly' }, rate: 0.08, barrier: 0.7, memory: true },
    underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
    payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }] },
  }
  it('closes with the call on the last review and its coupon', () => {
    checkLines(memory)
    const { levels, outcome, stages } = scenario(memory, 110, 50)
    expect(stages.slice(-3).map(({ step, amount }) => [step, amount])).toEqual([['Payment at maturity', 1000], ['Call on the last review', 1000], ['Paid at maturity', 1020]])
    expect(scenarioAside(memory, levels, outcome)).toBe('In this scenario it pays 1,080: it adds coupons remembered from earlier reviews, which the line does not show.')
  })

  // The list's Redemption step says the scenario was called on review 1; the line's call is the one on the last review, so the two
  // must not share a title, or choosing the step would show the other rule.
  it('keeps the call on the last review apart from an earlier call in the list', () => {
    const { titles, stages } = scenario(memory, 110, 120)
    expect(titles).toContain('Redemption')
    expect(stages.map(({ step }) => step)).not.toContain('Redemption')
    expect(stages.map(({ step }) => step)).toContain('Call on the last review')
  })

  it('says when the scenario pays what the line does not show', () => {
    // Called on the first review.
    const early = scenario(memory, 110, 120)
    expect(scenarioAside(memory, early.levels, early.outcome)).toBe('In this scenario it is called on review 1 and pays 1,020, which the line does not show.')
    // Not called, every coupon paid: the earlier ones are not on the line.
    const paid = scenario(memory, 90, 80)
    expect(scenarioAside(memory, paid.levels, paid.outcome)).toBe('It also pays 60 in coupons on earlier reviews.')
    // The issuer's call reads no level and is never on the line.
    const sample = sampleProducts.find(({ product }) => product.redemption !== 'bullet' && product.redemption.kind === 'issuer-call')!.product
    const issuer = scenario(sample, 100, 20, 2)
    expect(scenarioAside(sample, issuer.levels, issuer.outcome)).toMatch(/^In this scenario the issuer calls it on review 2 and pays [\d,.]+, which the line does not show\./)
  })

  // Synthetic features no sample has: barriers observed on every close, with a rebate and protection, and a deposit's minimum return.
  const single = sampleProducts.find(({ product }) => product.underlier.kind === 'single')!.product.underlier
  const daily: Product = {
    wrapper: 'note', principalAmount: 1000, term: { months: 12 }, redemption: 'bullet', underlier: single,
    payoff: {
      principalProtection: 0.8,
      participations: [
        { direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'daily-close' } },
        { direction: 'upside', rate: 0.9, barrier: { level: 1.3, observation: 'daily-close', rebate: 0.03 } },
      ],
    },
  }
  it('draws the line for barriers observed on every close, and says when a close reached one', () => {
    checkLines(daily)
    checkLines(daily, (final) => ({ lowestClose: Math.min(50, final), highestClose: Math.max(140, final) }))
    const quiet = scenario(daily, 90, 0, undefined, { lowestClose: 85, highestClose: 110 })
    expect(scenarioAside(daily, quiet.levels)).toBe('')
    const breached = scenario(daily, 90, 0, undefined, { lowestClose: 50, highestClose: 110 })
    expect(scenarioAside(daily, breached.levels)).toBe('In this scenario it pays 900: a close reached a barrier, which the line does not show.')
  })

  it('raises a deposit to its minimum return', () => {
    const deposit: Product = { wrapper: 'deposit', principalAmount: 1000, term: { months: 12 }, redemption: 'bullet', underlier: single, payoff: { minimumReturn: 0.02, participations: [{ direction: 'upside', rate: 0.5, cap: 0.2 }] } }
    checkLines(deposit)
    expect(scenario(deposit, 90, 0).stages.at(-2)).toMatchObject({ step: 'Minimum return', amount: 1020 })
  })
})
