# ML-informed wellness plan

20 October 2026. Planning policy `c2-topic-plan-v2`; trained model remains `c2-distilbert-concerns-v2`.

The plan now uses the existing main model's saved topic scores to prioritize prepared activities, alongside confirmed topics and follow-up answers. No additional neural model was trained, no treatment outcomes were collected and no therapeutic-effectiveness claim is made.

## Decision flow

1. Reuse the completed DistilBERT prediction in the current check-in; building or opening the plan does not start another download or inference.
2. Accept model priorities only when the prediction has the current run/checkpoint identity and all 15 finite, valid topic scores. Otherwise use the student's topics/answers without claiming ML involvement.
3. Only topics in the current support-topic set can become recommendations. An unconfirmed high score does not introduce a topic. Explicit no-current-concern answers remove their topic from activity suggestions.
4. A topic gets a policy priority of `1 + max(.5, model score)` when it was confirmed and meets the model threshold. A manually added or model-unavailable topic gets `1.5`, so it is retained as a valid choice. A recognized topic-entry answer adds `.25`; an answered eligible conditional detail adds `.1`. These weights are application choices, not learned clinical coefficients or urgency scores.
5. Choose the authored activity for each topic, using the workload-planning activity for the corresponding study answer. Sort by priority and suggest up to three distinct actions. Other confirmed-topic activities remain available in a grouped selector. General options fill unused slots.
6. Show the source and reason for each suggestion. The student can start the first suggestion, replace any activity or restore the suggested plan. A change to the check-in invalidates old overrides and closes an old activity draft in the component.
7. A preferred professional or community next step is highlighted above activities. Safety support remains independent. PHQ/GAD totals are not repurposed as activity-effectiveness predictions. Incomplete questionnaires remain visibly incomplete.

## What to say at PP1

“The fine-tuned DistilBERT model provides topic priorities from the student's description. After the student confirms those topics, my planning rules combine those priorities with follow-up answers to rank prepared support activities. Each recommendation explains its basis, and the student can change it. This is ML-informed personalization, not a separately trained treatment recommender.”

This adds an observable use of the trained text model downstream of question selection. It does not complete the proposal's facial/fusion experiment or prove that one activity improves health more than another.

## Verification

- Current C2 suite: 289 tests passed across 18 suites, including 12 added recommendation/UI cases. TypeScript and targeted ESLint passed.
- Tests cover changing model scores for identical topics, answer-sensitive selection, rejecting unconfirmed topics, retaining student-added topics, invalid/stale model fallback, independent safety/questionnaire inputs, student replacement/restoration and updated check-in state.
- Both stored rehearsal scenarios were replayed through the actual scoring, routing, plan and professional matcher; their paths and top activities remain consistent with the demo script.
- The actual browser ran the trained model on the study/worry rehearsal narrative, selected those two topics, completed six follow-ups and produced PHQ/GAD 13/13. Building the plan showed workload and worry activities with ML-informed labels, entry/detail explanations and a general third option. Opening the suggested activity, replacing it with a wind-down activity and restoring the original suggestions all worked. No booking, forum post, progress save or participant data collection occurred.
- Saved previews: [suggested first action](evidence/ml-informed-plan.png) and [ranked activities](evidence/ml-informed-plan-activities.png).

Implementation: [ranking and plan](../../src/lib/c2/wellness-plan.ts), [plan UI](../../src/components/c2/wellness-plan.tsx), [tests](../../tests/unit/c2/plan-recommendations.test.tsx).

All changes remain local pending the owner's explicit push approval. Model weights and training reports were not changed.
