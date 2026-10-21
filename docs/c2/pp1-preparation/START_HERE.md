# Anuk's C2 PP1 preparation

Prepared 20 October 2026 for PP1 on 22 October. The individual time limit is unconfirmed and includes explanation, website demonstration and Q&A. The suggested timings below are rehearsal choices, not official requirements.

## Do this first

1. Read the opening explanation below aloud until you can explain it without reading.
2. Open [presentation outline and speaking notes](PRESENTATION_OUTLINE.md). Use its core sequence; keep detailed ML material ready for questions.
3. Practise [the website walkthrough](DEMO_SCRIPT.md) using the two invented cases. They are software examples, not participant records. Do not submit an actual appointment or forum post during the walkthrough.
4. Study [the ML and proposal Q&A](LECTURER_QA.md). Start with the questions marked Essential.
5. Test the matching source and model package on the laptop that will be used. The local changes have not been pushed. Request/obtain Anuk's explicit approval before a Git push; model publication is a separate decision.

## Opening explanation to practise

“My component helps a student move from a wellbeing check-in to a useful next step. PHQ-9 and GAD-7 calculate depressive and anxiety symptom ranges from questionnaire answers. A DistilBERT model, fine-tuned locally on synthetic student narratives, suggests support topics from English text. The student confirms or corrects those topics. Application rules then combine those topics with earlier answers to choose follow-up questions, suggest activities and rank professional profiles. These outputs support a conversation; they do not diagnose illness.”

Follow with the proposal boundary:

“At PP1 I can demonstrate the text branch and the support workflow. The proposal's optional facial-quality and fusion comparison, independent counselor labels and approved local participant evaluation remain planned work.”

Use a different scope statement only if you have a documented supervisor-approved scope change.

## Open these before presenting

- Main website: `http://127.0.0.1:3000/wellness`
- Main ML evidence: `http://127.0.0.1:3000/wellness/research`
- [Actual v2 training source](../../../ml/c2/train_concerns.py)
- [Shared model construction and preprocessing](../../../ml/c2/train_distilbert.py)
- [Synthetic data generator](../../../ml/c2/generate_concern_cases_v2.py)
- [Current v2 evaluation](../evidence/c2-distilbert-concerns-v2-evaluation.json)
- [Current question selection](../../../src/lib/c2/concern-routing.ts)
- [Current profile matching](../../../src/lib/c2/support.ts)
- [Full rubric/proposal review](../PP1_READINESS_REVIEW_2026-10-20.md)

The Research & ML page leads with the current 15-topic model. Older experiments are separate; avoid mixing their datasets, hyperparameter searches or results into the v2 explanation.

## Laptop setup

In PowerShell from the matching project checkout:

```powershell
cd D:\NewReaserch\J26-IT-345
npm run c2:models:verify
npm run dev
```

If port 3000 already has this development server running, use it rather than starting another. On another laptop the directory will differ. Install matching v2 assets first using [the transfer instructions](../RUN_ON_ANOTHER_LAPTOP.md); Python/retraining is not required for website use. Configure the team's environment privately. Never put environment values or passwords on slides or recordings.

Model inference runs locally in the browser, but sign-in and database features need their configured services. Do not describe the whole application as offline-capable.

## Flexible rehearsal plan

- If the slot is short: opening → compact ML explanation → one walkthrough → proposal progress → Q&A.
- If more time is allowed: add the second case, changed-answer branch, per-topic errors and business explanation.
- Practise a concise answer first, then expand if asked. Do not rush through every backup detail just because it is available.

## What the old team deck needs

The supplied 13-slide progress deck is dated 8 October. Slide 4 groups C2/C3/C4 as “Planned, not started”; slide 12 lists C2 scoring/chat/text work as remaining. Those statements no longer describe the current C2 checkout. This pack supplies replacement C2 wording in the outline. Other members' progress has not been audited here. Do not infer that all members' old statuses are current.

The original shared deck has not been edited. This pack contains an outline, speaking notes, demo scripts and Q&A, not a finished PPTX.
