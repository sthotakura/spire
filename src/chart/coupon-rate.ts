import { couponRateOn, type FloatingRate } from '../domain/note'

// The coupon rate of a floating coupon against its reference rate, for the coupon rate chart: flat at the floor, rising one for one at
// the reference rate plus the spread, and flat at any cap. Rates are fractions a year.

export interface RatePoint {
  reference: number
  rate: number
}

export interface CouponRateLine {
  // The reference rates the horizontal axis spans, and the coupon rate the vertical axis reaches from zero.
  low: number
  high: number
  top: number
  // The coupon rate from low to high, through each corner inside the range.
  points: RatePoint[]
  // The reference rate plus the spread with no floor or cap, from low to high, which the chart draws faintly.
  unbounded: [RatePoint, RatePoint]
  // The reference rates at which the floor stops holding and the cap starts: floor − spread and cap − spread.
  floorEnds: number
  capStarts?: number
}

const step = 0.01

// The axis reaches whole percentages: at least −5% to 10%, wide enough for both corners with a point of room beyond each, and for
// every reference rate the scenario states.
export function couponRateLine(rate: FloatingRate, scenarioRates: number[] = []): CouponRateLine {
  const floorEnds = rate.floor - rate.spread
  const capStarts = rate.cap === undefined ? undefined : rate.cap - rate.spread
  const corners = [floorEnds, ...(capStarts === undefined ? [] : [capStarts])]
  const rates = scenarioRates.filter(Number.isFinite)
  // Whole steps, nudged so that floating-point noise, as in −0.05 ÷ 0.01 = −5.000000000000001, does not add a step.
  const low = Math.floor(Math.min(-0.05, ...corners.map((corner) => corner - step), ...rates) / step + 1e-9) / 100
  const high = Math.ceil(Math.max(0.1, ...corners.map((corner) => corner + step), ...rates) / step - 1e-9) / 100
  const references = [low, ...corners.filter((corner) => corner > low && corner < high), high].sort((a, b) => a - b)
  const points = references.map((reference) => ({ reference, rate: couponRateOn(rate, reference) }))
  // A point of room above the highest coupon rate drawn, so the line at a cap is not on the frame.
  const top = Math.ceil(Math.max(...points.map((point) => point.rate)) / step - 1e-9) / 100 + step
  return { low, high, top, points, unbounded: [{ reference: low, rate: low + rate.spread }, { reference: high, rate: high + rate.spread }], floorEnds, ...(capStarts === undefined ? {} : { capStarts }) }
}

// Ticks every 1%, 2% or 5%, whichever gives at most eight, from the first multiple at or above `from`.
export function rateTicks(from: number, to: number): number[] {
  const every = [0.01, 0.02, 0.05, 0.1].find((size) => (to - from) / size <= 8) ?? 0.1
  const first = Math.ceil(from / every - 1e-9) * every
  return Array.from({ length: Math.floor((to - first) / every + 1e-9) + 1 }, (_, i) => Math.round((first + i * every) * 1e6) / 1e6)
}

// A rate as a percentage with up to two decimals and a true minus.
export const ratePercentText = (fraction: number) => {
  const value = Math.round(fraction * 1e6) / 1e4
  return `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

// The line in words, for a screen reader.
export function couponRateDescription(rate: FloatingRate): string {
  const spread = rate.spread < 0 ? `minus ${ratePercentText(-rate.spread)}` : `plus ${ratePercentText(rate.spread)}`
  const floor = `${ratePercentText(rate.floor)} up to a reference rate of ${ratePercentText(rate.floor - rate.spread)}, then the reference rate ${spread}`
  const cap = rate.cap === undefined ? ', with no maximum' : `, up to ${ratePercentText(rate.cap)} from a reference rate of ${ratePercentText(rate.cap - rate.spread)}`
  return `Coupon rate against the reference rate: ${floor}${cap}.`
}
