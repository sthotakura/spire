import { describe, expect, it } from 'vitest'
import { withSubFeatures, type Participation, type ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { paymentFormula, paymentInWords } from './formula'

const noteWith = (participations: Participation[], cap?: number, principalProtection?: number, buffer?: number): ProtectedParticipationNote => ({
  ...startingNote,
  payoff: { kind: 'participation', participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
})
const up = { direction: 'upside', rate: 1 } as const
const down = { direction: 'downside', rate: 1 } as const
const text = (note: ProtectedParticipationNote) => paymentFormula(note).map(({ lead, segments }) => `${lead ? `${lead} = ` : ''}${segments.map((segment) => segment.text).join('')}`)

describe('payment formula', () => {
  it('repays principal when the note has no features', () => {
    expect(text(noteWith([]))).toEqual(['Return = Final level ÷ Initial level − 1', 'Payment = Principal'])
  })

  it('adds only the participation directions that are present', () => {
    expect(text(noteWith([up]))[1]).toBe('Payment = Principal × (1 + Upside × max(Return, 0))')
    expect(text(noteWith([down]))[1]).toBe('Payment = Principal × (1 + Downside × min(Return, 0))')
    expect(text(noteWith([down, up]))[1]).toBe('Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return, 0))')
  })

  it('limits the payment with the cap, then the floor, in the order the calculation applies them', () => {
    expect(text(noteWith([down, up], 0.2, 0.9)).slice(2)).toEqual(['capped at Principal × (1 + Cap)', 'floored at Principal × Protection'])
  })

  it('floors at zero when a fall reduces principal and there is no protection', () => {
    expect(text(noteWith([down])).slice(2)).toEqual(['floored at 0'])
  })

  it('shows no floor when nothing can reduce principal', () => {
    expect(text(noteWith([up], 0.2)).slice(2)).toEqual(['capped at Principal × (1 + Cap)'])
  })

  it('moves the start of downside participation by the buffer', () => {
    const buffered = noteWith([down, up], undefined, undefined, 0.1)
    expect(text(buffered)[1]).toBe('Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return + Buffer, 0))')
    expect(paymentFormula(buffered)[1].segments.flatMap(({ concept }) => concept ?? [])).toEqual(['upside', 'downside', 'buffer', 'downside'])
  })

  it('defines the final level as the average when the note averages', () => {
    const averaged = { ...noteWith([up]), underlier: { ...startingNote.underlier, determination: { initial: { kind: 'given' as const }, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(text(averaged).slice(0, 2)).toEqual(['Final level = Average of the observed levels', 'Return = Final level ÷ Initial level − 1'])
    expect(paymentFormula(averaged)[0].segments[0].concept).toBe('final-level')
  })

  it('defines the lookback level, and measures the return from it, when the note looks back', () => {
    const lookback = { ...noteWith([up]), underlier: { ...startingNote.underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }
    expect(text(lookback).slice(0, 2)).toEqual(['Lookback level = Lowest of the initial level and the levels observed after pricing', 'Return = Final level ÷ Lookback level − 1'])
    expect(paymentFormula(lookback)[0].segments[0].concept).toBe('initial-level')
    const both = { ...lookback, underlier: { ...lookback.underlier, determination: { ...lookback.underlier.determination, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(text(both).slice(0, 3).map((line) => line.split(' = ')[0])).toEqual(['Lookback level', 'Final level', 'Return'])
  })

  it('tags each term with the concept it comes from', () => {
    const concepts = paymentFormula(noteWith([down, up], 0.2, 0.9)).flatMap(({ segments }) => segments.flatMap(({ concept }) => concept ?? []))
    expect(concepts).toEqual(['determination', 'upside', 'downside', 'cap', 'protection'])
  })
  it('says downside participation counts only below the barrier', () => {
    const barriered = { ...noteWith([down, up]), payoff: { kind: 'participation' as const, participations: withSubFeatures([down, up], { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(text(barriered)).toEqual([
      'Return = Final level ÷ Initial level − 1',
      'Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return, 0))',
      'downside only when Final level < Barrier × Initial level',
      'floored at 0',
    ])
    expect(paymentFormula(barriered)[2].segments.find(({ concept }) => concept)?.concept).toBe('barrier')
    expect(paymentInWords(barriered)).toBe('Each 1% rise in Synthetic Index adds 1% of principal, and each 1% fall takes 1% away, but only if Synthetic Index ends below 70% of its initial level. The payment never goes below zero.')
  })
})

describe('payment rule in words', () => {
  const rate = (direction: 'upside' | 'downside', value: number): Participation => ({ direction, rate: value })

  it('says the payment is always principal when nothing can change it', () => {
    expect(paymentInWords(noteWith([]))).toBe('The payment is always principal, 1,000, whatever Synthetic Index does.')
    expect(paymentInWords(noteWith([], 0.2, 0.9))).toBe('The payment is always principal, 1,000, whatever Synthetic Index does.')
  })

  it('describes each move with the rate applied to a 1% move', () => {
    expect(paymentInWords(noteWith([rate('upside', 1.5)]))).toBe('Each 1% rise in Synthetic Index adds 1.5% of principal. A fall leaves principal unchanged.')
    expect(paymentInWords(noteWith([rate('downside', 0.5)]))).toBe('Each 1% fall in Synthetic Index takes 0.5% of principal away. A rise leaves principal unchanged. The payment never goes below zero.')
  })

  it('names both limits from the note’s own amounts', () => {
    expect(paymentInWords(noteWith([down, up], 0.2, 0.9))).toBe('Each 1% rise in Synthetic Index adds 1% of principal, and each 1% fall takes 1% away. The payment never goes above 1,200 or below 900.')
  })

  it('floors at zero when a fall reduces principal and there is no protection', () => {
    expect(paymentInWords(noteWith([down, up], 0.2))).toBe('Each 1% rise in Synthetic Index adds 1% of principal, and each 1% fall takes 1% away. The payment never goes above 1,200 or below zero.')
  })

  it('names only the limits that exist', () => {
    expect(paymentInWords(noteWith([up], 0.2))).toBe('Each 1% rise in Synthetic Index adds 1% of principal. A fall leaves principal unchanged. The payment never goes above 1,200.')
    expect(paymentInWords(noteWith([up], undefined, 0.9))).toBe('Each 1% rise in Synthetic Index adds 1% of principal. A fall leaves principal unchanged. The payment never goes below 900.')
  })

  it('says the fall only counts beyond the buffer', () => {
    const withBuffer = (participations: Participation[]) => noteWith(participations, undefined, undefined, 0.1)
    expect(paymentInWords(withBuffer([down]))).toBe('Each 1% fall in Synthetic Index beyond the first 10% takes 1% of principal away. A rise leaves principal unchanged. The payment never goes below zero.')
    expect(paymentInWords(withBuffer([down, up]))).toBe('Each 1% rise in Synthetic Index adds 1% of principal, and each 1% fall beyond the first 10% takes 1% away. The payment never goes below zero.')
  })

  it('falls back to a generic name when the asset has none', () => {
    const unnamed: ProtectedParticipationNote = { ...noteWith([up]), underlier: { ...startingNote.underlier, components: [{ asset: { kind: 'equity-index', name: ' ' }, initialLevel: 100 }] } }
    expect(paymentInWords(unnamed)).toBe('Each 1% rise in the underlier adds 1% of principal. A fall leaves principal unchanged.')
  })
})
