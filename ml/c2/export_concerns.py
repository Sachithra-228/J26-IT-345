"""Export only the completed concern checkpoint, preserving its selected threshold."""
import json
import argparse
import os
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'
import shutil
import time
import numpy as np
import onnx
import onnxruntime as ort
import torch
from transformers import AutoModelForSequenceClassification,AutoTokenizer
import train_concerns as training
from train_distilbert import ROOT,ARTIFACTS,Batches,metrics,sha,write

RUN='c2-distilbert-concerns-v1'
PROBES=[
 'I am grieving the death of someone close to me and I keep criticising myself.',
 'I am worried about my alcohol use and how it affects my responsibilities.',
 'I am struggling to cover my rent and need help finding financial assistance.',
 'I want support after a frightening experience without describing the event.',
 'I cannot sleep properly and I am worried about finishing my university project.',
 'I feel lonely at university and have nobody I can talk to.',
 'I am not anxious. My sleep is good and I am enjoying time with friends.',
 'My coursework is piling up and I cannot organize my revision.',
 'I feel down and have lost interest in my hobbies.',
 'I wake up at night and cannot get back to sleep.',
 'I am doing well and I feel supported by my friends.',
 'My friend is anxious about exams; I feel calm and my work is manageable.',
 'I’m tense about deadlines and I don’t know how to manage my assignments.',
 'I enjoyed chatting with my classmates at the café today.',
]
def export():
 start=time.perf_counter();folder=ARTIFACTS/RUN
 report=json.loads((folder/'evaluation.json').read_text(encoding='utf-8'))
 assert report['status']=='completed' and sha(folder/'selected/model.safetensors')==report['checkpointSha256']
 manifest=json.loads((training.DATA/'manifest.json').read_text(encoding='utf-8'))
 assert manifest==report['protocol']['source']
 dest=ROOT/'public/c2/transformer/c2-concerns';(dest/'onnx').mkdir(parents=True,exist_ok=True)
 (dest/'manifest.json').unlink(missing_ok=True)
 model=AutoModelForSequenceClassification.from_pretrained(folder/'selected',local_files_only=True,attn_implementation='eager').eval()
 tokenizer=AutoTokenizer.from_pretrained(folder/'selected',local_files_only=True)
 tokenizer.model_input_names=['input_ids','attention_mask']
 class Logits(torch.nn.Module):
  def __init__(self,m):super().__init__();self.m=m
  def forward(self,input_ids,attention_mask):return self.m(input_ids=input_ids,attention_mask=attention_mask).logits
 inputs=tokenizer('An example for export only.',return_tensors='pt')
 graph=dest/'onnx/model.onnx'
 with torch.inference_mode():
  torch.onnx.export(Logits(model).eval(),(inputs['input_ids'],inputs['attention_mask']),str(graph),
   input_names=['input_ids','attention_mask'],output_names=['logits'],
   dynamic_axes={'input_ids':{0:'batch',1:'sequence'},'attention_mask':{0:'batch',1:'sequence'},'logits':{0:'batch'}},
   opset_version=17,dynamo=False,external_data=False)
 model.eval();onnx.checker.check_model(str(graph));tokenizer.save_pretrained(dest)
 config=json.loads((folder/'selected/config.json').read_text(encoding='utf-8'));config['c2_checkpoint_sha256']=report['checkpointSha256'];config['c2_run_id']=RUN
 write(dest/'config.json',config)
 shutil.copyfile(ROOT/'docs/c2/GOEMOTIONS_LICENSE.txt',dest/'LICENSE.txt')
 (dest/'ATTRIBUTION.txt').write_text('Base DistilBERT: https://huggingface.co/distilbert/distilbert-base-uncased (Apache-2.0).\nFine-tuned locally on explicitly synthetic UniCare concern narratives. No clinical targets or validation.\n',encoding='utf-8')
 runtime=ROOT/'public/c2/transformer/wasm';runtime.mkdir(parents=True,exist_ok=True)
 for pattern in ('ort-wasm*.wasm','ort-wasm*.mjs'):
  for file in (ROOT/'node_modules/onnxruntime-web/dist').glob(pattern):shutil.copyfile(file,runtime/file.name)
 options=ort.SessionOptions();options.intra_op_num_threads=4;options.inter_op_num_threads=1
 session=ort.InferenceSession(str(graph),sess_options=options,providers=['CPUExecutionProvider'])
 cases=[];errors=[]
 for text in PROBES:
  batch=tokenizer(text,return_tensors='pt',max_length=report['protocol']['maxLength'],truncation=True)
  with torch.inference_mode():expected=model(**batch).logits.sigmoid().numpy()[0]
  actual=1/(1+np.exp(-session.run(None,{k:v.numpy() for k,v in batch.items()})[0][0]))
  errors.append(float(np.max(np.abs(expected-actual))))
  cases.append({'text':text,'inputIds':batch['input_ids'][0].tolist(),'scores':actual.tolist()})
 assert max(errors)<1e-5
 rows=training.rows_for('test',manifest);dataset=Batches(rows,tokenizer,report['protocol']['maxLength'],len(manifest['labels']));all_scores=[]
 for batch in dataset.loader(1):all_scores.append(1/(1+np.exp(-session.run(None,{k:v.numpy() for k,v in batch.items() if k!='labels'})[0])))
 measured=metrics(dataset.y,np.concatenate(all_scores),report['selected']['threshold'])
 # Deploy only when conversion has preserved all held-out decisions/metrics.
 assert measured==report['test']
 identity={'runId':RUN,'checkpointSha256':report['checkpointSha256'],'labels':manifest['labels']}
 write(ROOT/'src/lib/c2/model/concern-identity.json',identity)
 conversion={'runId':RUN,'precision':'FP32','checkpointSha256':report['checkpointSha256'],'onnxSha256':sha(graph),
  'onnxBytes':graph.stat().st_size,'maximumProbeScoreError':max(errors),'testRows':len(rows),'browserTest':measured,
  'threshold':report['selected']['threshold'],'seconds':time.perf_counter()-start}
 write(ROOT/f'docs/c2/evidence/{RUN}-browser-export.json',conversion)
 write(ROOT/'tests/fixtures/c2/concern-parity.json',{'runId':RUN,'labels':manifest['labels'],'cases':cases})
 write(dest/'manifest.json',{'schemaVersion':1,'task':'c2-concerns','dtype':'fp32',**identity,
  'threshold':report['selected']['threshold'],'maxLength':report['protocol']['maxLength'],**conversion})
 print(json.dumps(conversion),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run-id',default=RUN);parser.add_argument('--data-dir',type=__import__('pathlib').Path,default=training.DATA)
 args=parser.parse_args();RUN=args.run_id;training.DATA=args.data_dir.resolve()
 torch.set_num_threads(4);export()
