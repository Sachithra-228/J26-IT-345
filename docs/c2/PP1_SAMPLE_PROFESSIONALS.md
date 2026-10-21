# Sample professional directory

The eight fictional profiles in `src/lib/c2/research-professionals.json` now use Sri Lankan names, introductory descriptions, example cities and hours, and reserved `.example` contact addresses. No real qualifications, availability or university affiliations are asserted. Each card identifies itself as a fictional sample and cannot receive appointment requests.

The authenticated catalog API reads only the marked synthetic records in `c2_research_professionals`. The scoped seed verifies all eight records against the source definition. Real university professional records are unchanged.

Matching retains the existing preference filters for gender, language, profession and session mode. The remaining profiles are sorted by overlap with student-confirmed support topics, using the existing topic weights. Positive highest scores receive a “Top topic match” badge, including ties. With no overlap, the badge is absent. These are topic matches, not clinical suitability ratings or disease probabilities. DistilBERT supplies topic suggestions; it does not predict a professional's identity.

Verification: all 277 C2 tests passed across 17 suites on the final rerun. Global TypeScript and targeted ESLint passed. The live authenticated browser showed all eight database profiles, placed the two self-esteem matches first, and narrowed to Tharushi Senanayake for female / Sinhala / psychologist preferences. Selecting that sample showed the sample-only status without a booking form. A screenshot is saved at `docs/c2/evidence/sample-professional-cards.png`.

After the interrupted turn, the stopped development server was restarted at `http://127.0.0.1:3000`. HTTP checks returned 200 for `/wellness`, `/wellness/research`, `/api/c2/follow-up-questions` and the current 15-label model manifest. The unauthenticated professional catalog correctly returned 401. All eight database profiles, all 270 database questions and all 22 model/tokenizer/runtime asset hashes verified again. A fresh visual browser check after the restart was blocked when the browser refused access to its stale error-page tab; the signed-in visual checks above were completed before that interruption.

Changes remain local pending the user's explicit push approval.
