import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type Participation, type ProtectedParticipationNote } from '../domain/note'
import { explainOutcome } from './outcome'

const noteWith = (participations: Participation[], principalProtection?: number): ProtectedParticipationNote => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'equity-index', name: 'Synthetic Index' },
  determination: { kind: 'point-to-point', initialLevel: 100 },
  payoff: { kind: 'participation', participations, principalProtection },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 1 }, { direction: 'upside' as const, rate: 1.5 }]
const explain = (note: ProtectedParticipationNote, finalLevel: number) => explainOutcome(note, paymentBreakdown(note, finalLevel))

describe('outcome explanation', () => {
  it('explains a rise with upside participation', () => {
    expect(explain(noteWith(both, 0.9), 110)).toBe('The underlier rose 10%. Upside participation of 150% adds 15% to principal, so the payment before protection is 1,150. The 900 floor does not apply, so the contractual payment is 1,150 units, 150 more than principal.')
  })

  it('explains a rise when upside is not selected', () => {
    const downsideOnly = noteWith([{ direction: 'downside', rate: 1 }], 0.9)
    expect(explain(downsideOnly, 110)).toBe('The underlier rose 10%. No upside participation is selected, so principal is unchanged. The 900 floor does not apply, so the contractual payment is 1,000 units, the same as principal.')
  })

  it('explains a fall above the floor', () => {
    expect(explain(noteWith(both, 0.9), 95)).toBe('The underlier fell 5%. Downside participation of 100% deducts 5% from principal, so the payment before protection is 950. The 900 floor does not apply, so the contractual payment is 950 units, 50 less than principal.')
  })

  it('explains a fall where the floor applies', () => {
    expect(explain(noteWith(both, 0.9), 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal, so the payment before protection is 600. The 900 floor applies, so the contractual payment is 900 units, 100 less than principal.')
  })

  it('explains a fall when downside is not selected', () => {
    const upsideOnly = noteWith([{ direction: 'upside', rate: 1.5 }], 0.9)
    expect(explain(upsideOnly, 60)).toBe('The underlier fell 40%. No downside participation is selected, so principal is unchanged. The 900 floor does not apply, so the contractual payment is 1,000 units, the same as principal.')
  })

  it('explains a flat return', () => {
    expect(explain(noteWith(both, 0.9), 100)).toBe('The underlier ended unchanged. A flat return leaves principal unchanged. The 900 floor does not apply, so the contractual payment is 1,000 units, the same as principal.')
  })

  it('explains a fall with no protection', () => {
    expect(explain(noteWith([{ direction: 'downside', rate: 1 }]), 60)).toBe('The underlier fell 40%. Downside participation of 100% deducts 40% from principal. There is no principal protection, so the contractual payment is 600 units, 400 less than principal.')
  })

  it('explains a fall that would take the payment below zero', () => {
    expect(explain(noteWith([{ direction: 'downside', rate: 1.5 }]), 20)).toBe('The underlier fell 80%. Downside participation of 150% deducts 120% from principal. The payment cannot fall below zero, so the contractual payment is 0 units, 1,000 less than principal.')
  })

  it('explains a note with no features', () => {
    expect(explain(noteWith([]), 110)).toBe('The underlier rose 10%. No upside participation is selected, so principal is unchanged. The contractual payment is 1,000 units, the same as principal.')
    expect(explain(noteWith([]), 60)).toBe('The underlier fell 40%. No downside participation is selected, so principal is unchanged. The contractual payment is 1,000 units, the same as principal.')
  })
})
