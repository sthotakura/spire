import { describe, expect, it } from 'vitest'
import { paymentBreakdown, withSubFeatures, type Participation, type Product } from '../domain/note'
import { sampleBySlug, sampleProducts } from './examples'
import { marketingNames, productCategory } from './names'

const noteWith = ({ participations = [], principalProtection, cap, buffer }: { participations?: Participation[]; principalProtection?: number; cap?: number; buffer?: number }): Product => ({
  wrapper: 'note',
  redemption: { kind: 'bullet' },
  term: { months: 36 },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: withSubFeatures(participations, { buffer, cap }), principalProtection },
  principalAmount: 1000,
})

const up = (rate: number): Participation => ({ direction: 'upside', rate })
const down = (rate: number): Participation => ({ direction: 'downside', rate })
const namesOf = (payoff: Parameters<typeof noteWith>[0]) => marketingNames(noteWith(payoff)).map(({ name }) => name)

describe('marketing names', () => {
  it('gives a note with no features no name', () => {
    expect(namesOf({})).toEqual([])
  })

  it('calls full protection a principal-protected note', () => {
    expect(namesOf({ principalProtection: 1 })).toEqual(['Principal-protected note'])
  })

  it('calls protection below 100% partial, at any level above zero', () => {
    expect(namesOf({ principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
    expect(namesOf({ principalProtection: 0.1 })).toEqual(['Partially principal-protected note'])
  })

  it('treats 0% protection as no protection', () => {
    expect(namesOf({ principalProtection: 0 })).toEqual([])
    expect(namesOf({ principalProtection: 0, participations: [up(1), down(1)] })).toEqual(['Tracker', 'Delta One'])
  })

  it('calls one-for-one participation both ways a tracker and delta one', () => {
    expect(namesOf({ participations: [up(1), down(1)] })).toEqual(['Tracker', 'Delta One'])
    const deltaOne = marketingNames(noteWith({ participations: [up(1), down(1)] }))[1]
    expect(deltaOne).toMatchObject({ vocabulary: 'Market usage', concepts: ['upside', 'downside'] })
    expect(deltaOne.reason).toContain('a delta of one')
  })

  it('shows Delta One on the delta one sample, and on no other rates', () => {
    expect(marketingNames(sampleBySlug('delta-one-note')!.product).map(({ name }) => name)).toContain('Delta One')
    expect(namesOf({ participations: [up(1.5), down(1)] })).not.toContain('Delta One')
    expect(namesOf({ participations: [up(1), down(0.9)] })).not.toContain('Delta One')
    expect(namesOf({ participations: [up(1)] })).not.toContain('Delta One')
  })

  it('keeps Tracker and Delta One at an adjustment factor, and says the move is scaled, as the payment is', () => {
    const base = noteWith({ participations: [up(1), down(1)] })
    const adjusted: Product = { ...base, redemption: { kind: 'bullet', adjustmentFactor: 0.99 } }
    const names = marketingNames(adjusted)
    expect(names.map(({ name }) => name)).toEqual(['Tracker', 'Delta One'])
    for (const { reason } of names) expect(reason).toContain('a move of 1% of the initial level changes the payment by 0.99% of principal')
    const payment = (final: number) => paymentBreakdown(adjusted, { initial: 100, final }).payment
    expect((payment(101) - payment(100)) / 1000).toBeCloseTo(0.0099, 10)
  })

  it('states the factor exactly, and on every name with a rate, not on one without', () => {
    const withFactor = (payoff: Parameters<typeof noteWith>[0], adjustmentFactor: number) => marketingNames({ ...noteWith(payoff), redemption: { kind: 'bullet', adjustmentFactor } })
    expect(withFactor({ participations: [up(1), down(1)] }, 0.9935)[0].reason).toContain('The adjustment factor of 99.35% multiplies the final level first, so each rate applies to 99.35% of the underlier’s move: at a 100% rate, a move of 1% of the initial level changes the payment by 0.9935% of principal.')
    for (const { reason } of withFactor({ participations: [up(1.5), down(1)] }, 1.01)) expect(reason).toContain('adjustment factor of 101%')
    expect(withFactor({ principalProtection: 1 }, 0.99)[0].reason).not.toContain('adjustment factor')
    expect(withFactor({ participations: [up(1), down(1)] }, 1)[0].reason).not.toContain('adjustment factor')
    expect(withFactor({ participations: [up(1), down(1)] }, 0)[0]?.reason ?? '').not.toContain('adjustment factor')
  })

  it('calls upside above 100% with full downside participation outperformance', () => {
    expect(namesOf({ participations: [up(1.5), down(1)] })).toEqual(['Outperformance', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
  })

  it('calls any other pair of participation rates a participation note', () => {
    expect(namesOf({ participations: [up(0.8), down(1)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1), down(0.9)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1.5), down(0.5)] })).toEqual(['Participation note', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
  })

  it('calls upside participation alone a participation note, at any rate', () => {
    expect(namesOf({ participations: [up(1)] })).toEqual(['Participation note'])
    expect(namesOf({ participations: [up(1.5)] })).toEqual(['Participation note', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
    const [name] = marketingNames(noteWith({ participations: [up(1)] }))
    expect(name.concepts).toEqual(['upside'])
    expect(name.reason).toContain('A fall does not reduce principal')
  })

  it('gives downside participation alone no name', () => {
    expect(namesOf({ participations: [down(1)] })).toEqual([])
  })

  it('calls a cap on upside participation capped participation', () => {
    expect(namesOf({ participations: [up(1.5)], cap: 0.2 })).toEqual(['Capped participation', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
  })

  it('does not call a capped or protected note a tracker or outperformance', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], cap: 0.2 })).toEqual(['Capped participation', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
    expect(namesOf({ participations: [up(1), down(1)], principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
    expect(namesOf({ participations: [up(0.8), down(1)], principalProtection: 0.9 })).toEqual(['Partially principal-protected note'])
  })

  it('returns every name that applies', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], principalProtection: 1, cap: 0.2 })).toEqual(['Principal-protected note', 'Capped participation', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
    expect(namesOf({ participations: [up(1.5)], principalProtection: 0.9, cap: 0.2 })).toEqual(['Partially principal-protected note', 'Capped participation', 'Leveraged participation note', 'PLUS', 'Accelerated return note', 'Return enhanced note'])
  })

  it('names the parts of the note behind each name', () => {
    const [protectedName, capName] = marketingNames(noteWith({ participations: [up(1.5)], principalProtection: 1, cap: 0.2 }))
    expect(protectedName.concepts).toEqual(['protection'])
    expect(capName.concepts).toEqual(['upside', 'cap'])
  })

  it('mentions the Swiss name for full protection only when there is upside participation', () => {
    const [withUpside] = marketingNames(noteWith({ participations: [up(1)], principalProtection: 1 }))
    const [withoutUpside] = marketingNames(noteWith({ principalProtection: 1 }))
    expect(withUpside.reason).toContain('Capital Protection Note with Participation')
    expect(withoutUpside.reason).not.toContain('Capital Protection Note with Participation')
  })

  it('calls a buffer on downside participation a buffered note', () => {
    expect(namesOf({ participations: [up(1), down(1)], buffer: 0.1 })).toEqual(['Buffered note'])
    const [name] = marketingNames(noteWith({ participations: [down(1)], buffer: 0.1 }))
    expect(name.concepts).toEqual(['buffer', 'downside'])
    expect(name.reason).toContain('The first 10% of a fall is absorbed.')
  })

  it('combines the buffered name with the others that apply', () => {
    expect(namesOf({ participations: [up(1.5), down(1)], buffer: 0.1, cap: 0.2 })).toEqual(['Buffered note', 'Capped participation', 'Leveraged participation note', 'Buffered PLUS'])
    expect(namesOf({ participations: [up(1), down(1)], buffer: 0.1, principalProtection: 0.9 })).toEqual(['Partially principal-protected note', 'Buffered note'])
  })

  it('does not call a note with a barrier a tracker or outperformance, and names it for the Swiss bonus types instead', () => {
    const barriered = (participations: Participation[]) => marketingNames({ ...noteWith({ participations }), payoff: { participations: withSubFeatures(participations, { barrier: { level: 0.7, observation: 'final' as const } }) } }).map(({ name }) => name)
    expect(barriered([up(1), down(1)])).toEqual(['Bonus certificate'])
    expect(barriered([up(1.5), down(1)])).toEqual(['Bonus outperformance certificate', 'Leveraged participation note', 'Trigger PLUS', 'Accelerated barrier note', 'Enhanced return note'])
    // Other rates are not what the Swiss types describe.
    expect(barriered([up(0.8), down(1)])).toEqual([])
    expect(barriered([up(1.5), down(0.9)])).toEqual(['Leveraged participation note'])
  })

  it('gives no name to a draft with invalid terms', () => {
    expect(namesOf({ participations: [down(1)], buffer: Number.NaN })).toEqual([])
    expect(namesOf({ participations: [down(1)], buffer: 1.5 })).toEqual([])
    expect(namesOf({ participations: [up(Number.NaN), down(1)], principalProtection: Number.NaN, cap: Number.NaN })).toEqual([])
    expect(namesOf({ principalProtection: 2 })).toEqual([])
    expect(namesOf({ participations: [up(1.5)], cap: -0.1 })).toEqual([])
    expect(namesOf({ participations: [up(0), down(1)] })).toEqual([])
    expect(namesOf({ participations: [up(1), down(Number.NaN)] })).toEqual([])
    expect(namesOf({ participations: [up(Number.NaN)] })).toEqual([])
  })
})

describe('marketing names with an upside barrier', () => {
  const finned = (principalProtection?: number) => marketingNames({ ...noteWith({ principalProtection }), payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate: 0.02 } }), principalProtection } }).map(({ name }) => name)

  const sharkFin = (principalProtection?: number, rebate?: number) => marketingNames({ ...noteWith({ principalProtection }), payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate } }), principalProtection } }).filter(({ name }) => name.startsWith('Shark fin'))

  it('calls upside participation with an upside barrier a shark fin note, not a participation note', () => {
    expect(finned()).toEqual(['Shark fin note'])
    expect(finned(0)).toEqual(['Shark fin note'])
  })

  it('shows the shark fin name whether or not there is a rebate', () => {
    expect(sharkFin(undefined, 0.02).map(({ name }) => name)).toEqual(['Shark fin note'])
    expect(sharkFin(undefined, undefined).map(({ name }) => name)).toEqual(['Shark fin note'])
  })

  it('calls full protection a shark fin PP, in place of the plain name', () => {
    expect(finned(1)).toEqual(['Principal-protected note', 'Shark fin PP'])
  })

  it('keeps the plain name with partial protection, beside the partial protection name', () => {
    expect(finned(0.9)).toEqual(['Partially principal-protected note', 'Shark fin note'])
  })

  it('gives no shark fin name when a fall can reduce principal', () => {
    const withDownside = marketingNames({ ...noteWith({}), payoff: { participations: withSubFeatures([down(1), up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const, rebate: 0.02 } }) } }).map(({ name }) => name)
    expect(withDownside).toEqual([])
    // With full protection the floor bounds the fall, so downside participation does not matter.
    const protectedDownside = marketingNames({ ...noteWith({}), payoff: { participations: withSubFeatures([down(1), up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const } }), principalProtection: 1 } }).map(({ name }) => name)
    expect(protectedDownside).toEqual(['Principal-protected note', 'Shark fin PP'])
  })

  it('says how the final-date version differs from the daily-observed contract, and what each name rests on', () => {
    const [plain] = sharkFin()
    const [pp] = sharkFin(1)
    for (const shark of [plain, pp]) {
      expect(shark.reason).toContain('every trading day')
      expect(shark.reason).toContain('observed only on the final date')
      expect(shark.vocabulary).toBe('Market usage')
    }
    expect(plain.concepts).toEqual(['upside', 'barrier'])
    expect(pp.concepts).toEqual(['protection', 'upside', 'barrier'])
    expect(pp.reason).toContain('PP stands for principal protected')
  })

  it('needs an upside barrier and a note', () => {
    expect(namesOf({ principalProtection: 1, participations: [up(0.8)] })).toEqual(['Principal-protected note'])
    const deposit = marketingNames({ ...noteWith({}), wrapper: 'deposit', payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'final' as const } }) } }).map(({ name }) => name)
    expect(deposit).toEqual(['Market-linked deposit'])
  })
})

describe('marketing names with an upside barrier observed on every close', () => {
  const daily = (principalProtection?: number) => marketingNames({ ...noteWith({ principalProtection }), payoff: { participations: withSubFeatures([up(0.8)], { upsideBarrier: { level: 1.3, observation: 'daily-close' as const, rebate: 0.02 } }), principalProtection } })

  it('shows the same names as for a barrier on the final date, since the name follows the payoff diagram', () => {
    expect(daily().map(({ name }) => name)).toEqual(['Shark fin note'])
    expect(daily(1).map(({ name }) => name)).toEqual(['Principal-protected note', 'Shark fin PP'])
  })

  it('drops the caveat about the final date', () => {
    const [plain] = daily()
    expect(plain.reason).toContain('observed on every close')
    expect(plain.reason).not.toContain('observed only on the final date')
  })
})

describe('marketing names with barrier absolute return', () => {
  const bothWays = (principalProtection?: number, wrapper: 'note' | 'deposit' = 'note') => marketingNames({
    ...noteWith({}),
    wrapper,
    payoff: { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' }, conditionalReturn: 0.02 }, principalProtection },
  })

  it('calls it a barrier absolute return note, as the public product is titled', () => {
    expect(bothWays().map(({ name }) => name)).toEqual(['Barrier absolute return note'])
    expect(bothWays(1).map(({ name }) => name)).toEqual(['Principal-protected note', 'Barrier absolute return note'])
  })

  it('says it is market usage, and rests on the absolute return and the barriers', () => {
    const [name] = bothWays()
    expect(name.vocabulary).toBe('Market usage')
    expect(name.reason).toContain('not a regulator’s')
    expect(name.concepts).toEqual(['absolute-return', 'barrier'])
  })

  it('gives a deposit no such name', () => {
    expect(bothWays(undefined, 'deposit')).toEqual([])
  })
})

describe('product category', () => {
  const categoryOf = (payoff: Parameters<typeof noteWith>[0]) => productCategory(noteWith(payoff))

  it('places a note with any protection above 0% in Capital Protection, partial or full', () => {
    expect(categoryOf({ principalProtection: 1 })).toBe('Capital Protection')
    expect(categoryOf({ principalProtection: 0.1, participations: [up(1)] })).toBe('Capital Protection')
    expect(categoryOf({ principalProtection: 0 })).toBeUndefined()
  })

  it('lets protection decide before a buffer, a cap or the participation', () => {
    expect(categoryOf({ principalProtection: 0.9, participations: [up(1), down(1)], buffer: 0.1, cap: 0.2 })).toBe('Capital Protection')
  })

  it('places an unprotected note that follows the underlier in Participation, buffered or capped alike', () => {
    expect(categoryOf({ participations: [up(1), down(1)] })).toBe('Participation')
    expect(categoryOf({ participations: [up(1.5)], cap: 0.2 })).toBe('Participation')
    expect(categoryOf({ participations: [up(1), down(1)], buffer: 0.1 })).toBe('Participation')
    expect(categoryOf({ participations: [down(1)] })).toBe('Participation')
  })

  it('places no category on a note with no protection and no participation', () => {
    expect(categoryOf({})).toBeUndefined()
  })

  it('places a deposit with upside participation in Capital Protection, because the wrapper repays principal', () => {
    const deposit = { ...noteWith({ participations: [up(1)] }), wrapper: 'deposit' } as Product
    expect(productCategory(deposit)).toBe('Capital Protection')
  })
})

describe('marketing names with a call or a coupon', () => {
  const autocall: Product['redemption'] = { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0 }
  const issuerCall: Product['redemption'] = { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 }
  const coupon: Product['coupon'] = { schedule: { frequency: 'quarterly' }, rate: 0.08, barrier: 0.7 }
  const withTerms = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>): Product => ({ ...noteWith(payoff), ...terms })
  const namesWith = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>) => marketingNames(withTerms(payoff, terms)).map(({ name }) => name)

  it('gives no tracker, outperformance or participation note name when a call or a coupon is added', () => {
    for (const terms of [{ redemption: autocall }, { redemption: issuerCall }, { coupon }]) {
      for (const participations of [[up(1), down(1)], [up(1.5), down(1)], [up(1)]]) {
        expect(namesWith({ participations }, terms)).not.toEqual(expect.arrayContaining([expect.stringMatching(/^(Tracker|Delta One|Outperformance|Participation note)$/)]))
      }
    }
  })

  it('keeps a name that describes the maturity payment, and says what the call and the coupon add', () => {
    const [protectedNote] = marketingNames(withTerms({ principalProtection: 1, participations: [up(1)] }, { redemption: autocall }))
    expect(protectedNote.name).toBe('Principal-protected note')
    expect(protectedNote.reason).toContain('an autocall can end the product earlier')
    const [buffered] = marketingNames(withTerms({ participations: [down(1)], buffer: 0.1 }, { redemption: issuerCall, coupon }))
    expect(buffered.name).toBe('Buffered note')
    expect(buffered.reason).toContain('an issuer call can end the product earlier')
    expect(buffered.reason).toContain('contingent coupon')
  })

  it('adds nothing to the reason on a bullet product with no coupon', () => {
    const [name] = marketingNames(noteWith({ principalProtection: 1 }))
    expect(name.reason).not.toContain('The name describes')
  })

  it('places no Participation category on an unprotected product with a call or a coupon, and lets protection still decide', () => {
    expect(productCategory(withTerms({ participations: [down(1)] }, { redemption: autocall }))).toBeUndefined()
    expect(productCategory(withTerms({ participations: [up(1)] }, { coupon }))).toBeUndefined()
    expect(productCategory(withTerms({ principalProtection: 1, participations: [up(1)] }, { redemption: autocall, coupon }))).toBe('Capital Protection')
  })
})

describe('names for a call and a coupon', () => {
  const autocall: Product['redemption'] = { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0 }
  const issuerCall: Product['redemption'] = { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0 }
  const coupon: Product['coupon'] = { schedule: { frequency: 'quarterly' }, rate: 0.08, barrier: 0.7 }
  const barrierDown: Participation = { direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' } }
  // noteWith sets each downside feature from its own argument, so a barrier on the downside participation is put back here.
  const withTerms = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>): Product => {
    const product = noteWith(payoff)
    const barrier = payoff.participations?.find((participation) => participation.direction === 'downside')?.barrier
    const participations = product.payoff.participations.map((participation) => participation.direction === 'downside' && barrier ? { ...participation, barrier } : participation)
    return { ...product, payoff: { ...product.payoff, participations }, ...terms }
  }
  const namesWith = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>) => marketingNames(withTerms(payoff, terms)).map(({ name }) => name)

  it('calls a note with an autocall autocallable, whatever its payoff', () => {
    expect(namesWith({}, { redemption: autocall })).toEqual(['Autocallable note'])
    expect(namesWith({ principalProtection: 1, participations: [up(1)] }, { redemption: autocall })).toEqual(['Principal-protected note', 'Autocallable note'])
  })

  it('calls an autocall whose call amount grows for each year elapsed a snowball autocall, or one with a step-up premium', () => {
    const snowball = marketingNames(withTerms({}, { redemption: { ...autocall, callAmount: 0.17, callAmountBasis: 'per-year' } }))
    expect(snowball.map(({ name }) => name)).toEqual(['Autocallable note', 'Snowball autocall', 'Autocallable note with step-up premium'])
    expect(snowball[1]).toMatchObject({ vocabulary: 'Market usage', concepts: ['redemption', 'call-amount'] })
    expect(snowball[1].reason).toContain('A call pays 17% for each year elapsed')
    expect(snowball[2]).toMatchObject({ vocabulary: 'Market usage', concepts: ['redemption', 'call-amount'] })
    expect(snowball[2].reason).toContain('steps up by 17% for each year elapsed')
    // A flat call amount, a per-year basis that pays nothing, and an issuer call get neither name.
    expect(namesWith({}, { redemption: { ...autocall, callAmount: 0.17, callAmountBasis: 'flat' } })).not.toContain('Snowball autocall')
    expect(namesWith({}, { redemption: { ...autocall, callAmount: 0, callAmountBasis: 'per-year' } })).not.toContain('Snowball autocall')
    expect(namesWith({}, { redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0.1, callAmountBasis: 'per-year' } })).not.toContain('Snowball autocall')
  })

  it('calls a note with an issuer call callable', () => {
    expect(namesWith({ participations: [down(1)] }, { redemption: issuerCall })).toEqual(['Callable note'])
  })

  it('calls a note with a contingent coupon a contingent coupon note, and says when it has memory', () => {
    expect(namesWith({ participations: [down(1)] }, { coupon })).toEqual(['Contingent coupon note'])
    const [plain] = marketingNames(withTerms({}, { coupon }))
    expect(plain.reason).not.toContain('With memory')
    const [remembered] = marketingNames(withTerms({}, { coupon: { ...coupon!, memory: true } }))
    expect(remembered.reason).toContain('With memory')
  })

  it('does not add the maturity caveat to the names for the call and the coupon', () => {
    for (const { reason } of marketingNames(withTerms({}, { redemption: autocall, coupon }))) expect(reason).not.toContain('The name describes')
  })

  it('calls an unprotected autocall with a coupon and a downside barrier, and no upside, an Express certificate', () => {
    const names = marketingNames(withTerms({ participations: [barrierDown] }, { redemption: autocall, coupon }))
    expect(names.map(({ name }) => name)).toEqual(['Autocallable note', 'Contingent coupon note', 'Express certificate'])
    expect(names[2].concepts).toEqual(['redemption'])
  })

  it('gives no Express name without the autocall, the coupon or the barrier, with a buffer, upside or protection', () => {
    const express = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>) => namesWith(payoff, terms).includes('Express certificate')
    expect(express({ participations: [barrierDown] }, { redemption: issuerCall, coupon })).toBe(false)
    expect(express({ participations: [barrierDown] }, { redemption: autocall })).toBe(false)
    expect(express({ participations: [down(1)] }, { redemption: autocall, coupon })).toBe(false)
    expect(express({ participations: [down(1)], buffer: 0.2 }, { redemption: autocall, coupon })).toBe(false)
    expect(express({ participations: [barrierDown, up(1)] }, { redemption: autocall, coupon })).toBe(false)
    expect(express({ participations: [barrierDown], principalProtection: 0.9 }, { redemption: autocall, coupon })).toBe(false)
  })

  describe('reverse convertible names', () => {
    const fixed: Product['coupon'] = { schedule: { frequency: 'quarterly' }, rate: 0.08 }
    const reverseConvertible = 'Reverse convertible'
    const barrierReverseConvertible = 'Barrier reverse convertible'

    it('calls a fixed coupon with a strike at the initial level and no share in a rise a reverse convertible', () => {
      const names = marketingNames(withTerms({ participations: [down(1)] }, { coupon: fixed, settlement: 'delivery' }))
      expect(names.map(({ name }) => name)).toEqual([reverseConvertible])
      expect(names[0]).toMatchObject({ vocabulary: 'SSPA', concepts: ['coupon', 'downside'] })
      expect(names[0].reason).toContain('Reverse Convertible (1220)')
      expect(names[0].reason).toContain('a strike at the initial level')
      expect(names[0].reason).toContain('it delivers shares')
    })

    it('reads a strike below the initial level from a buffer and the rate that restores the whole fall', () => {
      const names = marketingNames(withTerms({ participations: [down(1.25)], buffer: 0.2 }, { coupon: fixed, settlement: 'delivery' }))
      expect(names.map(({ name }) => name)).toContain(reverseConvertible)
      expect(names.find(({ name }) => name === reverseConvertible)?.reason).toContain('a strike of 80% of the initial level')
      // A rate typed to two decimal places of a percentage still states the strike.
      expect(namesWith({ participations: [down(1.1111)], buffer: 0.1 }, { coupon: fixed, settlement: 'delivery' })).toContain(reverseConvertible)
    })

    it('gives no reverse convertible name to a buffer at another rate, which adds cash beside the shares', () => {
      expect(namesWith({ participations: [down(1)], buffer: 0.2 }, { coupon: fixed, settlement: 'delivery' })).not.toContain(reverseConvertible)
      expect(namesWith({ participations: [down(2)], buffer: 0.2 }, { coupon: fixed, settlement: 'delivery' })).not.toContain(reverseConvertible)
      expect(namesWith({ participations: [down(1.25)] }, { coupon: fixed, settlement: 'delivery' })).not.toContain(reverseConvertible)
    })

    it('calls a fixed coupon with a downside barrier at rate 1 and no share in a rise a barrier reverse convertible', () => {
      const names = marketingNames(withTerms({ participations: [barrierDown] }, { coupon: fixed, settlement: 'delivery' }))
      expect(names.map(({ name }) => name)).toEqual([barrierReverseConvertible])
      expect(names[0]).toMatchObject({ vocabulary: 'SSPA', concepts: ['coupon', 'barrier'] })
      expect(names[0].reason).toContain('Barrier Reverse Convertible (1230)')
      expect(names[0].reason).toContain('60%')
      expect(names[0].reason).toContain('knock-in')
      expect(namesWith({ participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'daily-close' } }] }, { coupon: fixed, settlement: 'delivery' })).toContain(barrierReverseConvertible)
      expect(namesWith({ participations: [{ direction: 'downside', rate: 1.25, barrier: { level: 0.6, observation: 'final' } }] }, { coupon: fixed, settlement: 'delivery' })).not.toContain(barrierReverseConvertible)
    })

    it('keeps the name beside a call, since the Swiss and US types can both be called', () => {
      expect(namesWith({ participations: [barrierDown] }, { coupon: fixed, settlement: 'delivery', redemption: autocall })).toEqual(['Autocallable note', barrierReverseConvertible])
      expect(namesWith({ participations: [down(1)] }, { coupon: fixed, settlement: 'delivery', redemption: issuerCall })).toEqual(['Callable note', reverseConvertible])
    })

    it('gives neither name without a fixed coupon or a downside, or with upside, protection, a digital return or an absolute return', () => {
      const either = (payoff: Parameters<typeof noteWith>[0], terms: Partial<Product>) => namesWith(payoff, terms).filter((name) => name === reverseConvertible || name === barrierReverseConvertible)
      const digitalReturn = { amount: 0.1, barrier: { level: 0.7, observation: 'final' as const } }
      expect(either({ participations: [barrierDown] }, { coupon, settlement: 'delivery' })).toEqual([])
      expect(either({ participations: [down(1)] }, { settlement: 'delivery' })).toEqual([])
      expect(either({}, { coupon: fixed, settlement: 'delivery' })).toEqual([])
      expect(either({ participations: [down(1), up(1)] }, { coupon: fixed, settlement: 'delivery' })).toEqual([])
      expect(either({ participations: [down(1)], principalProtection: 0.9 }, { coupon: fixed, settlement: 'delivery' })).toEqual([])
      const withDigital = withTerms({ participations: [barrierDown] }, { coupon: fixed, settlement: 'delivery' })
      expect(marketingNames({ ...withDigital, payoff: { ...withDigital.payoff, digitalReturn } }).map(({ name }) => name)).not.toContain(barrierReverseConvertible)
      // noteWith drops an absolute return, so it is set on the product directly.
      const withAbsolute: Product = { ...withDigital, payoff: { participations: [{ direction: 'downside', rate: 1, barrier: { level: 0.6, observation: 'final' }, absoluteReturn: { rate: 1 } }] } }
      expect(marketingNames(withAbsolute).map(({ name }) => name)).not.toContain(barrierReverseConvertible)
    })

    it('gives neither name to a product settled in cash', () => {
      expect(namesWith({ participations: [barrierDown] }, { coupon: fixed, settlement: 'cash' })).not.toContain(barrierReverseConvertible)
      expect(namesWith({ participations: [barrierDown] }, { coupon: fixed })).not.toContain(barrierReverseConvertible)
      expect(namesWith({ participations: [down(1)] }, { coupon: fixed })).not.toContain(reverseConvertible)
    })

    it('shows the barrier name only on the sample that delivers, and not on the fixed coupon samples settled in cash', () => {
      const of = (slug: string) => marketingNames(sampleBySlug(slug)!.product).map(({ name }) => name)
      expect(of('autocallable-worst-of-barrier-reverse-convertible')).toContain(barrierReverseConvertible)
      expect(of('worst-of-fixed-coupon-autocallable-note')).not.toContain(barrierReverseConvertible)
      expect(of('monthly-worst-of-fixed-coupon-autocallable-note')).not.toContain(barrierReverseConvertible)
      expect(of('autocallable-contingent-coupon-note')).not.toContain(barrierReverseConvertible)
    })
  })

  it('names the Swiss Capital Protection Certificate with Coupon for a protected note with a coupon and no upside', () => {
    const [protectedNote] = marketingNames(withTerms({ principalProtection: 1 }, { coupon }))
    expect(protectedNote.reason).toContain('Capital Protection Certificate with Coupon')
    const [withUpside] = marketingNames(withTerms({ principalProtection: 1, participations: [up(1)] }, { coupon }))
    expect(withUpside.reason).toContain('Capital Protection Note with Participation')
  })

  it('gives a deposit none of these names', () => {
    expect(marketingNames({ ...withTerms({ participations: [up(1)] }, { redemption: autocall, coupon }), wrapper: 'deposit' }).map(({ name }) => name)).toEqual(['Market-linked deposit'])
  })

  it('places an unprotected note with a coupon and no upside in Yield Enhancement, with or without a call', () => {
    expect(productCategory(withTerms({ participations: [barrierDown] }, { redemption: autocall, coupon }))).toBe('Yield Enhancement')
    expect(productCategory(withTerms({ participations: [down(1)] }, { coupon }))).toBe('Yield Enhancement')
    expect(productCategory(withTerms({}, { redemption: issuerCall, coupon }))).toBe('Yield Enhancement')
    expect(productCategory(withTerms({ participations: [up(1)] }, { coupon }))).toBeUndefined()
    expect(productCategory(withTerms({ principalProtection: 1 }, { coupon }))).toBe('Capital Protection')
  })
})

describe('marketing names for a barrier on downside participation', () => {
  const barriered = (terms: { up?: number; down?: number; observation?: 'final' | 'daily-close'; absolute?: number; cap?: number; protection?: number; buffer?: number } = {}): Product => ({
    ...noteWith({ participations: [], principalProtection: terms.protection }),
    payoff: {
      participations: [
        { direction: 'downside', rate: terms.down ?? 1, barrier: { level: 0.7, observation: terms.observation ?? 'final' }, buffer: terms.buffer, absoluteReturn: terms.absolute === undefined ? undefined : { rate: terms.absolute } },
        { direction: 'upside', rate: terms.up ?? 1, cap: terms.cap },
      ],
      principalProtection: terms.protection,
    },
  })
  const names = (product: Product) => marketingNames(product).map(({ name }) => name)

  it('calls an uncapped barrier note with 1:1 upside a bonus certificate, and a leveraged one a bonus outperformance certificate', () => {
    expect(names(barriered())).toEqual(['Bonus certificate'])
    expect(names(barriered({ up: 1.7 }))).toEqual(['Bonus outperformance certificate', 'Leveraged participation note', 'Trigger PLUS', 'Accelerated barrier note', 'Enhanced return note'])
  })

  it('says the Swiss barrier is observed during the life, and that this one is read on the final date, unless it is observed on every close', () => {
    expect(marketingNames(barriered())[0].reason).toContain('read on the final date only, so the contract differs')
    expect(marketingNames(barriered({ observation: 'daily-close' }))[0].reason).toContain('as this one is, on every close')
  })

  it('says when the initial level is a lookback level', () => {
    const lookback: Product = { ...barriered(), underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } } } }
    expect(marketingNames(lookback)[0].reason).toContain('lookback level, which the Swiss type does not have')
  })

  it('calls the same note with absolute return above the barrier a twin-win certificate', () => {
    const [twin] = marketingNames(barriered({ up: 1.25, absolute: 0.5 }))
    expect(twin.name).toBe('Twin-win certificate')
    expect(twin.vocabulary).toBe('SSPA')
    expect(twin.concepts).toEqual(['upside', 'downside', 'barrier', 'absolute-return'])
    expect(twin.reason).toContain('125% of a rise and 50% of a fall')
  })

  it('gives no such name to a capped, protected or buffered note, or one with a coupon, a call or a digital return', () => {
    expect(names(barriered({ cap: 0.2 }))).toEqual(['Capped participation'])
    expect(names(barriered({ protection: 0.9 }))).toEqual(['Partially principal-protected note'])
    expect(names({ ...barriered(), coupon: { schedule: { frequency: 'quarterly' }, rate: 0.08, barrier: 0.7, memory: false }, term: { months: 36 } })).toEqual(['Contingent coupon note'])
    expect(names({ ...barriered(), redemption: { kind: 'autocall', schedule: { frequency: 'annual' }, trigger: 1, callAmount: 0.1 } })).toEqual(['Autocallable note'])
    expect(names({ ...barriered(), payoff: { ...barriered().payoff, digitalReturn: { amount: 0.2, barrier: { level: 0.9, observation: 'final' } } } })).toEqual(['Digital return note'])
  })
})

describe('marketing names for a digital return', () => {
  const digital: Product = { ...noteWith({ participations: [up(1), down(1)] }), payoff: { participations: [up(1), down(1)], digitalReturn: { amount: 0.0808, barrier: { level: 0.71, observation: 'final' } } } }

  it('names it the digital return note, as issuers title it, with the amount and the level', () => {
    const [name, ...rest] = marketingNames(digital)
    expect(rest).toEqual([])
    expect(name.name).toBe('Digital return note')
    expect(name.vocabulary).toBe('Market usage')
    expect(name.concepts).toEqual(['digital-return'])
    expect(name.reason).toContain('8.08% on principal')
    expect(name.reason).toContain('71% of the initial level')
  })

  it('does not say the name fails to cover the digital return', () => {
    expect(marketingNames(digital)[0].reason).not.toContain('does not cover the digital return')
  })

  it('is not given to a deposit', () => {
    expect(marketingNames({ ...digital, wrapper: 'deposit' }).map(({ name }) => name)).not.toContain('Digital return note')
  })
})

describe('issuer titles for a rise shared at more than 100%', () => {
  const plain = ['PLUS', 'Accelerated return note', 'Return enhanced note']
  const product = (participations: Participation[], payoff: Partial<Product['payoff']> = {}, terms: Partial<Product> = {}): Product => ({ ...noteWith({}), payoff: { participations, ...payoff }, ...terms })
  const barrier = { level: 0.7, observation: 'final' as const }
  const titles = (item: Product) => marketingNames(item).filter(({ vocabulary }) => vocabulary === 'Issuer title')
  const titleNames = (item: Product) => titles(item).map(({ name }) => name)

  it('gives the plain titles above 100% and none at 100% or below', () => {
    expect(titleNames(product([up(1.01), down(1)]))).toEqual(plain)
    expect(titleNames(product([up(1), down(1)]))).toEqual([])
    expect(titleNames(product([up(0.8), down(1)]))).toEqual([])
    expect(titles(product([up(3), down(1)]))[0].reason).toContain('A rise pays 300% of its size.')
  })

  it('keeps the plain titles whatever a fall does, since they describe the upside, and says when the contract differs', () => {
    for (const item of [product([up(1.5)]), product([up(1.5), down(0.5)]), product([up(1.5), down(1)], { principalProtection: 1 }), product([up(1.5)], { principalProtection: 0.9 })]) {
      expect(titleNames(item)).toEqual(plain)
      for (const { reason } of titles(item)) expect(reason).toContain('lose principal one for one on a fall, so the contract differs')
    }
    expect(titles(product([up(1.5)]))[0].reason).toContain('A fall leaves principal unchanged here.')
    expect(titles(product([up(1.5), down(0.5)]))[0].reason).toContain('A fall does not cost principal one for one here.')
    expect(titles(product([up(1.5), down(1)]))[0].reason).toContain('A fall costs principal one for one.')
    expect(titles(product([up(1.5), down(1)]))[0].reason).not.toContain('lose principal one for one on a fall')
  })

  it('keeps a title that names a downside shape to a note with that shape and principal at risk', () => {
    expect(titleNames(product([{ direction: 'downside', rate: 1, buffer: 0.15 }, up(1.5)], { principalProtection: 0.9 }))).toEqual([])
    expect(titleNames(product([{ direction: 'downside', rate: 1, barrier }, up(1.5)], { principalProtection: 1 }))).toEqual([])
    expect(titleNames(product([up(1.5)], { digitalReturn: { amount: 0.16, barrier: { level: 1, observation: 'final' } } }))).toEqual([])
  })

  it('gives none where the filings do not pay this way', () => {
    expect(titleNames(product([up(1.5), down(1)], {}, { coupon: { schedule: { frequency: 'quarterly' }, rate: 0.08 } }))).toEqual([])
    expect(titleNames(product([up(1.5), down(1)], {}, { redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0 } }))).toEqual([])
    expect(titleNames(product([up(1.5), down(1)], {}, { settlement: 'delivery' }))).toEqual([])
    expect(titleNames(product([up(1.5), down(1)], {}, { wrapper: 'deposit' }))).toEqual([])
    expect(titleNames(product([{ direction: 'upside', rate: 1.5, barrier: { level: 1.3, observation: 'final' } }, down(1)]))).toEqual([])
    expect(titleNames(product([{ direction: 'upside', rate: 1.5, cap: -0.1 }, down(1)]))).toEqual([])
    expect(titleNames(product([up(Number.NaN), down(1)]))).toEqual([])
  })

  it('says when a title capped in its filings has no cap here, and states the cap when it has one', () => {
    for (const { reason } of titles(product([up(3), down(1)]))) expect(reason).toContain('have a maximum return and this note has none')
    for (const { reason } of titles(product([{ direction: 'upside', rate: 3, cap: 0.13 }, down(1)]))) {
      expect(reason).toContain('up to the 13% cap')
      expect(reason).not.toContain('the contract differs')
    }
  })

  it('names a buffer at rate 1 a buffered PLUS, and one at the rate that restores the fall a buffered return enhanced note', () => {
    const buffered = (rate: number) => titleNames(product([{ direction: 'downside', rate, buffer: 0.15 }, up(1.26)]))
    expect(buffered(1)).toEqual(['Buffered PLUS'])
    expect(buffered(1.1765)).toEqual(['Buffered return enhanced note'])
    expect(buffered(1.5)).toEqual([])
  })

  it('names a barrier read on the final date for all three issuers, and gives a barrier read every close none', () => {
    expect(titleNames(product([{ direction: 'downside', rate: 1, barrier }, up(1.5)]))).toEqual(['Trigger PLUS', 'Accelerated barrier note', 'Enhanced return note'])
    expect(titleNames(product([{ direction: 'downside', rate: 1, barrier: { level: 0.7, observation: 'daily-close' } }, up(1.5)]))).toEqual([])
    const capped = titles(product([{ direction: 'downside', rate: 1, barrier }, { direction: 'upside', rate: 1.5, cap: 0.3 }]))
    expect(capped.find(({ name }) => name === 'Trigger PLUS')?.reason).not.toContain('the contract differs')
    expect(capped.find(({ name }) => name === 'Enhanced return note')?.reason).toContain('have no maximum return and this note has a cap')
  })

  it('names absolute return on a fall dual directional, and only for PLUS', () => {
    expect(titleNames(product([{ direction: 'downside', rate: 1, buffer: 0.2, absoluteReturn: { rate: 1 } }, up(1.39)]))).toEqual(['Dual directional buffered PLUS'])
    expect(titleNames(product([{ direction: 'downside', rate: 1, barrier, absoluteReturn: { rate: 0.5 } }, up(1.25)]))).toEqual(['Dual directional trigger PLUS'])
  })

  it('names a digital return at a 100% barrier beside leverage a leveraged market-linked step up note', () => {
    const stepUp = (level: number, participations: Participation[] = [up(1.24), down(1)]) => product(participations, { digitalReturn: { amount: 0.16, barrier: { level, observation: 'final' } } })
    const [title] = titles(stepUp(1))
    expect(title.name).toBe('Leveraged market-linked step up note')
    expect(title.reason).toContain('a fixed return of 16%')
    expect(marketingNames(stepUp(1)).map(({ name }) => name)).toEqual(['Digital return note', 'Leveraged participation note', 'Leveraged market-linked step up note'])
    expect(titleNames(stepUp(0.9))).toEqual([])
    expect(titleNames(stepUp(1, [up(1), down(1)]))).toEqual([])
    expect(titleNames(stepUp(1, [{ direction: 'upside', rate: 1.24, cap: 0.5 }, down(1)]))).toEqual([])
  })

  it('gives the samples built from such filings the title on the filing', () => {
    const of = (slug: string) => titleNames(sampleBySlug(slug)!.product)
    expect(of('worst-of-dual-directional-buffered-note')).toEqual(['Dual directional buffered PLUS'])
    expect(of('worst-of-dual-directional-barrier-note')).toEqual(['Dual directional trigger PLUS'])
    expect(of('lookback-barrier-note')).toContain('Accelerated barrier note')
    expect(of('dual-directional-buffered-note')).toEqual([])
  })
})

describe('the leveraged participation note', () => {
  const name = 'Leveraged participation note'
  const product = (participations: Participation[], terms: Partial<Product> = {}): Product => ({ ...noteWith({}), payoff: { participations }, ...terms })
  const has = (item: Product) => marketingNames(item).some((each) => each.name === name)

  it('is shown above 100% whatever the fall does, and not at 100% or below', () => {
    expect(has(product([up(1.01)]))).toBe(true)
    expect(has(product([up(3), down(1)]))).toBe(true)
    expect(has(product([up(1)]))).toBe(false)
    expect(has(product([up(0.8)]))).toBe(false)
    expect(has(product([down(1)]))).toBe(false)
  })

  it('states the rate and rests on the upside', () => {
    const found = marketingNames(product([up(3)])).find((each) => each.name === name)
    expect(found).toMatchObject({ vocabulary: 'US descriptive', concepts: ['upside'] })
    expect(found?.reason).toContain('A rise pays 300% of its size')
  })

  it('is kept beside a call, whose reason says it can end earlier, and is not given to a deposit', () => {
    const called = marketingNames(product([up(1.5)], { redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0 } })).find((each) => each.name === name)
    expect(called?.reason).toContain('an autocall can end the product earlier')
    expect(has(product([up(1.5)], { wrapper: 'deposit' }))).toBe(false)
  })

  it('is not given to a draft with an invalid cap or downside rate', () => {
    expect(has(product([{ direction: 'upside', rate: 1.5, cap: -0.1 }]))).toBe(false)
    expect(has(product([up(1.5), down(Number.NaN)]))).toBe(false)
  })
})

describe('marketing names for the samples', () => {
  it('gives every sample at least one name', () => {
    const none = sampleProducts.filter(({ product }) => marketingNames(product).length === 0).map(({ name }) => name)
    expect(none).toEqual([])
  })
})
