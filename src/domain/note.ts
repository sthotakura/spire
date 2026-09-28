export type AssetKind = 'equity' | 'equity-index'
export type ParticipationDirection = 'downside' | 'upside'

// Each direction carries the features that only make sense with it: a buffer changes the fall downside participation
// applies to, and a cap limits the return upside participation can add. Their keys are listed in the order the payment applies them.
export interface DownsideParticipation {
  direction: 'downside'
  // The fall the holder does not bear, as a fraction of the initial level. Downside participation applies only to the fall beyond it.
  buffer?: number
  rate: number
}

export interface UpsideParticipation {
  direction: 'upside'
  rate: number
  // The most the note can pay above principal, as a fraction of principal. Absent means the payment has no ceiling.
  cap?: number
}

export type Participation = DownsideParticipation | UpsideParticipation

// What is tracked. Its identity only: the level it starts from is a term of the note, so it sits beside the asset.
export interface Asset {
  kind: AssetKind
  name: string
}

export interface UnderlierComponent {
  asset: Asset
  initialLevel: number
}

// How the initial level is measured. Given takes the initial-level term of the note as it stands. Lookback takes the
// lowest of that level and the levels on several dates after pricing, so a fall soon after pricing lowers the starting point.
export type InitialDetermination = { kind: 'given' } | { kind: 'lookback'; observationCount: number }

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
// A single underlier has exactly one component. A basket will hold several, and a rule that combines them, which only a basket can have.
export interface SingleUnderlier {
  kind: 'single'
  components: [UnderlierComponent]
  determination: Determination
}

export interface ProtectedParticipationNote {
  wrapper: 'note'
  redemption: 'bullet'
  underlier: SingleUnderlier
  payoff: {
    kind: 'participation'
    // Features are listed in the order the payment applies them: participation with its buffer and cap, then the protection floor.
    participations: Participation[]
    principalProtection?: number
  }
  principalAmount: number
}

export const downsideOf = (note: ProtectedParticipationNote) => note.payoff.participations.find((participation): participation is DownsideParticipation => participation.direction === 'downside')
export const upsideOf = (note: ProtectedParticipationNote) => note.payoff.participations.find((participation): participation is UpsideParticipation => participation.direction === 'upside')

// Puts a buffer on downside participation and a cap on upside participation. Either is dropped when its direction is absent.
export const withBufferAndCap = (participations: Participation[], buffer?: number, cap?: number): Participation[] =>
  participations.map((participation) => participation.direction === 'downside'
    ? { direction: 'downside', buffer, rate: participation.rate }
    : { direction: 'upside', rate: participation.rate, cap })

export type NoteIssueField = 'principalAmount' | 'underlierName' | 'initialLevel' | 'lookbackObservationCount' | 'observationCount' | 'buffer' | 'participations' | 'principalProtection' | 'cap'

// Real notes can average over many more dates, such as monthly over several years, and a lookback period often observes
// every trading day for weeks. This reference keeps the count small enough for each observed level to be set by hand.
export const observationCountRange = { min: 2, max: 12 }
const isObservationCount = (count: number) => Number.isInteger(count) && count >= observationCountRange.min && count <= observationCountRange.max

export interface NoteIssue {
  field: NoteIssueField
  message: string
}

export function noteIssues(note: ProtectedParticipationNote): NoteIssue[] {
  const issues: NoteIssue[] = []
  const [component] = note.underlier.components
  if (!component.asset.name.trim()) issues.push({ field: 'underlierName', message: 'Enter an underlier name.' })
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) issues.push({ field: 'principalAmount', message: 'Principal must be greater than zero.' })
  if (!Number.isFinite(component.initialLevel) || component.initialLevel <= 0) issues.push({ field: 'initialLevel', message: 'Initial level must be greater than zero.' })
  const { initial, final } = note.underlier.determination
  if (initial.kind === 'lookback' && !isObservationCount(initial.observationCount)) {
    issues.push({ field: 'lookbackObservationCount', message: `Lookback observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` })
  }
  if (final.kind === 'averaging' && !isObservationCount(final.observationCount)) {
    issues.push({ field: 'observationCount', message: `Observations must be a whole number from ${observationCountRange.min} to ${observationCountRange.max}.` })
  }
  const buffer = downsideOf(note)?.buffer
  if (buffer !== undefined && (!Number.isFinite(buffer) || buffer <= 0 || buffer > 1)) issues.push({ field: 'buffer', message: 'Buffer must be greater than 0% and at most 100%.' })
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

export function validateNote(note: ProtectedParticipationNote): string[] {
  return noteIssues(note).map(({ message }) => message)
}

// The number of observed levels the final end of the determination reads.
export const observationCountOf = (determination: FinalDetermination) => determination.kind === 'averaging' ? determination.observationCount : 1

// The number of levels observed after pricing that the initial end of the determination reads.
export const lookbackCountOf = (determination: InitialDetermination) => determination.kind === 'lookback' ? determination.observationCount : 0

// The initial level the payoff reads, from the initial-level term and the levels observed after pricing, in date order.
// Given reads the term. Lookback reads the lowest of the term and the observed levels, so it is never above the term.
export function initialLevelFrom(determination: InitialDetermination, initialLevel: number, observedLevels: number[]): number {
  if (observedLevels.length !== lookbackCountOf(determination)) throw new Error(`Expected ${lookbackCountOf(determination)} observed levels after pricing.`)
  // The return is measured from this level, so a level of zero would leave it undefined.
  if (observedLevels.some((level) => !Number.isFinite(level) || level <= 0)) throw new Error('Observed levels after pricing must be greater than zero.')
  return Math.min(initialLevel, ...observedLevels)
}

// The final level the payoff reads, from the levels observed on the determination dates, in date order.
// Final-date reads the one level; averaging reads the arithmetic average of all of them.
export function finalLevelFrom(determination: FinalDetermination, observedLevels: number[]): number {
  if (observedLevels.length !== observationCountOf(determination)) throw new Error(`Expected ${observationCountOf(determination)} observed levels.`)
  if (observedLevels.some((level) => !Number.isFinite(level) || level < 0)) throw new Error('Observed levels must be zero or greater.')
  return observedLevels.reduce((sum, level) => sum + level, 0) / observedLevels.length
}

export interface PaymentBreakdown {
  // The level the return is measured from, as the initial end of the determination produced it.
  initialLevel: number
  underlierReturn: number
  // The direction the return falls in. A flat return counts as upside.
  direction: ParticipationDirection
  // Undefined when the note has no buffer. Otherwise the part of a fall the buffer absorbs, as a positive fraction: zero on a rise.
  bufferAbsorbs?: number
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
export function paymentBreakdown(note: ProtectedParticipationNote, levels: DeterminedLevels): PaymentBreakdown {
  const errors = validateNote(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(levels.initial) || levels.initial <= 0) throw new Error('Initial level must be greater than zero.')
  if (!Number.isFinite(levels.final) || levels.final < 0) throw new Error('Final level must be zero or greater.')

  const underlierReturn = levels.final / levels.initial - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participationRate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  const buffer = downsideOf(note)?.buffer
  const bufferAbsorbs = buffer === undefined ? undefined : Math.min(buffer, Math.max(0, -underlierReturn))
  const participatedReturn = (participationRate ?? 0) * (underlierReturn + (bufferAbsorbs ?? 0))
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

export function maturityPayment(note: ProtectedParticipationNote, levels: DeterminedLevels): number {
  return paymentBreakdown(note, levels).payment
}
