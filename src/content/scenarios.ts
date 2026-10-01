import { downsideOf, paymentBreakdown, type PaymentBreakdown, type Product } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  // True for the row a barrier adds at its own level, the lowest final level that still repays principal.
  atBarrier: boolean
  breakdown: PaymentBreakdown
}

// One row per scenario return, measured from the determined initial level. Every number comes from the payment breakdown,
// so the table cannot disagree with the calculation.
// A barrier adds a row at its level, so the table shows where a fall stops repaying principal wherever the barrier is.
// The row's level is computed as the payment computes the barrier, so rounding cannot turn it into a breach, and a fixed
// row at the same level gives way to it.
export function scenarioRows(note: Product, initialLevel: number, returns: number[] = scenarioReturns): ScenarioRow[] {
  let points = returns.map((returnValue) => ({ returnValue, finalLevel: initialLevel * (1 + returnValue), atBarrier: false }))
  const barrier = downsideOf(note)?.barrier
  if (barrier !== undefined) {
    const finalLevel = barrier.level * initialLevel
    points = [...points.filter((point) => Math.abs(point.finalLevel - finalLevel) > 1e-9 * initialLevel), { returnValue: barrier.level - 1, finalLevel, atBarrier: true }]
      .sort((a, b) => a.finalLevel - b.finalLevel)
  }
  return points.map((point) => ({ ...point, breakdown: paymentBreakdown(note, { initial: initialLevel, final: point.finalLevel }) }))
}
