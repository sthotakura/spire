import type { ConceptId } from './concepts'

// Selecting a part selects the parts nested under it: the payoff its features, the underlier its asset and determination.
const nestedConcepts: Partial<Record<ConceptId, readonly ConceptId[]>> = {
  payoff: ['protection', 'buffer', 'upside', 'downside', 'cap'],
  underlier: ['asset', 'determination'],
}

export const isHighlighted = (selected: ConceptId | null, concept: ConceptId): boolean =>
  selected !== null && (selected === concept || (nestedConcepts[selected]?.includes(concept) ?? false))
