// Chart geometry and drag math, kept apart from Vue so it can be tested on its own.
// The vertical axis starts at zero and is fitted to the payoff. The page holds it still while the reader drags, so the line
// does not move under the pointer, and refits it when the drag ends.

import type { PaymentBreakdown } from '../domain/note'

export interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

export const levelAxisFactor = 1.6 // horizontal axis spans 0 to this many times the initial level
export const slopeLevelFactor = 1.5 // the slope handle sits at this many times the initial level

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export const levelToX = (level: number, initialLevel: number, plot: Plot) => plot.left + level / (initialLevel * levelAxisFactor) * (plot.right - plot.left)
export const xToLevel = (x: number, initialLevel: number, plot: Plot) => (x - plot.left) / (plot.right - plot.left) * initialLevel * levelAxisFactor
export const amountToY = (amount: number, top: number, plot: Plot) => plot.bottom - amount / top * (plot.bottom - plot.top)
export const yToAmount = (y: number, top: number, plot: Plot) => (plot.bottom - y) / (plot.bottom - plot.top) * top

// The vertical axis runs from zero to `top`, with a tick every `step`.
export interface AmountAxis {
  top: number
  step: number
}

// Fits the axis to the highest amount the chart shows, with a little headroom, in round steps of principal and at most
// seven of them. Zero stays at the bottom, so the chart never exaggerates a gain or a loss.
export function fitAmountAxis(highest: number, principal: number): AmountAxis {
  const target = Math.max(highest, principal) * 1.05
  for (let scale = 1; ; scale *= 10) {
    for (const multiple of [0.1, 0.2, 0.25, 0.5]) {
      const step = principal * multiple * scale
      const steps = Math.ceil(target / step)
      if (steps <= 7) return { top: steps * step, step }
    }
  }
}

// A drag cannot go past the edges of the plot, so it sets only amounts the frozen axis can show.
const dragAmount = (y: number, top: number, plot: Plot) => yToAmount(clamp(y, plot.top, plot.bottom), top, plot)

// Values a handle can take. Typing in a field is not limited by these; only dragging and the arrow keys are.
export const protectionRange = { min: 0, max: 100 }
export const upsideRateRange = { min: 5, max: 200 }
export const capRange = { min: 1, max: 100 }
export const bufferRange = { min: 1, max: 100 }
export const barrierRange = { min: 1, max: 99 }
export const minimumReturnRange = { min: 1, max: 100 }

export const clampProtection = (percent: number) => clamp(Math.round(percent), protectionRange.min, protectionRange.max)
export const clampUpsideRate = (percent: number) => clamp(Math.round(percent), upsideRateRange.min, upsideRateRange.max)
export const clampCap = (percent: number) => clamp(Math.round(percent), capRange.min, capRange.max)
export const clampBuffer = (percent: number) => clamp(Math.round(percent), bufferRange.min, bufferRange.max)
export const clampBarrier = (percent: number) => clamp(Math.round(percent), barrierRange.min, barrierRange.max)
export const clampMinimumReturn = (percent: number) => clamp(Math.round(percent), minimumReturnRange.min, minimumReturnRange.max)
export const clampFinalLevel = (level: number, initialLevel: number) => clamp(Math.round(level), 0, Math.floor(initialLevel * levelAxisFactor))

// Dragging the floor handle to a height sets protection, snapped to 1%.
export const protectionFromY = (y: number, principal: number, top: number, plot: Plot) => clampProtection(dragAmount(y, top, plot) / principal * 100)

// The slope handle sits at this underlier return. A cap would pin it to the cap line, so it stays below half the cap, which
// keeps it on the sloped part of the line for any rate up to the top of the range.
export const slopeReturn = (cap?: number) => Math.min(slopeLevelFactor - 1, cap === undefined ? Infinity : cap / 2)
export const slopeLevel = (initialLevel: number, cap?: number) => initialLevel * (1 + slopeReturn(cap))

// The level at which the payment first reaches the cap, given the upside participation rate. Undefined when there is
// no upside participation, since the payment can then never reach a cap.
export const capBindLevel = (initialLevel: number, cap: number, upsideRate?: number) => (upsideRate ? initialLevel * (1 + cap / upsideRate) : undefined)

// Dragging the slope handle sets the upside rate, snapped to 5%.
export const upsideRateFromY = (y: number, principal: number, top: number, plot: Plot, cap?: number) => {
  const rate = (dragAmount(y, top, plot) / principal - 1) / slopeReturn(cap) * 100
  return clampUpsideRate(Math.round(rate / 5) * 5)
}

// Dragging the cap handle to a height sets the cap as a return on principal, snapped to 1%.
export const capFromY = (y: number, principal: number, top: number, plot: Plot) => clampCap((dragAmount(y, top, plot) / principal - 1) * 100)

// Dragging the minimum-return handle to a height sets the minimum as a return on principal, snapped to 1%.
export const minimumReturnFromY = (y: number, principal: number, top: number, plot: Plot) => clampMinimumReturn((dragAmount(y, top, plot) / principal - 1) * 100)

// The buffer handle sits where losses start: the level the underlier can fall to before principal is reduced.
export const bufferLevel = (initialLevel: number, buffer: number) => initialLevel * (1 - buffer)

// Dragging the buffer handle sideways sets the buffer as the fall from the level the return is measured from, snapped to 1%.
// The axis stays scaled on the initial-level term, so with lookback the two levels differ.
export const bufferFromX = (x: number, initialLevel: number, plot: Plot, measuredFrom: number) => clampBuffer((1 - xToLevel(x, initialLevel, plot) / measuredFrom) * 100)

// Dragging the barrier handle sideways sets the barrier as a percentage of the level the return is measured from, snapped to 1%.
export const barrierFromX = (x: number, initialLevel: number, plot: Plot, measuredFrom: number) => clampBarrier(xToLevel(x, initialLevel, plot) / measuredFrom * 100)

// Dragging the final-level handle sets the level, snapped to 1 unit.
export const finalLevelFromX = (x: number, initialLevel: number, plot: Plot) => clampFinalLevel(xToLevel(x, initialLevel, plot), initialLevel)

// Arrow keys change a handle by its step; Shift multiplies the step by 5. Returns null for any other key.
export const keyDelta = (key: string, shift: boolean, step: number): number | null => {
  const direction = key === 'ArrowUp' || key === 'ArrowRight' ? 1 : key === 'ArrowDown' || key === 'ArrowLeft' ? -1 : 0
  return direction === 0 ? null : direction * step * (shift ? 5 : 1)
}

// The rule that sets the payment at a final level. The line is drawn in one colour per rule, so the reader can see which one binds where.
export type Regime = 'principal' | 'buffer' | 'barrier' | 'downside' | 'upside' | 'floor' | 'cap'

// A fall the buffer absorbs in full leaves principal unchanged, but it is the buffer, not the absence of participation, that holds the payment there.
// A fall that ends at or above a barrier is held at principal by the barrier in the same way.
export const regimeOf = (b: PaymentBreakdown): Regime => b.floorApplies ? 'floor' : b.capApplies ? 'cap' : b.participationRate === undefined ? 'principal'
  : b.direction === 'downside' && b.belowBarrier === false ? 'barrier'
    : b.direction === 'downside' && b.bufferAbsorbs && b.participatedReturn === 0 ? 'buffer' : b.direction

// A sampled point on the payoff line. A jump marks where the payment changes at once, such as at a barrier: the line breaks
// there instead of joining the two sides, since a joining segment would show payments the note never makes.
export interface Sample {
  point: string
  regime: Regime
  jump?: boolean
}

// Splits sampled points into runs of one regime. Each run also ends on the first point of the next, so the coloured pieces
// join without gaps, except across a jump.
export const splitByRegime = (samples: ReadonlyArray<Sample>): { regime: Regime; points: string }[] => {
  const runs: { regime: Regime; points: string[] }[] = []
  for (const { point, regime, jump } of samples) {
    const last = runs[runs.length - 1]
    if (last?.regime === regime && !jump) last.points.push(point)
    else {
      if (!jump) last?.points.push(point)
      runs.push({ regime, points: [point] })
    }
  }
  return runs.map((run) => ({ regime: run.regime, points: run.points.join(' ') }))
}

// Splits sampled points into pieces of the line, breaking only at jumps.
export const splitAtJumps = (samples: ReadonlyArray<Pick<Sample, 'point' | 'jump'>>): string[] => {
  const pieces: string[][] = []
  for (const { point, jump } of samples) {
    if (jump || !pieces.length) pieces.push([point])
    else pieces[pieces.length - 1].push(point)
  }
  return pieces.map((piece) => piece.join(' '))
}
