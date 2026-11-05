import { describe, expect, it } from 'vitest'
import { maturityPayment, paymentBreakdown, productIssues, type Participation, type Product } from './note'
import { startingProduct } from './starting-note'

// Filings' figures are held to their tables, on a starting value of 100. The synthetic example is in docs/participation-above-digital.md.
const note = (downside: Participation | undefined, rate: number, amount: number, barrier: number, overrides: Partial<Product> = {}): Product => ({
  ...startingProduct,
  payoff: {
    participations: [...(downside ? [downside] : []), { direction: 'upside', rate, measuredFrom: 'digital-return' }],
    digitalReturn: { amount, barrier: { level: barrier, observation: 'final' } },
  },
  ...overrides,
})
const pays = (product: Product, final: number) => maturityPayment(product, { initial: 100, final })
const fromInitial = (product: Product): Product => ({ ...product, payoff: { ...product.payoff, participations: product.payoff.participations.map((p) => (p.direction === 'upside' ? { direction: 'upside', rate: p.rate } : p)) } })

const barrier70: Participation = { direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'final' } }
const barrier80: Participation = { direction: 'downside', rate: 1, barrier: { level: 0.8, observation: 'final' } }
const buffer15: Participation = { direction: 'downside', rate: 1, buffer: 0.15 }

describe('the tables in the filings', () => {
  it.each([
    [180, 1920], [165, 1695], [157, 1575], [156, 1560], [150, 1560], [130, 1560], [101, 1560], [100, 1560],
    [99.99, 1000], [80, 1000], [70, 1000], [69.99, 699.9], [40, 400], [0, 0],
  ])('JPMorgan 2025, a 56%% digital return at 100%%, 150%% and a 70%% barrier: %d pays %d', (final, payment) => {
    expect(pays(note(barrier70, 1.5, 0.56, 1), final)).toBeCloseTo(payment, 6)
  })

  it.each([
    [180, 2110], [165, 1810], [150, 1510], [149, 1490], [140, 1490], [100, 1490], [90, 1490], [85, 1490], [80, 950], [50, 650], [0, 150],
  ])('JPMorgan 2026, a 49%% digital return down to 85, 200%% and a 15%% buffer: %d pays %d', (final, payment) => {
    expect(pays(note(buffer15, 2, 0.49, 0.85), final)).toBeCloseTo(payment, 6)
  })

  it.each([
    [165, 1672.75], [150, 1515.925], [120, 1202.275], [116, 1160.455], [115, 1150], [110, 1150], [85, 1150], [80, 950], [0, 150],
  ])('JPMorgan 2022, a 15%% digital return down to 85, 104.55%% and a 15%% buffer: %d pays %d', (final, payment) => {
    expect(pays(note(buffer15, 1.0455, 0.15, 0.85), final)).toBeCloseTo(payment, 6)
  })

  it.each([
    [250, 2767.5], [240, 2617.5], [220, 2317.5], [200, 2017.5], [196.5, 1965], [160, 1965], [100, 1965], [90, 1000], [80, 1000], [79.99, 799.9], [50, 500], [0, 0],
  ])('BofA 2026, a 96.5%% digital return at 100%%, 150%% and an 80%% barrier: %d pays %d', (final, payment) => {
    expect(pays(note(barrier80, 1.5, 0.965, 1), final)).toBeCloseTo(payment, 6)
  })
})

describe('the two forms', () => {
  const measured = note(barrier70, 1.5, 0.2, 1)

  it.each([
    [69, 690, 690], [70, 1000, 1000], [99, 1000, 1000], [100, 1200, 1200], [110, 1200, 1200], [120, 1200, 1300], [140, 1500, 1600], [160, 1800, 1900],
  ])('the worked example: %d pays %d measured from the digital return and %d from the initial level', (final, fromDigital, fromStart) => {
    expect(pays(measured, final)).toBeCloseTo(fromDigital, 6)
    expect(pays(fromInitial(measured), final)).toBeCloseTo(fromStart, 6)
  })

  it('are the same payoff at a rate of 100%', () => {
    const one = note(barrier70, 1, 0.2, 1)
    for (let final = 0; final <= 200; final += 2.5) expect(pays(one, final)).toBeCloseTo(pays(fromInitial(one), final), 6)
  })

  it('has no jump at the threshold', () => {
    const at = pays(measured, 120)
    expect(pays(measured, 120.0001)).toBeCloseTo(at, 2)
    expect(pays(measured, 119.9999)).toBe(at)
  })

  it('reports the threshold, and only when measured from the digital return', () => {
    expect(paymentBreakdown(measured, { initial: 100, final: 90 }).upsideThresholdLevel).toBe(120)
    expect(paymentBreakdown(measured, { initial: 250, final: 90 }).upsideThresholdLevel).toBe(300)
    expect(paymentBreakdown(fromInitial(measured), { initial: 100, final: 90 }).upsideThresholdLevel).toBeUndefined()
  })
})

describe('combinations', () => {
  it('needs a digital return', () => {
    const product: Product = { ...startingProduct, payoff: { participations: [{ direction: 'upside', rate: 1.5, measuredFrom: 'digital-return' }] } }
    expect(productIssues(product).map(({ field }) => field)).toContain('participations')
  })

  it('is capped on the whole payment', () => {
    const capped: Product = { ...startingProduct, payoff: { participations: [{ direction: 'upside', rate: 1.5, measuredFrom: 'digital-return', cap: 0.5 }], digitalReturn: { amount: 0.2, barrier: { level: 1, observation: 'final' } } } }
    expect(pays(capped, 120)).toBeCloseTo(1200, 6)
    expect(pays(capped, 140)).toBeCloseTo(1500, 6)
    expect(pays(capped, 190)).toBeCloseTo(1500, 6)
  })

  it('reads the determined levels, so a higher initial level moves the threshold', () => {
    const measured = note(barrier70, 1.5, 0.2, 1)
    expect(maturityPayment(measured, { initial: 200, final: 280 })).toBeCloseTo(1500, 6)
  })
})
