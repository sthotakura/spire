import { describe, expect, it } from 'vitest'
import { withSubFeatures, type Participation, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { payoffLabels } from './chart-labels'

const productWith = (participations: Participation[], terms: { buffer?: number; barrier?: number; absoluteReturn?: number; cap?: number; principalProtection?: number } = {}): Product => ({
  ...startingProduct,
  payoff: {
    participations: withSubFeatures(participations, {
      buffer: terms.buffer,
      barrier: terms.barrier === undefined ? undefined : { level: terms.barrier, observation: 'final' },
      absoluteReturn: terms.absoluteReturn === undefined ? undefined : { rate: terms.absoluteReturn },
      cap: terms.cap,
    }),
    principalProtection: terms.principalProtection,
  },
})
const down = (rate = 1): Participation => ({ direction: 'downside', rate })
const up = (rate = 1): Participation => ({ direction: 'upside', rate })

describe('payoff chart labels', () => {
  it('says a product with no features repays principal', () => {
    expect(payoffLabels(startingProduct)).toEqual({ payoff: 'Repays principal 1,000' })
  })

  it('describes the dual directional note in the proposal', () => {
    expect(payoffLabels(productWith([down(), up()], { buffer: 0.15, absoluteReturn: 1, cap: 0.5 }))).toEqual({
      payoff: 'Repays principal 1,000',
      upside: 'Each 1% rise adds 1%',
      cap: 'Capped at 1,500',
      buffer: 'A fall of up to 15% repays principal',
      downside: 'A fall past 15% loses 1% per 1% beyond it',
      'absolute-return': 'A fall of up to 15% is paid as a gain',
      lowest: 'Lowest payment 150',
    })
  })

  it('gives an absolute return rate other than 100%', () => {
    expect(payoffLabels(productWith([down()], { buffer: 0.1, absoluteReturn: 0.2 }))['absolute-return']).toBe('A fall of up to 10% pays 20% of it as a gain')
  })

  it('says a barrier counts the whole fall past it', () => {
    const labels = payoffLabels(productWith([down()], { barrier: 0.7 }))
    expect(labels.barrier).toBe('A fall of up to 30% repays principal')
    expect(labels.downside).toBe('A fall past 30% loses 1% per 1% of the whole fall')
    expect(labels.lowest).toBeUndefined()
  })

  it('states rates per 1% move', () => {
    expect(payoffLabels(productWith([down(1.5), up(1.39)])).upside).toBe('Each 1% rise adds 1.39%')
    expect(payoffLabels(productWith([down(1.5), up(1.39)])).downside).toBe('Each 1% fall loses 1.5%')
  })

  it('says where a cap beyond the axis is reached', () => {
    expect(payoffLabels(productWith([up(0.2)], { cap: 0.5 })).cap).toBe('Capped at 1,500, reached at +250%')
  })

  it('names the floor, and gives no lowest payment when a floor sets it', () => {
    const labels = payoffLabels(productWith([down()], { principalProtection: 0.9 }))
    expect(labels.protection).toBe('Never below 900')
    expect(labels.lowest).toBeUndefined()
  })

  it('names a deposit minimum return', () => {
    const deposit: Product = { ...startingProduct, wrapper: 'deposit', payoff: { participations: [up()], minimumReturn: 0.05 } }
    expect(payoffLabels(deposit)['minimum-return']).toBe('Never below 1,050')
  })
})

describe('payoff chart labels with absolute return above a barrier', () => {
  it('says how far a fall can go and still be paid as a gain', () => {
    expect(payoffLabels(productWith([down(), up(1.25)], { barrier: 0.7, absoluteReturn: 0.5 }))['absolute-return']).toBe('A fall of up to 30% pays 50% of it as a gain')
  })
})

describe('payoff chart labels with an upside barrier', () => {
  const finned = (rebate?: number): Product => ({ ...startingProduct, payoff: { participations: withSubFeatures([{ direction: 'upside', rate: 0.8 }], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }), principalProtection: 1 } })

  it('says where the slope ends and what is paid above the barrier', () => {
    expect(payoffLabels(finned(0.02))).toMatchObject({
      upside: 'Each 1% rise up to +30% adds 0.8%',
      'upside-barrier': 'Above +30% it pays a fixed 1,020',
      protection: 'Never below 1,000',
    })
  })

  it('says a rise adds nothing above the barrier when there is no rebate', () => {
    expect(payoffLabels(finned())['upside-barrier']).toBe('Above +30% a rise adds nothing')
  })

  it('gives no upside barrier label without one', () => {
    expect(payoffLabels(startingProduct)['upside-barrier']).toBeUndefined()
  })

  it('keeps the labels of a barrier on downside participation and an upside barrier apart', () => {
    const both: Product = { ...startingProduct, payoff: { participations: withSubFeatures([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 0.8 }], { barrier: { level: 0.7, observation: 'final' as const }, upsideBarrier: { level: 1.3, observation: 'final' as const } }) } }
    const labels = payoffLabels(both)
    expect(labels.barrier).toBe('A fall of up to 30% repays principal')
    expect(labels['upside-barrier']).toBe('Above +30% a rise adds nothing')
  })
})

describe('payoff chart labels with barriers observed on every close', () => {
  it('says a downside barrier repays principal only if no close went past it, and labels the other path', () => {
    const labels = payoffLabels({ ...startingProduct, payoff: { participations: withSubFeatures([down()], { barrier: { level: 0.7, observation: 'daily-close' } }) } })
    expect(labels.barrier).toBe('A fall of up to 30% repays principal if no close went past it')
    expect(labels.breach).toBe('If a close fell past 30%, every 1% fall loses 1%')
  })

  it('labels the other path of an upside barrier with the rebate, even after a fall', () => {
    const finned = (rebate?: number): Product => ({ ...startingProduct, payoff: { participations: withSubFeatures([{ direction: 'upside', rate: 0.8 }], { upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate } }), principalProtection: 1 } })
    expect(payoffLabels(finned(0.02)).breach).toBe('If a close went above +30%, it pays a fixed 1,020, even after a fall')
    expect(payoffLabels(finned()).breach).toBe('If a close went above +30%, it adds nothing, even after a fall')
  })

  it('adds no label for the other path to a barrier observed on the final date', () => {
    expect(payoffLabels(productWith([down()], { barrier: 0.7 })).breach).toBeUndefined()
  })
})

describe('payoff chart labels with barrier absolute return', () => {
  const bothWays = (terms: { conditionalReturn?: number; upper?: 'final' | 'daily-close'; lower?: 'final' | 'daily-close' } = {}): Product => ({
    ...startingProduct,
    payoff: {
      participations: [],
      barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: terms.lower ?? 'daily-close' }, upperBarrier: { level: 1.25, observation: terms.upper ?? 'daily-close' }, conditionalReturn: 'conditionalReturn' in terms ? terms.conditionalReturn : 0.02 },
    },
  })

  it('says what the absolute return adds, and what is paid beyond each barrier', () => {
    expect(payoffLabels(bothWays())).toMatchObject({
      'absolute-return': 'Each 1% move, up or down, adds 1%',
      'event-below': 'Below −20% it pays a fixed 1,020',
      'event-above': 'Above +25% it pays a fixed 1,020',
    })
  })

  it('says nothing is added beyond a barrier when there is no conditional return', () => {
    const labels = payoffLabels(bothWays({ conditionalReturn: undefined }))
    expect(labels['event-below']).toBe('Below −20% it adds nothing')
    expect(labels['event-above']).toBe('Above +25% it adds nothing')
  })

  it('labels the other path when a barrier is observed on every close, and only then', () => {
    expect(payoffLabels(bothWays()).breach).toBe('If a close went beyond a barrier, it pays a fixed 1,020, even after a return inside the range')
    expect(payoffLabels(bothWays({ lower: 'final', upper: 'final' })).breach).toBeUndefined()
    expect(payoffLabels(bothWays({ lower: 'final' })).breach).toBeDefined()
  })
})

describe('payoff chart labels with a daily barrier on each side', () => {
  const bothSides = (downsideObservation: 'final' | 'daily-close'): Product => ({
    ...startingProduct,
    payoff: {
      participations: withSubFeatures([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 0.8 }], {
        barrier: { level: 0.7, observation: downsideObservation },
        upsideBarrier: { level: 1.3, observation: 'daily-close', rebate: 0.02 },
      }),
    },
  })

  it('labels each side\'s other path with its own text', () => {
    const labels = payoffLabels(bothSides('daily-close'))
    expect(labels.breach).toBe('If a close fell past 30%, every 1% fall loses 1%')
    expect(labels['upside-breach']).toBe('If a close went above +30%, it pays a fixed 1,020, even after a fall')
  })

  it('keeps the single label when only one side is observed on every close', () => {
    const labels = payoffLabels(bothSides('final'))
    expect(labels.breach).toBe('If a close went above +30%, it pays a fixed 1,020, even after a fall')
    expect(labels['upside-breach']).toBeUndefined()
  })
})
