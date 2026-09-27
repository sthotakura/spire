import type { ProtectedParticipationNote } from '../domain/note'
import type { ConceptId } from './concepts'

export interface MarketingName {
  name: string
  // Where the label comes from: plain-language regulator wording, or the Swiss Structured Products Association's product types.
  vocabulary: 'US descriptive' | 'SSPA'
  reason: string
  // The parts of the note that make the name fit.
  concepts: ConceptId[]
}

// Names a structure like this one is commonly sold under. They are hints, not definitions, and several can apply at once.
// The rules are recorded in docs/marketing-names.md. A note that fits none returns an empty list.
export function marketingNames(note: ProtectedParticipationNote): MarketingName[] {
  const { participations, principalProtection: protection, cap } = note.payoff
  const upside = participations.find(({ direction }) => direction === 'upside')?.rate
  const downside = participations.find(({ direction }) => direction === 'downside')?.rate
  const hasProtection = protection !== undefined && Number.isFinite(protection) && protection > 0
  const hasCap = cap !== undefined && Number.isFinite(cap) && cap > 0
  const names: MarketingName[] = []

  if (hasProtection && protection === 1) {
    names.push({
      name: 'Principal-protected note',
      vocabulary: 'US descriptive',
      reason: `The payment at maturity is at least the full principal, subject to the issuer's ability to pay.${upside ? ' In the Swiss taxonomy this is a Capital Protection Note with Participation.' : ''}`,
      concepts: ['protection'],
    })
  } else if (hasProtection && protection < 1) {
    names.push({
      name: 'Partially principal-protected note',
      vocabulary: 'US descriptive',
      reason: 'Only part of the principal is protected. The Swiss taxonomy uses "partial capital protection" for 90% to 100% of principal; US investor material uses it for any level below 100%.',
      concepts: ['protection'],
    })
  }

  if (!hasProtection && !hasCap && downside === 1 && upside === 1) {
    names.push({ name: 'Tracker', vocabulary: 'SSPA', reason: 'The payment follows the underlier one for one, up and down.', concepts: ['upside', 'downside'] })
  } else if (!hasProtection && !hasCap && downside === 1 && upside !== undefined && upside > 1) {
    names.push({ name: 'Outperformance', vocabulary: 'SSPA', reason: 'The payment gains more than one for one when the underlier rises and follows it one for one when it falls.', concepts: ['upside', 'downside'] })
  }

  if (hasCap && upside !== undefined) {
    names.push({ name: 'Capped participation', vocabulary: 'US descriptive', reason: 'Upside participation stops at a maximum return, so the payment cannot rise past the cap.', concepts: ['upside', 'cap'] })
  }

  return names
}
