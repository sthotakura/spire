import type { ConceptId } from './concepts'

// Selecting a part selects the parts nested under it, at any depth: the payoff its features, each participation its buffer
// or cap, the underlier its asset and determination, and the determination its initial and final levels.
const nestedConcepts: Partial<Record<ConceptId, readonly ConceptId[]>> = {
  payoff: ['protection', 'upside', 'downside'],
  downside: ['buffer'],
  upside: ['cap'],
  underlier: ['asset', 'determination'],
  determination: ['initial-level', 'final-level'],
}

export const isHighlighted = (selected: ConceptId | null, concept: ConceptId): boolean =>
  selected !== null && (selected === concept || (nestedConcepts[selected]?.some((child) => isHighlighted(child, concept)) ?? false))
