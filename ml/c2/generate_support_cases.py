"""Seeded simulator: invented cases/labels, never real students or diagnoses.

Policy is frozen before fitting. Latent concern, functioning and duration values
generate imperfect questionnaire/context observations AND simulated labels. Shared
assumptions make results optimistic even without target-column leakage.
"""
from __future__ import annotations
import csv
import numpy as np
from sklearn.model_selection import train_test_split
from support_common import DATA, SPEC, QUESTIONS, SEED, WARNING, features, sha, write

POLICY = {
    'version': 'c2-simulator-policy-v1', 'seed': SEED,
    'purpose': WARNING,
    'latentGeneration': 'Three overlapping burden strata; independent topic perturbations, functioning and persistence. These are engineering assumptions, not measured student prevalence.',
    'topicLabels': 'Five latent topic intensities >= 0.48; relevance grade 0/1/2/3 at 0.25/0.48/0.70.',
    'followupLabel': '0.35*mean(top-two latent concerns) + 0.40*latent functional burden + 0.25*latent persistence + N(0,0.045); optional/routine/prompt cutoffs 0.34 and 0.66. A latent desire for professional help raises optional to routine.',
    'observations': 'Noisy ordinal questionnaire items and categorical context observations. Not clinically validated response distributions.',
    'safety': 'Benchmark cases use PHQ item 9 = 0. Separate software challenges test positive/unanswered item 9. No learned safety target or safety feature.',
    'missing': 'Context answers independently omitted with probability 0.12. Missing questionnaire items are separate challenge cases; the deployed estimator withholds its result for incomplete questionnaires.',
    'limitations': ['Inputs and labels share simulator assumptions.', 'No independent counselor labels.', 'No real participant data or clinical evaluation.', 'No disease diagnoses in target fields.'],
}

def generate():
    rng = np.random.default_rng(SEED)
    rows = []
    keys = set()
    while len(rows) < 1500:
        center = (0.12, 0.48, 0.84)[len(rows) % 3]
        z = np.clip(center + rng.normal(0, 0.23, 5), 0, 1)
        # Deliberately include discordant topics rather than five identical scales.
        z[int(rng.integers(5))] = rng.uniform()
        impairment = float(np.clip(0.55 * center + 0.45 * rng.uniform() + rng.normal(0, 0.10), 0, 1))
        persistence = float(np.clip(center + rng.normal(0, 0.27), 0, 1))
        wants_help = bool(rng.random() < 0.15 + 0.55 * center)
        def ordinal(value):
            return int(np.clip(np.floor(4 * np.clip(value + rng.normal(0, 0.19), 0, 0.999)), 0, 3))
        p = [ordinal(v) for v in [z[0], z[0], z[2], .55*z[0]+.45*z[2], z[0], z[0], .5*z[0]+.5*z[3], .5*z[0]+.5*z[1]]] + [0]
        g = [ordinal(z[1]) for _ in range(7)]
        raw_context = {
            'impact': QUESTIONS['impact']['options'][ordinal(impairment)],
            'duration': QUESTIONS['duration']['options'][4 if max(z) < .2 else 2 if persistence > .66 else 1 if persistence > .33 else int(rng.choice([0,3]))],
            'goal': QUESTIONS['goal']['options'][1 if wants_help else 2 if z[4] > .55 else int(rng.choice([0,3]))],
            'mood': QUESTIONS['mood']['options'][2 if z[4] > .65 else 3 if impairment > .65 else int(rng.choice([0,1,4]))],
            'worry': QUESTIONS['worry']['options'][0 if z[3] > .6 else 2 if z[4] > .6 else int(rng.choice([1,3,4]))],
            'sleep': QUESTIONS['sleep']['options'][int(rng.integers(4))],
            'study': QUESTIONS['study']['options'][0 if z[3] < .3 else 2 if impairment > .6 else int(rng.choice([1,3]))],
            'connection': QUESTIONS['connection']['options'][0 if z[4] < .3 else 2 if z[4] > .65 else int(rng.choice([1,3]))],
        }
        context = {k:v for k,v in raw_context.items() if rng.random() >= .12}
        burden = .35*np.mean(sorted(z)[-2:]) + .40*impairment + .25*persistence + rng.normal(0,.045)
        label = 2 if burden >= .66 else 1 if burden >= .34 or wants_help else 0
        case = {'id': f'SYN-C2-{len(rows)+1:04d}', 'sourceType': 'synthetic', 'phq9': p, 'gad7': g, 'context': context,
                'simulatedFollowup': SPEC['classes'][label], 'simulatedTopics': (z >= .48).astype(int).tolist(),
                'simulatedRelevance': np.digitize(z, [.25,.48,.70]).tolist()}
        key = features(case).tobytes()
        if key in keys:
            continue
        keys.add(key)
        rows.append(case)
    indices = np.arange(len(rows))
    strata = [r['simulatedFollowup'] for r in rows]
    train, remaining = train_test_split(indices, train_size=900, stratify=strata, random_state=SEED)
    dev, test = train_test_split(remaining, test_size=300, stratify=[strata[i] for i in remaining], random_state=SEED+1)
    split = {int(i):name for name, ids in [('train',train),('dev',dev),('test',test)] for i in ids}
    for i, row in enumerate(rows):
        row['split'] = split[i]
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / 'support-cases.jsonl'
    path.write_text(''.join(__import__('json').dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')
    with (DATA/'support-cases.csv').open('w', newline='', encoding='utf-8') as stream:
        columns = ['id','sourceType','split'] + [f'phq9_{i+1}' for i in range(9)] + [f'gad7_{i+1}' for i in range(7)] + list(QUESTIONS) + ['simulatedFollowup']
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({**{k:row[k] for k in ['id','sourceType','split','simulatedFollowup']}, **{f'phq9_{i+1}':v for i,v in enumerate(row['phq9'])}, **{f'gad7_{i+1}':v for i,v in enumerate(row['gad7'])}, **row['context']})
    write(DATA/'support-policy.json', POLICY)
    write(DATA/'support-manifest.json', {'version':'c2-synthetic-cases-v1','warning':WARNING,'seed':SEED,'cases':1500,'splits':{'train':900,'dev':300,'test':300},'policySha256':sha(DATA/'support-policy.json'),'jsonlSha256':sha(path),'csvSha256':sha(DATA/'support-cases.csv'),'schemaSha256':sha(__import__('support_common').ROOT/'src/lib/c2/support-spec.json'),'classCounts':{name:{label:sum(r['split']==name and r['simulatedFollowup']==label for r in rows) for label in SPEC['classes']} for name in ['train','dev','test']},'duplicateFeatureProfiles':0})
    print('Generated 1,500 unique synthetic base cases: 900 train / 300 development / 300 frozen test.', flush=True)
    print(WARNING, flush=True)

if __name__ == '__main__':
    generate()
