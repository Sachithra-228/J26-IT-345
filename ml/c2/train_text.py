"""C2 public English emotion baseline. No local student data or clinical labels.

python ml/c2/train_text.py download
python ml/c2/train_text.py train

Official partitions are preserved, with normalized-text duplicates merged within
each partition and overlap removed in train -> development -> test order.
Only training data fits vocabulary/IDF/weights. C and a shared label threshold
are selected on development micro F1; the final test partition is evaluated once.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import platform
import re
import time
import unicodedata
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'ml/c2/data/raw/goemotions'
EVIDENCE = ROOT / 'docs/c2/evidence'
OUT = ROOT / 'src/lib/c2/model'
VERSION = 'c2-text-tfidf-ovr-v1'
SEED = 23273412
TOKEN_PATTERN = r"[a-z0-9]+(?:'[a-z0-9]+)?"


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'UniCare-C2-research-prototype'}), timeout=60) as response:
        return response.read()


def download():
    RAW.mkdir(parents=True, exist_ok=True)
    manifest_path = RAW / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        for name, info in manifest['files'].items():
            if hashlib.sha256((RAW / name).read_bytes()).hexdigest() != info['sha256']:
                raise ValueError(f'Dataset hash changed: {name}')
        print('Verified cached public dataset and checksums.', flush=True)
        return
    commit = json.loads(get('https://api.github.com/repos/google-research/google-research/commits/master'))
    revision = commit['sha']
    files = {}
    paths = {name: f'goemotions/data/{name}' for name in ('train.tsv', 'dev.tsv', 'test.tsv', 'emotions.txt')}
    paths.update({'README.md': 'goemotions/README.md', 'LICENSE': 'LICENSE', 'model_card.pdf': 'goemotions/goemotions_model_card.pdf'})
    for name, source_path in paths.items():
        url = f'https://raw.githubusercontent.com/google-research/google-research/{revision}/{source_path}'
        content = get(url)
        (RAW / name).write_bytes(content)
        files[name] = {'url': url, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}
        print(f'Downloaded {name}: {len(content):,} bytes', flush=True)
    write_json(manifest_path, {'source': 'Google Research GoEmotions', 'revision': revision, 'files': files})


def normalize(text):
    return unicodedata.normalize('NFKC', text).replace('\u2019', "'").replace('\u2018', "'").lower()


def tokenize(text):
    return re.findall(TOKEN_PATTERN, normalize(text))


def read_partitions():
    labels = (RAW / 'emotions.txt').read_text(encoding='utf-8').splitlines()
    seen = set()
    partitions, audit = {}, {}
    for name in ('train', 'dev', 'test'):
        rows, original, repeated, empty = {}, 0, 0, 0
        with (RAW / f'{name}.tsv').open(encoding='utf-8', newline='') as stream:
            for text, raw_labels, example_id in csv.reader(stream, delimiter='\t'):
                original += 1
                tokens = tokenize(text)
                if not tokens:
                    empty += 1
                    continue
                key = ' '.join(tokens)
                if key in rows:
                    repeated += 1
                    rows[key]['labels'].update(map(int, raw_labels.split(',')))
                else:
                    rows[key] = {'text': text, 'labels': set(map(int, raw_labels.split(','))), 'id': example_id}
        overlap = sum(key in seen for key in rows)
        partitions[name] = [row for key, row in rows.items() if key not in seen]
        seen.update(rows)
        audit[name] = {'officialRows': original, 'mergedDuplicates': repeated, 'removedEmptyRows': empty, 'removedCrossPartitionOverlap': overlap, 'usedRows': len(partitions[name])}
    return labels, partitions, audit


def train():
    import numpy as np
    import scipy
    import sklearn
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.multiclass import OneVsRestClassifier
    from sklearn.metrics import precision_recall_fscore_support, f1_score, average_precision_score
    from threadpoolctl import threadpool_limits

    start = time.perf_counter()
    if not (RAW / 'manifest.json').exists():
        raise SystemExit('Run the download stage first.')
    download()  # verifies hashes; no network when the manifest exists
    labels, partitions, audit = read_partitions()
    def targets(rows):
        y = np.zeros((len(rows), len(labels)), dtype=np.int8)
        for i, row in enumerate(rows):
            y[i, list(row['labels'])] = 1
        return y
    y = {name: targets(rows) for name, rows in partitions.items()}
    vectorizer = TfidfVectorizer(tokenizer=tokenize, token_pattern=None, lowercase=False,
        ngram_range=(1, 2), max_features=5000, min_df=3, sublinear_tf=True, norm='l2')
    x_train = vectorizer.fit_transform([r['text'] for r in partitions['train']])
    x_dev = vectorizer.transform([r['text'] for r in partitions['dev']])
    print(f'Partition audit: {json.dumps(audit)}', flush=True)
    print(f'Training {x_train.shape[0]:,} comments, {x_train.shape[1]:,} features, {len(labels)} labels.', flush=True)
    best, trials = None, []
    with threadpool_limits(limits=2):
        for c in (1.0, 4.0):
            model = OneVsRestClassifier(LogisticRegression(C=c, solver='liblinear', max_iter=400, random_state=SEED), n_jobs=1)
            model.fit(x_train, y['train'])
            scores = model.predict_proba(x_dev)
            for threshold in (0.15, 0.2, 0.25, 0.3, 0.4, 0.5):
                f1 = float(f1_score(y['dev'], scores >= threshold, average='micro', zero_division=0))
                trial = {'C': c, 'threshold': threshold, 'developmentMicroF1': f1}
                trials.append(trial)
                if best is None or f1 > best[0]:
                    best = (f1, model, threshold, c)
            print(f'Completed C={c}; best development micro F1 so far {best[0]:.4f}', flush=True)
    _, model, threshold, c = best
    # The held-out split is transformed and scored only after selecting the model.
    x_test = vectorizer.transform([r['text'] for r in partitions['test']])
    scores = model.predict_proba(x_test)
    predictions = scores >= threshold
    def metrics(truth, pred):
        result = {}
        for average in ('micro', 'macro', 'weighted'):
            p, r, f, _ = precision_recall_fscore_support(truth, pred, average=average, zero_division=0)
            result[average] = {'precision': float(p), 'recall': float(r), 'f1': float(f)}
        return result
    per_p, per_r, per_f, support = precision_recall_fscore_support(y['test'], predictions, average=None, zero_division=0)
    base = np.tile(y['train'].mean(axis=0) >= threshold, (len(y['test']), 1))
    portable = {
        'schemaVersion': 1, 'version': VERSION, 'language': 'en',
        'task': 'Public-comment emotion classification; not clinical or referral prediction',
        'source': 'Google Research GoEmotions', 'sourceRevision': json.loads((RAW / 'manifest.json').read_text())['revision'],
        'labels': labels, 'threshold': threshold, 'minTokens': 3, 'minKnownTokenFraction': 0.25,
        'preprocessing': {'normalization': 'NFKC', 'tokenPattern': TOKEN_PATTERN, 'ngramRange': [1, 2], 'sublinearTf': True, 'norm': 'l2'},
        'vocabulary': vectorizer.vocabulary_, 'idf': np.round(vectorizer.idf_, 8).tolist(),
        'coefficients': [np.round(e.coef_[0], 8).tolist() for e in model.estimators_],
        'intercepts': [round(float(e.intercept_[0]), 8) for e in model.estimators_],
    }
    # sklearn vocabulary indices can be numpy scalars.
    portable['vocabulary'] = {term: int(index) for term, index in portable['vocabulary'].items()}
    write_json(OUT / 'text-model.json', portable)
    per_label = [{'label': label, 'precision': float(per_p[i]), 'recall': float(per_r[i]), 'f1': float(per_f[i]), 'support': int(support[i])} for i, label in enumerate(labels)]
    report = {
        'modelVersion': VERSION, 'dataType': 'Public English Reddit emotion annotations; no local student data',
        'task': portable['task'], 'source': json.loads((RAW / 'manifest.json').read_text()),
        'protocol': {'seed': SEED, 'partitions': audit, 'deduplication': 'Normalized token sequence; merge labels within partition; train > dev > test priority',
            'vocabularyFit': 'training only', 'selectionMetric': 'development micro F1', 'testUse': 'single final evaluation after development selection'},
        'selected': {'C': c, 'threshold': threshold, 'features': len(portable['vocabulary'])},
        'developmentTrials': trials, 'test': metrics(y['test'], predictions), 'frequencyBaselineTest': metrics(y['test'], base),
        'testAveragePrecisionMicro': float(average_precision_score(y['test'], scores, average='micro')),
        'perLabel': per_label, 'testRowsWithAnyPredictedLabel': int(predictions.any(axis=1).sum()),
        'trainingSeconds': round(time.perf_counter() - start, 3),
        'environment': {'python': platform.python_version(), 'numpy': np.__version__, 'scipy': scipy.__version__, 'scikitLearn': sklearn.__version__, 'platform': platform.platform()},
        'limitations': ['English Reddit comments differ from Sri Lankan student reflections.', 'Emotion labels are not mental disorders or referral labels.',
            'Raw classifier scores are not calibrated clinical probabilities.', 'Rare emotions may have poor recall.', 'No Sinhala/Tamil NLP validation.',
            'UI abstention and language/coverage gates are separate from this full benchmark evaluation.'],
    }
    write_json(EVIDENCE / 'text-evaluation.json', report)
    probes = [
        'I am worried about tomorrow and I cannot stop thinking about the exam.',
        'I feel proud that I finally completed my coursework project.',
        'I miss my friends and I feel lonely tonight.',
        "I am not sad today, I am happy that my friend called.",
        'ＦＵＬＬ width words and curly don’t apostrophes are normalized.',
        'hello hello HELLO world', '', 'මට අද සතුටුයි', 'எனக்கு இன்று மகிழ்ச்சி',
    ]
    rng = np.random.default_rng(SEED)
    probes += [partitions['test'][int(i)]['text'] for i in rng.choice(len(partitions['test']), 16, replace=False)]
    probe_scores = model.predict_proba(vectorizer.transform(probes))
    write_json(ROOT / 'tests/fixtures/c2/text-parity.json', {
        'modelVersion': VERSION, 'source': 'Python sklearn reference; public benchmark and invented software probes',
        'labels': labels, 'cases': [{'text': text, 'tokens': tokenize(text), 'scores': row.tolist()} for text, row in zip(probes, probe_scores)]})
    write_json(OUT / 'text-status.json', {'version': VERSION, 'source': 'GoEmotions', 'language': 'English', 'trainingExamples': audit['train']['usedRows'],
        'testExamples': audit['test']['usedRows'], 'microF1': report['test']['micro']['f1'], 'macroF1': report['test']['macro']['f1'],
        'baselineMicroF1': report['frequencyBaselineTest']['micro']['f1'], 'features': len(portable['vocabulary']),
        'warning': 'Public emotion benchmark only. No clinical/referral validation.'})
    print(json.dumps({'selected': report['selected'], 'test': report['test'], 'baseline': report['frequencyBaselineTest'], 'seconds': report['trainingSeconds']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', choices=['download', 'train'])
    args = parser.parse_args()
    download() if args.stage == 'download' else train()
