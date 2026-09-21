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

  it('rejects invalid terms and final levels', () => {
    expect(validateNote({ ...note, principalAmount: 0 })).toContain('Principal must be greater than zero.')
    expect(validateNote({ ...note, determination: { kind: 'point-to-point', initialLevel: 0 } })).toContain('Initial level must be greater than zero.')
    expect(() => maturityPayment(note, -1)).toThrow('Final level must be zero or greater.')
  })
})
