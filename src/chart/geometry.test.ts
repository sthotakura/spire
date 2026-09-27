import { describe, expect, it } from 'vitest'
import { amountToY, bufferFromX, bufferLevel, capBindLevel, capFromY, clampBuffer, clampCap, clampFinalLevel, clampProtection, clampUpsideRate, finalLevelFromX, keyDelta, levelToX, protectionFromY, regimeOf, slopeLevel, splitByRegime, type Plot, upsideRateFromY, xToLevel, yToAmount } from './geometry'
import { paymentBreakdown, type ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'

const plot: Plot = { left: 50, right: 590, top: 35, bottom: 230 }

describe('chart geometry', () => {
  it('maps the axes to the plot edges', () => {
    expect(levelToX(0, 100, plot)).toBe(50)
    expect(levelToX(160, 100, plot)).toBe(590)
    expect(amountToY(0, 1000, plot)).toBe(230)
    expect(amountToY(2000, 1000, plot)).toBe(35)
    expect(amountToY(1000, 1000, plot)).toBeCloseTo(132.5, 8)
  })

  it('converts back and forth without loss', () => {
    for (const level of [0, 37, 100, 160]) expect(xToLevel(levelToX(level, 100, plot), 100, plot)).toBeCloseTo(level, 8)
    for (const amount of [0, 250, 1000, 1999]) expect(yToAmount(amountToY(amount, 1000, plot), 1000, plot)).toBeCloseTo(amount, 8)
  })

  it('does not depend on the payoff, so a drag cannot move the axis', () => {
    expect(amountToY(1000, 1000, plot)).toBe(amountToY(1000, 1000, plot))
    expect(amountToY(500, 500, plot)).toBeCloseTo(amountToY(1000, 1000, plot), 8)
  })
})

describe('drag conversions', () => {
  it('sets protection from the height, snapped to 1% and limited to 0% to 100%', () => {
    expect(protectionFromY(amountToY(900, 1000, plot), 1000, plot)).toBe(90)
    expect(protectionFromY(amountToY(904.4, 1000, plot), 1000, plot)).toBe(90)
    expect(protectionFromY(amountToY(1500, 1000, plot), 1000, plot)).toBe(100)
    expect(protectionFromY(plot.bottom + 40, 1000, plot)).toBe(0)
  })

  it('sets the upside rate from the height at 1.5 × the initial level, snapped to 5%', () => {
    expect(upsideRateFromY(amountToY(1750, 1000, plot), 1000, plot)).toBe(150)
    expect(upsideRateFromY(amountToY(1100, 1000, plot), 1000, plot)).toBe(20)
    expect(upsideRateFromY(amountToY(1052, 1000, plot), 1000, plot)).toBe(10)
    expect(upsideRateFromY(amountToY(1026, 1000, plot), 1000, plot)).toBe(5)
    expect(upsideRateFromY(plot.top - 60, 1000, plot)).toBe(200)
    expect(upsideRateFromY(plot.bottom, 1000, plot)).toBe(5)
  })

  it('sets the cap from the height as a return on principal, snapped to 1% and limited to 1% to 100%', () => {
    expect(capFromY(amountToY(1200, 1000, plot), 1000, plot)).toBe(20)
    expect(capFromY(amountToY(1204.4, 1000, plot), 1000, plot)).toBe(20)
    expect(capFromY(plot.top - 40, 1000, plot)).toBe(100)
    expect(capFromY(plot.bottom, 1000, plot)).toBe(1)
  })

  it('keeps the slope handle below half the cap, so a cap does not pin it', () => {
    expect(slopeLevel(100)).toBe(150)
    expect(slopeLevel(100, 2)).toBe(150)
    expect(slopeLevel(100, 0.2)).toBeCloseTo(110, 8)
    // At a 10% return, a 200% rate reaches 1,200, which is still within a 20% cap.
    expect(upsideRateFromY(amountToY(1100, 1000, plot), 1000, plot, 0.2)).toBe(100)
    expect(upsideRateFromY(amountToY(1200, 1000, plot), 1000, plot, 0.2)).toBe(200)
  })

  it('finds the level where the cap starts to bind, so the cap handle can sit on the actual bend', () => {
    expect(capBindLevel(100, 0.2, 1)).toBeCloseTo(120, 8) // full participation reaches a 20% cap at a 20% return
    expect(capBindLevel(100, 0.2, 0.5)).toBeCloseTo(140, 8) // half participation needs twice the return
    expect(capBindLevel(100, 0.2, undefined)).toBeUndefined() // no upside participation, so the cap can never bind
  })

  it('sets the buffer from the position as the fall from the initial level, snapped to 1% and limited to 1% to 100%', () => {
    expect(bufferLevel(100, 0.1)).toBeCloseTo(90, 8)
    expect(bufferFromX(levelToX(90, 100, plot), 100, plot)).toBe(10)
    expect(bufferFromX(levelToX(90.3, 100, plot), 100, plot)).toBe(10)
    expect(bufferFromX(plot.left - 30, 100, plot)).toBe(100)
    expect(bufferFromX(levelToX(120, 100, plot), 100, plot)).toBe(1)
    expect(clampBuffer(0)).toBe(1)
    expect(clampBuffer(140)).toBe(100)
  })

  it('sets the final level from the position, snapped to 1 unit and limited to the axis', () => {
    expect(finalLevelFromX(levelToX(110, 100, plot), 100, plot)).toBe(110)
    expect(finalLevelFromX(levelToX(110.4, 100, plot), 100, plot)).toBe(110)
    expect(finalLevelFromX(plot.left - 30, 100, plot)).toBe(0)
    expect(finalLevelFromX(plot.right + 30, 100, plot)).toBe(160)
    expect(finalLevelFromX(plot.right + 30, 100.5, plot)).toBe(160)
  })

  it('limits handle values without limiting what can be typed', () => {
    expect(clampProtection(101)).toBe(100)
    expect(clampProtection(-3)).toBe(0)
    expect(clampCap(150)).toBe(100)
    expect(clampCap(0)).toBe(1)
    expect(clampUpsideRate(250)).toBe(200)
    expect(clampUpsideRate(1)).toBe(5)
    expect(clampFinalLevel(500, 100)).toBe(160)
    expect(clampFinalLevel(-4, 100)).toBe(0)
  })
})

describe('arrow keys', () => {
  it('step by the handle step, and by 5 times as much with Shift', () => {
    expect(keyDelta('ArrowUp', false, 1)).toBe(1)
    expect(keyDelta('ArrowRight', false, 5)).toBe(5)
    expect(keyDelta('ArrowDown', false, 1)).toBe(-1)
    expect(keyDelta('ArrowLeft', true, 1)).toBe(-5)
    expect(keyDelta('ArrowUp', true, 5)).toBe(25)
  })

  it('ignore every other key', () => {
    for (const key of ['Enter', 'Tab', 'a', ' ', 'Home']) expect(keyDelta(key, false, 1)).toBeNull()
  })
})

describe('payoff regimes', () => {
  const note = (payoff: Partial<ProtectedParticipationNote['payoff']>): ProtectedParticipationNote => ({ ...startingNote, payoff: { ...startingNote.payoff, ...payoff } })
  const regimeAt = (n: ProtectedParticipationNote, level: number) => regimeOf(paymentBreakdown(n, level))

  it('only repays principal when no participation applies', () => {
    expect(regimeAt(note({}), 60)).toBe('principal')
    expect(regimeAt(note({}), 140)).toBe('principal')
  })

  it('names the participation direction, counting a flat return as upside', () => {
    const both = note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] })
    expect(regimeAt(both, 80)).toBe('downside')
    expect(regimeAt(both, 100)).toBe('upside')
    expect(regimeAt(both, 130)).toBe('upside')
  })

  it('names the floor and the cap when they set the payment', () => {
    const bounded = note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], principalProtection: 0.9, cap: 0.2 })
    expect(regimeAt(bounded, 95)).toBe('downside')
    expect(regimeAt(bounded, 50)).toBe('floor')
    expect(regimeAt(bounded, 110)).toBe('upside')
    expect(regimeAt(bounded, 150)).toBe('cap')
  })

  it('names the buffer where it absorbs the whole fall, and downside participation past it', () => {
    const buffered = note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], buffer: 0.1, principalProtection: 0.8 })
    expect(regimeAt(buffered, 95)).toBe('buffer')
    expect(regimeAt(buffered, 85)).toBe('downside')
    expect(regimeAt(buffered, 50)).toBe('floor')
    expect(regimeAt(buffered, 110)).toBe('upside')
    expect(regimeAt(note({ buffer: 0.1 }), 95)).toBe('principal')
  })

  it('splits points into runs that share their joins', () => {
    const runs = splitByRegime([
      { point: '0,0', regime: 'floor' }, { point: '1,0', regime: 'floor' }, { point: '2,1', regime: 'upside' }, { point: '3,2', regime: 'upside' }, { point: '4,2', regime: 'cap' },
    ])
    expect(runs).toEqual([{ regime: 'floor', points: '0,0 1,0 2,1' }, { regime: 'upside', points: '2,1 3,2 4,2' }, { regime: 'cap', points: '4,2' }])
  })
})
