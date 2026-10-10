import { describe, expect, it } from 'vitest'
import { annualisedReturn, barrierLevelAt, basketBreakdown, equalWeights, finalLevelFrom, initialLevelFrom, maturityPayment, productIssues, paymentBreakdown, validateProduct, withSubFeatures, type BarrierAbsoluteReturn, type BasketUnderlier, type DownsideParticipation, type Product, type SingleProduct, type UpsideParticipation } from './note'

const note: SingleProduct = {
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
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
const withDownside = (base: SingleProduct, terms: Partial<DownsideParticipation>): SingleProduct => ({
  ...base,
  payoff: { ...base.payoff, participations: base.payoff.participations.map((p) => p.direction === 'downside' ? { ...p, ...terms } : p) },
})
const withUpside = (base: SingleProduct, terms: Partial<UpsideParticipation>): SingleProduct => ({
  ...base,
  payoff: { ...base.payoff, participations: base.payoff.participations.map((p) => p.direction === 'upside' ? { ...p, ...terms } : p) },
})
const withComponent = (name: string, initialLevel: number): SingleProduct => ({
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
    expect(validateProduct(invalidNote)).toContain(expectedError)
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
    const partiallyProtectedNote: SingleProduct = {
      ...note,
      payoff: {
        ...note.payoff,
        principalProtection: 0.9,
      },
    }

    expect(maturityPayment(partiallyProtectedNote, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('applies the configured downside participation rate before the floor', () => {
    const partiallyProtectedNote: SingleProduct = {
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
    const unprotectedNote: SingleProduct = {
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
    expect(validateProduct(invalidNote)).toContain(expectedError)
  })

  it('leaves negative returns unchanged when only upside participation is selected', () => {
    const upsideOnlyNote: SingleProduct = {
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
    const downsideOnlyNote: SingleProduct = {
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
    expect(productIssues(invalidNote).map(({ field }) => field)).toEqual([expectedField])
    expect(validateProduct(invalidNote)).toEqual(productIssues(invalidNote).map(({ message }) => message))
  })

  it('allows a note with no participation and no protection', () => {
    const principalOnlyNote: SingleProduct = { ...note, payoff: { participations: [] } }

    expect(validateProduct(principalOnlyNote)).toEqual([])
    for (const finalLevel of [0, 60, 100, 110, 130]) expect(maturityPayment(principalOnlyNote, { initial: 100, final: finalLevel })).toBe(1000)
  })

  it('rejects a direction selected more than once', () => {
    expect(validateProduct({
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
    const unprotectedNote: SingleProduct = {
      ...note,
      payoff: { participations: [{ direction: 'downside', rate: 1.5 }] },
    }

    expect(maturityPayment(unprotectedNote, { initial: 100, final: 60 })).toBeCloseTo(400, 8)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 20 })).toBe(0)
    expect(maturityPayment(unprotectedNote, { initial: 100, final: 0 })).toBe(0)
  })

  it('treats absent and zero protection alike in payment but not in structure', () => {
    const absent: SingleProduct = { ...note, payoff: { participations: [{ direction: 'downside', rate: 1 }] } }
    const zero: SingleProduct = { ...absent, payoff: { ...absent.payoff, principalProtection: 0 } }

    for (const finalLevel of [0, 50, 100, 120]) expect(maturityPayment(absent, { initial: 100, final: finalLevel })).toBe(maturityPayment(zero, { initial: 100, final: finalLevel }))
    expect(absent.payoff.principalProtection).toBeUndefined()
  })
})

describe('term', () => {
  it.each([1, 18, 36, 120])('allows a term of %d months', (months) => {
    expect(validateProduct({ ...note, term: { months } })).toEqual([])
  })

  it.each([0, -12, 121, 1.5, Number.NaN])('rejects a term of %d months', (months) => {
    expect(productIssues({ ...note, term: { months } })).toEqual([{ field: 'term', message: 'Term must be a whole number of months from 1 to 120.' }])
  })

  it('does not change the payment', () => {
    for (const final of [60, 100, 130]) expect(maturityPayment({ ...note, term: { months: 6 } }, { initial: 100, final })).toBe(maturityPayment({ ...note, term: { months: 120 } }, { initial: 100, final }))
  })
})

describe('payment breakdown', () => {
  const protectedNote: SingleProduct = { ...note, payoff: { ...note.payoff, principalProtection: 0.9 } }

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
    expect(validateProduct(invalid)).toContain('Cap must be greater than zero.')
    expect(productIssues(invalid).map(({ field }) => field)).toEqual(['cap'])
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
    expect(validateProduct(invalid)).toContain('Buffer must be greater than 0% and at most 100%.')
    expect(productIssues(invalid).map(({ field }) => field)).toEqual(['buffer'])
  })

  it('allows a buffer of 100%, which absorbs any fall', () => {
    const full = withDownside(buffered, { buffer: 1 })
    expect(validateProduct(full)).toEqual([])
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
    expect(paymentBreakdown(barriered, { initial: 100, final: 65 })).toMatchObject({ barrierLevel: 70, barrierReached: true, participatedReturn: -0.35 })
    expect(paymentBreakdown(barriered, { initial: 100, final: 75 })).toMatchObject({ barrierLevel: 70, barrierReached: false, participatedReturn: 0 })
    expect(paymentBreakdown(note, { initial: 100, final: 75 }).barrierLevel).toBeUndefined()
  })

  it.each([0, -0.1, 1, 1.2, Number.NaN])('rejects a barrier level of %s', (level) => {
    const invalid = withDownside(note, { barrier: { level, observation: 'final' } })
    expect(productIssues(invalid)).toEqual([{ field: 'barrier', message: 'Downside barrier must be greater than 0% and less than 100% of the initial level.' }])
  })

  it('is not combined with a buffer', () => {
    const both = withDownside(barriered, { buffer: 0.1 })
    expect(productIssues(both)).toEqual([{ field: 'barrier', message: 'A downside barrier and a buffer cannot both apply to downside participation.' }])
  })
})

describe('barrier on upside participation', () => {
  // The worked example in docs/upside-barrier.md: 80% upside, a 130% barrier, a 2% rebate, 100% protection, no downside participation.
  const finned = withUpside({ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside', rate: 1.5 }] } }, { rate: 0.8, barrier: { level: 1.3, observation: 'final', rebate: 0.02 } })
  const withBarrier = (terms: Partial<NonNullable<UpsideParticipation['barrier']>>) => withUpside(finned, { barrier: { level: 1.3, observation: 'final', ...terms } })

  it.each([
    [150, 1020],
    [131, 1020],
    [130, 1240],
    [129, 1232],
    [120, 1160],
    [100, 1000],
    [80, 1000],
  ])('pays %s final level as %s units', (finalLevel, expected) => {
    expect(maturityPayment(finned, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('pays the most at the barrier, then drops to the rebate just above it', () => {
    expect(maturityPayment(finned, { initial: 100, final: 129.99 })).toBeCloseTo(1239.92, 8)
    expect(maturityPayment(finned, { initial: 100, final: 130 })).toBeCloseTo(1240, 8)
    expect(maturityPayment(finned, { initial: 100, final: 130.01 })).toBe(1020)
  })

  it('pays principal above the barrier when there is no rebate', () => {
    const noRebate = withBarrier({ rebate: undefined })
    expect(maturityPayment(noRebate, { initial: 100, final: 130.01 })).toBe(1000)
    expect(maturityPayment(noRebate, { initial: 100, final: 130 })).toBeCloseTo(1240, 8)
    expect(maturityPayment(noRebate, { initial: 100, final: 129 })).toBeCloseTo(1232, 8)
  })

  it('is measured from the determined initial level, such as a lookback level', () => {
    // Lookback level 80, so the barrier is 104: a final level of 100 is +25% and below it, 104 is at it and not above it.
    expect(maturityPayment(finned, { initial: 80, final: 100 })).toBeCloseTo(1200, 8)
    expect(maturityPayment(finned, { initial: 80, final: 104 })).toBeCloseTo(1240, 8)
    expect(maturityPayment(finned, { initial: 80, final: 104.01 })).toBe(1020)
  })

  it('leaves the downside as it was', () => {
    const both = { ...finned, payoff: { ...finned.payoff, principalProtection: 0.9, participations: [{ direction: 'downside' as const, rate: 1 }, ...finned.payoff.participations] } }
    expect(maturityPayment(both, { initial: 100, final: 80 })).toBe(900)
    expect(maturityPayment(both, { initial: 100, final: 140 })).toBe(1020)
  })

  it('does not pay a rebate below the protection floor or a minimum return', () => {
    const deposit: SingleProduct = { ...finned, wrapper: 'deposit', payoff: { ...finned.payoff, principalProtection: undefined, minimumReturn: 0.05 } }
    expect(validateProduct(deposit)).toEqual([])
    // The rebate of 2% is under the 5% minimum, so the minimum is what the deposit pays above the barrier.
    expect(maturityPayment(deposit, { initial: 100, final: 131 })).toBe(1050)
    expect(maturityPayment(deposit, { initial: 100, final: 129 })).toBeCloseTo(1232, 8)
  })

  it('reports the barrier level and whether the final level has reached it', () => {
    expect(paymentBreakdown(finned, { initial: 100, final: 140 })).toMatchObject({ upsideBarrierLevel: 130, upsideBarrierReached: true, participatedReturn: 0.02 })
    expect(paymentBreakdown(finned, { initial: 100, final: 120 })).toMatchObject({ upsideBarrierLevel: 130, upsideBarrierReached: false })
    expect(paymentBreakdown(finned, { initial: 100, final: 120 }).participatedReturn).toBeCloseTo(0.16, 8)
    expect(paymentBreakdown(note, { initial: 100, final: 140 }).upsideBarrierLevel).toBeUndefined()
  })

  it.each([1, 0.9, 2.01, 0, Number.NaN])('rejects a barrier level of %s', (level) => {
    expect(productIssues(withBarrier({ level }))).toEqual([{ field: 'upsideBarrier', message: 'Upside barrier must be greater than 100% and at most 200% of the initial level.' }])
  })

  // 1.1 × 100 is 110.00000000000001 in floating point. The barrier is rounded to 110, so a final level of 110 is at it, not above it.
  it('puts a level on the right side of an upside barrier that floating point cannot state exactly', () => {
    expect(barrierLevelAt(1.1, 100)).toBe(110)
    expect(paymentBreakdown(withBarrier({ level: 1.1 }), { initial: 100, final: 110 }).upsideBarrierReached).toBe(false)
    expect(paymentBreakdown(withBarrier({ level: 1.1 }), { initial: 100, final: 110.01 }).upsideBarrierReached).toBe(true)
    expect(paymentBreakdown(withBarrier({ level: 1.07 }), { initial: 100, final: 107 }).upsideBarrierReached).toBe(false)
    expect(paymentBreakdown(withBarrier({ level: 1.07 }), { initial: 100, final: 107.01 }).upsideBarrierReached).toBe(true)
  })

  it('allows a downside barrier at 200% of the initial level', () => {
    expect(productIssues(withBarrier({ level: 2 }))).toEqual([])
  })

  it.each([0, -0.01, Number.NaN])('rejects a rebate of %s', (rebate) => {
    expect(productIssues(withBarrier({ rebate }))).toEqual([{ field: 'upsideBarrier', message: 'Rebate must be greater than zero.' }])
  })

  it('is not combined with a cap', () => {
    expect(productIssues(withUpside(finned, { cap: 0.2 }))).toEqual([{ field: 'upsideBarrier', message: 'An upside barrier and a cap cannot both apply to upside participation.' }])
  })
})

describe('absolute return', () => {
  // The worked example in docs/absolute-return.md: 120% upside with a 40% cap, a 15% buffer, 100% absolute return, 100% downside, no protection.
  const dualDirectional = withUpside(withDownside({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, { buffer: 0.15, absoluteReturn: { rate: 1 } }), { rate: 1.2, cap: 0.4 })

  it.each([
    [140, 1400],
    [110, 1120],
    [100, 1000],
    [95, 1050],
    [85, 1150],
    [84.99, 999.9],
    [50, 650],
    [0, 150],
  ])('pays %s final level as %s units', (finalLevel, expected) => {
    expect(maturityPayment(dualDirectional, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  // A public capped note: 100% upside up to a $1,690 maximum, a 15% buffer and 100% absolute return.
  it.each([
    [105, 1050],
    [200, 1690],
    [95, 1050],
    [5, 200],
  ])('matches the public capped note at %s', (finalLevel, expected) => {
    const capped = withUpside(dualDirectional, { rate: 1, cap: 0.69 })
    expect(maturityPayment(capped, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  // A public leveraged note, on its worst performing index: 139% upside, a 20% buffer and 100% absolute return.
  it.each([
    [105, 1069.5],
    [95, 1050],
    [5, 250],
  ])('matches the public leveraged note at %s', (finalLevel, expected) => {
    const leveraged = withUpside(withDownside(dualDirectional, { buffer: 0.2 }), { rate: 1.39, cap: undefined })
    expect(maturityPayment(leveraged, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
  })

  it('applies its rate to the fall', () => {
    expect(maturityPayment(withDownside(dualDirectional, { absoluteReturn: { rate: 0.5 } }), { initial: 100, final: 90 })).toBeCloseTo(1050, 8)
  })

  it('is not limited by the cap, which limits upside participation only', () => {
    const lowCap = withUpside(dualDirectional, { cap: 0.1 })
    expect(maturityPayment(lowCap, { initial: 100, final: 85 })).toBeCloseTo(1150, 8)
    expect(maturityPayment(lowCap, { initial: 100, final: 120 })).toBeCloseTo(1100, 8)
    expect(paymentBreakdown(lowCap, { initial: 100, final: 85 }).capApplies).toBe(false)
  })

  it('pays a fall within the buffer as a gain without upside participation', () => {
    const downsideOnly: SingleProduct = { ...dualDirectional, payoff: { participations: dualDirectional.payoff.participations.filter(({ direction }) => direction === 'downside') } }
    expect(maturityPayment(downsideOnly, { initial: 100, final: 120 })).toBe(1000)
    expect(maturityPayment(downsideOnly, { initial: 100, final: 95 })).toBeCloseTo(1050, 8)
  })

  it('combines with a protection floor, which does not reach the gain', () => {
    const floored = { ...dualDirectional, payoff: { ...dualDirectional.payoff, principalProtection: 0.9 } }
    expect(maturityPayment(floored, { initial: 100, final: 95 })).toBeCloseTo(1050, 8)
    expect(maturityPayment(floored, { initial: 100, final: 50 })).toBe(900)
  })

  it('is measured from the determined initial level, such as a lookback level', () => {
    // Lookback level 80: a final level of 70 is a 12.5% fall, within the 15% buffer.
    expect(maturityPayment(dualDirectional, { initial: 80, final: 70 })).toBeCloseTo(1125, 8)
  })

  it('reports whether the fall is paid as a gain', () => {
    const atBuffer = paymentBreakdown(dualDirectional, { initial: 100, final: 85 })
    expect(atBuffer.absoluteReturnApplies).toBe(true)
    expect(atBuffer.participatedReturn).toBeCloseTo(0.15, 8)
    expect(paymentBreakdown(dualDirectional, { initial: 100, final: 80 })).toMatchObject({ absoluteReturnApplies: false })
    expect(paymentBreakdown(dualDirectional, { initial: 100, final: 110 }).absoluteReturnApplies).toBe(false)
    expect(paymentBreakdown(note, { initial: 100, final: 95 }).absoluteReturnApplies).toBeUndefined()
  })

  it.each([0, -0.1, Number.NaN])('rejects a rate of %s', (rate) => {
    expect(productIssues(withDownside(dualDirectional, { absoluteReturn: { rate } }))).toEqual([{ field: 'absoluteReturn', message: 'Absolute return must be greater than zero.' }])
  })

  it('needs a buffer or a barrier', () => {
    expect(productIssues(withDownside(dualDirectional, { buffer: undefined }))).toEqual([{ field: 'absoluteReturn', message: 'Absolute return needs a buffer or a downside barrier.' }])
    expect(productIssues(withDownside(dualDirectional, { buffer: undefined, barrier: { level: 0.8, observation: 'final' } }))).toEqual([])
  })

  describe('with a barrier', () => {
    // A public trigger note on its worst performing index: 125% upside, a 70% downside threshold, 50% absolute return.
    const trigger = withUpside(withDownside({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, { barrier: { level: 0.7, observation: 'final' }, absoluteReturn: { rate: 0.5 } }), { rate: 1.25 })

    it.each([
      [105, 1062.5],
      [95, 1025],
      [70, 1150],
      [69.99, 699.9],
      [15, 150],
      [0, 0],
    ])('pays %s final level as %s units, as the public note does', (finalLevel, expected) => {
      expect(maturityPayment(trigger, { initial: 100, final: finalLevel })).toBeCloseTo(expected, 8)
    })

    it('pays the gain at or above the downside barrier and counts the whole fall below it', () => {
      expect(paymentBreakdown(trigger, { initial: 100, final: 70 })).toMatchObject({ absoluteReturnApplies: true, barrierReached: false })
      const below = paymentBreakdown(trigger, { initial: 100, final: 69 })
      expect(below).toMatchObject({ absoluteReturnApplies: false, barrierReached: true })
      expect(below.participatedReturn).toBeCloseTo(-0.31, 8)
    })

    it('is measured from the determined initial level, such as a lookback level', () => {
      // Lookback level 80, so the barrier is 56: a final level of 60 is a 25% fall, paid at 50% as a gain.
      expect(maturityPayment(trigger, { initial: 80, final: 60 })).toBeCloseTo(1125, 8)
    })
  })
})

describe('averaging determination', () => {
  const averaging = (observationCount: number): SingleProduct => ({ ...note, underlier: { ...note.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount } } } })

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
    expect(validateProduct(averaging(2))).toEqual([])
    expect(validateProduct(averaging(12))).toEqual([])
  })

  it.each([1, 13, 2.5, Number.NaN])('rejects %s observations', (count) => {
    expect(productIssues(averaging(count))).toEqual([{ field: 'observationCount', message: 'Observations must be a whole number from 2 to 12.' }])
  })
})

describe('lookback determination', () => {
  const upsideOnly: SingleProduct = { ...note, payoff: { participations: [{ direction: 'upside', rate: 1 }] } }
  const lookback = (observationCount: number, base: SingleProduct = upsideOnly): SingleProduct => ({
    ...base,
    underlier: { ...base.underlier, determination: { ...base.underlier.determination, initial: { kind: 'lookback', observationCount } } },
  })
  // The levels observed from pricing: the level on the pricing date first, then each date after it.
  const paymentFrom = (n: SingleProduct, fromPricing: number[], finalLevel: number) =>
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
    expect(validateProduct(both)).toEqual([])
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
    expect(validateProduct(lookback(2))).toEqual([])
    expect(validateProduct(lookback(12))).toEqual([])
  })

  it.each([1, 13, 2.5, Number.NaN])('rejects %s observations', (count) => {
    expect(productIssues(lookback(count))).toEqual([{ field: 'lookbackObservationCount', message: 'Lookback observations must be a whole number from 2 to 12.' }])
  })
})

describe('weighted basket', () => {
  // The worked example in docs/basket.md: Synthetic Index A starts at 100 and Synthetic Co at 40, each weighted 50%.
  const basket: BasketUnderlier = {
    kind: 'basket',
    components: [
      { asset: { kind: 'equity-index', name: 'Synthetic Index A' }, weight: 0.5 },
      { asset: { kind: 'equity', name: 'Synthetic Co' }, weight: 0.5 },
    ],
    determination: {
      initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Co', level: 40 }] },
      final: { kind: 'final-date' },
      basketReturn: { kind: 'weighted' },
    },
  }
  const withWeights = (a: number, b: number): BasketUnderlier => ({ ...basket, components: [{ ...basket.components[0], weight: a }, { ...basket.components[1], weight: b }] })
  const basketNote: Product = { ...note, underlier: basket, payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] } }
  const averaged: BasketUnderlier = { ...basket, determination: { ...basket.determination, final: { kind: 'averaging', observationCount: 2 } } }
  const issuesOf = (underlier: BasketUnderlier) => productIssues({ ...basketNote, underlier })

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

  it('finds each initial level by its asset, whatever order the levels are listed in', () => {
    const reordered = withWeights(0.75, 0.25)
    const levels = [...basket.determination.initial.levels].reverse()
    // 75% × +30% + 25% × −10% = +20%.
    expect(basketBreakdown({ ...reordered, determination: { ...basket.determination, initial: { kind: 'given', levels } } }, [[130], [36]]).levels.final).toBeCloseTo(120, 8)
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
    const barrierNote: Product = { ...basketNote, payoff: { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] } }
    // Index A −50% and Co +20% leave the basket at 85, above a downside barrier at 70, so principal is repaid.
    expect(maturityPayment(barrierNote, basketBreakdown(basket, [[50], [48]]).levels)).toBeCloseTo(1000, 8)
  })

  it('gives the components equal weights to two decimal places of a percent, the first taking the remainder', () => {
    expect(equalWeights(2)).toEqual([0.5, 0.5])
    expect(equalWeights(3)).toEqual([0.3334, 0.3333, 0.3333])
    // They do not add up to exactly 1 in floating point, and are still accepted.
    const assets = [...basket.components.map(({ asset }) => asset), { kind: 'equity' as const, name: 'Synthetic Bank' }]
    const components = assets.map((asset, index) => ({ asset, weight: equalWeights(3)[index] }))
    const levels = [...basket.determination.initial.levels, { asset: 'Synthetic Bank', level: 20 }]
    expect(issuesOf({ ...basket, components, determination: { ...basket.determination, initial: { kind: 'given', levels } } })).toEqual([])
    expect(equalWeights(7)).toEqual([0.1432, 0.1428, 0.1428, 0.1428, 0.1428, 0.1428, 0.1428])
  })

  it('accepts the example basket', () => {
    expect(issuesOf(basket)).toEqual([])
  })

  it('needs at least two assets', () => {
    const one: BasketUnderlier = {
      ...basket,
      components: [{ ...basket.components[0], weight: 1 }],
      determination: { ...basket.determination, initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }] } },
    }
    expect(issuesOf(one)).toEqual([{ field: 'basketComponents', message: 'A basket needs at least two assets.' }])
  })

  it('needs a distinct name for each asset, since initial levels refer to assets by name', () => {
    const named = (a: string, b: string): BasketUnderlier => ({ ...basket, components: [{ asset: { kind: 'equity-index', name: a }, weight: 0.5 }, { asset: { kind: 'equity', name: b }, weight: 0.5 }] })
    expect(issuesOf(named(' ', 'Synthetic Co'))).toContainEqual({ field: 'underlierName', message: 'Enter a name for each asset.' })
    expect(issuesOf(named('Synthetic Co', 'Synthetic Co'))).toContainEqual({ field: 'underlierName', message: 'Each asset in a basket needs its own name.' })
  })

  it('needs one initial level per asset, each above zero', () => {
    const withLevels = (levels: { asset: string; level: number }[]): BasketUnderlier => ({ ...basket, determination: { ...basket.determination, initial: { kind: 'given', levels } } })
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }]))).toEqual([{ field: 'initialLevel', message: 'Each asset needs one initial level.' }])
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Index A', level: 40 }]))).toEqual([{ field: 'initialLevel', message: 'Each asset needs one initial level.' }])
    expect(issuesOf(withLevels([{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Co', level: 0 }]))).toEqual([{ field: 'initialLevel', message: 'Initial level of Synthetic Co must be greater than zero.' }])
  })

  it('needs a weight above zero for each asset, adding up to 100%', () => {
    expect(issuesOf(withWeights(0.6, 0.4))).toEqual([])
    expect(issuesOf(withWeights(0.6, 0.6))).toEqual([{ field: 'weights', message: 'Weights must add up to 100%.' }])
    expect(issuesOf(withWeights(1, 0))).toEqual([{ field: 'weights', message: 'Weight of Synthetic Co must be greater than zero.' }])
    expect(issuesOf(withWeights(0.5, Number.NaN))).toContainEqual({ field: 'weights', message: 'Weights must add up to 100%.' })
  })

  it('checks the averaging count as for a single asset', () => {
    expect(issuesOf({ ...basket, determination: { ...basket.determination, final: { kind: 'averaging', observationCount: 13 } } })).toEqual([{ field: 'observationCount', message: 'Observations must be a whole number from 2 to 12.' }])
  })

  it('rejects an invalid basket, and observed levels that do not match its assets', () => {
    expect(() => basketBreakdown(withWeights(0.5, 0.6), [[100], [40]])).toThrow('Weights must add up to 100%.')
    expect(() => basketBreakdown(basket, [[100]])).toThrow('Expected observed levels for 2 assets.')
    expect(() => basketBreakdown(averaged, [[100], [40]])).toThrow('Expected 2 observed levels.')
  })
})

// Synthetic deposits shaped like three public market-linked CDs (docs/deposit.md): one with a minimum supplemental amount,
// one with high participation and no cap, and one with a maximum payment amount.
describe('market-linked deposit', () => {
  const deposit: SingleProduct = { ...note, wrapper: 'deposit', term: { months: 60 }, payoff: { participations: [{ direction: 'upside', rate: 1 }] } }
  const withMinimum: SingleProduct = { ...deposit, term: { months: 84 }, payoff: { ...deposit.payoff, minimumReturn: 0.0525 } }
  const capped: SingleProduct = { ...deposit, payoff: { participations: [{ direction: 'upside', rate: 1, cap: 0.3 }] } }
  const leveraged: SingleProduct = { ...deposit, payoff: { participations: [{ direction: 'upside', rate: 2.65 }] } }
  const pays = (product: Product, change: number) => maturityPayment(product, { initial: 100, final: 100 * (1 + change) })

  it('pays the greater of the participation and the minimum return, so the minimum is a floor, not an addition', () => {
    for (const [change, payment] of [[0.7, 1700], [0.07, 1070], [0.0525, 1052.5], [0.05, 1052.5], [0, 1052.5], [-0.1, 1052.5], [-0.7, 1052.5]]) {
      expect(pays(withMinimum, change)).toBeCloseTo(payment, 8)
    }
  })

  it('repays principal on a fall without a minimum, at any participation rate', () => {
    for (const change of [-0.5, -0.1, 0]) expect(pays(leveraged, change)).toBe(1000)
    expect(pays(leveraged, 0.1)).toBeCloseTo(1265, 8)
  })

  it('caps the payment at the maximum return', () => {
    for (const [change, payment] of [[0.6, 1300], [0.3, 1300], [0.2, 1200], [0.05, 1050], [0, 1000], [-0.5, 1000]]) {
      expect(pays(capped, change)).toBeCloseTo(payment, 8)
    }
  })

  it('has a floor of principal, which only the minimum return raises', () => {
    expect(paymentBreakdown(deposit, { initial: 100, final: 50 })).toMatchObject({ floor: 1000, floorApplies: false, payment: 1000 })
    expect(paymentBreakdown(withMinimum, { initial: 100, final: 50 })).toMatchObject({ floor: 1052.5, floorApplies: true, payment: 1052.5 })
    expect(paymentBreakdown(withMinimum, { initial: 100, final: 120 })).toMatchObject({ floorApplies: false, payment: 1200 })
  })

  it('pays principal plus the minimum when it has no participation', () => {
    expect(pays({ ...withMinimum, payoff: { participations: [], minimumReturn: 0.0525 } }, 0.3)).toBeCloseTo(1052.5, 8)
  })

  it('accepts upside participation, a cap and a minimum return below it', () => {
    expect(validateProduct(deposit)).toEqual([])
    expect(validateProduct({ ...capped, payoff: { ...capped.payoff, minimumReturn: 0.05 } })).toEqual([])
  })

  it('rejects anything that could pay less than principal', () => {
    const downside: SingleProduct = { ...deposit, payoff: { participations: [{ direction: 'upside', rate: 1 }, { direction: 'downside', rate: 1 }] } }
    expect(productIssues(downside)).toEqual([{ field: 'participations', message: 'A deposit repays principal in full, so it cannot have downside participation.' }])
    expect(productIssues({ ...deposit, payoff: { ...deposit.payoff, principalProtection: 1 } })).toEqual([{ field: 'principalProtection', message: 'A deposit repays principal in full, so it has no principal protection term.' }])
  })

  it.each([0, -0.01, Number.NaN])('rejects a minimum return of %s', (minimumReturn) => {
    expect(productIssues({ ...deposit, payoff: { ...deposit.payoff, minimumReturn } })).toEqual([{ field: 'minimumReturn', message: 'Minimum return must be greater than zero.' }])
  })

  it('rejects a minimum return at or above the cap', () => {
    for (const minimumReturn of [0.3, 0.4]) {
      expect(productIssues({ ...capped, payoff: { ...capped.payoff, minimumReturn } })).toEqual([{ field: 'minimumReturn', message: 'Minimum return must be less than the cap.' }])
    }
  })

  it('allows a minimum return on deposits only', () => {
    expect(productIssues({ ...note, payoff: { ...note.payoff, minimumReturn: 0.05 } })).toEqual([{ field: 'minimumReturn', message: 'A minimum return is available on deposits only.' }])
  })
})

describe('annualised return', () => {
  // The public basket CD's table: $1,052.50 after 7 years is 0.73% a year, $1,070.00 is 0.97% and $1,700.00 is 7.88%.
  it.each([[1052.5, 0.0073], [1070, 0.0097], [1700, 0.0788]])('turns %s after 7 years into %s a year', (payment, yearly) => {
    expect(annualisedReturn(payment, 1000, 84)).toBeCloseTo(yearly, 4)
  })

  it('raises the growth to the power of 12 ÷ term months, including part years', () => {
    expect(annualisedReturn(1100, 1000, 18)).toBeCloseTo(1.1 ** (12 / 18) - 1, 12)
    expect(annualisedReturn(1000, 1000, 36)).toBe(0)
  })
})

describe('withSubFeatures with an upside barrier', () => {
  it('puts the barrier on upside participation before its rate, and drops it when there is no upside', () => {
    const upsideBarrier = { level: 1.3, observation: 'final' as const, rebate: 0.02 }
    const [upside] = withSubFeatures([{ direction: 'upside', rate: 0.8 }], { upsideBarrier })
    expect(upside).toEqual({ direction: 'upside', barrier: upsideBarrier, rate: 0.8, cap: undefined })
    expect(Object.keys(upside)).toEqual(['direction', 'barrier', 'rate', 'cap'])
    expect(withSubFeatures([{ direction: 'downside', rate: 1 }], { upsideBarrier })).toEqual([{ direction: 'downside', rate: 1 }])
  })
})

describe('daily close observation', () => {
  // The worked examples in docs/daily-observation.md. The downside note has a 70% barrier, 100% downside and no protection.
  const noProtection = { ...note, payoff: { ...note.payoff, principalProtection: undefined } }
  const downsideAt = (observation: 'final' | 'daily-close') => withDownside(noProtection, { barrier: { level: 0.7, observation } })
  const dailyDownside = downsideAt('daily-close')
  const finalDownside = downsideAt('final')
  // 80% upside, a 130% barrier, a 2% rebate, 100% protection, no downside participation.
  const finnedAt = (observation: 'final' | 'daily-close') => withUpside({ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside', rate: 1.5 }] } }, { rate: 0.8, barrier: { level: 1.3, observation, rebate: 0.02 } })
  const dailyUpside = finnedAt('daily-close')
  const finalUpside = finnedAt('final')

  describe('downside barrier', () => {
    it.each([
      [100, 65, 1000, 1000],
      [80, 80, 1000, 1000],
      [80, 65, 800, 1000],
      [65, 65, 650, 650],
    ])('pays final level %s after a lowest close of %s as %s, against %s observed on the final date', (final, lowestClose, daily, onFinalDate) => {
      expect(maturityPayment(dailyDownside, { initial: 100, final, lowestClose })).toBeCloseTo(daily, 8)
      expect(maturityPayment(finalDownside, { initial: 100, final, lowestClose })).toBeCloseTo(onFinalDate, 8)
    })

    it('does not reach the barrier by closing at it', () => {
      expect(maturityPayment(dailyDownside, { initial: 100, final: 80, lowestClose: 70 })).toBe(1000)
      expect(maturityPayment(dailyDownside, { initial: 100, final: 80, lowestClose: 69.99 })).toBeCloseTo(800, 8)
    })

    it('counts no close beyond the initial and final levels when none is given', () => {
      expect(paymentBreakdown(dailyDownside, { initial: 100, final: 80 })).toMatchObject({ barrierReached: false, lowestClose: 80, participatedReturn: 0 })
      expect(paymentBreakdown(dailyDownside, { initial: 100, final: 65 })).toMatchObject({ barrierReached: true, lowestClose: 65, participatedReturn: -0.35 })
    })

    it('leaves a rise to upside participation, whatever the closes did', () => {
      expect(maturityPayment(dailyDownside, { initial: 100, final: 120, lowestClose: 50 })).toBeCloseTo(1300, 8)
    })

    it('reports the lowest close only when the barrier is observed daily', () => {
      expect(paymentBreakdown(dailyDownside, { initial: 100, final: 80, lowestClose: 65 })).toMatchObject({ barrierLevel: 70, barrierReached: true, lowestClose: 65 })
      expect(paymentBreakdown(finalDownside, { initial: 100, final: 80, lowestClose: 65 })).toMatchObject({ barrierReached: false, lowestClose: undefined })
    })

    it('never pays more than the same barrier observed on the final date', () => {
      for (let final = 0; final <= 150; final += 5) {
        for (let lowestClose = 0; lowestClose <= Math.min(100, final); lowestClose += 5) {
          expect(maturityPayment(dailyDownside, { initial: 100, final, lowestClose })).toBeLessThanOrEqual(maturityPayment(finalDownside, { initial: 100, final }) + 1e-9)
        }
      }
    })

    it('is measured from the determined initial level', () => {
      // Initial level 80, so the barrier is 56: a lowest close of 60 does not reach it, 50 does.
      expect(maturityPayment(dailyDownside, { initial: 80, final: 70, lowestClose: 60 })).toBe(1000)
      expect(maturityPayment(dailyDownside, { initial: 80, final: 70, lowestClose: 50 })).toBeCloseTo(875, 8)
    })
  })

  describe('upside barrier', () => {
    it.each([
      [120, 125, 1160, 1160],
      [120, 135, 1020, 1160],
      [150, 150, 1020, 1020],
      [90, 135, 1020, 1000],
    ])('pays final level %s after a highest close of %s as %s, against %s observed on the final date', (final, highestClose, daily, onFinalDate) => {
      expect(maturityPayment(dailyUpside, { initial: 100, final, highestClose })).toBeCloseTo(daily, 8)
      expect(maturityPayment(finalUpside, { initial: 100, final, highestClose })).toBeCloseTo(onFinalDate, 8)
    })

    it('does not reach the barrier by closing at it', () => {
      expect(maturityPayment(dailyUpside, { initial: 100, final: 120, highestClose: 130 })).toBeCloseTo(1160, 8)
      expect(maturityPayment(dailyUpside, { initial: 100, final: 120, highestClose: 130.01 })).toBe(1020)
    })

    it('counts no close beyond the initial and final levels when none is given', () => {
      expect(paymentBreakdown(dailyUpside, { initial: 100, final: 120 })).toMatchObject({ upsideBarrierReached: false, highestClose: 120 })
      expect(paymentBreakdown(dailyUpside, { initial: 100, final: 140 })).toMatchObject({ upsideBarrierReached: true, highestClose: 140, participatedReturn: 0.02 })
    })

    it('pays principal after a reached barrier with no rebate, even if the underlier falls back', () => {
      const noRebate = withUpside(dailyUpside, { barrier: { level: 1.3, observation: 'daily-close' } })
      expect(maturityPayment(noRebate, { initial: 100, final: 120, highestClose: 135 })).toBe(1000)
    })

    it('puts a close on the right side of a barrier that floating point cannot state exactly', () => {
      const at = (highestClose: number) => paymentBreakdown(withUpside(dailyUpside, { barrier: { level: 1.1, observation: 'daily-close' } }), { initial: 100, final: 105, highestClose }).upsideBarrierReached
      expect(at(110)).toBe(false)
      expect(at(110.01)).toBe(true)
    })
  })

  describe('closes', () => {
    it.each([
      [{ lowestClose: 95 }, 'Lowest close must be zero or greater and no higher than the initial and final levels.'],
      [{ lowestClose: -1 }, 'Lowest close must be zero or greater and no higher than the initial and final levels.'],
      [{ lowestClose: Number.NaN }, 'Lowest close must be zero or greater and no higher than the initial and final levels.'],
      [{ highestClose: 95 }, 'Highest close must be no lower than the initial and final levels.'],
    ])('rejects closes %j that contradict the initial and final levels', (closes, message) => {
      expect(() => paymentBreakdown(dailyDownside, { initial: 100, final: 90, ...closes })).toThrow(message)
    })
  })

  describe('validation', () => {
    it('allows either barrier on a single underlier with a given initial level', () => {
      expect(productIssues(dailyDownside)).toEqual([])
      expect(productIssues(dailyUpside)).toEqual([])
    })

    it('allows averaging', () => {
      const averaged = (product: SingleProduct): SingleProduct => ({ ...product, underlier: { ...product.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 4 } } } })
      expect(productIssues(averaged(dailyDownside))).toEqual([])
      expect(productIssues(averaged(dailyUpside))).toEqual([])
    })

    it('does not allow lookback', () => {
      const lookback = (product: SingleProduct): SingleProduct => ({ ...product, underlier: { ...product.underlier, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } })
      expect(productIssues(lookback(dailyDownside))).toEqual([{ field: 'barrier', message: 'A downside barrier cannot be observed daily with lookback or a basket.' }])
      expect(productIssues(lookback(dailyUpside))).toEqual([{ field: 'upsideBarrier', message: 'An upside barrier cannot be observed daily with lookback or a basket.' }])
      expect(productIssues(lookback(finalDownside))).toEqual([])
    })

    it('does not allow a basket', () => {
      const basket = (product: SingleProduct): Product => ({
        ...product,
        underlier: {
          kind: 'basket',
          components: [{ asset: { kind: 'equity-index', name: 'Index A' }, weight: 0.5 }, { asset: { kind: 'equity-index', name: 'Index B' }, weight: 0.5 }],
          determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 100 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } },
        },
      })
      expect(productIssues(basket(dailyDownside))).toEqual([{ field: 'barrier', message: 'A downside barrier cannot be observed daily with lookback or a basket.' }])
      expect(productIssues(basket(dailyUpside))).toEqual([{ field: 'upsideBarrier', message: 'An upside barrier cannot be observed daily with lookback or a basket.' }])
    })

    it('does not allow a downside barrier with absolute return', () => {
      expect(productIssues(withDownside(dailyDownside, { absoluteReturn: { rate: 0.5 } }))).toEqual([{ field: 'barrier', message: 'Absolute return reads a downside barrier on the final date only.' }])
      expect(productIssues(withDownside(finalDownside, { absoluteReturn: { rate: 0.5 } }))).toEqual([])
    })

    it('allows an upside barrier with downside participation, on either observation', () => {
      const both = (observation: 'final' | 'daily-close') => ({ ...note, payoff: { ...note.payoff, participations: [{ direction: 'downside' as const, rate: 1 }, ...finnedAt(observation).payoff.participations] } })
      expect(productIssues(both('daily-close'))).toEqual([])
      expect(productIssues(both('final'))).toEqual([])
    })
  })
})

describe('barrier absolute return', () => {
  // The worked example in docs/barrier-absolute-return.md: 100% absolute return, a lower barrier at 80% and an upper barrier at 125%,
  // both observed on every close, and a 2% conditional return.
  const barrierAbsolute = (terms: Partial<BarrierAbsoluteReturn> = {}): SingleProduct => ({
    ...note,
    payoff: {
      participations: [],
      barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' }, conditionalReturn: 0.02, ...terms },
    },
  })
  const observed = (lower: 'final' | 'daily-close', upper: 'final' | 'daily-close', terms: Partial<BarrierAbsoluteReturn> = {}) =>
    barrierAbsolute({ lowerBarrier: { level: 0.8, observation: lower }, upperBarrier: { level: 1.25, observation: upper }, ...terms })
  const daily = barrierAbsolute()
  const onFinalDate = observed('final', 'final')

  describe('payment', () => {
    it.each([
      [100, 100, 100, 1000, 1000],
      [90, 90, 100, 1100, 1100],
      [110, 100, 110, 1100, 1100],
      [80, 80, 100, 1200, 1200],
      [125, 100, 125, 1250, 1250],
      [79, 79, 100, 1020, 1020],
      [126, 100, 126, 1020, 1020],
      [100, 79, 100, 1020, 1000],
      [110, 100, 130, 1020, 1100],
    ])('pays final level %s after a lowest close of %s and a highest close of %s as %s, against %s observed on the final date', (final, lowestClose, highestClose, onEveryClose, finalDateOnly) => {
      expect(maturityPayment(daily, { initial: 100, final, lowestClose, highestClose })).toBeCloseTo(onEveryClose, 8)
      expect(maturityPayment(onFinalDate, { initial: 100, final, lowestClose, highestClose })).toBeCloseTo(finalDateOnly, 8)
    })

    it('does not reach a barrier by closing at it, on either side', () => {
      expect(paymentBreakdown(daily, { initial: 100, final: 100, lowestClose: 80 }).barrierAbsolute).toMatchObject({ lowerReached: false, reached: false })
      expect(paymentBreakdown(daily, { initial: 100, final: 100, lowestClose: 79.99 }).barrierAbsolute).toMatchObject({ lowerReached: true, reached: true })
      expect(paymentBreakdown(daily, { initial: 100, final: 100, highestClose: 125 }).barrierAbsolute).toMatchObject({ upperReached: false, reached: false })
      expect(paymentBreakdown(daily, { initial: 100, final: 100, highestClose: 125.01 }).barrierAbsolute).toMatchObject({ upperReached: true, reached: true })
    })

    it('counts no close beyond the initial and final levels when none is given', () => {
      expect(paymentBreakdown(daily, { initial: 100, final: 90 })).toMatchObject({ lowestClose: 90, highestClose: 100, barrierAbsolute: { reached: false } })
      expect(paymentBreakdown(daily, { initial: 100, final: 79 }).barrierAbsolute).toMatchObject({ lowerReached: true, upperReached: false })
      expect(paymentBreakdown(daily, { initial: 100, final: 126 }).barrierAbsolute).toMatchObject({ lowerReached: false, upperReached: true })
    })

    it('reports the barrier levels from the determined initial level', () => {
      expect(paymentBreakdown(daily, { initial: 100, final: 100 }).barrierAbsolute).toMatchObject({ lowerLevel: 80, upperLevel: 125 })
      expect(paymentBreakdown(daily, { initial: 80, final: 80 }).barrierAbsolute).toMatchObject({ lowerLevel: 64, upperLevel: 100 })
    })

    it('reads each barrier on its own observation, so the two sides can differ', () => {
      // The lower barrier on every close and the upper on the final date: an earlier close above 125 does not count, a final level above it does.
      const mixed = observed('daily-close', 'final')
      expect(maturityPayment(mixed, { initial: 100, final: 110, lowestClose: 100, highestClose: 130 })).toBeCloseTo(1100, 8)
      expect(maturityPayment(mixed, { initial: 100, final: 126, highestClose: 126 })).toBeCloseTo(1020, 8)
      expect(maturityPayment(mixed, { initial: 100, final: 100, lowestClose: 79 })).toBeCloseTo(1020, 8)
      const other = observed('final', 'daily-close')
      expect(maturityPayment(other, { initial: 100, final: 100, lowestClose: 79 })).toBeCloseTo(1000, 8)
      expect(maturityPayment(other, { initial: 100, final: 110, highestClose: 130 })).toBeCloseTo(1020, 8)
    })

    it('reports the lowest and highest close only for a barrier observed daily', () => {
      expect(paymentBreakdown(daily, { initial: 100, final: 100, lowestClose: 90, highestClose: 110 })).toMatchObject({ lowestClose: 90, highestClose: 110 })
      expect(paymentBreakdown(onFinalDate, { initial: 100, final: 100, lowestClose: 90, highestClose: 110 })).toMatchObject({ lowestClose: undefined, highestClose: undefined })
      const mixed = paymentBreakdown(observed('daily-close', 'final'), { initial: 100, final: 100, lowestClose: 90, highestClose: 110 })
      expect(mixed.lowestClose).toBe(90)
      expect(mixed.highestClose).toBeUndefined()
    })

    it('takes each barrier at its own level, so the two sides can be asymmetric', () => {
      // Levels as in a public note with barriers 20% below and 25.7% above.
      const asymmetric = barrierAbsolute({ lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.257, observation: 'daily-close' } })
      expect(maturityPayment(asymmetric, { initial: 100, final: 125.7 })).toBeCloseTo(1257, 8)
      expect(maturityPayment(asymmetric, { initial: 100, final: 125.71 })).toBeCloseTo(1020, 8)
      expect(maturityPayment(asymmetric, { initial: 100, final: 80 })).toBeCloseTo(1200, 8)
    })

    it('pays principal only after a barrier when there is no conditional return', () => {
      const none = barrierAbsolute({ conditionalReturn: undefined })
      expect(maturityPayment(none, { initial: 100, final: 126 })).toBe(1000)
      expect(maturityPayment(none, { initial: 100, final: 110 })).toBeCloseTo(1100, 8)
      expect(paymentBreakdown(none, { initial: 100, final: 126 }).barrierAbsolute?.conditionalReturn).toBe(0)
    })

    it('pays only the stated share of the absolute return', () => {
      expect(maturityPayment(barrierAbsolute({ rate: 0.5 }), { initial: 100, final: 90 })).toBeCloseTo(1050, 8)
      expect(maturityPayment(barrierAbsolute({ rate: 0.5 }), { initial: 100, final: 110 })).toBeCloseTo(1050, 8)
    })

    it('puts a level on the right side of a barrier that floating point cannot state exactly', () => {
      // 0.57 × 100 is 56.99999999999999 in floating point. The barrier is rounded to 57, so a final level of 57 is at it, not below it.
      const lowest = barrierAbsolute({ lowerBarrier: { level: 0.57, observation: 'final' } })
      expect(paymentBreakdown(lowest, { initial: 100, final: 57 }).barrierAbsolute?.lowerReached).toBe(false)
      expect(paymentBreakdown(lowest, { initial: 100, final: 56.99 }).barrierAbsolute?.lowerReached).toBe(true)
      const highest = barrierAbsolute({ upperBarrier: { level: 1.1, observation: 'final' } })
      expect(paymentBreakdown(highest, { initial: 100, final: 110 }).barrierAbsolute?.upperReached).toBe(false)
      expect(paymentBreakdown(highest, { initial: 100, final: 110.01 }).barrierAbsolute?.upperReached).toBe(true)
    })

    it('never pays less than principal, whatever the levels and closes', () => {
      for (let final = 0; final <= 300; final += 5) {
        for (const extra of [0, 0.3, 0.6]) {
          const lowestClose = Math.min(100, final) * (1 - extra)
          const highestClose = Math.max(100, final) * (1 + extra)
          expect(maturityPayment(daily, { initial: 100, final, lowestClose, highestClose })).toBeGreaterThanOrEqual(1000 - 1e-9)
        }
      }
    })

    it('rejects closes that contradict the initial and final levels', () => {
      expect(() => paymentBreakdown(daily, { initial: 100, final: 90, lowestClose: 95 })).toThrow('Lowest close must be zero or greater and no higher than the initial and final levels.')
      expect(() => paymentBreakdown(daily, { initial: 100, final: 90, highestClose: 95 })).toThrow('Highest close must be no lower than the initial and final levels.')
    })
  })

  describe('validation', () => {
    it('accepts the worked example, with or without protection, and on a deposit', () => {
      expect(productIssues(daily)).toEqual([])
      expect(productIssues({ ...daily, payoff: { ...daily.payoff, principalProtection: 1 } })).toEqual([])
      expect(productIssues(onFinalDate)).toEqual([])
      expect(productIssues({ ...daily, wrapper: 'deposit' })).toEqual([])
    })

    it.each([0, -0.5, 1, 1.2, Number.NaN])('rejects a lower barrier at %s', (level) => {
      expect(productIssues(barrierAbsolute({ lowerBarrier: { level, observation: 'final' } }))).toEqual([{ field: 'lowerBarrier', message: 'Lower barrier must be greater than 0% and less than 100% of the initial level.' }])
    })

    it.each([1, 0.9, 2.01, 0, Number.NaN])('rejects an upper barrier at %s', (level) => {
      expect(productIssues(barrierAbsolute({ upperBarrier: { level, observation: 'final' } }))).toEqual([{ field: 'upperBarrier', message: 'Upper barrier must be greater than 100% and at most 200% of the initial level.' }])
    })

    it('allows an upper barrier at 200% and a lower barrier just above zero', () => {
      expect(productIssues(barrierAbsolute({ upperBarrier: { level: 2, observation: 'final' }, lowerBarrier: { level: 0.01, observation: 'final' } }))).toEqual([])
    })

    it.each([0, -0.1, Number.NaN])('rejects an absolute return of %s', (rate) => {
      expect(productIssues(barrierAbsolute({ rate }))).toEqual([{ field: 'barrierAbsoluteReturn', message: 'Absolute return must be greater than zero.' }])
    })

    it.each([-0.01, Number.NaN])('rejects a conditional return of %s, and allows zero', (conditionalReturn) => {
      expect(productIssues(barrierAbsolute({ conditionalReturn }))).toEqual([{ field: 'conditionalReturn', message: 'Conditional return must be zero or greater.' }])
      expect(productIssues(barrierAbsolute({ conditionalReturn: 0 }))).toEqual([])
    })

    it('cannot be combined with participation, a minimum return, lookback, a basket or averaging', () => {
      const withParticipation: SingleProduct = { ...daily, payoff: { ...daily.payoff, participations: [{ direction: 'upside', rate: 1 }] } }
      expect(productIssues(withParticipation)).toEqual([{ field: 'barrierAbsoluteReturn', message: 'Absolute return in both directions cannot be combined with participation, a buffer, a cap or an absolute return on a fall.' }])
      expect(productIssues({ ...daily, wrapper: 'deposit', payoff: { ...daily.payoff, minimumReturn: 0.05 } })).toEqual([{ field: 'barrierAbsoluteReturn', message: 'Absolute return in both directions cannot be combined with a minimum return.' }])
      const needsSingle = 'Absolute return in both directions needs a single underlier with a fixed initial level and a final level on the final date.'
      const lookback: SingleProduct = { ...daily, underlier: { ...daily.underlier, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } }
      const averaging: SingleProduct = { ...daily, underlier: { ...daily.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 4 } } } }
      expect(productIssues(lookback)).toEqual([{ field: 'barrierAbsoluteReturn', message: needsSingle }])
      expect(productIssues(averaging)).toEqual([{ field: 'barrierAbsoluteReturn', message: needsSingle }])
      const basket: Product = {
        ...daily,
        underlier: {
          kind: 'basket',
          components: [{ asset: { kind: 'equity-index', name: 'Index A' }, weight: 0.5 }, { asset: { kind: 'equity-index', name: 'Index B' }, weight: 0.5 }],
          determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 100 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } },
        },
      }
      expect(productIssues(basket)).toEqual([{ field: 'barrierAbsoluteReturn', message: needsSingle }])
    })
  })
})

describe('daily upside barrier with downside participation', () => {
  // Allowed as a combination of parts that are each defined; no public note was found with it (docs/daily-observation.md). Each side
  // keeps its own term: an early upside breach ends only the upside, and the downside term reads the final return as it always does.
  const noProtection = { ...note, payoff: { ...note.payoff, principalProtection: undefined } }
  const bothSides = (downside: Partial<DownsideParticipation>, upsideRebate?: number, upsideObservation: 'final' | 'daily-close' = 'daily-close'): SingleProduct =>
    withUpside(withDownside(noProtection, { rate: 1, ...downside }), { rate: 0.8, barrier: { level: 1.3, observation: upsideObservation, rebate: upsideRebate } })
  const downsideBarrier = (observation: 'final' | 'daily-close' = 'daily-close') => ({ barrier: { level: 0.7, observation } })

  describe('with a downside barrier and no rebate', () => {
    const product = bothSides(downsideBarrier())

    it.each([
      [100, 100, 100, 1000],
      [120, 100, 120, 1160],
      [120, 100, 135, 1000],
      [90, 90, 135, 1000],
      [90, 65, 135, 900],
      [90, 65, 100, 900],
      [65, 65, 100, 650],
      [65, 65, 135, 650],
    ])('pays final level %s after a lowest close of %s and a highest close of %s as %s', (final, lowestClose, highestClose, expected) => {
      expect(maturityPayment(product, { initial: 100, final, lowestClose, highestClose })).toBeCloseTo(expected, 8)
    })

    it('reports both barriers, each from its own close', () => {
      expect(paymentBreakdown(product, { initial: 100, final: 90, lowestClose: 65, highestClose: 135 })).toMatchObject({ barrierReached: true, upsideBarrierReached: true, lowestClose: 65, highestClose: 135 })
    })
  })

  describe('with a rebate', () => {
    const product = bothSides(downsideBarrier(), 0.02)

    it('adds the rebate to the downside term, since each side keeps its own rule', () => {
      expect(maturityPayment(product, { initial: 100, final: 120, highestClose: 135 })).toBeCloseTo(1020, 8)
      expect(maturityPayment(product, { initial: 100, final: 90, lowestClose: 90, highestClose: 135 })).toBeCloseTo(1020, 8)
      expect(maturityPayment(product, { initial: 100, final: 90, lowestClose: 65, highestClose: 135 })).toBeCloseTo(920, 8)
      expect(maturityPayment(product, { initial: 100, final: 65, lowestClose: 65, highestClose: 135 })).toBeCloseTo(670, 8)
    })

    it('pays no rebate when the upside barrier was not reached', () => {
      expect(maturityPayment(product, { initial: 100, final: 90, lowestClose: 65 })).toBeCloseTo(900, 8)
    })
  })

  it('applies plain downside participation after an early upside breach, with no downside barrier', () => {
    const product = bothSides({})
    expect(maturityPayment(product, { initial: 100, final: 90, highestClose: 135 })).toBeCloseTo(900, 8)
    expect(maturityPayment(product, { initial: 100, final: 120, highestClose: 135 })).toBeCloseTo(1000, 8)
    expect(maturityPayment(product, { initial: 100, final: 120, highestClose: 125 })).toBeCloseTo(1160, 8)
  })

  it('reads a downside barrier on the final date beside a daily upside barrier', () => {
    const product = bothSides(downsideBarrier('final'))
    expect(maturityPayment(product, { initial: 100, final: 90, lowestClose: 65, highestClose: 135 })).toBeCloseTo(1000, 8)
    expect(maturityPayment(product, { initial: 100, final: 65, lowestClose: 65, highestClose: 135 })).toBeCloseTo(650, 8)
  })

  it('leaves the payment unchanged for the cases that could be written before', () => {
    // A daily upside barrier with no downside participation still pays the rebate after a fall back.
    const finned = withUpside({ ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside', rate: 1.5 }] } }, { rate: 0.8, barrier: { level: 1.3, observation: 'daily-close', rebate: 0.02 } })
    expect(maturityPayment(finned, { initial: 100, final: 90, highestClose: 135 })).toBeCloseTo(1020, 8)
    // A downside barrier with an upside barrier read on the final date is as it was.
    const finalDate = bothSides(downsideBarrier('final'), 0.02, 'final')
    expect(maturityPayment(finalDate, { initial: 100, final: 140 })).toBeCloseTo(1020, 8)
    expect(maturityPayment(finalDate, { initial: 100, final: 65 })).toBeCloseTo(650, 8)
  })

  it('still cannot be observed daily with lookback or a basket', () => {
    const lookback: SingleProduct = { ...bothSides(downsideBarrier()), underlier: { ...note.underlier, determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } }
    expect(productIssues(lookback).map(({ field }) => field)).toContain('upsideBarrier')
  })
})
