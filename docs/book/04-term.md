# Term

The term is the scheduled length of a product, such as 18 months or three
years. It is a duration. Issue and maturity dates put that duration on a calendar.

## Payment and time

The synthetic bullet products pay at maturity. Their participation formula
does not multiply a gain by the number of years: a 10% measured rise with
100% upside participation adds 10% of principal, whether the assumed term is
one year or three years.

For principal of 1,000, that payment is 1,100. The same payment over a longer
term corresponds to a lower annualised return.

## Annualised return

For a single terminal payment, SPIRe expresses the equivalent annual compound
return as:

```text
Annualised return = (payment ÷ principal)^(12 ÷ term in months) − 1
```

A payment of 1,100 after 36 months gives approximately 3.23% a year. This
calculation assumes principal at the start and one payment at the end, with
no intervening cash flows, fees, or taxes. It does not predict what the product
will pay or establish an issuer's quoted yield convention.

## Scope

SPIRe records whole months. Actual observation dates, business-day adjustments,
and day-count conventions require more terms than a duration alone provides.
