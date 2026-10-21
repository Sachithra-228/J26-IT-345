import type { Activity } from "./wellness-plan";

// Original support-planning prompts. No exposure exercises, diet plans, substance
// withdrawal instructions or trauma/event details. Professional review pending.
const source = {
  label: "NHS · support and self-help information",
  url: "https://selfhelp.cntw.nhs.uk/",
};
const make = (
  id: string,
  topic: Activity["topic"],
  title: string,
  description: string,
  steps: Activity["steps"],
): Activity => ({ id, topic, title, description, steps, source, minutes: 3 });
export const EXPANDED_ACTIVITIES: Activity[] = [
  make(
    "recovery-space",
    "stress",
    "Make room for recovery",
    "Review one demand and choose a small, realistic pause.",
    [
      {
        title: "Notice the demand",
        body: "Choose one responsibility that is taking more energy than you have available.",
        prompt: "Which demand would you like to review?",
      },
      {
        title: "Choose a little space",
        body: "Consider reducing a task, asking for help or protecting a short break.",
        prompt: "What adjustment might be possible?",
      },
      {
        title: "Make a request",
        body: "A small, specific request can be a starting point. Nothing is sent here.",
        prompt: "What could you ask for, or change yourself?",
      },
    ],
  ),
  make(
    "panic-support",
    "panic",
    "Prepare support for sudden fear",
    "Choose a trusted contact and a question for a professional.",
    [
      {
        title: "Choose support",
        body: "Think about someone you could contact when you want support. This activity does not establish that physical symptoms are caused by panic.",
        prompt: "Who would you feel comfortable contacting?",
      },
      {
        title: "Prepare a question",
        body: "A qualified professional can assess frightening episodes and possible explanations.",
        prompt: "What would you like to understand better?",
      },
      {
        title: "Choose your first contact",
        body: "You can seek health advice, browse professionals or ask someone trusted to help arrange support.",
        prompt: "What first step feels manageable?",
      },
    ],
  ),
  make(
    "boundary-words",
    "relationships",
    "Put a boundary into words",
    "Prepare a respectful request without pressure to send it.",
    [
      {
        title: "Notice a need",
        body: "Consider what you need, such as privacy, time or help. You do not need to identify another person.",
        prompt: "What need would you like to express?",
      },
      {
        title: "Choose your words",
        body: "Try a short request in your own words. You can change or discard it.",
        prompt: "How could you express that need respectfully?",
      },
      {
        title: "Keep your choice",
        body: "Decide whether to speak, prepare more or discuss it with a professional first. If a conversation would be unsafe, seek support rather than practising it now.",
        prompt: "What feels appropriate for your circumstances?",
      },
    ],
  ),
  make(
    "grief-gentle-step",
    "grief",
    "Choose a gentle step while grieving",
    "Make room for support without a timetable for how to feel.",
    [
      {
        title: "Notice today's needs",
        body: "You do not need to describe the loss. Consider what would make today a little more manageable.",
        prompt: "Would company, quiet or practical help feel useful?",
      },
      {
        title: "Lighten one demand",
        body: "Consider a smaller task, a flexible plan or help from someone you choose.",
        prompt: "Which demand could be made gentler?",
      },
      {
        title: "Choose support",
        body: "You can ask someone to listen, help with a task or support you in finding a professional.",
        prompt:
          "What would you like someone to know about the support you want?",
      },
    ],
  ),
  make(
    "balanced-self-talk",
    "self-esteem",
    "Try a more balanced perspective",
    "Notice self-criticism and make room for a kinder response.",
    [
      {
        title: "Notice the words",
        body: "Choose an everyday self-critical thought you feel comfortable considering. Skip this if it feels unhelpful.",
        prompt: "What do you tend to tell yourself after a small difficulty?",
      },
      {
        title: "Consider another perspective",
        body: "Think about what you might say to someone you care about in the same situation.",
        prompt: "What kinder, realistic response could you offer?",
      },
      {
        title: "Keep a balanced reminder",
        body: "Choose wording that feels believable, rather than forcing a positive statement.",
        prompt: "What reminder would you like to take forward?",
      },
    ],
  ),
  make(
    "frustration-pause",
    "anger",
    "Prepare a pause in frustration",
    "Choose words for taking space and returning to a conversation.",
    [
      {
        title: "Notice an early sign",
        body: "Consider a sign that frustration is building, without judging the feeling.",
        prompt: "What could help you notice frustration earlier?",
      },
      {
        title: "Prepare a pause",
        body: "If safe, a respectful pause can give you space before choosing what to say. You can seek help if you fear someone may be harmed.",
        prompt: "How might you explain that you need a pause?",
      },
      {
        title: "Choose support or a request",
        body: "Think about a need you want to communicate, or someone who can help you work through it.",
        prompt: "What would you like to express when ready?",
      },
    ],
  ),
  make(
    "eating-support-notes",
    "eating",
    "Prepare eating-support questions",
    "Plan a non-judgmental conversation with qualified support.",
    [
      {
        title: "Choose what to share",
        body: "Focus on how food or body-related distress affects your day. No measurements, diet details or body checking are needed.",
        prompt: "What impact would you want a professional to understand?",
      },
      {
        title: "Choose your preferences",
        body: "You can ask for privacy, a preferred language and an approach without appearance comments.",
        prompt: "What would make a conversation feel respectful?",
      },
      {
        title: "Prepare a care question",
        body: "A qualified health professional can assess the concern and discuss suitable care.",
        prompt: "What would you like to ask about getting appropriate support?",
      },
    ],
  ),
  make(
    "substance-support-notes",
    "substance-use",
    "Prepare a confidential advice request",
    "Choose a first step towards qualified substance-use support.",
    [
      {
        title: "Focus on the support need",
        body: "You do not need to list substances or amounts here. Consider the daily-life impact you want help with.",
        prompt: "What would you like support to make more manageable?",
      },
      {
        title: "Prepare a privacy question",
        body: "You can ask a service who sees your information and what support is available.",
        prompt: "What would you like to know before choosing a service?",
      },
      {
        title: "Choose qualified advice",
        body: "Discuss changes to substance use with a qualified health professional who understands your circumstances.",
        prompt: "Who could you approach, or ask to help arrange advice?",
      },
    ],
  ),
  make(
    "trauma-support-choice",
    "trauma",
    "Choose support at your own pace",
    "Plan support without retelling a distressing experience.",
    [
      {
        title: "Stay with present needs",
        body: "There is no need to revisit the event. You can focus on privacy, practical needs or the kind of company you want.",
        prompt: "What would help you feel supported today?",
      },
      {
        title: "Choose your boundaries",
        body: "A support conversation can begin with what you do not want to discuss and your right to pause.",
        prompt: "What boundary would you want a professional to respect?",
      },
      {
        title: "Choose a first contact",
        body: "Consider a qualified professional or a trusted person who can help you find support.",
        prompt: "What kind of first contact would feel comfortable?",
      },
    ],
  ),
  make(
    "practical-support-step",
    "practical",
    "Plan one practical support request",
    "Prepare a question about essential costs, housing or assistance.",
    [
      {
        title: "Name the practical need",
        body: "Keep the outline brief. Do not enter account numbers, addresses or documents here.",
        prompt: "Which practical need would you like help with?",
      },
      {
        title: "Find a suitable contact",
        body: "A university support team can explain available assistance and application requirements. Availability must be confirmed with the service.",
        prompt:
          "Which team or trusted person could help you find the right contact?",
      },
      {
        title: "Prepare one question",
        body: "Ask about options, eligibility or the next step without assuming a particular benefit is available.",
        prompt: "What would you ask first?",
      },
    ],
  ),
];
