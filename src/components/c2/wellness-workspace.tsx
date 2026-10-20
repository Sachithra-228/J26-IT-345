"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Heart,
  Info,
  Leaf,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useLanguage } from "@/context/language-context";
import { CounselorBooking } from "@/components/wellness/counselor-booking";
import { PeerSupport } from "@/components/wellness/peer-support";
import {
  assessmentConcerns,
  CONCERNS,
  QUESTIONNAIRE_SOURCE,
  scoreScale,
  type Assessment,
  type Concern,
} from "@/lib/c2/assessment";
import { STRESS_GUIDE } from "@/lib/c2/assistant";
import { confirmedTopicWeights } from "@/lib/c2/concern-routing";
import status from "@/lib/c2/model/text-status.json";
import { WellnessAssessment } from "./wellness-assessment";
import { WellnessChat } from "./wellness-chat";
import { WellnessReflections } from "./wellness-reflections";
import { panel, SafetySupport, secondaryText } from "./wellness-ui";
import { WellnessPlan } from "./wellness-plan";
import { WellnessProgress } from "./wellness-progress";
import { AppointmentSummary } from "./appointment-summary";
import type { ActivityCompletion } from "@/lib/c2/wellness-plan";

type View =
  | "home"
  | "assessment"
  | "reflections"
  | "support"
  | "chat"
  | "plan"
  | "progress"
  | "appointment"
  | "about";
const TABS = [
  { id: "home", name: "Overview", icon: Leaf },
  { id: "assessment", name: "My check-in", icon: Heart },
  { id: "plan", name: "My plan", icon: ClipboardList },
  { id: "progress", name: "Progress", icon: TrendingUp },
  { id: "reflections", name: "Reflections", icon: BookOpen },
  { id: "support", name: "Find support", icon: Users },
  { id: "chat", name: "Support chat", icon: MessageCircle },
  { id: "about", name: "About & privacy", icon: Info },
] as const;

export function WellnessWorkspace() {
  const { language } = useLanguage();
  const [view, setView] = useState<View>("home");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [session, setSession] = useState(0);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const content = useRef<HTMLDivElement>(null);
  const navigationRequested = useRef(false);
  useEffect(() => {
    if (!navigationRequested.current) return;
    navigationRequested.current = false;
    content.current?.focus({ preventScroll: true });
    content.current?.scrollIntoView?.({ block: "start" });
  }, [view]);
  const [notice, setNotice] = useState("");
  const [immediateHelp, setImmediateHelp] = useState(false);
  const [service, setService] = useState<"professionals" | "community">(
    "professionals",
  );
  const [communityTopic, setCommunityTopic] = useState<Concern | "all">("all");
  const topics = assessmentConcerns(assessment);
  const topicWeights = assessment?.concernAnalysis
    ? confirmedTopicWeights(assessment.concernAnalysis)
    : assessment?.supportModel?.status === "ready"
      ? Object.fromEntries(
          assessment.supportModel.topics.map((item) => [
            item.topic,
            item.score,
          ]),
        )
      : undefined;
  function go(next: View) {
    navigationRequested.current = true;
    setView(next);
    setNotice("");
  }
  function support() {
    setService("professionals");
    go("support");
  }
  function clear() {
    navigationRequested.current = true;
    setSession((previous) => previous + 1);
    setAssessment(null);
    setCompletions([]);
    setView("home");
    setImmediateHelp(false);
    setCommunityTopic("all");
    setService("professionals");
    setNotice(
      "Your check-in, activity drafts, appointment notes, reflections and chat have been cleared from this session. Saved device history and downloaded files remain until you delete them separately.",
    );
  }
  return (
    <section
      aria-label="Wellness workspace"
      className="space-y-6 text-slate-900 dark:text-slate-100"
    >
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 h-64 w-64 rounded-full border-[30px] border-white/10"
        />
        <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
          <Leaf aria-hidden="true" className="h-4 w-4" />
          UniCare wellness
        </p>
        <h2 className="relative mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Your wellbeing, your next step.
        </h2>
        <p className="relative mt-3 max-w-xl text-sm leading-6 text-blue-50">
          Understand your check-in, put things into words, and find the support
          that feels right for you.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-blue-50">
          <span className="flex items-center gap-1.5">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            Private by default · saving is your choice
          </span>
          <span>PHQ-9 & GAD-7 screening</span>
          <span>You choose what comes next</span>
        </div>
      </header>
      <nav
        aria-label="Wellness workspace views"
        className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        {TABS.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={
              view === id || (view === "appointment" && id === "plan")
                ? "page"
                : undefined
            }
            onClick={() => go(id)}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 ${view === id || (view === "appointment" && id === "plan") ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {name}
          </button>
        ))}
      </nav>
      {notice ? (
        <p role="status" className="text-sm text-blue-700 dark:text-blue-300">
          {notice}
        </p>
      ) : null}
      {language !== "en" ? (
        <p role="note" className={secondaryText}>
          The wellness questionnaires, follow-up questions and text analysis are
          currently available in English. Sinhala and Tamil clinical versions
          have not been validated here.
        </p>
      ) : null}
      {immediateHelp ? <SafetySupport /> : null}
      <div
        ref={content}
        tabIndex={-1}
        aria-label="Current wellness view"
        className="scroll-mt-28 outline-none"
      >
        {view === "home" ? (
          <div className="space-y-5">
            <section
              aria-label="Your wellness overview"
              className="grid gap-3 sm:grid-cols-3"
            >
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Your check-in
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {assessment ? "Summary ready" : "Ready when you are"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {assessment
                    ? "Review your answers and explore your next step."
                    : "A private space to understand how you’ve been feeling."}
                </p>
              </div>
              {(["phq9", "gad7"] as const).map((kind) => {
                const value = assessment
                  ? scoreScale(kind, assessment[kind])
                  : null;
                return (
                  <div
                    key={kind}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {kind === "phq9"
                        ? "Mood check-in · PHQ-9"
                        : "Worry check-in · GAD-7"}
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {value
                        ? value.band
                          ? `${value.band} symptom range`
                          : "Incomplete questionnaire"
                        : "Awaiting your check-in"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {value
                        ? value.total === null
                          ? `${value.answered} answers recorded · review missing items`
                          : `${value.total} / ${value.maximum} · based on the last two weeks`
                        : "Your summary will appear here after you finish."}
                    </p>
                  </div>
                );
              })}
            </section>
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <section className={`${panel} flex flex-col justify-between`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                    {assessment ? "Your next step" : "Start where you are"}
                  </p>
                  <h3 className="mt-4 max-w-md text-2xl font-semibold tracking-tight">
                    {assessment
                      ? "Make space for the support you need."
                      : "How have things been feeling lately?"}
                  </h3>
                  <p className={`mt-3 max-w-xl ${secondaryText}`}>
                    {assessment
                      ? "Your check-in is ready. Revisit your summary, explore professionals who match your preferences, or find a conversation with other students."
                      : "A guided check-in can help you describe the last two weeks. Answer at your pace, add the context that matters, and explore a clear summary."}
                  </p>
                  {assessment && topics.length ? (
                    <div
                      className="mt-4 flex flex-wrap gap-2"
                      aria-label="Your support topics"
                    >
                      {topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                        >
                          {CONCERNS[topic].label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  {assessment ? (
                    <Button onClick={() => go("plan")}>
                      Open my wellness plan
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-2 inline h-4 w-4"
                      />
                    </Button>
                  ) : null}
                  <Button onClick={() => go("assessment")}>
                    {assessment ? "Return to my check-in" : "Start my check-in"}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-2 inline h-4 w-4"
                    />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => (assessment ? support() : go("chat"))}
                  >
                    {assessment
                      ? "Explore my support options"
                      : "Talk it through"}
                  </Button>
                </div>
              </section>
              <section className={panel}>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                  A moment of clarity
                </p>
                <ol className="mt-5 space-y-5">
                  {[
                    ["01", "Check in", "Answer PHQ-9 and GAD-7 questions."],
                    [
                      "02",
                      "Add your context",
                      "Explore follow-ups relevant to your answers.",
                    ],
                    [
                      "03",
                      "Choose support",
                      "Find resources, people and your next step.",
                    ],
                  ].map(([n, title, body]) => (
                    <li key={n} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        {n}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold">{title}</h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Put it into words",
                  text: "Keep a reflection for this session, with optional text analysis.",
                  icon: BookOpen,
                  action: () => go("reflections"),
                  label: "Write a reflection",
                },
                {
                  title: "Find your people",
                  text: "Browse student discussions around experiences that matter to you.",
                  icon: Users,
                  action: () => {
                    setService("community");
                    go("support");
                  },
                  label: "Explore community",
                },
                {
                  title: "A human conversation",
                  text: "Choose a professional using your own preferences.",
                  icon: MessageCircle,
                  action: support,
                  label: "Find a professional",
                },
              ].map(({ title, text, icon: Icon, action, label }) => (
                <section key={title} className={panel}>
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5 text-blue-600 dark:text-blue-300"
                  />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className={`mt-2 ${secondaryText}`}>{text}</p>
                  <button
                    onClick={action}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline focus-visible:ring-2 dark:text-blue-300"
                  >
                    {label}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </section>
              ))}
            </div>
          </div>
        ) : null}
        {/* Preserve local drafts while the student explores another view. */}
        <div key={`assessment-${session}`} hidden={view !== "assessment"}>
          <WellnessAssessment
            onComplete={setAssessment}
            onEdit={() => setAssessment(null)}
            onSupport={support}
            onChat={() => go("chat")}
            onPlan={() => go("plan")}
          />
        </div>
        <div key={`reflections-${session}`} hidden={view !== "reflections"}>
          <WellnessReflections />
        </div>
        <div key={`chat-${session}`} hidden={view !== "chat"}>
          <WellnessChat onSupport={support} onPlan={() => go("plan")} />
        </div>
        <div
          key={`plan-${session}-${assessment?.completedAt ?? "no-checkin"}`}
          hidden={view !== "plan"}
        >
          <WellnessPlan
            assessment={assessment}
            completions={completions}
            onComplete={(entry) =>
              setCompletions((previous) => [...previous, entry])
            }
            onSupport={support}
            onCommunity={() => {
              setService("community");
              go("support");
            }}
            onProgress={() => go("progress")}
            onSummary={() => go("appointment")}
          />
        </div>
        <div key={`progress-${session}`} hidden={view !== "progress"}>
          <WellnessProgress assessment={assessment} completions={completions} />
        </div>
        <div
          key={`appointment-${session}-${assessment?.completedAt ?? "no-checkin"}`}
          hidden={view !== "appointment"}
        >
          <AppointmentSummary assessment={assessment} onSupport={support} />
        </div>
        {view === "support" ? (
          <div className="space-y-5">
            <section className={panel}>
              <h3 className="text-2xl font-semibold">
                Support, on your terms.
              </h3>
              <p className={`mt-3 ${secondaryText}`}>
                Explore professionals or student discussions. Your assessment,
                reflection and chat are never attached automatically. You can
                access support with or without completing a check-in.
              </p>
              {topics.length ? (
                <div
                  className="mt-4 flex flex-wrap gap-2"
                  aria-label="Topics from your answers"
                >
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                    >
                      {CONCERNS[topic].label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => go("appointment")}>
                  Prepare my appointment
                </Button>
                <Button
                  variant={
                    service === "professionals" ? "primary" : "secondary"
                  }
                  onClick={() => setService("professionals")}
                >
                  Professionals
                </Button>
                <Button
                  variant={service === "community" ? "primary" : "secondary"}
                  onClick={() => setService("community")}
                >
                  Community
                </Button>
              </div>
            </section>
            {service === "professionals" ? (
              <>
                {topicWeights ? (
                  <p className={secondaryText}>
                    Suggestions reflect your check-in topics. Use the filters to
                    find the expertise, language and session style that suit
                    you.
                  </p>
                ) : null}
                <CounselorBooking
                  topics={topics}
                  topicWeights={topicWeights}
                  initialCatalog={
                    assessment?.concernAnalysis ? "research" : "university"
                  }
                />
              </>
            ) : (
              <>
                <section className={panel}>
                  <h4 className="font-semibold">Find a conversation topic</h4>
                  <p className={`mt-2 ${secondaryText}`}>
                    Explore student conversations by topic. Your check-in helps
                    suggest where to start; you choose what to browse or share.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      aria-pressed={communityTopic === "all"}
                      onClick={() => setCommunityTopic("all")}
                      className={`rounded-full border px-3 py-2 text-sm ${communityTopic === "all" ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "border-slate-200 dark:border-slate-700"}`}
                    >
                      All conversations
                    </button>
                    {(Object.keys(CONCERNS) as Concern[]).map((topic) => (
                      <button
                        key={topic}
                        aria-pressed={communityTopic === topic}
                        onClick={() => setCommunityTopic(topic)}
                        className={`rounded-full border px-3 py-2 text-sm ${communityTopic === topic ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "border-slate-200 dark:border-slate-700"}`}
                      >
                        {CONCERNS[topic].label}
                        {topics.includes(topic) ? " · suggested" : ""}
                      </button>
                    ))}
                  </div>
                </section>
                <PeerSupport topic={communityTopic} />
              </>
            )}
          </div>
        ) : null}
        {view === "about" ? (
          <section className={`${panel} space-y-5`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                Understand your choices
              </p>
              <h3 className="mt-3 text-2xl font-semibold">
                Clear information. Your control.
              </h3>
            </div>
            <div>
              <h4 className="font-semibold">Your privacy</h4>
              <p className={`mt-2 ${secondaryText}`}>
                Individual check-in answers, reflections, activity writing,
                appointment drafts and support-chat messages stay in temporary
                page memory. They are not saved to your account, used for
                training or sent to staff or an AI provider. Refreshing or
                leaving clears those drafts. Progress lets you explicitly save
                selected mood ratings, screening summaries and activity
                completions in this browser profile. Those saved entries remain
                after refresh or sign-out, can be opened by anyone using this
                browser profile, and can be deleted in Progress. Clearing your
                session does not delete saved history or downloaded appointment
                files. A booking request and a forum post use separate account
                services; review the information you choose to submit there.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Screening and follow-ups</h4>
              <p className={`mt-2 ${secondaryText}`}>
                PHQ-9 and GAD-7 scores are calculated separately from complete
                answers using standard scoring. Missing items produce an
                incomplete result. Five to nine additional questions are
                selected from a 100-question context bank and never alter the
                scores. Optional DistilBERT text analysis suggests concern
                topics; you confirm them before they guide follow-up questions
                and support matching. Those additional questions and support
                suggestions still require professional review.
              </p>
              <a
                href={QUESTIONNAIRE_SOURCE}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-blue-700 underline dark:text-blue-300"
              >
                Questionnaire instructions and attribution
              </a>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Developed by Robert L. Spitzer, Janet B. W. Williams, Kurt
                Kroenke and colleagues, with an educational grant from Pfizer
                Inc. No permission is required to reproduce, translate, display
                or distribute these measures.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">The reflection model</h4>
              <p className={`mt-2 ${secondaryText}`}>
                Optional English text analysis uses TF-IDF and logistic
                regression trained on{" "}
                {status.trainingExamples.toLocaleString("en")} public GoEmotions
                comments. Held-out emotion-label micro-F1:{" "}
                {status.microF1.toFixed(3)}; macro-F1:{" "}
                {status.macroF1.toFixed(3)}. This is not mental-health or
                referral accuracy. No local student clinical validation is
                claimed. Other languages are not evaluated.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">
                The main DistilBERT concern model
              </h4>
              <p className={`mt-2 ${secondaryText}`}>
                DistilBERT is fine-tuned on synthetic English student narratives
                for five concern topics: low mood, worry, sleep, study and
                connection. You can correct all suggested topics. The model
                guides topic ordering; answer-driven rules choose five to nine
                questions from the 100-question bank, explain questionnaire
                ranges and match profile attributes. It does not diagnose
                conditions or predict which professional will produce better
                outcomes. Research & ML shows its own training results and the
                separate earlier experiments.
              </p>
              <p className={`mt-2 ${secondaryText}`}>
                These custom follow-up questions are stored in the website
                database and await professional review. They are support
                context, not a validated diagnostic instrument. Questionnaire
                scores are calculated separately using standard PHQ-9 and GAD-7
                scoring.
              </p>
              <Link
                href="/wellness/research"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline dark:text-blue-300"
              >
                <FlaskConical aria-hidden="true" className="h-4 w-4" />
                Research & ML
              </Link>
            </div>
            <div>
              <h4 className="font-semibold">Support chat and matching</h4>
              <p className={`mt-2 ${secondaryText}`}>
                Chat replies are selected from a limited response library; no
                generative chat service is connected. Professional suggestions
                use recorded topics and your preferences, with reasons shown.
                Missing directory details are not inferred from a name. No
                automated clinical referral model or camera assessment is
                active.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Your plan and guided activities</h4>
              <p className={`mt-2 ${secondaryText}`}>
                Your confirmed topics and reported context select from prepared
                planning activities. Suggestions use explicit application rules;
                they are not a trained treatment-outcome recommender. The
                original prompts link to NHS and WHO guidance and await
                professional review. Activity ratings describe a moment, not
                clinical change. Device history and appointment downloads
                include only what you choose to save or select.
              </p>
            </div>
            <a
              href={STRESS_GUIDE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline dark:text-blue-300"
            >
              Explore the WHO stress-management guide
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
        ) : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <p className="flex max-w-xl items-start gap-2 leading-5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Screening and guided support. A qualified professional can assess a
          diagnosis. This service is not monitored.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setImmediateHelp((previous) => !previous)}
            aria-expanded={immediateHelp}
            className="font-medium text-amber-800 underline dark:text-amber-200"
          >
            I need immediate help
          </button>
          <button onClick={clear} className="underline">
            Clear my session
          </button>
        </div>
      </footer>
    </section>
  );
}
