# Personalized sample community circles

20 October 2026. Catalog `c2-community-circles-v1`. Trained model remains `c2-distilbert-concerns-v2`; no model training or weight change was needed.

## Student flow

After completing the check-in and adaptive questions, the screening summary automatically displays up to three matching community circles. The student can open a circle preview or browse all circles. The community view has topic/language filters and authored conversation starters. An explicit separate **Student forum** choice opens the existing account forum; the sample circles do not pretend to contain real student posts.

The 13 circles cover all 15 current topics: Study Balance LK; Campus Calm Circle; Rest & Routine; Suhada Connections; Small Steps Together; Confidence & Kindness; Space for Grief; Relationships & Boundaries; Room to Reset; Everyday Support LK; Body Respect Circle; Making Support Choices; Support at Your Pace.

Each circle is labelled a sample. No real members, activity counts, professional moderation, institutional affiliations or treatment effects are asserted. Previews accept no messages, posts or membership requests. The authored starters for eating/substance/trauma focus on respectful support and preparing professional questions, without diet/withdrawal/exposure instructions or requests for event details. Professional content review remains pending.

## Matching and privacy

The current trained model provides saved scores for student-confirmed topics. The community matcher reuses the plan's topic priorities, including its validation of model identity, manual-topic fallback and explicit topic dismissal. It sums priorities overlapping each circle's recorded topics. Matching focus keys add .5 each for specific earlier answers, such as workload planning, exam worry, wanting company while grieving or housing support. A focus match cannot create a recommendation without topic overlap.

Positive matches are ordered by this policy score. The student can browse unrelated themes explicitly; zero-overlap circles are not labelled top matches. The score is a software relevance score, not a clinical suitability or illness probability. The neural model does not output community IDs, learn social memberships or auto-enroll students. Students with similar confirmed needs may receive the same circles; different names/accounts alone do not determine recommendations.

All matching uses the check-in locally. The catalog request is the constant GET `/api/c2/research-communities` with no assessment text, answers, scores, topics or student IDs in the request. The public endpoint projects only marked synthetic, active, versioned catalog content from `c2_research_communities`. It does not read private student records or write to forum collections. If unavailable, the component explicitly identifies its bundled sample-catalog fallback.

## Setup and evidence

```powershell
npm run c2:communities:seed
npm run c2:communities:verify
```

The scoped seed upserts only the known marked synthetic IDs and verifies each source field. It created no forum posts, memberships or notifications. All 13 records and all 15 topic types were verified. The live API returned 200 with 13 sample records and no user/member fields.

Replaying saved genuine v2 model outputs through the actual matcher produced:

| Check-in | Recommended circles |
| --- | --- |
| Study pressure / worry, workload planning and exam answers | Study Balance LK; Campus Calm Circle |
| Self-esteem / grief, self-criticism and missing-someone answers | Confidence & Kindness; Space for Grief |

The actual browser reran DistilBERT for the study/worry narrative, completed the adaptive questions and automatically showed the first pair on the summary with matching reasons. Opening Study Balance LK showed its authored starters in the full community view. Eating-topic/Sinhala filtering showed the no-match state, and resetting filters exposed all 13 circles. No publishing action was taken.

Validation: 299 C2 tests passed across 20 suites; TypeScript and targeted ESLint passed. The ten community/API tests passed again after final presentation/test-isolation cleanup. Tests cover catalog provenance and coverage, different scenario rankings, current model priorities, rejected topics, manual fallback, answer-sensitive explanations, filters, read-only previews, constant GET requests and database-error fallback. These are software checks, not community outcome or clinical validation.

Sources: [catalog](../../src/lib/c2/research-communities.json), [matching code](../../src/lib/c2/communities.ts), [component](../../src/components/c2/wellness-communities.tsx), [seed evidence](evidence/community-catalog-seed.json), [verification](evidence/community-recommendation-verification.json), [browser preview](evidence/community-recommendations.png).

## PP1 explanation

“My fine-tuned DistilBERT identifies support topics from the student's description. After topic confirmation and follow-up questions, local recommendation rules use those priorities and specific answers to rank a topic-tagged sample community catalog. Matching reasons are shown and the student decides what to explore. This demonstrates personalized routing, not a newly trained community-ID model or proof that a peer group is clinically suitable.”

Current implementation remains local pending explicit push approval. The same trained v2 model ZIP is used; a new model package is not required for this code/catalog increment.
