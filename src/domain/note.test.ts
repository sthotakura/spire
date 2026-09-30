import { describe, expect, it } from 'vitest'
import { basketBreakdown, equalWeights, finalLevelFrom, initialLevelFrom, maturityPayment, noteIssues, paymentBreakdown, validateNote, type BasketUnderlier, type DownsideParticipation, type Note, type SingleNote, type UpsideParticipation } from './note'

const note: SingleNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }],
    determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } },
  },
  payoff: {
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 1,
  },
  principalAmount: 1000,
}
// Changes the participation in one direction, such as adding its buffer or cap, and keeps the other.
const withDownside = (base: SingleNote, terms: Partial<DownsideParticipation>): SingleNote => ({
  ...base,
  payoff: { ...base.payoff, participations: base.payoff.participations.map((p) => p.direction === 'downside' ? { ...p, ...terms } : p) },
})
const withUpside = (base: SingleNote, terms: Partial<UpsideParticipation>): SingleNote => ({
  ...base,
  payoff: { ...base.payoff, participations: base.payoff.participations.map((p) => p.direction === 'upside' ? { ...p, ...terms } : p) },
})
const withComponent = (name: string, initialLevel: number): SingleNote => ({
  ...note,
  underlier: { ...note.underlier, components: [{ asset: { kind: 'equity-index', name } }], determination: { ...note.underlier.determination, initial: { kind: 'given', level: initialLevel } } },
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
    const partiallyProtectedNote: SingleNote = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.9,
      },
    }

    expect(maturityPayment(partiallyProtectedNote, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('applies the configured downside participation rate before the floor', () => {
    const partiallyProtectedNote: SingleNote = {
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
    const unprotectedNote: SingleNote = {
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
    const upsideOnlyNote: SingleNote = {
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
    const downsideOnlyNote: SingleNote = {
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
    const principalOnlyNote: SingleNote = { ...note, payoff: { participations: [] } }

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
    const unprotectedNote: SingleNote = {
      ...note,
      payoff: { participations: [{ direction: 'downside', rate: 1.5 }] },
    }

    expect(maturityPayment(unprotectedNote, { initial: 100, final: 60 })).toBeCloseTo(400, 8)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 20 })).toBe(0)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 0 })).toBe(0)
  })

  it('treats absent and zero protection alike in payment but not in structure', () => {
    const absent: SingleNote = { ...note, payoff: { participations: [{ direction: 'downside', rate: 1 }] } }
    const zero: SingleNote = { ...absent, payoff: { ...absent.payoff, principalProtection: 0 } }

    for (const finalLevel of [0, 50, 100, 120]) expect(maturityPayment(absent, { initial: 100, final: finalLevel })).toBe(maturityPayment(zero, { initial: 100, final: finalLevel }))
    expect(absent.payoff.principalProtection).toBeUndefined()
  })
})

describe('payment breakdown', () => {
  const protectedNote: SingleNote = { ...note, payoff: { ...note.payoff, principalProtection: 0.9 } }

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
    const breakdown = paymentBreakdown({ ...note, payoff: { participations: [] } }, { initial: 100, final: 110 })

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
  const capped = withUpside({ ...note, payoff: { ...note.payoff, principalProtection: 0.9 } }, { cap: 0.2 })

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
    const at100 = withUpside(capped, { rate: 1 })
    expect(maturityPayment(at100, { initial: 100, final: 119 })).toBeCloseTo(1190, 8)
    expect(maturityPayment(at100, { initial: 100, final: 121 })).toBeCloseTo(1200, 8)
  })

  it('never binds below the cap, whatever the participation rate', () => {
    const lowRate = withUpside(capped, { rate: 0.1 })
    expect(maturityPayment(lowRate, { initial: 100, final: 300 })).toBeCloseTo(1200, 8)
    expect(maturityPayment(lowRate, { initial: 100, final: 160 })).toBeCloseTo(1060, 8)
  })

  it('has no effect on a fall', () => {
    expect(maturityPayment(capped, { initial: 100, final: 60 })).toBe(maturityPayment(withUpside(capped, { cap: undefined }), { initial: 100, final: 60 }))
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
    const invalid = withUpside(note, { cap })
    expect(validateNote(invalid)).toContain('Cap must be greater than zero.')
    expect(noteIssues(invalid).map(({ field }) => field)).toEqual(['cap'])
  })
})

describe('buffer', () => {
  const buffered = withDownside({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, { buffer: 0.1 })

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
    const halfRate = withDownside(buffered, { rate: 0.5 })
    expect(maturityPayment(halfRate, { initial: 100, final: 70 })).toBeCloseTo(900, 8)
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
    const invalid = withDownside(note, { buffer })
    expect(validateNote(invalid)).toContain('Buffer must be greater than 0% and at most 100%.')
    expect(noteIssues(invalid).map(({ field }) => field)).toEqual(['buffer'])
  })

  it('allows a buffer of 100%, which absorbs any fall', () => {
    const full = withDownside(buffered, { buffer: 1 })
    expect(validateNote(full)).toEqual([])
    expect(maturityPayment(full, { initial: 100, final: 0 })).toBe(1000)
  })
})

describe('barrier', () => {
  // The worked example in docs/barrier.md: 150% upside, 100% downside, a 70% barrier, no protection.
  const barriered = withDownside({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, { barrier: { level: 0.7, observation: 'final' } })

  it.each([
    [120, 1300],
    [100, 1000],
    [80, 1000],
    [70, 1000],
    [69, 690],
    [50, 500],
    [0, 0],
  ])('pays %s final level as %s units with a 70% barrier', (finalLevel, expected) => {
    expect(maturityPayment(barriered, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  // A public note's table: 70.00 repays principal and 69.99 loses the whole fall.
  it('repays principal at the barrier and counts the whole fall just below it', () => {
    expect(maturityPayment(barriered, { initial: 100, final: 70 })).toBe(1000)
    expect(maturityPayment(barriered, { initial: 100, final: 69.99 })).toBeCloseTo(699.9, 8)
  })

  it('applies the downside rate to the whole fall below the barrier', () => {
    expect(maturityPayment(withDownside(barriered, { rate: 0.5 }), { initial: 100, final: 60 })).toBeCloseTo(800, 8)
  })

  it('is measured from the determined initial level, such as a lookback level', () => {
    // Lookback level 80, so the barrier is 56: a final level of 60 is a 25% fall that the barrier holds.
    expect(maturityPayment(barriered, { initial: 80, final: 60 })).toBe(1000)
    expect(maturityPayment(barriered, { initial: 80, final: 40 })).toBeCloseTo(500, 8)
  })

  it('combines with a protection floor, which still bounds the payment', () => {
    const floored = { ...barriered, payoff: { ...barriered.payoff, principalProtection: 0.9 } }
    expect(maturityPayment(floored, { initial: 100, final: 69 })).toBe(900)
    expect(maturityPayment(floored, { initial: 100, final: 75 })).toBe(1000)
  })

  it('reports the barrier level and whether the final level is below it', () => {
    expect(paymentBreakdown(barriered, { initial: 100, final: 65 })).toMatchObject({ barrierLevel: 70, belowBarrier: true, participatedReturn: -0.35 })
    expect(paymentBreakdown(barriered, { initial: 100, final: 75 })).toMatchObject({ barrierLevel: 70, belowBarrier: false, participatedReturn: 0 })
    expect(paymentBreakdown(note, { initial: 100, final: 75 }).barrierLevel).toBeUndefined()
  })

  it.each([0, -0.1, 1, 1.2, Number.NaN])('rejects a barrier level of %s', (level) => {
    const invalid = withDownside(note, { barrier: { level, observation: 'final' } })
    expect(noteIssues(invalid)).toEqual([{ field: 'barrier', message: 'Barrier must be greater than 0% and less than 100% of the initial level.' }])
  })

  it('is not combined with a buffer', () => {
    const both = withDownside(barriered, { buffer: 0.1 })
    expect(noteIssues(both)).toEqual([{ field: 'barrier', message: 'A barrier and a buffer cannot both apply to downside participation.' }])
  })
})

describe('averaging determination', () => {
  const averaging = (observationCount: number): SingleNote => ({ ...note, underlier: { ...note.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount } } } })

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
  const upsideOnly: SingleNote = { ...note, payoff: { participations: [{ direction: 'upside', rate: 1 }] } }
  const lookback = (observationCount: number, base: SingleNote = upsideOnly): SingleNote => ({
    ...base,
    underlier: { ...base.underlier, determination: { ...base.underlier.determination, initial: { kind: 'lookback', observationCount } } },
  })
  // The levels observed from pricing: the level on the pricing date first, then each date after it.
  const paymentFrom = (n: SingleNote, fromPricing: number[], finalLevel: number) =>
    maturityPayment(n, { initial: initialLevelFrom(n.underlier.determination.initial, fromPricing), final: finalLevel })

  it('reads the stated level when the initial level is given', () => {
    expect(initialLevelFrom({ kind: 'given', level: 100 }, [])).toBe(100)
  })

  it('takes the lowest of the levels on the pricing date and the dates after it', () => {
    expect(initialLevelFrom({ kind: 'lookback', observationCount: 3 }, [100, 97, 92, 95])).toBe(92)
  })

  it('keeps the pricing-date level when every later level is above it', () => {
    expect(initialLevelFrom({ kind: 'lookback', observationCount: 3 }, [100, 101, 104, 103])).toBe(100)
  })

  it('states no level of its own with lookback: the pricing-date level is observed like the others', () => {
    expect('level' in lookback(3).underlier.determination.initial).toBe(false)
    expect(initialLevelFrom({ kind: 'lookback', observationCount: 2 }, [80, 90, 85])).toBe(80)
  })

  // The worked example in docs/lookback.md: principal 1,000, initial level 100, three observations, 100% upside participation.
  it.each([
    [[97, 92, 95], 110, 1000 * 110 / 92, 1100],
    [[101, 104, 103], 110, 1100, 1100],
    [[97, 92, 95], 90, 1000, 1000],
  ])('pays on the return from the lookback level after %j, ending at %d', (afterPricing, finalLevel, withLookback, pointToPoint) => {
    expect(paymentFrom(lookback(3), [100, ...afterPricing], finalLevel)).toBeCloseTo(withLookback, 8)
    expect(paymentFrom(upsideOnly, [], finalLevel)).toBeCloseTo(pointToPoint, 8)
  })

  it('combines with averaging of the final level', () => {
    const both = lookback(3, { ...upsideOnly, underlier: { ...upsideOnly.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 4 } } } })
    expect(validateNote(both)).toEqual([])
    // Lookback level 92; final level (100 + 120 + 90 + 130) ÷ 4 = 110.
    const finalLevel = finalLevelFrom(both.underlier.determination.final, [100, 120, 90, 130])
    expect(paymentFrom(both, [100, 97, 92, 95], finalLevel)).toBeCloseTo(1000 * 110 / 92, 8)
  })

  // Public lookback notes measure the buffer from the lookback level, e.g. a 60% fall with a 10% buffer loses 50%.
  it.each([
    [32, 500],
    [74, 1000],
  ])('measures the buffer from the lookback level, ending at %d', (finalLevel, expected) => {
    const buffered = lookback(3, withDownside({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, { buffer: 0.1 }))
    expect(paymentFrom(buffered, [100, 97, 80, 90], finalLevel)).toBeCloseTo(expected, 8)
  })

  it('rejects observed levels that do not match the count, or are not above zero', () => {
    expect(() => initialLevelFrom({ kind: 'lookback', observationCount: 3 }, [100, 97, 92])).toThrow('Expected 4 observed levels for the initial level.')
    expect(() => initialLevelFrom({ kind: 'given', level: 100 }, [97])).toThrow('Expected 0 observed levels for the initial level.')
    for (const level of [0, -1, Number.NaN]) {
      expect(() => initialLevelFrom({ kind: 'lookback', observationCount: 2 }, [100, 97, level])).toThrow('Observed levels for the initial level must be greater than zero.')
      expect(() => initialLevelFrom({ kind: 'lookback', observationCount: 2 }, [level, 97, 95])).toThrow('Observed levels for the initial level must be greater than zero.')
    }
  })

  it('accepts from 2 to 12 observations', () => {
    expect(validateNote(lookback(2))).toEqual([])
    expect(validateNote(lookback(12))).toEqual([])
  })

  it.each([1, 13, 2.5, Number.NaN])('rejects %s observations', (count) => {
    expect(noteIssues(lookback(count))).toEqual([{ field: 'lookbackObservationCount', message: 'Lookback observations must be a whole number from 2 to 12.' }])
  })
})

describe('weighted basket', () => {
  // The worked example in docs/basket.md: Synthetic Index A starts at 100 and Synthetic Co at 40, each weighted 50%.
  const basket: BasketUnderlier = {
    kind: 'basket',
    components: [
      { asset: { kind: 'equity-index', name: 'Synthetic Index A' } },
      { asset: { kind: 'equity', name: 'Synthetic Co' } },
    ],
    determination: {
      initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Co', level: 40 }] },
      final: { kind: 'final-date' },
    },
    combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: 0.5 }, { asset: 'Synthetic Co', weight: 0.5 }] },
  }
  const basketNote: Note = { ...note, underlier: basket, payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] } }
  const averaged: BasketUnderlier = { ...basket, determination: { ...basket.determination, final: { kind: 'averaging', observationCount: 2 } } }
  const issuesOf = (underlier: BasketUnderlier) => noteIssues({ ...basketNote, underlier })

  it.each([
    [120, 48, 120, 1200],
    [130, 36, 110, 1100],
    [80, 44, 95, 950],
  ])('weights the component returns: %s and %s make a basket level of %s', (indexFinal, coFinal, basketLevel, payment) => {
    const { levels } = basketBreakdown(basket, [[indexFinal], [coFinal]])
    expect(levels.initial).toBe(100)
    expect(levels.final).toBeCloseTo(basketLevel, 8)
    expect(maturityPayment(basketNote, levels)).toBeCloseTo(payment, 8)
  })

  it('measures each component from its own initial level', () => {
    const { components, basketReturn } = basketBreakdown(basket, [[130], [36]])
    expect(components.map(({ asset, weight, initialLevel, finalLevel }) => [asset, weight, initialLevel, finalLevel])).toEqual([['Synthetic Index A', 0.5, 100, 130], ['Synthetic Co', 0.5, 40, 36]])
    expect(components[0].componentReturn).toBeCloseTo(0.3, 8)
    expect(components[1].componentReturn).toBeCloseTo(-0.1, 8)
    expect(basketReturn).toBeCloseTo(0.1, 8)
  })

  it('finds each term by its asset, whatever order the terms are listed in', () => {
    const reordered: BasketUnderlier = {
      ...basket,
      determination: { ...basket.determination, initial: { kind: 'given', levels: [...basket.determination.initial.levels].reverse() } },
      combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Co', weight: 0.25 }, { asset: 'Synthetic Index A', weight: 0.75 }] },
    }
    // 75% × +30% + 25% × −10% = +20%.
    expect(basketBreakdown(reordered, [[130], [36]]).levels.final).toBeCloseTo(120, 8)
  })

  it('averages each component, which matches averaging the basket level on each date', () => {
    // Index A 110 then 130, Co 44 then 36: the component averages are 120 and 40, and the basket level is 110 on both dates.
    const { components, levels } = basketBreakdown(averaged, [[110, 130], [44, 36]])
    expect(components.map(({ finalLevel }) => finalLevel)).toEqual([120, 40])
    expect(levels.final).toBeCloseTo(110, 8)
    const basketLevelOn = (date: number) => basketBreakdown(basket, [[[110, 130][date]], [[44, 36][date]]]).levels.final
    expect((basketLevelOn(0) + basketLevelOn(1)) / 2).toBeCloseTo(levels.final, 8)
  })

  it('passes the basket level to the payoff, so a barrier is measured on the basket', () => {
    const barrierNote: Note = { ...basketNote, payoff: { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] } }
    // Index A −50% and Co +20% leave the basket at 85, above a barrier at 70, so principal is repaid.
    expect(maturityPayment(barrierNote, basketBreakdown(basket, [[50], [48]]).levels)).toBeCloseTo(1000, 8)
  })

  it('gives the components equal weights to two decimal places of a percent, the first taking the remainder', () => {
    expect(equalWeights(basket.components)).toEqual([{ asset: 'Synthetic Index A', weight: 0.5 }, { asset: 'Synthetic Co', weight: 0.5 }])
    const components = [...basket.components, { asset: { kind: 'equity' as const, name: 'Synthetic Bank' } }]
    expect(equalWeights(components).map(({ weight }) => weight)).toEqual([0.3334, 0.3333, 0.3333])
    // They do not add up to exactly 1 in floating point, and are still accepted.
    const levels = [...basket.determination.initial.levels, { asset: 'Synthetic Bank', level: 20 }]
    expect(issuesOf({ ...basket, components, determination: { ...basket.determination, initial: { kind: 'given', levels } }, combination: { kind: 'weighted', weights: equalWeights(components) } })).toEqual([])
    const seven = Array.from({ length: 7 }, (_, index) => ({ asset: { kind: 'equity' as const, name: `Synthetic ${index}` } }))
    expect(equalWeights(seven).map(({ weight }) => weight)).toEqual([0.1432, 0.1428, 0.1428, 0.1428, 0.1428, 0.1428, 0.1428])
  })

  it('accepts the example basket', () => {
    expect(issuesOf(basket)).toEqual([])
  })

  it('needs at least two assets', () => {
    const one: BasketUnderlier = {
      ...basket,
      components: [basket.components[0]],
      determination: { ...basket.determination, initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }] } },
      combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: 1 }] },
    }
    expect(issuesOf(one)).toEqual([{ field: 'basketComponents', message: 'A basket needs at least two assets.' }])
  })

  it('needs a distinct name for each asset, since terms refer to assets by name', () => {
    const named = (a: string, b: string): BasketUnderlier => ({ ...basket, components: [{ asset: { kind: 'equity-index', name: a } }, { asset: { kind: 'equity', name: b } }] })
    expect(issuesOf(named(' ', 'Synthetic Co'))).toContainEqual({ field: 'underlierName', message: 'Enter a name for each asset.' })
    expect(issuesOf(named('Synthetic Co', 'Synthetic Co'))).toContainEqual({ field: 'underlierName', message: 'Each asset in a basket needs its own name.' })
  })

  it('needs one initial level per asset, each above zero', () => {
    const withLevels = (levels: { asset: string; level: number }[]): BasketUnderlier => ({ ...basket, determination: { ...basket.determination, initial: { kind: 'given', levels } } })
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }]))).toEqual([{ field: 'initialLevel', message: 'Each asset needs one initial level.' }])
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Index A', level: 40 }]))).toEqual([{ field: 'initialLevel', message: 'Each asset needs one initial level.' }])
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Co', level: 0 }]))).toEqual([{ field: 'initialLevel', message: 'Initial level of Synthetic Co must be greater than zero.' }])
  })

  it('needs one weight per asset, each above zero, adding up to 100%', () => {
    const withWeights = (a: number, b: number, assetB = 'Synthetic Co'): BasketUnderlier => ({ ...basket, combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: a }, { asset: assetB, weight: b }] } })
    expect(issuesOf(withWeights(0.6, 0.4))).toEqual([])
    expect(issuesOf(withWeights(0.6, 0.6))).toEqual([{ field: 'weights', message: 'Weights must add up to 100%.' }])
    expect(issuesOf(withWeights(1, 0))).toEqual([{ field: 'weights', message: 'Weight of Synthetic Co must be greater than zero.' }])
    expect(issuesOf(withWeights(0.5, Number.NaN))).toContainEqual({ field: 'weights', message: 'Weights must add up to 100%.' })
    expect(issuesOf(withWeights(0.5, 0.5, 'Synthetic Bank'))).toEqual([{ field: 'weights', message: 'Each asset needs one weight.' }])
  })

  it('checks the averaging count as for a single asset', () => {
    expect(issuesOf({ ...basket, determination: { ...basket.determination, final: { kind: 'averaging', observationCount: 13 } } })).toEqual([{ field: 'observationCount', message: 'Observations must be a whole number from 2 to 12.' }])
  })

  it('rejects an invalid basket, and observed levels that do not match its assets', () => {
    expect(() => basketBreakdown({ ...basket, combination: { kind: 'weighted', weights: [{ asset: 'Synthetic Index A', weight: 0.5 }, { asset: 'Synthetic Co', weight: 0.6 }] } }, [[100], [40]])).toThrow('Weights must add up to 100%.')
    expect(() => basketBreakdown(basket, [[100]])).toThrow('Expected observed levels for 2 assets.')
    expect(() => basketBreakdown(averaged, [[100], [40]])).toThrow('Expected 2 observed levels.')
  })
})
