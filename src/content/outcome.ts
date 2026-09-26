import type { PaymentBreakdown, ProtectedParticipationNote } from '../domain/note'

const percent = (fraction: number) => `${(Math.abs(fraction) * 100).toFixed(1).replace(/\.0$/, '')}%`
const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Explains a contractual maturity payment in words, from the note and its payment breakdown.
export function explainOutcome(note: ProtectedParticipationNote, breakdown: PaymentBreakdown): string {
  const { underlierReturn, direction, participationRate, participatedReturn, unflooredPayment, floor, floorApplies, payment } = breakdown
  const hasProtection = note.payoff.principalProtection !== undefined
  const principal = note.principalAmount

  const movement = underlierReturn > 0 ? `The underlier rose ${percent(underlierReturn)}.`
    : underlierReturn < 0 ? `The underlier fell ${percent(underlierReturn)}.`
      : 'The underlier ended unchanged.'

  let participation: string
  if (underlierReturn === 0) participation = 'A flat return leaves principal unchanged.'
  else if (participationRate === undefined) participation = `No ${direction} participation is selected, so principal is unchanged.`
  else {
    const label = direction === 'upside' ? 'Upside' : 'Downside'
    const change = direction === 'upside' ? `adds ${percent(participatedReturn)} to` : `deducts ${percent(participatedReturn)} from`
    participation = `${label} participation of ${percent(participationRate)} ${change} principal${hasProtection && unflooredPayment >= 0 ? `, so the payment before protection is ${units(unflooredPayment)}` : ''}.`
  }

  let reason = ''
  if (hasProtection) reason = `The ${units(floor)} floor ${floorApplies ? 'applies' : 'does not apply'}`
  else if (unflooredPayment < 0) reason = 'The payment cannot fall below zero'
  else if (underlierReturn < 0 && participationRate !== undefined) reason = 'There is no principal protection'

  const difference = Math.round((payment - principal) * 100) / 100
  const comparison = difference > 0 ? `${units(difference)} more than principal`
    : difference < 0 ? `${units(difference)} less than principal`
      : 'the same as principal'
  const result = `${reason ? `${reason}, so the` : 'The'} contractual payment is ${units(payment)} units, ${comparison}.`

  return [movement, participation, result].join(' ')
}
