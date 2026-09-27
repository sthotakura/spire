import { describe, expect, it } from 'vitest'
import { finalLevelFrom, initialLevelFrom, maturityPayment, noteIssues, paymentBreakdown, validateNote, type ProtectedParticipationNote } from './note'

const note: ProtectedParticipationNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }],
    determination: { initial: { kind: 'given' }, final: { kind: 'final-date' } },
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
    expect(maturityPayment(note, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it.each([
    [withComponent(' ', 100), 'Enter an underlier name.'],
    [{ ...note, principalAmount: 0 }, 'Principal must be greater than zero.'],
    [withComponent('Synthetic Index', 0), 'Initial level must be greater than zero.'],
    [{ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside' as const, rate: 0 }] } }, 'Upside participation must be greater than zero.'],
  ])('rejects an invalid note term', (invalidNote, expectedError) => {
    expect(validateNote(invalidNote)).toContain(expectedError)
  })

  it('measures the return from the initial level it is given', () => {
    // 100 ÷ 80 − 1 = +25%, at 150% upside participation.
    expect(maturityPayment(note, { initial: 80, final: 100 })).toBeCloseTo(1375, 8)
  })

  it('rejects invalid initial levels', () => {
    for (const initial of [0, -1, Number.NaN]) expect(() => maturityPayment(note, { initial, final: 100 })).toThrow('Initial level must be greater than zero.')
  })

  it('rejects invalid final levels', () => {
    expect(() => maturityPayment(note, { initial: 100, final: -1 })).toThrow('Final level must be zero or greater.')
    expect(() => maturityPayment(note, { initial: 100, final: Number.NaN })).toThrow('Final level must be zero or greater.')
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

    expect(maturityPayment(partiallyProtectedNote, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
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

    expect(maturityPayment(partiallyProtectedNote, { initial: 100, final: 80 })).toBeCloseTo(900, 8)
  })

  it('allows a zero protection floor', () => {
    const unprotectedNote: ProtectedParticipationNote = {
      ...note,
      payoff: { ...note.payoff, principalProtection: 0 },
    }

    expect(maturityPayment(unprotectedNote, { initial: 100, final: 0 })).toBe(0)
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

    expect(maturityPayment(upsideOnlyNote, { initial: 100, final: 60 })).toBe(1000)
    expect(maturityPayment(upsideOnlyNote, { initial: 100, final: 110 })).toBeCloseTo(1150, 8)
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

    expect(maturityPayment(downsideOnlyNote, { initial: 100, final: 90 })).toBeCloseTo(900, 8)
    expect(maturityPayment(downsideOnlyNote, { initial: 100, final: 110 })).toBe(1000)
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
    for (const finalLevel of [0, 60, 100, 110, 130]) expect(maturityPayment(principalOnlyNote, { initial: 100, final: finalLevel })).toBe(1000)
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

    expect(maturityPayment(unprotectedNote, { initial: 100, final: 60 })).toBeCloseTo(400, 8)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 20 })).toBe(0)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 0 })).toBe(0)
  })

  it('treats absent and zero protection alike in payment but not in structure', () => {
    const absent: ProtectedParticipationNote = { ...note, payoff: { kind: 'participation', participations: [{ direction: 'downside', rate: 1 }] } }
    const zero: ProtectedParticipationNote = { ...absent, payoff: { ...absent.payoff, principalProtection: 0 } }

    for (const finalLevel of [0, 50, 100, 120]) expect(maturityPayment(absent, { initial: 100, final: finalLevel })).toBe(maturityPayment(zero, { initial: 100, final: finalLevel }))
    expect(absent.payoff.principalProtection).toBeUndefined()
  })
})

describe('payment breakdown', () => {
  const protectedNote: ProtectedParticipationNote = { ...note, payoff: { ...note.payoff, principalProtection: 0.9 } }

  it('breaks a rise into its steps', () => {
    const breakdown = paymentBreakdown(protectedNote, { initial: 100, final: 110 })

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
    const breakdown = paymentBreakdown(protectedNote, { initial: 100, final: 60 })

    expect(breakdown.direction).toBe('downside')
    expect(breakdown.participationRate).toBe(1)
    expect(breakdown.unflooredPayment).toBeCloseTo(600, 8)
    expect(breakdown.floorApplies).toBe(true)
    expect(breakdown.payment).toBeCloseTo(900, 8)
  })

  it('has a floor of zero and no rate for a note with no features', () => {
    const breakdown = paymentBreakdown({ ...note, payoff: { kind: 'participation', participations: [] } }, { initial: 100, final: 110 })

    expect(breakdown.participationRate).toBeUndefined()
    expect(breakdown.participatedReturn).toBe(0)
    expect(breakdown.floor).toBe(0)
    expect(breakdown.floorApplies).toBe(false)
    expect(breakdown.payment).toBe(1000)
  })

  it('agrees with the maturity payment and rejects what it rejects', () => {
    for (const finalLevel of [0, 40, 90, 100, 100.5, 130]) expect(paymentBreakdown(protectedNote, { initial: 100, final: finalLevel }).payment).toBe(maturityPayment(protectedNote, { initial: 100, final: finalLevel }))
    expect(() => paymentBreakdown(protectedNote, { initial: 100, final: -1 })).toThrow('Final level must be zero or greater.')
    expect(() => paymentBreakdown({ ...protectedNote, principalAmount: 0 }, { initial: 100, final: 100 })).toThrow('Principal must be greater than zero.')
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
    expect(maturityPayment(capped, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('limits the return on principal, so participation above 100% reaches the cap sooner', () => {
    const at100 = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'upside' as const, rate: 1 }] } }
    expect(maturityPayment(at100, { initial: 100, final: 119 })).toBeCloseTo(1190, 8)
    expect(maturityPayment(at100, { initial: 100, final: 121 })).toBeCloseTo(1200, 8)
  })

  it('never binds below the cap, whatever the participation rate', () => {
    const lowRate = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'upside' as const, rate: 0.1 }] } }
    expect(maturityPayment(lowRate, { initial: 100, final: 300 })).toBeCloseTo(1200, 8)
    expect(maturityPayment(lowRate, { initial: 100, final: 160 })).toBeCloseTo(1060, 8)
  })

  it('has no effect without upside participation or on a fall', () => {
    const downsideOnly = { ...capped, payoff: { ...capped.payoff, participations: [{ direction: 'downside' as const, rate: 1 }] } }
    expect(maturityPayment(downsideOnly, { initial: 100, final: 200 })).toBe(1000)
    expect(maturityPayment(downsideOnly, { initial: 100, final: 95 })).toBeCloseTo(950, 8)
    expect(maturityPayment(capped, { initial: 100, final: 60 })).toBe(maturityPayment({ ...capped, payoff: { ...capped.payoff, cap: undefined } }, { initial: 100, final: 60 }))
  })

  it('works without protection', () => {
    const unprotected = { ...capped, payoff: { ...capped.payoff, principalProtection: undefined } }
    expect(maturityPayment(unprotected, { initial: 100, final: 130 })).toBeCloseTo(1200, 8)
    expect(maturityPayment(unprotected, { initial: 100, final: 60 })).toBeCloseTo(600, 8)
  })

  it('breaks the cap into steps', () => {
    const atCap = paymentBreakdown(capped, { initial: 100, final: 130 })
    expect(atCap.uncappedPayment).toBeCloseTo(1450, 8)
    expect(atCap.capAmount).toBeCloseTo(1200, 8)
    expect(atCap.capApplies).toBe(true)
    expect(atCap.unflooredPayment).toBeCloseTo(1200, 8)
    expect(atCap.payment).toBeCloseTo(1200, 8)

    const belowCap = paymentBreakdown(capped, { initial: 100, final: 110 })
    expect(belowCap.capApplies).toBe(false)
    expect(belowCap.unflooredPayment).toBeCloseTo(1150, 8)
    expect(belowCap.uncappedPayment).toBe(belowCap.unflooredPayment)
  })

  it('leaves the cap out of the breakdown when the note has none', () => {
    const breakdown = paymentBreakdown(note, { initial: 100, final: 130 })
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

describe('buffer', () => {
  const buffered: ProtectedParticipationNote = { ...note, payoff: { ...note.payoff, principalProtection: undefined, buffer: 0.1 } }

  // FINRA's example: a 10% buffer repays principal after a 5% fall, and loses 40% after a 50% fall.
  it.each([
    [0, 100],
    [50, 600],
    [80, 900],
    [90, 1000],
    [95, 1000],
    [100, 1000],
    [110, 1150],
  ])('pays %s final level as %s units with a 10% buffer and 100% downside participation', (finalLevel, expected) => {
    expect(maturityPayment(buffered, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('applies the downside rate to the fall beyond the buffer', () => {
    const halfRate = { ...buffered, payoff: { ...buffered.payoff, participations: [{ direction: 'downside' as const, rate: 0.5 }] } }
    expect(maturityPayment(halfRate, { initial: 100, final: 70 })).toBeCloseTo(900, 8)
  })

  it('has no effect without downside participation', () => {
    const upsideOnly = { ...buffered, payoff: { ...buffered.payoff, participations: [{ direction: 'upside' as const, rate: 1.5 }] } }
    for (const finalLevel of [0, 50, 95]) expect(maturityPayment(upsideOnly, { initial: 100, final: finalLevel })).toBe(1000)
  })

  it('combines with a protection floor, so the holder bears only the losses between the two', () => {
    const both = { ...buffered, payoff: { ...buffered.payoff, principalProtection: 0.9 } }
    expect(maturityPayment(both, { initial: 100, final: 95 })).toBe(1000)
    expect(maturityPayment(both, { initial: 100, final: 85 })).toBeCloseTo(950, 8)
    expect(maturityPayment(both, { initial: 100, final: 80 })).toBeCloseTo(900, 8)
    expect(maturityPayment(both, { initial: 100, final: 40 })).toBeCloseTo(900, 8)
  })

  it('breaks the buffer into steps', () => {
    const past = paymentBreakdown(buffered, { initial: 100, final: 70 })
    expect(past.bufferAbsorbs).toBeCloseTo(0.1, 8)
    expect(past.participatedReturn).toBeCloseTo(-0.2, 8)
    expect(past.payment).toBeCloseTo(800, 8)

    const within = paymentBreakdown(buffered, { initial: 100, final: 95 })
    expect(within.bufferAbsorbs).toBeCloseTo(0.05, 8)
    expect(within.participatedReturn).toBeCloseTo(0, 8)

    expect(paymentBreakdown(buffered, { initial: 100, final: 110 }).bufferAbsorbs).toBe(0)
    expect(paymentBreakdown(note, { initial: 100, final: 70 }).bufferAbsorbs).toBeUndefined()
  })

  it.each([0, -0.1, 1.1, Number.NaN])('rejects a buffer of %s', (buffer) => {
    const invalid = { ...note, payoff: { ...note.payoff, buffer } }
    expect(validateNote(invalid)).toContain('Buffer must be greater than 0% and at most 100%.')
    expect(noteIssues(invalid).map(({ field }) => field)).toEqual(['buffer'])
  })

  it('allows a buffer of 100%, which absorbs any fall', () => {
    const full = { ...buffered, payoff: { ...buffered.payoff, buffer: 1 } }
    expect(validateNote(full)).toEqual([])
    expect(maturityPayment(full, { initial: 100, final: 0 })).toBe(1000)
  })
})

describe('averaging determination', () => {
  const averaging = (observationCount: number): ProtectedParticipationNote => ({ ...note, underlier: { ...note.underlier, determination: { initial: { kind: 'given' }, final: { kind: 'averaging', observationCount } } } })

  it('takes the final level as the arithmetic average of the observed levels', () => {
    expect(finalLevelFrom({ kind: 'averaging', observationCount: 4 }, [100, 120, 90, 130])).toBe(110)
  })

  it('reads the one observed level for point-to-point', () => {
    expect(finalLevelFrom({ kind: 'final-date' }, [110])).toBe(110)
  })

  it('pays on the average, not on the level on the last date', () => {
    const observed = [120, 130, 140, 150, 60]
    const finalLevel = finalLevelFrom(averaging(5).underlier.determination.final, observed)
    expect(finalLevel).toBe(120)
    expect(maturityPayment(averaging(5), { initial: 100, final: finalLevel })).toBeCloseTo(1300, 8)
    expect(maturityPayment(note, { initial: 100, final: observed[observed.length - 1] })).toBe(1000)
  })

  it('rejects observed levels that do not match the count, or are negative', () => {
    expect(() => finalLevelFrom({ kind: 'averaging', observationCount: 3 }, [100, 110])).toThrow('Expected 3 observed levels.')
    expect(() => finalLevelFrom({ kind: 'final-date' }, [100, 110])).toThrow('Expected 1 observed levels.')
    expect(() => finalLevelFrom({ kind: 'averaging', observationCount: 2 }, [100, -1])).toThrow('Observed levels must be zero or greater.')
  })

  it('accepts from 2 to 12 observations', () => {
    expect(validateNote(averaging(2))).toEqual([])
    expect(validateNote(averaging(12))).toEqual([])
  })

  it.each([1, 13, 2.5, Number.NaN])('rejects %s observations', (count) => {
    expect(noteIssues(averaging(count))).toEqual([{ field: 'observationCount', message: 'Observations must be a whole number from 2 to 12.' }])
  })
})

describe('lookback determination', () => {
  const upsideOnly: ProtectedParticipationNote = { ...note, payoff: { kind: 'participation', participations: [{ direction: 'upside', rate: 1 }] } }
  const lookback = (observationCount: number, base: ProtectedParticipationNote = upsideOnly): ProtectedParticipationNote => ({
    ...base,
    underlier: { ...base.underlier, determination: { ...base.underlier.determination, initial: { kind: 'lookback', observationCount } } },
  })
  const paymentFrom = (n: ProtectedParticipationNote, afterPricing: number[], finalLevel: number) => {
    const { initial } = n.underlier.determination
    return maturityPayment(n, { initial: initialLevelFrom(initial, n.underlier.components[0].initialLevel, afterPricing), final: finalLevel })
  }

  it('reads the initial-level term when the initial level is given', () => {
    expect(initialLevelFrom({ kind: 'given' }, 100, [])).toBe(100)
  })

  it('takes the lowest of the initial level and the levels observed after pricing', () => {
    expect(initialLevelFrom({ kind: 'lookback', observationCount: 3 }, 100, [97, 92, 95])).toBe(92)
  })

  it('keeps the initial level when every observed level is above it', () => {
    expect(initialLevelFrom({ kind: 'lookback', observationCount: 3 }, 100, [101, 104, 103])).toBe(100)
  })

  // The worked example in docs/lookback.md: principal 1,000, initial level 100, three observations, 100% upside participation.
  it.each([
    [[97, 92, 95], 110, 1000 * 110 / 92, 1100],
    [[101, 104, 103], 110, 1100, 1100],
    [[97, 92, 95], 90, 1000, 1000],
  ])('pays on the return from the lookback level after %j, ending at %d', (afterPricing, finalLevel, withLookback, pointToPoint) => {
    expect(paymentFrom(lookback(3), afterPricing, finalLevel)).toBeCloseTo(withLookback, 8)
    expect(paymentFrom(upsideOnly, [], finalLevel)).toBeCloseTo(pointToPoint, 8)
  })

  it('combines with averaging of the final level', () => {
    const both = lookback(3, { ...upsideOnly, underlier: { ...upsideOnly.underlier, determination: { initial: { kind: 'given' }, final: { kind: 'averaging', observationCount: 4 } } } })
    expect(validateNote(both)).toEqual([])
    // Lookback level 92; final level (100 + 120 + 90 + 130) ÷ 4 = 110.
    const finalLevel = finalLevelFrom(both.underlier.determination.final, [100, 120, 90, 130])
    expect(paymentFrom(both, [97, 92, 95], finalLevel)).toBeCloseTo(1000 * 110 / 92, 8)
  })

  it('rejects observed levels that do not match the count, or are not above zero', () => {
    expect(() => initialLevelFrom({ kind: 'lookback', observationCount: 3 }, 100, [97, 92])).toThrow('Expected 3 observed levels after pricing.')
    expect(() => initialLevelFrom({ kind: 'given' }, 100, [97])).toThrow('Expected 0 observed levels after pricing.')
    for (const level of [0, -1, Number.NaN]) expect(() => initialLevelFrom({ kind: 'lookback', observationCount: 2 }, 100, [97, level])).toThrow('Observed levels after pricing must be greater than zero.')
  })

  it('accepts from 2 to 12 observations', () => {
    expect(validateNote(lookback(2))).toEqual([])
    expect(validateNote(lookback(12))).toEqual([])
  })

  it.each([1, 13, 2.5, Number.NaN])('rejects %s observations', (count) => {
    expect(noteIssues(lookback(count))).toEqual([{ field: 'lookbackObservationCount', message: 'Lookback observations must be a whole number from 2 to 12.' }])
  })
})
