import { describe, expect, it } from 'vitest'
import { paymentBreakdown, withSubFeatures, type Participation, type SingleProduct } from '../domain/note'
import { calculationSteps } from './calculation'

const noteWith = (participations: Participation[], principalProtection?: number, cap?: number, buffer?: number): SingleProduct => ({
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
  principalAmount: 1000,
})
const both = [{ direction: 'downside' as const, rate: 0.1 }, { direction: 'upside' as const, rate: 1 }]
const steps = (note: SingleProduct, finalLevel: number) => calculationSteps(note, paymentBreakdown(note, { initial: 100, final: finalLevel }), [finalLevel], [])
const step = (note: SingleProduct, finalLevel: number, title: string) => steps(note, finalLevel).find((candidate) => candidate.title === title)

describe('calculation steps', () => {
  it('shows each participation direction as its own step, in the order of the outline', () => {
    expect(steps(noteWith(both, 0.9, 0.2), 110).map(({ n, title }) => `${n} ${title}`)).toEqual([
      '1 Synthetic Index return', '2 Downside participation', '3 Upside participation', '4 Payment before cap', '5 Cap', '6 Protection floor', '7 Payment at maturity', '8 Annualised return',
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
    expect(step(note, 80, 'Downside participation')).toMatchObject({ how: 'Not added, so a fall leaves principal unchanged', value: 'Not added', muted: true })
    expect(step(noteWith([]), 110, 'Upside participation')).toMatchObject({ how: 'Not added, so a rise leaves principal unchanged', value: 'Not added', muted: true })
  })

  it('states the closing step with the amounts it combines, in the payment rule\'s words', () => {
    expect(step(noteWith(both, 0.9, 0.2), 110, 'Payment at maturity')?.how).toBe('1,100, capped at 1,200 and floored at 900')
    expect(step(noteWith(both, 0.9), 110, 'Payment at maturity')?.how).toBe('1,100, floored at 900')
    expect(step(noteWith(both), 110, 'Payment at maturity')?.how).toBe('1,100, not below zero')
    expect(step(noteWith(both, undefined, 0.2), 110, 'Payment at maturity')?.how).toBe('1,100, capped at 1,200 and not below zero')
  })

  describe('with a buffer', () => {
    const buffered = (participations: Participation[]) => noteWith(participations, 0.9, undefined, 0.1)
    const downFull = [{ direction: 'downside' as const, rate: 1 }, { direction: 'upside' as const, rate: 1 }]

    it('adds a buffer step before downside participation', () => {
      expect(steps(buffered(downFull), 70).map(({ title }) => title).slice(0, 4)).toEqual(['Synthetic Index return', 'Buffer', 'Downside participation', 'Upside participation'])
      expect(step(buffered(downFull), 70, 'Payment at maturity')?.how).toBe('800, floored at 900')
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

    it('mutes the buffer on a rise', () => {
      expect(step(buffered(downFull), 110, 'Buffer')).toMatchObject({ how: 'Absorbs the first 10% of a fall · applies only when the return is negative', value: '0%', muted: true })
    })
  })

  describe('with a barrier', () => {
    const barriered = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }])
    const withBarrier = { ...barriered, payoff: { ...barriered.payoff, participations: withSubFeatures(barriered.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }

    it('adds a barrier step before downside participation', () => {
      expect(steps(withBarrier, 65).map(({ title }) => title).slice(0, 3)).toEqual(['Synthetic Index return', 'Barrier', 'Downside participation'])
    })

    it('applies downside participation to the whole fall below the barrier', () => {
      expect(step(withBarrier, 65, 'Barrier')).toMatchObject({ how: '70% × 100 · final level 65 is below it, so downside participation applies', value: '70', concept: 'barrier' })
      expect(step(withBarrier, 65, 'Barrier')?.muted).toBeFalsy()
      expect(step(withBarrier, 65, 'Downside participation')).toMatchObject({ value: '−35%' })
    })

    it('mutes the barrier and downside participation at or above it', () => {
      expect(step(withBarrier, 80, 'Barrier')).toMatchObject({ how: '70% × 100 · final level 80 is not below it, so a fall does not reduce principal', muted: true })
      expect(step(withBarrier, 80, 'Downside participation')).toMatchObject({ how: '100% × min(−20%, 0) · the final level is not below the barrier', value: '0%', muted: true })
      // The barrier belongs to downside participation. Upside participation adds nothing on a fall, barrier or not.
      expect(step(withBarrier, 80, 'Upside participation')).toMatchObject({ how: '100% × max(−20%, 0) · applies only when the return is positive', value: '0%', muted: true })
      expect(step(withBarrier, 80, 'Payment at maturity')?.value).toBe('1,000')
    })
  })

  it('adds a step that averages the observed levels before the return', () => {
    const note = { ...noteWith(both), underlier: { ...noteWith(both).underlier, determination: { initial: { kind: 'given' as const, level: 100 }, final: { kind: 'averaging' as const, observationCount: 4 } } } }
    const observed = [100, 120, 90, 130]
    const averaged = calculationSteps(note, paymentBreakdown(note, { initial: 100, final: 110 }), observed, [])
    expect(averaged.slice(0, 2)).toMatchObject([
      { n: 1, title: 'Final level of Synthetic Index', how: '(100 + 120 + 90 + 130) ÷ 4', value: '110', concept: 'final-level' },
      { n: 2, title: 'Synthetic Index return', how: '110 ÷ 100 − 1', value: '+10%', concept: 'determination' },
    ])
    expect(averaged.find(({ title }) => title === 'Payment at maturity')?.how).toBe('1,100, not below zero')
  })

  it('adds a step that takes the lookback level before the return', () => {
    const upsideOnly = noteWith([{ direction: 'upside', rate: 1 }])
    const note = { ...upsideOnly, underlier: { ...upsideOnly.underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }
    const lookback = calculationSteps(note, paymentBreakdown(note, { initial: 92, final: 110 }), [110], [100, 97, 92, 95])
    expect(lookback.slice(0, 2)).toMatchObject([
      { n: 1, title: 'Lookback level of Synthetic Index', how: 'min(100, 97, 92, 95)', value: '92', concept: 'initial-level' },
      { n: 2, title: 'Synthetic Index return', how: '110 ÷ 92 − 1', value: '+19.6%', concept: 'determination' },
    ])
    expect(lookback.find(({ title }) => title === 'Payment at maturity')).toMatchObject({ how: '1,195.65, not below zero', value: '1,195.65' })
  })

  it('takes the lookback level, then averages the final level, when the note does both', () => {
    const note = { ...noteWith(both), underlier: { ...noteWith(both).underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'averaging' as const, observationCount: 4 } } } }
    const titles = calculationSteps(note, paymentBreakdown(note, { initial: 92, final: 110 }), [100, 120, 90, 130], [100, 97, 92, 95]).map(({ title }) => title)
    expect(titles.slice(0, 3)).toEqual(['Lookback level of Synthetic Index', 'Final level of Synthetic Index', 'Synthetic Index return'])
  })

  it('agrees with the payment breakdown', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 110, 'Payment before cap')).toMatchObject({ how: '1,000 × (1 + 10%)', value: '1,100' })
    expect(step(note, 110, 'Payment at maturity')).toMatchObject({ value: '1,100', result: true })
  })
})

describe('calculation steps with absolute return', () => {
  const dualDirectional = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.2 }])
  const note = { ...dualDirectional, payoff: { participations: withSubFeatures(dualDirectional.payoff.participations, { buffer: 0.15, absoluteReturn: { rate: 1 }, cap: 0.4 }) } }

  it('adds an absolute return step after the buffer', () => {
    expect(steps(note, 95).map(({ title }) => title).slice(0, 4)).toEqual(['Synthetic Index return', 'Buffer', 'Absolute return', 'Downside participation'])
  })

  it('credits a fall within the buffer to absolute return, not downside participation', () => {
    expect(step(note, 95, 'Absolute return')).toMatchObject({ how: '100% × |−5%|', value: '+5%', concept: 'absolute-return' })
    expect(step(note, 95, 'Absolute return')?.muted).toBeUndefined()
    expect(step(note, 95, 'Downside participation')).toMatchObject({ value: '0%', muted: true })
    expect(step(note, 95, 'Payment at maturity')).toMatchObject({ value: '1,050' })
  })

  it('mutes absolute return beyond the buffer and on a rise', () => {
    expect(step(note, 80, 'Absolute return')).toMatchObject({ how: '100% × |−20%| · the fall is beyond the buffer, so it pays no gain', value: '0%', muted: true })
    expect(step(note, 80, 'Downside participation')).toMatchObject({ value: '−5%' })
    expect(step(note, 95, 'Cap')?.how).toBe('1,000 × (1 + 40%) · limits a rise only')
    expect(step(note, 110, 'Absolute return')).toMatchObject({ how: 'Pays 100% of a fall within the buffer as a gain · applies only when the return is negative', value: '0%', muted: true })
    expect(step(note, 100, 'Absolute return')?.how).toBe('Pays 100% of a fall within the buffer as a gain · applies only when the return is negative')
  })
})
