export const STRESS_GUIDE =
  "https://www.who.int/publications/i/item/9789240003927";
export const ASSISTANT_VERSION = "c2-guided-support-v1";
export type SupportReply = {
  topic: string;
  text: string;
  source?: { label: string; url: string };
  action?: "support" | "safety";
  suggestions: string[];
};
export function concerningDisclosure(text: string): boolean {
  // A limited precautionary phrase check, never a validated risk classifier.
  return /\b(suicid\w*|kill myself|end my life|hurt myself|harm myself|self[- ]?harm|better off dead|want to die|can'?t stay safe|cannot stay safe|not safe|overdose)\b/i.test(
    text,
  );
}
const LIBRARY = [
  {
    topic: "privacy",
    pattern: /privac|confiden|share|save|data|who can see/i,
    text: "Your individual assessment answers, activity writing, reflections and this chat stay in this page session and clear when you refresh or leave. They are not sent to staff, a chat provider or the shared database. In Progress, you can choose to save selected mood ratings, screening summaries and activity completions on this browser. Anyone using this browser profile could open those entries; delete them in Progress. Downloaded appointment notes remain as a file until you delete it. Booking requests and forum posts are separate actions.",
    suggestions: ["What do my scores mean?", "Find a professional"],
  },
  {
    topic: "diagnosis",
    pattern:
      /diagnos|bipolar|schizophren|disorder|mentally ill|what.*scores|scores.*mean|result/i,
    text: "PHQ-9 and GAD-7 summarize reported depressive and anxiety symptoms over two weeks. They cannot confirm a diagnosis here. The reflection model describes wording only. A qualified professional can explore what the experiences mean for you.",
    suggestions: ["Find a professional", "Help with worry"],
  },
  {
    topic: "medication",
    pattern: /medic|prescri|dosage|tablet|pills|antidepress/i,
    text: "Medication choices and dose changes need a qualified prescriber who knows your circumstances. I can help you prepare questions for a professional, but I cannot recommend a medicine or tell you to start or stop one.",
    action: "support" as const,
    suggestions: ["Find a professional", "What should I discuss?"],
  },
  {
    topic: "professional",
    pattern:
      /professional|counsel|psycholog|psychiatr|therap|book|appointment/i,
    text: "You can open Find support and choose a professional using their listed expertise, language, gender preference and appointment mode. You decide whom to contact. Your assessment and this conversation are not attached to the request.",
    action: "support" as const,
    suggestions: ["What should I discuss?", "Who can see my answers?"],
  },
  {
    topic: "sleep",
    pattern: /sleep|insomnia|tired|bedtime|awake/i,
    text: "Sleep difficulties can make a demanding day feel harder. A manageable starting point is to choose one regular time to get up and a short wind-down routine. If the difficulty persists or affects daily life, discuss it with a professional. What would you prefer: a small next step, or help finding someone to talk to?",
    suggestions: ["A small next step", "Find a professional"],
  },
  {
    topic: "connection",
    pattern: /lonel|alone|friend|belong|relationship|community/i,
    text: "Feeling disconnected can be difficult. You could start with one person you feel comfortable contacting, without needing to explain everything at once. The community area can help you browse student discussions; you choose what to share.",
    suggestions: ["Find a professional", "A small next step"],
  },
  {
    topic: "worry",
    pattern: /anxi|worr|panic|afraid|nervous|overwhelm/i,
    text: "It sounds like worry is something you want space to discuss. You could pause, notice your surroundings and choose one action you can take now, rather than trying to solve everything together. This is general coping information. Would you prefer to talk through a small step or explore human support?",
    suggestions: ["A small next step", "Find a professional"],
  },
  {
    topic: "mood",
    pattern: /sad|depress|low mood|hopeless|motivat|empty|cry/i,
    text: "Thank you for putting that into words. You do not have to handle difficult feelings alone. A small, manageable activity or contacting someone you trust can be a starting point. If this is continuing or affecting your day, a professional conversation may help you explore it further.",
    suggestions: ["Find a professional", "A small next step"],
  },
  {
    topic: "study",
    pattern: /exam|stud|deadline|assignment|academic|stress/i,
    text: "University demands can pile up. Try choosing one manageable task, deciding when to pause, and identifying someone you can ask for practical help. You can also explore the WHO stress-management guide or talk with a counselor about the pressure.",
    suggestions: ["A small next step", "Find a professional"],
  },
  {
    topic: "prepare",
    pattern: /what should i discuss|prepare|tell.*counsel/i,
    text: "You could describe what has been difficult, when it started, how it affects studying or daily life, and what support you hope for. You can mention your questionnaire results, but sharing them is your choice. Ask about confidentiality and what happens after the first meeting.",
    suggestions: ["Find a professional", "Who can see my answers?"],
  },
  {
    topic: "step",
    pattern: /small.*step|what next|coping|help me|what else/i,
    text: "Choose one small action that feels possible: pause and notice what is around you, write down one concern, or contact someone you trust. You can leave the rest for later. Which topic would you like to explore: study pressure, worry, sleep or connection?",
    suggestions: ["Help with worry", "I feel lonely", "Study pressure"],
  },
];
export function guidedReply(
  text: string,
  previousTopic?: string,
): SupportReply {
  if (concerningDisclosure(text))
    return {
      topic: "safety",
      text: "If this describes how you feel now, please connect with a real person. If you might act on thoughts of harming yourself or cannot stay safe, contact local emergency services or go to the nearest emergency department now. Ask someone you trust to stay with you. This chat is not monitored and cannot arrange emergency help.",
      action: "safety",
      suggestions: ["Find a professional"],
    };
  const match = LIBRARY.find((item) => item.pattern.test(text));
  if (match)
    return {
      ...match,
      source: ["privacy", "professional", "prepare", "medication"].includes(
        match.topic,
      )
        ? undefined
        : {
            label:
              match.topic === "diagnosis"
                ? "PHQ / GAD-7 guidance"
                : "WHO stress-management guide",
            url:
              match.topic === "diagnosis"
                ? "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf"
                : STRESS_GUIDE,
          },
    };
  if (/^(yes|okay|ok|more|please)[.! ]*$/i.test(text) && previousTopic)
    return {
      topic: previousTopic,
      text: "Would you like to explore a small practical step, or find someone to talk to? You can also tell me which topic you want to focus on.",
      suggestions: ["A small next step", "Find a professional"],
    };
  return {
    topic: "unknown",
    text: "I may not understand everything in that message. My replies come from a limited support library, so I do not want to guess what you mean. You can choose a topic below, say what kind of help you want, or connect with a professional.",
    suggestions: [
      "Help with worry",
      "Study pressure",
      "I feel lonely",
      "Find a professional",
    ],
  };
}
