// Hypothetical observed levels are scenario inputs, not note terms. They are listed in date order, so the last is the final date.

// Fits the levels to a count. Dropping keeps the latest dates; adding repeats the earliest level on new, earlier dates.
export function fitObservations(levels: number[], count: number): number[] {
  if (levels.length >= count) return levels.slice(levels.length - count)
  return [...Array<number>(count - levels.length).fill(levels[0]), ...levels]
}

// Fits levels observed after pricing, for lookback, to a count. Dropping keeps the earliest dates, the ones closest to
// pricing; adding repeats the latest level on new, later dates.
export function fitLookbackObservations(levels: number[], count: number): number[] {
  if (levels.length >= count) return levels.slice(0, count)
  return [...levels, ...Array<number>(count - levels.length).fill(levels[levels.length - 1])]
}

// Moves every level by the same whole number of units so their average lands as close to the target as it can, keeping
// the shape of the path. Whole units keep whole levels whole, so the average can differ from the target by up to half a unit.
// A level cannot go below zero, so near zero the average can also end above the target.
export function shiftToAverage(levels: number[], target: number): number[] {
  const shift = Math.round(target - levels.reduce((sum, level) => sum + level, 0) / levels.length)
  return levels.map((level) => Math.max(0, level + shift))
}

// Moves a basket's final level by moving every asset's return by the same amount: each observed level of an asset moves by
// that amount times the asset's initial level, so its final level, averaged or not, moves by the same amount too. Levels
// are kept to two decimal places, and a level cannot go below zero.
export function shiftReturns(levels: number[][], initialLevels: number[], returnChange: number): number[][] {
  return levels.map((assetLevels, asset) => assetLevels.map((level) => Math.max(0, Math.round((level + returnChange * initialLevels[asset]) * 100) / 100)))
}
