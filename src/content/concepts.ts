// The parts of a note the page talks about. Selecting one highlights its outline row, sentence phrase, JSON lines and chart elements.
export const conceptIds = ['wrapper', 'redemption', 'underlier', 'asset', 'determination', 'initial-level', 'final-level', 'payoff', 'protection', 'buffer', 'upside', 'downside', 'cap'] as const
export type ConceptId = (typeof conceptIds)[number]
