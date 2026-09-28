# Observation dates

This is a proposal, not yet built. It answers the open question in [underlier-model.md](underlier-model.md): where do observation dates belong? It records what dates mean in public term sheets, proposes the smallest model, and lists the decisions to agree before any code.

SPIRe models how a product is structured, so the only dates it models are those on which something is observed. Dates that belong to issuing and settling the note, such as the issue date and the maturity date, are left out.

## Established concepts

Public pricing supplements state a small set of dates. One lookback note, for example, states a pricing date, an original issue date a few days later, a lookback observation period "from and including the Pricing Date to and including" a date a month later, a single observation date, and a maturity date three business days after it ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026050822/ea0288734-01_424b2.htm)).

- **Pricing date** (or trade date): the terms are set, and the initial level is usually the closing level on this date.
- **Issue date** (or settlement date): the holder pays for the note. It is part of issuance, not of the structure.
- **Observation dates** (also called valuation or determination dates): the dates on which an underlier level is read. There is one final observation date for point-to-point, several for averaging, and a period of trading days for lookback.
- **Maturity date**: the date the maturity payment is due. It falls a few business days after the final observation date, so the payment can be calculated and settled. It is also part of issuance: nothing is observed on it.
- **Postponement.** Observation dates are postponed for market disruption events and non-trading days, and the maturity date moves with them. The detailed rules sit in the issuer's product supplement, not the pricing supplement.
- **Daily or on the final date.** A barrier may be observed only on the final observation date, or on every trading day in a period. One daily-monitored note has a knock-in event "if the closing level of either Index on any eligible trading day during the observation period is less than its threshold level", over every trading day from the pricing date to the calculation day ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/72971/000138713119008969/wfcr1924-424b2_112119.htm)). This decides whether the payoff reads one final level or the path of levels.

## What dates change today

Nothing in the payment. Every payoff built so far reads the determined initial and final levels, and a date changes neither. Averaging and lookback already state how many levels they read; the dates would say when. Dates start to change payments with:

- coupons and calls, whose conditions are observed on stated dates,
- a barrier observed daily, which reads the levels between dates.

A barrier observed only on the final observation date reads the final level, as the buffer does, and needs no dates.

## Proposal

**Observation dates sit on the concept that observes.** The note is composed of small named parts, and each observation date belongs to one of them:

| Date | Belongs to | Why |
|---|---|---|
| Pricing date | Initial level (`determination.initial`) | It is when the initial level is observed, and where a lookback period starts |
| Lookback dates | Initial level | They are the levels the lowest is taken from |
| Final observation date, averaging dates | Final level (`determination.final`) | They are the levels the final level is read from |
| Issue date, maturity date | Not modelled | Nothing is observed on them; they belong to issuance |

```json
"underlier": {
  "determination": {
    "initial": { "kind": "lookback", "pricingDate": "2026-03-17", "dates": ["2026-03-24", "2026-03-31", "2026-04-07"] },
    "final": { "kind": "averaging", "dates": ["2030-12-17", "2031-01-17", "2031-02-17", "2031-03-17"] }
  }
}
```

- **Counts become derived.** `observationCount` is replaced by the length of the date list, with the same limit of 2 to 12.
- **One timeline view, derived.** A pure function gathers every date into one ordered timeline for display and validation. It is not stored, so there is one source for each date.
- **Ordering rules.** Pricing date < lookback dates < averaging dates ≤ final observation date, and each list strictly increasing. A violation is a named issue on the field, like other invalid terms.
- **Scenario levels stay separate.** The hypothetical level on each date remains a scenario input, as now. A date is a term; the level observed on it is not.
- **Payoff features get their own observation later.** When a barrier arrives, "observed on the final observation date" or "observed daily from … to …" is a term of the barrier, not of the determination. That keeps "the payoff reads one return" true for every feature except those that state their own observation.

## Alternatives considered

1. **One note-level `schedule`** holding every observation date, referenced by name from the determination. It makes the timeline and the ordering checks trivial, but separates each date from the concept it describes, and the outline would need a row that the JSON's shape does not otherwise suggest.
2. **Keep counts and add no dates** until a payment depends on them. This is the smallest change: record this placement decision now and build dates with the first feature that needs them (coupons, calls, or a daily barrier).

## Assumptions

- Dates are synthetic ISO calendar dates. There is no trading-day or business-day calendar, so weekends and holidays are not checked.
- Postponement for market disruption is described in words, not modelled.
- A lookback period of every trading day is represented by a short list of stated dates. This is a simplification for hand entry, as the count already is.

## Open questions

1. **Build now, or record only?** Dates change no payment built so far (see *What dates change today*).
2. **Co-located dates or one schedule?** The proposal co-locates them; alternative 1 is the other reasonable model.
3. **Lookback as a period or a list?** Real notes state a period of trading days. A list keeps hand entry possible but departs from how term sheets phrase it.
4. **Which barrier first?** A barrier observed on the final observation date fits the current model without dates; a daily barrier needs a path of levels as a new scenario input.
