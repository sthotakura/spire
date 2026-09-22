import { describe, expect, it } from 'vitest'
import { maturityPayment, validateNote, type ProtectedParticipationNote } from './note'

const note: ProtectedParticipationNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'equity-index', name: 'Synthetic Index' },
  determination: { kind: 'point-to-point', initialLevel: 100 },
  payoff: { kind: 'upside-participation', participationRate: 1.5, principalProtection: 1 },
  principalAmount: 1000,
}

describe('protected participation note', () => {
  it.each([
    [60, 1000],
    [100, 1000],
    [110, 1150],
    [130, 1450],
  ])('pays %s final level as %s units', (finalLevel, expected) => {
    expect(maturityPayment(note, finalLevel)).toBeCloseTo(expected, 8)
  })

  it.each([
    [{ ...note, underlier: { ...note.underlier, name: ' ' } }, 'Enter an underlier name.'],
    [{ ...note, principalAmount: 0 }, 'Principal must be greater than zero.'],
    [{ ...note, determination: { kind: 'point-to-point' as const, initialLevel: 0 } }, 'Initial level must be greater than zero.'],
    [{ ...note, payoff: { ...note.payoff, participationRate: 0 } }, 'Participation must be greater than zero.'],
  ])('rejects an invalid note term', (invalidNote, expectedError) => {
    expect(validateNote(invalidNote)).toContain(expectedError)
  })

  it('rejects invalid final levels', () => {
    expect(() => maturityPayment(note, -1)).toThrow('Final level must be zero or greater.')
    expect(() => maturityPayment(note, Number.NaN)).toThrow('Final level must be zero or greater.')
  })
})
