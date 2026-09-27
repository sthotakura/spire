import { describe, expect, it } from 'vitest'
import { fitLookbackObservations, fitObservations, shiftToAverage } from './observations'

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

describe('fitting levels observed after pricing to a count', () => {
  it('keeps the earliest dates when the count falls', () => {
    expect(fitLookbackObservations([97, 92, 95], 2)).toEqual([97, 92])
  })

  it('repeats the latest level on new, later dates when the count rises', () => {
    expect(fitLookbackObservations([97, 92], 4)).toEqual([97, 92, 92, 92])
  })

  it('leaves levels that already fit unchanged', () => {
    expect(fitLookbackObservations([97, 92, 95], 3)).toEqual([97, 92, 95])
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
