import { describe, expect, it } from 'vitest'
import { basketBreakdown, maturityPayment, paymentBreakdown, productIssues, type BarrierAbsoluteReturn, type BasketUnderlier, type DownsideParticipation, type Product, type SingleProduct, type UpsideParticipation } from './note'

// Synthetic: the worked examples in docs/digital-return.md. A Citigroup-shaped note pays the greater of the digital return and the
// worst return from the barrier up; a BMO-shaped note has no upside participation, so a rise pays the digital return alone.
const base: SingleProduct = {
  wrapper: 'note',
  redemption: 'bullet',
  term: { months: 36 },
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }],
    determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } },
  },
  payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] },
  principalAmount: 1000,
}
const withDownside = (product: SingleProduct, terms: Partial<DownsideParticipation>): SingleProduct => ({
  ...product,
  payoff: { ...product.payoff, participations: product.payoff.participations.map((p) => p.direction === 'downside' ? { ...p, ...terms } : p) },
})
const withUpside = (product: SingleProduct, terms: Partial<UpsideParticipation>): SingleProduct => ({
  ...product,
  payoff: { ...product.payoff, participations: product.payoff.participations.map((p) => p.direction === 'upside' ? { ...p, ...terms } : p) },
})
const withDigital = <T extends Product>(product: T, amount: number, level: number): T => ({ ...product, payoff: { ...product.payoff, digitalReturn: { amount, barrier: { level, observation: 'final' } } } })

const citi = withDigital(base, 0.26, 0.7)
const bmo = withDigital({ ...base, payoff: { participations: [{ direction: 'downside', rate: 1 }] } }, 0.0808, 0.71)

describe('digital return payment', () => {
  it.each([
    [150, 1500],
    [126, 1260],
    [105, 1260],
    [100, 1260],
    [90, 1260],
    [70, 1260],
    [69.99, 699.9],
    [30, 300],
  ])('pays the greater of the digital return and the worst return at a final level of %s: %s', (final, payment) => {
    expect(maturityPayment(citi, { initial: 100, final })).toBeCloseTo(payment, 8)
  })

  it.each([
    [140, 1080.8],
    [90, 1080.8],
    [71, 1080.8],
    [70.99, 709.9],
    [40, 400],
    [0, 0],
  ])('pays the digital return alone with no upside participation, at a final level of %s: %s', (final, payment) => {
    expect(maturityPayment(bmo, { initial: 100, final })).toBeCloseTo(payment, 8)
  })

  it('meets the barrier at its level and not below it', () => {
    expect(paymentBreakdown(citi, { initial: 100, final: 70 }).digitalReturn?.reached).toBe(true)
    expect(paymentBreakdown(citi, { initial: 100, final: 69.99 }).digitalReturn?.reached).toBe(false)
  })

  it('puts a level on the right side of a barrier that floating point cannot state exactly', () => {
    // 0.57 × 100 is 56.99999999999999 in floating point.
    const product = withDigital(base, 0.2, 0.57)
    expect(paymentBreakdown(product, { initial: 100, final: 57 }).digitalReturn?.reached).toBe(true)
    expect(maturityPayment(product, { initial: 100, final: 57 })).toBeCloseTo(1200, 8)
  })

  it('reports the barrier as a level and the floor as an amount', () => {
    const { digitalReturn } = paymentBreakdown(citi, { initial: 200, final: 190 })
    expect(digitalReturn?.barrierLevel).toBe(140)
    expect(digitalReturn?.reached).toBe(true)
    expect(digitalReturn?.floor).toBeCloseTo(1260, 8)
    const below = paymentBreakdown(citi, { initial: 100, final: 50 })
    expect(below.digitalReturn?.reached).toBe(false)
    expect(below.floorApplies).toBe(false)
    expect(paymentBreakdown(citi, { initial: 100, final: 90 }).floorApplies).toBe(true)
    expect(paymentBreakdown(citi, { initial: 100, final: 150 }).floorApplies).toBe(false)
  })

  it('reports no digital return when the product has none', () => {
    expect(paymentBreakdown(base, { initial: 100, final: 90 }).digitalReturn).toBeUndefined()
  })

  it('pays a fixed return from the initial level up with a barrier at 100%', () => {
    const jump = withDigital(base, 0.153, 1)
    expect(maturityPayment(jump, { initial: 100, final: 100 })).toBeCloseTo(1153, 8)
    expect(maturityPayment(jump, { initial: 100, final: 130 })).toBeCloseTo(1300, 8)
    expect(maturityPayment(jump, { initial: 100, final: 99.99 })).toBeCloseTo(999.9, 8)
  })
})

describe('digital return beside other features', () => {
  it('raises the payment but never lowers it, beside principal protection', () => {
    const protectedNote = withDigital({ ...base, payoff: { ...base.payoff, principalProtection: 1 } }, 0.1, 0.9)
    expect(maturityPayment(protectedNote, { initial: 100, final: 95 })).toBeCloseTo(1100, 8)
    expect(maturityPayment(protectedNote, { initial: 100, final: 60 })).toBeCloseTo(1000, 8)
  })

  it('beside a buffer, pays the digital return within its barrier, principal within the buffer, and a loss beyond it', () => {
    // A 20% buffer and a digital barrier at 85%, as in the JPMorgan note: a 10% fall pays the digital return, 84.99 principal, 70 a loss.
    const buffered = withDigital(withDownside(base, { buffer: 0.2 }), 0.087, 0.85)
    expect(maturityPayment(buffered, { initial: 100, final: 90 })).toBeCloseTo(1087, 8)
    expect(maturityPayment(buffered, { initial: 100, final: 84.99 })).toBeCloseTo(1000, 8)
    expect(maturityPayment(buffered, { initial: 100, final: 70 })).toBeCloseTo(900, 8)
  })

  it('beside a downside barrier at another level, reads each at its own level', () => {
    const both = withDigital(withDownside(base, { barrier: { level: 0.6, observation: 'final' } }), 0.1, 0.8)
    expect(maturityPayment(both, { initial: 100, final: 85 })).toBeCloseTo(1100, 8)
    expect(maturityPayment(both, { initial: 100, final: 70 })).toBeCloseTo(1000, 8)
    expect(maturityPayment(both, { initial: 100, final: 59 })).toBeCloseTo(590, 8)
  })

  it('beside absolute return, pays the greater of the two where the digital barrier is met', () => {
    const dual = withDigital(withDownside(base, { barrier: { level: 0.7, observation: 'final' }, absoluteReturn: { rate: 0.5 } }), 0.2, 0.9)
    expect(maturityPayment(dual, { initial: 100, final: 95 })).toBeCloseTo(1200, 8)
    expect(maturityPayment(dual, { initial: 100, final: 85 })).toBeCloseTo(1075, 8)
    expect(maturityPayment(dual, { initial: 100, final: 69 })).toBeCloseTo(690, 8)
  })

  it('beside a cap above it, the cap limits a rise and the digital return limits a fall', () => {
    const capped = withDigital(withUpside(base, { cap: 0.3 }), 0.26, 0.7)
    expect(maturityPayment(capped, { initial: 100, final: 150 })).toBeCloseTo(1300, 8)
    expect(maturityPayment(capped, { initial: 100, final: 105 })).toBeCloseTo(1260, 8)
  })

  it('reads the final level a determination produces: the worst of a basket', () => {
    const underlier: BasketUnderlier = {
      kind: 'basket',
      components: [
        { asset: { kind: 'equity-index', name: 'Synthetic Index A' } },
        { asset: { kind: 'equity-index', name: 'Synthetic Index B' } },
      ],
      determination: {
        initial: { kind: 'given', levels: [{ asset: 'Synthetic Index A', level: 100 }, { asset: 'Synthetic Index B', level: 50 }] },
        final: { kind: 'final-date' },
        basketReturn: { kind: 'worst-of' },
      },
    }
    const worstOf: Product = { ...citi, underlier }
    // Index B is down 10%, above the barrier at -30%, so the digital return is paid.
    expect(maturityPayment(worstOf, basketBreakdown(underlier, [[140], [45]]).levels)).toBeCloseTo(1260, 8)
    // Index B down 40% is below the barrier, so the worst return is borne.
    expect(maturityPayment(worstOf, basketBreakdown(underlier, [[140], [30]]).levels)).toBeCloseTo(600, 8)
  })
})

describe('digital return validation', () => {
  it('accepts the examples', () => {
    expect(productIssues(citi)).toEqual([])
    expect(productIssues(bmo)).toEqual([])
    expect(productIssues(withDigital(base, 0.15, 1))).toEqual([])
  })

  it.each([0, -0.1, Number.NaN, Infinity])('rejects an amount of %s', (amount) => {
    expect(productIssues(withDigital(base, amount, 0.7))).toEqual([{ field: 'digitalReturn', message: 'Digital return must be greater than zero.' }])
  })

  it.each([0, -0.1, 1.01, Number.NaN])('rejects a barrier at %s', (level) => {
    expect(productIssues(withDigital(base, 0.26, level))).toEqual([{ field: 'digitalReturn', message: 'Digital barrier must be greater than 0% and at most 100% of the initial level.' }])
  })

  it('requires the amount to be below the cap', () => {
    expect(productIssues(withDigital(withUpside(base, { cap: 0.3 }), 0.3, 0.7))).toEqual([{ field: 'digitalReturn', message: 'Digital return must be less than the cap.' }])
    expect(productIssues(withDigital(withUpside(base, { cap: 0.3 }), 0.29, 0.7))).toEqual([])
  })

  it('is not available on a deposit', () => {
    const deposit: Product = { ...base, wrapper: 'deposit', payoff: { participations: [{ direction: 'upside', rate: 1 }] } }
    expect(productIssues(withDigital(deposit, 0.26, 0.7))).toEqual([{ field: 'digitalReturn', message: 'A digital return is available on notes only.' }])
  })

  it('cannot be combined with an upside barrier, absolute return in both directions or a minimum return', () => {
    const upsideBarrier = withDigital(withUpside(base, { barrier: { level: 1.3, observation: 'final' } }), 0.26, 0.7)
    expect(productIssues(upsideBarrier)).toEqual([{ field: 'digitalReturn', message: 'A digital return cannot be combined with an upside barrier.' }])
    const barrierAbsolute: BarrierAbsoluteReturn = { rate: 1, lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.2, observation: 'final' } }
    const both: Product = { ...base, payoff: { participations: [], barrierAbsoluteReturn: barrierAbsolute, digitalReturn: citi.payoff.digitalReturn } }
    expect(productIssues(both)).toEqual([{ field: 'digitalReturn', message: 'A digital return cannot be combined with absolute return in both directions.' }])
    const minimum: Product = { ...citi, payoff: { ...citi.payoff, minimumReturn: 0.05 } }
    expect(productIssues(minimum).map(({ message }) => message)).toContain('A digital return cannot be combined with a minimum return.')
  })

  it('stops a payment being computed from an invalid digital return', () => {
    expect(() => maturityPayment(withDigital(base, 0, 0.7), { initial: 100, final: 90 })).toThrow('Digital return must be greater than zero.')
  })
})
