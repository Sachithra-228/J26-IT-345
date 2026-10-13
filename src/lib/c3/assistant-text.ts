/**
 * C3 career assistant (FR12): answer templates in English, Sinhala and Tamil.
 *
 * Every number in an answer is filled in from the C3 results ({placeholders}); the
 * templates themselves contain no facts. Sinhala and Tamil follow the same review
 * rule as `i18n.ts`: machine-assisted, to be checked by native speakers.
 */
import type { Language } from "@/context/language-context";

const en = {
  needAnalysis:
    "I need your readiness analysis first. Open the \"Readiness and plan\" tab, rate your skills, choose your target roles and press \"Analyse my readiness\" - then ask me again.",
  unknown:
    "Sorry, I could not match that to anything I can answer. I only answer questions about your C3 results - try one of the suggestions below.",
  unknownRole: "I do not have a profile for that role yet, so I used {role}.",
  // readiness
  readinessLine: "Your readiness for {role} is {score}/100 - {band}.",
  readinessRank: "It ranks {rank} of {total} roles for your current skills.",
  readinessBaseline: "By simple overlap (ignoring importance) you have {covered} of the {required} skills it asks for.",
  readinessOthers: "Your other targets: {list}.",
  // score reasons
  reasonIntro:
    "Each skill adds points in proportion to how much {role} job ads value it, and a missing important skill subtracts points. They add up to your {score}/100.",
  reasonPlus: "{skill}: +{points} points (you are {level}, ads ask for {required}).",
  reasonHeld: "{skill}: {points} points still to gain (you are {level}, ads ask for {required}).",
  reasonPlusTitle: "Adding the most:",
  reasonMinusTitle: "Holding the score back:",
  reasonNoMinus: "Nothing is holding it back: you meet every skill level that {role} ads ask for.",
  // best role
  bestIntro: "Roles that match your current skills best:",
  bestLine: "{role} - {score}/100{mark}",
  targetMark: " (your target)",
  bestNotTarget: "{role} is not one of your targets, but it fits your skills well - it may be worth a look.",
  bestIsTarget: "Your best match, {role}, is already one of your targets.",
  // gaps
  gapsIntro: "Your most valuable skill gaps for {role}, biggest score gain first:",
  gapLine: "{skill}: {level} → {required}, +{points} points (in {pct}% of the ads)",
  gapsMore: "...and {n} more, smaller ones - see the full list in the \"Readiness and plan\" tab.",
  gapSkill: "{skill} for {role}: you are {level} and the ads ask for {required}. Reaching it adds about +{points} points.",
  gapSkillMet: "You already meet the {skill} level that {role} ads ask for.",
  gapSkillNotAsked: "{role} ads rarely ask for {skill}, so it does not change this score.",
  // next steps
  nextFirst: "Start with \"{title}\" ({type}, about {hours} h). It takes {skill} from {from} to {to}.",
  nextWhy: "Why this first:",
  nextThen: "Then:",
  nextStepLine: "{title} ({type}, about {hours} h)",
  nextNone: "You do not need any actions for {role} right now - you meet every level its ads ask for.",
  // compare roles
  compareIntro: "Side by side, for your current skills:",
  compareLine: "{role}: {score}/100 ({band}), {n} skill gaps",
  compareCloser: "You are {diff} points closer to {role} than to {other}.",
  compareEqual: "You are about equally close to both.",
  compareShared: "Gaps they share - closing these helps both: {skills}.",
  compareOnly: "Gaps only for {role}: {skills}.",
  // role requirements
  reqIntro: "What {role} job ads ask for most ({n} ads analysed):",
  reqLine: "{skill}: {required} level, in {pct}% of the ads",
  reqLineYou: "{skill}: {required} level, in {pct}% of the ads - you: {you}",
  reqMore: "...plus {n} less important skills.",
  reqWhichRole: "Which role do you mean? For example: {examples}.",
  // learning resources
  resWhichSkill: "Which skill would you like to learn? For example: \"How do I learn Docker?\" - or run the readiness analysis and I will use your top gaps.",
  resFromGaps: "Here is how to work on your top gaps:",
  resIntro: "{skill} (you are {level}):",
  resLine: "{title} - {type}, about {hours} h, builds it to {level}",
  resNone: "The knowledge graph has no learning action for {skill} yet.",
  resTop: "You are already Advanced in {skill} - show it with a project instead.",
  // certifications
  certIntro: "Certifications that prove skills for {about}:",
  certIntroAll: "Certifications in the knowledge graph:",
  certLine: "{title} - {provider}, about {hours} h of preparation; proves {skills}",
  certNone: "The knowledge graph has no certification for {about}.",
  certNote: "Certifications are optional and most exams are paid - a good project can prove a skill just as well.",
  // mock interview
  ivNone: "You have not finished a mock interview in this session yet. Try the \"Mock interview\" tab - meanwhile, three tips:",
  ivFocus: "The mock-interview questions will focus on your top gap, {skill}.",
  ivResult: "In your mock interview you averaged {score}/100 over {n} answers.",
  ivWeakest: "Your weakest area was {criterion} ({score}/100). Tip:",
  // help and about
  helpIntro: "I am the C3 career assistant. You can ask me, for example:",
  helpTopics:
    "how ready you are · why you got that score · which role suits you · your skill gaps · what to do next · comparing two roles · what a role requires · how to learn a skill · certifications · how your mock interview went",
  aboutRules:
    "I am a rule-based assistant, not a chatbot: I match your question to a topic and answer only from your own C3 results, so I do not make anything up.",
  aboutPrivacy: "Everything runs in your browser. Your questions and answers are not sent or saved.",
  aboutSynthetic:
    "Role profiles are currently built from synthetic job advertisements, so treat the numbers as a research prototype, not real-world accuracy.",
  aboutGuidance: "Scores are guidance, not a guarantee - they do not predict whether you will be hired.",
  // UI labels used for sources
  srcReadiness: "your readiness scores",
  srcGaps: "your ranked skill gaps",
  srcPlan: "your Gap-to-Action plan",
  srcRoleProfile: "job-ad role profiles",
  srcGraph: "the Gap-to-Action knowledge graph",
  srcInterview: "your mock-interview summary",
  srcModel: "how the C3 model was built"
};

export type AssistantText = typeof en;

// Sinhala and Tamil translations are added separately; English is used until then.
const si: AssistantText = { ...en };
const ta: AssistantText = { ...en };

const DICTIONARIES: Record<Language, AssistantText> = { en, si, ta };

export function getAssistantText(language: Language): AssistantText {
  return DICTIONARIES[language] ?? en;
}
