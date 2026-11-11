# Label review pack (about 15 minutes)

**Who this is for:** a person, ideally someone who has not seen the rules, who will check a sample of the test labels.
**Why:** every label in the test sets was written by Claude sessions, so every accuracy figure is "Claude grading Claude". Your answers are the first independent human check. Nothing here is real; all documents are invented.

**How:** for each item, read the sentence (the document is in `corpus/<set>/docs/<doc>`), apply the one-line definition, and tick one box. If you are unsure, tick "unsure". Do not look at the code. Send the ticked file back (or paste the answers).

Definitions in one line each:

- **SCOPE-01**: a promise or scope sentence that is vague, subjective or open-ended (no measurable test, "etc.", "as needed", "whatever it takes").
- **TIME-03**: work or payment that waits on the client approving or signing off, with no stated review window or default (deemed acceptance).
- **HOST-02**: a paid third-party service (hosting, AI API, SMS or e-mail sending, domain, licence, app-store account...) is mentioned and nothing says who pays.
- **REVISE-04**: revisions or changes promised without a number or without limit (part a), or revisions promised and nothing says how extra work is priced or ordered (part b).

Not legal advice and not a judgement on whether any clause is lawful or enforceable: only whether the wording fits the definition.


## A. The two labellers disagreed

One labeller marked these and the other did not. These matter most.

**1. REVISE-04** · `corpus/heldout2/docs/h2-07.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “If you want changes, tell me and I will make them.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**2. REVISE-04** · `corpus/heldout2/docs/h2-20.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “One revision of the report is included.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**3. REVISE-04** · `corpus/heldout2/docs/h2-15.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “The Agency shall make amendments to the website until the Customer is satisfied with the result.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**4. REVISE-04** · `corpus/heldout4/docs/h4-15.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “Flows and templates are adjusted as many times as the client wants during the engagement.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**5. REVISE-04** · `corpus/heldout2/docs/h2-04.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “Feedback is welcome throughout and we will incorporate reasonable changes as they come up.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**6. HOST-02** · `corpus/heldout4/docs/h4-04.md` · labelled by: second only

> (document-level) paid third-party cost category: **api**, with no payer stated

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**7. SCOPE-01** · `corpus/heldout5/docs/h5-20.md` · labelled by: second only

> “Plan for moving the Wild Meadow Seeds shop and making it faster.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**8. REVISE-04** · `corpus/heldout4/docs/h4-12.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “If you want to change wording afterwards, just tell me, we can do as many rounds as needed.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**9. REVISE-04** · `corpus/heldout2/docs/h2-14.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “Send me notes after the first cut and I'll fix whatever you want, as many times as it takes, honestly I just want you both to love it.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**10. REVISE-04** · `corpus/heldout2/docs/h2-02.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “I'm happy to keep tweaking things until you love it, so don't worry about the details now.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**11. REVISE-04** · `corpus/heldout4/docs/h4-20.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “We can fine-tune as we go, that's no problem.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**12. REVISE-04** · `corpus/heldout3/docs/h3-18.md` · labelled by: first only

> “Revisions, sure, a couple of passes, and if it turns into a lot more we'll chat about it”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**13. REVISE-04** · `corpus/heldout4/docs/h4-07.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “You can leave comments and I'll work through them until the pages are right for you.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**14. REVISE-04** · `corpus/heldout2/docs/h2-06.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “We'll adjust until the video feels right and you're fully satisfied.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**15. REVISE-04** · `corpus/heldout2/docs/h2-11.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “Revisions are included until the client is happy with each flow.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**16. TIME-03** · `corpus/heldout4/docs/h4-20.md` · labelled by: first only

> “Once I've sent the page, tell me what you think and I'll get it ready for launch.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**17. REVISE-04** · `corpus/heldout3/docs/h3-04.md` · labelled by: first only

> “The Client may request changes to the report and the Consultant shall implement them promptly and to the Client's satisfaction.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**18. REVISE-04** · `corpus/heldout4/docs/h4-09.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “if you want change in the edit, no problem, i will do again and again until final.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**19. TIME-03** · `corpus/heldout3/docs/h3-18.md` · labelled by: first only

> “Honestly just tell me when you're happy and we'll call it done”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**20. SCOPE-01** · `corpus/heldout4/docs/h4-15.md` · labelled by: second only

> “Training for the team and general support”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**21. SCOPE-01** · `corpus/heldout3/docs/h3-08.md` · labelled by: second only

> “One responsive landing page, with hero section, pricing block for the Unlimited Sips plan, FAQ of 6 questions, and a signup form.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**22. SCOPE-01** · `corpus/heldout5/docs/h5-02.md` · labelled by: first only

> “i'll build the whole thing, iOS and android, with a nice clean look and all the features you mentioned.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**23. SCOPE-01** · `corpus/heldout3/docs/h3-14.md` · labelled by: first only

> “Rebuild the 6 pages on WordPress with a clean, modern look”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**24. REVISE-04** · `corpus/heldout4/docs/h4-04.md` · labelled by: second only

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “The Consultant shall implement amendments requested by the Client until the Client is satisfied.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure


## B. Both labellers agreed (a sample)

Both marked these. Checking a few tells us whether agreement means correctness.

**25. HOST-02** · `corpus/heldout3/docs/h3-06.md` · labelled by: both

> (document-level) paid third-party cost category: **cloud**, with no payer stated

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**26. SCOPE-01** · `corpus/heldout4/docs/h4-04.md` · labelled by: both

> “The Consultant shall make reasonable efforts to deliver a robust, scalable and user-friendly solution.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**27. REVISE-04** · `corpus/heldout5/docs/h5-18.md` · labelled by: both

> “I'll keep refining it for as long as it takes to get it right for you.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**28. SCOPE-01** · `corpus/heldout3/docs/h3-04.md` · labelled by: both

> “The Consultant shall provide ongoing support for the Client's analytics platform and shall make improvements as needed to ensure optimal performance.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**29. TIME-03** · `corpus/heldout2/docs/h2-03.md` · labelled by: both

> “Deliverables are accepted when the Client confirms in writing that they meet its requirements.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**30. SCOPE-01** · `corpus/heldout3/docs/h3-02.md` · labelled by: both

> “here's what I'm thinking for the Fastlane Courier app, basically a modern, intuitive and delightful experience for your drivers and customers”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**31. SCOPE-01** · `corpus/heldout3/docs/h3-02.md` · labelled by: both

> “I'll make it feel premium and super smooth, and I'll add whatever features make sense as we go”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**32. REVISE-04** · `corpus/heldout4/docs/h4-15.md` · labelled by: both

> “Flows and templates are adjusted as many times as the client wants during the engagement.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**33. REVISE-04** · `corpus/heldout5/docs/h5-24.md` · labelled by: both

> “you tell me how they look and I adjust.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**34. TIME-03** · `corpus/heldout3/docs/h3-04.md` · labelled by: both

> “Final sign-off by the Client's data lead is required before the engagement closes.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**35. TIME-03** · `corpus/heldout4/docs/h4-18.md` · labelled by: both

> “25% on Client approval of the design.”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**36. HOST-02** · `corpus/heldout2/docs/h2-16.md` · labelled by: both

> (document-level) paid third-party cost category: **cloud**, with no payer stated

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**37. HOST-02** · `corpus/heldout2/docs/h2-15.md` · labelled by: both

> (document-level) paid third-party cost category: **cloud**, with no payer stated

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**38. REVISE-04** · `corpus/heldout5/docs/h5-02.md` · labelled by: both

> (document-level, part b) no price or change-order path for extra revisions. Anchor sentence: “we'll make it feel really modern and user friendly, and i'll keep tweaking until you love it”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**39. TIME-03** · `corpus/heldout4/docs/h4-09.md` · labelled by: both

> “Advance 50 percent, remaining after you are happy with the video”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**40. HOST-02** · `corpus/heldout3/docs/h3-04.md` · labelled by: both

> (document-level) paid third-party cost category: **cloud**, with no payer stated

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure


## C. The tool flagged these and neither labeller did (a sample)

If you think these should be flagged, the labels missed them.

**41. REVISE-04** · `corpus/heldout5/docs/h5-02.md` · flagged by the tool, labelled by nobody

> “we'll make it feel really modern and user friendly, and i'll keep tweaking until you love it price is 4,800 total, half now and half when you're happy”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**42. SCOPE-01** · `corpus/heldout5/docs/h5-04.md` · flagged by the tool, labelled by nobody

> “I'll make them sound great and tweak as needed until you're pleased”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**43. TIME-03** · `corpus/heldout5/docs/h5-23.md` · flagged by the tool, labelled by nobody

> “40% on Acceptance”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**44. SCOPE-01** · `corpus/heldout5/docs/h5-02.md` · flagged by the tool, labelled by nobody

> “i'll build the whole thing, iOS and android, with a nice clean look and all the features you mentioned”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**45. TIME-03** · `corpus/heldout5/docs/h5-11.md` · flagged by the tool, labelled by nobody

> “Payment of the retainer is not conditional on approval”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**46. SCOPE-01** · `corpus/heldout5/docs/h5-04.md` · flagged by the tool, labelled by nobody

> “Quote for Mrs. Okafor: I'll write and edit your 12 product descriptions in a warm, friendly voice”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**47. TIME-03** · `corpus/heldout5/docs/h5-15.md` · flagged by the tool, labelled by nobody

> “1,450 EUR: 40% on signing, 60% on approval of the final drawings”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**48. SCOPE-01** · `corpus/heldout5/docs/h5-14.md` · flagged by the tool, labelled by nobody

> “on edits: i'll do changes as we go, just message me, i don't count them”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**49. SCOPE-01** · `corpus/heldout5/docs/h5-02.md` · flagged by the tool, labelled by nobody

> “i'll send you builds as we go and you can tell me what you think whenever you get a chance”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**50. SCOPE-01** · `corpus/heldout5/docs/h5-02.md` · flagged by the tool, labelled by nobody

> “we'll make it feel really modern and user friendly, and i'll keep tweaking until you love it price is 4,800 total, half now and half when you're happy”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**51. SCOPE-01** · `corpus/heldout5/docs/h5-16.md` · flagged by the tool, labelled by nobody

> “If you want anything else on the day, an album, extra hours, just tell me and we'll work something out”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure

**52. TIME-03** · `corpus/heldout5/docs/h5-13.md` · flagged by the tool, labelled by nobody

> “Pipelines are handed over together; the client's lead engineer signs off after running one real release through them”

- [ ] should be flagged   - [ ] should not be flagged   - [ ] unsure


---
52 items. Contested items come first; the order inside each section is shuffled with a fixed seed. Generated from `labels.json` and `labels.b.json` of held-out sets 2 to 5.
