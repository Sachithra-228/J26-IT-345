# C2 proposal review and improvement priorities

Review date: 20 October 2026. Member 02: D. G. A. Indeepa, IT23273412. This is a review and implementation recommendation; it does not claim these additions are already built.

Implementation update later on 20 October: the personal plan, seven guided activities, optional device history and appointment preview/download have now been implemented. See [the implementation and verification walkthrough](PP1_NEXT_STEPS_INCREMENT.md). The original review below records the prioritization basis; facial fusion, professional review, confidential assigned-counselor sharing and participant evaluation remain outstanding.

## Main finding

The strongest next website increment is a complete path from assessment to a student-chosen action, a useful guided activity and a later check-in. Another larger model or more questions would add less immediate value. The current trained DistilBERT experiment is a real implementation contribution, but it covers the text branch of the proposal. It does not complete the proposed facial-feature, fusion or confidential referral research.

This review uses the detailed 37-page `IT4010 Research Project – J26-IT-345 DGA.Indeepa – IT23273412.pdf` in `D:/Reaserch` as the working requirements basis, especially pages 13–22. Other supplied templates/drafts were inspected for context. This review does not establish which version the supervisor formally approved. If the signed scope differs, reconcile the requirements before treating the later research plan as mandatory.

## Current implementation against the proposal

| Proposal commitment | Current implementation evidence | Remaining work |
| --- | --- | --- |
| O1: requirements, literature, interviews and professional review | Literature/design material and source-linked content exist. No confirmed interview or professional content-review results were found in the inspected implementation evidence. | Record actual supervisor decisions and any completed interviews/reviews; distinguish planned activity from completed evidence. |
| O2: PHQ-9/GAD-7, journals, granular consent and bounded assistant | Questionnaire scoring, a 100-question bank with 5–9-question routing, screening explanations, session reflections and a prepared-reply chat exist. | Useful activity flows; optional persistence and progress; explicit controls for any new saving/sharing. Current writing and assessment are temporary page state. |
| O3: separate text and optional on-device facial pipelines | A fine-tuned five-topic DistilBERT concern classifier, a separate emotion experiment, export checks and training reports exist. | No active camera feature pipeline. The detailed proposal names MobileNetV2 as a candidate for facial-expression features; DistilBERT fits its transformer text branch. |
| O4: questionnaire/text/fixed-fusion/quality-aware-fusion comparisons | Text-model baselines and a separate synthetic structured-support experiment exist. | No matched-participant multimodal comparison or independent counselor-reference evaluation. Scores from different prediction tasks cannot fill this gap. |
| O5: confidential counseling and role-appropriate dashboards | University booking service, preference filters, topic matching and a separate eight-profile fictional matching catalog exist. | Assigned-counselor access, student-approved summary sharing and full referral lifecycle. The current booking endpoint allows broad staff roles to request all bookings; do not attach private assessment/journal data under an assumption of counselor-only access. |
| O6: local usability and feasibility evaluation | Automated tests, browser demonstrations and synthetic ML evaluation reports exist. | Actual approved participant task outcomes, original SUS responses/scoring, counselor review and documented limitations. Software-test counts are not usability scores. |

Key implementation references: `src/components/c2/wellness-assessment.tsx`, `src/lib/c2/concern-routing.ts`, `src/lib/c2/concern-runtime.ts`, `src/components/c2/wellness-reflections.tsx`, `src/lib/c2/assistant.ts`, `src/app/api/counselor-bookings/route.ts` and `docs/c2/MAIN_DISTILBERT_PP1.md`.

## Patterns from established products

These are observations from first-party product material, not independent proof of effectiveness and not a claim that UniCare is equivalent to those services. No authenticated competitor account or paid service was tested.

| Reference | Observed pattern | Relevant UniCare addition |
| --- | --- | --- |
| [NHS Every Mind Matters](https://www.nhs.uk/every-mind-matters/) | A brief questionnaire leads to a personalised plan with achievable actions. | After screening, offer a short editable action plan tied to confirmed topics and the student's chosen goal. |
| [Wysa clinical-program FAQ](https://www.wysa.com/faq-clinical-program) | Goals, guided skill practice, self-monitoring and consent-based care information sharing. | Connect check-in context to structured activities and let the student choose what enters a prepared appointment summary. Wysa describes a combination of rules and language models; adding an unrestricted generative chat is not necessary to demonstrate a useful assistant. |
| [Togetherall student/trained-peer information](https://togetherall.com/en-us/campaigns/togetherall-trained-peers-program/) | Community support is combined with self-guided courses, assessments, journaling and goal setting. | Connect community topics to practical activities and private progress. Togetherall also supplies professional moderation; UniCare must not claim that a discussion forum has the same staffing or monitoring. |

## Recommended website increments

### 1 Personal action plan

Add a clear **My next steps** section after the existing summary. Offer up to three suggested actions, using confirmed topics, explicit follow-up answers and the preferred support goal. Each card states why it was suggested, a small achievable action, an approximate duration, a source and a button to start or replace it. The student chooses the plan; completing an action does not alter screening scores.

For example, a student who reports study pressure and difficulty starting tasks could receive a task-breakdown activity, a choice of a support conversation and relevant student discussion topics. A different sleep-focused check-in should produce a different plan. This selection can be transparent application logic informed by DistilBERT topics; do not present it as a newly trained treatment recommender.

Acceptance evidence: contrasting scenarios produce relevant plans; changing/removing a topic updates the plan; declined actions are not forced back in; a failed model leaves manual topics and support usable.

### 2 Guided activities inside the website

Replace repeated generic chat responses with a small number of structured, source-linked activity flows. Suitable initial categories are breaking a study task into steps, reflecting on a worry, planning a wind-down routine and preparing to contact someone. Draft original interface wording and obtain professional review; copying a competitor's clinical content does not transfer its evidence or permissions.

Let a student choose whether to use their current check-in topics in the guide. Ask what they want to work on, walk through a bounded activity, then optionally ask how helpful it felt. A before/after self-rating is feedback about that activity, not proof of treatment benefit. Keep direct professional-support navigation available. The classifier identifies concern topics; it is not a conversational language generator.

Acceptance evidence: the guide remembers the chosen topic and step; back/skip/stop work; irrelevant input receives clarification; it makes no diagnosis or prescription; direct concerning disclosures retain the separate human-support route.

### 3 Optional progress and mood history

Current assessment/reflection state clears on refresh; it is not a longitudinal journal. Add an explicit choice to save selected mood ratings, plan completion and screening summaries, with dates and model/questionnaire versions. For a small first increment, a device-only store is possible, but describe it as device storage, explain shared-device visibility and provide deletion. Cross-device account history requires authenticated record-level access and a separate storage design.

Use brief mood/context entries for frequent reflection. Keep PHQ-9/GAD-7 wording and two-week recall unchanged; do not frame repeated daily questionnaire totals as independent clinical change. Charts must distinguish a personal mood rating from PHQ/GAD totals and never fabricate history. Any seeded history used in the research demonstration must be clearly identified as synthetic.

Saving would change the current session-only privacy behavior. Update all affected notices and chat explanations and obtain the student's choice before persistence. Do not add background collection of journals for model training.

Acceptance evidence: an unsaved session remains unsaved; opt-in saves only selected fields; reload behavior matches the choice; deleting records works; users cannot read another student's records if server persistence is later added.

### 4 Prepare for a counseling appointment

Add **Prepare my appointment summary** with a student-editable preview: reported concerns, relevant dates, screening ranges, desired help and questions to ask. Let the student exclude journal content or individual answers. A local print/download summary is a smaller first increment than automatic clinical sharing.

Later, implement explicit sharing to a verified assigned professional, record-level authorization, sharing withdrawal where applicable and neutral notifications. Current broad booking-staff access must be resolved before sensitive summaries are attached to requests. A sample matching profile remains unavailable for real bookings and must not be presented as a qualified available provider.

Acceptance evidence: preview and export contain only selected content; no summary is automatically sent; matching preferences still work; sample profiles cannot receive real requests.

### 5 Explainable, usable model loading

Make the first large model download understandable: preparation/download state, retry and a working manual-topic path. Consider browser asset caching by version to avoid repeated transfers, and test cache invalidation against the recorded model identity. Keep detailed numeric scores in Research & ML rather than presenting them as diagnosis probabilities.

The transfer ZIP is prepared and its installer passed a clean-folder round trip. Public Release upload and Vercel automatic provisioning remain incomplete because publication approval was not given. The user currently plans to transfer the trained package privately to their friend. Verify actual model inference on that friend's machine or hosted deployment; a page loading is not evidence that the neural model ran.

## Research improvements that matter more than a larger model

Preserve the completed v1 reports. The main experiment records substantial train/validation overfitting, synthetic wording assumptions and errors on negation, recovery and third-person text. Report those honestly. More template-generated cases alone do not solve them.

For a new version, define a fresh evaluation protocol before fitting: independent wording families, explicit ambiguous/irrelevant/negated examples, controlled learning-rate and regularization trials and development-only threshold decisions. Keep the original test report frozen. Seek independent annotation or professional review when feasible; label any synthetic-only evaluation as such. A calibrated clinical probability cannot be claimed from topic-classifier scores.

For the current 100-question flow, evaluate actual answer trajectories: topic coverage, duplicate questions, branch changes, stopping within 5–9 questions, responses that dismiss a topic, missing answers and model-load failure. Professional relevance review is separate from these software checks. The exact question choice currently combines model-ranked topics with explicit rules; it is not a trained 100-class question-ID predictor.

The proposal's biggest later research task is an optional facial pipeline and a properly matched multimodal comparison. Treat MobileNetV2 as a candidate expression-feature extractor, subject to authorized data and task evaluation. Preserve a fully usable camera-free path, gate poor captures and retain missingness. Do not infer depression/anxiety from a face or combine unrelated image/text/questionnaire rows as if they came from one student. If the supervisor approves a scope change away from facial fusion, document that change rather than implying DistilBERT alone answers the original fusion question.

## Practical order before PP1 on 22 October

1. Verify the transferred model produces predictions on the presentation laptop. Keep a known synthetic walkthrough, hashes, source code and the real training/evaluation evidence available.
2. Implement the action plan and a small set of bounded guided activities first. Demonstrate two distinct student scenarios and their different next steps.
3. Add the editable appointment-summary preview/export if time permits. Keep automatic counselor sharing for the access-controlled referral increment.
4. Add opt-in history only with working consent/deletion and accurate privacy text. A well-tested smaller flow is a stronger PP1 demonstration than unfinished persistence.
5. Show a traceability table and the explicit remaining plan for facial input, fusion, independent labels and approved participant evaluation. Do not present all proposal objectives as completed.

This ordering is a recommendation for the remaining preparation window, not a promise that every item fits before PP1. No new product features, model training or participant study were performed as part of this review.
