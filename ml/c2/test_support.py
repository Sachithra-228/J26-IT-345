"""Input/artifact audit, not a second estimate of model performance."""
import json
import unittest
from collections import Counter
from support_common import DATA, EVIDENCE, OUT, ROOT, SPEC, SEED, features, names, sha, snapshots

class SupportExperimentAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows=[json.loads(line) for line in (DATA/'support-cases.jsonl').read_text(encoding='utf-8').splitlines()]
        cls.manifest=json.loads((DATA/'support-manifest.json').read_text())
        cls.report=json.loads((EVIDENCE/'support-evaluation.json').read_text())

    def test_unique_cases_and_frozen_divisions(self):
        self.assertEqual(len({r['id'] for r in self.rows}),1500)
        self.assertEqual(Counter(r['split'] for r in self.rows),{'train':900,'dev':300,'test':300})
        self.assertEqual(len({features(r).tobytes() for r in self.rows}),1500)
        self.assertTrue(all(r['sourceType']=='synthetic' for r in self.rows))

    def test_frozen_source_and_artifact_hashes(self):
        for name,key in [('support-cases.jsonl','jsonlSha256'),('support-cases.csv','csvSha256'),('support-policy.json','policySha256')]:
            self.assertEqual(sha(DATA/name),self.manifest[key])
        self.assertEqual(sha(ROOT/'src/lib/c2/support-spec.json'),self.manifest['schemaSha256'])
        self.assertEqual(sha(OUT/'support-model.json'),self.report['modelSha256'])

    def test_valid_answers_and_explicit_simulator_targets(self):
        for row in self.rows:
            self.assertEqual(len(row['phq9']),9)
            self.assertEqual(len(row['gad7']),7)
            self.assertTrue(all(v in range(4) for v in row['phq9']+row['gad7']))
            self.assertEqual(row['phq9'][8],0)
            self.assertIn(row['simulatedFollowup'],SPEC['classes'])
            self.assertEqual(len(row['simulatedTopics']),5)
            self.assertFalse(any(key in row for key in ['diagnosis','name','email','latentFunctioning']))
        self.assertFalse(any('simulated' in name or name=='phq9_9' for name in names()))

    def test_snapshot_cv_keeps_base_cases_together(self):
        from sklearn.model_selection import StratifiedGroupKFold
        train=[r for r in self.rows if r['split']=='train']
        x,y,_,groups=snapshots(train)
        self.assertEqual(x.shape,(3600,73))
        self.assertEqual(set(Counter(groups).values()),{4})
        for keep,validation in StratifiedGroupKFold(3,shuffle=True,random_state=SEED).split(x,y,groups):
            self.assertFalse(set(groups[keep])&set(groups[validation]))

    def test_evaluation_denominators_and_all_candidates(self):
        report=self.report
        self.assertEqual(sum(map(sum,report['test']['selected']['confusionMatrix'])),300)
        self.assertEqual(sum(r['support'] for r in report['test']['selected']['perClass'].values()),300)
        self.assertEqual(len(report['trainingCV']['support']),5)
        self.assertEqual(len(report['trainingCV']['router']),3)
        self.assertEqual(report['test']['routing']['repeatedQuestions'],0)
        self.assertLessEqual(report['test']['uncertainty']['acceptedCases'],300)

if __name__=='__main__':
    unittest.main()
