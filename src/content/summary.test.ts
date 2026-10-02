import { describe, expect, it } from 'vitest'
import { withSubFeatures, type SingleProduct } from '../domain/note'
import { summarize } from './summary'

const note: SingleProduct = {
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: {
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 0.9,
  },
  principalAmount: 1000,
}

const withTerms = (n: SingleProduct, buffer?: number, cap?: number): SingleProduct => ({ ...n, payoff: { ...n.payoff, participations: withSubFeatures(n.payoff.participations, { buffer, cap }) } })
const sentence = (n: SingleProduct) => summarize(n).map(({ text }) => text).join('')
const conceptOf = (n: SingleProduct, phrase: string) => summarize(n).find(({ text }) => text === phrase)?.concept

describe('note summary with a term', () => {
  it.each([
    [36, 'A 3-year note'],
    [12, 'A 1-year note'],
    [96, 'An 8-year note'],
    [6, 'A 6-month note'],
    [8, 'An 8-month note'],
    [11, 'An 11-month note'],
    [18, 'An 18-month note'],
    [80, 'An 80-month note'],
    [0, 'A —-month note'],
    [Number.NaN, 'A —-month note'],
  ])('states a term of %d months as "%s"', (months, start) => {
    expect(sentence({ ...note, term: { months } })).toMatch(new RegExp(`^${start} that redeems`))
  })

  it('names the term as part of the wrapper, beside the principal', () => {
    expect(summarize(note).filter(({ concept }) => concept === 'wrapper').map(({ text }) => text)).toEqual(['3-year note'])
  })
})

describe('note summary with a cap', () => {
  it('adds the cap after the protection', () => {
    const capped = withTerms(note, undefined, 0.2)
    expect(sentence(capped)).toBe('A 3-year note that redeems at maturity and pays 150% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with 90% principal protection and a maximum return of 20%.')
    expect(conceptOf(capped, 'a maximum return of 20%')).toBe('cap')
  })

  it('starts the clause with the cap when there is no protection', () => {
    const capOnly = withTerms({ ...note, payoff: { ...note.payoff, principalProtection: undefined } }, undefined, 0.2)
    expect(sentence(capOnly)).toContain('point-to-point from 100, with a maximum return of 20%.')
  })
})

describe('note summary with a buffer', () => {
  it('names the buffer first, in the order the payment applies it', () => {
    const buffered = withTerms(note, 0.1)
    expect(sentence(buffered)).toContain('point-to-point from 100, with a 10% buffer and 90% principal protection.')
    expect(sentence(withTerms(note, 0.1, 0.2))).toContain('with a 10% buffer, 90% principal protection and a maximum return of 20%.')
    expect(sentence({ ...buffered, payoff: { ...buffered.payoff, principalProtection: undefined } })).toContain('point-to-point from 100, with a 10% buffer.')
    expect(conceptOf(buffered, 'a 10% buffer')).toBe('buffer')
  })
})

describe('note summary with averaging', () => {
  it('says the change is measured to the average of the observed levels', () => {
    const averaged = { ...note, underlier: { ...note.underlier, determination: { initial: { kind: 'given' as const, level: 100 }, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(sentence(averaged)).toContain('of Synthetic Index, measured from 100 to the average of 5 observed levels, with 90% principal protection.')
    expect(conceptOf(averaged, 'from 100')).toBe('initial-level')
    expect(conceptOf(averaged, 'the average of 5 observed levels')).toBe('final-level')
  })
})

describe('note summary with lookback', () => {
  const lookback = { ...note, underlier: { ...note.underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }

  it('says the change is measured from the lowest level on the pricing date and the dates after it', () => {
    expect(sentence(lookback)).toContain('of Synthetic Index, measured from the lowest level on the pricing date and 3 dates after it, with 90% principal protection.')
    expect(conceptOf(lookback, 'from the lowest level on the pricing date and 3 dates after it')).toBe('initial-level')
  })

  it('names both ends when the note also averages', () => {
    const both = { ...lookback, underlier: { ...lookback.underlier, determination: { ...lookback.underlier.determination, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(sentence(both)).toContain('measured from the lowest level on the pricing date and 3 dates after it to the average of 5 observed levels,')
  })
})

describe('note summary', () => {
  it('describes upside and downside participation together', () => {
    expect(sentence(note)).toBe('A 3-year note that redeems at maturity and pays 150% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with 90% principal protection.')
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
    expect(conceptOf(note, '3-year note')).toBe('wrapper')
    expect(conceptOf(note, 'at maturity')).toBe('redemption')
    expect(conceptOf(note, 'Synthetic Index')).toBe('asset')
    expect(conceptOf(note, 'point-to-point')).toBe('determination')
    expect(conceptOf(note, 'from 100')).toBe('initial-level')
    expect(conceptOf(note, '90% principal protection')).toBe('protection')
  })

  it('says a note with no features repays its principal', () => {
    const principalOnly = { ...note, payoff: { participations: [] } }
    expect(sentence(principalOnly)).toBe('A 3-year note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
    expect(conceptOf(principalOnly, 'repays its principal')).toBe('payoff')
  })

  it('leaves out the protection clause when protection is absent', () => {
    const unprotected = { ...note, payoff: { participations: [{ direction: 'upside' as const, rate: 1 }] } }
    expect(sentence(unprotected)).toBe('A 3-year note that redeems at maturity and pays 100% of the upside of Synthetic Index, measured point-to-point from 100.')
  })

  it('keeps the protection clause when there is protection but no participation', () => {
    const protectionOnly = { ...note, payoff: { participations: [], principalProtection: 0.9 } }
    expect(sentence(protectionOnly)).toBe('A 3-year note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100, with 90% principal protection.')
  })

  it('keeps describing a draft that is not valid yet', () => {
    const draft: SingleProduct = { ...note, underlier: { ...note.underlier, components: [{ asset: { kind: 'equity-index', name: ' ' } }] }, payoff: { ...note.payoff, participations: [], principalProtection: Number.NaN } }
    expect(sentence(draft)).toBe('A 3-year note that redeems at maturity and repays its principal, linked to the underlier, measured point-to-point from 100, with — principal protection.')
  })
})

describe('note summary with a barrier', () => {
  it('names the barrier as a fraction of the level the return is measured from', () => {
    const barriered = { ...note, payoff: { ...note.payoff, participations: withSubFeatures(note.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(sentence(barriered)).toContain('point-to-point from 100, with a barrier at 70% of the initial level and 90% principal protection.')
    expect(conceptOf(barriered, 'a barrier at 70% of the initial level')).toBe('barrier')
    const lookback = { ...barriered, underlier: { ...barriered.underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }
    expect(sentence(lookback)).toContain('a barrier at 70% of the lookback level')
  })
})

describe('summary with absolute return', () => {
  it('names absolute return after the buffer it pays within', () => {
    const dualDirectional = { ...note, payoff: { participations: withSubFeatures(note.payoff.participations, { buffer: 0.15, absoluteReturn: { rate: 1 } }) } }
    expect(sentence(dualDirectional)).toContain(', with a 15% buffer and 100% absolute return on a fall within it.')
    expect(conceptOf(dualDirectional, '100% absolute return on a fall within it')).toBe('absolute-return')
  })

  it('says the cap limits a rise, since a fall within the buffer can pay more', () => {
    const capped = { ...note, payoff: { participations: withSubFeatures(note.payoff.participations, { buffer: 0.1, absoluteReturn: { rate: 1 }, cap: 0.05 }) } }
    expect(sentence(capped)).toContain(' and a maximum return of 5% on a rise.')
  })
})
