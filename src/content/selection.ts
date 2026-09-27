import type { ConceptId } from './concepts'

// Selecting the payoff selects all of its features together.
const payoffFeatureConcepts: readonly ConceptId[] = ['protection', 'upside', 'downside', 'cap']

export const isHighlighted = (selected: ConceptId | null, concept: ConceptId): boolean =>
  selected !== null && (selected === concept || (selected === 'payoff' && payoffFeatureConcepts.includes(concept)))
