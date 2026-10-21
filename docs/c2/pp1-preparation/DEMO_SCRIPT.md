# Website demonstration script

All inputs below are invented software walkthrough cases, not real student disclosures. Model outputs were checked using the current exported ONNX model on Python CPU on 20 October 2026. Scoring, question paths, activities and professional ordering were checked by executing the actual TypeScript functions. This does not replace a fresh browser rehearsal on the presentation machine.

[Exact recorded inputs, predictions and routed outputs](demo-scenarios.json).

## Before the presentation

1. Use matching v2 code and model assets. Run `npm run c2:models:verify` from the project folder.
2. Start or reuse the site. Open `http://127.0.0.1:3000/wellness` and sign in privately if needed.
3. Open `/wellness/research` in another tab. Keep it on the main 15-topic model; older experiments remain separate.
4. Run a real topic suggestion on this laptop once to confirm inference works. Measure the wait rather than guessing. Explain if an in-memory model was prepared before the live walkthrough. The model may need to load again after refreshing/leaving.
5. Keep screenshots and the saved evidence available if network/authentication or loading fails. Label a screenshot as a recording of an earlier run. The entire application is not an offline application.
6. Do not put `.env` files, credentials or unrelated student account details on the projector. Keep the browser on the C2 content.

Frequency key: 0 = Not at all; 1 = Several days; 2 = More than half the days; 3 = Nearly every day. Values are in the website's displayed questionnaire order. Keep every questionnaire item and its two-week recall wording unchanged.

## Main case A: study pressure and worry

### Questionnaire inputs

| Scale | Values in item order | Expected software result |
| --- | --- | --- |
| PHQ-9 | 2, 2, 2, 2, 1, 2, 2, 0, 0 | 13/27, moderate symptom range |
| GAD-7 | 2, 2, 2, 2, 1, 2, 2 | 13/21, moderate symptom range |

Say: “These are prepared walkthrough answers. The totals come directly from questionnaire scoring.”

### Narrative and actual topic inference

Paste:

> I keep worrying about my exams and deadlines. I struggle to plan my study workload and I feel overwhelmed by assignments.

Select **Suggest topics**.

The current recorded export selected **study** (rounded score 1.0000) and **worry** (.6015), using threshold .25. A rounded 1.0000 is a saturated topic score, not perfect certainty or a clinical probability. Leave the two selected topics confirmed. If your live result differs, show it honestly and record the model version rather than claiming the saved output was just produced.

Say: “DistilBERT suggested these topics from the wording. The student can add or remove suggestions before continuing.”

### Follow-up answers

With the same topics, model scores, questionnaire inputs and bank version, the recorded path is:

| Order | Question | Choose |
| --- | --- | --- |
| 1 | How are your current concerns affecting your study routine? | I would like help planning my workload |
| 2 | Which part of planning your workload needs the most support? | Choosing priorities |
| 3 | Which area is most connected to your worry right now? | Study or exams |
| 4 | Which university situation brings the most worry? | An approaching exam |
| 5 | How much are these concerns getting in the way of your day? | Somewhat difficult |
| 6 | What would feel most useful to you today? | Practical coping ideas |

Say: “There are 270 available questions, but the system asks a small relevant subset. The neural model supplies topic priorities; explicit branching and stopping rules choose the exact questions.”

### Demonstrate a changed answer

Do this during rehearsal or Q&A if time is short:

1. Go back to the first study question.
2. Change the answer to **Starting tasks is difficult**.
3. Continue. The next question should become **What makes starting a study task most difficult?** rather than the workload-planning question.
4. To resume the recorded case A path, go back and restore **I would like help planning my workload**. Follow the displayed path; do not reuse stale later answers.

The code check confirmed a change from question ID `study-workload` to `study-starting`. A browser walkthrough of this exact pair still needs rehearsal.

### Results and activity

Show the PHQ/GAD symptom ranges and the explanation of confirmed topics and answers.

Open **My plan**. The recorded activities are:

- Make room in your workload.
- Find a next step for a worry.
- Pause and notice.

Open the workload activity and show one step. Explain that activity selection is transparent application logic, not a new trained treatment recommender.

### Professionals and appointment preparation

Before leaving the summary, show **Communities to explore**. Case A now automatically recommends **Study Balance LK** and **Campus Calm Circle**, with matching reasons. Opening Study Balance LK leads to its sample preview and authored starters. This does not join a group or post the check-in. [Community matching details](../PP1_COMMUNITY_RECOMMENDATIONS.md).

Open **Find support → Professionals** and choose **Sample profiles · matching preview**.

With no preference filters, **Nethmi Perera** ranked first in the recorded catalog because both confirmed topics overlap with the listed support areas. Set **Female**, **Sinhala**, **Counselor** to narrow to that profile. Show the listed reasons, sample label and selection state. An eventual change in catalog metadata can change the ordering.

Say: “The profile matches the topics and stated preferences. This is not proof of clinical suitability, and this fictional profile cannot accept appointments.”

Open appointment preparation. Explicitly choose which scores/topics to include; show the preview. Do not submit a real booking or send these invented answers to anyone.

## Backup case B: grief and self-esteem

Use a separate rehearsal session, or clear only the current invented check-in after saving no private information. Do not erase another person's progress/history. If time is short, keep screenshots and the recorded case ready rather than doing a full second check-in live.

### Questionnaire inputs

| Scale | Values in item order | Expected software result |
| --- | --- | --- |
| PHQ-9 | 1, 2, 1, 1, 0, 2, 1, 0, 0 | 8/27, mild symptom range |
| GAD-7 | 1, 1, 0, 1, 0, 1, 0 | 4/21, minimal symptom range |

### Narrative

> I am grieving the death of someone close to me and I keep criticising myself.

Request suggestions. The recorded selected topics were **self-esteem** (.9754) and **grief** (.9736), in that score order. Keep those confirmed for this walkthrough.

### Follow-up answers

| Order | Question | Choose |
| --- | --- | --- |
| 1 | Which confidence or self-esteem concern feels most relevant? | Harsh self-criticism |
| 2 | Which part of grief or loss would you like support with? | Missing someone |
| 3 | When self-criticism starts, what would you like help noticing? | A balanced alternative |
| 4 | What kind of company would feel welcome when missing someone? | Someone listening |
| 5 | How much are these concerns getting in the way of your day? | Somewhat difficult |
| 6 | What would feel most useful to you today? | Practical coping ideas |

The recorded plan is **Try a more balanced perspective**, **Choose a gentle step while grieving**, and **Pause and notice**. The top sample profile is **Tharushi Senanayake**, whose support areas overlap with both topics. Female / Sinhala / Psychologist preferences narrow to that example.

The corresponding community suggestions are **Confidence & Kindness** and **Space for Grief**. These were verified by replaying the saved model output through the matcher; only case A received a fresh full browser walkthrough for this increment.

Say: “The topic and answer changes lead to different questions and activities. Minimal anxiety symptoms do not mean the student has no support needs.”

## Show the actual ML work

Open `/wellness/research` and demonstrate, in order:

1. Current run `c2-distilbert-concerns-v2`; 15 labels; 1,800/600/600 data split.
2. Real training and validation curves. Explain the gap rather than hiding it.
3. Held-out metrics and same-data TF-IDF/logistic comparison.
4. Per-topic precision, recall, F1 and a recorded failure.
5. Actual training code and the inference inspector if asked. Inference is not training, and the public page does not launch a training job.

Use [LECTURER_QA.md](LECTURER_QA.md) for technical explanations.

## If something fails during the presentation

| Failure | What to do and say |
| --- | --- |
| Model loading fails | Show the error/manual-topic route. Explain that model-assisted suggestions are unavailable in that run. Use saved evidence for the earlier verified inference; do not imply manual topics came from ML. |
| Prediction misses a topic | Show student correction. Explain the English synthetic-data/generalization limitation. |
| Directory requires sign-in | Sign in privately or show the earlier saved card screenshot. Do not remove authentication to make the walkthrough work. |
| Network/database fails | Distinguish the bundled identical question bank fallback from the live database catalog. Do not invent provider availability. |
| Different questions appear | Check confirmed topics, input answers, model/bank version and previous context. Explain that changing inputs can change the path. |
| Time is nearly finished | Stop after one coherent end-to-end case. Keep case B and code detail for questions. |

Final preparation gate: successfully repeat at least case A in the actual browser on the presentation laptop. Code-level scenario checks and saved screenshots alone are not that rehearsal.
