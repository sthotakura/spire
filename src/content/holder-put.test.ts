import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import type { EarlyMechanism, Product } from '../domain/note'
import { explainRedemption, redemptionFormula, redemptionSteps, reviewTableRows } from './autocall'
import { marketingNames, productCategory } from './names'
import { scenarioAside } from './path'
import { structureLines } from './structure-json'
import { summarize } from './summary'

const put: EarlyMechanism = { kind: 'holder-put', schedule: { frequency: 'semi-annual' }, firstReviewMonth: 12 }
const issuerCall: EarlyMechanism = { kind: 'issuer-call', schedule: { frequency: 'semi-annual' }, firstReviewMonth: 12, callAmount: 0 }
const tracker = (mechanisms: EarlyMechanism[] = [put], terms: Partial<Product> = {}): Product => ({
  wrapper: 'note',
  principalAmount: 1000,
  term: { months: 24 },
  redemption: { kind: 'early-redemption', mechanisms },
  underlier: { kind: 'single', components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }], determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } } },
  payoff: { participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }] },
  ...terms,
})
const text = (note: Product) => summarize(note).map(({ text }) => text).join('')
const levels = { initial: 100, final: 110 }

describe('what a holder put says', () => {
  it('says when the holder may put and what it pays, in the summary', () => {
    expect(text(tracker())).toContain(' that the holder may put early on any semi-annual review from month 12 before maturity, paying what the payoff gives at that review’s level, and otherwise redeems at maturity')
    const both = text(tracker([issuerCall, put]))
    expect(both).toContain('that the issuer may call early on any semi-annual review from month 12 before maturity, repaying principal, and that the holder may put early')
  })

  it('has a rule of its own beside the calls', () => {
    const lines = redemptionFormula(tracker([issuerCall, put]))
    expect(lines.map(({ lead }) => lead)).toEqual(['Call', 'Holder put'])
    expect(lines[1].segments.map(({ text }) => text).join('')).toBe('On a review from month 12 before the last, if the holder puts, pay the payment at maturity, with the level on that review as the final level and end')
  })

  it('tags its lines in the structure JSON', () => {
    const lines = structureLines(tracker())
    expect(lines.find(({ text }) => text.includes('"holder-put"'))?.concept).toBe('holder-put')
    expect(lines.find(({ text }) => text.includes('"frequency"'))?.concept).toBe('put-schedule')
    expect(lines.find(({ text }) => text.includes('"firstReviewMonth"'))?.concept).toBe('put-first-review')
  })

  it('adds no row to the review table: it reads no level on its reviews', () => {
    expect(reviewTableRows(tracker())).toEqual([])
  })

  it('keeps the names of a tracker, since a put pays the same formula, and says the put can end it earlier', () => {
    const names = marketingNames(tracker())
    expect(names.map(({ name }) => name)).toEqual(['Tracker', 'Delta One'])
    expect(names[0].reason).toContain('A holder put can end the product earlier, paying the same formula at the level on the put review.')
    expect(productCategory(tracker())).toBe('Participation')
  })

  it('names the holder put among what can end the product early beside a call', () => {
    const reasons = marketingNames(tracker([issuerCall, put], { payoff: { participations: [{ direction: 'upside', rate: 1.5 }, { direction: 'downside', rate: 1 }] } })).map(({ reason }) => reason).join(' ')
    expect(reasons).toContain('an issuer call or a holder put can end the product earlier')
  })
})

describe('how a holder put ended the product', () => {
  it('says the holder put, on which review, the level and what it pays against principal', () => {
    const up = redemptionOutcome(tracker(), [], levels, { holderPut: { review: 1, level: 120 } })
    expect(explainRedemption(tracker(), up)).toBe('The holder put the product on review 1 of 3, after 12 months, and it pays 1,200, 200 more than principal: what the payoff gives at that review’s level of 120.')
    const down = redemptionOutcome(tracker(), [], levels, { holderPut: { review: 2, level: 80 } })
    expect(explainRedemption(tracker(), down)).toBe('The holder put the product on review 2 of 3, after 18 months, and it pays 800, 200 less than principal: what the payoff gives at that review’s level of 80.')
  })

  it('says the holder did not put when the product ran to the end', () => {
    expect(explainRedemption(tracker(), redemptionOutcome(tracker(), [], levels))).toBe('The holder did not put, so the product ran to the end of its term.')
    const both = tracker([issuerCall, put])
    expect(explainRedemption(both, redemptionOutcome(both, [], levels))).toBe('The issuer did not call and the holder did not put, so the product ran to the end of its term.')
    const withAutocall = tracker([{ kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, callAmount: 0.05 }, issuerCall, put])
    expect(explainRedemption(withAutocall, redemptionOutcome(withAutocall, [90, 90, 90], levels))).toBe('No review before the last was at or above the 100 trigger, the issuer did not call and the holder did not put, so the product ran to the end of its term.')
  })

  it('says the issuer’s call came first, on the same date or earlier', () => {
    const both = tracker([issuerCall, put])
    expect(explainRedemption(both, redemptionOutcome(both, [], levels, { issuerCallsOnReview: 1, holderPut: { review: 1, level: 120 } }))).toContain('The holder’s put on the same date comes second: the issuer’s call comes first.')
    expect(explainRedemption(both, redemptionOutcome(both, [], levels, { issuerCallsOnReview: 1, holderPut: { review: 2, level: 120 } }))).toContain('The holder’s put on its review 2 never happened: the product had already ended.')
    expect(explainRedemption(both, redemptionOutcome(both, [], levels, { issuerCallsOnReview: 2, holderPut: { review: 1, level: 120 } }))).toContain('The issuer’s call on its review 2 never happened: the product had already ended.')
  })

  it('says the put came before the autocall on the same date', () => {
    const note = tracker([{ kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, firstReviewMonth: 12, callAmount: 0.08 }, put])
    const outcome = redemptionOutcome(note, [120, 90, 90, 90], levels, { holderPut: { review: 1 } })
    expect(explainRedemption(note, outcome)).toContain('That date is also an autocall review: the holder’s put comes first, so the trigger is not tested.')
  })
})

describe('the steps of a holder put', () => {
  it('works out the put at its level, then what the payoff would have paid at maturity', () => {
    const steps = redemptionSteps(tracker(), redemptionOutcome(tracker(), [], levels, { holderPut: { review: 1, level: 120 } }))
    expect(steps.map(({ title }) => title)).toEqual(['First review', 'Holder put', 'Annualised return', 'If it had run to maturity'])
    expect(steps[1]).toMatchObject({ how: 'The holder put on review 1, after 12 months, with the level at 120. It is paid the payment at maturity at that level: 1,000 × 120 ÷ 100', value: '1,200', result: true })
    expect(steps[3].how).toBe('It was put, so none of this is paid. The steps below are what the payoff would have paid at maturity.')
  })

  it('shows an adjustment factor and a loss a year with a true minus', () => {
    const note: Product = { ...tracker(), redemption: { kind: 'early-redemption', mechanisms: [put], adjustmentFactor: 0.99 } }
    const steps = redemptionSteps(note, redemptionOutcome(note, [], levels, { holderPut: { review: 1, level: 80 } }))
    expect(steps[1].how).toContain('1,000 × 80 × 99% ÷ 100')
    expect(steps[1].value).toBe('792')
    expect(steps[2].value).toBe('−20.8% a year')
  })

  it('says the holder did not put, or that neither party acted', () => {
    expect(redemptionSteps(tracker(), redemptionOutcome(tracker(), [], levels)).at(-1)).toMatchObject({ title: 'Holder put', value: 'Not put', how: 'The holder did not put, so the product runs to the end of its 24 months term' })
    const both = tracker([issuerCall, put])
    const steps = redemptionSteps(both, redemptionOutcome(both, [], levels))
    expect(steps.map(({ title }) => title)).toEqual(['First call review', 'First put review', 'Issuer call and holder put'])
    expect(steps.at(-1)).toMatchObject({ value: 'Neither', how: 'The issuer did not call and the holder did not put, so the product runs to the end of its 24 months term' })
  })

  it('adds the coupon of the put review to the put', () => {
    const note = tracker([put], { coupon: { schedule: { frequency: 'semi-annual' }, rate: 0.04 } })
    const outcome = redemptionOutcome(note, [], levels, { holderPut: { review: 1, level: 120 } })
    expect(redemptionSteps(note, outcome).find(({ title }) => title === 'Holder put')?.how).toContain('1,000 × 120 ÷ 100 + coupon 20')
  })
})

describe('the chart’s aside for a holder put', () => {
  it('says the put pays the payment at maturity worked out early, and that the line shows the same at that level', () => {
    const outcome = redemptionOutcome(tracker(), [], levels, { holderPut: { review: 2, level: 130 } })
    expect(scenarioAside(tracker(), levels, outcome)).toBe('In this scenario the holder puts it on review 2 and it pays 1,300: the payment at maturity worked out early, at that review’s level, 130, not at the final level. The line shows the same payment at that level.')
  })

  it('says what the line adds at the put’s level when the last review pays a coupon', () => {
    const note = tracker([put], { coupon: { schedule: { frequency: 'semi-annual' }, rate: 0.04 } })
    expect(scenarioAside(note, levels, redemptionOutcome(note, [], levels, { holderPut: { review: 1, level: 120 } }))).toBe('In this scenario the holder puts it on review 1 and it pays 1,200: the payment at maturity worked out early, at that review’s level, 120, not at the final level. The line shows 1,220 at that level, since at the end of the term it also pays the last review’s coupon. That review’s coupon, 20, is paid with it. It also pays 20 in coupons on earlier reviews.')
  })

  // The case the review found: an 8% autocall that also calls on the final review. The line at 120 is the call, 1,080, not the put's 1,200.
  it('says what the line adds at the put’s level when the final review is a call', () => {
    const note = tracker([{ kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, callAmount: 0.08, firstReviewMonth: 18, callOnFinalReview: true }, put])
    const outcome = redemptionOutcome(note, [90], levels, { holderPut: { review: 1, level: 120 } })
    expect(outcome.payment).toBeCloseTo(1200, 9)
    expect(scenarioAside(note, levels, outcome)).toBe('In this scenario the holder puts it on review 1 and it pays 1,200: the payment at maturity worked out early, at that review’s level, 120, not at the final level. The line shows 1,080 at that level, since at the end of the term it also pays the final review’s call, in place of the payoff.')
  })
})
