// Chart geometry and drag math, kept apart from Vue so it can be tested on its own.
// The vertical axis is fixed at 0 to 2 × principal, so the line does not move under the pointer while the reader drags.

export interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

export const amountAxisFactor = 2 // vertical axis spans 0 to this many times principal
export const levelAxisFactor = 1.6 // horizontal axis spans 0 to this many times the initial level
export const slopeLevelFactor = 1.5 // the slope handle sits at this many times the initial level

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export const levelToX = (level: number, initialLevel: number, plot: Plot) => plot.left + level / (initialLevel * levelAxisFactor) * (plot.right - plot.left)
export const xToLevel = (x: number, initialLevel: number, plot: Plot) => (x - plot.left) / (plot.right - plot.left) * initialLevel * levelAxisFactor
export const amountToY = (amount: number, principal: number, plot: Plot) => plot.bottom - amount / (principal * amountAxisFactor) * (plot.bottom - plot.top)
export const yToAmount = (y: number, principal: number, plot: Plot) => (plot.bottom - y) / (plot.bottom - plot.top) * principal * amountAxisFactor

// Values a handle can take. Typing in a field is not limited by these; only dragging and the arrow keys are.
export const protectionRange = { min: 0, max: 100 }
export const upsideRateRange = { min: 5, max: (amountAxisFactor - 1) / (slopeLevelFactor - 1) * 100 }

export const clampProtection = (percent: number) => clamp(Math.round(percent), protectionRange.min, protectionRange.max)
export const clampUpsideRate = (percent: number) => clamp(Math.round(percent), upsideRateRange.min, upsideRateRange.max)
export const clampFinalLevel = (level: number, initialLevel: number) => clamp(Math.round(level), 0, Math.floor(initialLevel * levelAxisFactor))

// Dragging the floor handle to a height sets protection, snapped to 1%.
export const protectionFromY = (y: number, principal: number, plot: Plot) => clampProtection(yToAmount(y, principal, plot) / principal * 100)

// Dragging the slope handle (at slopeLevelFactor × the initial level) sets the upside rate, snapped to 5%.
export const upsideRateFromY = (y: number, principal: number, plot: Plot) => {
  const rate = (yToAmount(y, principal, plot) / principal - 1) / (slopeLevelFactor - 1) * 100
  return clampUpsideRate(Math.round(rate / 5) * 5)
}

// Dragging the final-level handle sets the level, snapped to 1 unit.
export const finalLevelFromX = (x: number, initialLevel: number, plot: Plot) => clampFinalLevel(xToLevel(x, initialLevel, plot), initialLevel)

// Arrow keys change a handle by its step; Shift multiplies the step by 5. Returns null for any other key.
export const keyDelta = (key: string, shift: boolean, step: number): number | null => {
  const direction = key === 'ArrowUp' || key === 'ArrowRight' ? 1 : key === 'ArrowDown' || key === 'ArrowLeft' ? -1 : 0
  return direction === 0 ? null : direction * step * (shift ? 5 : 1)
}
