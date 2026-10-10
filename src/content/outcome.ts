import { downsideOf, upsideOf, type PaymentBreakdown, type Product } from '../domain/note'

const percent = (fraction: number) => `${(Math.abs(fraction) * 100).toFixed(1).replace(/\.0$/, '')}%`
const units = (value: number) => Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Barrier absolute return: which barrier was reached, by which level, and what that does; or that none was and the absolute return pays.
function barrierAbsoluteSentence(note: Product, breakdown: PaymentBreakdown): string {
  const bothWays = note.payoff.barrierAbsoluteReturn!
  const ba = breakdown.barrierAbsolute!
  if (!ba.reached) {
    if (breakdown.underlierReturn === 0) return 'No barrier was reached and the return is flat, so absolute return adds nothing to principal.'
    return `No barrier was reached, so absolute return of ${percent(bothWays.rate)} of the ${percent(breakdown.underlierReturn)} ${breakdown.underlierReturn > 0 ? 'rise' : 'fall'} adds ${percent(breakdown.participatedReturn)} to principal.`
  }
  const reasons: string[] = []
  if (ba.lowerReached) reasons.push(bothWays.lowerBarrier.observation === 'daily-close' ? `the lowest close, ${units(breakdown.lowestClose ?? 0)}, was below the ${units(ba.lowerLevel)} lower barrier` : `it ended below the ${units(ba.lowerLevel)} lower barrier`)
  if (ba.upperReached) reasons.push(bothWays.upperBarrier.observation === 'daily-close' ? `the highest close, ${units(breakdown.highestClose ?? 0)}, was above the ${units(ba.upperLevel)} upper barrier` : `it ended above the ${units(ba.upperLevel)} upper barrier`)
  const joined = reasons.join(' and ')
  const paid = ba.conditionalReturn > 0 ? `a fixed ${percent(ba.conditionalReturn)} is added to principal` : 'principal is unchanged'
  return `${joined[0].toUpperCase()}${joined.slice(1)}, so the absolute return ends and ${paid}, whatever the final level.`
}

// Explains a contractual maturity payment in words, from the note and its payment breakdown.
export function explainOutcome(note: Product, breakdown: PaymentBreakdown): string {
  const { initialLevel, underlierReturn, direction, bufferAbsorbs, barrierLevel, barrierReached, upsideBarrierLevel, upsideBarrierReached, absoluteReturnApplies, participationRate, participatedReturn, capAmount, capApplies, unflooredPayment, floor, floorApplies, payment } = breakdown
  const hasProtection = note.payoff.principalProtection !== undefined
  const hasMinimum = note.payoff.minimumReturn !== undefined
  // A deposit's floor is its minimum return; a note's is its protection.
  const floorName = hasMinimum ? 'minimum' : 'floor'
  const hasCap = capAmount !== undefined
  const principal = note.principalAmount

  const { initial, final } = note.underlier.determination
  const how = [
    final.kind === 'averaging' ? `averaged over ${final.observationCount} observations` : '',
    initial.kind === 'lookback' ? `measured from its lookback level of ${units(initialLevel)}` : '',
  ].filter(Boolean).join(' and ')
  const subject = note.underlier.kind === 'basket' ? 'the basket' : 'the underlier'
  const measured = how ? `${how[0].toUpperCase()}${how.slice(1)}, ${subject}` : `${subject[0].toUpperCase()}${subject.slice(1)}`
  const movement = underlierReturn > 0 ? `${measured} rose ${percent(underlierReturn)}.`
    : underlierReturn < 0 ? `${measured} fell ${percent(underlierReturn)}.`
      : `${measured} ended unchanged.`

  const { lowestClose, highestClose } = breakdown
  const upsideRebate = upsideOf(note)?.barrier?.rebate

  let participation: string
  // Barrier absolute return reads two barriers and says which was reached, so it comes first.
  if (breakdown.barrierAbsolute !== undefined) participation = barrierAbsoluteSentence(note, breakdown)
  // Reached on an earlier close, the upside barrier ends participation and pays the rebate whatever the final level, so it comes first.
  else if (highestClose !== undefined && upsideBarrierReached) {
    participation = `The highest close, ${units(highestClose)}, was above the ${units(upsideBarrierLevel ?? 0)} upside barrier, so upside participation ends and ${upsideRebate === undefined ? 'principal is unchanged' : `a rebate of ${percent(upsideRebate)} is added to principal`}, whatever the final level.`
  }
  else if (underlierReturn === 0) participation = 'A flat return leaves principal unchanged.'
  else if (participationRate === undefined && direction === 'downside' && note.wrapper === 'deposit') participation = 'A deposit repays principal in full, so a fall does not reduce it.'
  else if (participationRate === undefined) participation = `No ${direction} participation is selected, so principal is unchanged.`
  else if (absoluteReturnApplies) {
    const within = barrierLevel !== undefined ? `It ended at or above the ${units(barrierLevel)} downside barrier` : `The fall is within the ${percent(downsideOf(note)?.buffer ?? 0)} buffer`
    participation = `${within}, so absolute return of ${percent(downsideOf(note)?.absoluteReturn?.rate ?? 0)} adds ${percent(participatedReturn)} to principal.`
  }
  else if (direction === 'downside' && lowestClose !== undefined) {
    participation = barrierReached
      ? `The lowest close, ${units(lowestClose)}, was below the ${units(barrierLevel ?? 0)} downside barrier, so downside participation of ${percent(participationRate)} deducts the whole ${percent(participatedReturn)} from principal.`
      : `No close was below the ${units(barrierLevel ?? 0)} downside barrier (the lowest was ${units(lowestClose)}), so downside participation does not apply and principal is unchanged.`
  }
  else if (direction === 'downside' && barrierReached === false) participation = `It ended at or above the ${units(barrierLevel ?? 0)} downside barrier, so downside participation does not apply and principal is unchanged.`
  else if (direction === 'downside' && barrierReached) participation = `It ended below the ${units(barrierLevel ?? 0)} downside barrier, so ${absoluteReturnApplies === false ? 'it pays no absolute return, and ' : ''}downside participation of ${percent(participationRate)} deducts the whole ${percent(participatedReturn)} from principal.`
  else if (direction === 'upside' && upsideBarrierReached) {
    const rebate = upsideOf(note)?.barrier?.rebate
    participation = `It ended above the ${units(upsideBarrierLevel ?? 0)} upside barrier, so upside participation ends and ${rebate === undefined ? 'principal is unchanged' : `a rebate of ${percent(rebate)} is added to principal`}.`
  }
  else if (direction === 'upside' && upsideBarrierReached === false && highestClose !== undefined) participation = `No close was above the ${units(upsideBarrierLevel ?? 0)} upside barrier (the highest was ${units(highestClose)}), so upside participation of ${percent(participationRate)} adds ${percent(participatedReturn)} to principal.`
  else if (direction === 'upside' && upsideBarrierReached === false) participation = `It ended at or below the ${units(upsideBarrierLevel ?? 0)} upside barrier, so upside participation of ${percent(participationRate)} adds ${percent(participatedReturn)} to principal.`
  else if (bufferAbsorbs && participatedReturn === 0) participation = `The ${percent(downsideOf(note)?.buffer ?? 0)} buffer absorbs the whole fall, so principal is unchanged.`
  else if (bufferAbsorbs) participation = `${absoluteReturnApplies === false ? 'The fall is beyond the buffer, so it pays no absolute return. ' : ''}The buffer absorbs the first ${percent(bufferAbsorbs)} of the fall, and downside participation of ${percent(participationRate)} deducts ${percent(participatedReturn)} from principal.`
  else {
    const label = direction === 'upside' ? 'Upside' : 'Downside'
    const change = direction === 'upside' ? `adds ${percent(participatedReturn)} to` : `deducts ${percent(participatedReturn)} from`
    participation = `${label} participation of ${percent(participationRate)} ${change} principal.`
  }

  const reasons: string[] = []
  const hasFloor = hasProtection || hasMinimum
  if (hasCap && hasFloor && !capApplies && !floorApplies) reasons.push(`neither the ${units(capAmount)} cap nor the ${units(floor)} ${floorName} applies`)
  else {
    if (hasCap) reasons.push(`the ${units(capAmount)} cap ${capApplies ? 'applies' : 'does not apply'}`)
    if (hasFloor) reasons.push(`the ${units(floor)} ${floorName} ${floorApplies ? 'applies' : 'does not apply'}`)
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
