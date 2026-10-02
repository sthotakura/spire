import { downsideOf, upsideOf, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

export interface FormulaSegment {
  text: string
  concept?: ConceptId
}

// A line with a lead ("Return", "Payment") defines it. A line without one limits the payment defined above it.
export interface FormulaLine {
  lead?: string
  segments: FormulaSegment[]
}

// The payment rule in words and symbols, built only from the features the note has. It reads in the order of the worked
// calculation: the return, the participated payment, then the cap, then the floor.
export function paymentFormula(note: Product): FormulaLine[] {
  const { principalProtection } = note.payoff
  const upside = upsideOf(note) !== undefined
  const downside = downsideOf(note) !== undefined
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
  const absoluteReturn = downsideOf(note)?.absoluteReturn

  const terms: FormulaSegment[] = []
  if (upside) terms.push({ text: 'Upside × max(Return, 0)', concept: 'upside' })
  if (upside && downside) terms.push({ text: ' + ' })
  // The buffer shifts where downside participation starts, so it sits inside the downside term.
  if (buffer !== undefined) terms.push({ text: 'Downside × min(Return + ', concept: 'downside' }, { text: 'Buffer', concept: 'buffer' }, { text: ', 0)', concept: 'downside' })
  else if (downside) terms.push({ text: 'Downside × min(Return, 0)', concept: 'downside' })
  const payment: FormulaSegment[] = terms.length ? [{ text: 'Principal × (1 + ' }, ...terms, { text: ')' }] : [{ text: 'Principal' }]

  const lines: FormulaLine[] = []
  const { initial, final } = note.underlier.determination
  const basket = note.underlier.kind === 'basket'
  // Lookback and averaging define their levels before the return reads them. Point-to-point needs no line: each level is one observed level.
  if (initial.kind === 'lookback') lines.push({ lead: 'Lookback level', segments: [{ text: 'Lowest of the levels on the pricing date and the dates after it', concept: 'initial-level' }] })
  if (final.kind === 'averaging') lines.push({ lead: 'Final level', segments: [{ text: basket ? 'Average of each asset’s observed levels' : 'Average of the observed levels', concept: 'final-level' }] })
  // A basket measures each asset on its own, then weights the asset returns into one return, which moves the basket level.
  if (basket) {
    lines.push(
      { lead: 'Asset return', segments: [{ text: 'Final level ÷ Initial level − 1', concept: 'determination' }, { text: ', for each asset' }] },
      { lead: 'Return', segments: [{ text: 'Sum of Weight × Asset return', concept: 'basket-return' }] },
      { lead: 'Basket level', segments: [{ text: '100 × (1 + Return)', concept: 'basket-return' }] },
    )
  } else lines.push({ lead: 'Return', segments: [{ text: `Final level ÷ ${initial.kind === 'lookback' ? 'Lookback' : 'Initial'} level − 1`, concept: 'determination' }] })
  lines.push({ lead: 'Payment', segments: payment })
  // The barrier decides whether the downside term counts at all, so it qualifies the payment rather than changing the term.
  const barrierTest = basket ? 'Basket level < Barrier × 100' : `Final level < Barrier × ${initial.kind === 'lookback' ? 'Lookback' : 'Initial'} level`
  if (barrier !== undefined) lines.push({ segments: [{ text: 'downside only when ' }, { text: barrierTest, concept: 'barrier' }] })
  // Absolute return replaces the payment for a fall within the buffer, so it qualifies the payment as the barrier does.
  if (absoluteReturn !== undefined) {
    lines.push({ segments: [{ text: 'but ' }, { text: 'Principal × (1 + Absolute × |Return|)', concept: 'absolute-return' }, { text: ' when ' }, { text: '−Buffer ≤ Return < 0', concept: 'buffer' }] })
  }
  // The cap limits upside participation only, which matters once a fall can pay a gain.
  if (cap !== undefined) lines.push({ segments: [{ text: absoluteReturn !== undefined ? 'a rise capped at ' : 'capped at ' }, { text: 'Principal × (1 + Cap)', concept: 'cap' }] })
  // Without protection the payment still cannot fall below zero. That only matters when a fall reduces principal, which a
  // deposit never allows, so a deposit has a floor line only for its minimum return.
  if (note.payoff.minimumReturn !== undefined) lines.push({ segments: [{ text: 'floored at ' }, { text: 'Principal × (1 + Minimum)', concept: 'minimum-return' }] })
  else if (principalProtection !== undefined) lines.push({ segments: [{ text: 'floored at ' }, { text: 'Principal × Protection', concept: 'protection' }] })
  else if (downside) lines.push({ segments: [{ text: 'floored at 0' }] })
  return lines
}

const amount = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'
// A rate applied to a 1% move, so 150% participation reads as 1.5%.
const perPoint = (rate: number) => Number.isFinite(rate) ? `${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}%` : '—'
const percent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : '—'

// The same rule in words, with the note's own terms filled in: how a move in the underlier changes the payment, then the
// limits on it. It says nothing about a particular final level; the worked calculation does that.
export function paymentInWords(note: Product): string {
  const { principalProtection } = note.payoff
  const principal = note.principalAmount
  const name = note.underlier.kind === 'basket' ? 'the basket' : note.underlier.components[0].asset.name.trim() || 'the underlier'
  const upside = upsideOf(note)
  const downside = downsideOf(note)
  const cap = upside?.cap
  const buffer = downside?.buffer
  const barrier = downside?.barrier
  const absoluteReturn = downside?.absoluteReturn
  const from = note.underlier.determination.initial.kind === 'lookback' ? 'lookback' : 'initial'

  const minimum = note.payoff.minimumReturn
  if (!upside && !downside) {
    return minimum === undefined
      ? `The payment is always principal, ${amount(principal)}, whatever ${name} does.`
      : `The payment is always principal plus the minimum return, ${amount(principal * (1 + minimum))}, whatever ${name} does.`
  }

  const rise = upside && `each 1% rise in ${name} adds ${perPoint(upside.rate)} of principal`
  const beyond = buffer === undefined ? '' : ` beyond the first ${percent(buffer)}`
  const fall = downside && (upside ? `each 1% fall${beyond} takes ${perPoint(downside.rate)} away` : `each 1% fall in ${name}${beyond} takes ${perPoint(downside.rate)} of principal away`)
  const onlyBelow = barrier === undefined ? '' : `, but only if ${name} ends below ${percent(barrier.level)} of its ${from} level`
  // With absolute return a fall within the buffer adds to principal, and a larger fall loses that gain.
  const gain = absoluteReturn && buffer !== undefined && downside
    && `each 1% fall${upside ? '' : ` in ${name}`}, up to ${percent(buffer)}, adds ${perPoint(absoluteReturn.rate)}${upside ? '' : ' of principal'}`
  const moves = [rise, gain || (fall && `${fall}${onlyBelow}`)].filter(Boolean).join(', and ')
  const larger = gain ? ` A larger fall pays no gain, and each 1% beyond the first ${percent(buffer!)} takes ${perPoint(downside!.rate)} of principal away.` : ''
  // With a minimum return a fall pays the minimum, which the limits below state.
  const unchanged = !upside ? ' A rise leaves principal unchanged.' : !downside && minimum === undefined ? ' A fall leaves principal unchanged.' : ''

  const floor = minimum !== undefined ? amount(principal * (1 + minimum)) : principalProtection !== undefined ? amount(principal * principalProtection) : downside ? 'zero' : undefined
  // The cap limits a rise only, so with absolute return the highest payment is the larger of the cap and the most a fall can pay.
  const highest = cap === undefined ? undefined : Math.max(1 + cap, absoluteReturn && buffer !== undefined ? 1 + absoluteReturn.rate * buffer : 0)
  const ceiling = highest !== undefined ? amount(principal * highest) : undefined
  const limits = ceiling && floor ? ` The payment never goes above ${ceiling} or below ${floor}.`
    : ceiling ? ` The payment never goes above ${ceiling}.`
      : floor ? ` The payment never goes below ${floor}.` : ''

  return `${moves[0].toUpperCase()}${moves.slice(1)}.${larger}${unchanged}${limits}`
}
