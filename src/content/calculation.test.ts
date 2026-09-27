import { describe, expect, it } from 'vitest'
import { paymentBreakdown, type Participation, type ProtectedParticipationNote } from '../domain/note'
import { calculationSteps } from './calculation'

const noteWith = (participations: Participation[], principalProtection?: number, cap?: number): ProtectedParticipationNote => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }], determination: { initial: { kind: 'given' }, final: { kind: 'final-date' } } },
  payoff: { kind: 'participation', participations, principalProtection, cap },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 0.1 }, { direction: 'upside' as const, rate: 1 }]
const steps = (note: ProtectedParticipationNote, finalLevel: number) => calculationSteps(note, paymentBreakdown(note, { initial: 100, final: finalLevel }), [finalLevel])
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

  describe('with a buffer', () => {
    const buffered = (participations: Participation[]) => ({ ...noteWith(participations, 0.9), payoff: { ...noteWith(participations, 0.9).payoff, buffer: 0.1 } })
    const downFull = [{ direction: 'downside' as const, rate: 1 }, { direction: 'upside' as const, rate: 1 }]

    it('adds a buffer step before downside participation', () => {
      expect(steps(buffered(downFull), 70).map(({ title }) => title).slice(0, 4)).toEqual(['Synthetic Index return', 'Buffer', 'Downside participation', 'Upside participation'])
      expect(step(buffered(downFull), 70, 'Payment at maturity')?.how).toBe('The higher of steps 5 and 6')
    })

    it('shows the part of the fall the buffer absorbs, and downside participation on the rest', () => {
      expect(step(buffered(downFull), 85, 'Buffer')).toMatchObject({ how: 'Absorbs the first 10% of a fall · absorbs 10% of the 15% fall here', value: '+10%', concept: 'buffer' })
      expect(step(buffered(downFull), 85, 'Downside participation')).toMatchObject({ how: '100% × min(−15% + 10%, 0)', value: '−5%' })
      expect(step(buffered(downFull), 85, 'Payment at maturity')?.value).toBe('950')
    })

    it('says when the buffer absorbs the whole fall', () => {
      expect(step(buffered(downFull), 95, 'Buffer')).toMatchObject({ how: 'Absorbs the first 10% of a fall · absorbs the whole fall here', value: '+5%' })
      expect(step(buffered(downFull), 95, 'Downside participation')).toMatchObject({ how: '100% × min(−5% + 10%, 0) · the buffer absorbs the whole fall', value: '0%', muted: true })
    })

    it('mutes the buffer on a rise, or when there is no downside participation', () => {
      expect(step(buffered(downFull), 110, 'Buffer')).toMatchObject({ how: 'Absorbs the first 10% of a fall · applies only when the return is negative', value: '0%', muted: true })
      expect(step(buffered([{ direction: 'upside', rate: 1 }]), 80, 'Buffer')).toMatchObject({ value: '0%', muted: true })
    })
  })

  it('adds a step that averages the observed levels before the return', () => {
    const note = { ...noteWith(both), underlier: { ...noteWith(both).underlier, determination: { initial: { kind: 'given' as const }, final: { kind: 'averaging' as const, observationCount: 4 } } } }
    const observed = [100, 120, 90, 130]
    const averaged = calculationSteps(note, paymentBreakdown(note, { initial: 100, final: 110 }), observed)
    expect(averaged.slice(0, 2)).toMatchObject([
      { n: 1, title: 'Final level of Synthetic Index', how: '(100 + 120 + 90 + 130) ÷ 4', value: '110', concept: 'determination' },
      { n: 2, title: 'Synthetic Index return', how: '110 ÷ 100 − 1', value: '+10%', concept: 'determination' },
    ])
    expect(averaged[averaged.length - 1].how).toBe('The higher of step 5 and zero')
  })

  it('agrees with the payment breakdown', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 110, 'Payment before cap')).toMatchObject({ how: '1,000 × (1 + 10%)', value: '1,100' })
    expect(step(note, 110, 'Payment at maturity')).toMatchObject({ value: '1,100', result: true })
  })
})
