import type { ProtectedParticipationNote } from '../domain/note'
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
export function paymentFormula(note: ProtectedParticipationNote): FormulaLine[] {
  const { participations, cap, principalProtection } = note.payoff
  const upside = participations.some(({ direction }) => direction === 'upside')
  const downside = participations.some(({ direction }) => direction === 'downside')

  const terms: FormulaSegment[] = []
  if (upside) terms.push({ text: 'Upside × max(Return, 0)', concept: 'upside' })
  if (upside && downside) terms.push({ text: ' + ' })
  if (downside) terms.push({ text: 'Downside × min(Return, 0)', concept: 'downside' })
  const payment: FormulaSegment[] = terms.length ? [{ text: 'Principal × (1 + ' }, ...terms, { text: ')' }] : [{ text: 'Principal' }]

  const lines: FormulaLine[] = [
    { lead: 'Return', segments: [{ text: 'Final level ÷ Initial level − 1', concept: 'determination' }] },
    { lead: 'Payment', segments: payment },
  ]
  if (cap !== undefined) lines.push({ segments: [{ text: 'capped at ' }, { text: 'Principal × (1 + Cap)', concept: 'cap' }] })
  // Without protection the payment still cannot fall below zero. That only matters when a fall reduces principal.
  if (principalProtection !== undefined) lines.push({ segments: [{ text: 'floored at ' }, { text: 'Principal × Protection', concept: 'protection' }] })
  else if (downside) lines.push({ segments: [{ text: 'floored at 0' }] })
  return lines
}
