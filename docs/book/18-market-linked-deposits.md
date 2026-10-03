# Market-linked deposits

The deposit form used in SPIRe repays principal in full at maturity and links
an additional return to an underlier. Full repayment is a property of this
wrapper, rather than an optional protection percentage.

## Upside participation with a cap

Assume principal of 1,000, a five-year term, 100% upside participation, and
a 30% cap. A 10% rise pays 1,100. A 60% rise pays 1,300 because the upside
is capped. A 50% fall repays 1,000 under the assumed deposit terms.

## A minimum return

Some deposit terms provide a minimum linked payment. In the form illustrated
here it is a floor, not an amount added to participation.

With a 5.25% minimum return and 100% upside participation:

```text
At a 7% rise: greater of 1,070 and 1,052.50 = 1,070
At a 2% rise: greater of 1,020 and 1,052.50 = 1,052.50
At a 50% fall: greater of 1,000 and 1,052.50 = 1,052.50
```

The 5.25% is for the whole term. Over seven years, 1,052.50 on principal
of 1,000 corresponds to approximately 0.73% a year under the compound-return
formula in the term chapter.

## Scope and contractual terms

This example does not model early withdrawal or deposits whose repayment can
be in another currency. Deposit insurance eligibility, limits, and coverage
depend on the jurisdiction and product; the calculator does not establish
coverage. Contractual amounts remain distinct from a bank's ability to pay.

A [public market-linked CD summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61765QBM0_Summary_Sheet_Only.pdf)
illustrates participation with a minimum supplemental amount applied as a floor.
