import { downsideOf, upsideOf, type Note } from '../domain/note'
import type { ConceptId } from './concepts'

export interface MarketingName {
  name: string
  // Where the label comes from: plain-language regulator wording, or the Swiss Structured Products Association's product types.
  vocabulary: 'US descriptive' | 'SSPA'
  reason: string
  // The parts of the note that make the name fit.
  concepts: ConceptId[]
}

const isRate = (rate: number | undefined): rate is number => rate !== undefined && Number.isFinite(rate) && rate > 0
const percentText = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`

// Names a structure like this one is commonly sold under. They are hints, not definitions, and several can apply at once.
// The rules are recorded in docs/marketing-names.md. A note that fits none returns an empty list.
export function marketingNames(note: Note): MarketingName[] {
  const protection = note.payoff.principalProtection
  const upside = upsideOf(note)?.rate
  const downside = downsideOf(note)?.rate
  const cap = upsideOf(note)?.cap
  const buffer = downsideOf(note)?.buffer
  const barrier = downsideOf(note)?.barrier
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

  // Losses start only past the buffer, at the downside participation rate.
  if (buffer !== undefined && Number.isFinite(buffer) && buffer > 0 && buffer <= 1 && isRate(downside)) {
    names.push({
      name: 'Buffered note',
      vocabulary: 'US descriptive',
      reason: `The first ${percentText(buffer)} of a fall is absorbed. A larger fall reduces principal by the amount it goes past the buffer, at the downside participation rate.`,
      concepts: ['buffer', 'downside'],
    })
  }

  // Without protection, a buffer, a barrier or a cap. A value that is present but invalid is not absent, so a draft with one gets no name here.
  const unprotected = protection === undefined || protection === 0
  if (unprotected && buffer === undefined && barrier === undefined && cap === undefined && isRate(upside) && (downside === undefined || isRate(downside))) {
    if (downside === 1 && upside === 1) {
      names.push({ name: 'Tracker', vocabulary: 'SSPA', reason: 'The payment follows the underlier one for one, up and down.', concepts: ['upside', 'downside'] })
    } else if (downside === 1 && upside > 1) {
      names.push({ name: 'Outperformance', vocabulary: 'SSPA', reason: 'The payment gains more than one for one when the underlier rises and follows it one for one when it falls.', concepts: ['upside', 'downside'] })
    } else {
      names.push({
        name: 'Participation note',
        vocabulary: 'SSPA',
        reason: downside === undefined
          ? 'The payment shares in a rise of the underlier at the upside participation rate. A fall does not reduce principal.'
          : 'The payment follows the underlier up and down, at a participation rate for each direction.',
        concepts: downside === undefined ? ['upside'] : ['upside', 'downside'],
      })
    }
  }

  if (hasCap && upside !== undefined) {
    names.push({ name: 'Capped participation', vocabulary: 'US descriptive', reason: 'Upside participation stops at a maximum return, so the payment cannot rise past the cap.', concepts: ['upside', 'cap'] })
  }

  return names
}
