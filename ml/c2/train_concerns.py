"""Fine-tune DistilBERT on synthetic first-person student concern narratives.

Separate run/evidence from GoEmotions. Test is opened after dev selection locks.
"""
import argparse
from datetime import datetime,timezone
import json
import os
from pathlib import Path
import time
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'
from train_distilbert import (ARTIFACTS,ROOT,MODEL_ID,MODEL_REVISION,SEED,Batches,
 build_model,evaluate,environment,metrics,seed_everything,sha,targets,write)
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification,AutoTokenizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import precision_recall_fscore_support,multilabel_confusion_matrix
from threadpoolctl import threadpool_limits

DATA=ROOT/'ml/c2/data/synthetic/concerns'
THRESHOLDS=(.25,.35,.45,.5,.6)
def rows_for(split,manifest):
 path=DATA/f'{split}.jsonl'
 if sha(path)!=manifest['partitions'][split]['sha256']:raise ValueError('Dataset hash mismatch')
 return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]
def selection(y,scores):
 trials=[{'threshold':t,'microF1':metrics(y,scores,t)['micro']['f1']} for t in THRESHOLDS]
 best=max(trials,key=lambda r:r['microF1'])
 return best['threshold'],best['microF1'],trials

def train(args):
 start=time.perf_counter();folder=ARTIFACTS/args.run_id
 if folder.exists():raise SystemExit('Preserve existing run; choose a new run ID')
 manifest=json.loads((DATA/'manifest.json').read_text(encoding='utf-8'))
 assert len(manifest['labels']) in (5,15) and len(set(manifest['labels']))==len(manifest['labels'])
 assert 'self-harm' not in manifest['labels']
 assert not any(manifest['familyOverlaps'].values())
 labels=manifest['labels'];rows={s:rows_for(s,manifest) for s in ('train','dev')}
 tokenizer=AutoTokenizer.from_pretrained(MODEL_ID,revision=MODEL_REVISION,local_files_only=True)
 batches={s:Batches(rows[s],tokenizer,args.max_length,len(labels)) for s in rows}
 lengths={s:np.array([len(tokenizer.encode(r['text'])) for r in rows[s]]) for s in rows}
 assert all(int(v.max())<=args.max_length for v in lengths.values()),'Inspect length before truncating'
 configs=[{'id':'lr-2e-5','backboneLearningRate':2e-5,'headLearningRate':1e-3,'tokenMaskProbability':0.0},
  {'id':'lr-5e-5','backboneLearningRate':5e-5,'headLearningRate':1e-3,'tokenMaskProbability':0.0},
  {'id':'lr-5e-5-mask','backboneLearningRate':5e-5,'headLearningRate':1e-3,'tokenMaskProbability':.05}]
 if args.selected_rate_only: configs=[configs[1]]
 protocol={'schemaVersion':1,'runId':args.run_id,'createdUtc':datetime.now(timezone.utc).isoformat(),
  'task':'Synthetic student concern multilabel classification; no clinical targets','model':MODEL_ID,'modelRevision':MODEL_REVISION,
  'initialization':f'Pinned pretrained backbone with new {len(labels)}-output head; previous checkpoints preserved separately',
  'source':manifest,'scriptSha256':sha(Path(__file__)),'sharedTrainingScriptSha256':sha(ROOT/'ml/c2/train_distilbert.py'),
  'seed':SEED,'labels':labels,'maxLength':args.max_length,'batchSize':16,'epochsMaximum':args.epochs,
  'trainableLastBlocks':2,'weightDecay':.01,'gradientClipNorm':1.0,
  'optimizer':'AdamW; linear decay with 10% warmup','loss':f'BCEWithLogitsLoss; {len(labels)} independent support concerns',
  'configurations':configs,'thresholdCandidates':THRESHOLDS,'selection':'Dev micro-F1 across configurations, epochs and shared thresholds; earliest tie wins',
  'partitions':manifest['partitions'],'tokenLengthAudit':{s:{'maximum':int(v.max()),'median':float(np.median(v)),'truncatedRows':0} for s,v in lengths.items()},
  'augmentation':('No token masking in this v2 run; learning rate reused from v1 development selection. Synthetic multi-topic composition and explicit denials are recorded in the generator; no augmentation benefit claimed.' if args.selected_rate_only else 'Training-only 5% token masking ablation; protect special tokens and negation; no assumed improvement'),
  'curveThreshold':.5,'environment':environment()}
 folder.mkdir(parents=True);write(folder/'protocol.json',protocol)
 # Exact same narrative inputs and rows for the classical baseline.
 vec=TfidfVectorizer(ngram_range=(1,2),max_features=5000,min_df=2,sublinear_tf=True)
 x=vec.fit_transform([r['text'] for r in rows['train']]);xd=vec.transform([r['text'] for r in rows['dev']])
 baseline_best=None;baseline_trials=[]
 with threadpool_limits(limits=4):
  for c in (1.,4.):
   base=OneVsRestClassifier(LogisticRegression(C=c,solver='liblinear',max_iter=500,random_state=SEED))
   base.fit(x,batches['train'].y)
   threshold,f1,trial=selection(batches['dev'].y,base.predict_proba(xd))
   baseline_trials.append({'C':c,'thresholds':trial})
   if baseline_best is None or f1>baseline_best[0]:baseline_best=(f1,base,threshold,c)
 protected=set(tokenizer.all_special_ids)
 for word in ('not','no','never',"n't",'without','nobody'):
  protected.update(tokenizer.encode(word,add_special_tokens=False))
 history=[];best=None
 for config in configs:
  model=build_model(labels,2).to('cpu')
  # Save tensor references only once; later verify actual partial-backbone updates.
  frozen_before=next(model.distilbert.embeddings.parameters()).detach().clone()
  trainable_before=next(model.distilbert.transformer.layer[-1].parameters()).detach().clone()
  groups=[{'params':[p for n,p in model.named_parameters() if p.requires_grad and n.startswith('distilbert.')],'lr':config['backboneLearningRate']},
          {'params':[p for n,p in model.named_parameters() if p.requires_grad and not n.startswith('distilbert.')],'lr':config['headLearningRate']}]
  optimizer=torch.optim.AdamW(groups,weight_decay=.01)
  loader=batches['train'].loader(16,shuffle=True);total=len(loader)*args.epochs;warmup=max(1,int(total*.1))
  scheduler=torch.optim.lr_scheduler.LambdaLR(optimizer,lambda step:min((step+1)/warmup,max(0.,(total-step)/max(1,total-warmup))))
  for epoch in range(1,args.epochs+1):
   es=time.perf_counter();model.train()
   for step,batch in enumerate(loader):
    if config['tokenMaskProbability']:
     ids=batch['input_ids'];mask=torch.rand(ids.shape)<config['tokenMaskProbability']
     for token in protected:mask &= ids!=token
     batch['input_ids']=ids.masked_fill(mask,tokenizer.mask_token_id)
    optimizer.zero_grad(set_to_none=True);output=model(**batch);output.loss.backward()
    torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad],1.)
    optimizer.step();scheduler.step()
    if step%25==0:print(json.dumps({'trial':config['id'],'epoch':epoch,'batch':step+1,'loss':float(output.loss.detach())}),flush=True)
   tl,ts=evaluate(model,batches['train'].loader(16),'cpu');vl,vs=evaluate(model,batches['dev'].loader(16),'cpu')
   threshold,f1,threshold_trials=selection(batches['dev'].y,vs)
   row={'trial':config['id'],'epoch':epoch,'trainLoss':tl,'validationLoss':vl,'train':metrics(batches['train'].y,ts,.5),
    'validation':metrics(batches['dev'].y,vs,.5),'curveThreshold':.5,'selectionMicroF1':f1,'selectedThreshold':threshold,
    'thresholdTrials':threshold_trials,'seconds':time.perf_counter()-es}
   history.append(row);write(folder/'history.json',history)
   assert torch.equal(frozen_before,next(model.distilbert.embeddings.parameters()).detach())
   assert not torch.equal(trainable_before,next(model.distilbert.transformer.layer[-1].parameters()).detach())
   if best is None or f1>best['developmentMicroF1']:
    best={'configuration':config,'epoch':epoch,'threshold':threshold,'developmentMicroF1':f1,
     'trainableParameters':sum(p.numel() for p in model.parameters() if p.requires_grad),'totalParameters':sum(p.numel() for p in model.parameters()),
     'frozenEmbeddingUnchanged':True,'lastBackboneBlockUpdated':True}
    model.save_pretrained(folder/'selected',safe_serialization=True);tokenizer.save_pretrained(folder/'selected');write(folder/'selected.json',best)
   print(json.dumps({'epochCompleted':row,'best':best}),flush=True)
  del model,optimizer,groups
 write(folder/'selection-locked.json',best)
 rows['test']=rows_for('test',manifest)
 # Verify disjoint exact texts AND declared wording families for all partitions.
 for a,b in (('train','dev'),('train','test'),('dev','test')):
  assert not ({r['text'].lower() for r in rows[a]} & {r['text'].lower() for r in rows[b]})
  assert not ({f for r in rows[a] for f in r['familyIds']} & {f for r in rows[b] for f in r['familyIds']})
 test=Batches(rows['test'],tokenizer,args.max_length,len(labels))
 model=AutoModelForSequenceClassification.from_pretrained(folder/'selected',local_files_only=True).eval()
 loss,scores=evaluate(model,test.loader(16),'cpu')
 p,r,f,support=precision_recall_fscore_support(test.y,scores>=best['threshold'],average=None,zero_division=0)
 basef1,base,bt,bc=baseline_best
 report={'schemaVersion':1,'status':'completed','runId':args.run_id,'task':protocol['task'],'protocol':protocol,'selected':best,'history':history,
  'testLoss':loss,'test':metrics(test.y,scores,best['threshold']),
  'baseline':{'name':'TF-IDF + logistic regression; identical narrative train/dev/test rows','C':bc,'threshold':bt,
   'developmentMicroF1':basef1,'developmentTrials':baseline_trials,'test':metrics(test.y,base.predict_proba(vec.transform([r['text'] for r in rows['test']])),bt)},
  'perLabel':[{'label':label,'precision':float(p[i]),'recall':float(r[i]),'f1':float(f[i]),'support':int(support[i])} for i,label in enumerate(labels)],
  'confusionMatrices':multilabel_confusion_matrix(test.y,scores>=best['threshold']).tolist(),
  'checkpointSha256':sha(folder/'selected/model.safetensors'),'durationSeconds':time.perf_counter()-start,
  'limitations':manifest['limitations']+['Single seed and synthetic text composition; no claim of clinical accuracy or superiority on real students.',
   'Scores are uncalibrated concern-label scores, not illness probabilities. Question selection and matching include application rules.']}
 write(folder/'evaluation.json',report);write(ROOT/f'docs/c2/evidence/{args.run_id}-evaluation.json',report)
 print(json.dumps({'completed':args.run_id,'test':report['test'],'baseline':report['baseline']['test']}),flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run-id',default='c2-distilbert-concerns-v1');parser.add_argument('--epochs',type=int,default=4);parser.add_argument('--max-length',type=int,default=128)
 parser.add_argument('--data-dir',type=Path,default=DATA);parser.add_argument('--selected-rate-only',action='store_true')
 args=parser.parse_args()
 if not args.run_id.replace('-','').replace('_','').isalnum() or args.epochs<1:parser.error('Invalid run settings')
 DATA=args.data_dir.resolve()
 torch.set_num_threads(4);torch.set_num_interop_threads(1);seed_everything();train(args)
