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
    for (const feature of ['protection', 'upside', 'downside'] as const) expect(isHighlighted('payoff', feature)).toBe(true)
  })

  it('highlights only the feature that is selected, not its siblings or the payoff', () => {
    expect(isHighlighted('upside', 'downside')).toBe(false)
    expect(isHighlighted('upside', 'protection')).toBe(false)
    expect(isHighlighted('upside', 'payoff')).toBe(false)
  })

  it('does not spread beyond the payoff', () => {
    for (const concept of ['wrapper', 'redemption', 'underlier', 'determination'] as const) expect(isHighlighted('payoff', concept)).toBe(false)
  })
})
