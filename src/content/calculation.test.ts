import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type Participation, type ProtectedParticipationNote } from '../domain/note'
import { calculationSteps } from './calculation'

const noteWith = (participations: Participation[], principalProtection?: number, cap?: number): ProtectedParticipationNote => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }], determination: { kind: 'point-to-point' } },
  payoff: { kind: 'participation', participations, principalProtection, cap },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 0.1 }, { direction: 'upside' as const, rate: 1 }]
const steps = (note: ProtectedParticipationNote, finalLevel: number) => calculationSteps(note, paymentBreakdown(note, finalLevel), finalLevel)
const step = (note: ProtectedParticipationNote, finalLevel: number, title: string) => steps(note, finalLevel).find((candidate) => candidate.title === title)

describe('calculation steps', () => {
  it('shows each participation direction as its own step, in the order of the outline', () => {
    expect(steps(noteWith(both, 0.9, 0.2), 110).map(({ n, title }) => `${n} ${title}`)).toEqual([
      '1 Synthetic Index return', '2 Downside participation', '3 Upside participation', '4 Payment before cap', '5 Cap', '6 Protection floor', '7 Payment at maturity',
    ])
  })

  it('shows a selected downside participation contributing nothing on a rise', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 110, 'Downside participation')).toMatchObject({ how: '10% × min(+10%, 0) · applies only when the return is negative', value: '0%', muted: true, concept: 'downside' })
    expect(step(note, 110, 'Upside participation')).toMatchObject({ how: '100% × max(+10%, 0)', value: '+10%', concept: 'upside' })
    expect(step(note, 110, 'Upside participation')?.muted).toBeFalsy()
  })

  it('shows a selected upside participation contributing nothing on a fall', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 80, 'Downside participation')).toMatchObject({ how: '10% × min(−20%, 0)', value: '−2%' })
    expect(step(note, 80, 'Upside participation')).toMatchObject({ how: '100% × max(−20%, 0) · applies only when the return is positive', value: '0%', muted: true })
  })

  it('keeps a direction that is not selected visible as not added', () => {
    const note = noteWith([{ direction: 'upside', rate: 1 }])
    expect(step(note, 80, 'Downside participation')).toMatchObject({ how: 'Not selected, so a fall does not reduce principal', value: 'Not added', muted: true })
    expect(step(noteWith([]), 110, 'Upside participation')).toMatchObject({ how: 'Not selected, so a rise does not add to principal', value: 'Not added', muted: true })
  })

  it('numbers the closing step from the steps it combines', () => {
    expect(step(noteWith(both, 0.9, 0.2), 110, 'Payment at maturity')?.how).toBe('The lower of steps 4 and 5, then the higher of that and step 6')
    expect(step(noteWith(both, 0.9), 110, 'Payment at maturity')?.how).toBe('The higher of steps 4 and 5')
    expect(step(noteWith(both), 110, 'Payment at maturity')?.how).toBe('The higher of step 4 and zero')
    expect(step(noteWith(both, undefined, 0.2), 110, 'Payment at maturity')?.how).toBe('The lower of steps 4 and 5, then not below zero')
  })

  it('agrees with the payment breakdown', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 110, 'Payment before cap')).toMatchObject({ how: '1,000 × (1 + 10%)', value: '1,100' })
    expect(step(note, 110, 'Payment at maturity')).toMatchObject({ value: '1,100', result: true })
  })
})
