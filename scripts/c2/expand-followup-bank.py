"""Original, non-diagnostic support questions; no event/injury/method details.

Append ten 17-question topics to the preserved 100-question bank. Four branches
per new topic depend on its entry answer. Professional review remains pending.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
# Entry options map, in order, to the first four follow-up questions.
TOPICS = {
 "stress": ("Which part of everyday pressure would you most like support with?", ["Too many commitments", "Feeling exhausted", "Difficulty taking breaks", "Pressure from expectations"], [
  "Which commitment would be most useful to review first?|A daily responsibility|A work commitment|Something I could postpone|I need help deciding",
  "What kind of recovery feels most accessible at present?|A quieter period|A shorter task list|Support from someone else|I am not sure",
  "What usually makes a short break difficult to take?|Feeling guilty|Not having time|Other people needing me|Not noticing I need one",
  "Whose expectations would you like help responding to?|My own|People close to me|Work or university|Several sources",
  "When does the pressure in your day feel most noticeable?|Before the day starts|During busy periods|When trying to rest|It varies",
  "Which boundary might give you a little more space?|A finishing time|Fewer extra commitments|Time without messages|Help saying no",
  "What tends to happen when demands build up?|I push through|I put things off|I withdraw|I ask for help",
  "Which part of your routine would you like to make more manageable?|Getting started|Balancing responsibilities|Taking a pause|Ending the day",
  "What would make asking for practical help easier?|Knowing whom to ask|Having words ready|A smaller request|A private conversation",
  "What kind of rest fits your circumstances best?|Quiet time|Gentle enjoyable activity|Company|I need to explore options",
  "Which change would feel realistic for this week?|Reducing one task|Protecting one break|Sharing one responsibility|Talking to someone",
  "What makes it harder to notice your limits?|Wanting to help everyone|Comparing myself with others|Unpredictable demands|I am not sure",
  "How would you prefer to explore pressure with someone?|Practical planning|Talking through feelings|Discussing boundaries|A combination",
  "Which support is currently missing from your routine?|Time to recover|Practical assistance|Emotional support|Information about options",
  "What would you like a support conversation to focus on first?|Understanding the pressure|Making a manageable plan|Finding resources|I am unsure",
  "What would count as a small useful change today?|A little more breathing space|One clearer priority|One request for help|Choosing to pause" ]),
 "panic": ("What would you like support with around sudden fear or panic?", ["During a sudden episode", "Worry about another episode", "Avoiding situations", "Finding professional advice"], [
  "What kind of support would you prefer during a frightening episode?|A trusted person nearby|A quiet familiar space|Professional guidance|I am unsure",
  "How is anticipating another episode affecting your plans?|I cancel plans|I seek reassurance|I stay close to familiar places|It varies",
  "Which situations have become harder to approach?|Busy places|Travel|Being away from home|I prefer not to specify",
  "What would help you arrange professional advice?|Choosing someone|Preparing questions|Understanding confidentiality|Practical booking help",
  "When discussing sudden fear, what feels most important to explain?|What it feels like|Its effect on my routine|My concerns about it returning|The support I want",
  "What would make a first support conversation feel more comfortable?|Online contact|Someone accompanying me|Knowing what to expect|A private appointment",
  "Who could you choose to contact when you want reassurance or support?|A trusted person|A professional|University support|I need help finding someone",
  "How have these episodes changed your daily routine?|Less independent activity|More time planning|Less social contact|Little change so far",
  "Which part of preparing for support feels hardest?|Explaining my experience|Finding time|Choosing a service|I am unsure",
  "What would you like to understand better about these experiences?|Possible explanations|Ways to respond|Available assessment|How to talk about them",
  "Which practical adjustment would help you attend an appointment?|A suitable time|Online access|Travel support|Help with the first contact",
  "How would you like someone close to you to help?|Listen|Stay nearby when asked|Help arrange advice|Respect my space",
  "What makes support feel accessible to you?|Clear information|A preferred language|A familiar setting|Being able to choose the professional",
  "What would you want a professional to know before a meeting?|How my routine is affected|What I am worried about|What support I prefer|I would rather explain in person",
  "What kind of next step feels possible without pushing yourself?|Prepare a question|Talk to someone trusted|Browse professionals|Take time to choose",
  "Which goal matters most in seeking help for sudden fear?|Understanding what is happening|Feeling supported|Discussing daily-life changes|Choosing suitable care" ]),
 "relationships": ("Which relationship concern would you like to explore first?", ["Family expectations", "Conflict or communication", "Setting boundaries", "A breakup or separation"], [
  "Which family expectation feels hardest to discuss?|Study or career choices|Time or responsibilities|Personal choices|I prefer not to specify",
  "What would you like to make easier in a difficult conversation?|Explaining my needs|Listening without escalation|Choosing a time|Knowing whether to have it",
  "Which boundary would you like help putting into words?|Time and availability|Privacy|Responsibilities|How I want to be treated",
  "What would feel most supportive after the separation?|Someone listening|Help with routines|Space from reminders|Professional support",
  "What would make a relationship conversation feel safer and more comfortable?|A neutral setting|A trusted supporter|Written preparation|Choosing not to have it now",
  "How do relationship difficulties affect your usual day?|Distracting thoughts|Less energy|Withdrawing from others|Changes to routines",
  "What support would you like without sharing private details?|Communication ideas|Boundary planning|Someone to listen|Finding a professional",
  "What tends to make it hard to express a need?|Fear of upsetting someone|Not finding the words|Feeling guilty|Not knowing what I need",
  "What kind of connection would feel useful outside this difficulty?|A trusted friend|A student group|A professional|Time by myself first",
  "Which personal need would you like to keep in view?|Respect|Privacy|Time to recover|Being heard",
  "What would help you decide on a manageable next step in this relationship?|Clarifying my needs|Talking to a neutral person|Exploring options|More time",
  "How would you prefer to prepare for professional support about relationships?|Write a few points|Prepare questions|Explain in conversation|Bring someone trusted",
  "What would you want someone supporting you to avoid?|Pressuring me to decide|Taking sides|Sharing my information|Minimising the concern",
  "What kind of boundary support feels useful today?|Practising a sentence|Choosing a limit|Planning how to get support|I am unsure",
  "What would make reaching out about relationship concerns easier?|Privacy information|A preferred language|A suitable appointment mode|Help choosing a professional",
  "Which outcome would you like from a relationship-support conversation?|Feeling heard|Clearer choices|A communication plan|Support with coping" ]),
 "grief": ("Which part of grief or loss would you like support with?", ["Missing someone", "Changes to daily routines", "Talking about the loss", "Anniversaries or reminders"], [
  "What kind of company would feel welcome when missing someone?|Quiet company|Someone listening|A shared activity|Space with support available",
  "Which everyday routine feels hardest after the loss?|Meals or rest|Study or work|Keeping in touch|Managing practical tasks",
  "What would make talking about the loss more comfortable?|Choosing what to share|A trusted listener|A private professional|I do not want to talk about it yet",
  "How would you prefer to prepare for a difficult reminder?|Plan gentle company|Keep demands light|Choose a meaningful activity|Leave the plan flexible",
  "What would feel supportive without expecting grief to follow a timetable?|Patience|Practical help|Someone checking in|A professional conversation",
  "Which kind of help would lighten one everyday demand while grieving?|Help with a task|A flexible deadline|Meals or errands|Help asking for support",
  "How would you like people around you to respond to your loss?|Listen without fixing|Ask before offering advice|Include me gently|Give me space when requested",
  "What makes reaching out during grief difficult?|Finding the words|Worrying about burdening others|Not knowing whom to ask|Wanting privacy",
  "What kind of gentle activity might fit your energy while grieving?|A familiar routine|Quiet time outside|Contact with someone trusted|I am not sure",
  "What would you like a professional to understand about this loss?|Its effect on my day|The support I have|What feels difficult now|I would rather explain later",
  "Which support format would suit a conversation about grief?|Individual online|Individual in person|A suitable group|I need information first",
  "What would make the next few days a little more manageable?|Fewer demands|One supportive contact|Practical assistance|A flexible routine",
  "What would you prefer when people check in about grief?|A brief message|An invitation with no pressure|A planned conversation|Letting me start contact",
  "How much would you want to share about the loss in an initial appointment?|Only its impact|A brief outline|More detail if comfortable|I want to decide at the time",
  "Which part of finding grief support would you like help with?|Choosing a listener|Understanding available services|Preparing questions|Making first contact",
  "What would count as a useful first step with grief support?|Feeling less alone|Having space to speak|Practical help|Knowing my options" ]),
 "self-esteem": ("Which confidence or self-esteem concern feels most relevant?", ["Harsh self-criticism", "Comparing myself with others", "Doubting my abilities", "Difficulty recognising strengths"], [
  "When self-criticism starts, what would you like help noticing?|The words I use|The situation that triggered it|What I would say to a friend|A balanced alternative",
  "Where do comparisons feel most difficult?|Studies or work|Social media|Relationships|Several settings",
  "Which situation brings up the most doubt in your abilities?|Starting something new|Being evaluated|Speaking up|Making a decision",
  "What would make recognising a strength feel more believable?|A specific example|Feedback from someone trusted|Noticing effort|Taking a smaller step",
  "What would a kinder response to a small mistake sound like for you?|Allowing myself to learn|Recognising effort|Keeping the mistake in perspective|I need help finding words",
  "Which personal value would you like to keep visible when confidence is low?|Learning|Kindness|Reliability|Something I choose myself",
  "What makes accepting positive feedback uncomfortable?|Doubting it is sincere|Focusing on flaws|Feeling undeserving|I am not sure",
  "What kind of small confidence-building step feels manageable?|Asking a question|Trying a familiar task|Expressing a preference|Noticing an achievement",
  "How would you like someone to support you with self-doubt?|Listen|Offer balanced feedback|Help plan a small step|Discuss it professionally",
  "Which situation would you like to approach with less pressure to be perfect?|Study or work|Meeting people|Trying a hobby|Everyday decisions",
  "What would help you notice effort rather than only the result?|A brief reflection|A realistic goal|Supportive feedback|Permission to learn",
  "What would you like to explore in a professional conversation about confidence?|Negative self-talk|Comparison|Boundaries|My strengths and values",
  "Which source of comparison would you like more distance from?|Online posts|Other people's achievements|Family expectations|My own ideal standards",
  "What gets in the way of treating yourself as kindly as someone else?|Habit|High expectations|Past criticism|I am unsure",
  "Which kind of reminder would feel supportive when doubting yourself?|A balanced sentence|A past example of effort|A trusted person's perspective|No written reminder",
  "What would a small improvement in self-confidence make easier?|Taking part|Starting a task|Expressing a need|Being kinder to myself" ]),
 "anger": ("What would you like help with around anger or frustration?", ["Noticing early signs", "Pausing before reacting", "Expressing frustration", "Recovering after conflict"], [
  "Which early sign would you like to notice sooner when frustrated?|Tension|Faster thoughts|A raised voice|Wanting to leave",
  "What would make taking a pause before reacting more possible?|A prepared sentence|Space to step away safely|A reminder|Professional guidance",
  "What would you like to communicate more clearly when frustrated?|A need|A boundary|A disagreement|A request for help",
  "What would help you reflect after a difficult interaction?|Time to settle|Writing privately|Talking to a neutral person|A professional conversation",
  "Which situations most often build frustration for you?|Feeling unheard|Unexpected changes|Too many demands|It varies",
  "What kind of support feels useful when irritation is building?|Quiet space|Someone listening|Help with a practical demand|A planned professional conversation",
  "What would a respectful pause in a disagreement look like for you?|Agreeing to return later|Explaining I need a break|Choosing a calmer setting|I need help planning it",
  "What need might be hard to express before frustration grows?|Rest|Respect|Clarity|Help with responsibilities",
  "Which part of managing emotions would you like to practise?|Recognising feelings|Choosing words|Taking a pause|Finding support",
  "What would you want someone supporting you to understand about frustration?|Its effect on my day|What makes it worse|What helps me settle|I want to discuss privately",
  "What makes it difficult to seek help with anger?|Fear of judgment|Not knowing where to start|Privacy concerns|Thinking I should manage alone",
  "Which setting would suit a conversation about emotional reactions?|Private online|Private in person|A familiar support setting|I need information first",
  "What helps you notice when a conversation is no longer constructive?|Repeated arguments|Rising tension|Not listening to each other|I need help recognising this",
  "What would you like a professional to help you work on first?|Understanding patterns|Communication|Coping with frustration|Choosing a support plan",
  "Which practical demand could you ask for help with before it builds frustration?|Workload|Time pressure|Unclear expectations|I am not sure",
  "What would a useful first change in handling frustration look like?|Noticing it sooner|Pausing once|Expressing one need|Asking for support" ]),
 "eating": ("Which food or body-image concern would you like support with?", ["Distressing body thoughts", "Difficult feelings around meals", "Eating with other people", "Finding qualified support"], [
  "What support would feel useful when body-related thoughts are distressing?|Someone listening without judgment|Less pressure around appearance|Professional advice|I am unsure",
  "What would you want someone to understand about difficult feelings around meals?|How they affect my day|The emotions involved|The support I prefer|I would rather explain privately",
  "What could make talking about social eating concerns more comfortable?|No comments about appearance|Choosing whom to tell|A private conversation|Professional support",
  "What would make finding qualified eating-related support easier?|Knowing available services|Confidentiality information|A preferred language|Help preparing questions",
  "What would you prefer to avoid in a conversation about eating concerns?|Weight or appearance comments|Comparisons|Unasked-for diet advice|Pressure to share details",
  "How are food or body-image worries affecting everyday life?|Concentration|Social plans|Emotional energy|Several areas",
  "What kind of first support conversation would you prefer about eating?|Online with a professional|In person with a professional|With someone trusted first|Information before deciding",
  "Who could help you find appropriate eating-related support?|University health services|A qualified professional|Someone I trust|I need help choosing",
  "What would you like to prepare before discussing body-image concerns?|A short description of impact|Questions about care|My privacy preferences|I prefer to talk without notes",
  "Which part of seeking support for eating concerns feels most difficult?|Fear of judgment|Not feeling understood|Finding suitable care|Explaining what I need",
  "What would feel respectful when someone offers support about food?|Asking what helps|Listening|Avoiding assumptions|Respecting my choices",
  "What would you like a professional to know about your preferred support?|Language|Appointment format|Who may be involved|Confidentiality questions",
  "What makes it harder to step back from appearance-related pressure?|Social media|Comments from others|Comparison|Several sources",
  "Which small support step feels possible for eating-related distress?|Prepare a question|Choose a trusted contact|Browse qualified support|Take time to decide",
  "How much detail would you want to share about eating in a first appointment?|Only daily-life impact|A brief outline|More if comfortable|Decide during the appointment",
  "What would make an initial eating-support conversation useful?|Feeling heard|Knowing care options|Planning a follow-up|Understanding confidentiality" ]),
 "substance-use": ("What would you like to discuss about alcohol or substance use?", ["Using it to cope", "Effects on daily life", "Pressure from others", "Finding confidential advice"], [
  "What kind of support would you like when substances have become a way to cope?|Talking through feelings|Discussing other support options|Professional advice|I am not sure",
  "Which part of everyday life is most affected by substance use?|Responsibilities|Relationships|Finances|Several areas",
  "What would help you respond to pressure around alcohol or substances?|A boundary sentence|A trusted supporter|An alternative social plan|Professional guidance",
  "What would help you ask for confidential substance-use advice?|Clear privacy information|A suitable service|Prepared questions|Help making contact",
  "What would you want a substance-support conversation to avoid?|Judgment|Assumptions|Pressure to share details|Advice without understanding my circumstances",
  "Who would you feel comfortable approaching about substance-related concerns?|A qualified professional|University health support|Someone trusted|I need to explore options",
  "What kind of professional conversation about substance use would suit you?|Online|In person|Information first|I am unsure",
  "What would you like to understand before choosing substance-use support?|Confidentiality|Available care|What an appointment involves|Follow-up options",
  "Which part of asking for substance-related help feels hardest?|Embarrassment|Not knowing where to go|Time or access|Fear of being judged",
  "What could make a first contact about substance use more manageable?|A short prepared message|Support from someone trusted|Choosing a time|A preferred language",
  "What would you like a qualified professional to help you consider?|My pattern of use|Its impact|Suitable care options|Support with coping",
  "How would you prefer someone close to you to offer substance-related support?|Listen without judgment|Help find qualified advice|Respect my privacy|Ask what I need",
  "What other kind of support might be useful alongside substance-use advice?|Emotional support|Practical assistance|Social connection|I am not sure",
  "What would you like to ask about a substance-support service?|Who sees my information|How care is planned|What follow-up is available|How to arrange a meeting",
  "Which next step feels possible for substance-related concerns?|Prepare questions|Browse professionals|Ask someone trusted for help|Seek health-service advice",
  "What would make substance-related support feel useful to you?|Being listened to|A clear care discussion|Help accessing services|Respect for my preferences" ]),
 "trauma": ("Without describing any event, what support would feel most useful?", ["Feeling more settled", "Dealing with reminders", "Managing daily routines", "Finding someone safe to talk to"], [
  "What kind of present-day support could help you feel more settled?|A familiar environment|Someone trusted nearby|Fewer demands|Professional support",
  "When reminders feel upsetting, what support would you prefer?|A trusted contact|Space without questions|Help finding a professional|I am unsure",
  "Which everyday routine would you like support making manageable?|Rest|Study or work|Keeping in touch|Practical responsibilities",
  "What would help you choose someone to speak with about difficult experiences?|Privacy information|Relevant professional support|A preferred language|Control over what I share",
  "What would you want a first conversation about difficult experiences to respect?|No pressure for event details|My pace|My privacy|All of these",
  "How would you prefer to arrange support after a distressing experience?|Online|In person|With a trusted person helping|Information before deciding",
  "What would make the current environment feel more comfortable?|A familiar place|A quieter space|Company I choose|I am not sure",
  "Which present-day impact would you want a professional to understand?|Concentration|Rest or routines|Relationships|Several areas",
  "What would help you keep control during a support conversation?|Being able to pause|Choosing what to share|Knowing what happens next|Having questions answered first",
  "Who could help you access support after a difficult experience?|A trusted person|University support|A qualified professional|I need help finding someone",
  "Which practical barrier to support would you like help with?|Finding a service|Arranging a suitable time|Travel or online access|Understanding confidentiality",
  "What would you prefer when someone checks in after a distressing experience?|A brief message|An invitation without pressure|A planned conversation|Letting me initiate contact",
  "What kind of routine adjustment might make today more manageable?|Reducing one demand|Keeping a familiar activity|Asking for practical help|I want professional advice first",
  "What would you want to ask a professional before sharing more about difficult experiences?|Their approach|Privacy limits|My choices during sessions|Available follow-up",
  "Which support step feels comfortable without discussing the event?|Prepare a privacy question|Browse relevant professionals|Ask someone trusted to help|Choose more time",
  "What would count as a useful first conversation after a difficult experience?|Feeling respected|Knowing my options|A manageable next step|Being able to stop when I choose" ]),
 "practical": ("Which practical pressure would you most like help with?", ["Money or essential expenses", "Housing or accommodation", "Food or transport access", "Finding university assistance"], [
  "What kind of information would help with money-related pressure?|Available assistance|How to apply|Whom to contact|Help understanding options",
  "What would you like help finding around accommodation?|A support contact|Information about options|Help explaining the situation|Practical university guidance",
  "Which access issue would you like a support service to understand?|Food costs|Travel costs|Availability|Several essentials",
  "What would make contacting university assistance easier?|Knowing the right team|A short prepared message|Application information|A trusted person helping",
  "Which practical demand feels most pressing to discuss today?|Essential bills|Accommodation|Getting to university|Finding support information",
  "What gets in the way of applying for practical support?|Unclear eligibility|Forms or documents|Not knowing where to start|Privacy concerns",
  "How are practical pressures affecting your day at university?|Concentration|Attendance|Time available|Emotional energy",
  "Who could help you navigate practical assistance?|A university support officer|A trusted person|A student organisation|I need help finding a contact",
  "How would you prefer to explain a practical-support need?|A short written outline|An online conversation|An in-person meeting|With someone supporting me",
  "What would you like to understand before applying for assistance?|Eligibility|What information is needed|Confidentiality|Next steps after applying",
  "Which small preparation step for practical assistance feels possible?|Find the correct contact|Write down the issue|List questions|Ask someone to help",
  "What kind of practical information is hardest to find?|Available services|Application steps|Where to get advice|How long responses may take",
  "What would make practical-support information easier to use?|Plain language|My preferred language|A clear checklist|A person to ask",
  "Which responsibility could you seek flexibility with while finding assistance?|A deadline|A work schedule|A meeting|I need advice on options",
  "What would you like a support contact to focus on first about practical needs?|Understanding the need|Explaining services|Helping with the first step|Connecting me with the right team",
  "What would make a first practical-support conversation useful?|A clear contact|Information I can act on|Help with an application|A follow-up plan" ]),
}

def main():
 bank=json.loads((ROOT/'ml/c2/data/definitions/followup-bank-v1.json').read_text(encoding='utf-8'))
 assert bank['version']=='c2-adaptive-followups-v1' and len(bank['questions'])==100
 bank['version']='c2-adaptive-followups-v2'
 bank['sources'] += ['https://selfhelp.cntw.nhs.uk/', 'https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/']
 worry=next(q for q in bank['questions'] if q['id']=='worry')
 worry['signals'].append({'answer':'Money or practical problems','topics':['practical']})
 next(s for s in worry['signals'] if s['answer']=='Relationships')['topics'].append('relationships')
 for topic,(text,choices,followups) in TOPICS.items():
  assert len(choices)==4 and len(followups)==16
  no=f'No current {topic.replace("-", " ")} concern'
  bank['questions'].append({'id':topic,'text':text,'options':choices+[no],'topics':[topic],
   'facet':f'{topic}-entry','priority':5,'reason':'An optional support question, not a diagnostic item.',
   'signals':[{'answer':no,'dismissTopics':[topic]}]})
  for i,row in enumerate(followups):
   question,*options=row.split('|')
   record={'id':f'{topic}-detail-{i+1}','text':question,'options':options,'topics':[topic],
    'facet':f'{topic}-detail-{i+1}','priority':4 if i<4 else 0,'reason':'An optional support question, not a diagnostic item.'}
   if i<4:record['when']=[{'questionId':topic,'answers':[choices[i]]}]
   bank['questions'].append(record)
 next(q for q in bank['questions'] if q['id']=='substance-use-detail-13')['signals']=[
  {'answer':'Social connection','topics':['connection']}, {'answer':'Practical assistance','topics':['practical']}]
 assert len(bank['questions'])==270
 assert len({q['text'].lower() for q in bank['questions']})==270
 (ROOT/'src/lib/c2/followup-bank.json').write_text(json.dumps(bank,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print(json.dumps({'version':bank['version'],'questions':len(bank['questions']),'newTopics':list(TOPICS)}))

if __name__=='__main__':main()
