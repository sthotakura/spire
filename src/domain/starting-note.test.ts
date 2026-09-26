import { describe, expect, it } from 'vitest'
import { maturityPayment, validateNote, type ProtectedParticipationNote } from './note'
import { firstFeatureValues, startingFinalLevel, startingNote } from './starting-note'

describe('starting note', () => {
  it('is valid and has no payoff features', () => {
    expect(validateNote(startingNote)).toEqual([])
    expect(startingNote.payoff.participations).toEqual([])
    expect(startingNote.payoff.principalProtection).toBeUndefined()
  })

  it.each([0, 60, 100, startingFinalLevel, 130])('repays principal at a final level of %s', (finalLevel) => {
    expect(maturityPayment(startingNote, finalLevel)).toBe(startingNote.principalAmount)
  })

  it('stays valid when each feature is added with its first value', () => {
    const withEveryFeature: ProtectedParticipationNote = {
      ...startingNote,
      payoff: {
        kind: 'participation',
        participations: [
          { direction: 'downside', rate: firstFeatureValues.downside / 100 },
          { direction: 'upside', rate: firstFeatureValues.upside / 100 },
        ],
        principalProtection: firstFeatureValues.protection / 100,
      },
    }

    expect(validateNote(withEveryFeature)).toEqual([])
    expect(maturityPayment(withEveryFeature, 60)).toBeCloseTo(900, 8)
    expect(maturityPayment(withEveryFeature, 110)).toBeCloseTo(1100, 8)
  })
})
