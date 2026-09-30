export type AssetKind = 'equity' | 'equity-index'
export type ParticipationDirection = 'downside' | 'upside'

// Each direction carries the features that only make sense with it: a buffer changes the fall downside participation
// applies to, a barrier decides whether downside participation applies at all, and a cap limits the return upside
// participation can add. Their keys are listed in the order the payment applies them.
export interface DownsideParticipation {
  direction: 'downside'
  // The fall the holder does not bear, as a fraction of the initial level. Downside participation applies only to the fall beyond it.
  buffer?: number
  barrier?: Barrier
  rate: number
}

// A level, as a fraction of the initial level. Downside participation applies, to the whole fall, only when the final
// level is below it. It is observed on the final observation date only: it reads the final level the determination produces.
export interface Barrier {
  level: number
  observation: 'final'
}

export interface UpsideParticipation {
  direction: 'upside'
  rate: number
  // The most the note can pay above principal, as a fraction of principal. Absent means the payment has no ceiling.
  cap?: number
}

export type Participation = DownsideParticipation | UpsideParticipation

// What is tracked. Its identity only: where its change is measured from belongs to the determination.
export interface Asset {
  kind: AssetKind
  name: string
}

export interface UnderlierComponent {
  asset: Asset
}

// How the initial level is measured. Given states the level as a term of the note. Lookback states only how many dates
// after pricing are observed: the level on the pricing date is observed like the others, and the lowest of them is the
// initial level, so a fall soon after pricing lowers the starting point.
export type InitialDetermination = { kind: 'given'; level: number } | { kind: 'lookback'; observationCount: number }

// How the final level is measured. Final-date takes the level on the one final date. Averaging takes the arithmetic
// average of the levels on several dates before maturity (averaging out).
export type FinalDetermination = { kind: 'final-date' } | { kind: 'averaging'; observationCount: number }

// How the underlier's change is measured, one end at a time. Given at the start and final-date at the end is point-to-point.
export interface Determination {
  initial: InitialDetermination
  final: FinalDetermination
}

// The two levels the return is measured between, each as its end of the determination produces it.
export interface DeterminedLevels {
  initial: number
  final: number
}

// The underlier produces the one return the payoff reads: which assets, where each starts, and how its change is measured.
// A single underlier has exactly one component. A basket holds several, and a rule that combines them, which only a basket can have.
export interface SingleUnderlier {
  kind: 'single'
  components: [UnderlierComponent]
  determination: Determination
}

// A term that belongs to one component of a basket. It refers to the component by asset name, not by position, so
// removing a component cannot move a term onto another asset.
export interface ComponentLevel {
  asset: string
  level: number
}

export interface ComponentWeight {
  asset: string
  weight: number
}

// Each component of a basket is measured from its own fixed initial level, and every component's final level is measured
// the same way. Lookback is not modelled on a basket: the lowest basket level and each component's lowest level differ,
// and no public note settling which applies was verified (docs/basket.md).
export interface BasketDetermination {
  initial: { kind: 'given'; levels: ComponentLevel[] }
  final: FinalDetermination
}

// The basket return is the weighted sum of the component returns. Weights are fixed on the pricing date and add up to 100%.
export interface WeightedCombination {
  kind: 'weighted'
  weights: ComponentWeight[]
}

export interface BasketUnderlier {
  kind: 'basket'
  components: UnderlierComponent[]
  determination: BasketDetermination
  combination: WeightedCombination
}

export type Underlier = SingleUnderlier | BasketUnderlier

export interface Note {
  wrapper: 'note'
  redemption: 'bullet'
  underlier: Underlier
  payoff: {
    // Features are listed in the order the payment applies them: participation with its buffer and cap, then the protection floor.
    participations: Participation[]
    principalProtection?: number
  }
  principalAmount: number
}

// A note on a single asset.
export type SingleNote = Note & { underlier: SingleUnderlier }

export const downsideOf = (note: Note) => note.payoff.participations.find((participation): participation is DownsideParticipation => participation.direction === 'downside')
export const upsideOf = (note: Note) => note.payoff.participations.find((participation): participation is UpsideParticipation => participation.direction === 'upside')

// Puts a buffer or barrier on downside participation and a cap on upside participation. Each is dropped when its direction is absent.
export const withSubFeatures = (participations: Participation[], { buffer, barrier, cap }: { buffer?: number; barrier?: Barrier; cap?: number }): Participation[] =>
  participations.map((participation) => participation.direction === 'downside'
    ? { direction: 'downside', buffer, barrier, rate: participation.rate }
    : { direction: 'upside', rate: participation.rate, cap })

export type NoteIssueField = 'principalAmount' | 'underlierName' | 'basketComponents' | 'initialLevel' | 'weights' | 'lookbackObservationCount' | 'observationCount' | 'buffer' | 'barrier' | 'participations' | 'principalProtection' | 'cap'

// Real notes can average over many more dates, such as monthly over several years, and a lookback period often observes
// every trading day for weeks. This reference keeps the count small enough for each observed level to be set by hand.
export const observationCountRange = { min: 2, max: 12 }
const isObservationCount = (count: number) => Number.isInteger(count) && count >= observationCountRange.min && count <= observationCountRange.max

export interface NoteIssue {
  field: NoteIssueField
  message: string
}

// Equal weights for the components, which a basket returns to when a component is added or removed. Term sheets state
// weights to two decimal places of a percent, so three assets get 33.34%, 33.33% and 33.33%: the first takes the remainder.
export function equalWeights(components: UnderlierComponent[]): ComponentWeight[] {
  const share = Math.floor(10000 / components.length) / 10000
  const first = Math.round((1 - share * (components.length - 1)) * 10000) / 10000
  return components.map(({ asset }, index) => ({ asset: asset.name, weight: index === 0 ? first : share }))
}

// Whether the terms refer to the components one to one: one term per asset, and none for an asset not in the basket.
const matchesComponents = (components: UnderlierComponent[], terms: { asset: string }[]) =>
  terms.length === components.length && components.every(({ asset }) => terms.filter((term) => term.asset === asset.name).length === 1)

// Weights such as three equal thirds do not add up to exactly 1 in floating point.
const weightTolerance = 1e-9

function basketIssues(underlier: BasketUnderlier): NoteIssue[] {
  const issues: NoteIssue[] = []
  const names = underlier.components.map(({ asset }) => asset.name)
  if (names.length < 2) issues.push({ field: 'basketComponents', message: 'A basket needs at least two assets.' })
  if (names.some((name) => !name.trim())) issues.push({ field: 'underlierName', message: 'Enter a name for each asset.' })
  // Terms refer to their component by name, so two assets with one name would share them.
  else if (new Set(names).size !== names.length) issues.push({ field: 'underlierName', message: 'Each asset in a basket needs its own name.' })
  const { levels } = underlier.determination.initial
  if (!matchesComponents(underlier.components, levels)) issues.push({ field: 'initialLevel', message: 'Each asset needs one initial level.' })
  for (const { asset, level } of levels) {
    if (!Number.isFinite(level) || level <= 0) issues.push({ field: 'initialLevel', message: `Initial level of ${asset} must be greater than zero.` })
  }
  const { weights } = underlier.combination
  if (!matchesComponents(underlier.components, weights)) issues.push({ field: 'weights', message: 'Each asset needs one weight.' })
  for (const { asset, weight } of weights) {
    if (!Number.isFinite(weight) || weight <= 0) issues.push({ field: 'weights', message: `Weight of ${asset} must be greater than zero.` })
  }
  if (!(Math.abs(weights.reduce((sum, { weight }) => sum + weight, 0) - 1) <= weightTolerance)) issues.push({ field: 'weights', message: 'Weights must add up to 100%.' })
  return issues
}

export function underlierIssues(underlier: Underlier): NoteIssue[] {
  if (underlier.kind === 'basket') return [...basketIssues(underlier), ...finalIssues(underlier.determination.final)]
  const issues: NoteIssue[] = []
  const [component] = underlier.components
  if (!component.asset.name.trim()) issues.push({ field: 'underlierName', message: 'Enter an underlier name.' })
  const { initial } = underlier.determination
  if (initial.kind === 'given' && (!Number.isFinite(initial.level) || initial.level <= 0)) issues.push({ field: 'initialLevel', message: 'Initial level must be greater than zero.' })
  if (initial.kind === 'lookback' && !isObservationCount(initial.observationCount)) {
    issues.push({ field: 'lookbackObservationCount', message: `Lookback observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` })
  }
  return [...issues, ...finalIssues(underlier.determination.final)]
}

function finalIssues(final: FinalDetermination): NoteIssue[] {
  if (final.kind === 'averaging' && !isObservationCount(final.observationCount)) {
    return [{ field: 'observationCount', message: `Observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` }]
  }
  return []
}

export function noteIssues(note: Note): NoteIssue[] {
  const issues: NoteIssue[] = underlierIssues(note.underlier)
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) issues.push({ field: 'principalAmount', message: 'Principal must be greater than zero.' })
  const buffer = downsideOf(note)?.buffer
  if (buffer !== undefined && (!Number.isFinite(buffer) || buffer <= 0 || buffer > 1)) issues.push({ field: 'buffer', message: 'Buffer must be greater than 0% and at most 100%.' })
  const barrier = downsideOf(note)?.barrier
  // A barrier at 100% would switch downside participation on for any fall, which is downside participation without one.
  if (barrier !== undefined && (!Number.isFinite(barrier.level) || barrier.level <= 0 || barrier.level >= 1)) issues.push({ field: 'barrier', message: 'Barrier must be greater than 0% and less than 100% of the initial level.' })
  // No public note combining the two was verified, so they are not combined.
  if (barrier !== undefined && buffer !== undefined) issues.push({ field: 'barrier', message: 'A barrier and a buffer cannot both apply to downside participation.' })
  for (const participation of note.payoff.participations) {
    if (!Number.isFinite(participation.rate) || participation.rate <= 0) issues.push({ field: 'participations', message: `${participation.direction === 'upside' ? 'Upside' : 'Downside'} participation must be greater than zero.` })
  }
  if (new Set(note.payoff.participations.map(({ direction }) => direction)).size !== note.payoff.participations.length) issues.push({ field: 'participations', message: 'Each participation direction can be selected only once.' })
  const protection = note.payoff.principalProtection
  if (protection !== undefined && (!Number.isFinite(protection) || protection < 0 || protection > 1)) issues.push({ field: 'principalProtection', message: 'Principal protection must be between 0% and 100%.' })
  const cap = upsideOf(note)?.cap
  if (cap !== undefined && (!Number.isFinite(cap) || cap <= 0)) issues.push({ field: 'cap', message: 'Cap must be greater than zero.' })
  return issues
}

export function validateNote(note: Note): string[] {
  return noteIssues(note).map(({ message }) => message)
}

// The number of observed levels the final end of the determination reads.
export const observationCountOf = (determination: FinalDetermination) => determination.kind === 'averaging' ? determination.observationCount : 1

// The number of observed levels the initial end of the determination reads: none when the level is given, and with
// lookback the level on the pricing date and one on each date after it.
export const initialObservationCountOf = (determination: InitialDetermination) => determination.kind === 'lookback' ? determination.observationCount + 1 : 0

// The initial level the payoff reads, from the levels observed from pricing, in date order, the pricing date first.
// Given reads the stated level. Lookback reads the lowest observed level, so it is never above the pricing-date level.
export function initialLevelFrom(determination: InitialDetermination, observedLevels: number[]): number {
  const count = initialObservationCountOf(determination)
  if (observedLevels.length !== count) throw new Error(`Expected ${count} observed levels for the initial level.`)
  // The return is measured from this level, so a level of zero would leave it undefined.
  if (observedLevels.some((level) => !Number.isFinite(level) || level <= 0)) throw new Error('Observed levels for the initial level must be greater than zero.')
  return determination.kind === 'given' ? determination.level : Math.min(...observedLevels)
}

// The final level the payoff reads, from the levels observed on the determination dates, in date order.
// Final-date reads the one level; averaging reads the arithmetic average of all of them.
export function finalLevelFrom(determination: FinalDetermination, observedLevels: number[]): number {
  if (observedLevels.length !== observationCountOf(determination)) throw new Error(`Expected ${observationCountOf(determination)} observed levels.`)
  if (observedLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Observed levels must be zero or greater.')
  return observedLevels.reduce((sum, level) => sum + level, 0) / observedLevels.length
}

// A basket's level starts here, as public notes state it, so the payoff reads a basket as it reads a single asset's levels.
export const basketStartingLevel = 100

export interface ComponentPerformance {
  asset: string
  weight: number
  initialLevel: number
  // The levels the final end of the determination read, in date order, and the final level it produced from them: the
  // level on the final date, or the average.
  observedLevels: number[]
  finalLevel: number
  componentReturn: number
}

export interface BasketBreakdown {
  components: ComponentPerformance[]
  // The weighted sum of the component returns.
  basketReturn: number
  // The basket's starting level and its final level, 100 × (1 + basket return), which the payoff reads.
  levels: DeterminedLevels
}

// Measures each component from its own initial level to its final level, then weights the component returns. Observed
// levels are listed per component, in the order of the components, each in date order. Averaging each component and then
// weighting gives the same final level as averaging the basket level on each date, because the basket level is a weighted sum.
export function basketBreakdown(underlier: BasketUnderlier, observedLevels: number[][]): BasketBreakdown {
  const errors = underlierIssues(underlier)
  if (errors.length) throw new Error(errors.map(({ message }) => message).join(' '))
  if (observedLevels.length !== underlier.components.length) throw new Error(`Expected observed levels for ${underlier.components.length} assets.`)
  const { initial, final } = underlier.determination
  const components = underlier.components.map(({ asset }, index): ComponentPerformance => {
    const initialLevel = initial.levels.find((term) => term.asset === asset.name)!.level
    const weight = underlier.combination.weights.find((term) => term.asset === asset.name)!.weight
    const finalLevel = finalLevelFrom(final, observedLevels[index])
    return { asset: asset.name, weight, initialLevel, observedLevels: observedLevels[index], finalLevel, componentReturn: finalLevel / initialLevel - 1 }
  })
  const basketReturn = components.reduce((sum, { weight, componentReturn }) => sum + weight * componentReturn, 0)
  return { components, basketReturn, levels: { initial: basketStartingLevel, final: basketStartingLevel * (1 + basketReturn) } }
}

export interface PaymentBreakdown {
  // The level the return is measured from, as the initial end of the determination produced it.
  initialLevel: number
  underlierReturn: number
  // The direction the return falls in. A flat return counts as upside.
  direction: ParticipationDirection
  // Undefined when the note has no buffer. Otherwise the part of a fall the buffer absorbs, as a positive fraction: zero on a rise.
  bufferAbsorbs?: number
  // Undefined when the note has no barrier. Otherwise the barrier as an underlier level, and whether the final level is below it.
  barrierLevel?: number
  belowBarrier?: boolean
  // Undefined when that direction has no participation, so principal is unchanged.
  participationRate?: number
  participatedReturn: number
  // Principal plus the participated return, before any cap or floor.
  uncappedPayment: number
  // Undefined when the note has no cap. Otherwise principal plus the maximum return.
  capAmount?: number
  capApplies: boolean
  // The payment after the cap and before the floor.
  unflooredPayment: number
  // Zero when the note has no principal protection: a holder cannot lose more than the principal amount.
  floor: number
  floorApplies: boolean
  payment: number
}

// The levels are the ones the determination produces (see initialLevelFrom and finalLevelFrom), so the payoff does not
// depend on how they were measured.
export function paymentBreakdown(note: Note, levels: DeterminedLevels): PaymentBreakdown {
  const errors = validateNote(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(levels.initial) || levels.initial <= 0) throw new Error('Initial level must be greater than zero.')
  if (!Number.isFinite(levels.final) || levels.final < 0) throw new Error('Final level must be zero or greater.')

  const underlierReturn = levels.final / levels.initial - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participationRate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  const buffer = downsideOf(note)?.buffer
  const bufferAbsorbs = buffer === undefined ? undefined : Math.min(buffer, Math.max(0, -underlierReturn))
  const barrier = downsideOf(note)?.barrier
  const barrierLevel = barrier === undefined ? undefined : barrier.level * levels.initial
  const belowBarrier = barrierLevel === undefined ? undefined : levels.final < barrierLevel
  // At or above the barrier, downside participation does not apply, so a fall leaves principal unchanged.
  const barrierHolds = direction === 'downside' && belowBarrier === false
  const participatedReturn = barrierHolds ? 0 : (participationRate ?? 0) * (underlierReturn + (bufferAbsorbs ?? 0))
  const uncappedPayment = note.principalAmount * (1 + participatedReturn)
  // A cap is above principal and so above any floor, which cannot exceed principal. The order of the two cannot change the result.
  const cap = upsideOf(note)?.cap
  const capAmount = cap === undefined ? undefined : note.principalAmount * (1 + cap)
  const capApplies = capAmount !== undefined && uncappedPayment > capAmount
  const unflooredPayment = capApplies ? capAmount : uncappedPayment
  const floor = note.principalAmount * (note.payoff.principalProtection ?? 0)
  return {
    initialLevel: levels.initial,
    underlierReturn,
    direction,
    bufferAbsorbs,
    barrierLevel,
    belowBarrier,
    participationRate,
    participatedReturn,
    uncappedPayment,
    capAmount,
    capApplies,
    unflooredPayment,
    floor,
    floorApplies: floor > unflooredPayment,
    payment: Math.max(floor, unflooredPayment),
  }
}

export function maturityPayment(note: Note, levels: DeterminedLevels): number {
  return paymentBreakdown(note, levels).payment
}
