import { downsideOf, upsideOf, type Note } from '../domain/note'
import type { ConceptId } from './concepts'

export interface SummarySegment {
  text: string
  concept?: ConceptId
}

const percent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%` : '—'
// Weights are stated to two decimal places of a percent, such as 33.34%.
const weightPercent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : '—'
const amount = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'

// Describes a note in plain words. Segments with a concept name the part of the note they describe.
// A note with no participation only repays principal. The buffer, barrier, protection and cap clauses appear only when those features are present.
// Names the assets in a list: "A", "A and B", "A, B and C".
const listed = (items: SummarySegment[][]): SummarySegment[] => items.flatMap((item, index) => [...(index === 0 ? [] : [{ text: index === items.length - 1 ? ' and ' : ', ' }]), ...item])

// A single asset is named. A basket names its assets, with their weights unless the weights are equal.
function underlierPhrase(note: Note): SummarySegment[] {
  const { underlier } = note
  if (underlier.kind === 'single') return [{ text: underlier.components[0].asset.name.trim() || 'the underlier', concept: 'asset' }]
  const { weights } = underlier.combination
  const equal = weights.every(({ weight }) => weight === weights[0].weight)
  const assets = underlier.components.map(({ asset }): SummarySegment[] => {
    const name: SummarySegment = { text: asset.name.trim() || 'an unnamed asset', concept: 'asset' }
    const weight = weights.find((term) => term.asset === asset.name)?.weight
    return equal || weight === undefined ? [name] : [name, { text: ' ' }, { text: `(${weightPercent(weight)})`, concept: 'combination' }]
  })
  return equal
    ? [{ text: 'an ' }, { text: 'equally weighted basket', concept: 'combination' }, { text: ' of ' }, ...listed(assets)]
    : [{ text: 'a ' }, { text: 'weighted basket', concept: 'combination' }, { text: ' of ' }, ...listed(assets)]
}

export function summarize(note: Note): SummarySegment[] {
  const upside = note.payoff.participations.find(({ direction }) => direction === 'upside')
  const downside = note.payoff.participations.find(({ direction }) => direction === 'downside')
  const underlier = underlierPhrase(note)
  const basket = note.underlier.kind === 'basket'
  const protection = note.payoff.principalProtection
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
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
  if (barrier !== undefined) clauses.push({ text: `a barrier at ${percent(barrier.level)} of the ${initial.kind === 'lookback' ? 'lookback level' : basket ? 'initial basket level' : 'initial level'}`, concept: 'barrier' })
  if (protection !== undefined) clauses.push({ text: `${percent(protection)} principal protection`, concept: 'protection' })
  if (cap !== undefined) clauses.push({ text: `a maximum return of ${percent(cap)}`, concept: 'cap' })
  const features: SummarySegment[] = clauses.flatMap((clause, index) => [{ text: index === 0 ? ', with ' : index === clauses.length - 1 ? ' and ' : ', ' }, clause])

  return [
    { text: 'A ' },
    { text: 'note', concept: 'wrapper' },
    { text: ' that redeems ' },
    { text: 'at maturity', concept: 'redemption' },
    ...payoff,
    { text: ', measured ' },
    ...measured,
    ...features,
    { text: '.' },
  ]
}
