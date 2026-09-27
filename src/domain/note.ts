export type AssetKind = 'equity' | 'equity-index'
export type ParticipationDirection = 'downside' | 'upside'

export interface Participation {
  direction: ParticipationDirection
  rate: number
}

// What is tracked. Its identity only: the level it starts from is a term of the note, so it sits beside the asset.
export interface Asset {
  kind: AssetKind
  name: string
}

export interface UnderlierComponent {
  asset: Asset
  initialLevel: number
}

// The underlier produces the one return the payoff reads: which assets, where each starts, and how its change is measured.
// A single underlier has exactly one component. A basket will hold several, and a rule that combines them, which only a basket can have.
export interface SingleUnderlier {
  kind: 'single'
  components: [UnderlierComponent]
  determination: { kind: 'point-to-point' }
}

export interface ProtectedParticipationNote {
  wrapper: 'note'
  redemption: 'bullet'
  underlier: SingleUnderlier
  payoff: {
    kind: 'participation'
    // Features are listed in the order the payment applies them: the buffer and participation, then the cap, then the protection floor.
    // The fall the holder does not bear, as a fraction of the initial level. Downside participation applies only to the fall beyond it.
    buffer?: number
    participations: Participation[]
    // The most the note can pay above principal, as a fraction of principal. Absent means the payment has no ceiling.
    cap?: number
    principalProtection?: number
  }
  principalAmount: number
}

export type NoteIssueField = 'principalAmount' | 'underlierName' | 'initialLevel' | 'buffer' | 'participations' | 'principalProtection' | 'cap'

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
  const buffer = note.payoff.buffer
  if (buffer !== undefined && (!Number.isFinite(buffer) || buffer <= 0 || buffer > 1)) issues.push({ field: 'buffer', message: 'Buffer must be greater than 0% and at most 100%.' })
  for (const participation of note.payoff.participations) {
    if (!Number.isFinite(participation.rate) || participation.rate <= 0) issues.push({ field: 'participations', message: `${participation.direction === 'upside' ? 'Upside' : 'Downside'} participation must be greater than zero.` })
  }
  if (new Set(note.payoff.participations.map(({ direction }) => direction)).size !== note.payoff.participations.length) issues.push({ field: 'participations', message: 'Each participation direction can be selected only once.' })
  const protection = note.payoff.principalProtection
  if (protection !== undefined && (!Number.isFinite(protection) || protection < 0 || protection > 1)) issues.push({ field: 'principalProtection', message: 'Principal protection must be between 0% and 100%.' })
  const cap = note.payoff.cap
  if (cap !== undefined && (!Number.isFinite(cap) || cap <= 0)) issues.push({ field: 'cap', message: 'Cap must be greater than zero.' })
  return issues
}

export function validateNote(note: ProtectedParticipationNote): string[] {
  return noteIssues(note).map(({ message }) => message)
}

export interface PaymentBreakdown {
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

export function paymentBreakdown(note: ProtectedParticipationNote, finalLevel: number): PaymentBreakdown {
  const errors = validateNote(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(finalLevel) || finalLevel < 0) throw new Error('Final level must be zero or greater.')

  const underlierReturn = finalLevel / note.underlier.components[0].initialLevel - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participationRate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  const bufferAbsorbs = note.payoff.buffer === undefined ? undefined : Math.min(note.payoff.buffer, Math.max(0, -underlierReturn))
  const participatedReturn = (participationRate ?? 0) * (underlierReturn + (bufferAbsorbs ?? 0))
  const uncappedPayment = note.principalAmount * (1 + participatedReturn)
  // A cap is above principal and so above any floor, which cannot exceed principal. The order of the two cannot change the result.
  const capAmount = note.payoff.cap === undefined ? undefined : note.principalAmount * (1 + note.payoff.cap)
  const capApplies = capAmount !== undefined && uncappedPayment > capAmount
  const unflooredPayment = capApplies ? capAmount : uncappedPayment
  const floor = note.principalAmount * (note.payoff.principalProtection ?? 0)
  return {
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

export function maturityPayment(note: ProtectedParticipationNote, finalLevel: number): number {
  return paymentBreakdown(note, finalLevel).payment
}
