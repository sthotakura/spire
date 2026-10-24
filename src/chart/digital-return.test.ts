import { describe, expect, it } from 'vitest'
import { digitalBarrierFromX, digitalFromY, jumpsOf, regimeOf, xToLevel, type Plot } from './geometry'
import { paymentBreakdown, type SingleProduct } from '../domain/note'
import { startingProduct } from '../domain/starting-note'

const plot: Plot = { left: 50, right: 590, top: 35, bottom: 310 }
// Synthetic: a 26% digital return from 70% of the initial level, beside 1:1 participation both ways (docs/digital-return.md).
const citi: SingleProduct = { ...startingProduct, payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], digitalReturn: { amount: 0.26, barrier: { level: 0.7, observation: 'final' } } } }
const regimeAt = (product: SingleProduct, final: number) => regimeOf(paymentBreakdown(product, { initial: 100, final }))

describe('digital return on the chart', () => {
  it('jumps at the barrier, whose level pays like the samples above it', () => {
    expect(jumpsOf(citi, 100)).toEqual([{ level: 70, paysAbove: true }])
    expect(jumpsOf({ ...citi, payoff: { ...citi.payoff, digitalReturn: { amount: 0.26, barrier: { level: 0.57, observation: 'final' } } } }, 100)).toEqual([{ level: 57, paysAbove: true }])
  })

  it('draws the digital floor in its own colour where it sets the payment, and the participation where that pays more', () => {
    expect(regimeAt(citi, 90)).toBe('digital')
    expect(regimeAt(citi, 70)).toBe('digital')
    expect(regimeAt(citi, 69)).toBe('downside')
    expect(regimeAt(citi, 150)).toBe('upside')
  })

  it('keeps the protection floor as the floor when it is higher', () => {
    const higher: SingleProduct = { ...citi, payoff: { ...citi.payoff, principalProtection: 1.0, digitalReturn: { amount: 0.26, barrier: { level: 0.7, observation: 'final' } } } }
    expect(regimeAt(higher, 90)).toBe('digital')
    expect(regimeAt(higher, 60)).toBe('floor')
  })

  it('sets the amount from a height, snapped to 1% and held to the range', () => {
    const top = 1500
    const heightOf = (amount: number) => plot.bottom - amount / top * (plot.bottom - plot.top)
    expect(digitalFromY(heightOf(1260), 1000, top, plot)).toBe(26)
    expect(digitalFromY(heightOf(1000), 1000, top, plot)).toBe(1)
    expect(digitalFromY(plot.top - 50, 1000, top, plot)).toBe(50)
  })

  it('sets the barrier from a position, snapped to 1% and held to 1% to 100%', () => {
    const xOf = (level: number) => plot.left + level / 200 * (plot.right - plot.left)
    expect(digitalBarrierFromX(xOf(70), 100, plot, 100)).toBe(70)
    expect(digitalBarrierFromX(xOf(100), 100, plot, 100)).toBe(100)
    expect(digitalBarrierFromX(xOf(140), 100, plot, 100)).toBe(100)
    expect(digitalBarrierFromX(plot.left - 20, 100, plot, 100)).toBe(1)
    expect(xToLevel(xOf(70), 100, plot)).toBeCloseTo(70, 8)
  })
})
