"""Create explicitly synthetic, family-disjoint student concern narratives.

Labels describe concerns expressed in first-person text, never illnesses.
Clause families are assigned to a split before any compositions are made.
No participant records or questionnaire-derived clinical labels are involved.
"""
import hashlib
import itertools
import json
from pathlib import Path
import random

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "ml/c2/data/synthetic/concerns"
LABELS = ["low-mood", "worry", "sleep", "study", "connection"]
SEED = 23273412
# Each line is a distinct wording family. Last six are reserved dev/test families.
CLAUSES = {
 "low-mood": [
  "I feel down most days", "I have lost interest in activities I used to enjoy",
  "My mood has been low and I struggle to get started", "I feel empty even on quiet days",
  "I cannot find much enjoyment in my usual hobbies", "I have been feeling sad without much motivation",
  "Getting through ordinary tasks feels emotionally heavy", "I feel discouraged and do not enjoy much lately",
  "I am tearful and things that were fun feel flat", "I have little enthusiasm for my normal activities",
  "My spirits are low and I am struggling to enjoy the day", "I feel gloomy and keep losing motivation",
  "I am feeling persistently unhappy and nothing seems enjoyable", "The things I loved have stopped feeling rewarding",
  "I feel emotionally low and find it hard to feel interested", "My days feel bleak and I have little enjoyment",
  "I feel miserable and have no enthusiasm for my hobbies", "Even pleasant activities feel dull to me now"],
 "worry": [
  "I keep worrying about things that might go wrong", "I feel nervous and cannot switch off my thoughts",
  "My mind keeps going over possible problems", "I feel anxious even when I try to relax",
  "I am tense because I keep imagining bad outcomes", "I struggle to stop worrying about everyday things",
  "I feel on edge with thoughts that will not settle", "I repeatedly think about everything that could fail",
  "I feel restless with worry and find relaxing difficult", "I am scared something bad will happen",
  "I keep feeling uneasy about uncertain situations", "My anxious thoughts keep looping through the day",
  "I cannot shake the feeling that things will turn out badly", "I feel apprehensive and struggle to calm my thoughts",
  "I spend much of the day anticipating problems", "My head is full of what-if thoughts that are hard to control",
  "A sense of dread keeps me tense throughout the day", "I keep expecting the worst and cannot unwind"],
 "sleep": [
  "I lie awake for a long time before falling asleep", "I wake up repeatedly during the night",
  "My sleep schedule has become irregular", "I sleep far more than usual and still feel unrested",
  "I struggle to get a full night of rest", "I wake too early and cannot get back to sleep",
  "I have trouble falling asleep despite feeling tired", "My nights are restless and I keep waking",
  "I want help getting my bedtime routine back", "I cannot settle into a regular sleeping pattern",
  "I am sleeping through much of the daytime", "I barely manage a few hours of sleep at night",
  "It takes hours for me to drift off at bedtime", "I am awake in the middle of most nights",
  "My body clock is disrupted and my rest is poor", "I toss and turn at night instead of getting rest",
  "I keep waking before dawn with no chance of more sleep", "My sleeping hours are unpredictable and exhausting"],
 "study": [
  "I cannot keep up with my university assignments", "I keep putting off coursework until deadlines arrive",
  "My study workload feels unmanageable", "I need help planning my exam preparation",
  "I have missed lectures and fallen behind on coursework", "Starting my research project feels overwhelming",
  "I am struggling to organize my academic tasks", "I keep missing submission dates for assignments",
  "I cannot concentrate on my revision long enough", "Balancing lectures and project work feels too difficult",
  "I need a manageable plan for completing my dissertation", "I am falling behind in classes and need study support",
  "My university deadlines are piling up beyond what I can manage", "I find it difficult to begin the work for my modules",
  "I have not been able to make progress on academic submissions", "I cannot arrange a workable timetable for my courses",
  "The amount of assessment work is more than I can handle", "I am struggling to stay on track with my degree work"],
 "connection": [
  "I feel lonely and have nobody to talk to", "I feel isolated from other students",
  "I miss having friends around me", "I find it hard to feel that I belong at university",
  "I would like more contact with people who understand me", "I spend most days alone and want some company",
  "I feel disconnected from the people around me", "I struggle to make friends and feel left out",
  "I need someone I can talk to without feeling judged", "I do not feel part of a supportive group",
  "I have little social support and feel alone", "I wish I could connect with classmates more easily",
  "I do not have anyone nearby I feel close to", "I feel excluded and want a sense of belonging",
  "I am missing a circle of people I can rely on", "I feel cut off from my peers and want companionship",
  "I have no trusted person to share my day with", "I feel like an outsider among the other students"],
}
NEUTRAL = [
 "I feel well and my usual routine is manageable", "I am enjoying my activities and feel supported",
 "I am doing okay and have no current concern to discuss", "Things feel steady for me at the moment",
 "I am comfortable with how daily life is going", "I feel content and have people I can rely on",
 "I am coping well with everyday life", "I feel positive about how things are going",
 "I am here to browse resources rather than describe a current problem", "I feel settled and my routine works for me",
 "I am satisfied with my current wellbeing", "I have been feeling good and managing my responsibilities",
 "My wellbeing feels balanced and I am managing comfortably", "I feel fine and have no present difficulty to report",
 "I am interested in general wellbeing information and feel alright", "I feel at ease with daily life as it is",
 "I have been in good spirits and feel supported by others", "I am doing well and simply exploring available resources"]
NEGATED = {
 "low-mood": ["I am not feeling down and I still enjoy my hobbies", "My mood is good and I have not lost interest in things", "I feel cheerful and my motivation is fine"],
 "worry": ["I am not anxious and can relax comfortably", "I do not have persistent worries at present", "My thoughts are calm and I feel at ease"],
 "sleep": ["I am sleeping well through the night", "My rest is good and bedtime is regular", "I wake refreshed after a normal night of sleep"],
 "study": ["My coursework is on track and deadlines are manageable", "I am keeping up with lectures without difficulty", "My academic routine is going well"],
 "connection": ["I feel supported and have friends I can talk to", "I have people around me and do not feel isolated", "I feel connected to a welcoming group of classmates"],
}
FRAMES = {
 "train": ["Recently, {body}.", "I wanted to share that {body}.", "At the moment, {body}.", "What I would like to discuss is this: {body}."],
 "dev": ["Here is my situation: {body}.", "For my check-in, {body}."],
 "test": ["To explain what is happening for me, {body}.", "The main thing I want you to know is that {body}."],
}

def write(path, value):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

def generate():
 rng=random.Random(SEED)
 partitions={"train":(0,12,900),"dev":(12,15,300),"test":(15,18,300)}
 seen=set(); counts={}; families={}
 DEST.mkdir(parents=True,exist_ok=True)
 for split,(lo,hi,count) in partitions.items():
  rows=[]; attempts=0
  while len(rows)<count:
   attempts+=1
   if attempts>100000: raise RuntimeError("Insufficient unique narrative combinations")
   # Empty-label cases are 20%; single and mixed concerns comprise the rest.
   size=rng.choices([0,1,2,3],[.20,.30,.35,.15])[0]
   topics=rng.sample(LABELS,size)
   parts=[]; ids=[]
   if not topics:
    index=rng.randrange(lo,hi);parts.append(NEUTRAL[index]);ids.append(f"neutral-{index}")
   for topic in topics:
    index=rng.randrange(lo,hi);parts.append(CLAUSES[topic][index]);ids.append(f"{topic}-{index}")
   # Explicit denials belong only to absent labels; avoid contradicting a target.
   absent=[t for t in LABELS if t not in topics]
   denial=rng.sample(absent,min(len(absent),rng.choice([0,1,2])))
   for topic in denial:
    index={"train":0,"dev":1,"test":2}[split]
    parts.append(NEGATED[topic][index]);ids.append(f"denial-{topic}-{index}")
   rng.shuffle(parts)
   text=rng.choice(FRAMES[split]).format(body="; ".join(parts))
   normalized=" ".join(text.lower().split())
   if normalized in seen: continue
   seen.add(normalized)
   rows.append({"id":f"C2-TEXT-{split.upper()}-{len(rows)+1:04d}","split":split,"text":text,
    "labels":[i for i,t in enumerate(LABELS) if t in topics],"concerns":[t for t in LABELS if t in topics],
    "sourceType":"synthetic","familyIds":sorted(ids)})
  path=DEST/f"{split}.jsonl"
  path.write_text("".join(json.dumps(r,ensure_ascii=False)+"\n" for r in rows),encoding="utf-8")
  counts[split]={"rows":len(rows),"labelCounts":[sum(i in r['labels'] for r in rows) for i in range(5)],
   "emptyLabelRows":sum(not r['labels'] for r in rows),"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
  families[split]=set(itertools.chain.from_iterable(r['familyIds'] for r in rows))
 overlaps={f"{a}:{b}":len(families[a]&families[b]) for a,b in itertools.combinations(partitions,2)}
 assert not any(overlaps.values())
 manifest={"schemaVersion":1,"version":"c2-synthetic-concern-narratives-v1","seed":SEED,"labels":LABELS,
  "sourceType":"synthetic","generator":"ml/c2/generate_concern_cases.py","generatorSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  "partitions":counts,"familyOverlaps":overlaps,
  "limitations":["Composed synthetic narratives with simulated concern labels; no participants or clinical diagnoses.",
   "Wording-family separation reduces exact template leakage but does not establish natural-language generalization.",
   "Shared topic vocabulary and artificial composition can make classification easier than real student accounts.",
   "Negated examples cover only a narrow set of constructions. No independent professional annotation review.",
   "English only; no local cultural or clinical validation."]}
 write(DEST/'manifest.json',manifest)
 print(json.dumps(manifest),flush=True)

if __name__=='__main__': generate()
