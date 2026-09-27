import { describe, expect, it } from 'vitest'
import type { ProtectedParticipationNote } from '../domain/note'
import { summarize } from './summary'

const note: ProtectedParticipationNote = {
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }], determination: { kind: 'point-to-point' } },
  payoff: {
    kind: 'participation',
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 0.9,
  },
  principalAmount: 1000,
}

const sentence = (n: ProtectedParticipationNote) => summarize(n).map(({ text }) => text).join('')
const conceptOf = (n: ProtectedParticipationNote, phrase: string) => summarize(n).find(({ text }) => text === phrase)?.concept

describe('note summary with a cap', () => {
  it('adds the cap after the protection', () => {
    const capped = { ...note, payoff: { ...note.payoff, cap: 0.2 } }
    expect(sentence(capped)).toBe('A note that redeems at maturity and pays 150% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with 90% principal protection and a maximum return of 20%.')
    expect(conceptOf(capped, 'a maximum return of 20%')).toBe('cap')
  })

  it('starts the clause with the cap when there is no protection', () => {
    const capOnly = { ...note, payoff: { ...note.payoff, principalProtection: undefined, cap: 0.2 } }
    expect(sentence(capOnly)).toContain('point-to-point from 100, with a maximum return of 20%.')
  })
})

describe('note summary with a buffer', () => {
  it('names the buffer first, in the order the payment applies it', () => {
    const buffered = { ...note, payoff: { ...note.payoff, buffer: 0.1 } }
    expect(sentence(buffered)).toContain('point-to-point from 100, with a 10% buffer and 90% principal protection.')
    expect(sentence({ ...buffered, payoff: { ...buffered.payoff, cap: 0.2 } })).toContain('with a 10% buffer, 90% principal protection and a maximum return of 20%.')
    expect(sentence({ ...buffered, payoff: { ...buffered.payoff, principalProtection: undefined } })).toContain('point-to-point from 100, with a 10% buffer.')
    expect(conceptOf(buffered, 'a 10% buffer')).toBe('buffer')
  })
})

describe('note summary with averaging', () => {
  it('says the change is measured to the average of the observed levels', () => {
    const averaged = { ...note, underlier: { ...note.underlier, determination: { kind: 'averaging' as const, observationCount: 5 } } }
    expect(sentence(averaged)).toContain('of Synthetic Index, measured from 100 to the average of 5 observed levels, with 90% principal protection.')
    expect(conceptOf(averaged, 'from 100 to the average of 5 observed levels')).toBe('determination')
  })
})

describe('note summary', () => {
  it('describes upside and downside participation together', () => {
    expect(sentence(note)).toBe('A note that redeems at maturity and pays 150% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with 90% principal protection.')
    expect(conceptOf(note, '150% of the upside')).toBe('upside')
    expect(conceptOf(note, '100% of the downside')).toBe('downside')
  })

  it('describes upside participation only', () => {
    const upsideOnly = { ...note, payoff: { ...note.payoff, participations: [{ direction: 'upside' as const, rate: 1.5 }] } }
    expect(sentence(upsideOnly)).toContain('pays 150% of the upside of Synthetic Index')
    expect(sentence(upsideOnly)).not.toContain('downside')
    expect(conceptOf(upsideOnly, '150% of the upside')).toBe('upside')
  })

  it('describes downside participation only', () => {
    const downsideOnly = { ...note, payoff: { ...note.payoff, participations: [{ direction: 'downside' as const, rate: 0.5 }] } }
    expect(sentence(downsideOnly)).toContain('pays 50% of the downside of Synthetic Index')
    expect(sentence(downsideOnly)).not.toContain('upside')
    expect(conceptOf(downsideOnly, '50% of the downside')).toBe('downside')
  })

  it('names the concept each phrase describes', () => {
    expect(conceptOf(note, 'note')).toBe('wrapper')
    expect(conceptOf(note, 'at maturity')).toBe('redemption')
    expect(conceptOf(note, 'Synthetic Index')).toBe('asset')
    expect(conceptOf(note, 'point-to-point from 100')).toBe('determination')
    expect(conceptOf(note, '90% principal protection')).toBe('protection')
  })

  it('says a note with no features repays its principal', () => {
    const principalOnly = { ...note, payoff: { kind: 'participation' as const, participations: [] } }
    expect(sentence(principalOnly)).toBe('A note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
    expect(conceptOf(principalOnly, 'repays its principal')).toBe('payoff')
  })

  it('leaves out the protection clause when protection is absent', () => {
    const unprotected = { ...note, payoff: { kind: 'participation' as const, participations: [{ direction: 'upside' as const, rate: 1 }] } }
    expect(sentence(unprotected)).toBe('A note that redeems at maturity and pays 100% of the upside of Synthetic Index, measured point-to-point from 100.')
  })

  it('keeps the protection clause when there is protection but no participation', () => {
    const protectionOnly = { ...note, payoff: { kind: 'participation' as const, participations: [], principalProtection: 0.9 } }
    expect(sentence(protectionOnly)).toBe('A note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100, with 90% principal protection.')
  })

  it('keeps describing a draft that is not valid yet', () => {
    const draft: ProtectedParticipationNote = { ...note, underlier: { ...note.underlier, components: [{ asset: { kind: 'equity-index', name: ' ' }, initialLevel: 100 }] }, payoff: { ...note.payoff, participations: [], principalProtection: Number.NaN } }
    expect(sentence(draft)).toBe('A note that redeems at maturity and repays its principal, linked to the underlier, measured point-to-point from 100, with — principal protection.')
  })
})
