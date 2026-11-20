import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { startingProduct } from '../domain/starting-note'
import { redemptionOutcome } from '../domain/autocall'
import { deliveryFrom, paymentBreakdown, reviewDates } from '../domain/note'
import { sameProduct, sampleBySlug, sampleGroups, sampleProducts } from './examples'

describe('sample products', () => {
  it('gives each sample its own address', () => {
    const slugs = sampleProducts.map(({ slug }) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives each sample its own name, and each group at least one sample', () => {
    expect(new Set(sampleProducts.map(({ name }) => name)).size).toBe(sampleProducts.length)
    for (const { samples } of sampleGroups) expect(samples.length).toBeGreaterThan(0)
  })

  it('finds a sample by its slug, and nothing for another value', () => {
    expect(sampleBySlug('barrier-absolute-return-note')?.name).toBe('Barrier absolute return note')
    expect(sampleBySlug('no-such-sample')).toBeUndefined()
    expect(sampleBySlug(undefined)).toBeUndefined()
    expect(sampleBySlug(['barrier-absolute-return-note'])).toBeUndefined()
  })

  it('compares products by their terms, not their key order or undefined keys', () => {
    expect(sameProduct({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1, d: undefined })).toBe(true)
    expect(sameProduct({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameProduct({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(sameProduct({ a: 1 }, { a: 1, b: 0 })).toBe(false)
    expect(sameProduct({ a: 1 / 0.85 }, { a: 1.17647059 })).toBe(true)
    expect(sameProduct({ a: 1.1 }, { a: 1.10001 })).toBe(false)
    expect(sameProduct(startingProduct, JSON.parse(JSON.stringify(startingProduct)))).toBe(true)
  })

  it('names the same public product and link as the table in docs/sample-products.md', () => {
    const table = readFileSync('docs/sample-products.md', 'utf8')
    for (const { name, source } of sampleProducts) {
      const row = table.split('\n').find((line) => line.startsWith(`| ${name} | `))
      expect(row, name).toContain(`| ${source.title} ([`)
      expect(row, name).toContain(`](${source.url})) |`)
    }
  })

  it('opens no sample as the starting note', () => {
    expect(sampleProducts.some(({ product }) => sameProduct(product, startingProduct))).toBe(false)
  })
})

// The 2036 Citigroup note's own examples and call table, on a hypothetical initial level of 100.
describe('the long-dated snowball autocallable buffered note', () => {
  const { product } = sampleBySlug('long-dated-snowball-autocallable-buffered-note')!
  const notCalled = Array.from({ length: 36 }, () => 90)

  it('has 37 reviews, quarterly from month 12', () => {
    expect(reviewDates(product).map(({ month }) => month)).toEqual(Array.from({ length: 37 }, (_, index) => 12 + 3 * index))
  })

  it.each([[370, 2700], [80, 1000], [30, 700], [0, 400]])('a final level of %s pays %s at maturity', (final, payment) => {
    expect(redemptionOutcome(product, notCalled, { initial: 100, final }).payment).toBeCloseTo(payment, 9)
  })

  it.each([[1, 12, 1170], [36, 117, 2657.5]])('pays the filing\'s call price on review %s, in month %s: %s', (review, months, payment) => {
    const outcome = redemptionOutcome(product, notCalled.map((level, index) => (index + 1 === review ? 100 : level)), { initial: 100, final: 90 })
    expect(outcome).toMatchObject({ calledAtReview: review, months })
    expect(outcome.payment).toBeCloseTo(payment, 9)
  })
})

// The Barclays level-pay amortizing note's pricing supplement: its last 120 payments of $100.00, which end on the rows it prints.
describe('the level-pay amortizing note', () => {
  const { product } = sampleBySlug('level-pay-amortizing-note')!
  const instalments = redemptionOutcome(product, [], { initial: 100, final: 100 }).instalments!
  const cents = (value: number) => Math.round(value * 100) / 100

  it('pays 100.00 a month for 120 months', () => {
    expect(instalments).toHaveLength(120)
    expect(instalments.every(({ amount }) => cents(amount) === 100)).toBe(true)
  })

  it('ends on the filing\'s last four rows', () => {
    expect(instalments.slice(-4).map(({ outstanding, coupon, principal, remaining }) => [outstanding, coupon, principal, remaining].map(cents))).toEqual([
      [397.02, 1.19, 98.81, 298.21],
      [298.21, 0.89, 99.11, 199.11],
      [199.11, 0.6, 99.4, 99.7],
      [99.7, 0.3, 99.7, 0],
    ])
  })
})

// The TD note on a fund, as published: the digital return at or above 90% of the initial level, and below it fund shares for principal ÷
// the buffer price. These read the sample itself, so a change to it that moved the switch between cash and shares would show here.
describe('the buffered digital note delivering fund shares', () => {
  const { product } = sampleBySlug('buffered-digital-note-delivering-fund-shares')!
  const settle = (final: number) => {
    const breakdown = paymentBreakdown(product, { initial: 100, final })
    return { payment: breakdown.payment, delivery: deliveryFrom(product, breakdown, final) }
  }

  it('delivers 1,000 ÷ 90 fund shares and no cash just below 90%', () => {
    const { payment, delivery } = settle(89.99)
    expect(delivery).toEqual({ asset: 'Synthetic Fund', shares: expect.closeTo(11.1111, 4), cash: 0, initialLevel: 100, finalLevel: 89.99 })
    expect(payment).toBeCloseTo(delivery!.shares * 89.99, 9)
  })

  it('pays 1,080 in cash at and just above 90%', () => {
    for (const final of [90, 90.01]) expect(settle(final)).toEqual({ payment: expect.closeTo(1080, 9), delivery: undefined })
  })
})
