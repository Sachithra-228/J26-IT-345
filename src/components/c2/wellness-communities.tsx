"use client";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { CONCERNS, type Assessment, type Concern } from "@/lib/c2/assessment";
import {
  SAMPLE_COMMUNITIES,
  matchCommunities,
  validateCommunityCatalog,
} from "@/lib/c2/communities";
import { panel, secondaryText } from "./wellness-ui";

const languageName = { en: "English", si: "Sinhala", ta: "Tamil" };
export function WellnessCommunities({
  assessment,
  compact = false,
  initialSelectedId,
  onBrowse,
  onSupport,
}: {
  assessment: Assessment | null;
  compact?: boolean;
  initialSelectedId?: string;
  onBrowse?: (id?: string) => void;
  onSupport?: () => void;
}) {
  const [communities, setCommunities] = useState(SAMPLE_COMMUNITIES);
  const [catalogState, setCatalogState] = useState<
    "loading" | "database" | "bundled"
  >("loading");
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<"recommended" | "all" | Concern>(
    assessment ? "recommended" : "all",
  );
  const [language, setLanguage] = useState("any");
  const [opened, setOpened] = useState(initialSelectedId);
  useEffect(() => {
    let active = true;
    setCatalogState("loading");
    (async () => {
      try {
        const response = await fetch("/api/c2/research-communities", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Catalog unavailable");
        const catalog = validateCommunityCatalog(await response.json());
        if (active) {
          setCommunities(catalog.communities);
          setCatalogState("database");
        }
      } catch {
        if (active) {
          setCommunities(SAMPLE_COMMUNITIES);
          setCatalogState("bundled");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [retry]);
  const ranked = matchCommunities(communities, assessment);
  const visible = ranked.filter(
    (item) =>
      (compact || filter === "recommended"
        ? item.score > 0
        : filter === "all" || item.community.topics.includes(filter)) &&
      (compact ||
        language === "any" ||
        item.community.languages.some((value) => value === language)),
  );
  const cards = compact ? visible.slice(0, 3) : visible;
  const selected = !compact
    ? communities.find((item) => item._id === opened)
    : undefined;
  return (
    <section
      className={`${panel} space-y-4`}
      aria-label={
        compact
          ? "Community suggestions from your check-in"
          : "Community circles"
      }
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
        <Users className="h-4 w-4" aria-hidden="true" />
        Shared experiences, your choice
      </div>
      <h3 className="text-xl font-semibold">
        {compact ? "Communities to explore" : "Find a community circle"}
      </h3>
      <p className={secondaryText}>
        {assessment
          ? "Your confirmed topics and follow-up answers help order these circles. Explore one that feels relevant, or browse something different."
          : "Browse discussion themes at your own pace. Complete a check-in if you want personalised suggestions."}
      </p>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Sample circles with authored conversation starters, without real members
        or live discussions. Exploring keeps your check-in private and does not
        join a group. These circles are not professionally moderated or a crisis
        service.
      </p>
      {catalogState === "bundled" ? (
        <p role="status" className="text-xs text-slate-600 dark:text-slate-300">
          The database catalog is unavailable; showing the bundled sample
          circles.{" "}
          <button
            className="font-medium text-blue-700 underline dark:text-blue-300"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry community catalog
          </button>
        </p>
      ) : null}
      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            Browse circles
            <select
              aria-label="Community topic filter"
              className="block w-full rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-950"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as typeof filter);
                setOpened(undefined);
              }}
            >
              <option value="recommended">Recommended for me</option>
              <option value="all">All sample circles</option>
              {(Object.keys(CONCERNS) as Concern[]).map((topic) => (
                <option key={topic} value={topic}>
                  {CONCERNS[topic].label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            Discussion language
            <select
              aria-label="Community language"
              className="block w-full rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-950"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value);
                setOpened(undefined);
              }}
            >
              <option value="any">Any language</option>
              {Object.entries(languageName).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {!cards.length ? (
        <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <p>
            No circles match these topics and filters. You can browse all sample
            circles or choose professional support.
          </p>
          {compact && onBrowse ? (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => onBrowse()}
            >
              Browse community circles
            </Button>
          ) : !compact ? (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => {
                setFilter("all");
                setLanguage("any");
              }}
            >
              Show all sample circles
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p
            role="status"
            className="text-sm text-slate-600 dark:text-slate-300"
          >
            {compact
              ? `${cards.length} suggestions from your check-in`
              : `${cards.length} circles shown`}
          </p>
          <div
            className={`grid gap-4 ${compact && cards.length === 1 ? "" : compact && cards.length > 2 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {cards.map(({ community, score, modelInformed, reasons }) => (
              <article
                key={community._id}
                aria-label={community.name}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Sample circle
                  </span>
                  {score > 0 && score === visible[0]?.score ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      Top topic match
                    </span>
                  ) : null}
                </div>
                <h4 className="mt-3 text-lg font-semibold">{community.name}</h4>
                <p className={`mt-2 ${secondaryText}`}>{community.tagline}</p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Languages:{" "}
                  {community.languages
                    .map((value) => languageName[value])
                    .join(", ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {community.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                    >
                      {CONCERNS[topic].label}
                    </span>
                  ))}
                </div>
                {reasons.length ? (
                  <div className="my-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                    <p className="font-semibold">
                      {modelInformed
                        ? "DistilBERT-informed topic match"
                        : "Based on your choices"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {reasons.slice(0, 4).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="my-4 text-xs text-slate-500">
                    Browse this theme if it feels useful; no topic overlap with
                    your current check-in is recorded.
                  </p>
                )}
                <Button
                  className="mt-auto"
                  variant={opened === community._id ? "primary" : "secondary"}
                  aria-expanded={compact ? undefined : opened === community._id}
                  onClick={() => {
                    if (compact && onBrowse) onBrowse(community._id);
                    else
                      setOpened(
                        opened === community._id ? undefined : community._id,
                      );
                  }}
                >
                  {opened === community._id
                    ? "Circle preview open"
                    : "Explore circle"}
                  <ArrowRight
                    className="ml-2 inline h-4 w-4"
                    aria-hidden="true"
                  />
                </Button>
              </article>
            ))}
          </div>
          {compact && onBrowse ? (
            <Button variant="secondary" onClick={() => onBrowse()}>
              Browse all community circles
            </Button>
          ) : null}
        </>
      )}
      {selected ? (
        <section
          className="space-y-3 rounded-2xl border border-blue-200 p-5 dark:border-blue-900"
          aria-label={`${selected.name} preview`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold">Inside {selected.name}</h4>
            <Button variant="ghost" onClick={() => setOpened(undefined)}>
              Close circle preview
            </Button>
          </div>
          <p className={secondaryText}>{selected.description}</p>
          <p className="text-xs text-slate-500">
            Authored conversation starters · no real posts or replies
          </p>
          {selected.conversationStarters.map((starter) => (
            <div
              key={starter.title}
              className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
            >
              <h5 className="flex items-center gap-2 font-medium">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {starter.title}
              </h5>
              <p className={`mt-2 ${secondaryText}`}>{starter.prompt}</p>
            </div>
          ))}
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            This preview does not accept posts, messages or membership requests.
            The separate student forum is where members can explicitly choose to
            publish.
          </p>
        </section>
      ) : null}
      {onSupport ? (
        <Button variant="secondary" onClick={onSupport}>
          Find professional support
        </Button>
      ) : null}
    </section>
  );
}
