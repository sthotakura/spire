import { describe, expect, it } from 'vitest'
import type { FloatingRate } from '../domain/note'
import { couponRateDescription, couponRateLine, rateTicks } from './coupon-rate'

const rate = (terms: Partial<FloatingRate> = {}): FloatingRate => ({ reference: 'Synthetic overnight rate', spread: 0.0275, floor: 0, ...terms })
const rounded = (points: Array<{ reference: number; rate: number }>) => points.map(({ reference, rate: r }) => [Math.round(reference * 1e6) / 1e6, Math.round(r * 1e6) / 1e6])

describe('the coupon rate line', () => {
  it('is flat at the floor until the floor minus the spread, then rises one for one, for the Citi terms', () => {
    const line = couponRateLine(rate())
    expect([line.low, line.high]).toEqual([-0.05, 0.1])
    expect(rounded(line.points)).toEqual([[-0.05, 0], [-0.0275, 0], [0.1, 0.1275]])
    expect(line.floorEnds).toBeCloseTo(-0.0275, 12)
    expect(line.capStarts).toBeUndefined()
    expect(line.top).toBeCloseTo(0.14, 12)
  })

  it('is flat at a cap from the cap minus the spread', () => {
    const line = couponRateLine(rate({ cap: 0.07 }))
    expect(rounded(line.points)).toEqual([[-0.05, 0], [-0.0275, 0], [0.0425, 0.07], [0.1, 0.07]])
    expect(line.capStarts).toBeCloseTo(0.0425, 12)
    expect(line.top).toBeCloseTo(0.08, 12)
  })

  it('widens to every reference rate the scenario states and to a corner beyond the usual range', () => {
    expect(couponRateLine(rate(), [0.04, 0.153]).high).toBeCloseTo(0.16, 12)
    expect(couponRateLine(rate(), [-0.05]).low).toBeCloseTo(-0.05, 12)
    const line = couponRateLine(rate({ floor: 0.2, spread: -0.1 }))
    expect(line.high).toBeCloseTo(0.31, 12)
    expect(rounded(line.points)).toEqual([[-0.05, 0.2], [0.3, 0.2], [0.31, 0.21]])
  })

  it('draws the reference rate plus the spread with no bounds from one end to the other', () => {
    expect(rounded(couponRateLine(rate({ cap: 0.07 })).unbounded)).toEqual([[-0.05, -0.0225], [0.1, 0.1275]])
  })
})

describe('the axis ticks', () => {
  it('step by 1%, 2% or 5% so there are at most eight', () => {
    expect(rateTicks(-0.05, 0.1)).toEqual([-0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08, 0.1])
    expect(rateTicks(0, 0.08)).toEqual([0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08])
    expect(rateTicks(-0.05, 0.31)).toEqual([-0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3])
  })
})

describe('the description', () => {
  it('says where the floor and the cap hold', () => {
    expect(couponRateDescription(rate({ cap: 0.07 }))).toBe('Coupon rate against the reference rate: 0% up to a reference rate of −2.75%, then the reference rate plus 2.75%, up to 7% from a reference rate of 4.25%.')
    expect(couponRateDescription(rate({ spread: -0.005, floor: 0.001 }))).toBe('Coupon rate against the reference rate: 0.1% up to a reference rate of 0.6%, then the reference rate minus 0.5%, with no maximum.')
  })
})
