import { couponBarrierLevel, paymentAtEnd } from '../domain/autocall'
import { barrierLevelAt, couponPerReview, downsideOf, paymentBreakdown, upsideOf, type PaymentBreakdown, type Product } from '../domain/note'

// Underlier returns the scenario table shows, from a fall to a strong rise.
export const scenarioReturns = [-0.4, 0, 0.1, 0.3]

export interface ScenarioRow {
  returnValue: number
  finalLevel: number
  // True for the row a barrier adds at its own level. Neither barrier is reached at its level: for a barrier on downside
  // participation it is the lowest final level that still repays principal, and for one on upside participation the highest that
  // still takes part in the rise, so the largest payment. For a digital return's barrier it is the lowest final level that still
  // earns the digital return.
  atBarrier: boolean
  // Set on the row a barrier adds just past its level, on the side where it is reached: above an upside or upper barrier, below a
  // lower barrier. Participation or absolute return has ended there and the rebate or conditional return, if there is one, is paid,
  // so the table shows the drop that follows the largest payment. Below a digital return's barrier the digital return is lost.
  pastBarrier: 'above' | 'below' | null
  // True for the row absolute return adds at the buffer level, the lowest final level that still pays a fall as a gain.
  atBuffer: boolean
  // True for the row a barrier observed on every close adds to show a path: the barrier was reached on an earlier close and the
  // underlier then moved back, so the final level alone would not have shown it.
  afterBreach: boolean
  // True for the row a coupon adds at its barrier, the lowest final level that pays the last coupon. Another row just below it misses it.
  atCouponBarrier: boolean
  breakdown: PaymentBreakdown
  // With a coupon, the last review's own coupon when the final level is at or above its barrier, and zero otherwise. Zero without one.
  lastCoupon: number
  // What the product pays at the end of its term, if no earlier review called it: the payoff, plus the last coupon, or the call when
  // the final review calls it. It is the payment the chart draws.
  endPayment: number
}

// The close that reached a barrier in a row where one was reached on an earlier close, to say beside the final level. With barrier
// absolute return both closes can be stated, so it is the one beyond the barrier that was reached.
export function breachClose(breakdown: PaymentBreakdown): { kind: 'lowest' | 'highest'; level: number } | null {
  if (breakdown.barrierAbsolute !== undefined) {
    if (breakdown.barrierAbsolute.lowerReached && breakdown.lowestClose !== undefined) return { kind: 'lowest', level: breakdown.lowestClose }
    return breakdown.barrierAbsolute.upperReached && breakdown.highestClose !== undefined ? { kind: 'highest', level: breakdown.highestClose } : null
  }
  if (breakdown.lowestClose !== undefined) return { kind: 'lowest', level: breakdown.lowestClose }
  return breakdown.highestClose !== undefined ? { kind: 'highest', level: breakdown.highestClose } : null
}

// One row per scenario return, measured from the determined initial level. Every number comes from the payment breakdown,
// so the table cannot disagree with the calculation.
// A barrier adds a row at its level, so the table shows where a fall stops repaying principal wherever the barrier is, and an
// upside barrier adds another just above its level, where the payment drops.
// Absolute return adds one at the buffer level, where a fall stops paying a gain. A coupon adds one at its barrier and one just below. Each row's level is computed as the
// payment computes it, so rounding cannot move it to the other side, and a fixed row at the same level gives way to it.
export function scenarioRows(note: Product, initialLevel: number, returns: number[] = scenarioReturns): ScenarioRow[] {
  type Point = { returnValue: number; finalLevel: number; atBarrier: boolean; pastBarrier: 'above' | 'below' | null; atBuffer: boolean; afterBreach: boolean; atCouponBarrier: boolean; lowestClose?: number; highestClose?: number }
  let points: Point[] = returns.map((returnValue) => ({ returnValue, finalLevel: initialLevel * (1 + returnValue), atBarrier: false, pastBarrier: null, atBuffer: false, afterBreach: false, atCouponBarrier: false }))
  // A row at the level of one already there takes its place, keeping its markers, so two features at one level, such as a coupon
  // barrier and a downside barrier both at 70%, are both marked on the one row.
  const added = (finalLevel: number, returnValue: number, marks: Partial<Pick<Point, 'atBarrier' | 'pastBarrier' | 'atBuffer' | 'atCouponBarrier'>>) => {
    const same = (point: Point) => Math.abs(point.finalLevel - finalLevel) <= 1e-9 * initialLevel
    const before = points.find(same)
    const point: Point = {
      returnValue,
      finalLevel,
      atBarrier: (before?.atBarrier ?? false) || (marks.atBarrier ?? false),
      pastBarrier: marks.pastBarrier ?? before?.pastBarrier ?? null,
      atBuffer: (before?.atBuffer ?? false) || (marks.atBuffer ?? false),
      afterBreach: false,
      atCouponBarrier: (before?.atCouponBarrier ?? false) || (marks.atCouponBarrier ?? false),
    }
    points = [...points.filter((candidate) => !same(candidate)), point].sort((a, b) => a.finalLevel - b.finalLevel)
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
  // A digital return adds a row at its barrier, the lowest final level that still earns it, and one a percent of the initial level
  // below it, where it is lost and the payment drops.
  const digital = note.payoff.digitalReturn
  if (digital !== undefined) {
    const level = barrierLevelAt(digital.barrier.level, initialLevel)
    added(level, digital.barrier.level - 1, { atBarrier: true })
    added(Math.max(0, level - 0.01 * initialLevel), digital.barrier.level - 1.01, { pastBarrier: 'below' })
  }
  // A coupon adds a row at its barrier, where the last coupon is paid, and one a percent of the initial level below it, where it is not.
  // A fixed coupon has no barrier and pays the last coupon at every level, so it adds no row.
  const couponLevel = couponBarrierLevel(note, initialLevel)
  const couponBarrier = note.coupon?.barrier
  if (couponBarrier !== undefined && couponLevel !== undefined) {
    added(couponLevel, couponBarrier - 1, { atCouponBarrier: true })
    if (couponBarrier > 0.01) added(couponLevel - 0.01 * initialLevel, couponBarrier - 1.01, {})
  }
  // A barrier observed daily also gets a row where it was reached and the underlier then moved back to halfway between the
  // barrier and the initial level. It stays beside the row at that final level that never reached the barrier.
  const afterBreach = (finalLevel: number, close: { lowestClose: number } | { highestClose: number }) => {
    points = [...points, { returnValue: finalLevel / initialLevel - 1, finalLevel, atBarrier: false, pastBarrier: null, atBuffer: false, afterBreach: true, atCouponBarrier: false, ...close }].sort((a, b) => a.finalLevel - b.finalLevel)
  }
  if (barrier?.observation === 'daily-close') afterBreach(initialLevel * (1 + barrier.level) / 2, { lowestClose: Math.max(0, initialLevel * (barrier.level - 0.05)) })
  if (upsideBarrier?.observation === 'daily-close') afterBreach(initialLevel * (1 + upsideBarrier.level) / 2, { highestClose: initialLevel * (upsideBarrier.level + 0.05) })
  // For barrier absolute return the underlier returns to the initial level after a close beyond a barrier, which pays the fixed
  // return where a flat note that never went beyond would pay principal.
  if (bothWays?.lowerBarrier.observation === 'daily-close') afterBreach(initialLevel, { lowestClose: Math.max(0, initialLevel * (bothWays.lowerBarrier.level - 0.05)) })
  if (bothWays?.upperBarrier.observation === 'daily-close') afterBreach(initialLevel, { highestClose: initialLevel * (bothWays.upperBarrier.level + 0.05) })
  return points.map(({ lowestClose, highestClose, ...point }) => {
    const levels = { initial: initialLevel, final: point.finalLevel, lowestClose, highestClose }
    const lastCoupon = note.coupon !== undefined && (couponLevel === undefined || point.finalLevel >= couponLevel) ? couponPerReview(note) : 0
    return { ...point, breakdown: paymentBreakdown(note, levels), lastCoupon, endPayment: paymentAtEnd(note, levels) }
  })
}
