import { downsideOf, maturityPayment, upsideOf, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

const amount = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'
const percent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : '—'
// A rate applied to a 1% move, so 150% participation reads as 1.5%.
const perPoint = (rate: number) => Number.isFinite(rate) ? `${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}%` : '—'

// What the chart says beside each piece of the payoff line, keyed by the concept that sets the payment there, so the chart
// explains itself without a colour key. Each says what the piece does, in the product's own terms. `lowest` labels the
// payment at a fall to zero when nothing floors it above zero.
export type PayoffLabelKey = ConceptId | 'lowest'

export function payoffLabels(product: Product): Partial<Record<PayoffLabelKey, string>> {
  const labels: Partial<Record<PayoffLabelKey, string>> = {}
  const principal = product.principalAmount
  const upside = upsideOf(product)
  const downside = downsideOf(product)
  const { principalProtection, minimumReturn } = product.payoff

  labels.payoff = `Repays principal ${amount(principal)}`
  if (upside) {
    labels.upside = `Each 1% rise adds ${perPoint(upside.rate)}`
    // The horizontal axis ends at +100%. A cap reached beyond it is said where it is reached.
    if (upside.cap !== undefined) {
      const reachedAt = upside.cap / upside.rate
      labels.cap = `Capped at ${amount(principal * (1 + upside.cap))}${reachedAt > 1 ? `, reached at +${percent(reachedAt)}` : ''}`
    }
  }
  if (downside) {
    const { buffer, barrier, absoluteReturn, rate } = downside
    if (buffer !== undefined) {
      labels.buffer = `A fall of up to ${percent(buffer)} repays principal`
      labels.downside = `A fall past ${percent(buffer)} loses ${perPoint(rate)} per 1% beyond it`
    } else if (barrier !== undefined) {
      labels.barrier = `A fall of up to ${percent(1 - barrier.level)} repays principal`
      labels.downside = `A fall past ${percent(1 - barrier.level)} loses ${perPoint(rate)} per 1% of the whole fall`
    } else labels.downside = `Each 1% fall loses ${perPoint(rate)}`
    // Absolute return pays the falls downside participation does not reach: up to the buffer, or down to the barrier.
    const reach = buffer ?? (barrier !== undefined ? 1 - barrier.level : undefined)
    if (absoluteReturn !== undefined && reach !== undefined) {
      labels['absolute-return'] = absoluteReturn.rate === 1 ? `A fall of up to ${percent(reach)} is paid as a gain` : `A fall of up to ${percent(reach)} pays ${percent(absoluteReturn.rate)} of it as a gain`
    }
    // The lowest payment is at a fall to zero. Without a floor it can still be above zero, as with a buffer.
    const lowest = maturityPayment(product, { initial: 1, final: 0 })
    if (principalProtection === undefined && lowest > 0) labels.lowest = `Lowest payment ${amount(lowest)}`
  }
  if (principalProtection !== undefined) labels.protection = `Never below ${amount(principal * principalProtection)}`
  if (minimumReturn !== undefined) labels['minimum-return'] = `Never below ${amount(principal * (1 + minimumReturn))}`
  return labels
}
