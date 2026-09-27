import type { ProtectedParticipationNote } from '../domain/note'
import type { ConceptId } from './concepts'

export interface SummarySegment {
  text: string
  concept?: ConceptId
}

const percent = (fraction: number) => Number.isFinite(fraction) ? `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%` : '—'
const amount = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'

// Describes a note in plain words. Segments with a concept name the part of the note they describe.
// A note with no participation only repays principal. The buffer, protection and cap clauses appear only when those features are present.
export function summarize(note: ProtectedParticipationNote): SummarySegment[] {
  const upside = note.payoff.participations.find(({ direction }) => direction === 'upside')
  const downside = note.payoff.participations.find(({ direction }) => direction === 'downside')
  const underlier: SummarySegment = { text: note.underlier.components[0].asset.name.trim() || 'the underlier', concept: 'asset' }
  const protection = note.payoff.principalProtection
  const cap = note.payoff.cap
  const buffer = note.payoff.buffer

  const payoff: SummarySegment[] = []
  if (upside || downside) {
    payoff.push({ text: ' and pays ' })
    if (upside) payoff.push({ text: `${percent(upside.rate)} of the upside`, concept: 'upside' })
    if (upside && downside) payoff.push({ text: ' and ' })
    if (downside) payoff.push({ text: `${percent(downside.rate)} of the downside`, concept: 'downside' })
    payoff.push({ text: ' of ' }, underlier)
  } else {
    payoff.push({ text: ' and ' }, { text: 'repays its principal', concept: 'payoff' }, { text: ', linked to ' }, underlier)
  }

  const clauses: SummarySegment[] = []
  if (buffer !== undefined) clauses.push({ text: `a ${percent(buffer)} buffer`, concept: 'buffer' })
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
    { text: `point-to-point from ${amount(note.underlier.components[0].initialLevel)}`, concept: 'determination' },
    ...features,
    { text: '.' },
  ]
}
