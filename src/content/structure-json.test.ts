import { describe, expect, it } from 'vitest'
import { withSubFeatures, type Note } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { structureLines } from './structure-json'

const fullNote: Note = {
  ...startingNote,
  payoff: {
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 0.9,
  },
}
const cappedNote: Note = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { cap: 0.2 }) } }
const draftNote: Note = {
  ...fullNote,
  principalAmount: Number.NaN,
  underlier: { ...startingNote.underlier, components: [{ asset: { kind: 'equity', name: 'A "quoted" name é' }, initialLevel: Number.NaN }] },
}
const asText =(note: Note) => structureLines(note).map(({ text }) => text).join('\n')
const linesOf = (note: Note, concept: string) => structureLines(note).filter((line) => line.concept === concept).map(({ text }) => text.trim())

describe('structure lines', () => {
  it.each([
    ['the starting note', startingNote],
    ['a note with every feature', fullNote],
    ['a capped note', cappedNote],
    ['a protection-only note', { ...startingNote, payoff: { participations: [], principalProtection: 0 } }],
    ['a draft that is not valid yet', draftNote],
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
    expect(linesOf(fullNote, 'underlier')).toEqual(['"underlier": {', '"kind": "single",', '"components": [', '],', '},'])
    expect(linesOf(fullNote, 'asset')).toEqual(['{', '"asset": {', '"kind": "equity-index",', '"name": "Synthetic Index"', '},', '"initialLevel": 100', '}'])
    expect(linesOf(fullNote, 'determination')).toEqual(['"determination": {', '}'])
    expect(linesOf(fullNote, 'initial-level')).toEqual(['"initial": {', '"kind": "given"', '},'])
    expect(linesOf(fullNote, 'final-level')).toEqual(['"final": {', '"kind": "final-date"', '}'])
    expect(linesOf(fullNote, 'protection')).toEqual(['"principalProtection": 0.9'])
  })

  it('tags each participation element with its own direction', () => {
    expect(linesOf(fullNote, 'downside')).toEqual(['{', '"direction": "downside",', '"rate": 1', '},'])
    expect(linesOf(fullNote, 'upside')).toEqual(['{', '"direction": "upside",', '"rate": 1.5', '}'])
  })

  it('keeps the rest of the payoff under the payoff', () => {
    expect(linesOf(fullNote, 'payoff')).toEqual(['"payoff": {', '"participations": [', '],', '},'])
    expect(linesOf(startingNote, 'payoff')).toEqual(['"payoff": {', '"participations": []', '},'])
  })

  it('tags the cap with its own concept', () => {
    expect(linesOf(cappedNote, 'cap')).toEqual(['"cap": 0.2'])
    expect(linesOf(fullNote, 'cap')).toEqual([])
  })

  it('tags the barrier and its terms with their own concept', () => {
    const barriered: Note = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(asText(barriered)).toBe(JSON.stringify(barriered, null, 2))
    expect(linesOf(barriered, 'barrier')).toEqual(['"barrier": {', '"level": 0.7,', '"observation": "final"', '},'])
  })

  it('tags the buffer with its own concept', () => {
    const buffered: Note = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { buffer: 0.1 }) } }
    expect(asText(buffered)).toBe(JSON.stringify(buffered, null, 2))
    expect(linesOf(buffered, 'buffer')).toEqual(['"buffer": 0.1,'])
    expect(linesOf(fullNote, 'buffer')).toEqual([])
  })

  it('keeps the observation count under the determination', () => {
    const averaged: Note = { ...fullNote, underlier: { ...fullNote.underlier, determination: { initial: { kind: 'given' }, final: { kind: 'averaging', observationCount: 5 } } } }
    expect(asText(averaged)).toBe(JSON.stringify(averaged, null, 2))
    expect(linesOf(averaged, 'final-level')).toEqual(['"final": {', '"kind": "averaging",', '"observationCount": 5', '}'])
  })

  it('leaves out an absent protection', () => {
    expect(asText(startingNote)).not.toContain('principalProtection')
    expect(linesOf(startingNote, 'protection')).toEqual([])
  })
})
