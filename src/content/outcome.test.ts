import { describe, expect, it } from 'vitest'
import { paymentBreakdown, withSubFeatures, type Participation, type Note } from '../domain/note'
import { explainOutcome } from './outcome'

const noteWith = (participations: Participation[], principalProtection?: number, cap?: number, buffer?: number): Note => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }], determination: { initial: { kind: 'given' }, final: { kind: 'final-date' } } },
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 1 }, { direction: 'upside' as const, rate: 1.5 }]
const explain = (note: Note, finalLevel: number) => explainOutcome(note, paymentBreakdown(note, { initial: 100, final: finalLevel }))

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
    expect(explain(barriered, 80)).toBe('The underlier fell 20%. It ended at or above the 70 barrier, so downside participation does not apply and principal is unchanged. The contractual payment is 1,000, the same as principal.')
    expect(explain(barriered, 65)).toBe('The underlier fell 35%. It ended below the 70 barrier, so downside participation of 100% deducts the whole 35% from principal. There is no principal protection, so the contractual payment is 650, 350 less than principal.')
  })
  it('says the move is an average when the note averages', () => {
    const averaged = { ...noteWith(both, 0.9), underlier: { ...noteWith(both).underlier, determination: { initial: { kind: 'given' as const }, final: { kind: 'averaging' as const, observationCount: 5 } } } }
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
