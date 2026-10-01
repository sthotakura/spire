import { describe, expect, it } from 'vitest'
import { maturityPayment, validateProduct, type Product } from './note'
import { firstFeatureValues, startingFinalLevel, startingProduct } from './starting-note'

describe('starting note', () => {
  it('is valid and has no payoff features', () => {
    expect(validateProduct(startingProduct)).toEqual([])
    expect(startingProduct.payoff.participations).toEqual([])
    expect(startingProduct.payoff.principalProtection).toBeUndefined()
  })

  it.each([0, 60, 100, startingFinalLevel, 130])('repays principal at a final level of %s', (finalLevel) => {
    expect(maturityPayment(startingProduct, { initial: 100, final: finalLevel })).toBe(startingProduct.principalAmount)
  })

  it('stays valid when each feature is added with its first value', () => {
    const withEveryFeature: Product = {
      ...startingProduct,
      payoff: {
        participations: [
          { direction: 'downside', buffer: firstFeatureValues.buffer / 100, rate: firstFeatureValues.downside / 100 },
          { direction: 'upside', rate: firstFeatureValues.upside / 100, cap: firstFeatureValues.cap / 100 },
        ],
        principalProtection: firstFeatureValues.protection / 100,
      },
    }

    expect(validateProduct(withEveryFeature)).toEqual([])
    expect(maturityPayment(withEveryFeature, { initial: 100, final: 60 })).toBeCloseTo(900, 8)
    expect(maturityPayment(withEveryFeature, { initial: 100, final: 110 })).toBeCloseTo(1100, 8)
  })
})
