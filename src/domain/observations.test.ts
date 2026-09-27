import { describe, expect, it } from 'vitest'
import { fitObservations, shiftToAverage } from './observations'

describe('fitting observed levels to a count', () => {
  it('keeps the latest dates when the count falls', () => {
    expect(fitObservations([90, 100, 110], 1)).toEqual([110])
  })

  it('repeats the earliest level on new, earlier dates when the count rises', () => {
    expect(fitObservations([110], 3)).toEqual([110, 110, 110])
    expect(fitObservations([90, 110], 4)).toEqual([90, 90, 90, 110])
  })

  it('leaves levels that already fit unchanged', () => {
    expect(fitObservations([90, 110], 2)).toEqual([90, 110])
  })
})

describe('shifting observed levels to an average', () => {
  it('moves every level by the same amount', () => {
    expect(shiftToAverage([90, 100, 110], 120)).toEqual([110, 120, 130])
  })

  it('moves by whole units, so whole levels stay whole', () => {
    expect(shiftToAverage([100, 101, 103], 105)).toEqual([104, 105, 107])
  })

  it('sets a single level to the target', () => {
    expect(shiftToAverage([110], 80)).toEqual([80])
  })

  it('does not take a level below zero', () => {
    expect(shiftToAverage([10, 50], 0)).toEqual([0, 20])
  })
})
