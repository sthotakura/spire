// The parts of a note the page talks about. Selecting one highlights its outline row, sentence phrase, JSON lines and chart elements.
export const conceptIds = ['wrapper', 'redemption', 'schedule', 'non-call', 'trigger', 'trigger-step', 'call-amount', 'final-call', 'coupon', 'coupon-schedule', 'coupon-barrier', 'memory', 'underlier', 'asset', 'determination', 'initial-level', 'final-level', 'basket-return', 'payoff', 'protection', 'minimum-return', 'buffer', 'barrier', 'absolute-return', 'upside', 'downside', 'cap'] as const
export type ConceptId = (typeof conceptIds)[number]
