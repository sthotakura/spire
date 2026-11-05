import type { ConceptId } from './concepts'

// Selecting a part selects the parts nested under it, at any depth: the redemption its reviews, trigger, call amount and final review,
// the trigger its step, the coupon its reviews, barrier and memory, the payoff its features, each participation its buffer,
// barrier, absolute return, cap or what a rise is measured from, the digital return its barrier, the underlier its assets and determination, and the determination its initial and final levels and a basket's return.
const nestedConcepts: Partial<Record<ConceptId, readonly ConceptId[]>> = {
  redemption: ['schedule', 'first-review', 'trigger', 'call-amount', 'final-call'],
  trigger: ['trigger-step'],
  coupon: ['coupon-schedule', 'coupon-barrier', 'memory'],
  payoff: ['protection', 'minimum-return', 'digital-return', 'upside', 'downside'],
  'digital-return': ['digital-barrier'],
  downside: ['buffer', 'barrier', 'absolute-return'],
  upside: ['measured-from', 'barrier', 'cap'],
  underlier: ['asset', 'determination'],
  determination: ['initial-level', 'final-level', 'basket-return'],
}

export const isHighlighted = (selected: ConceptId | null, concept: ConceptId): boolean =>
  selected !== null && (selected === concept || (nestedConcepts[selected]?.some((child) => isHighlighted(child, concept)) ?? false))
