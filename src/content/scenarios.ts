import { barrierLevelAt, downsideOf, paymentBreakdown, upsideOf, type PaymentBreakdown, type Product } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  // True for the row a barrier adds at its own level. Neither barrier is reached at its level: for a barrier on downside
  // participation it is the lowest final level that still repays principal, and for one on upside participation the highest that
  // still takes part in the rise, so the largest payment.
  atBarrier: boolean
  // Set on the row a barrier adds just past its level, on the side where it is reached: above an upside or upper barrier, below a
  // lower barrier. Participation or absolute return has ended there and the rebate or conditional return, if there is one, is paid,
  // so the table shows the drop that follows the largest payment.
  pastBarrier: 'above' | 'below' | null
  // True for the row absolute return adds at the buffer level, the lowest final level that still pays a fall as a gain.
  atBuffer: boolean
  // True for the row a barrier observed on every close adds to show a path: the barrier was reached on an earlier close and the
  // underlier then moved back, so the final level alone would not have shown it.
  afterBreach: boolean
  breakdown: PaymentBreakdown
}

// One row per scenario return, measured from the determined initial level. Every number comes from the payment breakdown,
// so the table cannot disagree with the calculation.
// A barrier adds a row at its level, so the table shows where a fall stops repaying principal wherever the barrier is, and an
// upside barrier adds another just above its level, where the payment drops.
// Absolute return adds one at the buffer level, where a fall stops paying a gain. Each row's level is computed as the
// payment computes it, so rounding cannot move it to the other side, and a fixed row at the same level gives way to it.
export function scenarioRows(note: Product, initialLevel: number, returns: number[] = scenarioReturns): ScenarioRow[] {
  type Point = { returnValue: number; finalLevel: number; atBarrier: boolean; pastBarrier: 'above' | 'below' | null; atBuffer: boolean; afterBreach: boolean; lowestClose?: number; highestClose?: number }
  let points: Point[] = returns.map((returnValue) => ({ returnValue, finalLevel: initialLevel * (1 + returnValue), atBarrier: false, pastBarrier: null, atBuffer: false, afterBreach: false }))
  const added = (finalLevel: number, returnValue: number, marks: Partial<Pick<Point, 'atBarrier' | 'pastBarrier' | 'atBuffer'>>) => {
    points = [...points.filter((point) => Math.abs(point.finalLevel - finalLevel) > 1e-9 * initialLevel), { returnValue, finalLevel, atBarrier: false, pastBarrier: null, atBuffer: false, afterBreach: false, ...marks }]
      .sort((a, b) => a.finalLevel - b.finalLevel)
  }
  const { barrier, buffer, absoluteReturn } = downsideOf(note) ?? {}
  if (barrier !== undefined) added(barrier.level * initialLevel, barrier.level - 1, { atBarrier: true })
  const upsideBarrier = upsideOf(note)?.barrier
  if (upsideBarrier !== undefined) {
    const level = barrierLevelAt(upsideBarrier.level, initialLevel)
    added(level, upsideBarrier.level - 1, { atBarrier: true })
    // Five percent of the initial level above the barrier is the next level that is clearly past it.
    added(level + 0.05 * initialLevel, upsideBarrier.level - 1 + 0.05, { pastBarrier: 'above' })
  }
  if (absoluteReturn !== undefined && buffer !== undefined) added(initialLevel * (1 - buffer), -buffer, { atBuffer: true })
  // Barrier absolute return adds a row at each barrier level and one just past it, where the fixed return replaces the absolute return.
  const bothWays = note.payoff.barrierAbsoluteReturn
  if (bothWays !== undefined) {
    const lowerLevel = barrierLevelAt(bothWays.lowerBarrier.level, initialLevel)
    const upperLevel = barrierLevelAt(bothWays.upperBarrier.level, initialLevel)
    added(lowerLevel, bothWays.lowerBarrier.level - 1, { atBarrier: true })
    added(Math.max(0, lowerLevel - 0.05 * initialLevel), bothWays.lowerBarrier.level - 1 - 0.05, { pastBarrier: 'below' })
    added(upperLevel, bothWays.upperBarrier.level - 1, { atBarrier: true })
    added(upperLevel + 0.05 * initialLevel, bothWays.upperBarrier.level - 1 + 0.05, { pastBarrier: 'above' })
  }
  // A barrier observed daily also gets a row where it was reached and the underlier then moved back to halfway between the
  // barrier and the initial level. It stays beside the row at that final level that never reached the barrier.
  const afterBreach = (finalLevel: number, close: { lowestClose: number } | { highestClose: number }) => {
    points = [...points, { returnValue: finalLevel / initialLevel - 1, finalLevel, atBarrier: false, pastBarrier: null, atBuffer: false, afterBreach: true, ...close }].sort((a, b) => a.finalLevel - b.finalLevel)
  }
  if (barrier?.observation === 'daily-close') afterBreach(initialLevel * (1 + barrier.level) / 2, { lowestClose: Math.max(0, initialLevel * (barrier.level - 0.05)) })
  if (upsideBarrier?.observation === 'daily-close') afterBreach(initialLevel * (1 + upsideBarrier.level) / 2, { highestClose: initialLevel * (upsideBarrier.level + 0.05) })
  // For barrier absolute return the underlier returns to the initial level after a close beyond a barrier, which pays the fixed
  // return where a flat note that never went beyond would pay principal.
  if (bothWays?.lowerBarrier.observation === 'daily-close') afterBreach(initialLevel, { lowestClose: Math.max(0, initialLevel * (bothWays.lowerBarrier.level - 0.05)) })
  if (bothWays?.upperBarrier.observation === 'daily-close') afterBreach(initialLevel, { highestClose: initialLevel * (bothWays.upperBarrier.level + 0.05) })
  return points.map(({ lowestClose, highestClose, ...point }) => ({ ...point, breakdown: paymentBreakdown(note, { initial: initialLevel, final: point.finalLevel, lowestClose, highestClose }) }))
}
