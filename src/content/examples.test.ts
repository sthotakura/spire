import { describe, expect, it } from 'vitest'
import { startingProduct } from '../domain/starting-note'
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

  it('opens no sample as the starting note', () => {
    expect(sampleProducts.some(({ product }) => sameProduct(product, startingProduct))).toBe(false)
  })
})
