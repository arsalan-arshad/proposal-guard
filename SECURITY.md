# Security policy

Please do not open a public issue for a security problem. Email **arsalanarshad.dev@gmail.com** with a description and, if you can, a minimal synthetic input that shows it.

What counts as a security problem here:

- Input that makes the scanner hang or use unbounded time or memory (regular-expression blow-ups, huge inputs).
- Input that changes what the rules report by containing instructions aimed at the tool (the scanner is deterministic and must ignore them).
- Any code path that sends document text anywhere. The core library must make no network calls.

Please never include a real proposal, contract, client name, price, token or key in a report. Use made-up text.

This is a hobby-scale, open-source showcase project. There is no bug bounty and no response-time guarantee.
