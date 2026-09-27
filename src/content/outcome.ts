import type { PaymentBreakdown, ProtectedParticipationNote } from '../domain/note'

const percent = (fraction: number) => `${(Math.abs(fraction) * 100).toFixed(1).replace(/\.0$/, '')}%`
const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Explains a contractual maturity payment in words, from the note and its payment breakdown.
export function explainOutcome(note: ProtectedParticipationNote, breakdown: PaymentBreakdown): string {
  const { underlierReturn, direction, bufferAbsorbs, participationRate, participatedReturn, capAmount, capApplies, unflooredPayment, floor, floorApplies, payment } = breakdown
  const hasProtection = note.payoff.principalProtection !== undefined
  const hasCap = capAmount !== undefined
  const principal = note.principalAmount

  const movement = underlierReturn > 0 ? `The underlier rose ${percent(underlierReturn)}.`
    : underlierReturn < 0 ? `The underlier fell ${percent(underlierReturn)}.`
      : 'The underlier ended unchanged.'

  let participation: string
  if (underlierReturn === 0) participation = 'A flat return leaves principal unchanged.'
  else if (participationRate === undefined) participation = `No ${direction} participation is selected, so principal is unchanged.`
  else if (bufferAbsorbs && participatedReturn === 0) participation = `The ${percent(note.payoff.buffer ?? 0)} buffer absorbs the whole fall, so principal is unchanged.`
  else if (bufferAbsorbs) participation = `The buffer absorbs the first ${percent(bufferAbsorbs)} of the fall, and downside participation of ${percent(participationRate)} deducts ${percent(participatedReturn)} from principal.`
  else {
    const label = direction === 'upside' ? 'Upside' : 'Downside'
    const change = direction === 'upside' ? `adds ${percent(participatedReturn)} to` : `deducts ${percent(participatedReturn)} from`
    participation = `${label} participation of ${percent(participationRate)} ${change} principal.`
  }

  const reasons: string[] = []
  if (hasCap && hasProtection && !capApplies && !floorApplies) reasons.push(`neither the ${units(capAmount)} cap nor the ${units(floor)} floor applies`)
  else {
    if (hasCap) reasons.push(`the ${units(capAmount)} cap ${capApplies ? 'applies' : 'does not apply'}`)
    if (hasProtection) reasons.push(`the ${units(floor)} floor ${floorApplies ? 'applies' : 'does not apply'}`)
    else if (unflooredPayment < 0) reasons.push('the payment cannot fall below zero')
    else if (participatedReturn < 0) reasons.push('there is no principal protection')
  }
  const reason = reasons.join(' and ')

  const difference = Math.round((payment - principal) * 100) / 100
  const comparison = difference > 0 ? `${units(difference)} more than principal`
    : difference < 0 ? `${units(difference)} less than principal`
      : 'the same as principal'
  const result = `${reason ? `${reason[0].toUpperCase()}${reason.slice(1)}, so the` : 'The'} contractual payment is ${units(payment)}, ${comparison}.`

  return [movement, participation, result].join(' ')
}
