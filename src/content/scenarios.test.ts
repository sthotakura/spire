import { describe, expect, it } from 'vitest'
import { maturityPayment, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { scenarioReturns, scenarioRows } from './scenarios'

const withFeatures = (participations: Product['payoff']['participations'], principalProtection?: number): Product => ({
  ...startingProduct,
  payoff: { participations, principalProtection },
})
const notes: Array<[string, Product]> = [
  ['no features', startingProduct],
  ['upside only', withFeatures([{ direction: 'upside', rate: 1.5 }])],
  ['downside only, no protection', withFeatures([{ direction: 'downside', rate: 1 }])],
  ['every feature', withFeatures([{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }], 0.9)],
  ['a cap', withFeatures([{ direction: 'upside', rate: 1.5, cap: 0.2 }])],
]

describe('scenario rows', () => {
  it.each(notes)('match the maturity payment in every row for %s', (_, note) => {
    const rows = scenarioRows(note, 100)
    expect(rows.map(({ returnValue }) => returnValue)).toEqual(scenarioReturns)
    for (const row of rows) expect(row.breakdown.payment).toBe(maturityPayment(note, { initial: 100, final: row.finalLevel }))
  })

  it('places each row at the initial level scaled by its return', () => {
    expect(scenarioRows(startingProduct, 100).map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 100, 110, 130])
  })

  it('measures each row from the initial level it is given, such as a lookback level', () => {
    const rows = scenarioRows(notes[1][1], 92)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel * 10) / 10)).toEqual([55.2, 92, 101.2, 119.6])
    expect(rows[2].breakdown.underlierReturn).toBeCloseTo(0.1, 12)
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

describe('scenario rows with a barrier', () => {
  const barriered = (level: number) => withFeatures([{ direction: 'downside', barrier: { level, observation: 'final' }, rate: 1 }])

  it('add a row at the barrier, in order, which still repays principal', () => {
    const rows = scenarioRows(barriered(0.7), 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 70, 100, 110, 130])
    expect(rows.map(({ atBarrier }) => atBarrier)).toEqual([false, true, false, false, false])
    expect(rows[1].returnValue).toBeCloseTo(-0.3, 12)
    expect(rows[1].breakdown.belowBarrier).toBe(false)
    expect(rows.map(({ breakdown }) => Math.round(breakdown.payment))).toEqual([600, 1000, 1000, 1000, 1000])
  })

  it('measure the barrier row from the initial level it is given, such as a lookback level', () => {
    const rows = scenarioRows(barriered(0.7), 92)
    expect(rows[1].finalLevel).toBe(rows[1].breakdown.barrierLevel)
    expect(rows[1].breakdown.belowBarrier).toBe(false)
  })

  it('show only the protected range when the barrier is below every fixed row', () => {
    const rows = scenarioRows(barriered(0.5), 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([50, 60, 100, 110, 130])
    expect(rows.map(({ breakdown }) => Math.round(breakdown.payment))).toEqual([1000, 1000, 1000, 1000, 1000])
  })

  it('replace a fixed row at the same level rather than repeat it', () => {
    const rows = scenarioRows(barriered(0.6), 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 100, 110, 130])
    expect(rows[0].atBarrier).toBe(true)
  })

  it('add no row without a barrier', () => {
    expect(scenarioRows(notes[2][1], 100).map(({ atBarrier }) => atBarrier)).toEqual([false, false, false, false])
  })
})

describe('scenario rows with absolute return', () => {
  const dualDirectional = withFeatures([{ direction: 'downside', buffer: 0.15, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1 }])

  it('add a row at the buffer level, the most a fall can pay', () => {
    const rows = scenarioRows(dualDirectional, 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 85, 100, 110, 130])
    expect(rows.map(({ atBuffer }) => atBuffer)).toEqual([false, true, false, false, false])
    expect(rows[1].breakdown.absoluteReturnApplies).toBe(true)
    expect(rows.map(({ breakdown }) => Math.round(breakdown.payment))).toEqual([750, 1150, 1000, 1100, 1300])
  })

  it('add no buffer row for a buffer without absolute return', () => {
    const buffered = withFeatures([{ direction: 'downside', buffer: 0.15, rate: 1 }])
    expect(scenarioRows(buffered, 100).some(({ atBuffer }) => atBuffer)).toBe(false)
  })
})

describe('scenario rows with an upside barrier', () => {
  const finned = (level: number) => withFeatures([{ direction: 'upside', barrier: { level, observation: 'final', rebate: 0.02 }, rate: 0.8 }], 1)

  it('replace the fixed row at the barrier level, and mark it', () => {
    const rows = scenarioRows(finned(1.3), 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 100, 110, 130])
    expect(rows.map(({ atBarrier }) => atBarrier)).toEqual([false, false, false, true])
    expect(rows[3].breakdown).toMatchObject({ upsideBarrierReached: true, payment: 1020 })
    expect(rows[2].breakdown.upsideBarrierReached).toBe(false)
  })

  it('add a row in order when the barrier is above every fixed row', () => {
    const rows = scenarioRows(finned(1.5), 100)
    expect(rows.map(({ finalLevel }) => Math.round(finalLevel))).toEqual([60, 100, 110, 130, 150])
    expect(rows.map(({ atBarrier }) => atBarrier)).toEqual([false, false, false, false, true])
    expect(rows[4].breakdown.payment).toBe(1020)
  })

  it('measure the barrier row from the initial level it is given, such as a lookback level', () => {
    const rows = scenarioRows(finned(1.3), 80)
    expect(rows[3].finalLevel).toBe(rows[3].breakdown.upsideBarrierLevel)
    expect(rows[3].breakdown.upsideBarrierReached).toBe(true)
  })
})
