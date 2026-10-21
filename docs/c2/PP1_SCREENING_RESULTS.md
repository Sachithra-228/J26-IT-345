# C2 symptom levels and suggested support

Implemented locally on 20 October 2026. Awaiting the owner's explicit approval before any GitHub push.

## Student experience

The completed check-in now shows separate depressive-symptom and anxiety-symptom cards. Each complete questionnaire has a numeric score, a named symptom range, a colour-coded point scale with an accessible meter description, a short explanation, suggested professional support, and a practical activity idea. The scale legend and original research links are available under “How to read this scale”.

| Questionnaire | Standard symptom ranges |
| --- | --- |
| PHQ-9 | 0–4 minimal; 5–9 mild; 10–14 moderate; 15–19 moderately severe; 20–27 severe |
| GAD-7 | 0–4 minimal; 5–9 mild; 10–14 moderate; 15–21 severe |

The bars represent questionnaire points, not disease probabilities. For example, PHQ-9 13/27 and GAD-7 13/21 are both moderate, despite being different proportions of their maximum scores. Neither card diagnoses an illness or measures other conditions.

Suggested support becomes more prominent at moderate and higher ranges. Scores of 15 or above on either complete scale display stronger professional-support guidance. This is transparent application guidance, not a learned triage model or an emergency-risk classification. Lower scores still permit professional support. A completed high result remains actionable when the other questionnaire is incomplete.

Skipped items still produce an incomplete questionnaire with no total, band or meter. The independent PHQ-9 item-9 safety panel and safety-first summary remain in place regardless of totals.

The summary's support actions now appear before the detailed explanation: Find support, Build my wellness plan, Prepare appointment notes, and Talk it through. The appointment shortcut opens the existing preparation page with all assessment-inclusion choices unchecked; nothing is sent automatically.

## Model boundary

The trained DistilBERT weights, training metrics, question routing and professional matcher are unchanged. PHQ-9/GAD-7 scoring determines these symptom ranges; DistilBERT topic suggestions help personalise the existing follow-up and activity flow. This increment does not retrain a model or establish clinical accuracy. Activity wording and support guidance still need professional review.

## Verification

- TypeScript: `npx tsc --noEmit --incremental false` passed.
- ESLint: all seven edited/new TypeScript source and test files passed.
- C2 regression: 242 tests passed across 17 suites, including boundary scores, incomplete answers, both moderate results at 13 points, independent safety handling, and result-action callbacks.
- Live browser: synthetic PHQ-9 13 / GAD-7 13 produced two moderate cards. Editing the final GAD-7 answer to bring its score to 15 changed only that dimension to severe and strengthened the summary guidance.
- Live browser: the appointment shortcut opened the preparation view with unchecked inclusion controls and an empty preview.
- Browser inputs were invented software-test answers, with mood/worry topics chosen manually. This check did not run DistilBERT inference or validate clinical recommendations.
- No assessment was saved to device history, no booking or message was submitted, and no model weights were published.
- No production deployment or new mobile-device evaluation was performed for this increment.

Screenshots in `docs/c2/evidence/` are synthetic software-test examples, not student or patient records:

- `screening-severity-results.png`: PHQ-9 13 / GAD-7 13.
- `screening-severity-high.png`: PHQ-9 13 / GAD-7 15.

## Original scoring research

- [PHQ-9 validation study](https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/)
- [GAD-7 development and validation study](https://doi.org/10.1001/archinte.166.10.1092)
