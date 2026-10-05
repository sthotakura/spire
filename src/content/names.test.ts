import { describe, expect, it } from 'vitest'
import { withSubFeatures, type Participation, type Product } from '../domain/note'
import { marketingNames } from './names'

const noteWith = ({ participations = [], principalProtection, cap, buffer }: { participations?: Participation[]; principalProtection?: number; cap?: number; buffer?: number }): Product => ({
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
  principalAmount: 1000,
})

const up = (rate: number): Participation => ({ direction: 'upside', rate })
const down = (rate: number): Participation => ({ direction: 'downside', rate })
const namesOf = (payoff: Parameters<typeof noteWith>[0]) => marketingNames(noteWith(payoff)).map(({ name }) => name)

describe('marketing names', () => {
  it('gives a note with no features no name', () => {
    expect(namesOf({})).toEqual([])
  })

  it('calls full protection a principal-protected note', () => {
    expect(namesOf({ principalProtection: 1 })).toEqual(['Principal-protected note'])
  })

  it('calls protection below 100% partial, at any level above zero', () => {
    expect(namesOf({ principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
    expect(namesOf({ principalProtection: 0.1 })).toEqual(['Partially principal-protected note'])
  })

  it('treats 0% protection as no protection', () => {
    expect(namesOf({ principalProtection: 0 })).toEqual([])
    expect(namesOf({ principalProtection: 0, participations: [up(1), down(1)] })).toEqual(['Tracker'])
  })

  it('calls one-for-one participation both ways a tracker', () => {
    expect(namesOf({ participations: [up(1), down(1)] })).toEqual(['Tracker'])
  })

  it('calls upside above 100% with full downside participation outperformance', () => {
    expect(namesOf({ participations: [up(1.5), down(1)] })).toEqual(['Outperformance'])
  })

  it('calls any other pair of participation rates a participation note', () => {
    expect(namesOf({ participations: [up(0.8), down(1)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1), down(0.9)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1.5), down(0.5)] })).toEqual(['Participation note'])
  })

  it('calls upside participation alone a participation note, at any rate', () => {
    expect(namesOf({ participations: [up(1)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1.5)] })).toEqual(['Participation note'])
    const [name] = marketingNames(noteWith({ participations: [up(1)] }))
    expect(name.concepts).toEqual(['upside'])
    expect(name.reason).toContain('A fall does not reduce principal')
  })

  it('gives downside participation alone no name', () => {
    expect(namesOf({ participations: [down(1)] })).toEqual([])
  })

  it('calls a cap on upside participation capped participation', () => {
    expect(namesOf({ participations: [up(1.5)], cap: 0.2 })).toEqual(['Capped participation'])
  })

  it('does not call a capped or protected note a tracker or outperformance', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], cap: 0.2 })).toEqual(['Capped participation'])
    expect(namesOf({ participations: [up(1), down(1)], principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
    expect(namesOf({ participations: [up(0.8), down(1)], principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
  })

  it('returns every name that applies', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], principalProtection: 1, cap: 0.2 })).toEqual(['Principal-protected note', 'Capped participation'])
    expect(namesOf({ participations: [up(1.5)], principalProtection: 0.9, cap: 0.2 })).toEqual(['Partially principal-protected note', 'Capped participation'])
  })

  it('names the parts of the note behind each name', () => {
    const [protectedName, capName] = marketingNames(noteWith({ participations: [up(1.5)], principalProtection: 1, cap: 0.2 }))
    expect(protectedName.concepts).toEqual(['protection'])
    expect(capName.concepts).toEqual(['upside', 'cap'])
  })

  it('mentions the Swiss name for full protection only when there is upside participation', () => {
    const [withUpside] = marketingNames(noteWith({ participations: [up(1)], principalProtection: 1 }))
    const [withoutUpside] = marketingNames(noteWith({ principalProtection: 1 }))
    expect(withUpside.reason).toContain('Capital Protection Note with Participation')
    expect(withoutUpside.reason).not.toContain('Capital Protection Note with Participation')
  })

  it('calls a buffer on downside participation a buffered note', () => {
    expect(namesOf({ participations: [up(1), down(1)], buffer: 0.1 })).toEqual(['Buffered note'])
    const [name] = marketingNames(noteWith({ participations: [down(1)], buffer: 0.1 }))
    expect(name.concepts).toEqual(['buffer', 'downside'])
    expect(name.reason).toContain('The first 10% of a fall is absorbed.')
  })

  it('combines the buffered name with the others that apply', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], buffer: 0.1, cap: 0.2 })).toEqual(['Buffered note', 'Capped participation'])
    expect(namesOf({ participations: [up(1), down(1)], buffer: 0.1, principalProtection: 0.9 })).toEqual(['Partially principal-protected note', 'Buffered note'])
  })

  it('does not call a note with a barrier a tracker or outperformance', () => {
    const barriered = (participations: Participation[]) => marketingNames({ ...noteWith({ participations }), payoff: { participations: withSubFeatures(participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }).map(({ name }) => name)
    expect(barriered([up(1), down(1)])).toEqual([])
    expect(barriered([up(1.5), down(1)])).toEqual([])
  })

  it('gives no name to a draft with invalid terms', () => {
    expect(namesOf({ participations: [down(1)], buffer: Number.NaN })).toEqual([])
    expect(namesOf({ participations: [down(1)], buffer: 1.5 })).toEqual([])
    expect(namesOf({ participations: [up(Number.NaN), down(1)], principalProtection: Number.NaN, cap: Number.NaN })).toEqual([])
    expect(namesOf({ principalProtection: 2 })).toEqual([])
    expect(namesOf({ participations: [up(1.5)], cap: -0.1 })).toEqual([])
    expect(namesOf({ participations: [up(0), down(1)] })).toEqual([])
    expect(namesOf({ participations: [up(1), down(Number.NaN)] })).toEqual([])
    expect(namesOf({ participations: [up(Number.NaN)] })).toEqual([])
  })
})

describe('marketing names with an upside barrier', () => {
  const finned = (principalProtection?: number) => marketingNames({ ...noteWith({ principalProtection }), payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate: 0.02 } }), principalProtection } }).map(({ name }) => name)

  const sharkFin = (principalProtection?: number, rebate?: number) => marketingNames({ ...noteWith({ principalProtection }), payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }), principalProtection } }).filter(({ name }) => name.startsWith('Shark fin'))

  it('calls upside participation with an upside barrier a shark fin note, not a participation note', () => {
    expect(finned()).toEqual(['Shark fin note'])
    expect(finned(0)).toEqual(['Shark fin note'])
  })

  it('shows the shark fin name whether or not there is a rebate', () => {
    expect(sharkFin(undefined, 0.02).map(({ name }) => name)).toEqual(['Shark fin note'])
    expect(sharkFin(undefined, undefined).map(({ name }) => name)).toEqual(['Shark fin note'])
  })

  it('calls full protection a shark fin PP, in place of the plain name', () => {
    expect(finned(1)).toEqual(['Principal-protected note', 'Shark fin PP'])
  })

  it('keeps the plain name with partial protection, beside the partial protection name', () => {
    expect(finned(0.9)).toEqual(['Partially principal-protected note', 'Shark fin note'])
  })

  it('gives no shark fin name when a fall can reduce principal', () => {
    const withDownside = marketingNames({ ...noteWith({}), payoff: { participations: withSubFeatures([down(1), up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate: 0.02 } }) } }).map(({ name }) => name)
    expect(withDownside).toEqual([])
    // With full protection the floor bounds the fall, so downside participation does not matter.
    const protectedDownside = marketingNames({ ...noteWith({}), payoff: { participations: withSubFeatures([down(1), up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const } }), principalProtection: 1 } }).map(({ name }) => name)
    expect(protectedDownside).toEqual(['Principal-protected note', 'Shark fin PP'])
  })

  it('says how the final-date version differs from the daily-observed contract, and what each name rests on', () => {
    const [plain] = sharkFin()
    const [pp] = sharkFin(1)
    for (const shark of [plain, pp]) {
      expect(shark.reason).toContain('every trading day')
      expect(shark.reason).toContain('observes only the final level')
      expect(shark.vocabulary).toBe('Market usage')
    }
    expect(plain.concepts).toEqual(['upside', 'barrier'])
    expect(pp.concepts).toEqual(['protection', 'upside', 'barrier'])
    expect(pp.reason).toContain('PP stands for principal protected')
  })

  it('needs an upside barrier and a note', () => {
    expect(namesOf({ principalProtection: 1, participations: [up(0.8)] })).toEqual(['Principal-protected note'])
    const deposit = marketingNames({ ...noteWith({}), wrapper: 'deposit', payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const } }) } }).map(({ name }) => name)
    expect(deposit).toEqual(['Market-linked deposit'])
  })
})
