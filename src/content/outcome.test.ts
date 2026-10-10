import { describe, expect, it } from 'vitest'
import { paymentBreakdown, withSubFeatures, type Participation, type SingleProduct } from '../domain/note'
import { explainOutcome } from './outcome'

const noteWith = (participations: Participation[], principalProtection?: number, cap?: number, buffer?: number): SingleProduct => ({
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 1 }, { direction: 'upside' as const, rate: 1.5 }]
const explain = (note: SingleProduct, finalLevel: number) => explainOutcome(note, paymentBreakdown(note, { initial: 100, final: finalLevel }))

describe('outcome explanation', () => {
  it('says neither limit applies when the cap and the floor both do not bind', () => {
    expect(explain(noteWith(both, 0.9, 0.2), 110)).toBe('The underlier rose 10%. Upside participation of 150% adds 15% to principal. Neither the 1,200 cap nor the 900 floor applies, so the contractual payment is 1,150, 150 more than principal.')
  })

  it('explains a rise with upside participation', () => {
    expect(explain(noteWith(both, 0.9), 110)).toBe('The underlier rose 10%. Upside participation of 150% adds 15% to principal. The 900 floor does not apply, so the contractual payment is 1,150, 150 more than principal.')
  })

  it('explains a rise when upside is not selected', () => {
    const downsideOnly = noteWith([{ direction: 'downside', rate: 1 }], 0.9)
    expect(explain(downsideOnly, 110)).toBe('The underlier rose 10%. No upside participation is selected, so principal is unchanged. The 900 floor does not apply, so the contractual payment is 1,000, the same as principal.')
  })

  it('explains a rise where the cap applies', () => {
    expect(explain(noteWith(both, 0.9, 0.2), 130)).toBe('The underlier rose 30%. Upside participation of 150% adds 45% to principal. The 1,200 cap applies and the 900 floor does not apply, so the contractual payment is 1,200, 200 more than principal.')
  })

  it('explains a rise below the cap', () => {
    expect(explain(noteWith(both, undefined, 0.2), 110)).toBe('The underlier rose 10%. Upside participation of 150% adds 15% to principal. The 1,200 cap does not apply, so the contractual payment is 1,150, 150 more than principal.')
  })

  it('explains a fall with a cap and no protection', () => {
    expect(explain(noteWith(both, undefined, 0.2), 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal. The 1,200 cap does not apply and there is no principal protection, so the contractual payment is 600, 400 less than principal.')
  })

  it('explains a fall above the floor', () => {
    expect(explain(noteWith(both, 0.9), 95)).toBe('The underlier fell 5%. Downside participation of 100% deducts 5% from principal. The 900 floor does not apply, so the contractual payment is 950, 50 less than principal.')
  })

  it('explains a fall where the floor applies', () => {
    expect(explain(noteWith(both, 0.9), 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal. The 900 floor applies, so the contractual payment is 900, 100 less than principal.')
  })

  it('explains a fall when downside is not selected', () => {
    const upsideOnly = noteWith([{ direction: 'upside', rate: 1.5 }], 0.9)
    expect(explain(upsideOnly, 60)).toBe('The underlier fell 40%. No downside participation is selected, so principal is unchanged. The 900 floor does not apply, so the contractual payment is 1,000, the same as principal.')
  })

  it('explains a flat return', () => {
    expect(explain(noteWith(both, 0.9), 100)).toBe('The underlier ended unchanged. A flat return leaves principal unchanged. The 900 floor does not apply, so the contractual payment is 1,000, the same as principal.')
  })

  it('explains a fall with no protection', () => {
    expect(explain(noteWith([{ direction: 'downside', rate: 1 }]), 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal. There is no principal protection, so the contractual payment is 600, 400 less than principal.')
  })

  it('explains a fall that would take the payment below zero', () => {
    expect(explain(noteWith([{ direction: 'downside', rate: 1.5 }]), 20)).toBe('The underlier fell 80%. Downside participation of 150% deducts 120% from principal. The payment cannot fall below zero, so the contractual payment is 0, 1,000 less than principal.')
  })

  it('explains a fall the buffer absorbs in full', () => {
    const buffered = noteWith(both, undefined, undefined, 0.1)
    expect(explain(buffered, 95)).toBe('The underlier fell 5%. The 10% buffer absorbs the whole fall, so principal is unchanged. The contractual payment is 1,000, the same as principal.')
  })

  it('explains a fall beyond the buffer', () => {
    const buffered = noteWith(both, undefined, undefined, 0.1)
    expect(explain(buffered, 60)).toBe('The underlier fell 40%. The buffer absorbs the first 10% of the fall, and downside participation of 100% deducts 30% from principal. There is no principal protection, so the contractual payment is 700, 300 less than principal.')
    const withFloor = { ...buffered, payoff: { ...buffered.payoff, principalProtection: 0.9 } }
    expect(explain(withFloor, 60)).toBe('The underlier fell 40%. The buffer absorbs the first 10% of the fall, and downside participation of 100% deducts 30% from principal. The 900 floor applies, so the contractual payment is 900, 100 less than principal.')
  })

  it('says whether the underlier ended below the barrier', () => {
    const barriered = { ...noteWith(both), payoff: { participations: withSubFeatures(both, { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(explain(barriered, 80)).toBe('The underlier fell 20%. It ended at or above the 70 downside barrier, so downside participation does not apply and principal is unchanged. The contractual payment is 1,000, the same as principal.')
    expect(explain(barriered, 65)).toBe('The underlier fell 35%. It ended below the 70 downside barrier, so downside participation of 100% deducts the whole 35% from principal. There is no principal protection, so the contractual payment is 650, 350 less than principal.')
  })
  it('says the move is an average when the note averages', () => {
    const averaged = { ...noteWith(both, 0.9), underlier: { ...noteWith(both).underlier, determination: { initial: { kind: 'given' as const, level: 100 }, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(explain(averaged, 110)).toBe('Averaged over 5 observations, the underlier rose 10%. Upside participation of 150% adds 15% to principal. The 900 floor does not apply, so the contractual payment is 1,150, 150 more than principal.')
    expect(explain(averaged, 100)).toMatch(/^Averaged over 5 observations, the underlier ended unchanged\./)
  })

  it('names the lookback level the move is measured from', () => {
    const lookback = { ...noteWith([{ direction: 'upside', rate: 1 }]), underlier: { ...noteWith([]).underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }
    expect(explainOutcome(lookback, paymentBreakdown(lookback, { initial: 92, final: 110 }))).toBe('Measured from its lookback level of 92, the underlier rose 19.6%. Upside participation of 100% adds 19.6% to principal. The contractual payment is 1,195.65, 195.65 more than principal.')
    const both = { ...lookback, underlier: { ...lookback.underlier, determination: { ...lookback.underlier.determination, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(explainOutcome(both, paymentBreakdown(both, { initial: 92, final: 110 }))).toMatch(/^Averaged over 5 observations and measured from its lookback level of 92, the underlier rose 19\.6%\./)
  })

  it('explains a note with no features', () => {
    expect(explain(noteWith([]), 110)).toBe('The underlier rose 10%. No upside participation is selected, so principal is unchanged. The contractual payment is 1,000, the same as principal.')
    expect(explain(noteWith([]), 60)).toBe('The underlier fell 40%. No downside participation is selected, so principal is unchanged. The contractual payment is 1,000, the same as principal.')
  })
})

describe('outcome with absolute return', () => {
  const dualDirectional = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.2 }])
  const note = { ...dualDirectional, payoff: { participations: withSubFeatures(dualDirectional.payoff.participations, { buffer: 0.15, absoluteReturn: { rate: 1 }, cap: 0.4 }) } }

  it('pays a fall within the buffer as a gain', () => {
    expect(explain(note, 95)).toBe('The underlier fell 5%. The fall is within the 15% buffer, so absolute return of 100% adds 5% to principal. The 1,400 cap does not apply, so the contractual payment is 1,050, 50 more than principal.')
  })

  it('says a fall beyond the buffer pays no absolute return', () => {
    expect(explain(note, 80)).toBe('The underlier fell 20%. The fall is beyond the buffer, so it pays no absolute return. The buffer absorbs the first 15% of the fall, and downside participation of 100% deducts 5% from principal. The 1,400 cap does not apply and there is no principal protection, so the contractual payment is 950, 50 less than principal.')
  })
})

describe('outcome with absolute return above a barrier', () => {
  const base = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.25 }])
  const trigger = { ...base, payoff: { participations: withSubFeatures(base.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const }, absoluteReturn: { rate: 0.5 } }) } }

  it('pays a fall that ends at or above the downside barrier as a gain', () => {
    expect(explain(trigger, 95)).toBe('The underlier fell 5%. It ended at or above the 70 downside barrier, so absolute return of 50% adds 2.5% to principal. The contractual payment is 1,025, 25 more than principal.')
  })

  it('counts the whole fall below the barrier, with no gain', () => {
    expect(explain(trigger, 60)).toBe('The underlier fell 40%. It ended below the 70 downside barrier, so it pays no absolute return, and downside participation of 100% deducts the whole 40% from principal. There is no principal protection, so the contractual payment is 600, 400 less than principal.')
  })
})

describe('outcome with an upside barrier', () => {
  // The worked example in docs/upside-barrier.md: 80% upside, a 130% barrier, a 2% rebate, 100% protection.
  const upsideOnly = [{ direction: 'upside' as const, rate: 0.8 }]
  const finned = (rebate?: number): SingleProduct => ({ ...noteWith(upsideOnly, 1), payoff: { participations: withSubFeatures(upsideOnly, { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }), principalProtection: 1 } })

  it('says the rebate replaces upside participation above the upside barrier', () => {
    expect(explain(finned(0.02), 140)).toBe('The underlier rose 40%. It ended above the 130 upside barrier, so upside participation ends and a rebate of 2% is added to principal. The 1,000 floor does not apply, so the contractual payment is 1,020, 20 more than principal.')
    expect(explain(finned(0.02), 130.01)).toContain('It ended above the 130 upside barrier')
  })

  it('says participation still applies at the barrier, where the payment is largest', () => {
    expect(explain(finned(0.02), 130)).toBe('The underlier rose 30%. It ended at or below the 130 upside barrier, so upside participation of 80% adds 24% to principal. The 1,000 floor does not apply, so the contractual payment is 1,240, 240 more than principal.')
  })

  it('says principal is unchanged above the upside barrier when there is no rebate', () => {
    expect(explain(finned(), 140)).toContain('so upside participation ends and principal is unchanged.')
  })

  it('says the underlier ended at or below the barrier, so participation applies', () => {
    expect(explain(finned(0.02), 120)).toBe('The underlier rose 20%. It ended at or below the 130 upside barrier, so upside participation of 80% adds 16% to principal. The 1,000 floor does not apply, so the contractual payment is 1,160, 160 more than principal.')
  })

  it('leaves a flat return and a fall to the usual sentences', () => {
    expect(explain(finned(0.02), 100)).toContain('A flat return leaves principal unchanged.')
    expect(explain(finned(0.02), 80)).toContain('No downside participation is selected, so principal is unchanged.')
  })
})

describe('outcome with barriers observed on every close', () => {
  const explainWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number }) => explainOutcome(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }))

  describe('downside barrier', () => {
    const daily = { ...noteWith(both), payoff: { participations: withSubFeatures(both, { barrier: { level: 0.7, observation: 'daily-close' as const } }) } }

    it('counts the whole fall when a close was below the barrier, although the underlier recovered', () => {
      expect(explainWith(daily, 80, { lowestClose: 65 })).toBe('The underlier fell 20%. The lowest close, 65, was below the 70 downside barrier, so downside participation of 100% deducts the whole 20% from principal. There is no principal protection, so the contractual payment is 800, 200 less than principal.')
    })

    it('leaves principal unchanged when no close was below the barrier', () => {
      expect(explainWith(daily, 80, {})).toBe('The underlier fell 20%. No close was below the 70 downside barrier (the lowest was 80), so downside participation does not apply and principal is unchanged. The contractual payment is 1,000, the same as principal.')
    })
  })

  describe('upside barrier', () => {
    const upsideOnly = [{ direction: 'upside' as const, rate: 0.8 }]
    const finned: SingleProduct = { ...noteWith(upsideOnly, 1), payoff: { participations: withSubFeatures(upsideOnly, { upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate: 0.02 } }), principalProtection: 1 } }

    it('pays the rebate whatever the final level once a close reached the barrier', () => {
      expect(explainWith(finned, 90, { highestClose: 135 })).toBe('The underlier fell 10%. The highest close, 135, was above the 130 upside barrier, so upside participation ends and a rebate of 2% is added to principal, whatever the final level. The 1,000 floor does not apply, so the contractual payment is 1,020, 20 more than principal.')
    })

    it('applies upside participation when no close reached the barrier', () => {
      expect(explainWith(finned, 120, {})).toBe('The underlier rose 20%. No close was above the 130 upside barrier (the highest was 120), so upside participation of 80% adds 16% to principal. The 1,000 floor does not apply, so the contractual payment is 1,160, 160 more than principal.')
    })
  })
})

describe('outcome with barrier absolute return', () => {
  const bothWays = (terms: Partial<NonNullable<SingleProduct['payoff']['barrierAbsoluteReturn']>> = {}): SingleProduct => ({
    ...noteWith([]),
    payoff: { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' }, conditionalReturn: 0.02, ...terms } },
  })
  const explainWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number } = {}) => explainOutcome(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }))

  it('pays the absolute value of a fall or a rise when no barrier was reached', () => {
    expect(explainWith(bothWays(), 90)).toBe('The underlier fell 10%. No barrier was reached, so absolute return of 100% of the 10% fall adds 10% to principal. The contractual payment is 1,100, 100 more than principal.')
    expect(explainWith(bothWays(), 110)).toBe('The underlier rose 10%. No barrier was reached, so absolute return of 100% of the 10% rise adds 10% to principal. The contractual payment is 1,100, 100 more than principal.')
    expect(explainWith(bothWays(), 100)).toBe('The underlier ended unchanged. No barrier was reached and the return is flat, so absolute return adds nothing to principal. The contractual payment is 1,000, the same as principal.')
  })

  it('names the lowest close when it was below the lower barrier, although the final level recovered', () => {
    expect(explainWith(bothWays(), 100, { lowestClose: 79 })).toBe('The underlier ended unchanged. The lowest close, 79, was below the 80 lower barrier, so the absolute return ends and a fixed 2% is added to principal, whatever the final level. The contractual payment is 1,020, 20 more than principal.')
  })

  it('names the highest close when it was above the upper barrier, although the final level fell back', () => {
    expect(explainWith(bothWays(), 110, { highestClose: 130 })).toBe('The underlier rose 10%. The highest close, 130, was above the 125 upper barrier, so the absolute return ends and a fixed 2% is added to principal, whatever the final level. The contractual payment is 1,020, 20 more than principal.')
  })

  it('names both barriers when a close went beyond each', () => {
    expect(explainWith(bothWays(), 110, { lowestClose: 79, highestClose: 130 })).toContain('The lowest close, 79, was below the 80 lower barrier and the highest close, 130, was above the 125 upper barrier, so the absolute return ends')
  })

  it('names the final level for a barrier observed on the final date', () => {
    const onFinalDate = bothWays({ lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.25, observation: 'final' } })
    expect(explainWith(onFinalDate, 126)).toBe('The underlier rose 26%. It ended above the 125 upper barrier, so the absolute return ends and a fixed 2% is added to principal, whatever the final level. The contractual payment is 1,020, 20 more than principal.')
    expect(explainWith(onFinalDate, 79)).toContain('It ended below the 80 lower barrier')
  })

  it('says principal is unchanged after a barrier when there is no conditional return', () => {
    expect(explainWith(bothWays({ conditionalReturn: undefined }), 126)).toBe('The underlier rose 26%. The highest close, 126, was above the 125 upper barrier, so the absolute return ends and principal is unchanged, whatever the final level. The contractual payment is 1,000, the same as principal.')
  })
})

describe('outcome with a daily upside barrier and downside participation', () => {
  // Each side keeps its own effect: an early upside breach ends the upside, and the downside reads the final return as ever.
  const bothSides = (rebate?: number, downsideBarrier = true): SingleProduct => ({
    ...noteWith(both),
    payoff: { participations: withSubFeatures(both.map((p) => p.direction === 'upside' ? { ...p, rate: 0.8 } : p), {
      barrier: downsideBarrier ? { level: 0.7, observation: 'daily-close' as const } : undefined,
      upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate },
    }) },
  })
  const explainWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number }) => explainOutcome(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }))

  it('states both effects: the upside ended, and the fall counted whole', () => {
    expect(explainWith(bothSides(), 90, { lowestClose: 65, highestClose: 135 })).toBe('The underlier fell 10%. The highest close, 135, was above the 130 upside barrier, so upside participation ends and principal is unchanged. The lowest close, 65, was below the 70 downside barrier, so downside participation of 100% deducts the whole 10% from principal. There is no principal protection, so the contractual payment is 900, 100 less than principal.')
  })

  it('states both effects when the downside barrier held: the upside ended, and the fall left principal unchanged', () => {
    expect(explainWith(bothSides(), 90, { lowestClose: 90, highestClose: 135 })).toBe('The underlier fell 10%. The highest close, 135, was above the 130 upside barrier, so upside participation ends and principal is unchanged. No close was below the 70 downside barrier (the lowest was 90), so downside participation does not apply and principal is unchanged. The contractual payment is 1,000, the same as principal.')
  })

  it('names the rebate and the loss separately, not their net', () => {
    expect(explainWith(bothSides(0.02), 90, { lowestClose: 65, highestClose: 135 })).toBe('The underlier fell 10%. The highest close, 135, was above the 130 upside barrier, so upside participation ends and a rebate of 2% is added to principal. The lowest close, 65, was below the 70 downside barrier, so downside participation of 100% deducts the whole 10% from principal. There is no principal protection, so the contractual payment is 920, 80 less than principal.')
  })

  it('says the upside ended whatever the final level when the underlier rose', () => {
    expect(explainWith(bothSides(), 120, { highestClose: 135 })).toBe('The underlier rose 20%. The highest close, 135, was above the 130 upside barrier, so upside participation ends and principal is unchanged, whatever the final level. The contractual payment is 1,000, the same as principal.')
  })

  it('applies plain downside participation after an early upside breach, with no downside barrier', () => {
    expect(explainWith(bothSides(undefined, false), 90, { highestClose: 135 })).toContain('so upside participation ends and principal is unchanged. Downside participation of 100% deducts 10% from principal.')
  })
})
