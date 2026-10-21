"""Compare every held-out native/ONNX score and decision, not only aggregate F1."""
import json
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import numpy as np
import onnxruntime as ort
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import train_concerns as training
from train_distilbert import ROOT, ARTIFACTS, Batches, evaluate, metrics, sha, write

RUN = 'c2-distilbert-concerns-v2'

def main():
    folder = ARTIFACTS / RUN
    report = json.loads((folder/'evaluation.json').read_text())
    graph = ROOT/'public/c2/transformer/c2-concerns/onnx/model.onnx'
    export = json.loads((ROOT/f'docs/c2/evidence/{RUN}-browser-export.json').read_text())
    assert sha(graph) == export['onnxSha256']
    assert sha(folder/'selected/model.safetensors') == report['checkpointSha256'] == export['checkpointSha256']
    training.DATA = ROOT/'ml/c2/data/synthetic/concerns-v2'
    manifest = json.loads((training.DATA/'manifest.json').read_text())
    assert manifest == report['protocol']['source']
    rows = training.rows_for('test', manifest)
    tokenizer = AutoTokenizer.from_pretrained(folder/'selected', local_files_only=True)
    tokenizer.model_input_names = ['input_ids', 'attention_mask']
    model = AutoModelForSequenceClassification.from_pretrained(folder/'selected', local_files_only=True, attn_implementation='eager').eval()
    dataset = Batches(rows, tokenizer, report['protocol']['maxLength'], len(manifest['labels']))
    _, native = evaluate(model, dataset.loader(16), 'cpu')
    options = ort.SessionOptions(); options.intra_op_num_threads = 4; options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(graph), sess_options=options, providers=['CPUExecutionProvider'])
    scores = []
    for batch in dataset.loader(1):
        logits = session.run(None, {k:v.numpy() for k,v in batch.items() if k != 'labels'})[0]
        scores.append(1/(1+np.exp(-logits)))
    actual = np.concatenate(scores)
    threshold = report['selected']['threshold']
    maximum_error = float(np.max(np.abs(native-actual)))
    different = int(np.sum((native >= threshold) != (actual >= threshold)))
    assert maximum_error < 1e-5 and different == 0
    assert metrics(dataset.y, actual, threshold) == report['test']
    result = {'runId':RUN, 'allPassed':True, 'checkpointSha256':report['checkpointSha256'],
      'onnxSha256':export['onnxSha256'], 'rows':len(rows), 'labels':len(manifest['labels']),
      'comparedScores':int(actual.size), 'differentDecisions':different,
      'maximumScoreDifference':maximum_error, 'nativeBatchSize':16, 'onnxBatchSize':1,
      'threshold':threshold, 'scriptSha256':sha(__import__('pathlib').Path(__file__)),
      'limitation':'Numerical conversion and decision parity only; not independent clinical validation.'}
    write(ROOT/f'docs/c2/evidence/{RUN}-full-export-parity.json',result)
    print(json.dumps(result),flush=True)

if __name__ == '__main__': torch.set_num_threads(4); main()
