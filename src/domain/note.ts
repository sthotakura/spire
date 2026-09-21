export type UnderlierKind = 'equity' | 'equity-index'

export interface SingleUnderlier {
  kind: UnderlierKind
  name: string
}

export interface ProtectedParticipationNote {
  wrapper: 'bullet'
  underlier: SingleUnderlier
  determination: { kind: 'point-to-point'; initialLevel: number }
  payoff: { kind: 'upside-participation'; participationRate: number; principalProtection: 1 }
  principalAmount: number
}

export function validateNote(note: ProtectedParticipationNote): string[] {
  const errors: string[] = []
  if (!note.underlier.name.trim()) errors.push('Enter an underlier name.')
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) errors.push('Principal must be greater than zero.')
  if (!Number.isFinite(note.determination.initialLevel) || note.determination.initialLevel <= 0) errors.push('Initial level must be greater than zero.')
  if (!Number.isFinite(note.payoff.participationRate) || note.payoff.participationRate <= 0) errors.push('Participation must be greater than zero.')
  return errors
}

export function maturityPayment(note: ProtectedParticipationNote, finalLevel: number): number {
  const errors = validateNote(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(finalLevel) || finalLevel < 0) throw new Error('Final level must be zero or greater.')

  const underlierReturn = finalLevel / note.determination.initialLevel - 1
  return note.principalAmount * (1 + note.payoff.participationRate * Math.max(underlierReturn, 0))
}
