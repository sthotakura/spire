# The structure as JSON

JSON expresses the terms as data. The structure shown by SPIRe mirrors the
conceptual outline: wrapper, principal and term, redemption, underlier, and
payoff.

## A complete synthetic structure

```
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

The hypothetical final level is not stored in this structure. It is a
scenario input, supplied when calculating a payment. Likewise, lookback and
averaging observations are inputs rather than known future outcomes in the
terms. The payment is a derived result.

## Scope

This is SPIRe's public learning representation, not an industry standard
schema or an issuance record. Validation checks the supported combinations
and required terms before calculating a payment.
