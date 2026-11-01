import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { startingProduct } from '../domain/starting-note'
import { redemptionOutcome } from '../domain/autocall'
import { reviewDates } from '../domain/note'
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
