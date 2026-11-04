import { downsideOf, type Delivery, type Product } from '../domain/note'
import type { CalculationStep } from './calculation'
import type { FormulaLine } from './formula'

const amount = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
// Issuers state a share count to more places than an amount: 11.8441 shares.
const count = (shares: number) => shares.toLocaleString('en-US', { maximumFractionDigits: 4 })
const percent = (fraction: number) => `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
const sharesOf = ({ shares, asset }: Delivery) => `${count(shares)} ${shares === 1 ? 'share' : 'shares'} of ${asset}`

// What the holder receives at the end of the term, for a product settled by delivery. Empty for one settled in cash, which needs saying
// nowhere.
export function explainDelivery(note: Product, delivery: Delivery | undefined): string {
  if (note.settlement !== 'delivery') return ''
  if (delivery === undefined) return 'The payment is in cash, because the holder bears no fall here.'
  const cash = delivery.cash > 0 ? `, and ${amount(delivery.cash)} in cash` : ''
  return `The holder receives ${sharesOf(delivery)}, worth ${amount(delivery.shares * delivery.finalLevel)} at its final level of ${amount(delivery.finalLevel)}${cash}.`
}

// The step that says what form the payment takes, after the payment itself.
export function deliveryStep(note: Product, delivery: Delivery | undefined): Omit<CalculationStep, 'n'> {
  if (delivery === undefined) return { title: 'Settlement', how: 'Paid in cash: the holder bears no fall here', value: 'Cash', muted: true, concept: 'settlement' }
  const rate = downsideOf(note)!.rate
  const cash = delivery.cash > 0 ? `, and ${amount(delivery.cash)} in cash` : ''
  return {
    title: 'Settlement',
    how: `${amount(note.principalAmount)} × ${percent(rate)} ÷ ${amount(delivery.initialLevel)} = ${sharesOf(delivery)}, worth ${amount(delivery.shares * delivery.finalLevel)} at ${amount(delivery.finalLevel)}${cash}`,
    value: `${count(delivery.shares)} shares`,
    concept: 'settlement',
  }
}

// The delivery rule, from the terms the product has. Its share count reads the downside rate and the initial level, and cash appears only
// when a term leaves some: rate × (1 − buffer) below 100%.
export function settlementFormula(note: Product): FormulaLine[] {
  const downside = downsideOf(note)
  if (note.settlement !== 'delivery' || downside === undefined) return []
  const { rate, buffer } = downside
  const worstOf = note.underlier.kind === 'basket'
  const withCash = Math.abs(1 - rate * (1 - (buffer ?? 0))) > 1e-9
  return [{
    lead: 'Delivery',
    segments: [
      { text: 'Where the holder bears a fall, deliver ' },
      { text: 'Principal × Downside rate ÷ Initial level', concept: 'settlement' },
      { text: worstOf ? ' shares of the worst asset, by its own initial level' : ' shares' },
      ...(withCash ? [{ text: ', and pay ' }, { text: buffer === undefined ? 'Principal × (1 − Downside rate)' : 'Principal × (1 − Downside rate × (1 − Buffer))', concept: 'settlement' as const }, { text: ' in cash' }] : []),
    ],
  }]
}
