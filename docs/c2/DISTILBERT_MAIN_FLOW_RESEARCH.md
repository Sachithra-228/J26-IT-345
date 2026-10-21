# DistilBERT as the main C2 text model: research and implementation decision

Research date: 20 October 2026. Owner: D. G. A. Indeepa, IT23273412, Member 02.

Status: original research/design record, followed by implementation on 20 October 2026. The concern classifier is now trained and connected to the main check-in; see [completed implementation, actual results and PP1 guide](MAIN_DISTILBERT_PP1.md). The proposals below record the reasoning before implementation. The earlier emotion experiment remains separate.

## Recommendation

Make DistilBERT the main **text understanding and concern classification** model in the student assessment. Let its learned concern scores guide selection from a versioned follow-up question bank and contribute topics for support matching. Keep PHQ-9/GAD-7 scoring deterministic. Build the explanation from those scores, confirmed student answers and the recorded routing decisions. The implemented 100-question MongoDB bank and 5–9-question flow are documented in [the PP1 explanation](MAIN_DISTILBERT_PP1.md); this earlier document records the design rationale.

This requires additional task-specific training: the existing checkpoint predicts 27 emotions plus neutral, whereas useful follow-up topics are low mood, worry, sleep, study pressure and connection. Relabeling an emotion score as an illness probability or claiming an emotion-to-topic rule is learned routing would misrepresent the experiment.

## Comparable platforms and lessons

These three were selected for overlap with C2's requirements. This is a review of their public first-party descriptions, not a clinical effectiveness ranking or an inspection of private algorithms.

| Platform | Observed public workflow | Proposed lesson for UniCare Connect |
|---|---|---|
| Wysa | Structured reflection, conversation and a coping-skills library; its FAQ describes rule-based and, in some versions, LLM-assisted interactions, with human support options. | Combine a model with a clear question bank and support choices. Make the AI role explicit and offer a professional route. |
| MindSpot | Assessment covers symptoms, daily-life impacts and circumstances; a dashboard provides a report, followed by discussion with a therapist. | Put a readable assessment summary and a concrete next step at the end of the student flow. |
| Togetherall | Self-assessments explain scores and connect users to relevant resources; the platform also offers peer support and courses. | Connect screening to topic-relevant resources and community options, with clear privacy information. |

Sources: [Wysa FAQ](https://www.wysa.com/faq), [MindSpot assessment](https://www.mindspot.org.au/assessment/index.html), [Togetherall assessments and resources](https://togetherall.com/en-gb/faqs/using-the-togetherall-community-platform/courses-resources-and-assessments/), [Togetherall community description](https://togetherall.com/en-us/faqs/about-togetherall/).

Wysa says its consumer wellbeing service does not provide diagnoses. MindSpot describes a therapist discussing assessment outcomes and recommending treatment options. These are useful boundaries for this prototype: provide symptom ranges, explain the evidence and help students explore support. Public descriptions do not establish which proprietary models, thresholds or matching formulas these services use.

Togetherall describes professional monitoring of its community. UniCare must accurately describe its own actual moderation and privacy behavior; a similar interface does not establish equivalent staffing or safeguards.

## What the current code does

The completed `distilbert-pilot-v1` is a public English-comment emotion classifier. It is loaded by `TransformerPrediction` through `transformer-runtime.ts` in the research page. Its recorded test micro-F1 of 0.5362 measures that emotion task only.

The main `WellnessAssessment` currently uses `nextSupportQuestion` from `support-runtime.ts`, backed by a separate logistic-regression topic model trained on synthetic structured cases. `matchProviders` filters professional profiles by recorded preferences and ranks their topic overlap. The eight research profiles are explicitly synthetic and cannot receive real booking requests.

The paper behind [GoEmotions](https://aclanthology.org/2020.acl-main.372/) describes human emotion annotations on English Reddit comments. Those labels do not supervise student concern routing or clinical diagnoses. This explains the gap between the existing model and the requested main workflow.

## Proposed student journey

1. **Explain the check-in.** State its purpose, the two-week questionnaire window, how text is processed, and the available support choices. Text analysis is optional; students can still complete questionnaires and browse support.
2. **Complete PHQ-9 and GAD-7.** Retain their standard wording, response options, scoring and missing-answer handling. Adaptive context questions are separate from these instruments.
3. **Describe the situation.** Ask for a short English explanation, for example, what is affecting daily life or study. Numerical frequency answers alone are not enough input for the current text model.
4. **Run the concern-trained DistilBERT.** Produce multiple concern scores because sleep, worry and study pressure can coexist. Show a tentative interpretation the student can correct.
5. **Select follow-ups.** Ask general context about impact, duration and the student's goal. Use confirmed/model-suggested topics to choose a few unasked questions from the bank. Reconsider the routing when new narrative answers arrive. A low-confidence result leads to a neutral clarification or topic chooser.
6. **Explain the results.** Present PHQ-9/GAD-7 scores and symptom ranges, relevant reported context, tentative model topics, and suggested next steps. Clearly identify which parts come from the questionnaire, student confirmation, the model and application rules.
7. **Show support choices.** Rank suitable directory profiles and relevant community/resources using confirmed concerns. Respect profession, language, gender and session-mode preferences. Explain each match and allow browsing all eligible profiles.

The student must be able to correct the model, skip optional narrative questions, revise answers and choose support without needing a high model score. Never change screening totals because the narrative sounds positive or negative. Preserve the existing independent safety pathway; absence of a concerning model label does not establish safety.

The [University of Washington screening guidance](https://www.hiv.uw.edu/go/basic-primary-care/screening-mental-disorders/core-concept/6) distinguishes screening from the additional diagnostic evaluation needed after a positive screen. In this project, symptom ranges belong to the questionnaire calculations. Adding unrelated illness labels would require appropriate instruments, data and validation beyond the current scope.

## Exact role of DistilBERT

Recommended new run identity: `c2-distilbert-concerns-v1`. This is a proposed name, not an existing trained artifact.

| Stage | Mechanism | Learned by the new DistilBERT? |
|---|---|---|
| Interpret the student's short written situation | DistilBERT encoder and multilabel concern-classification head | Yes, after task-specific fine-tuning |
| Score possible concerns | Five sigmoid outputs: low mood, worry, sleep, study, connection | Yes |
| Detect inadequate context | Input checks, threshold/uncertainty policy, clarification and student confirmation | Application policy; thresholds selected on development data |
| Choose an available follow-up | Rank concern topics, select an unasked bank question, consider confirmed priorities | Model-informed selection with explicit application rules |
| Calculate PHQ-9/GAD-7 totals and ranges | Fixed questionnaire calculation | No |
| Write a personalised explanation | Bounded templates populated with verified scores and confirmed context | No free-form generation by this classifier |
| Rank professionals/resources | Preference filters and explainable topic matching | Application matching; not learned treatment-outcome prediction |

[Hugging Face's DistilBERT documentation](https://huggingface.co/docs/transformers/en/model_doc/distilbert) supports sequence-classification heads, including multilabel classification. The current classifier returns scores, not conversational paragraphs. Templates are suitable for this PP1 explanation layer. An open-ended generative chatbot is a separate capability and should not be claimed as an output of this classifier.

Keep the existing emotion checkpoint and evaluation as a separate completed experiment. Train a fresh concern head using a reproducibly identified encoder initialization. A reasonable first comparison is the pinned pretrained DistilBERT initialization versus the existing emotion-tuned encoder, using the same data and development protocol. Select only on development results; reuse of an encoder does not preserve the old task's performance without measurement.

## Data and additional training

Create at least 300 carefully varied **synthetic base situations** for a small prototype, each with a short narrative and explicit concern labels. This is a pilot minimum, not evidence that 300 cases are enough for dependable use. Expand only with meaningful diversity and label review. The current 1,500 structured cases are useful for designing scenarios, but adding templated prose to them does not create collected student evidence.

Include mixed concerns, no current concern (all five topic labels absent), irrelevant/ambiguous text, negation, recovery, third-person accounts and student disagreement with an initial interpretation. Label what the text actually reports. Do not infer a sleep concern from PHQ totals alone, or attach clinical diagnoses to generated cases.

Split by base situation and author/template family before augmentation. For a 300-base-case pilot, 180/60/60 is an illustrative train/development/test split; check per-topic support and overlaps before adopting it. All paraphrases and conversation prefixes from one case stay together. Build an independently written challenge set to expose template memorization. Human/supervisor review of labels is a separate quality step; do not claim review until it happens.

Use WordPiece tokenization, dynamic padding, negation preservation and a length limit chosen after inspecting narrative lengths. Avoid silently cutting off an important ending. If multiple turns exceed the limit, retain explicit question-answer context and disclose any omitted text. Initial concern training should focus on narrative text rather than serializing numerical scores into sentences and claiming free-text understanding.

Start with the existing CPU-friendly final-two-block fine-tuning setup and a newly initialized five-label head, BCE-with-logits loss and AdamW. Compare small learning-rate choices using development data. Training-only masking/paraphrasing is an optional measured ablation; the existing emotion experiment found masking did not help, so augmentation must not be assumed beneficial. Synthetic variants stay in their source split.

Preserve the original emotion report. The new model needs its own protocol, label definitions, histories, checkpoint hash, export, tokenizer parity probes and test report. It cannot inherit the old emotion model's 0.5362 micro-F1 as its concern-routing result.

Domain-specific models are a possible later comparison: [MentalBERT](https://aclanthology.org/2022.lrec-1.778/) reports benefits from mental-health-domain pretraining on its benchmarks. That does not establish superiority on our synthetic student-routing task. With PP1 on 22 October, keeping DistilBERT and measuring task-specific fine-tuning is the proposed priority.

## Evaluation that matches the claimed behavior

- Report actual training/validation BCE loss, micro/macro F1 and per-topic precision/recall; explain the chosen multilabel accuracy definition.
- Choose thresholds on development data. Record abstentions, false topic suggestions, missed topics and per-topic test support. Confidence scores are not illness probabilities.
- Compare rules, the existing logistic router and DistilBERT on common scenario IDs and the same allowed information. If the model sees narratives and a baseline does not, disclose that input difference.
- Measure question relevance against independently reviewed acceptable-topic labels where available. Topic F1 alone does not prove a question is useful or clinically appropriate.
- Separate teacher/synthetic-policy agreement from evidence involving real students. Synthetic test scores demonstrate only performance against the simulated labeling scheme.
- Verify edits invalidate stale predictions, questions do not repeat, questionnaire totals remain correct, matching filters hold, model failure permits a fallback, and synthetic profiles remain non-bookable.
- Recheck actual browser predictions against Python for the newly exported concern model. The existing 268 MB FP32 export has material startup/memory costs. Measure latency and loading behavior on the presentation machine; do not assume the old quantized export is portable.

## Example explanation and its evidence

Illustrative only; these are invented values, not a new model prediction:

> Your PHQ-9 score is 12/27 and your GAD-7 score is 11/21, both in the moderate symptom range. You reported that worry and disrupted sleep are making studying harder. The text model suggested these topics, and you confirmed them, so we asked more about sleep and exam pressure. You can explore professional support or relevant student resources. The profiles below match the support areas and preferences you selected.

Use this wording only when the actual scores, answers and confirmation support it. Do not invent duration, causes, a confirmed condition, a treatment recommendation or evidence that a particular clinician will produce better outcomes. A match explanation describes recorded profile attributes and student preferences.

## Implementation order after this research

1. Fix the intended concern labels, narrative format and reviewable question bank.
2. Prepare/split/audit the synthetic narrative pilot; preserve the completed emotion experiment.
3. Train/evaluate/export the concern DistilBERT as a separately versioned run.
4. Add optional narrative input and model feedback to `WellnessAssessment`; route using the concern model and confirmed topics.
5. Pass the resulting topics to the result explanation, professional matcher and community/resource chooser.
6. Demonstrate the complete student flow and its actual measurements; keep the research evidence accessible separately.

The intended PP1 description is: **a fine-tuned DistilBERT concern classifier drives adaptive follow-up within a questionnaire-based student support system.** This becomes an implementation claim only after the additional training and main-flow integration have actually passed verification.
