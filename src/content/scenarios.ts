import { barrierLevelAt, downsideOf, paymentBreakdown, upsideOf, type PaymentBreakdown, type Product } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  // True for the row a barrier adds at its own level: for a barrier on downside participation the lowest final level that still
  // repays principal, and for one on upside participation the lowest final level that cancels it.
  atBarrier: boolean
  // True for the row absolute return adds at the buffer level, the lowest final level that still pays a fall as a gain.
  atBuffer: boolean
  breakdown: PaymentBreakdown
}

// One row per scenario return, measured from the determined initial level. Every number comes from the payment breakdown,
// so the table cannot disagree with the calculation.
// A barrier adds a row at its level, so the table shows where a fall stops repaying principal wherever the barrier is.
// Absolute return adds one at the buffer level, where a fall stops paying a gain. Each row's level is computed as the
// payment computes it, so rounding cannot move it to the other side, and a fixed row at the same level gives way to it.
export function scenarioRows(note: Product, initialLevel: number, returns: number[] = scenarioReturns): ScenarioRow[] {
  let points = returns.map((returnValue) => ({ returnValue, finalLevel: initialLevel * (1 + returnValue), atBarrier: false, atBuffer: false }))
  const added = (finalLevel: number, returnValue: number, marks: { atBarrier: boolean; atBuffer: boolean }) => {
    points = [...points.filter((point) => Math.abs(point.finalLevel - finalLevel) > 1e-9 * initialLevel), { returnValue, finalLevel, ...marks }]
      .sort((a, b) => a.finalLevel - b.finalLevel)
  }
  const { barrier, buffer, absoluteReturn } = downsideOf(note) ?? {}
  if (barrier !== undefined) added(barrier.level * initialLevel, barrier.level - 1, { atBarrier: true, atBuffer: false })
  const upsideBarrier = upsideOf(note)?.barrier
  if (upsideBarrier !== undefined) added(barrierLevelAt(upsideBarrier.level, initialLevel), upsideBarrier.level - 1, { atBarrier: true, atBuffer: false })
  if (absoluteReturn !== undefined && buffer !== undefined) added(initialLevel * (1 - buffer), -buffer, { atBarrier: false, atBuffer: true })
  return points.map((point) => ({ ...point, breakdown: paymentBreakdown(note, { initial: initialLevel, final: point.finalLevel }) }))
}
