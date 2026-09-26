import type { ProtectedParticipationNote } from './note'

// The note the page opens on: a valid note whose payoff has no features, so it only repays principal.
export const startingNote: ProtectedParticipationNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'equity-index', name: 'Synthetic Index' },
  determination: { kind: 'point-to-point', initialLevel: 100 },
  payoff: { kind: 'participation', participations: [] },
  principalAmount: 1000,
}

// A hypothetical final level for exploring the starting note. It is a scenario input, not a note term.
export const startingFinalLevel = 110

// Rates in percent, used the first time each payoff feature is added.
export const firstFeatureValues = { upside: 100, downside: 100, protection: 90 }
