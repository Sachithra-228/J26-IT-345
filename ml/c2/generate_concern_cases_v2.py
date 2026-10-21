"""Fifteen non-diagnostic support labels; separate family-disjoint synthetic v2 data.

Self-harm is deliberately NOT a learned output. Direct disclosures have a separate
application support route. No participant, patient or clinical outcome data.
"""
import hashlib
import itertools
import json
from pathlib import Path
import random
from generate_concern_cases import CLAUSES as ORIGINAL, NEUTRAL, NEGATED as DENIALS, FRAMES, SEED, ROOT, write

DEST = ROOT / "ml/c2/data/synthetic/concerns-v2"
EXTRA = {
 "stress": [
  "I feel worn out by the demands of everyday life", "I am overwhelmed by all my responsibilities",
  "I have no time to recover between the things I need to do", "I feel stretched too thin by my daily commitments",
  "I feel exhausted from constantly having too much to manage", "I cannot switch off from the pressure of my responsibilities",
  "I feel drained even after taking a break from my busy routine", "My daily demands are leaving me emotionally exhausted",
  "I am finding it hard to make room for rest in my life", "I feel burnt out from trying to do everything",
  "I am running out of energy to manage ordinary demands", "The pressure of daily responsibilities feels relentless",
  "I have reached my limit with how much I am expected to juggle", "I feel depleted by the pace of my everyday life",
  "I need a way to recover from being constantly under pressure", "I feel overloaded by commitments outside my studies",
  "I cannot find breathing space between my daily obligations", "Keeping up with everything is leaving me burnt out"],
 "panic": [
  "I get sudden bursts of intense fear that feel overwhelming", "My heart races during sudden episodes of fear",
  "I worry about having another sudden panic episode", "I avoid places where I previously felt sudden intense fear",
  "I have episodes of trembling and fear that arrive unexpectedly", "I become terrified in short intense bursts",
  "I need help coping when panic seems to come out of nowhere", "Sudden waves of fear make me want to escape",
  "I feel frightened by the physical sensations during panic", "I feel trapped when an unexpected rush of fear starts",
  "I am limiting my activities because I fear another panic episode", "I have frightening surges of fear even in familiar places",
  "I get abrupt spells of terror with a pounding heart", "I am avoiding busy spaces after a frightening panic spell",
  "I would like support with unexpected attacks of intense fear", "Sudden panic leaves me scared to go out again",
  "I am struggling with brief overwhelming episodes of terror", "I fear the next sudden surge of panic and need support"],
 "relationships": [
  "Conflict with my family has been upsetting me", "Arguments with my partner are affecting my day",
  "I struggle to set boundaries in my relationships", "I am having difficult conversations with my parents",
  "Tension with people close to me keeps building", "I want help handling disagreements with someone I care about",
  "I feel pressured by expectations from my family", "I am finding communication with my partner difficult",
  "I need support with a breakup", "I feel uncomfortable saying no to people close to me",
  "I am upset by ongoing conflict at home", "I want to work out boundaries with a close friend",
  "My relationship disagreements are taking up a lot of emotional energy", "I find it hard to express my needs to my family",
  "I am struggling after the end of a romantic relationship", "I need help dealing with tension between me and my relatives",
  "Repeated arguments with my partner are hard to handle", "I want support communicating boundaries to someone close"],
 "grief": [
  "I am grieving the death of someone close to me", "I am struggling to cope after a bereavement",
  "I miss a loved one who died", "A recent loss has left me feeling overwhelmed",
  "I want support while mourning someone important to me", "I am finding anniversaries of a death difficult",
  "I do not know how to handle the loss of my loved one", "I feel waves of sadness since someone I loved died",
  "I would like someone to talk to about my bereavement", "I am trying to adjust to life after a significant loss",
  "I find reminders of the person who died painful", "I feel alone with my grief after losing someone",
  "I am mourning a person who meant a great deal to me", "I need support coping with the death of a family member",
  "I am having a hard time around reminders of my bereavement", "I want help finding my way through mourning",
  "The absence of a loved one who passed away feels hard to bear", "I am adapting to a major loss and would like support"],
 "self-esteem": [
  "I keep putting myself down", "I feel that I am not good enough compared with other people",
  "I am very critical of myself when I make mistakes", "I want help building confidence in myself",
  "I find it hard to recognise anything positive about myself", "I constantly compare myself unfavourably with others",
  "My inner criticism makes ordinary situations difficult", "I feel worthless when I do not meet my own expectations",
  "I doubt my abilities even when I have done well", "I want a kinder way of speaking to myself",
  "I struggle to believe that I have strengths", "I feel insecure about my worth as a person",
  "I am harsh on myself after even a small setback", "I lack confidence in my own capabilities",
  "I feel inferior when I look at what other people achieve", "I need support with persistent negative self-talk",
  "I dismiss my accomplishments and focus only on my flaws", "I want to develop a more balanced view of myself"],
 "anger": [
  "I get angry quickly and want help managing my reactions", "I find it difficult to calm down after feeling irritated",
  "Frustration builds up until I snap at people", "I regret the way I react when I feel angry",
  "I need support understanding what sets off my anger", "I struggle to express frustration without shouting",
  "Small annoyances make me much angrier than I expect", "I want a calmer way to respond during disagreements",
  "I feel irritable and lose my patience easily", "I carry resentment that makes it difficult to move on",
  "I need help taking a pause before an angry reaction", "I get worked up and struggle to settle my emotions",
  "I am upset by how quickly my temper rises", "I want to handle irritation without lashing out verbally",
  "I have trouble cooling down when something frustrates me", "I am finding my angry responses difficult to manage",
  "My short temper is creating tension with people around me", "I need support finding a constructive outlet for frustration"],
 "eating": [
  "I feel distressed about eating and my body image", "Worries about my appearance are affecting how I eat",
  "I feel guilty after meals and want support", "I am preoccupied with my body shape",
  "My eating patterns feel difficult to manage", "I avoid eating with other people because of body worries",
  "I want help with a troubled relationship with food", "Thoughts about weight take up much of my day",
  "I feel anxious around mealtimes", "I am unhappy with my body and it affects daily life",
  "I feel out of control around food sometimes", "I would like support without being judged about my eating",
  "I am struggling with distressing thoughts about food and appearance", "My body-image worries are interfering with meals",
  "I want to talk to someone about uncomfortable feelings after eating", "I find it hard to have a comfortable relationship with food",
  "Concerns about my shape are taking over my thoughts", "I need support with eating-related distress"],
 "substance-use": [
  "I am worried about how much alcohol I drink", "I use alcohol to cope with difficult feelings",
  "I want support reducing my use of substances", "My drinking is affecting my everyday routine",
  "I find it hard to control my use of drugs", "I feel pressure to drink more than I want to",
  "I am concerned that substance use has become a coping habit", "I want to talk privately about alcohol use",
  "I keep returning to drinking when I feel stressed", "I need help finding support for my drug use",
  "I am uneasy about the effect of substances on my life", "I want support making safer choices around alcohol",
  "I would like professional advice about my pattern of drinking", "I am struggling to manage a habit of using drugs",
  "I use substances to get through emotional difficulties", "My alcohol use is getting in the way of responsibilities",
  "I want a confidential conversation about substance-related problems", "I need support because drinking has become hard to manage"],
 "trauma": [
  "A frightening experience keeps coming back to mind", "I want support after something distressing happened to me",
  "Reminders of a past frightening event make me feel upset", "I avoid reminders of a difficult experience",
  "I do not want to describe the event but I would like support", "I feel on edge after an upsetting experience",
  "Memories of something frightening interrupt my day", "I am struggling to feel settled after a distressing event",
  "I would like help dealing with unwanted memories of an experience", "I feel unsettled by reminders of past harm",
  "I need someone safe to talk to after a frightening situation", "I am finding the aftermath of a difficult event hard to handle",
  "I have distressing reminders of an experience I went through", "I want support with the effects of something frightening",
  "An upsetting past event is still affecting my everyday life", "I feel shaken by something that happened and need support",
  "I find myself avoiding things that remind me of a distressing event", "I would like professional support without retelling a frightening experience"],
 "practical": [
  "I am worried about paying rent and basic expenses", "Money problems are making everyday life difficult",
  "I need support finding stable accommodation", "I am struggling to afford food and transport",
  "I have financial pressure that I cannot manage alone", "I want help finding practical university support",
  "My housing situation is uncertain", "I need advice about meeting basic living costs",
  "I am having trouble balancing paid work and essential expenses", "I need support navigating a difficult money situation",
  "I am worried about losing my accommodation", "I need help accessing financial assistance",
  "I cannot cover my essential bills comfortably", "I need someone to guide me towards housing support",
  "Everyday living costs are becoming unmanageable", "I want practical help with food and travel expenses",
  "I am struggling with unstable housing and limited money", "I need support finding help for basic material needs"],
}
NEGATED_EXTRA = {
 "stress": ["My daily responsibilities leave me enough time to rest", "I feel balanced rather than burnt out", "I have a manageable routine with room for recovery"],
 "panic": ["I have not had sudden episodes of intense fear", "I am not experiencing panic spells", "I have no current concern about unexpected fear attacks"],
 "relationships": ["My relationships are comfortable and respectful", "I have no current conflict with people close to me", "My family communication is going well"],
 "grief": ["I am not dealing with a bereavement or significant loss", "I have no current loss that I need support with", "I am not seeking help for grief at present"],
 "self-esteem": ["I feel confident in my worth and abilities", "I can recognise my strengths without putting myself down", "I have a balanced and kind view of myself"],
 "anger": ["I can handle frustration without losing my temper", "I am not having difficulty with anger", "I feel able to respond calmly when irritated"],
 "eating": ["I feel comfortable with my eating and body image", "Food and appearance are not current concerns for me", "I have a comfortable relationship with meals and my body"],
 "substance-use": ["I have no concerns about alcohol or drug use", "I am not using substances to cope", "Alcohol and drugs are not causing problems in my life"],
 "trauma": ["I am not troubled by memories of frightening events", "I have no current concern about a distressing past experience", "I am not seeking support for the effects of a frightening event"],
 "practical": ["My housing and basic expenses are stable", "I can comfortably meet my essential living costs", "I have no current need for financial or accommodation assistance"],
}

def generate():
 labels = list(ORIGINAL) + list(EXTRA)
 clauses = {**ORIGINAL, **EXTRA}; negated = {**DENIALS, **NEGATED_EXTRA}
 assert len(labels) == 15 and all(len(v) == 18 for v in clauses.values())
 rng = random.Random(SEED + 2); seen = set(); counts = {}; families = {}
 for split, (lo, hi, count) in {"train":(0,12,1800),"dev":(12,15,600),"test":(15,18,600)}.items():
  rows=[]
  while len(rows) < count:
   size = rng.choices([0,1,2,3,4], [.1,.25,.35,.2,.1])[0]
   topics = rng.sample(labels, size); parts=[]; ids=[]
   if not topics:
    index=rng.randrange(lo,hi); parts.append(NEUTRAL[index]); ids.append(f"neutral-{index}")
   for topic in topics:
    index=rng.randrange(lo,hi); parts.append(clauses[topic][index]); ids.append(f"{topic}-{index}")
   absent=[t for t in labels if t not in topics]
   for topic in rng.sample(absent, rng.choice([0,1,2])):
    index={"train":0,"dev":1,"test":2}[split]
    parts.append(negated[topic][index]); ids.append(f"denial-{topic}-{index}")
   rng.shuffle(parts); text=rng.choice(FRAMES[split]).format(body="; ".join(parts))
   normalized=" ".join(text.lower().split())
   if normalized in seen: continue
   seen.add(normalized)
   rows.append({"id":f"C2-TEXT-V2-{split.upper()}-{len(rows)+1:04d}","split":split,"text":text,
     "labels":[i for i,t in enumerate(labels) if t in topics],"concerns":[t for t in labels if t in topics],
     "sourceType":"synthetic","familyIds":sorted(ids)})
  DEST.mkdir(parents=True,exist_ok=True); path=DEST/f"{split}.jsonl"
  path.write_text("".join(json.dumps(row,ensure_ascii=False)+"\n" for row in rows),encoding="utf-8")
  counts[split]={"rows":len(rows),"labelCounts":[sum(i in row['labels'] for row in rows) for i in range(len(labels))],
    "emptyLabelRows":sum(not row['labels'] for row in rows),"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
  families[split]=set(itertools.chain.from_iterable(row['familyIds'] for row in rows))
 overlaps={f"{a}:{b}":len(families[a]&families[b]) for a,b in itertools.combinations(families,2)}
 assert not any(overlaps.values()) and all(min(v['labelCounts']) > 40 for v in counts.values())
 manifest={"schemaVersion":1,"version":"c2-synthetic-concern-narratives-v2","seed":SEED+2,"labels":labels,
  "sourceType":"synthetic","generator":"ml/c2/generate_concern_cases_v2.py",
  "generatorSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  "baseGeneratorSha256":hashlib.sha256(Path(__file__).with_name('generate_concern_cases.py').read_bytes()).hexdigest(),
  "partitions":counts,"familyOverlaps":overlaps,"limitations":[
   "Synthetic first-person support narratives, not diagnoses or participant records. No independent professional annotations.",
   "Wording families are split before composition, but shared vocabulary and artificial phrasing may simplify classification.",
   "Negation coverage is narrow; recovery, third-person accounts, sarcasm and unfamiliar wording need further evaluation.",
   "English only; no clinical or Sri Lankan student validation. Topic scores are not illness or risk probabilities.",
   "Self-harm is not a trained label; a separate direct-disclosure support route must remain available."]}
 write(DEST/'manifest.json',manifest)
 print(json.dumps({"data":str(DEST),"labels":labels,"partitions":counts,"familyOverlaps":overlaps}),flush=True)

if __name__ == '__main__': generate()
