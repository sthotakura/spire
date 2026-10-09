import { describe, expect, it } from 'vitest'
import { withSubFeatures, type Participation, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { paymentFormula, paymentInWords } from './formula'

const noteWith = (participations: Participation[], cap?: number, principalProtection?: number, buffer?: number): Product => ({
  ...startingProduct,
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
})
const up = { direction: 'upside', rate: 1 } as const
const down = { direction: 'downside', rate: 1 } as const
const text = (note: Product) => paymentFormula(note).map(({ lead, segments }) => `${lead ? `${lead} = ` : ''}${segments.map((segment) => segment.text).join('')}`)

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
    const averaged = { ...noteWith([up]), underlier: { ...startingProduct.underlier, determination: { initial: { kind: 'given' as const, level: 100 }, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(text(averaged).slice(0, 2)).toEqual(['Final level = Average of the observed levels', 'Return = Final level ÷ Initial level − 1'])
    expect(paymentFormula(averaged)[0].segments[0].concept).toBe('final-level')
  })

  it('defines the lookback level, and measures the return from it, when the note looks back', () => {
    const lookback = { ...noteWith([up]), underlier: { ...startingProduct.underlier, determination: { initial: { kind: 'lookback' as const, observationCount: 3 }, final: { kind: 'final-date' as const } } } }
    expect(text(lookback).slice(0, 2)).toEqual(['Lookback level = Lowest of the levels on the pricing date and the dates after it', 'Return = Final level ÷ Lookback level − 1'])
    expect(paymentFormula(lookback)[0].segments[0].concept).toBe('initial-level')
    const both = { ...lookback, underlier: { ...lookback.underlier, determination: { ...lookback.underlier.determination, final: { kind: 'averaging' as const, observationCount: 5 } } } }
    expect(text(both).slice(0, 3).map((line) => line.split(' = ')[0])).toEqual(['Lookback level', 'Final level', 'Return'])
  })

  it('tags each term with the concept it comes from', () => {
    const concepts = paymentFormula(noteWith([down, up], 0.2, 0.9)).flatMap(({ segments }) => segments.flatMap(({ concept }) => concept ?? []))
    expect(concepts).toEqual(['determination', 'upside', 'downside', 'cap', 'protection'])
  })
  it('says downside participation counts only below the barrier', () => {
    const barriered = { ...noteWith([down, up]), payoff: { participations: withSubFeatures([down, up], { barrier: { level: 0.7, observation: 'final' as const } }) } }
    expect(text(barriered)).toEqual([
      'Return = Final level ÷ Initial level − 1',
      'Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return, 0))',
      'downside only when Final level < Downside barrier × Initial level',
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
    const unnamed: Product = { ...noteWith([up]), underlier: { ...startingProduct.underlier, components: [{ asset: { kind: 'equity-index', name: ' ' } }] } }
    expect(paymentInWords(unnamed)).toBe('Each 1% rise in the underlier adds 1% of principal. A fall leaves principal unchanged.')
  })
})

describe('payment rule with absolute return', () => {
  const dualDirectional: Product = { ...startingProduct, payoff: { participations: withSubFeatures([down, { direction: 'upside', rate: 1.2 }], { buffer: 0.15, absoluteReturn: { rate: 1 }, cap: 0.4 }) } }

  it('pays a fall within the buffer as a gain, and caps only a rise', () => {
    expect(text(dualDirectional).slice(1)).toEqual([
      'Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return + Buffer, 0))',
      'but Principal × (1 + Absolute × |Return|) when −Buffer ≤ Return < 0',
      'a rise capped at Principal × (1 + Cap)',
      'floored at 0',
    ])
    expect(paymentFormula(dualDirectional)[2].segments.find(({ text }) => text.startsWith('Principal'))?.concept).toBe('absolute-return')
  })

  it('says a larger fall loses the gain, and states the highest payment of either kind', () => {
    expect(paymentInWords(dualDirectional)).toBe(`Each 1% rise in ${startingProduct.underlier.components[0].asset.name} adds 1.2% of principal, and each 1% fall, up to 15%, adds 1%. A larger fall pays no gain, and each 1% beyond the first 15% takes 1% of principal away. The payment never goes above 1,400 or below zero.`)
    // A 10% cap is below the 15% the buffer lets a fall pay, so the highest payment is 1,150.
    const lowCap = { ...dualDirectional, payoff: { participations: withSubFeatures(dualDirectional.payoff.participations, { buffer: 0.15, absoluteReturn: { rate: 1 }, cap: 0.1 }) } }
    expect(paymentInWords(lowCap)).toContain('The payment never goes above 1,150 or below zero.')
  })
})

describe('payment rule with absolute return above a barrier', () => {
  const trigger: Product = { ...startingProduct, payoff: { participations: withSubFeatures([down, { direction: 'upside', rate: 1.25 }], { barrier: { level: 0.7, observation: 'final' as const }, absoluteReturn: { rate: 0.5 } }) } }

  it('pays a fall that ends at or above the downside barrier as a gain', () => {
    expect(text(trigger).slice(2)).toEqual([
      'downside only when Final level < Downside barrier × Initial level',
      'but Principal × (1 + Absolute × |Return|) when Final level ≥ Downside barrier × Initial level and Return < 0',
      'floored at 0',
    ])
  })

  it('says a larger fall counts in full', () => {
    expect(paymentInWords(trigger)).toBe(`Each 1% rise in ${startingProduct.underlier.components[0].asset.name} adds 1.25% of principal, and each 1% fall, up to 30%, adds 0.5%. A larger fall pays no gain, and each 1% of the whole fall takes 1% of principal away. The payment never goes below zero.`)
  })
})

describe('payment rule with an upside barrier', () => {
  const finned = (rebate?: number): Product => ({ ...startingProduct, payoff: { participations: withSubFeatures([up], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }) } })

  it('says upside participation counts only below the barrier, and what is paid otherwise', () => {
    expect(text(finned(0.02))).toEqual([
      'Return = Final level ÷ Initial level − 1',
      'Payment = Principal × (1 + Upside × max(Return, 0))',
      'upside only when Final level < Upside barrier × Initial level, otherwise Principal × (1 + Rebate)',
    ])
    expect(paymentFormula(finned(0.02))[2].segments.flatMap(({ concept }) => concept ?? [])).toEqual(['barrier', 'barrier'])
  })

  it('states no rebate when there is none', () => {
    expect(text(finned()).slice(2)).toEqual(['upside only when Final level < Upside barrier × Initial level'])
  })

  it('says it in words, with the rebate', () => {
    expect(paymentInWords(finned(0.02))).toBe('Each 1% rise in Synthetic Index adds 1% of principal, but only if Synthetic Index ends below 130% of its initial level. At or above 130% of its initial level, a rise adds only a fixed 2% of principal. A fall leaves principal unchanged.')
    expect(paymentInWords(finned())).toContain('At or above 130% of its initial level, a rise adds nothing.')
  })
})

describe('payment rule with barriers observed on every close', () => {
  it('reads the lowest close for a downside barrier', () => {
    const barriered: Product = { ...noteWith([down, up]), payoff: { participations: withSubFeatures([down, up], { barrier: { level: 0.7, observation: 'daily-close' as const } }) } }
    expect(text(barriered)).toEqual([
      'Return = Final level ÷ Initial level − 1',
      'Payment = Principal × (1 + Upside × max(Return, 0) + Downside × min(Return, 0))',
      'downside only when Lowest close < Downside barrier × Initial level',
      'floored at 0',
    ])
    expect(paymentInWords(barriered)).toBe('Each 1% rise in Synthetic Index adds 1% of principal, and each 1% fall takes 1% away, but only if Synthetic Index closes below 70% of its initial level on some day. The payment never goes below zero.')
  })

  it('reads the highest close for an upside barrier, and says the rebate is paid whatever the final level', () => {
    const finned = (rebate?: number): Product => ({ ...startingProduct, payoff: { participations: withSubFeatures([up], { upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate } }) } })
    expect(text(finned(0.02)).slice(2)).toEqual(['upside only when Highest close < Upside barrier × Initial level, otherwise Principal × (1 + Rebate)'])
    expect(paymentInWords(finned(0.02))).toBe('Each 1% rise in Synthetic Index adds 1% of principal, but only if Synthetic Index never closes at or above 130% of its initial level. If Synthetic Index closes at or above 130% of its initial level on any day, upside participation ends and the payment adds only a fixed 2% of principal, whatever the final level. A fall leaves principal unchanged.')
    expect(paymentInWords(finned())).toContain('the payment adds nothing, whatever the final level.')
  })
})
