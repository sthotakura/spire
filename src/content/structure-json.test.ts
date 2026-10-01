import { describe, expect, it } from 'vitest'
import { withSubFeatures, type SingleProduct } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { structureLines } from './structure-json'

const fullNote: SingleProduct = {
  ...startingProduct,
  payoff: {
    participations: [
      { direction: 'downside', rate: 1 },
      { direction: 'upside', rate: 1.5 },
    ],
    principalProtection: 0.9,
  },
}
const cappedNote: SingleProduct = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { cap: 0.2 }) } }
const draftNote: SingleProduct = {
  ...fullNote,
  principalAmount: Number.NaN,
  underlier: { ...startingProduct.underlier, components: [{ asset: { kind: 'equity', name: 'A "quoted" name é' } }], determination: { ...startingProduct.underlier.determination, initial: { kind: 'given', level: Number.NaN } } },
}
const asText =(note: SingleProduct) => structureLines(note).map(({ text }) => text).join('\n')
const linesOf = (note: SingleProduct, concept: string) => structureLines(note).filter((line) => line.concept === concept).map(({ text }) => text.trim())

describe('structure lines', () => {
  it.each([
    ['the starting note', startingProduct],
    ['a note with every feature', fullNote],
    ['a capped note', cappedNote],
    ['a protection-only note', { ...startingProduct, payoff: { participations: [], principalProtection: 0 } }],
    ['a draft that is not valid yet', draftNote],
  ])('matches JSON.stringify for %s', (_, note) => {
    expect(asText(note)).toBe(JSON.stringify(note, null, 2))
  })

  it('tags the outermost braces with no concept', () => {
    const lines = structureLines(startingProduct)
    expect(lines[0]).toEqual({ text: '{', concept: null })
    expect(lines[lines.length - 1]).toEqual({ text: '}', concept: null })
  })

  it('gives each concept its own lines', () => {
    expect(linesOf(fullNote, 'wrapper')).toEqual(['"wrapper": "note",', '"principalAmount": 1000,', '"term": {', '"months": 36', '},'])
    expect(linesOf(fullNote, 'redemption')).toEqual(['"redemption": "bullet",'])
    expect(linesOf(fullNote, 'underlier')).toEqual(['"underlier": {', '"kind": "single",', '"components": [', '],', '},'])
    expect(linesOf(fullNote, 'asset')).toEqual(['{', '"asset": {', '"kind": "equity-index",', '"name": "Synthetic Index"', '}', '}'])
    expect(linesOf(fullNote, 'determination')).toEqual(['"determination": {', '}'])
    expect(linesOf(fullNote, 'initial-level')).toEqual(['"initial": {', '"kind": "given",', '"level": 100', '},'])
    expect(linesOf(fullNote, 'final-level')).toEqual(['"final": {', '"kind": "final-date"', '}'])
    expect(linesOf(fullNote, 'protection')).toEqual(['"principalProtection": 0.9'])
  })

  it('tags each participation element with its own direction', () => {
    expect(linesOf(fullNote, 'downside')).toEqual(['{', '"direction": "downside",', '"rate": 1', '},'])
    expect(linesOf(fullNote, 'upside')).toEqual(['{', '"direction": "upside",', '"rate": 1.5', '}'])
  })

  it('keeps the rest of the payoff under the payoff', () => {
    expect(linesOf(fullNote, 'payoff')).toEqual(['"payoff": {', '"participations": [', '],', '}'])
    expect(linesOf(startingProduct, 'payoff')).toEqual(['"payoff": {', '"participations": []', '}'])
  })

  it('tags the cap with its own concept', () => {
    expect(linesOf(cappedNote, 'cap')).toEqual(['"cap": 0.2'])
    expect(linesOf(fullNote, 'cap')).toEqual([])
  })

  it('tags the barrier and its terms with their own concept', () => {
    const barriered: SingleProduct = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(asText(barriered)).toBe(JSON.stringify(barriered, null, 2))
    expect(linesOf(barriered, 'barrier')).toEqual(['"barrier": {', '"level": 0.7,', '"observation": "final"', '},'])
  })

  it('tags the buffer with its own concept', () => {
    const buffered: SingleProduct = { ...fullNote, payoff: { ...fullNote.payoff, participations: withSubFeatures(fullNote.payoff.participations, { buffer: 0.1 }) } }
    expect(asText(buffered)).toBe(JSON.stringify(buffered, null, 2))
    expect(linesOf(buffered, 'buffer')).toEqual(['"buffer": 0.1,'])
    expect(linesOf(fullNote, 'buffer')).toEqual([])
  })

  it('keeps the observation count under the determination', () => {
    const averaged: SingleProduct = { ...fullNote, underlier: { ...fullNote.underlier, determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 5 } } } }
    expect(asText(averaged)).toBe(JSON.stringify(averaged, null, 2))
    expect(linesOf(averaged, 'final-level')).toEqual(['"final": {', '"kind": "averaging",', '"observationCount": 5', '}'])
  })

  it('keeps the initial level under the initial level, and only the lookback count when it is lookback', () => {
    const lookback: SingleProduct = { ...fullNote, underlier: { ...fullNote.underlier, determination: { ...fullNote.underlier.determination, initial: { kind: 'lookback', observationCount: 3 } } } }
    expect(asText(lookback)).toBe(JSON.stringify(lookback, null, 2))
    expect(linesOf(lookback, 'initial-level')).toEqual(['"initial": {', '"kind": "lookback",', '"observationCount": 3', '},'])
    expect(asText(lookback)).not.toContain('level"')
  })

  it('leaves out an absent protection', () => {
    expect(asText(startingProduct)).not.toContain('principalProtection')
    expect(linesOf(startingProduct, 'protection')).toEqual([])
  })
})
