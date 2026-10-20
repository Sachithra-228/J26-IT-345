"""Shared synthetic-support experiment schema. No medical reference labels."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'ml/c2/data/synthetic'
OUT = ROOT / 'src/lib/c2/model'
EVIDENCE = ROOT / 'docs/c2/evidence'
SPEC = json.loads((ROOT / 'src/lib/c2/support-spec.json').read_text(encoding='utf-8'))
SEED = 23273412
VERSION = 'c2-support-synthetic-v1'
QUESTIONS = {q['id']: q for q in SPEC['questions']}
WARNING = 'SYNTHETIC cases and simulated labels. Pipeline evidence only; no clinical validation or diagnostic accuracy.'

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def names():
    # PHQ item 9 is handled separately by the safety UI, never a learned feature.
    out = [f'{scale}_{i+1}' for scale, size in [('phq9', 8), ('gad7', 7)] for i in range(size)]
    out += [f'{name}_missing' for name in out]
    for q in SPEC['questions']:
        out += [f"{q['id']}={option}" for option in q['options']] + [f"{q['id']}_missing"]
    return out

def features(case, context=None):
    context = case.get('context', {}) if context is None else context
    answers = list(case['phq9'][:8]) + list(case['gad7'])
    out = [0.0 if v is None else v / 3 for v in answers]
    out += [float(v is None) for v in answers]
    for q in SPEC['questions']:
        value = context.get(q['id'])
        out += [float(value == option) for option in q['options']]
        out.append(float(value not in q['options']))
    return np.asarray(out, dtype=float)

def baseline_topics(case, context):
    p, g = case['phq9'], case['gad7']
    return np.asarray([
        sum(v or 0 for v in p[:2]) / 6,
        sum(v or 0 for v in g[:4]) / 12,
        (p[2] or 0) / 3,
        0.9 if context.get('worry') == 'Study or exams' else 0.25,
        0.9 if context.get('mood') == 'Feeling connected' or context.get('worry') == 'Relationships' else 0.25,
    ])

def baseline_support(case, context):
    # Transparent comparator, not the simulator's target function.
    p, g = sum(v or 0 for v in case['phq9']), sum(v or 0 for v in case['gad7'])
    if p >= 20 or g >= 15 or context.get('impact') == 'Extremely difficult':
        return 2
    return int(p >= 10 or g >= 10 or context.get('impact') == 'Very difficult' or context.get('goal') == 'Talk to a professional')

def next_question(case, context, asked, router):
    for key in SPEC['foundation']:
        if key not in asked:
            return key
    if len(asked) >= SPEC['maximumQuestions']:
        return None
    scores = router.predict_proba(features(case, context).reshape(1, -1))[0]
    candidates = [(i, SPEC['topicQuestions'][topic]) for i, topic in enumerate(SPEC['topics']) if SPEC['topicQuestions'][topic] not in asked]
    return max(candidates, key=lambda item: (scores[item[0]], -item[0]))[1] if candidates else None

def rollout(case, router):
    context, asked = {}, []
    while (key := next_question(case, context, asked, router)) is not None:
        asked.append(key)
        if key in case['context']:
            context[key] = case['context'][key]
    return context, asked

def snapshots(cases):
    rng = np.random.default_rng(SEED + 10)
    x, support, topics, groups = [], [], [], []
    for case in cases:
        available = list(case['context'])
        contexts = [{}, {k:v for k,v in case['context'].items() if k in SPEC['foundation']}]
        contexts += [{k:case['context'][k] for k in rng.choice(available, min(n, len(available)), replace=False)} for n in (2, 6)]
        for context in contexts:
            x.append(features(case, context))
            support.append(SPEC['classes'].index(case['simulatedFollowup']))
            topics.append(case['simulatedTopics'])
            groups.append(case['id'])
    return np.asarray(x), np.asarray(support), np.asarray(topics), np.asarray(groups)
