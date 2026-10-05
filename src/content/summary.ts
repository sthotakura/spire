import { downsideOf, upsideOf, type Product } from '../domain/note'
import type { ConceptId } from './concepts'

export interface SummarySegment {
  text: string
  concept?: ConceptId
}

const percent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%` : '—'
// Weights and minimum returns are stated to two decimal places of a percent, such as 33.34% or 5.25%.
const weightPercent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : '—'
const amount = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'

// Describes a note in plain words. Segments with a concept name the part of the note they describe.
// A product with no participation only repays principal. The buffer, barrier, absolute return, protection, cap and minimum return clauses appear only when those features are present.
// Names the assets in a list: "A", "A and B", "A, B and C".
const listed = (items: SummarySegment[][]): SummarySegment[] => items.flatMap((item, index) => [...(index === 0 ? [] : [{ text: index === items.length - 1 ? ' and ' : ', ' }]), ...item])

// A single asset is named. A basket names its assets, with their weights unless the weights are equal.
function underlierPhrase(note: Product): SummarySegment[] {
  const { underlier } = note
  if (underlier.kind === 'single') return [{ text: underlier.components[0].asset.name.trim() || 'the underlier', concept: 'asset' }]
  const { components } = underlier
  const equal = components.every(({ weight }) => weight === components[0].weight)
  // Each weight belongs to its asset, so it is part of the asset's phrase.
  const assets = components.map(({ asset, weight }): SummarySegment[] =>
    [{ text: asset.name.trim() || 'an unnamed asset', concept: 'asset' }, ...(equal ? [] : [{ text: ' ' }, { text: `(${weightPercent(weight)})`, concept: 'asset' as const }])])
  return equal
    ? [{ text: 'an ' }, { text: 'equally weighted basket', concept: 'basket-return' }, { text: ' of ' }, ...listed(assets)]
    : [{ text: 'a ' }, { text: 'weighted basket', concept: 'basket-return' }, { text: ' of ' }, ...listed(assets)]
}

// The term as an adjective, in years when it is a whole number of them: "3-year", "18-month". The article before it
// follows the sound of the number: "an 8-year", "an 11-month", "an 18-month", "an 80-month".
function termPhrase(months: number): { article: string; text: string } {
  if (!Number.isFinite(months) || months <= 0) return { article: 'A ', text: '—-month' }
  const number = months % 12 === 0 ? months / 12 : months
  const text = `${number}-${months % 12 === 0 ? 'year' : 'month'}`
  return { article: /^(8\d*|11|18)$/.test(String(number)) ? 'An ' : 'A ', text }
}

export function summarize(note: Product): SummarySegment[] {
  const upside = note.payoff.participations.find(({ direction }) => direction === 'upside')
  const downside = note.payoff.participations.find(({ direction }) => direction === 'downside')
  const underlier = underlierPhrase(note)
  const basket = note.underlier.kind === 'basket'
  const protection = note.payoff.principalProtection
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
  const upsideBarrier = upsideOf(note)?.barrier
  const absoluteReturn = downsideOf(note)?.absoluteReturn
  const { initial, final } = note.underlier.determination
  const count = (value: number) => Number.isFinite(value) ? value : '—'
  // Each level of the determination adds its own phrase. A fixed initial level and a final level on the final date is point-to-point.
  const measured: SummarySegment[] = []
  if (initial.kind === 'given' && final.kind === 'final-date') measured.push({ text: 'point-to-point', concept: 'determination' }, { text: ' ' })
  measured.push({ text: initial.kind === 'lookback' ? `from the lowest level on the pricing date and ${count(initial.observationCount)} dates after it` : 'levels' in initial ? 'from each asset’s initial level' : `from ${amount(initial.level)}`, concept: 'initial-level' })
  if (final.kind === 'averaging') measured.push({ text: ' to ' }, { text: `the average of ${count(final.observationCount)} observed levels`, concept: 'final-level' })

  const payoff: SummarySegment[] = []
  if (upside || downside) {
    payoff.push({ text: ' and pays ' })
    if (upside) payoff.push({ text: `${percent(upside.rate)} of the upside`, concept: 'upside' })
    if (upside && downside) payoff.push({ text: ' and ' })
    if (downside) payoff.push({ text: `${percent(downside.rate)} of the downside`, concept: 'downside' })
    payoff.push({ text: ' of ' }, ...underlier)
  } else {
    payoff.push({ text: ' and ' }, { text: 'repays its principal', concept: 'payoff' }, { text: ', linked to ' }, ...underlier)
  }

  const clauses: SummarySegment[] = []
  if (buffer !== undefined) clauses.push({ text: `a ${percent(buffer)} buffer`, concept: 'buffer' })
  // The barrier is a fraction of the level the return is measured from: the lookback level with lookback, and the basket's
  // starting level for a basket.
  const barrierFrom = initial.kind === 'lookback' ? 'lookback level' : basket ? 'initial basket level' : 'initial level'
  if (barrier !== undefined) clauses.push({ text: `a downside barrier at ${percent(barrier.level)} of the ${barrierFrom}`, concept: 'barrier' })
  // Absolute return follows the buffer or barrier it depends on, which "it" names.
  if (absoluteReturn !== undefined) clauses.push({ text: `${percent(absoluteReturn.rate)} absolute return on a fall ${barrier !== undefined ? 'that ends at or above it' : 'within it'}`, concept: 'absolute-return' })
  if (protection !== undefined) clauses.push({ text: `${percent(protection)} principal protection`, concept: 'protection' })
  // An upside barrier ends upside participation, and a rebate, when there is one, is paid in its place. It is not combined with a cap.
  if (upsideBarrier !== undefined) clauses.push({ text: `an upside barrier at ${percent(upsideBarrier.level)} of the ${barrierFrom} that ends the upside${upsideBarrier.rebate !== undefined ? ` and pays a ${percent(upsideBarrier.rebate)} rebate` : ''}`, concept: 'barrier' })
  // The cap limits a rise only. With absolute return a fall can pay more, so the clause says which return it limits.
  if (cap !== undefined) clauses.push({ text: `a maximum return of ${percent(cap)}${absoluteReturn !== undefined ? ' on a rise' : ''}`, concept: 'cap' })
  const minimum = note.payoff.minimumReturn
  if (minimum !== undefined) clauses.push({ text: `a minimum return of ${weightPercent(minimum)}`, concept: 'minimum-return' })
  const features: SummarySegment[] = clauses.flatMap((clause, index) => [{ text: index === 0 ? ', with ' : index === clauses.length - 1 ? ' and ' : ', ' }, clause])

  const term = termPhrase(note.term.months)
  return [
    { text: term.article },
    // The term is a term of the whole product, shown with the wrapper as the principal is.
    { text: `${term.text} ${note.wrapper}`, concept: 'wrapper' },
    { text: ' that redeems ' },
    { text: 'at maturity', concept: 'redemption' },
    ...payoff,
    { text: ', measured ' },
    ...measured,
    ...features,
    { text: '.' },
  ]
}
