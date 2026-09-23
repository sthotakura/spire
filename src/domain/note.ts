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
    principalProtection: number
  }
  principalAmount: number
}

export function validateNote(note: ProtectedParticipationNote): string[] {
  const errors: string[] = []
  if (!note.underlier.name.trim()) errors.push('Enter an underlier name.')
  if (!Number.isFinite(note.principalAmount) || note.principalAmount <= 0) errors.push('Principal must be greater than zero.')
  if (!Number.isFinite(note.determination.initialLevel) || note.determination.initialLevel <= 0) errors.push('Initial level must be greater than zero.')
  if (note.payoff.participations.length === 0) errors.push('Select at least one participation direction.')
  for (const participation of note.payoff.participations) {
    if (!Number.isFinite(participation.rate) || participation.rate <= 0) errors.push(`${participation.direction === 'upside' ? 'Upside' : 'Downside'} participation must be greater than zero.`)
  }
  if (new Set(note.payoff.participations.map(({ direction }) => direction)).size !== note.payoff.participations.length) errors.push('Each participation direction can be selected only once.')
  if (!Number.isFinite(note.payoff.principalProtection) || note.payoff.principalProtection < 0 || note.payoff.principalProtection > 1) errors.push('Principal protection must be between 0% and 100%.')
  return errors
}

export function maturityPayment(note: ProtectedParticipationNote, finalLevel: number): number {
  const errors = validateNote(note)
  if (errors.length) throw new Error(errors.join(' '))
  if (!Number.isFinite(finalLevel) || finalLevel < 0) throw new Error('Final level must be zero or greater.')

  const underlierReturn = finalLevel / note.determination.initialLevel - 1
  const direction: ParticipationDirection = underlierReturn < 0 ? 'downside' : 'upside'
  const participation = note.payoff.participations.find((candidate) => candidate.direction === direction)
  const participatedReturn = (participation?.rate ?? 0) * underlierReturn
  const unflooredPayment = note.principalAmount * (1 + participatedReturn)
  return Math.max(note.principalAmount * note.payoff.principalProtection, unflooredPayment)
}
