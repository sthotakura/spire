import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from './autocall'
import { basketBreakdown, deliveryFrom, paymentBreakdown, validateProduct, type BasketUnderlier, type DeterminedLevels, type DownsideParticipation, type Product } from './note'

const stock = (level = 100): Product['underlier'] => ({ kind: 'single', components: [{ asset: { kind: 'equity', name: 'Stock A' } }], determination: { initial: { kind: 'given', level }, final: { kind: 'final-date' } } })
const worstOf: BasketUnderlier = {
  kind: 'basket',
  components: [{ asset: { kind: 'equity', name: 'Stock A' } }, { asset: { kind: 'equity', name: 'Stock B' } }],
  determination: { initial: { kind: 'given', levels: [{ asset: 'Stock A', level: 200 }, { asset: 'Stock B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
}
const delivering = (downside: Omit<DownsideParticipation, 'direction'>, terms: Partial<Product> = {}, principalAmount = 1000): Product => ({
  wrapper: 'note',
  principalAmount,
  term: { months: 12 },
  redemption: { kind: 'bullet' },
  settlement: 'delivery',
  underlier: stock(),
  payoff: { participations: [{ direction: 'downside', ...downside }] },
  ...terms,
})
const barrier = { barrier: { level: 0.45, observation: 'final' as const }, rate: 1 }
const issues = (note: Product) => validateProduct(note).join(' ')
const deliveryAt = (note: Product, levels: DeterminedLevels) => deliveryFrom(note, paymentBreakdown(note, levels), levels.final)
// What the holder receives is worth the payment at the level the asset ended on.
const worth = ({ shares, cash, finalLevel }: { shares: number; cash: number; finalLevel: number }) => shares * finalLevel + cash

describe('the share count and cash of a delivery', () => {
  it.each([
    ['a barrier: Credit Suisse, 40 is 10 shares worth 400', barrier, 1000, 100, 40, 10, 0, 400],
    ['a buffer at rate 1: RBC 2009, 75 is 10 shares and 200', { buffer: 0.2, rate: 1 }, 1000, 100, 75, 10, 200, 950],
    ['a geared buffer: TD 2025, 80 is 111.1111 shares', { buffer: 0.1, rate: 1 / 0.9 }, 10000, 100, 80, 111.1111, 0, 8888.89],
    ['a classic strike at the initial level: 9.50 is 100 shares', { rate: 1 }, 1000, 10, 9.5, 100, 0, 950],
    // The termsheet rounds its 80% strike to 84.43, and its count is 1,000 ÷ 84.43.
    ['a classic strike of 80%: Vontobel, 11.84413 shares', { buffer: 1 - 84.43 / 105.54, rate: 105.54 / 84.43 }, 1000, 105.54, 63.32, 11.84413, 0, 749.97],
    ['a rate below 1: half the fall in shares, the rest in cash', { rate: 0.5 }, 1000, 100, 60, 5, 500, 800],
  ])('%s', (_name, downside, principal, initial, final, shares, cash, value) => {
    const note = delivering(downside, { underlier: stock(initial) }, principal)
    const delivery = deliveryAt(note, { initial, final })!
    expect(delivery.asset).toBe('Stock A')
    expect(delivery.finalLevel).toBe(final)
    expect(delivery.shares).toBeCloseTo(shares, 4)
    expect(delivery.cash).toBeCloseTo(cash, 6)
    expect(worth(delivery)).toBeCloseTo(value, 1)
    expect(worth(delivery)).toBeCloseTo(paymentBreakdown(note, { initial, final }).payment, 6)
  })

  it('states no negative cash for a geared buffer, whose rate is not exact in floating point', () => {
    for (const strike of [0.9, 0.85, 0.8, 0.75, 0.65]) {
      const note = delivering({ buffer: 1 - strike, rate: 1 / strike })
      expect(validateProduct(note)).toEqual([])
      expect(deliveryAt(note, { initial: 100, final: 10 })!.cash).toBe(0)
    }
  })

  it('reads the worst asset, by its own initial level', () => {
    const note = delivering(barrier, { underlier: worstOf })
    const basket = basketBreakdown(worstOf, [[150], [20]])
    const delivery = deliveryFrom(note, paymentBreakdown(note, basket.levels), basket.levels.final, basket)!
    expect(delivery).toMatchObject({ asset: 'Stock B', finalLevel: 20, cash: 0 })
    expect(delivery.shares).toBeCloseTo(20, 9)
    expect(worth(delivery)).toBeCloseTo(paymentBreakdown(note, basket.levels).payment, 9)
  })

  it('reads the determined initial level with lookback', () => {
    const note = delivering({ rate: 1 }, { underlier: { kind: 'single', components: [{ asset: { kind: 'equity', name: 'Stock A' } }], determination: { initial: { kind: 'lookback', observationCount: 2 }, final: { kind: 'final-date' } } } })
    expect(deliveryAt(note, { initial: 80, final: 60 })!.shares).toBeCloseTo(12.5, 9)
  })
})

describe('when a delivery applies', () => {
  it('pays cash for a product settled in cash, or with no settlement stated', () => {
    const { settlement, ...unstated } = delivering(barrier)
    expect(settlement).toBe('delivery')
    expect(deliveryAt(unstated, { initial: 100, final: 40 })).toBeUndefined()
    expect(deliveryAt({ ...unstated, settlement: 'cash' }, { initial: 100, final: 40 })).toBeUndefined()
  })

  it('pays cash at or above the barrier, and on a rise', () => {
    const note = delivering(barrier)
    expect(deliveryAt(note, { initial: 100, final: 45 })).toBeUndefined()
    expect(deliveryAt(note, { initial: 100, final: 120 })).toBeUndefined()
    expect(deliveryAt(note, { initial: 100, final: 44.99 })).toBeDefined()
  })

  it('pays cash at the strike, including where 85 ÷ 100 − 1 falls just outside a 15% buffer', () => {
    const note = delivering({ buffer: 0.15, rate: 1 / 0.85 })
    expect(deliveryAt(note, { initial: 100, final: 85 })).toBeUndefined()
    expect(deliveryAt(note, { initial: 100, final: 84.99 })).toBeDefined()
    const classic = delivering({ rate: 1 })
    expect(deliveryAt(classic, { initial: 100, final: 100 })).toBeUndefined()
    expect(deliveryAt(classic, { initial: 100, final: 99.99 })).toBeDefined()
  })

  it('pays cash when a barrier was reached during the term but the final level is at or above the initial level', () => {
    const note = delivering({ barrier: { level: 0.6, observation: 'daily-close' }, rate: 1 }, { underlier: stock(83.45) })
    const reached = { initial: 83.45, lowestClose: 41.73 }
    expect(deliveryAt(note, { ...reached, final: 90, highestClose: 90 })).toBeUndefined()
    expect(worth(deliveryAt(note, { ...reached, final: 79.28, highestClose: 83.45 })!)).toBeCloseTo(950.03, 2)
    expect(deliveryAt(note, { initial: 83.45, final: 79.28, lowestClose: 60, highestClose: 83.45 })).toBeUndefined()
  })

  it('pays a digital return in cash, and delivers below it: TD 2025', () => {
    const note: Product = { ...delivering({ buffer: 0.1, rate: 1 / 0.9 }, {}, 10000), payoff: { participations: [{ direction: 'downside', buffer: 0.1, rate: 1 / 0.9 }], digitalReturn: { amount: 0.08, barrier: { level: 0.9, observation: 'final' } } } }
    expect(validateProduct(note)).toEqual([])
    expect(deliveryAt(note, { initial: 100, final: 95 })).toBeUndefined()
    expect(deliveryAt(note, { initial: 100, final: 90 })).toBeUndefined()
    expect(deliveryAt(note, { initial: 100, final: 80 })!.shares).toBeCloseTo(111.1111, 4)
  })

  it('pays a fall paid as a gain in cash, and delivers past it', () => {
    const note = delivering({ buffer: 0.2, absoluteReturn: { rate: 1 }, rate: 1 })
    expect(deliveryAt(note, { initial: 100, final: 90 })).toBeUndefined()
    expect(worth(deliveryAt(note, { initial: 100, final: 70 })!)).toBeCloseTo(900, 9)
  })

  it('adds a rebate to the cash, so what is delivered is still worth the payment', () => {
    const note: Product = { ...delivering({ rate: 1 }), payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1, barrier: { level: 1.2, observation: 'daily-close', rebate: 0.02 } }] } }
    const levels = { initial: 100, final: 90, highestClose: 130 }
    const delivery = deliveryAt(note, levels)!
    expect(delivery.cash).toBeCloseTo(20, 9)
    expect(worth(delivery)).toBeCloseTo(paymentBreakdown(note, levels).payment, 9)
  })
})

describe('a final level exactly on a barrier', () => {
  const on = (level: number): Product => ({ ...delivering({ barrier: { level, observation: 'final' }, rate: 1 }), settlement: 'cash' })
  const twoAssets: BasketUnderlier = worstOf

  it.each(Array.from({ length: 99 }, (_, index) => index + 1))('does not reach a barrier at %s%%, on one asset or as the worst of a basket', (percent) => {
    const level = percent / 100
    expect(paymentBreakdown(on(level), { initial: 100, final: percent }).payment).toBe(1000)
    const basketNote: Product = { ...on(level), underlier: twoAssets }
    const basket = basketBreakdown(twoAssets, [[240], [(50 * percent) / 100]])
    expect(paymentBreakdown(basketNote, basket.levels).payment).toBe(1000)
  })
})

describe('what is paid around a delivery', () => {
  const autocall: Product['redemption'] = { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, firstReviewMonth: 6, callAmount: 0 }] }
  // The Credit Suisse note: its payment does not change for being delivered.
  const creditSuisse = delivering(barrier, { term: { months: 24 }, redemption: autocall, coupon: { schedule: { frequency: 'monthly' }, rate: 0.14 } })
  const { settlement: _settlement, ...inCash } = creditSuisse
  const below = Array.from({ length: 18 }, () => 90)

  it('does not change what the product pays', () => {
    for (const final of [100, 45, 40, 0]) expect(redemptionOutcome(creditSuisse, below, { initial: 100, final })).toEqual(redemptionOutcome(inCash, below, { initial: 100, final }))
  })
})

describe('the combinations delivery allows', () => {
  it.each([
    ['one stock, with a barrier', delivering(barrier)],
    ['one stock, with a barrier observed on every close', delivering({ barrier: { level: 0.6, observation: 'daily-close' }, rate: 1 })],
    ['a worst-of basket of stocks', delivering(barrier, { underlier: worstOf })],
    ['a classic strike', delivering({ rate: 1 })],
    ['a strike below the initial level', delivering({ buffer: 0.2, rate: 1.25 })],
    ['a buffer at rate 1', delivering({ buffer: 0.2, rate: 1 })],
    ['a rate below 1', delivering({ rate: 0.5 })],
    ['an explicit cash settlement on an index', { ...delivering(barrier, { underlier: { ...stock(), components: [{ asset: { kind: 'equity-index', name: 'Index' } }] } as Product['underlier'] }), settlement: 'cash' as const }],
  ])('allows %s', (_name, note) => {
    expect(validateProduct(note)).toEqual([])
  })
})

describe('the combinations delivery rejects', () => {
  const single = (kind: 'equity-index' | 'strategy-index'): Product['underlier'] => ({ ...stock(), components: [{ asset: { kind, name: 'Asset' } }] } as Product['underlier'])

  it('needs downside participation, which also rules out a deposit and barrier absolute return', () => {
    const { payoff: _payoff, ...terms } = delivering({ rate: 1 })
    expect(issues({ ...terms, payoff: { participations: [] } })).toContain('Delivery needs downside participation')
    expect(issues({ ...terms, wrapper: 'deposit', payoff: { participations: [{ direction: 'upside', rate: 1 }] } })).toContain('Delivery needs downside participation')
    expect(issues({ ...terms, payoff: { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.2, observation: 'final' } } } })).toContain('Delivery needs downside participation')
  })

  it('needs stocks: an index cannot be delivered, including as one asset of a worst-of', () => {
    expect(issues(delivering(barrier, { underlier: single('equity-index') }))).toContain('Delivery needs stocks')
    expect(issues(delivering(barrier, { underlier: single('strategy-index') }))).toContain('Delivery needs stocks')
    const mixed: BasketUnderlier = { ...worstOf, components: [{ asset: { kind: 'equity', name: 'Stock A' } }, { asset: { kind: 'equity-index', name: 'Stock B' } }] }
    expect(issues(delivering(barrier, { underlier: mixed }))).toContain('Delivery needs stocks')
  })

  it('needs one stock or a worst-of basket', () => {
    const best: BasketUnderlier = { ...worstOf, determination: { ...worstOf.determination, basketReturn: { kind: 'best-of' } } }
    expect(issues(delivering(barrier, { underlier: best }))).toContain('one stock or a worst-of basket')
    const weighted: BasketUnderlier = { ...worstOf, components: worstOf.components.map((component) => ({ ...component, weight: 0.5 })), determination: { ...worstOf.determination, basketReturn: { kind: 'weighted' } } }
    expect(issues(delivering(barrier, { underlier: weighted }))).toContain('one stock or a worst-of basket')
  })

  it('cannot read an averaged final level, since shares are worth their close', () => {
    const averaged: Product['underlier'] = { kind: 'single', components: [{ asset: { kind: 'equity', name: 'Stock A' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: 3 } } }
    expect(issues(delivering(barrier, { underlier: averaged }))).toContain('averaged final level')
  })

  it('cannot sit beside principal protection, though 0% protects nothing', () => {
    const withProtection = (principalProtection: number): Product => ({ ...delivering(barrier), payoff: { participations: [{ direction: 'downside', ...barrier }], principalProtection } })
    expect(issues(withProtection(0.5))).toContain('principal protection')
    expect(validateProduct(withProtection(0))).toEqual([])
  })

  it('cannot have a rate that would leave the holder owing the issuer', () => {
    expect(issues(delivering({ rate: 1.25 }))).toContain('holder would owe')
    expect(issues(delivering({ barrier: { level: 0.6, observation: 'final' }, rate: 1.25 }))).toContain('holder would owe')
    expect(issues(delivering({ buffer: 0.1, rate: 2 }))).toContain('holder would owe')
  })

  it('rejects none of these while settled in cash', () => {
    const cash: Product = { ...delivering({ rate: 1.25 }, { underlier: single('equity-index') }), settlement: 'cash' }
    expect(validateProduct(cash)).toEqual([])
  })
})
