// Chart geometry and drag math, kept apart from Vue so it can be tested on its own.
// The horizontal axis is the underlier's change, from −100% to +100% of the level the return is measured from, so the
// initial level sits at the centre. The vertical axis starts at zero and is fitted to the payoff. The page holds it still while the reader drags, so the line
// does not move under the pointer, and refits it when the drag ends.

import { barrierLevelAt, downsideOf, upsideOf, type PaymentBreakdown, type Product } from '../domain/note'

export interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

export const levelAxisFactor = 2 // horizontal axis spans 0 to this many times the initial level: −100% to +100%
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
// An upper barrier is above the initial level, up to the edge of the axis (a rise of 100%).
export const upperBarrierRange = { min: 101, max: 200 }
export const minimumReturnRange = { min: 1, max: 100 }

export const clampProtection = (percent: number) => clamp(Math.round(percent), protectionRange.min, protectionRange.max)
export const clampUpsideRate = (percent: number) => clamp(Math.round(percent), upsideRateRange.min, upsideRateRange.max)
export const clampCap = (percent: number) => clamp(Math.round(percent), capRange.min, capRange.max)
export const clampBuffer = (percent: number) => clamp(Math.round(percent), bufferRange.min, bufferRange.max)
export const clampBarrier = (percent: number) => clamp(Math.round(percent), barrierRange.min, barrierRange.max)
export const clampUpperBarrier = (percent: number) => clamp(Math.round(percent), upperBarrierRange.min, upperBarrierRange.max)
export const clampMinimumReturn = (percent: number) => clamp(Math.round(percent), minimumReturnRange.min, minimumReturnRange.max)
export const clampFinalLevel = (level: number, initialLevel: number) => clamp(Math.round(level), 0, Math.floor(initialLevel * levelAxisFactor))

// Dragging the floor handle to a height sets protection, snapped to 1%.
export const protectionFromY = (y: number, principal: number, top: number, plot: Plot) => clampProtection(dragAmount(y, top, plot) / principal * 100)

// The slope handle sits at this underlier return. A cap would pin it to the cap line, so it stays below half the cap, which
// keeps it on the sloped part of the line for any rate up to the top of the range. An upper barrier ends the slope in the
// same way, so the handle also stays below half the rise to the barrier (the barrier as a fraction of the initial level).
export const slopeReturn = (cap?: number, upperBarrier?: number) =>
  Math.min(slopeLevelFactor - 1, cap === undefined ? Infinity : cap / 2, upperBarrier === undefined ? Infinity : (upperBarrier - 1) / 2)
export const slopeLevel = (initialLevel: number, cap?: number, upperBarrier?: number) => initialLevel * (1 + slopeReturn(cap, upperBarrier))

// The level at which the payment first reaches the cap, given the upside participation rate. Undefined when there is
// no upside participation, since the payment can then never reach a cap.
export const capBindLevel = (initialLevel: number, cap: number, upsideRate?: number) => (upsideRate ? initialLevel * (1 + cap / upsideRate) : undefined)

// Dragging the slope handle sets the upside rate, snapped to 5%.
export const upsideRateFromY = (y: number, principal: number, top: number, plot: Plot, cap?: number, upperBarrier?: number) => {
  const rate = (dragAmount(y, top, plot) / principal - 1) / slopeReturn(cap, upperBarrier) * 100
  return clampUpsideRate(Math.round(rate / 5) * 5)
}

// Dragging the cap handle to a height sets the cap as a return on principal, snapped to 1%.
export const capFromY = (y: number, principal: number, top: number, plot: Plot) => clampCap((dragAmount(y, top, plot) / principal - 1) * 100)

// Dragging the minimum-return handle to a height sets the minimum as a return on principal, snapped to 1%.
export const minimumReturnFromY = (y: number, principal: number, top: number, plot: Plot) => clampMinimumReturn((dragAmount(y, top, plot) / principal - 1) * 100)

// The buffer handle sits where losses start: the level the underlier can fall to before principal is reduced.
export const bufferLevel = (initialLevel: number, buffer: number) => initialLevel * (1 - buffer)

// Dragging the buffer handle sideways sets the buffer as the fall from the level the return is measured from, snapped to 1%.
export const bufferFromX = (x: number, initialLevel: number, plot: Plot, measuredFrom: number) => clampBuffer((1 - xToLevel(x, initialLevel, plot) / measuredFrom) * 100)

// Dragging the barrier handle sideways sets the barrier as a percentage of the level the return is measured from, snapped to 1%.
export const barrierFromX = (x: number, initialLevel: number, plot: Plot, measuredFrom: number) => clampBarrier(xToLevel(x, initialLevel, plot) / measuredFrom * 100)

// Dragging the upper barrier handle sideways sets it as a percentage of the level the return is measured from, snapped to 1%.
export const upperBarrierFromX = (x: number, initialLevel: number, plot: Plot, measuredFrom: number) => clampUpperBarrier(xToLevel(x, initialLevel, plot) / measuredFrom * 100)

// Dragging the final-level handle sets the level, snapped to 1 unit.
export const finalLevelFromX = (x: number, initialLevel: number, plot: Plot) => clampFinalLevel(xToLevel(x, initialLevel, plot), initialLevel)

// Arrow keys change a handle by its step; Shift multiplies the step by 5. Returns null for any other key.
export const keyDelta = (key: string, shift: boolean, step: number): number | null => {
  const direction = key === 'ArrowUp' || key === 'ArrowRight' ? 1 : key === 'ArrowDown' || key === 'ArrowLeft' ? -1 : 0
  return direction === 0 ? null : direction * step * (shift ? 5 : 1)
}

// The rule that sets the payment at a final level. The line is drawn in one colour per rule, so the reader can see which one binds where.
export type Regime = 'principal' | 'buffer' | 'barrier' | 'upper-barrier' | 'absolute' | 'downside' | 'upside' | 'floor' | 'cap'

// A fall the buffer absorbs in full leaves principal unchanged, but it is the buffer, not the absence of participation, that holds the payment there.
// A fall that ends at or above a barrier is held at principal by the barrier in the same way. A fall within the buffer that
// absolute return pays as a gain is absolute return's. A rise that reaches an upper barrier is paid the rebate, or principal,
// by that barrier, which is the same concept as the barrier on downside participation but a different piece of the line.
export const regimeOf = (b: PaymentBreakdown): Regime => b.floorApplies ? 'floor' : b.capApplies ? 'cap' : b.absoluteReturnApplies ? 'absolute' : b.participationRate === undefined ? 'principal'
  : b.direction === 'downside' && b.belowBarrier === false ? 'barrier'
    : b.direction === 'upside' && b.upsideBarrierReached ? 'upper-barrier'
      : b.direction === 'downside' && b.bufferAbsorbs && b.participatedReturn === 0 ? 'buffer' : b.direction

// The final levels where the payment jumps, lowest first: at a barrier, at the buffer level when absolute return stops
// paying there, and at an upper barrier. Each is computed as the payment computes it, so the samples either side of it fall on the right sides.
export const jumpLevelsOf = (product: Product, initialLevel: number): number[] => {
  const downside = downsideOf(product)
  const levels: number[] = []
  if (downside?.barrier !== undefined) levels.push(downside.barrier.level * initialLevel)
  else if (downside?.absoluteReturn !== undefined && downside.buffer !== undefined) levels.push(bufferLevel(initialLevel, downside.buffer))
  const upperBarrier = upsideOf(product)?.barrier
  if (upperBarrier !== undefined) levels.push(barrierLevelAt(upperBarrier.level, initialLevel))
  return levels
}

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

// The underlier's changes the horizontal axis marks, every 20% from −100% to +100%.
export const returnTicks = Array.from({ length: 11 }, (_, i) => Math.round((i / 5 - 1) * 10) / 10)

// A stretch of sampled points set by one rule, by index, start and end included. A jump starts a new stretch.
export interface RegimeRun {
  regime: Regime
  start: number
  end: number
}

export function regimeRuns(regimes: ReadonlyArray<Regime>, jumps: ReadonlyArray<boolean | undefined>): RegimeRun[] {
  const runs: RegimeRun[] = []
  regimes.forEach((regime, i) => {
    const last = runs[runs.length - 1]
    if (last?.regime === regime && !jumps[i]) last.end = i
    else runs.push({ regime, start: i, end: i })
  })
  return runs
}

// Breaks a label into lines of at most `maxChars` characters, at spaces. A word longer than that gets a line of its own.
export function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1]
    if (last !== undefined && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface LabelRequest {
  id: string
  // Points on the line the label can describe, the preferred one first.
  anchors: ReadonlyArray<{ x: number; y: number }>
  width: number
  height: number
}

export interface PlacedLabel extends Box {
  id: string
  anchor: { x: number; y: number }
}

const overlaps = (a: Box, b: Box) => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
const inside = (box: Box, plot: Plot) => box.x >= plot.left + 2 && box.x + box.width <= plot.right - 2 && box.y >= plot.top && box.y + box.height <= plot.bottom - 2

// Places labels in the order given, which is their priority. Each label tries its anchors in turn and fixed slots around each,
// above before below, right before left before centred, near before far, and takes the first that stays inside the plot and
// clear of the obstacles and of the labels already placed. A label with no free slot is dropped, so the chart never shows two labels on
// top of each other. Obstacles can be points, such as samples of a line, given as boxes with no size.
export function placeLabels(requests: ReadonlyArray<LabelRequest>, obstacles: ReadonlyArray<Box>, plot: Plot, gap = { x: 10, y: 22 }): PlacedLabel[] {
  const placed: PlacedLabel[] = []
  for (const request of requests) {
    search: for (const anchor of request.anchors) {
      for (const reach of [1, 2, 3]) {
        const slot = [[1, -1], [-1, -1], [0, -1], [1, 1], [-1, 1], [0, 1]].map(([sx, sy]): Box => ({
          x: sx > 0 ? anchor.x + gap.x * reach : sx < 0 ? anchor.x - gap.x * reach - request.width : anchor.x - request.width / 2,
          y: sy < 0 ? anchor.y - gap.y * reach - request.height : anchor.y + gap.y * reach,
          width: request.width,
          height: request.height,
        })).find((box) => inside(box, plot) && !obstacles.some((obstacle) => overlaps(box, obstacle)) && !placed.some((other) => overlaps(box, other)))
        if (slot) {
          placed.push({ ...slot, id: request.id, anchor })
          break search
        }
      }
    }
  }
  return placed
}

// Where a leader from a label to its anchor leaves the label: the point of the label's box nearest the anchor.
export const leaderStart = (label: PlacedLabel) => ({
  x: clamp(label.anchor.x, label.x, label.x + label.width),
  y: clamp(label.anchor.y, label.y, label.y + label.height),
})
