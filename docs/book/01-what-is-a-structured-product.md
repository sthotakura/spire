# What is a structured product?

A structured product is a financial product whose payment is defined by a
combination of contractual terms and the behaviour of one or more underliers. An
underlier might be an equity, an equity index, or a basket of them; SPIRe covers
equity and equity-index references. The product does not simply pass through the
underlier's performance: its rules decide how that performance affects the
payment.

## The parts

SPIRe describes a product as several separate concepts:

- **Wrapper:** the contractual form, such as a note or deposit.
- **Redemption:** when the product ends, and whether it pays the maturity payoff or a call amount.
- **Term:** the scheduled length of the product, as a duration.
- **Underlier:** what the product reads, and how its change is determined.
- **Payoff:** the rules that turn that change into the contractual maturity payment.

Keeping these parts separate matters. A note can have bullet redemption and be
linked to an equity index, but neither “note” nor “bullet” says whether a rise
or fall in the index increases or reduces the payment. That is the job of the
payoff.

## A small synthetic example

Suppose a synthetic note has principal of 1,000 and is linked to a synthetic
equity index. Its initial level is 100 and its hypothetical final level is
115. The index return is:

```text
115 ÷ 100 − 1 = 15%
```

If the payoff gives 100% upside participation and has no cap or other feature,
the illustrative payment is:

```text
1,000 × (1 + 100% × 15%) = 1,150
```

This is a contractual-payment illustration under stated assumptions. It is not
a market valuation, a prediction, investment advice, or a guarantee that an
issuer will pay.

## Categories and names

Two labels sit on top of the parts, and neither is a term of the product.

A **category** is a broad class. The Swiss Structured Products Association
groups products into Capital Protection, Yield Enhancement, Participation and
Leverage. A product falls in at most one. SPIRe shows a category only when the
terms place the note in it: any principal protection above 0% is Capital
Protection, an unprotected note that pays a coupon, fixed or contingent, in
place of a share in a rise is Yield Enhancement, and an unprotected bullet note with no
coupon that follows the underlier is Participation. Other products, such as an
unprotected note with a call and no coupon, show no category. The model does
not place a product in Leverage.

A **marketing name**, such as “principal-protected note”, is the label a seller
puts on a product. Several can apply to one note, and no single authority
defines them. Names such as “tracker” describe a note that only follows the
underlier, so a call or a coupon rules them out. Names that describe the
payment at maturity, such as “buffered note”, still apply, and their reason
says that a call can end the product earlier or that a coupon is paid as well.
The call and the coupon have names of their own: “autocallable note”,
“callable note” and “contingent coupon note”. A note that shares a rise at more
than 100%, with principal at risk, is usually sold under an issuer’s own title,
which follows the downside: “PLUS”, “accelerated return note” and “return enhanced
note” for a fall that costs one for one, “buffered PLUS” and “buffered return
enhanced note” with a buffer, “trigger PLUS”, “accelerated barrier note” and
“enhanced return note” with a barrier. Beside a fixed return at a 100% barrier it is
a “leveraged market-linked step up note”. These are the issuers’ titles, and
filings under one title can differ. An autocall whose call amount is a
rate for each year elapsed, so that each review it is not called adds to what the
next call pays, is what sellers call a “snowball autocall”; one issuer calls it an
autocallable note with a “step-up premium”. A fixed coupon in place of a share
in a rise is a “reverse convertible” when the holder bears the fall below a
strike, and a “barrier reverse convertible” when that waits for a barrier. An
issuer may pay these in cash or in shares of the underlier, which the
[Settlement](22-settlement.md) chapter explains. A strike below the initial level appears here as a
buffer and a rate: a strike of 80% is a 20% buffer at a rate of 1 ÷ 0.8. An unprotected
autocall that pays contingent coupons instead of a share in a rise, with a
downside barrier, is what the Swiss taxonomy calls an Express certificate. A note whose downside barrier leaves
at least principal until it is reached, and then follows the underlier, is what that
taxonomy calls a bonus certificate, or a bonus outperformance certificate when the
rise is leveraged, and a twin-win certificate when a fall above the barrier is paid
as a gain. A fixed return paid as a minimum from a level up is a digital return,
which issuers put in the title as a digital return note.

Both are hints. The structure remains the authoritative description of what the
product pays.

## What this model leaves out

SPIRe's model is intentionally small. It explains a static product with
synthetic levels and terms. It does not model pricing, live market data,
issuer credit analysis, booking, issuance workflows, regulatory processing,
or document generation.

The product's payment also depends on the issuer's ability to pay. A payoff
calculation explains what the terms say should be paid; it does not remove
that contractual or credit risk.
