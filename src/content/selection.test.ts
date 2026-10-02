import { describe, expect, it } from 'vitest'
import { conceptIds } from './concepts'
import { isHighlighted } from './selection'

describe('selection', () => {
  it('highlights nothing when nothing is selected', () => {
    for (const concept of conceptIds) expect(isHighlighted(null, concept)).toBe(false)
  })

  it.each(conceptIds)('highlights %s when it is selected', (concept) => {
    expect(isHighlighted(concept, concept)).toBe(true)
  })

  it('selects every payoff feature together with the payoff', () => {
    for (const feature of ['protection', 'buffer', 'upside', 'downside', 'cap'] as const) expect(isHighlighted('payoff', feature)).toBe(true)
  })

  it('highlights only the feature that is selected, not its siblings or the payoff', () => {
    expect(isHighlighted('buffer', 'downside')).toBe(false)
    expect(isHighlighted('upside', 'downside')).toBe(false)
    expect(isHighlighted('upside', 'protection')).toBe(false)
    expect(isHighlighted('upside', 'payoff')).toBe(false)
  })

  it('selects the buffer with downside participation and the cap with upside participation, not the other way round', () => {
    expect(isHighlighted('downside', 'buffer')).toBe(true)
    expect(isHighlighted('upside', 'cap')).toBe(true)
    expect(isHighlighted('downside', 'cap')).toBe(false)
    expect(isHighlighted('upside', 'buffer')).toBe(false)
    expect(isHighlighted('cap', 'upside')).toBe(false)
  })

  it('does not spread beyond the payoff', () => {
    for (const concept of ['wrapper', 'redemption', 'underlier', 'asset', 'determination'] as const) expect(isHighlighted('payoff', concept)).toBe(false)
  })

  it('selects the asset and determination together with the underlier', () => {
    expect(isHighlighted('underlier', 'asset')).toBe(true)
    expect(isHighlighted('underlier', 'determination')).toBe(true)
    for (const concept of ['wrapper', 'redemption', 'payoff', 'upside'] as const) expect(isHighlighted('underlier', concept)).toBe(false)
  })

  it('selects the initial and final levels together with the determination, and with the underlier above it', () => {
    for (const parent of ['determination', 'underlier'] as const) {
      expect(isHighlighted(parent, 'initial-level')).toBe(true)
      expect(isHighlighted(parent, 'final-level')).toBe(true)
    }
    expect(isHighlighted('asset', 'initial-level')).toBe(false)
  })

  it('highlights only the level that is selected, not its sibling or the determination', () => {
    expect(isHighlighted('initial-level', 'final-level')).toBe(false)
    expect(isHighlighted('final-level', 'initial-level')).toBe(false)
    expect(isHighlighted('initial-level', 'determination')).toBe(false)
  })

  it('highlights only the asset or determination that is selected, not its sibling or the underlier', () => {
    expect(isHighlighted('asset', 'determination')).toBe(false)
    expect(isHighlighted('asset', 'underlier')).toBe(false)
    expect(isHighlighted('determination', 'asset')).toBe(false)
  })
})

describe('selection of absolute return', () => {
  it('belongs to downside participation and highlights neither the buffer nor its direction', () => {
    expect(isHighlighted('downside', 'absolute-return')).toBe(true)
    expect(isHighlighted('payoff', 'absolute-return')).toBe(true)
    expect(isHighlighted('absolute-return', 'buffer')).toBe(false)
    expect(isHighlighted('absolute-return', 'downside')).toBe(false)
  })
})
