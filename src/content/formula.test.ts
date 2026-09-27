import { describe, expect, it } from 'vitest'
import type { Participation, ProtectedParticipationNote } from '../domain/note'
import { startingNote } from '../domain/starting-note'
import { paymentFormula } from './formula'

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
