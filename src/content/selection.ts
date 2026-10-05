import type { ConceptId } from './concepts'

// Selecting a part selects the parts nested under it, at any depth: the payoff its features, each participation its buffer,
// barrier, absolute return or cap, the underlier its assets and determination, and the determination its initial and final levels and a basket's return.
const nestedConcepts: Partial<Record<ConceptId, readonly ConceptId[]>> = {
  payoff: ['protection', 'minimum-return', 'upside', 'downside'],
  downside: ['buffer', 'barrier', 'absolute-return'],
  upside: ['barrier', 'cap'],
  underlier: ['asset', 'determination'],
  determination: ['initial-level', 'final-level', 'basket-return'],
}

export const isHighlighted = (selected: ConceptId | null, concept: ConceptId): boolean =>
  selected !== null && (selected === concept || (nestedConcepts[selected]?.some((child) => isHighlighted(child, concept)) ?? false))
