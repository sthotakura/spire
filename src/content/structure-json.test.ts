import { describe, expect, it } from 'vitest'
import type { ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { structureLines } from './structure-json'

const fullNote: ProtectedParticipationNote = {
  ...startingNote,
  payoff: {
    kind: 'participation',
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 0.9,
  },
}
const asText = (note: ProtectedParticipationNote) => structureLines(note).map(({ text }) => text).join('\n')
const linesOf = (note: ProtectedParticipationNote, concept: string) => structureLines(note).filter((line) => line.concept === concept).map(({ text }) => text.trim())

describe('structure lines', () => {
  it.each([
    ['the starting note', startingNote],
    ['a note with every feature', fullNote],
    ['a protection-only note', { ...startingNote, payoff: { kind: 'participation' as const, participations: [], principalProtection: 0 } }],
    ['a draft that is not valid yet', { ...fullNote, principalAmount: Number.NaN, underlier: { kind: 'equity' as const, name: 'A "quoted" name é' } }],
  ])('matches JSON.stringify for %s', (_, note) => {
    expect(asText(note)).toBe(JSON.stringify(note, null, 2))
  })

  it('tags the outermost braces with no concept', () => {
    const lines = structureLines(startingNote)
    expect(lines[0]).toEqual({ text: '{', concept: null })
    expect(lines[lines.length - 1]).toEqual({ text: '}', concept: null })
  })

  it('gives each concept its own lines', () => {
    expect(linesOf(fullNote, 'wrapper')).toEqual(['"wrapper": "note",', '"principalAmount": 1000'])
    expect(linesOf(fullNote, 'redemption')).toEqual(['"redemption": "bullet",'])
    expect(linesOf(fullNote, 'underlier')).toEqual(['"underlier": {', '"kind": "equity-index",', '"name": "Synthetic Index"', '},'])
    expect(linesOf(fullNote, 'determination')).toEqual(['"determination": {', '"kind": "point-to-point",', '"initialLevel": 100', '},'])
    expect(linesOf(fullNote, 'protection')).toEqual(['"principalProtection": 0.9'])
  })

  it('tags each participation element with its own direction', () => {
    expect(linesOf(fullNote, 'downside')).toEqual(['{', '"direction": "downside",', '"rate": 1', '},'])
    expect(linesOf(fullNote, 'upside')).toEqual(['{', '"direction": "upside",', '"rate": 1.5', '}'])
  })

  it('keeps the rest of the payoff under the payoff', () => {
    expect(linesOf(fullNote, 'payoff')).toEqual(['"payoff": {', '"kind": "participation",', '"participations": [', '],', '},'])
    expect(linesOf(startingNote, 'payoff')).toEqual(['"payoff": {', '"kind": "participation",', '"participations": []', '},'])
  })

  it('leaves out an absent protection', () => {
    expect(asText(startingNote)).not.toContain('principalProtection')
    expect(linesOf(startingNote, 'protection')).toEqual([])
  })
})
