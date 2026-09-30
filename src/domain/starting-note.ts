import type { Note } from './note'

// The initial level the page opens on. With lookback it becomes the level on the pricing date, a scenario input.
export const startingInitialLevel = 100

// The note the page opens on: a valid note whose payoff has no features, so it only repays principal.
export const startingNote: Note = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }],
    determination: { initial: { kind: 'given', level: startingInitialLevel }, final: { kind: 'final-date' } },
  },
  payoff: { participations: [] },
  principalAmount: 1000,
}

// A hypothetical final level for exploring the starting note. It is a scenario input, not a note term.
export const startingFinalLevel = 110

// The number of observations the first time averaging is chosen.
export const firstObservationCount = 5

// The levels after pricing the first time lookback is chosen, as moves from the pricing-date level: a fall soon after pricing,
// then a partial recovery. Their count is the first number of lookback observations.
export const firstLookbackMoves = [-0.03, -0.08, -0.05]

// Rates in percent, used the first time each payoff feature is added.
export const firstFeatureValues = { upside: 100, downside: 100, protection: 90, cap: 20, buffer: 10, barrier: 70 }
