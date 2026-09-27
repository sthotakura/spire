import { describe, expect, it } from 'vitest'
import type { Participation, ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { paymentFormula, paymentInWords } from './formula'

const noteWith = (participations: Participation[], cap?: number, principalProtection?: number): ProtectedParticipationNote => ({
  ...startingNote,
  payoff: { kind: 'participation', participations, cap, principalProtection },
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

  it('tags each term with the concept it comes from', () => {
    const concepts = paymentFormula(noteWith([down, up], 0.2, 0.9)).flatMap(({ segments }) => segments.flatMap(({ concept }) => concept ?? []))
    expect(concepts).toEqual(['determination', 'upside', 'downside', 'cap', 'protection'])
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

  it('falls back to a generic name when the asset has none', () => {
    const unnamed: ProtectedParticipationNote = { ...noteWith([up]), underlier: { ...startingNote.underlier, components: [{ asset: { kind: 'equity-index', name: ' ' }, initialLevel: 100 }] } }
    expect(paymentInWords(unnamed)).toBe('Each 1% rise in the underlier adds 1% of principal. A fall leaves principal unchanged.')
  })
})
