import { describe, expect, it } from 'vitest'
import { redemptionOutcome } from '../domain/autocall'
import { autocallOf, validateProduct, type Product } from '../domain/note'
import { startingProduct } from '../domain/starting-note'
import { explainRedemption, pathScenarios, redemptionFormula, redemptionSteps } from './autocall'
import { structureLines } from './structure-json'
import { summarize } from './summary'

// Keys in the order the structure states them: the redemption follows the term, and its schedule follows its kind.
const { wrapper, principalAmount, underlier, payoff } = startingProduct
const callable: Product = {
  wrapper,
  principalAmount,
  term: { months: 12 },
  redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, callAmount: 0.08 }] },
  underlier,
  payoff,
}
const text = (note: Product) => summarize(note).map(({ text }) => text).join('')
const levels = { initial: 100, final: 100 }

describe('summary', () => {
  it('says when the product is called, what it pays, and that it otherwise redeems at maturity', () => {
    expect(text(callable)).toBe('A 1-year note that is called early if Synthetic Index is at or above 100% of its initial level on any monthly review before maturity, paying 8% above principal, and otherwise redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
  })

  it('states a call that pays principal only', () => {
    expect(text({ ...callable, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 0.9, callAmount: 0 }] } })).toContain('at or above 90% of its initial level on any monthly review before maturity, repaying principal, and otherwise')
  })

  it('names the quarterly frequency', () => {
    expect(text({ ...callable, term: { months: 36 }, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0.08 }] } })).toContain('on any quarterly review before maturity')
  })

  it('leaves a bullet product reading as before', () => {
    expect(text(startingProduct)).toBe('A 3-year note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
  })

  it('tags each term of the call clause with its own concept', () => {
    const tagged = (concept: string) => summarize(callable).filter((segment) => segment.concept === concept).map(({ text }) => text)
    expect(tagged('trigger')).toEqual(['is at or above 100% of its initial level'])
    expect(tagged('schedule')).toEqual(['monthly'])
    expect(tagged('final-call')).toEqual(['before maturity'])
    expect(tagged('call-amount')).toEqual(['paying 8% above principal'])
    expect(tagged('redemption')).toEqual(['at maturity'])
    expect(tagged('trigger-step')).toEqual([])
    expect(summarize(stepped).filter(({ concept }) => concept === 'trigger-step').map(({ text }) => text)).toEqual(['falling 5% on each later review'])
  })
})

describe('structure JSON', () => {
  it('tags the schedule, the trigger and the call amount with their own concepts, and keeps the shape of the product', () => {
    const lines = structureLines(callable)
    expect(lines.map(({ text }) => text).join('\n')).toBe(JSON.stringify(callable, null, 2))
    const tagged = (concept: string) => lines.filter((line) => line.concept === concept).map(({ text }) => text.trim())
    expect(tagged('schedule')).toEqual(['"schedule": {', '"frequency": "monthly"', '},'])
    expect(tagged('redemption')).toEqual(['"redemption": {', '"kind": "early-redemption",', '"mechanisms": [', ']', '},'])
    expect(tagged('autocall')).toEqual(['{', '"kind": "autocall",', '}'])
    expect(tagged('trigger')).toEqual(['"trigger": 1,'])
    expect(tagged('call-amount')).toEqual(['"callAmount": 0.08'])
  })
})

describe('an autocall and an issuer call on one product', () => {
  const both: Product = {
    ...callable,
    redemption: { kind: 'early-redemption', mechanisms: [
      { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, callAmount: 0.08 },
      { kind: 'issuer-call', schedule: { frequency: 'semi-annual' }, callAmount: 0.02 },
    ] },
  }
  const below = [90, 90, 90]

  it('states both in the summary, each with its own terms', () => {
    expect(text(both)).toBe('A 1-year note that is called early if Synthetic Index is at or above 100% of its initial level on any quarterly review before maturity, paying 8% above principal, and that the issuer may call early on any semi-annual review before maturity, paying 2% above principal, and otherwise redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
  })

  it('tags each mechanism with its own concepts', () => {
    const segments = (concept: string) => summarize(both).filter((segment) => segment.concept === concept).map(({ text }) => text)
    expect(segments('schedule')).toEqual(['quarterly'])
    expect(segments('issuer-schedule')).toEqual(['semi-annual'])
    const lines = (concept: string) => structureLines(both).filter((line) => line.concept === concept).map(({ text }) => text.trim())
    expect(lines('call-amount')).toEqual(['"callAmount": 0.08'])
    expect(lines('issuer-call-amount')).toEqual(['"callAmount": 0.02'])
  })

  it('names each rule in the formula', () => {
    expect(redemptionFormula(both).map(({ lead }) => lead)).toEqual(['Autocall', 'Issuer call'])
  })

  it('says the issuer did not call when neither ends it', () => {
    expect(explainRedemption(both, redemptionOutcome(both, below, levels))).toBe('No review before the last was at or above the 100 trigger and the issuer did not call, so the product ran to the end of its term.')
  })

  it('says the issuer’s call never happened when the autocall came first', () => {
    const outcome = redemptionOutcome(both, [105, 90, 90], levels, 1)
    expect(explainRedemption(both, outcome)).toBe('The level was 105 on review 1 of 4, at or above the 100 trigger, so the product was called after 3 months and pays 1,080, 80 more than principal. The issuer’s call on its review 1 never happened: the product had already ended.')
  })

  it('says the issuer called, with the issuer’s own count of reviews', () => {
    expect(explainRedemption(both, redemptionOutcome(both, below, levels, 1))).toContain('The issuer called the product on review 1 of 2, after 6 months, and it pays 1,020')
  })

  it('says the issuer’s call comes first on a date that is on both schedules', () => {
    expect(explainRedemption(both, redemptionOutcome(both, [90, 120, 90], levels, 1))).toContain('That date is also an autocall review: the issuer’s call comes first, so the trigger is not tested.')
  })

  it('does not say so on a date that is only the issuer’s', () => {
    const offset: Product = { ...both, redemption: { kind: 'early-redemption', mechanisms: [
      { kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, callAmount: 0.08 },
      { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, callAmount: 0.02 },
    ] } }
    expect(explainRedemption(offset, redemptionOutcome(offset, [90], levels, 1))).not.toContain('also an autocall review')
  })

  it('shows the reviews tested before the issuer’s call, then the call', () => {
    const steps = redemptionSteps(both, redemptionOutcome(both, below, levels, 1))
    expect(steps.map(({ title }) => title)).toEqual(['Review 1 of 4', 'Issuer call', 'Annualised return', 'If it had run to maturity'])
    expect(steps[1]).toMatchObject({ value: '1,020', result: true, concept: 'issuer-call-amount' })
  })

  it('shows that the issuer did not call when neither ends it', () => {
    expect(redemptionSteps(both, redemptionOutcome(both, below, levels)).map(({ title }) => title)).toEqual(['Review 1 of 4', 'Review 2 of 4', 'Review 3 of 4', 'Issuer call', 'Redemption'])
  })

  it('leaves out the issuer call step when the autocall ended it', () => {
    expect(redemptionSteps(both, redemptionOutcome(both, [105, 90, 90], levels, 1)).map(({ title }) => title)).toEqual(['Review 1 of 4', 'Redemption', 'Annualised return', 'If it had run to maturity'])
  })
})

describe('what a call says and does', () => {
  it('explains a call with its review, level, trigger and payment', () => {
    const outcome = redemptionOutcome(callable, [95, 105, ...Array(9).fill(90)], levels)
    expect(explainRedemption(callable, outcome)).toBe('The level was 105 on review 2 of 12, at or above the 100 trigger, so the product was called after 2 months and pays 1,080, 80 more than principal.')
  })

  it('explains a product that was never called', () => {
    const outcome = redemptionOutcome(callable, Array(11).fill(90), levels)
    expect(explainRedemption(callable, outcome)).toBe('No review before the last was at or above the 100 trigger, so the product ran to the end of its term.')
  })

  it('says one month in the singular', () => {
    const outcome = redemptionOutcome(callable, [100, ...Array(10).fill(90)], levels)
    expect(explainRedemption(callable, outcome)).toContain('after 1 month and')
  })

  it('has nothing to say for a bullet product', () => {
    expect(explainRedemption(startingProduct, redemptionOutcome(startingProduct, [], levels))).toBe('')
    expect(redemptionFormula(startingProduct)).toEqual([])
    expect(redemptionSteps(startingProduct, redemptionOutcome(startingProduct, [], levels))).toEqual([])
  })

  it('writes the call rule beside the payment rule', () => {
    const [line] = redemptionFormula(callable)
    expect(line.lead).toBe('Call')
    expect(line.segments.map(({ text }) => text).join('')).toBe('On a review before the last, if Level ≥ Trigger × Initial level, pay Principal × (1 + Call amount) and end')
  })

  it('shows each review up to the call and then the redemption', () => {
    const steps = redemptionSteps(callable, redemptionOutcome(callable, [90, 100, ...Array(9).fill(90)], levels))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([['Review 1 of 12', 'Not called'], ['Review 2 of 12', 'Called'], ['Redemption', '1,080'], ['Annualised return', '58.69% a year'], ['If it had run to maturity', '']])
    expect(steps[2].result).toBe(true)
    // The annualised return reads the 2 months it lasted, not the term, and the heading says the steps after it were not paid.
    expect(steps[3].how).toBe('(1,080 ÷ 1,000)^(12 ÷ 2 months) − 1, over the time it lasted')
    expect(steps[4].heading).toBe(true)
  })

  it('gives no annualised return and no heading when it is not called: the payoff steps carry their own', () => {
    const steps = redemptionSteps(callable, redemptionOutcome(callable, Array(11).fill(90), levels))
    expect(steps.some(({ title, heading }) => title === 'Annualised return' || heading)).toBe(false)
  })

  it('groups the reviews that did not call, keeps the last on its own, then says it runs to maturity', () => {
    const steps = redemptionSteps(callable, redemptionOutcome(callable, Array(11).fill(90), levels))
    expect(steps.map(({ title }) => title)).toEqual(['Reviews 1–10 of 12', 'Review 11 of 12', 'Redemption'])
    expect(steps[0]).toMatchObject({ how: 'Each level is below the trigger, 100% × initial level = 100; the review table shows each review', value: 'Not called', muted: true, concept: 'trigger' })
    expect(steps.at(-1)).toMatchObject({ title: 'Redemption', value: 'At maturity' })
  })
})

// The same synthetic product as the domain tests: three years reviewed every six months, a trigger stepping down 5% a review, a call
// amount of 10% for each year elapsed, and a call on the final review too.
const stepped: Product = {
  ...callable,
  term: { months: 36 },
  redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, triggerStep: -0.05, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true }] },
}

describe('a trigger that steps down, a call amount for each year and a call on the final review', () => {
  it('says all three in the summary', () => {
    expect(text(stepped)).toContain('is called early if Synthetic Index is at or above 100% of its initial level on any semi-annual review including the last, the trigger falling 5% on each later review, paying 10% for each year elapsed above principal, and otherwise redeems at maturity')
  })

  it('says a trigger that steps up is rising', () => {
    expect(text({ ...stepped, redemption: { kind: 'early-redemption', mechanisms: [{ ...autocallOf(stepped.redemption)!, triggerStep: 0.05 }] } })).toContain('the trigger rising 5% on each later review')
  })

  it('writes the rule with the trigger on that review, the years elapsed and every review', () => {
    const [line] = redemptionFormula(stepped)
    expect(line.segments.map(({ text }) => text).join('')).toBe('On every review, if Level ≥ Trigger on that review × Initial level, pay Principal × (1 + Call amount × Years elapsed) and end')
  })

  it('shows the trigger of each review and the call amount for the years elapsed', () => {
    const outcome = redemptionOutcome(stepped, [90, 80, 85, 70, 60], { initial: 100, final: 100 })
    const steps = redemptionSteps(stepped, outcome)
    expect(steps.map(({ value }) => value)).toEqual(['Not called', 'Called', '1,300', '9.14% a year', ''])
    expect(steps[0]).toMatchObject({ title: 'Reviews 1–5 of 6', how: 'Each level is below its trigger, from 100 to 80; the review table shows each review' })
    expect(steps[1].how).toBe('100 is at or above the trigger, 75% × initial level = 75')
    expect(steps[2].how).toBe('Called on review 6, after 36 months: principal × (1 + 10% a year × 3 years = 30%)')
  })

  it('explains a call on the final review', () => {
    const outcome = redemptionOutcome(stepped, [90, 80, 85, 70, 60], { initial: 100, final: 100 })
    expect(explainRedemption(stepped, outcome)).toBe('The level was 100 on review 6 of 6, at or above the 75 trigger, so the product was called after 36 months and pays 1,300, 300 more than principal.')
  })

  it('explains a product no review called, including the last', () => {
    const outcome = redemptionOutcome(stepped, [90, 80, 85, 70, 60], { initial: 100, final: 60 })
    expect(explainRedemption(stepped, outcome)).toBe('No review, including the last, was at or above its trigger, so the product ran to the end of its term.')
  })

  it('gives paths that end the way their names say', () => {
    expect(validateProduct(stepped)).toEqual([])
    const results = Object.fromEntries(pathScenarios(stepped, 100).map(({ name, reviewLevels, finalLevel }) => [name, redemptionOutcome(stepped, reviewLevels, { initial: 100, final: finalLevel ?? 100 }).calledAtReview]))
    expect(results).toEqual({
      'Called on the first review': 1,
      'Called on review 5': 5,
      'Called on the final review': 6,
      'Falls first, then recovers: called late': 5,
      'Never called, ends 40% down': undefined,
    })
  })
})

/// Monthly reviews from month 6 of a 12-month term: seven reviews, the months before the first a non-call period.
const delayed: Product = { ...callable, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, firstReviewMonth: 6, callAmount: 0.08 }] } }
const delayedFrom = (firstReviewMonth: number): Product => ({ ...delayed, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, firstReviewMonth, callAmount: 0.08 }] } })

describe('a first review later than one period in', () => {
  it('says from which month the product can be called, in the summary', () => {
    expect(text(delayed)).toContain('on any monthly review from month 6 before maturity')
    expect(text(delayedFrom(11))).toContain('from month 11')
    expect(text(delayedFrom(1))).not.toContain(' from month')
    expect(text(callable)).not.toContain(' from month')
  })

  it('tags the phrase with its own concept', () => {
    expect(summarize(delayed).filter(({ concept }) => concept === 'first-review').map(({ text }) => text)).toEqual([' from month 6'])
  })

  it('writes the call rule from the month of the first review', () => {
    const [line] = redemptionFormula(delayed)
    expect(line.segments.map(({ text }) => text).join('')).toBe('On a review from month 6 to the last but one, if Level ≥ Trigger × Initial level, pay Principal × (1 + Call amount) and end')
    const [withFinal] = redemptionFormula({ ...delayed, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, firstReviewMonth: 6, callAmount: 0.08, callOnFinalReview: true }] } })
    expect(withFinal.segments[0].text).toBe('On every review from month 6, if ')
  })

  it('has a step only for each review from the first, with its month', () => {
    const steps = redemptionSteps(delayed, redemptionOutcome(delayed, [90, 90, 100, 90, 90, 90], levels))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([
      ['Review 1 of 7, month 6', 'Not called'],
      ['Review 2 of 7, month 7', 'Not called'],
      ['Review 3 of 7, month 8', 'Called'],
      ['Redemption', '1,080'],
      ['Annualised return', expect.any(String)],
      ['If it had run to maturity', ''],
    ])
  })

  it('explains a product no review called', () => {
    const outcome = redemptionOutcome(delayed, Array(6).fill(90), levels)
    expect(explainRedemption(delayed, outcome)).toBe('No review before the last was at or above the 100 trigger, so the product ran to the end of its term.')
  })

  it('gives paths from the first review', () => {
    expect(validateProduct(delayed)).toEqual([])
    const paths = pathScenarios(delayed, 100)
    const results = Object.fromEntries(paths.map(({ name, reviewLevels, finalLevel }) => [name, redemptionOutcome(delayed, reviewLevels, { initial: 100, final: finalLevel ?? 100 }).calledAtReview]))
    expect(results).toEqual({
      'Called on the first review': 1,
      'Called on review 6': 6,
      'Falls first, then recovers: called late': 6,
      'Never called, ends 20% up': undefined,
      'Never called, ends flat': undefined,
      'Never called, ends 40% down': undefined,
    })
  })

  it('tags the first review month in the structure JSON with its own concept', () => {
    expect(structureLines(delayed).filter(({ concept }) => concept === 'first-review').map(({ text }) => text.trim())).toEqual(['"firstReviewMonth": 6,'])
  })
})

// An issuer call on monthly reviews from month 3 of a 12-month term: ten reviews.
const issuer: Product = { ...callable, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, firstReviewMonth: 3, callAmount: 0.02 }] } }

describe('an issuer call', () => {
  it('says when the issuer may call, with no level, and what it pays', () => {
    expect(text(issuer)).toBe('A 1-year note that the issuer may call early on any monthly review from month 3 before maturity, paying 2% above principal, and otherwise redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100.')
    expect(text({ ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0 }] } })).toContain('on any monthly review before maturity, repaying principal, and otherwise')
    expect(text({ ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0.1, callAmountBasis: 'per-year' }] } })).toContain('paying 10% for each year elapsed above principal')
  })

  it('tags each term with its own concept', () => {
    const tagged = (concept: string) => summarize(issuer).filter((segment) => segment.concept === concept).map(({ text }) => text)
    expect(tagged('issuer-schedule')).toEqual(['monthly'])
    expect(tagged('issuer-first-review')).toEqual([' from month 3'])
    expect(tagged('issuer-call-amount')).toEqual(['paying 2% above principal'])
    expect(tagged('trigger')).toEqual([])
  })

  it('tags the structure JSON by term', () => {
    const lines = structureLines(issuer)
    expect(lines.map(({ text }) => text).join('\n')).toBe(JSON.stringify(issuer, null, 2))
    const tagged = (concept: string) => lines.filter((line) => line.concept === concept).map(({ text }) => text.trim())
    expect(tagged('issuer-first-review')).toEqual(['"firstReviewMonth": 3,'])
    expect(tagged('issuer-call-amount')).toEqual(['"callAmount": 0.02'])
  })

  it('writes the call rule with no level in it', () => {
    const [line] = redemptionFormula(issuer)
    expect(line.segments.map(({ text }) => text).join('')).toBe('On a review from month 3 before the last, if the issuer calls, pay Principal × (1 + Call amount) and end')
    expect(redemptionFormula({ ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0.02 }] } })[0].segments[0].text).toBe('On a review before the last, if the issuer calls, pay ')
  })

  it('explains a call and a product the issuer left alone', () => {
    expect(explainRedemption(issuer, redemptionOutcome(issuer, [], levels, 3))).toBe('The issuer called the product on review 3 of 10, after 5 months, and it pays 1,020, 20 more than principal.')
    expect(explainRedemption(issuer, redemptionOutcome(issuer, [], levels))).toBe('The issuer did not call, so the product ran to the end of its term.')
    expect(explainRedemption({ ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0 }] } }, redemptionOutcome({ ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0 }] } }, [], levels, 5))).toContain('pays 1,000, the same as principal')
  })

  it('shows the first review, the call, its annualised return and the comparison', () => {
    const steps = redemptionSteps(issuer, redemptionOutcome(issuer, [], levels, 3))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([['First review', 'Month 3'], ['Issuer call', '1,020'], ['Annualised return', '4.87% a year'], ['If it had run to maturity', '']])
    expect(steps[0].how).toBe('The issuer cannot call before month 3')
    expect(steps[1].how).toBe('The issuer called on review 3, after 5 months: principal × (1 + 2%)')
    expect(steps[1].result).toBe(true)
    expect(steps[3].heading).toBe(true)
  })

  it('shows only that the issuer did not call when it ran to maturity', () => {
    const steps = redemptionSteps(issuer, redemptionOutcome(issuer, [], levels))
    expect(steps.map(({ title, value }) => [title, value])).toEqual([['First review', 'Month 3'], ['Issuer call', 'Not called']])
  })

  it('has no step for the first review when it is one period in', () => {
    const none = { ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, callAmount: 0.02 }] } } as Product
    expect(redemptionSteps(none, redemptionOutcome(none, [], levels)).map(({ title }) => title)).toEqual(['Issuer call'])
    const stated = { ...issuer, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'issuer-call', schedule: { frequency: 'monthly' }, firstReviewMonth: 1, callAmount: 0.02 }] } } as Product
    expect(redemptionSteps(stated, redemptionOutcome(stated, [], levels)).map(({ title }) => title)).toEqual(['Issuer call'])
  })

  it('has no paths of levels', () => {
    expect(pathScenarios(issuer, 100)).toEqual([])
  })
})

describe('named path scenarios', () => {
  it('leave the final level alone when the product is called before it gets there', () => {
    const paths = Object.fromEntries(pathScenarios(callable, 100).map(({ name, finalLevel }) => [name, finalLevel]))
    expect(paths['Called on the first review']).toBeUndefined()
    expect(paths['Called on review 11']).toBeUndefined()
    expect(paths['Never called, ends flat']).toBe(100)
    expect(paths['Never called, ends 20% up']).toBe(120)
    expect(paths['Falls first, then recovers: called late']).toBeUndefined()
    expect(paths['Never called, ends 40% down']).toBe(60)
    expect(Object.fromEntries(pathScenarios(stepped, 100).map(({ name, finalLevel }) => [name, finalLevel]))['Called on the final review']).toBe(75)
  })

  it('give a valid path for each name, which ends the way the name says', () => {
    for (const trigger of [1, 0.8, 1.2]) {
      const note: Product = { ...callable, redemption: { kind: 'early-redemption', mechanisms: [{ kind: 'autocall', schedule: { frequency: 'monthly' }, trigger, callAmount: 0.08 }] } }
      expect(validateProduct(note)).toEqual([])
      const results = Object.fromEntries(pathScenarios(note, 100).map(({ name, reviewLevels, finalLevel }) => [name, redemptionOutcome(note, reviewLevels, { initial: 100, final: finalLevel ?? 100 }).calledAtReview]))
      expect(results).toEqual({
        'Called on the first review': 1,
        'Called on review 11': 11,
        'Falls first, then recovers: called late': 11,
        'Never called, ends 20% up': undefined,
        'Never called, ends flat': undefined,
        'Never called, ends 40% down': undefined,
      })
    }
  })

  it('has none for a bullet product', () => {
    expect(pathScenarios(startingProduct, 100)).toEqual([])
  })
})
