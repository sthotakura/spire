// The parts of a note the page talks about. Selecting one highlights its outline row, sentence phrase, JSON lines and chart elements.
export const conceptIds = ['wrapper', 'redemption', 'underlier', 'determination', 'payoff', 'protection', 'upside', 'downside'] as const
export type ConceptId = (typeof conceptIds)[number]
