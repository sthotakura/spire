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
  it('mutes the cap and the protection floor when they do not bind, and shows them when they do', () => {
    const note = noteWith(both, 0.9, 0.2)
    expect(step(note, 80, 'Cap')).toMatchObject({ value: '1,200', muted: true })
    expect(step(note, 80, 'Protection floor')).toMatchObject({ value: '900', muted: true })
    expect(step(note, 130, 'Cap')?.muted).toBe(false)
    expect(step(noteWith([{ direction: 'downside', rate: 1 }], 0.9), 60, 'Protection floor')?.muted).toBe(false)
  })

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
      expect(steps(withBarrier, 65).map(({ title }) => title).slice(0, 3)).toEqual(['Synthetic Index return', 'Downside barrier', 'Downside participation'])
    })

    it('applies downside participation to the whole fall below the barrier', () => {
      expect(step(withBarrier, 65, 'Downside barrier')).toMatchObject({ how: '70% × 100 · final level 65 is below it, so downside participation applies', value: '70', concept: 'barrier' })
      expect(step(withBarrier, 65, 'Downside barrier')?.muted).toBeFalsy()
      expect(step(withBarrier, 65, 'Downside participation')).toMatchObject({ value: '−35%' })
    })

    it('mutes the barrier and downside participation at or above it', () => {
      expect(step(withBarrier, 80, 'Downside barrier')).toMatchObject({ how: '70% × 100 · final level 80 is not below it, so a fall does not reduce principal', muted: true })
      expect(step(withBarrier, 80, 'Downside participation')).toMatchObject({ how: '100% × min(−20%, 0) · the final level is not below the downside barrier', value: '0%', muted: true })
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

describe('calculation steps with absolute return above a barrier', () => {
  const base = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.25 }])
  const trigger = { ...base, payoff: { participations: withSubFeatures(base.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const }, absoluteReturn: { rate: 0.5 } }) } }

  it('puts absolute return after the barrier and pays the gain above it', () => {
    expect(steps(trigger, 95).map(({ title }) => title).slice(0, 4)).toEqual(['Synthetic Index return', 'Downside barrier', 'Absolute return', 'Downside participation'])
    expect(step(trigger, 95, 'Absolute return')).toMatchObject({ how: '50% × |−5%|', value: '+2.5%' })
    expect(step(trigger, 95, 'Payment at maturity')).toMatchObject({ value: '1,025' })
  })

  it('says the gain stops below the barrier', () => {
    expect(step(trigger, 60, 'Absolute return')).toMatchObject({ how: '50% × |−40%| · the level ends below the downside barrier, so it pays no gain', muted: true })
    expect(step(trigger, 110, 'Absolute return')?.how).toBe('Pays 50% of a fall that ends at or above the downside barrier as a gain · applies only when the return is negative')
  })
})

describe('calculation steps with an upside barrier', () => {
  // The worked example in docs/upside-barrier.md: 80% upside, a 130% barrier, a 2% rebate, 100% protection.
  const upsideOnly = [{ direction: 'upside' as const, rate: 0.8 }]
  const finned = (rebate?: number): SingleProduct => ({ ...noteWith(upsideOnly, 1), payoff: { participations: withSubFeatures(upsideOnly, { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }), principalProtection: 1 } })

  it('puts the barrier and the rebate before the participation steps', () => {
    expect(steps(finned(0.02), 140).map(({ title }) => title)).toEqual([
      'Synthetic Index return', 'Upside barrier', 'Rebate', 'Downside participation', 'Upside participation', 'Payment before protection', 'Protection floor', 'Payment at maturity', 'Annualised return',
    ])
    expect(steps(finned(), 140).map(({ title }) => title)).not.toContain('Rebate')
  })

  it('replaces upside participation with the rebate above the upside barrier', () => {
    expect(step(finned(0.02), 140, 'Upside barrier')).toMatchObject({ how: '130% × 100 · final level 140 is above it, so upside participation ends', value: '130', concept: 'barrier' })
    expect(step(finned(0.02), 140, 'Upside barrier')?.muted).toBeFalsy()
    expect(step(finned(0.02), 140, 'Rebate')).toMatchObject({ how: 'Paid in place of upside participation', value: '+2%', concept: 'barrier' })
    expect(step(finned(0.02), 140, 'Upside participation')).toMatchObject({ how: '80% × max(+40%, 0) · the upside barrier is reached, so participation ends', value: '0%', muted: true })
    expect(step(finned(0.02), 140, 'Payment before protection')?.value).toBe('1,020')
    expect(step(finned(0.02), 140, 'Payment at maturity')?.value).toBe('1,020')
  })

  it('mutes the barrier and the rebate up to it, where upside participation applies', () => {
    expect(step(finned(0.02), 120, 'Upside barrier')).toMatchObject({ how: '130% × 100 · final level 120 is at or below it, so upside participation applies', muted: true })
    expect(step(finned(0.02), 120, 'Rebate')).toMatchObject({ how: 'Pays 2% in place of upside participation · the upside barrier is not reached', value: '0%', muted: true })
    expect(step(finned(0.02), 120, 'Upside participation')).toMatchObject({ value: '+16%' })
    expect(step(finned(0.02), 120, 'Payment at maturity')?.value).toBe('1,160')
  })

  it('still applies upside participation at the barrier, and pays the rebate just above it', () => {
    expect(step(finned(0.02), 130, 'Upside barrier')).toMatchObject({ how: '130% × 100 · final level 130 is at or below it, so upside participation applies', muted: true })
    expect(step(finned(0.02), 130, 'Upside participation')).toMatchObject({ value: '+24%' })
    expect(step(finned(0.02), 130, 'Payment at maturity')?.value).toBe('1,240')
    expect(step(finned(0.02), 131, 'Payment at maturity')?.value).toBe('1,020')
  })

  it('pays principal above the barrier when there is no rebate', () => {
    expect(step(finned(), 131, 'Upside participation')).toMatchObject({ value: '0%', muted: true })
    expect(step(finned(), 131, 'Payment at maturity')?.value).toBe('1,000')
  })
})

describe('the payment step after the participation steps', () => {
  it('is muted and named for what it adds up when nothing is selected', () => {
    const principalOnly = noteWith([])
    expect(step(principalOnly, 110, 'Payment from participation')).toMatchObject({ how: '1,000 × (1 + 0%)', value: '1,000', muted: true })
    expect(steps(principalOnly, 110).map(({ title }) => title)).not.toContain('Payment before protection')
  })

  it('is not muted once a participation is selected, and is still not called before protection without protection', () => {
    const upsideOnly = noteWith([{ direction: 'upside', rate: 1 }])
    expect(step(upsideOnly, 110, 'Payment from participation')).toMatchObject({ value: '1,100' })
    expect(step(upsideOnly, 110, 'Payment from participation')?.muted).toBeFalsy()
  })

  it('keeps its name before a protection floor or a cap', () => {
    expect(step(noteWith(both, 0.9), 110, 'Payment before protection')?.muted).toBeFalsy()
    expect(step(noteWith(both, undefined, 0.2), 110, 'Payment before cap')?.muted).toBeFalsy()
    // A protection floor with no participation still names the step, which is muted because it only restates principal.
    expect(step(noteWith([], 0.9), 110, 'Payment before protection')).toMatchObject({ value: '1,000', muted: true })
  })
})

describe('calculation steps with barriers observed on every close', () => {
  const stepsWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number }) =>
    calculationSteps(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }), [finalLevel], [])
  const stepOf = (list: ReturnType<typeof stepsWith>, title: string) => list.find((candidate) => candidate.title === title)

  describe('downside barrier', () => {
    const barriered = noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }])
    const daily = { ...barriered, payoff: { ...barriered.payoff, participations: withSubFeatures(barriered.payoff.participations, { barrier: { level: 0.7, observation: 'daily-close' as const } }) } }

    it('applies downside participation when the lowest close was below the barrier, although the final level recovered', () => {
      const list = stepsWith(daily, 80, { lowestClose: 65 })
      expect(stepOf(list, 'Downside barrier')).toMatchObject({ how: '70% × 100 · lowest close 65 is below it, so downside participation applies', value: '70', concept: 'barrier' })
      expect(stepOf(list, 'Downside barrier')?.muted).toBeFalsy()
      expect(stepOf(list, 'Downside participation')).toMatchObject({ value: '−20%' })
      expect(stepOf(list, 'Payment at maturity')?.value).toBe('800')
    })

    it('mutes the barrier when no close was below it', () => {
      const list = stepsWith(daily, 80, {})
      expect(stepOf(list, 'Downside barrier')).toMatchObject({ how: '70% × 100 · lowest close 80 is not below it, so a fall does not reduce principal', muted: true })
      expect(stepOf(list, 'Downside participation')).toMatchObject({ how: '100% × min(−20%, 0) · the lowest close is not below the downside barrier', value: '0%', muted: true })
      expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,000')
    })
  })

  describe('upside barrier', () => {
    const upsideOnly = [{ direction: 'upside' as const, rate: 0.8 }]
    const finned: SingleProduct = { ...noteWith(upsideOnly, 1), payoff: { participations: withSubFeatures(upsideOnly, { upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate: 0.02 } }), principalProtection: 1 } }

    it('pays the rebate when the highest close reached the barrier, although the final level fell', () => {
      const list = stepsWith(finned, 90, { highestClose: 135 })
      expect(stepOf(list, 'Upside barrier')).toMatchObject({ how: '130% × 100 · highest close 135 is above it, so upside participation ends', value: '130', concept: 'barrier' })
      expect(stepOf(list, 'Rebate')).toMatchObject({ value: '+2%' })
      expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,020')
    })

    it('mutes the barrier when no close reached it', () => {
      const list = stepsWith(finned, 120, {})
      expect(stepOf(list, 'Upside barrier')).toMatchObject({ how: '130% × 100 · highest close 120 is at or below it, so upside participation applies', muted: true })
      expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,160')
    })
  })
})

describe('calculation steps with barrier absolute return', () => {
  const bothWays = (terms: Partial<NonNullable<SingleProduct['payoff']['barrierAbsoluteReturn']>> = {}): SingleProduct => ({
    ...noteWith([]),
    payoff: { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' }, conditionalReturn: 0.02, ...terms } },
  })
  const stepsWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number } = {}) =>
    calculationSteps(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }), [finalLevel], [])
  const stepOf = (list: ReturnType<typeof stepsWith>, title: string) => list.find((candidate) => candidate.title === title)

  it('puts the barriers before the absolute return and the conditional return, and has no participation steps', () => {
    expect(stepsWith(bothWays(), 90).map(({ n, title }) => `${n} ${title}`)).toEqual([
      '1 Synthetic Index return', '2 Lower barrier', '3 Upper barrier', '4 Absolute return', '5 Conditional return', '6 Payment from absolute return', '7 Protection floor', '8 Payment at maturity', '9 Annualised return',
    ])
    expect(stepsWith(bothWays({ conditionalReturn: undefined }), 90).map(({ title }) => title)).not.toContain('Conditional return')
  })

  it('pays the absolute return of a fall when no barrier is reached', () => {
    const list = stepsWith(bothWays(), 90)
    expect(stepOf(list, 'Lower barrier')).toMatchObject({ how: '80% × 100 · lowest close 90 is not below it, so the absolute return applies', value: '80', muted: true, concept: 'barrier' })
    expect(stepOf(list, 'Upper barrier')).toMatchObject({ how: '125% × 100 · highest close 100 is not above it, so the absolute return applies', value: '125', muted: true })
    expect(stepOf(list, 'Absolute return')).toMatchObject({ how: '100% × |−10%|', value: '+10%', concept: 'absolute-return' })
    expect(stepOf(list, 'Absolute return')?.muted).toBeFalsy()
    expect(stepOf(list, 'Conditional return')).toMatchObject({ how: 'Pays 2% in place of the absolute return · no barrier is reached', value: '0%', muted: true })
    expect(stepOf(list, 'Payment from absolute return')).toMatchObject({ how: '1,000 × (1 + 10%)', value: '1,100' })
    expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,100')
  })

  it('pays the conditional return once the lowest close was below the lower barrier, although the final level recovered', () => {
    const list = stepsWith(bothWays(), 100, { lowestClose: 79 })
    expect(stepOf(list, 'Lower barrier')).toMatchObject({ how: '80% × 100 · lowest close 79 is below it, so the absolute return ends', value: '80' })
    expect(stepOf(list, 'Lower barrier')?.muted).toBeFalsy()
    expect(stepOf(list, 'Absolute return')).toMatchObject({ value: '0%', muted: true })
    expect(stepOf(list, 'Conditional return')).toMatchObject({ how: 'Paid in place of the absolute return', value: '+2%' })
    expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,020')
  })

  it('pays the conditional return once the highest close was above the upper barrier, although the final level fell back', () => {
    const list = stepsWith(bothWays(), 110, { highestClose: 130 })
    expect(stepOf(list, 'Upper barrier')).toMatchObject({ how: '125% × 100 · highest close 130 is above it, so the absolute return ends', value: '125' })
    expect(stepOf(list, 'Payment at maturity')?.value).toBe('1,020')
  })

  it('reads the final level for a barrier observed on the final date', () => {
    const onFinalDate = bothWays({ lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.25, observation: 'final' } })
    expect(stepOf(stepsWith(onFinalDate, 126), 'Upper barrier')).toMatchObject({ how: '125% × 100 · final level 126 is above it, so the absolute return ends' })
    expect(stepOf(stepsWith(onFinalDate, 126), 'Lower barrier')).toMatchObject({ how: '80% × 100 · final level 126 is not below it, so the absolute return applies', muted: true })
  })

  it('shows no conditional return step, and a zero value, when nothing is paid after a barrier', () => {
    const none = bothWays({ conditionalReturn: 0 })
    expect(stepOf(stepsWith(none, 126), 'Conditional return')).toMatchObject({ value: '0%' })
    expect(stepOf(stepsWith(none, 126), 'Payment at maturity')?.value).toBe('1,000')
  })
})

describe('calculation steps with a daily upside barrier and downside participation', () => {
  const bothSides = (rebate?: number): SingleProduct => ({
    ...noteWith([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 0.8 }]),
    payoff: { participations: withSubFeatures([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 0.8 }], {
      barrier: { level: 0.7, observation: 'daily-close' as const },
      upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate },
    }) },
  })
  const stepsWith = (note: SingleProduct, finalLevel: number, closes: { lowestClose?: number; highestClose?: number }) =>
    calculationSteps(note, paymentBreakdown(note, { initial: 100, final: finalLevel, ...closes }), [finalLevel], [])
  const stepOf = (list: ReturnType<typeof stepsWith>, title: string) => list.find((candidate) => candidate.title === title)

  it('shows each side its own term: the rebate on the upside, the loss on the downside, and their sum as the payment', () => {
    const list = stepsWith(bothSides(0.02), 90, { lowestClose: 65, highestClose: 135 })
    expect(stepOf(list, 'Rebate')).toMatchObject({ value: '+2%' })
    expect(stepOf(list, 'Downside participation')).toMatchObject({ value: '−10%' })
    expect(stepOf(list, 'Upside participation')).toMatchObject({ value: '0%', muted: true })
    expect(stepOf(list, 'Payment from participation')).toMatchObject({ how: '1,000 × (1 − 8%)', value: '920' })
    expect(stepOf(list, 'Payment at maturity')?.value).toBe('920')
  })

  it('shows the downside loss, and an upside that ended, with no rebate', () => {
    const list = stepsWith(bothSides(), 90, { lowestClose: 65, highestClose: 135 })
    expect(stepOf(list, 'Downside participation')).toMatchObject({ value: '−10%' })
    expect(stepOf(list, 'Upside barrier')).toMatchObject({ how: '130% × 100 · highest close 135 is above it, so upside participation ends' })
    expect(stepOf(list, 'Payment at maturity')?.value).toBe('900')
  })
})
