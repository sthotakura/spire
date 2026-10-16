# Issuer call

This is a proposal, not built. An issuer call is the issuer's option to redeem a note early. It is distinct from the autocall ([observation-dates.md](observation-dates.md), [book chapter 19](book/19-reviews-and-early-redemption.md)), which is an obligation that follows from the underlier's level.

## Established concepts

- **The SSPA** separates an autocall, an obligation to repay early when the underlyings are at or above the trigger on a predetermined observation date, from a softcall, an issuer option on such dates ([SSPA Lab](https://sspa.ch/en/lab/)).
- **The two public notes read pay no premium on a call.** Both are contingent-coupon notes whose call price is principal plus the coupon for the preceding review, if it was earned.
  - JPMorgan Financial's callable contingent interest note on the least performing of three indices: "We, at our election, may redeem the notes early, in whole but not in part." It can be redeemed on interest payment dates other than the first five and the last. The call price is $1,000 plus the contingent interest payment, if any, for the immediately preceding review date; with no coupon earned, it is $1,000. Notice is three business days before the payment date. No level condition applies to the call. The coupon is paid when each index is at or above its barrier (75% of the initial value), with no memory. At maturity, if any index is below its trigger value (70%), the payment is principal plus principal times the worst index return ([JPMorgan Financial, 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390023083784/ea165015_424b2.htm)).
  - BofA Finance's issuer callable yield note on the S&P 500: the issuer may call quarterly from the first call payment date, at its "sole option", on five to sixty days' notice. The call price is $1,000 plus the contingent coupon for that period if the observation value is at or above the coupon barrier (70% of the starting value). The call right is not tied to the index level. No memory is described. If not called and the ending value is below the threshold value (70%), the payment falls below 70% of principal ([BofA Finance, 424B2](https://www.sec.gov/Archives/edgar/data/1682472/000148105724004907/form424b2.htm)).
- **Both have a period at the start with no calls**: five reviews in the JPM note, about six months in the BofA note. The reference already models this as `nonCallReviews` ([non-call-period.md](non-call-period.md)).
- **Neither says when the issuer will call.** Both state only that it is the issuer's election. How the issuer decides is not a term of the note.

## What this means for the reference

- **The decision is not a rule.** There is no level to test. Whether and when the issuer calls is a scenario input, the same kind of input as the level on a review, and it is the reader's to set. The reference does not model why an issuer would call, and should not suggest a reason the notes do not give.
- **The call price in both notes is principal plus that review's coupon.** The reference has no coupon yet. A call price above principal is coherent and common in callable notes generally, but neither note read states one, so a call amount is allowed with a default of zero, and the reference says that no source read pays a premium.
- **Coupons are what make the notes interesting.** A learner can see why an issuer's option matters when a coupon is being paid and the call stops the remaining coupons ("No further payments are made after an early redemption"). Without a coupon, a call is the product ending early, paying principal and any call amount.

## Smallest model

```json
"redemption": { "kind": "issuer-call", "nonCallReviews": 5, "callAmount": 0 }
```

- A third redemption kind beside `bullet` and `autocall`. It needs a schedule.
- **`nonCallReviews`** as on the autocall, so the JPM note's schedule (no call on the first five reviews or the last) can be written.
- **The call is a scenario input**: the review the issuer calls on, or none. A named path set: not called, called on the first review that can call, called late.
- **`callAmount`**, as on the autocall: what a call pays above principal, as a share of principal, with the same flat and per-year forms. It defaults to 0, as in both notes read. A premium is allowed because it is coherent; no public note read pays one, and the book says so.
- **The payment on a call is principal plus the call amount**, and, once coupons exist, plus that review's coupon, as in both notes.
- **The result** reuses the redemption outcome: the review called on, the months it lasted, the payment, and the annualised return over the months it lasted. A call with no call amount annualises to 0% over the months it lasted, which is honest and is explained; with a call amount it is positive.
- **No level test**, so the review table of levels is not needed to decide the call. The interface needs a control for the call review, not a level for each review.
- **Constraints.** A barrier observed on every close and barrier absolute return are unavailable, for the reason they are with an autocall: a called product ends before the observation period does, and a scenario states only one lowest or highest close. Lookback does not conflict, since nothing is read on the reviews. Averaging is allowed, with the final level read only if the note is not called.

## Alternatives

1. **A flag on the autocall** (an issuer call as well as a level-triggered one). No public note read has both, so this multiplies the cases for no source. Not recommended.
2. **Par only, with no call amount.** Neither note read pays a premium, but a premium is coherent and callable notes commonly state a call price above 100%. Leaving it out would be a restriction with no reason. Not recommended; the call amount defaults to zero instead.
3. **Waiting for coupons.** The issuer call is thin without them and natural with them, since both public notes are coupon notes. Recommended, with a thin slice, a call with a call amount and no coupon, available if it is wanted sooner.

## Decisions to agree

1. **When?** Now, as a call with a call amount and no coupons, or after the contingent coupon, where it reproduces both notes. Recommended: after.
2. **A separate redemption kind**, not a flag on the autocall. Recommended.
3. **The decision as a scenario input** on the review table, with named paths. Recommended.
4. **A call amount, defaulting to 0**, as on the autocall, with the book saying that the two notes read pay none. Recommended.

## Open questions

1. **Notice and dates.** Both notes state a notice period and a call payment date that follows the review. The reference does not model dates, so notice is not represented.
2. **A note with both calls.** No public example was read.
3. **A source for a premium.** None found yet. The default is zero until one is, and the book should not suggest a typical premium.
4. **Coupon in the call price.** The call price includes the coupon for the preceding review in both notes, when earned. This needs the contingent coupon slice.
