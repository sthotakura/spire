import { describe, expect, it } from 'vitest'
import { basketBreakdown, deliveryFrom, paymentBreakdown, validateProduct, type BasketUnderlier, type DeterminedLevels, type DownsideParticipation, type Product } from '../domain/note'
import { calculationSteps } from './calculation'
import { sampleBySlug } from './examples'
import { paymentFormula } from './formula'
import { marketingNames } from './names'
import { deliveryStep, explainDelivery, settlementFormula } from './settlement'
import { structureLines } from './structure-json'
import { summarize } from './summary'

const delivering = (downside: Omit<DownsideParticipation, 'direction'>, settlement: NonNullable<Product['settlement']> = 'delivery'): Product => ({
  wrapper: 'note',
  principalAmount: 1000,
  term: { months: 12 },
  redemption: 'bullet',
  coupon: { schedule: { frequency: 'quarterly' }, rate: 0.1 },
  settlement,
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity', name: 'Stock A' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: [{ direction: 'downside', ...downside }] },
})
const worstOf: BasketUnderlier = {
  kind: 'basket',
  components: [{ asset: { kind: 'equity', name: 'Stock A' } }, { asset: { kind: 'equity', name: 'Stock B' } }],
  determination: { initial: { kind: 'given', levels: [{ asset: 'Stock A', level: 200 }, { asset: 'Stock B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
}
const barrier = { barrier: { level: 0.45, observation: 'final' as const }, rate: 1 }
const deliveryAt = (note: Product, levels: DeterminedLevels) => deliveryFrom(note, paymentBreakdown(note, levels), levels.final)
const text = (note: Product) => summarize(note).map(({ text: part }) => part).join('')

describe('what the holder is told they receive', () => {
  it('states the shares and their value, and any cash', () => {
    const shares = delivering(barrier)
    expect(explainDelivery(shares, deliveryAt(shares, { initial: 100, final: 40 }))).toBe('The holder receives 10 shares of Stock A, worth 400 at its final level of 40.')
    const buffered = delivering({ buffer: 0.2, rate: 1 })
    expect(explainDelivery(buffered, deliveryAt(buffered, { initial: 100, final: 75 }))).toBe('The holder receives 10 shares of Stock A, worth 750 at its final level of 75, and 200 in cash.')
  })

  it('states a share count that is not whole to four places', () => {
    const geared = delivering({ buffer: 0.1, rate: 1 / 0.9 })
    expect(explainDelivery(geared, deliveryAt(geared, { initial: 100, final: 80 }))).toContain('11.1111 shares of Stock A, worth 888.89')
  })

  it('says the payment is in cash where nothing is delivered', () => {
    const note = delivering(barrier)
    expect(explainDelivery(note, deliveryAt(note, { initial: 100, final: 60 }))).toBe('The payment is in cash, because the holder bears no fall here.')
  })

  it('says nothing for a product settled in cash', () => {
    expect(explainDelivery(delivering(barrier, 'cash'), undefined)).toBe('')
    const { settlement: _settlement, ...unstated } = delivering(barrier)
    expect(explainDelivery(unstated, undefined)).toBe('')
  })
})

describe('the calculation', () => {
  const stepsOf = (note: Product, final: number) => calculationSteps(note, paymentBreakdown(note, { initial: 100, final }), [final], [])
  const settlementStep = (note: Product, final: number) => stepsOf(note, final).find(({ title }) => title === 'Settlement')

  it('adds a step after the payment, stating how the count is reached', () => {
    const steps = stepsOf(delivering({ buffer: 0.2, rate: 1 }), 75)
    const titles = steps.map(({ title }) => title)
    expect(titles.indexOf('Settlement')).toBe(titles.indexOf('Payment at maturity') + 1)
    expect(steps.find(({ title }) => title === 'Settlement')).toMatchObject({ how: '1,000 × 100% ÷ 100 = 10 shares of Stock A, worth 750 at 75, and 200 in cash', value: '10 shares', concept: 'settlement' })
  })

  it('mutes the step where the payment is in cash', () => {
    expect(settlementStep(delivering(barrier), 60)).toMatchObject({ value: 'Cash', muted: true })
  })

  it('has no step for a product settled in cash', () => {
    expect(settlementStep(delivering(barrier, 'cash'), 40)).toBeUndefined()
    const { settlement: _settlement, ...unstated } = delivering(barrier)
    expect(settlementStep(unstated, 40)).toBeUndefined()
  })

  it('reads the worst asset of a basket, by its own initial level', () => {
    const note: Product = { ...delivering(barrier), underlier: worstOf }
    const basket = basketBreakdown(worstOf, [[150], [20]])
    const step = calculationSteps(note, paymentBreakdown(note, basket.levels), [], [], basket).find(({ title }) => title === 'Settlement')
    expect(step?.how).toBe('1,000 × 100% ÷ 50 = 20 shares of Stock B, worth 400 at 20')
    expect(deliveryStep(note, deliveryFrom(note, paymentBreakdown(note, basket.levels), basket.levels.final, basket))).toMatchObject({ value: '20 shares' })
  })
})

describe('the delivery rule', () => {
  const rule = (note: Product) => settlementFormula(note).flatMap(({ segments }) => segments.map(({ text: part }) => part)).join('')

  it('states the count, and cash only when a term leaves some', () => {
    expect(rule(delivering(barrier))).toBe('Where the holder bears a fall, deliver Principal × Downside rate ÷ Initial level shares')
    expect(rule(delivering({ buffer: 0.1, rate: 1 / 0.9 }))).not.toContain('cash')
    expect(rule(delivering({ buffer: 0.2, rate: 1 }))).toContain('and pay Principal × (1 − Downside rate × (1 − Buffer)) in cash')
    expect(rule(delivering({ rate: 0.5 }))).toContain('and pay Principal × (1 − Downside rate) in cash')
  })

  it('names the worst asset of a basket', () => {
    expect(rule({ ...delivering(barrier), underlier: worstOf })).toContain('shares of the worst asset, by its own initial level')
  })

  it('has no line for a product settled in cash, and leaves the payment rule as it is', () => {
    expect(settlementFormula(delivering(barrier, 'cash'))).toEqual([])
    expect(paymentFormula(delivering(barrier))).toEqual(paymentFormula(delivering(barrier, 'cash')))
  })
})

describe('the summary, JSON and names', () => {
  it('states delivery in the summary, with its own concept', () => {
    expect(text(delivering(barrier))).toContain('Where the holder bears a fall, it delivers shares of Stock A.')
    expect(summarize({ ...delivering(barrier), underlier: worstOf }).find(({ concept }) => concept === 'settlement')?.text).toBe('delivers shares of the worst asset')
  })

  it('says nothing of settlement in the summary of a product settled in cash', () => {
    expect(text(delivering(barrier, 'cash'))).not.toContain('deliver')
  })

  it('tags the JSON line with its concept', () => {
    expect(structureLines(delivering(barrier)).find(({ text: line }) => line.includes('"settlement"'))).toEqual({ text: '  "settlement": "delivery",', concept: 'settlement' })
  })

  it('says a reverse convertible delivers shares when it does', () => {
    const delivered = marketingNames(delivering(barrier)).find(({ name }) => name === 'Barrier reverse convertible')
    expect(delivered?.reason).toContain('Otherwise it delivers shares of the underlier, worth the payment shown on the final date.')
    const cash = marketingNames(delivering(barrier, 'cash')).find(({ name }) => name === 'Barrier reverse convertible')
    expect(cash?.reason).toContain('Otherwise issuers settle in cash or in shares')
  })
})

// The filings' own terms, on synthetic stocks starting at 100.
describe('the delivering samples', () => {
  it.each([
    ['worst-of-reverse-convertible', 'Reverse convertible', 33],
    ['autocallable-worst-of-barrier-reverse-convertible', 'Barrier reverse convertible', 24],
  ])('%s is valid, delivers and shows its name', (slug, name, months) => {
    const { product } = sampleBySlug(slug)!
    expect(validateProduct(product)).toEqual([])
    expect(product).toMatchObject({ settlement: 'delivery', term: { months } })
    expect(marketingNames(product).map((entry) => entry.name)).toContain(name)
  })

  it('reads the Vontobel note: below a strike of 80%, shares of the worst stock', () => {
    const { product } = sampleBySlug('worst-of-reverse-convertible')!
    const underlier = product.underlier as BasketUnderlier
    const basket = basketBreakdown(underlier, [[110], [60], [90]])
    const delivery = deliveryFrom(product, paymentBreakdown(product, basket.levels), basket.levels.final, basket)!
    expect(delivery.asset).toBe('Stock B')
    expect(delivery.shares).toBeCloseTo(12.5, 9)
    expect(delivery.cash).toBe(0)
    expect(paymentBreakdown(product, basket.levels).payment).toBeCloseTo(750, 9)
    const atStrike = basketBreakdown(underlier, [[110], [80], [90]])
    expect(deliveryFrom(product, paymentBreakdown(product, atStrike.levels), atStrike.levels.final, atStrike)).toBeUndefined()
  })

  it('reads the Credit Suisse note: its example of 40 is 10 shares worth 400', () => {
    const { product } = sampleBySlug('autocallable-worst-of-barrier-reverse-convertible')!
    const underlier = product.underlier as BasketUnderlier
    const basket = basketBreakdown(underlier, [[120], [40]])
    const delivery = deliveryFrom(product, paymentBreakdown(product, basket.levels), basket.levels.final, basket)!
    expect(delivery).toMatchObject({ asset: 'Stock B', cash: 0, finalLevel: 40 })
    expect(delivery.shares).toBeCloseTo(10, 9)
    const above = basketBreakdown(underlier, [[120], [45]])
    expect(deliveryFrom(product, paymentBreakdown(product, above.levels), above.levels.final, above)).toBeUndefined()
  })
})
