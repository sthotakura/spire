export type UnderlierKind = 'equity' | 'equity-index'
export type ParticipationDirection = 'downside' | 'upside'

export interface Participation {
  direction: ParticipationDirection
  rate: number
}

export interface SingleUnderlier {
  kind: UnderlierKind
  name: string
}

export interface ProtectedParticipationNote {
  wrapper: 'note'
  redemption: 'bullet'
  underlier: SingleUnderlier
  determination: { kind: 'point-to-point'; initialLevel: number }
  payoff: {
    kind: 'participation'
    participations: Participation[]
    principalProtection?: number
    // The most the note can pay above principal, as a fraction of principal. Absent means the payment has no ceiling.
    cap?: number
  }
  principalAmount: number
}

export type NoteIssueField = 'principalAmount' | 'underlierName' | 'initialLevel' | 'participations' | 'principalProtection' | 'cap'

export interface NoteIssue {
  field: NoteIssueField
  message: string
}

export function noteIssues(note: ProtectedParticipationNote): NoteIssue[] {
  const issues: NoteIssue[] = []
  if (!note.underlier.name.trim()) issues.push({ field: 'underlierName', message: 'Enter an underlier name.' })
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) issues.push({ field: 'principalAmount', message: 'Principal must be greater than zero.' })
  if (!Number.isFinite(note.determination.initialLevel) || note.determination.initialLevel <= 0) issues.push({ field: 'initialLevel', message: 'Initial level must be greater than zero.' })
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

  const underlierReturn = finalLevel / note.determination.initialLevel - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participationRate = note.payoff.participations.find((candidate) => candidate.direction === direction)?.rate
  const participatedReturn = (participationRate ?? 0) * underlierReturn
  const uncappedPayment = note.principalAmount * (1 + participatedReturn)
  // A cap is above principal and so above any floor, which cannot exceed principal. The order of the two cannot change the result.
  const capAmount = note.payoff.cap === undefined ? undefined : note.principalAmount * (1 + note.payoff.cap)
  const capApplies = capAmount !== undefined && uncappedPayment > capAmount
  const unflooredPayment = capApplies ? capAmount : uncappedPayment
  const floor = note.principalAmount * (note.payoff.principalProtection ?? 0)
  return {
    underlierReturn,
    direction,
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
