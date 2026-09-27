import { describe, expect, it } from 'vitest'
import { maturityPayment, type ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { scenarioReturns, scenarioRows } from './scenarios'

const withFeatures = (participations: ProtectedParticipationNote['payoff']['participations'], principalProtection?: number): ProtectedParticipationNote => ({
  ...startingNote,
  payoff: { kind: 'participation', participations, principalProtection },
})
const notes: Array<[string, ProtectedParticipationNote]> = [
  ['no features', startingNote],
  ['upside only', withFeatures([{ direction: 'upside', rate: 1.5 }])],
  ['downside only, no protection', withFeatures([{ direction: 'downside', rate: 1 }])],
  ['every feature', withFeatures([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }], 0.9)],
  ['a cap', { ...withFeatures([{ direction: 'upside', rate: 1.5 }]), payoff: { kind: 'participation', participations: [{ direction: 'upside', rate: 1.5 }], cap: 0.2 } }],
]

describe('scenario rows', () => {
  it.each(notes)('match the maturity payment in every row for %s', (_, note) => {
    const rows = scenarioRows(note, 100)
    expect(rows.map(({ returnValue }) => returnValue)).toEqual(scenarioReturns)
    for (const row of rows) expect(row.breakdown.payment).toBe(maturityPayment(note, { initial: 100, final: row.finalLevel }))
  })

  it('places each row at the initial level scaled by its return', () => {
    expect(scenarioRows(startingNote, 100).map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 100, 110, 130])
  })

  it('shows the floor applying only where it does', () => {
    const rows = scenarioRows(notes[3][1], 100)
    expect(rows.map(({ breakdown }) => breakdown.floorApplies)).toEqual([true, false, false, false])
    expect(rows.map(({ breakdown }) => Math.round(breakdown.payment))).toEqual([900, 1000, 1150, 1450])
  })
})

describe('scenario rows with a cap', () => {
  it('show the cap applying only where it does', () => {
    const rows = scenarioRows(notes[4][1], 100)
    expect(rows.map(({ breakdown }) => breakdown.capApplies)).toEqual([false, false, false, true])
    expect(rows.map(({ breakdown }) => Math.round(breakdown.payment))).toEqual([1000, 1000, 1150, 1200])
  })
})
