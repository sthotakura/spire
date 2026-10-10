# Wrapper

The wrapper is the contractual form in which a structured product is issued.
SPIRe distinguishes a **note** and a **deposit**. The wrapper helps
describe the issuer's promise and the conditions around repayment, but it does
not by itself determine how an underlier's performance changes the payment.

## Note

A note is a debt security of its issuer. Its payment is defined by the note's
terms, and payment depends on the issuer's ability to pay. In this book's
basic example, the note has bullet redemption: it makes one payment at
scheduled maturity.

The note wrapper does not mean that the holder owns the linked equity or index.
The underlier is a reference for calculating the payment.

## Deposit

A market-linked deposit is a bank deposit whose return is linked to an
underlier. The bank repays the principal in full at the end of the term under
the stated deposit terms, with any linked return determined by the payoff
rules. Any amount above an applicable protection or insurance limit remains
subject to the bank's ability to pay.

SPIRe treats a deposit as a distinct wrapper because its repayment behaviour is
not the same as a note's. A fixed deposit is outside this model: it has no
underlier-linked payoff to explain.

## What the wrapper does not decide

The wrapper should not be used as a shortcut for the rest of the structure.
These are separate questions:

- When does the product redeem?
- What underlier is observed?
- How are its initial and final levels determined?
- How does the payoff treat a rise or fall?

Those answers belong to redemption, underlier, determination, and payoff
respectively.

## Example assumption

The examples in this book use synthetic products and simplified contractual
rules. They do not reproduce an issuer's document, operational workflow, or
proprietary terminology.
