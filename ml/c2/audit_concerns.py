"""Audit saved concern training and measure a separate illustrative challenge set."""
import json
import numpy as np
import torch
from safetensors.torch import load_file
from transformers import AutoTokenizer,AutoModelForSequenceClassification
from train_concerns import DATA,rows_for
from train_distilbert import ARTIFACTS,ROOT,sha,write,Batches,evaluate,metrics,targets

RUN='c2-distilbert-concerns-v1'
def audit():
 folder=ARTIFACTS/RUN;report=json.loads((folder/'evaluation.json').read_text(encoding='utf-8'));protocol=report['protocol']
 assert report['status']=='completed' and sha(folder/'selected/model.safetensors')==report['checkpointSha256']
 assert sha(ROOT/'ml/c2/train_concerns.py')==protocol['scriptSha256']
 assert sha(ROOT/'ml/c2/train_distilbert.py')==protocol['sharedTrainingScriptSha256']
 assert sha(ROOT/'ml/c2/generate_concern_cases.py')==protocol['source']['generatorSha256']
 rows={s:rows_for(s,protocol['source']) for s in ('train','dev','test')}
 for s,rs in rows.items():
  assert len(rs)==protocol['partitions'][s]['rows']
  assert targets(rs,5).sum(axis=0).astype(int).tolist()==protocol['partitions'][s]['labelCounts']
 for a,b in (('train','dev'),('train','test'),('dev','test')):
  assert not ({r['text'].lower() for r in rows[a]} & {r['text'].lower() for r in rows[b]})
  assert not ({f for r in rows[a] for f in r['familyIds']} & {f for r in rows[b] for f in r['familyIds']})
 cm=np.array(report['confusionMatrices']);assert cm.shape==(5,2,2) and np.all(cm.sum(axis=(1,2))==len(rows['test']))
 tp,fp,fn=cm[:,1,1],cm[:,0,1],cm[:,1,0]
 f=2*tp.sum()/max(1,2*tp.sum()+fp.sum()+fn.sum());assert abs(f-report['test']['micro']['f1'])<1e-9
 assert abs(np.mean([r['f1'] for r in report['perLabel']])-report['test']['macro']['f1'])<1e-9
 chosen=max(report['history'],key=lambda r:r['selectionMicroF1']);assert chosen['trial']==report['selected']['configuration']['id'] and chosen['epoch']==report['selected']['epoch'] and chosen['selectedThreshold']==report['selected']['threshold']
 base=ARTIFACTS/'cache/hub/models--distilbert--distilbert-base-uncased/snapshots'/protocol['modelRevision']/'model.safetensors'
 original=load_file(str(base));trained=load_file(str(folder/'selected/model.safetensors'));frozen=changed=count=0
 for name,value in trained.items():
  if not name.startswith('distilbert.'):continue
  is_frozen=name.startswith('distilbert.embeddings.') or any(name.startswith(f'distilbert.transformer.layer.{i}.') for i in range(4))
  equal=torch.equal(value,original[name])
  if is_frozen:assert equal;frozen+=1
  else:count+=1;changed+=not equal
 assert count==changed and frozen>0
 weights={'frozenBackboneTensorsUnchanged':frozen,'trainableBackboneTensorsChanged':changed,'trainableBackboneTensorCount':count,'newHeadTensors':sum(not n.startswith('distilbert.') for n in trained),'baseSha256':sha(base)}
 del original,trained
 tokenizer=AutoTokenizer.from_pretrained(folder/'selected',local_files_only=True)
 lengths={s:[len(tokenizer.encode(r['text'])) for r in rs] for s,rs in rows.items()}
 assert all(max(v)<=protocol['maxLength'] for v in lengths.values())
 result={'runId':RUN,'allPassed':True,'auditOnlyNoTraining':True,'checkpointSha256':report['checkpointSha256'],'weightAudit':weights,
  'checks':['Training/generator/shared-script hashes match','Dataset hashes/counts match','Exact texts and declared wording families disjoint','Confusion denominators and F1 reconcile','Selected checkpoint matches development choice','All frozen tensors unchanged; all trainable backbone tensors changed'],
  'lengthAudit':{s:{'maximum':max(v),'rowsOverLimit':sum(x>protocol['maxLength'] for x in v)} for s,v in lengths.items()},
  'limitation':'Software/data audit only; artificial wording families are not independent participant data.'}
 write(ROOT/f'docs/c2/evidence/{RUN}-audit.json',result)
 challenge=json.loads((DATA/'challenge.json').read_text(encoding='utf-8'));assert challenge['labels']==protocol['labels']
 challenge_rows=[{'id':r['id'],'text':r['text'],'labels':[challenge['labels'].index(t) for t in r['topics']]} for r in challenge['cases']]
 dataset=Batches(challenge_rows,tokenizer,protocol['maxLength'],5)
 model=AutoModelForSequenceClassification.from_pretrained(folder/'selected',local_files_only=True).eval()
 _,scores=evaluate(model,dataset.loader(16),'cpu')
 challenge_report={'runId':RUN,'sourceType':'synthetic','challengeSha256':sha(DATA/'challenge.json'),'checkpointSha256':report['checkpointSha256'],
  'selectionUse':False,'rows':len(challenge_rows),'purpose':challenge['purpose'],'metrics':metrics(dataset.y,scores,report['selected']['threshold']),
  'cases':[{'id':r['id'],'text':r['text'],'expected':challenge['cases'][i]['topics'],'predicted':[t for j,t in enumerate(challenge['labels']) if scores[i,j]>=report['selected']['threshold']]} for i,r in enumerate(challenge_rows)]}
 write(ROOT/f'docs/c2/evidence/{RUN}-challenge.json',challenge_report)
 print(json.dumps({'audit':result,'challengeMetrics':challenge_report['metrics']}),flush=True)
if __name__=='__main__':torch.set_num_threads(4);audit()
