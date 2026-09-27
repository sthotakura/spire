import { describe, expect, it } from 'vitest'
import type { Participation, ProtectedParticipationNote } from '../domain/note'
import { marketingNames } from './names'

const noteWith = (payoff: { participations?: Participation[]; principalProtection?: number; cap?: number }): ProtectedParticipationNote => ({
  wrapper: 'note',
  redemption: 'bullet',
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' }, initialLevel: 100 }], determination: { kind: 'point-to-point' } },
  payoff: { kind: 'participation', participations: [], ...payoff },
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

  it('gives a cap without upside participation no name', () => {
    expect(namesOf({ participations: [down(1)], cap: 0.2 })).toEqual([])
    expect(namesOf({ cap: 0.2 })).toEqual([])
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

  it('gives no name to a draft with invalid terms', () => {
    expect(namesOf({ participations: [up(Number.NaN), down(1)], principalProtection: Number.NaN, cap: Number.NaN })).toEqual([])
    expect(namesOf({ principalProtection: 2 })).toEqual([])
    expect(namesOf({ participations: [up(1.5)], cap: -0.1 })).toEqual([])
    expect(namesOf({ participations: [up(0), down(1)] })).toEqual([])
    expect(namesOf({ participations: [up(1), down(Number.NaN)] })).toEqual([])
    expect(namesOf({ participations: [up(Number.NaN)] })).toEqual([])
  })
})
