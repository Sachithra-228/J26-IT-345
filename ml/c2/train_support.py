"""Fit new support/routing models from synthetic cases; compare before test use.

Run generate_support_cases.py first. This fits real learned parameters, not a
pretrained model. Results measure a documented simulator, not medical accuracy.
"""
from __future__ import annotations
import json
import platform
import time
import numpy as np
import sklearn
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score, ndcg_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits
from support_common import DATA, EVIDENCE, OUT, ROOT, SPEC, SEED, VERSION, WARNING, baseline_support, baseline_topics, features, names, rollout, sha, snapshots, write

def logistic(c, router=False):
    estimator = LogisticRegression(C=c, solver='lbfgs', max_iter=600, random_state=SEED)
    if router:
        estimator = OneVsRestClassifier(estimator, n_jobs=1)
    return Pipeline([('scale', StandardScaler()), ('classifier', estimator)])

def evaluate(truth, pred):
    detail = classification_report(truth, pred, labels=[0,1,2], target_names=SPEC['classes'], output_dict=True, zero_division=0)
    return {'accuracy':float(np.mean(truth==pred)), 'macroF1':float(f1_score(truth,pred,average='macro',zero_division=0)),
            'confusionMatrix':confusion_matrix(truth,pred,labels=[0,1,2]).tolist(), 'perClass':{key:detail[key] for key in SPEC['classes']}}

def cv_select(candidates, x, y, topic_y, groups, router=False):
    folds = list(StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=SEED).split(x,y,groups))
    trials, fitted = [], {}
    for key, candidate in candidates.items():
        scores = []
        for train, validation in folds:
            model = clone(candidate).fit(x[train], topic_y[train] if router else y[train])
            pred = model.predict(x[validation])
            scores.append(float(f1_score(topic_y[validation] if router else y[validation],pred,average='macro',zero_division=0)))
        trials.append({'candidate':key,'foldMacroF1':scores,'meanMacroF1':float(np.mean(scores))})
        fitted[key] = clone(candidate).fit(x, topic_y if router else y)
    best = max(trials,key=lambda row:row['meanMacroF1'])['candidate']
    return best, fitted, trials

def export(model):
    if isinstance(model, Pipeline):
        scaler, classifier = model.named_steps['scale'], model.named_steps['classifier']
        common = {'mean':np.round(scaler.mean_,12).tolist(),'scale':np.round(scaler.scale_,12).tolist()}
        if isinstance(classifier,OneVsRestClassifier):
            return {**common,'kind':'multilabel-logistic','coefficients':[np.round(e.coef_[0],12).tolist() for e in classifier.estimators_], 'intercepts':[float(e.intercept_[0]) for e in classifier.estimators_]}
        return {**common,'kind':'multinomial-logistic','coefficients':np.round(classifier.coef_,12).tolist(),'intercepts':classifier.intercept_.tolist()}
    trees=[]
    for estimator in model.estimators_:
        tree=estimator.tree_
        values=tree.value[:,0,:]
        values=values / values.sum(axis=1,keepdims=True)
        trees.append({'left':tree.children_left.tolist(),'right':tree.children_right.tolist(),'feature':tree.feature.tolist(),'threshold':tree.threshold.tolist(),'values':np.round(values,12).tolist()})
    return {'kind':'random-forest','trees':trees}

def train():
    started=time.perf_counter()
    manifest=json.loads((DATA/'support-manifest.json').read_text())
    for file,key in [('support-cases.jsonl','jsonlSha256'),('support-cases.csv','csvSha256'),('support-policy.json','policySha256')]:
        if sha(DATA/file)!=manifest[key]:
            raise ValueError(f'Frozen input hash mismatch: {file}; review data before training')
    if sha(ROOT/'src/lib/c2/support-spec.json')!=manifest['schemaSha256']:
        raise ValueError('Schema hash mismatch')
    cases=[json.loads(line) for line in (DATA/'support-cases.jsonl').read_text(encoding='utf-8').splitlines()]
    partitions={split:[case for case in cases if case['split']==split] for split in ['train','dev','test']}
    if [len(partitions[s]) for s in partitions]!=[900,300,300] or len({c['id'] for c in cases})!=1500:
        raise ValueError('Expected 1,500 distinct grouped cases with 900/300/300 split')
    if len({features(c).tobytes() for c in cases})!=1500:
        raise ValueError('Duplicate full feature profiles detected')
    x,y,topics,groups=snapshots(partitions['train'])
    print(f'Training on {len(partitions["train"])} unique cases / {len(x)} partial-answer snapshots / {x.shape[1]} fixed features.',flush=True)
    router_candidates={f'router-C{c}':logistic(c,True) for c in [.1,1,10]}
    support_candidates={f'logistic-C{c}':logistic(c) for c in [.1,1,10]}
    support_candidates.update({f'forest-depth{depth}':RandomForestClassifier(n_estimators=80,max_depth=depth,min_samples_leaf=12,random_state=SEED,n_jobs=1) for depth in [3,5]})
    with threadpool_limits(limits=2):
        router_key,routers,router_trials=cv_select(router_candidates,x,y,topics,groups,True)
        router=routers[router_key]
        _,support_models,support_trials=cv_select(support_candidates,x,y,topics,groups)
    # Pick the best candidate in each family using TRAINING-ONLY grouped CV.
    family_keys={family:max([row for row in support_trials if row['candidate'].startswith(family)],key=lambda row:row['meanMacroF1'])['candidate'] for family in ['logistic','forest']}
    dev_context=[rollout(c,router)[0] for c in partitions['dev']]
    dev_x=np.asarray([features(c,ctx) for c,ctx in zip(partitions['dev'],dev_context)])
    dev_y=np.asarray([SPEC['classes'].index(c['simulatedFollowup']) for c in partitions['dev']])
    dev_scores={key:float(f1_score(dev_y,support_models[key].predict(dev_x),average='macro',zero_division=0)) for key in family_keys.values()}
    log_key,forest_key=family_keys['logistic'],family_keys['forest']
    selected_key=forest_key if dev_scores[forest_key]>dev_scores[log_key]+.01 else log_key
    selected=support_models[selected_key]
    print(f'Frozen choice before test evaluation: {selected_key}; development macro F1 {dev_scores[selected_key]:.4f}. Router: {router_key}.',flush=True)
    artifact={'schemaVersion':1,'version':VERSION,'schema':SPEC['version'],'featureNames':names(),'classes':SPEC['classes'],'topics':SPEC['topics'],
              'warning':WARNING,'dataSha256':manifest['jsonlSha256'],'support':export(selected),'router':export(router),
              'uncertainty':{'minimumMaximumScore':.55,'minimumMargin':.10,'policy':'Fixed before evaluation; scores are not calibrated clinical probabilities.'}}
    write(OUT/'support-model.json',artifact)
    # First and only model-selection-independent use of the frozen test partition.
    test=partitions['test']
    contexts_and_paths=[rollout(c,router) for c in test]
    contexts=[item[0] for item in contexts_and_paths]
    test_x=np.asarray([features(c,ctx) for c,ctx in zip(test,contexts)])
    truth=np.asarray([SPEC['classes'].index(c['simulatedFollowup']) for c in test])
    scores=selected.predict_proba(test_x)
    model_results={key:evaluate(truth,model.predict(test_x)) for key,model in support_models.items() if key in family_keys.values()}
    majority=int(np.bincount(y).argmax())
    rule_pred=np.asarray([baseline_support(c,ctx) for c,ctx in zip(test,contexts)])
    initial=np.asarray([features(c,{}) for c in test])
    questionnaire_only=clone(support_candidates[log_key]).fit(np.asarray([features(c,{}) for c in partitions['train']]),np.asarray([SPEC['classes'].index(c['simulatedFollowup']) for c in partitions['train']]))
    q_only=evaluate(truth,questionnaire_only.predict(initial))
    gold_relevance=np.asarray([c['simulatedRelevance'] for c in test])
    def routing_metrics(pred):
        true=np.asarray([c['simulatedTopics'] for c in test])
        indices=np.argsort(-pred,axis=1,kind='stable')[:,:3]
        hits=np.take_along_axis(true,indices,axis=1).sum(axis=1)
        valid=true.sum(axis=1)>0
        return {'precisionAt3':float(np.mean(hits/3)), 'recallAt3AmongCasesWithRelevantTopics':float(np.mean(hits[valid]/true[valid].sum(axis=1))),
                'casesWithRelevantTopics':int(valid.sum()),'ndcgAt3':float(ndcg_score(gold_relevance,pred,k=3))}
    learned_topics=router.predict_proba(initial)
    rule_topics=np.asarray([baseline_topics(c,{}) for c in test])
    ordered=np.sort(scores,axis=1)
    accepted=(ordered[:,-1]>=.55)&(ordered[:,-1]-ordered[:,-2]>=.10)
    report={'modelVersion':VERSION,'warning':WARNING,'data':manifest,'features':names(),
            'protocol':{'seed':SEED,'snapshotsPerTrainingCase':4,'trainingRows':len(x),'grouping':'Every partial snapshot stays with its base case. 3-fold StratifiedGroupKFold within training only.',
                'preprocessing':'Fixed feature schema; scalers fit within each training fold. PHQ item 9 excluded from learned features.',
                'selection':'Best in each family by training CV, then development end-to-end macro-F1; forest selected only if > logistic + 0.01. Test never selects a winner.',
                'testEvaluation':'300 unseen complete-questionnaire cases; context collected through the actual trained router, including simulated skips. No safety cases in this benchmark.',
                'uncertainty':artifact['uncertainty']},
            'trainingCV':{'support':support_trials,'router':router_trials},
            'selected':{'supportCandidate':selected_key,'supportAlgorithm':'Random Forest Classifier' if selected_key.startswith('forest') else 'L2-Regularized Multinomial Logistic Regression','routerCandidate':router_key,'routerAlgorithm':'One-vs-Rest Logistic Regression','developmentMacroF1':dev_scores},
            'test':{'selected':model_results[selected_key],'candidates':model_results,'majorityBaseline':evaluate(truth,np.full(len(test),majority)),
                    'questionnaireRuleBaseline':evaluate(truth,rule_pred),'questionnaireOnlyLearnedBaseline':q_only,
                    'routing':{'learned':routing_metrics(learned_topics),'questionnaireRules':routing_metrics(rule_topics),'questionBudget':6,'repeatedQuestions':sum(len(p)!=len(set(p)) for _,p in contexts_and_paths)},
                    'uncertainty':{'coverage':float(np.mean(accepted)),'acceptedCases':int(accepted.sum()),'totalCases':len(test),'acceptedAccuracy':float(np.mean(scores.argmax(axis=1)[accepted]==truth[accepted])) if accepted.any() else None}},
            'modelSha256':sha(OUT/'support-model.json'),'trainingSeconds':round(time.perf_counter()-started,3),
            'environment':{'python':platform.python_version(),'scikitLearn':sklearn.__version__},
            'limitations':['Synthetic labels are engineering assumptions, not diagnoses or professional judgments.','Model and observations share generator assumptions; no real-world efficacy or clinical accuracy established.','No facial or text-emotion scores used in this structured experiment.','No trained provider-outcome recommender or generative chatbot.','No local participant validation.']}
    write(EVIDENCE/'support-evaluation.json',report)
    probes=[]
    rollout_probes=[]
    for i in np.random.default_rng(SEED+12).choice(len(test),24,replace=False):
        c=test[int(i)]
        context,path=contexts_and_paths[int(i)]
        rollout_probes.append({'input':{'phq9':c['phq9'],'gad7':c['gad7'],'context':c['context']},'path':path,'usedContext':context,'supportScores':selected.predict_proba(features(c,context).reshape(1,-1))[0].tolist()})
        for ctx in [{},contexts[int(i)]]:
            feature=features(c,ctx).reshape(1,-1)
            probes.append({'id':c['id'],'input':{'phq9':c['phq9'],'gad7':c['gad7'],'context':ctx},'features':feature[0].tolist(),'supportScores':selected.predict_proba(feature)[0].tolist(),'topicScores':router.predict_proba(feature)[0].tolist(),
                           'nextQuestion':__import__('support_common').next_question(c,ctx,list(ctx),router)})
    write(ROOT/'tests/fixtures/c2/support-parity.json',{'version':VERSION,'warning':WARNING,'cases':probes,'rollouts':rollout_probes})
    # Expose every held-out case in the research browser, never filter for success.
    demo=[{**c,'title':c['simulatedFollowup'].replace('-',' ').capitalize()+' scenario'} for c in sorted(test,key=lambda row:row['id'])]
    write(OUT/'support-scenarios.json',{'warning':WARNING,'cases':demo})
    print(json.dumps({'selected':report['selected'],'testMacroF1':report['test']['selected']['macroF1'],'ruleMacroF1':report['test']['questionnaireRuleBaseline']['macroF1'],'routing':report['test']['routing'],'seconds':report['trainingSeconds']}),flush=True)
    print(WARNING,flush=True)

if __name__=='__main__':
    train()
