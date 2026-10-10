# The structure as JSON

JSON expresses the terms as data. The structure shown by SPIRe mirrors the
conceptual outline: wrapper, principal and term, redemption, underlier, and
payoff.

## A complete synthetic structure

```json
{
  "wrapper": "note",
  "principalAmount": 1000,
  "term": { "months": 36 },
  "redemption": "bullet",
  "underlier": {
    "kind": "single",
    "components": [
      { "asset": { "kind": "equity-index", "name": "Synthetic Index" } }
    ],
    "determination": {
      "initial": { "kind": "given", "level": 100 },
      "final": { "kind": "final-date" }
    }
  },
  "payoff": {
    "participations": [
      { "direction": "downside", "buffer": 0.1, "rate": 1 },
      { "direction": "upside", "rate": 1.5, "cap": 0.2 }
    ]
  }
}
```

## Reading the terms

Rates are fractions: `1.5` means 150% participation; `0.2` means a 20% cap.
The cap belongs to upside participation and the buffer to downside
participation. Determination belongs to the underlier because it specifies
how the return is measured.

Other sub-features nest the same way. An upside barrier and its rebate belong
to upside participation, and the barrier is listed before the rate because the
payment checks it first. This and the next block are excerpts, not complete
structures:

```json
{ "direction": "upside", "barrier": { "level": 1.3, "observation": "final", "rebate": 0.02 }, "rate": 0.8 }
```

The level is a fraction of the starting level, so `1.3` is 130%. The rebate is
a return on principal, so `0.02` is 2%. The `observation` is `"final"` when the
barrier reads the final level, or `"daily-close"` when it reads every close from
pricing to the final date. The lowest or highest close that a daily barrier
reads is a scenario input and, like the final level, is not stored here.

Absolute return in both directions is a payoff of its own, beside the
participations, and the two barriers belong to it. Each barrier has its own
level and observation, so the two sides can differ:

```json
"barrierAbsoluteReturn": { "rate": 1, "lowerBarrier": { "level": 0.8, "observation": "daily-close" }, "upperBarrier": { "level": 1.25, "observation": "daily-close" }, "conditionalReturn": 0.02 }
```

The conditional return is optional; without it, reaching a barrier leaves only
principal.

The hypothetical final level is not stored in this structure. It is a
scenario input, supplied when calculating a payment. Likewise, lookback and
averaging observations are inputs rather than known future outcomes in the
terms. The payment is a derived result.

## The schema

The structure has a [JSON Schema](https://github.com/sthotakura/spire/blob/main/docs/schema/product.schema.json)
that lists every variant and feature this reference supports: the two kinds of
underlier, the ways of measuring each end, the participations and the features
that belong to each, and barrier absolute return. It also gives each term's
description and its numeric limits, such as a lower barrier between 0% and 100%
of the initial level and a term of 1 to 120 whole months. It is generated from
the same types the calculation uses, so it changes whenever a feature is added.

It also carries ten example products, one for each family of features, and each
one passes both the schema and the validation.

A schema describes shape and ranges. It states two rules that tie fields
together: barrier absolute return replaces participation, and a deposit has no
downside participation or principal protection. It leaves the others to the
validation that runs before a payment is calculated, for example that a buffer
and a barrier cannot both apply to one downside participation. The schema's own
description lists which rules are in it and which are not.

## Scope

This is SPIRe's public learning representation, not an industry standard
schema or an issuance record. Validation checks the supported combinations
and required terms before calculating a payment.
