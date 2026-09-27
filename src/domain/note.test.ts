import { describe, expect, it } from 'vitest'
import { maturityPayment, noteIssues, paymentBreakdown, validateNote, type ProtectedParticipationNote } from './note'

const note: ProtectedParticipationNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }],
    determination: { kind: 'point-to-point' },
  },
  payoff: {
    kind: 'participation',
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 1,
  },
  principalAmount: 1000,
}
const withComponent = (name: string, initialLevel: number): ProtectedParticipationNote => ({
  ...note,
  underlier: { ...note.underlier, components: [{ asset: { kind: 'equity-index', name }, initialLevel }] },
})

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
    [withComponent(' ', 100), 'Enter an underlier name.'],
    [{ ...note, principalAmount: 0 }, 'Principal must be greater than zero.'],
    [withComponent('Synthetic Index', 0), 'Initial level must be greater than zero.'],
    [{ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside' as const, rate: 0 }] } }, 'Upside participation must be greater than zero.'],
  ])('rejects an invalid note term', (invalidNote, expectedError) => {
    expect(validateNote(invalidNote)).toContain(expectedError)
  })

  it('rejects invalid final levels', () => {
    expect(() => maturityPayment(note, -1)).toThrow('Final level must be zero or greater.')
    expect(() => maturityPayment(note, Number.NaN)).toThrow('Final level must be zero or greater.')
  })

  it.each([
    [60, 900],
    [90, 900],
    [95, 950],
    [100, 1000],
    [110, 1150],
  ])('applies downside participation until the protection floor at %s', (finalLevel, expected) => {
    const partiallyProtectedNote: ProtectedParticipationNote = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.9,
      },
    }

    expect(maturityPayment(partiallyProtectedNote, finalLevel)).toBeCloseTo(expected, 8)
  })

  it('applies the configured downside participation rate before the floor', () => {
    const partiallyProtectedNote: ProtectedParticipationNote = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.5,
        participations: [
          { direction: 'downside', rate: 0.5 },
          { direction: 'upside', rate: 1.5 },
        ],
      },
    }

    expect(maturityPayment(partiallyProtectedNote, 80)).toBeCloseTo(900, 8)
  })

  it('allows a zero protection floor', () => {
    const unprotectedNote: ProtectedParticipationNote = {
      ...note,
      payoff: { ...note.payoff, principalProtection: 0 },
    }

    expect(maturityPayment(unprotectedNote, 0)).toBe(0)
  })

  it.each([
    [{ ...note, payoff: { ...note.payoff, principalProtection: -0.1 } }, 'Principal protection must be between 0% and 100%.'],
    [{ ...note, payoff: { ...note.payoff, principalProtection: 1.1 } }, 'Principal protection must be between 0% and 100%.'],
    [{ ...note, payoff: { ...note.payoff, participations: [{ direction: 'downside' as const, rate: 0 }] } }, 'Downside participation must be greater than zero.'],
  ])('rejects an invalid protection or downside term', (invalidNote, expectedError) => {
    expect(validateNote(invalidNote)).toContain(expectedError)
  })

  it('leaves negative returns unchanged when only upside participation is selected', () => {
    const upsideOnlyNote: ProtectedParticipationNote = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.9,
        participations: [{ direction: 'upside', rate: 1.5 }],
      },
    }

    expect(maturityPayment(upsideOnlyNote, 60)).toBe(1000)
    expect(maturityPayment(upsideOnlyNote, 110)).toBeCloseTo(1150, 8)
  })

  it('leaves positive returns unchanged when only downside participation is selected', () => {
    const downsideOnlyNote: ProtectedParticipationNote = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.9,
        participations: [{ direction: 'downside', rate: 1 }],
      },
    }

    expect(maturityPayment(downsideOnlyNote, 90)).toBeCloseTo(900, 8)
    expect(maturityPayment(downsideOnlyNote, 110)).toBe(1000)
  })

  it.each([
    [{ ...note, principalAmount: 0 }, 'principalAmount'],
    [withComponent(' ', 100), 'underlierName'],
    [withComponent('Synthetic Index', 0), 'initialLevel'],
    [{ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside' as const, rate: 0 }] } }, 'participations'],
    [{ ...note, payoff: { ...note.payoff, principalProtection: 1.1 } }, 'principalProtection'],
  ])('reports the field that owns an invalid term', (invalidNote, expectedField) => {
    expect(noteIssues(invalidNote).map(({ field }) => field)).toEqual([expectedField])
    expect(validateNote(invalidNote)).toEqual(noteIssues(invalidNote).map(({ message }) => message))
  })

  it('allows a note with no participation and no protection', () => {
    const principalOnlyNote: ProtectedParticipationNote = { ...note, payoff: { kind: 'participation', participations: [] } }

    expect(validateNote(principalOnlyNote)).toEqual([])
    for (const finalLevel of [0, 60, 100, 110, 130]) expect(maturityPayment(principalOnlyNote, finalLevel)).toBe(1000)
  })

  it('rejects a direction selected more than once', () => {
    expect(validateNote({
      ...note,
      payoff: {
        ...note.payoff,
        participations: [
          { direction: 'upside', rate: 1 },
          { direction: 'upside', rate: 1.5 },
        ],
      },
    })).toContain('Each participation direction can be selected only once.')
  })

  it('never pays below zero without protection', () => {
    const unprotectedNote: ProtectedParticipationNote = {
      ...note,
      payoff: { kind: 'participation', participations: [{ direction: 'downside', rate: 1.5 }] },
    }

    expect(maturityPayment(unprotectedNote, 60)).toBeCloseTo(400, 8)
    expect(maturityPayment(unprotectedNote, 20)).toBe(0)
    expect(maturityPayment(unprotectedNote, 0)).toBe(0)
  })

  it('treats absent and zero protection alike in payment but not in structure', () => {
    const absent: ProtectedParticipationNote = { ...note, payoff: { kind: 'participation', participations: [{ direction: 'downside', rate: 1 }] } }
    const zero: ProtectedParticipationNote = { ...absent, payoff: { ...absent.payoff, principalProtection: 0 } }

    for (const finalLevel of [0, 50, 100, 120]) expect(maturityPayment(absent, finalLevel)).toBe(maturityPayment(zero, finalLevel))
    expect(absent.payoff.principalProtection).toBeUndefined()
  })
})

describe('payment breakdown', () => {
  const protectedNote: ProtectedParticipationNote = { ...note, payoff: { ...note.payoff, principalProtection: 0.9 } }

  it('breaks a rise into its steps', () => {
    const breakdown = paymentBreakdown(protectedNote, 110)

    expect(breakdown.underlierReturn).toBeCloseTo(0.1, 8)
    expect(breakdown.direction).toBe('upside')
    expect(breakdown.participationRate).toBe(1.5)
    expect(breakdown.participatedReturn).toBeCloseTo(0.15, 8)
    expect(breakdown.unflooredPayment).toBeCloseTo(1150, 8)
    expect(breakdown.floor).toBeCloseTo(900, 8)
    expect(breakdown.floorApplies).toBe(false)
    expect(breakdown.payment).toBeCloseTo(1150, 8)
  })

  it('shows the floor applying after a fall', () => {
    const breakdown = paymentBreakdown(protectedNote, 60)

    expect(breakdown.direction).toBe('downside')
    expect(breakdown.participationRate).toBe(1)
    expect(breakdown.unflooredPayment).toBeCloseTo(600, 8)
    expect(breakdown.floorApplies).toBe(true)
    expect(breakdown.payment).toBeCloseTo(900, 8)
  })

  it('has a floor of zero and no rate for a note with no features', () => {
    const breakdown = paymentBreakdown({ ...note, payoff: { kind: 'participation', participations: [] } }, 110)

    expect(breakdown.participationRate).toBeUndefined()
    expect(breakdown.participatedReturn).toBe(0)
    expect(breakdown.floor).toBe(0)
    expect(breakdown.floorApplies).toBe(false)
    expect(breakdown.payment).toBe(1000)
  })

  it('agrees with the maturity payment and rejects what it rejects', () => {
    for (const finalLevel of [0, 40, 90, 100, 100.5, 130]) expect(paymentBreakdown(protectedNote, finalLevel).payment).toBe(maturityPayment(protectedNote, finalLevel))
    expect(() => paymentBreakdown(protectedNote, -1)).toThrow('Final level must be zero or greater.')
    expect(() => paymentBreakdown({ ...protectedNote, principalAmount: 0 }, 100)).toThrow('Principal must be greater than zero.')
  })
})

describe('cap', () => {
  const capped: ProtectedParticipationNote = { ...note, payoff: { ...note.payoff, principalProtection: 0.9, cap: 0.2 } }

  it.each([
    [60, 900],
    [100, 1000],
    [110, 1150],
    [113, 1195],
    [114, 1200],
    [130, 1200],
    [500, 1200],
  ])('pays %s final level as %s units with 150% upside participation and a 20% cap', (finalLevel, expected) => {
    expect(maturityPayment(capped, finalLevel)).toBeCloseTo(expected, 8)
  })

  it('limits the return on principal, so participation above 100% reaches the cap sooner', () => {
    const at100 = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'upside' as const, rate: 1 }] } }
    expect(maturityPayment(at100, 119)).toBeCloseTo(1190, 8)
    expect(maturityPayment(at100, 121)).toBeCloseTo(1200, 8)
  })

  it('never binds below the cap, whatever the participation rate', () => {
    const lowRate = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'upside' as const, rate: 0.1 }] } }
    expect(maturityPayment(lowRate, 300)).toBeCloseTo(1200, 8)
    expect(maturityPayment(lowRate, 160)).toBeCloseTo(1060, 8)
  })

  it('has no effect without upside participation or on a fall', () => {
    const downsideOnly = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'downside' as const, rate: 1 }] } }
    expect(maturityPayment(downsideOnly, 200)).toBe(1000)
    expect(maturityPayment(downsideOnly, 95)).toBeCloseTo(950, 8)
    expect(maturityPayment(capped, 60)).toBe(maturityPayment({ ...capped, payoff: { ...capped.payoff, cap: undefined } }, 60))
  })

  it('works without protection', () => {
    const unprotected = { ...capped, payoff: { ...capped.payoff, principalProtection: undefined } }
    expect(maturityPayment(unprotected, 130)).toBeCloseTo(1200, 8)
    expect(maturityPayment(unprotected, 60)).toBeCloseTo(600, 8)
  })

  it('breaks the cap into steps', () => {
    const atCap = paymentBreakdown(capped, 130)
    expect(atCap.uncappedPayment).toBeCloseTo(1450, 8)
    expect(atCap.capAmount).toBeCloseTo(1200, 8)
    expect(atCap.capApplies).toBe(true)
    expect(atCap.unflooredPayment).toBeCloseTo(1200, 8)
    expect(atCap.payment).toBeCloseTo(1200, 8)

    const belowCap = paymentBreakdown(capped, 110)
    expect(belowCap.capApplies).toBe(false)
    expect(belowCap.unflooredPayment).toBeCloseTo(1150, 8)
    expect(belowCap.uncappedPayment).toBe(belowCap.unflooredPayment)
  })

  it('leaves the cap out of the breakdown when the note has none', () => {
    const breakdown = paymentBreakdown(note, 130)
    expect(breakdown.capAmount).toBeUndefined()
    expect(breakdown.capApplies).toBe(false)
    expect(breakdown.payment).toBeCloseTo(1450, 8)
  })

  it.each([0, -0.1, Number.NaN, Number.POSITIVE_INFINITY])('rejects a cap of %s', (cap) => {
    const invalid = { ...note, payoff: { ...note.payoff, cap } }
    expect(validateNote(invalid)).toContain('Cap must be greater than zero.')
    expect(noteIssues(invalid).map(({ field }) => field)).toEqual(['cap'])
  })
})
