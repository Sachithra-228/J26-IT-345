"use client";

import { CalendarCheck2, GraduationCap, HandCoins, HeartPulse } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";

const H_MIN = 32;
const H_MAX = 72;
const V_MIN = 28;
const V_MAX = 72;
const STEP = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function SupportWorkspacePanels() {
  const { language } = useLanguage();
  const text = getUiTranslations(language).supportPanels;

  const sectionRef = useRef<HTMLElement | null>(null);
  const horizontalRef = useRef<HTMLDivElement | null>(null);
  const verticalRef = useRef<HTMLDivElement | null>(null);
  const horizontalDragRef = useRef<{ pointerId: number | null; startX: number; startSize: number }>({
    pointerId: null,
    startX: 0,
    startSize: 56,
  });
  const verticalDragRef = useRef<{ pointerId: number | null; startY: number; startSize: number }>({
    pointerId: null,
    startY: 0,
    startSize: 44,
  });

  const [leftSize, setLeftSize] = useState(56);
  const [topSize, setTopSize] = useState(44);
  const [headingVisible, setHeadingVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeadingVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const startHorizontalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    horizontalDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startSize: leftSize,
    };
  };

  const moveHorizontalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (horizontalDragRef.current.pointerId !== event.pointerId || !horizontalRef.current) return;
    const delta = event.clientX - horizontalDragRef.current.startX;
    const next = horizontalDragRef.current.startSize + (delta / horizontalRef.current.clientWidth) * 100;
    setLeftSize(clamp(next, H_MIN, H_MAX));
  };

  const endHorizontalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (horizontalDragRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    horizontalDragRef.current.pointerId = null;
  };

  const startVerticalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    verticalDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startSize: topSize,
    };
  };

  const moveVerticalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (verticalDragRef.current.pointerId !== event.pointerId || !verticalRef.current) return;
    const delta = event.clientY - verticalDragRef.current.startY;
    const next = verticalDragRef.current.startSize + (delta / verticalRef.current.clientHeight) * 100;
    setTopSize(clamp(next, V_MIN, V_MAX));
  };

  const endVerticalDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (verticalDragRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    verticalDragRef.current.pointerId = null;
  };

  const onHorizontalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setLeftSize((value) => clamp(value - STEP, H_MIN, H_MAX));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setLeftSize((value) => clamp(value + STEP, H_MIN, H_MAX));
    } else if (event.key === "Home") {
      event.preventDefault();
      setLeftSize(H_MIN);
    } else if (event.key === "End") {
      event.preventDefault();
      setLeftSize(H_MAX);
    }
  };

  const onVerticalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setTopSize((value) => clamp(value - STEP, V_MIN, V_MAX));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setTopSize((value) => clamp(value + STEP, V_MIN, V_MAX));
    } else if (event.key === "Home") {
      event.preventDefault();
      setTopSize(V_MIN);
    } else if (event.key === "End") {
      event.preventDefault();
      setTopSize(V_MAX);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden border-b border-white/10 bg-black py-20 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px] opacity-50" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
        <div
          className={`mx-auto w-full text-center transition-all duration-700 ${
            headingVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h3 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            {text.heading}
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-400 md:text-lg">
            {text.description}
          </p>
        </div>

        <div
          ref={horizontalRef}
          className="mt-10 hidden h-[460px] rounded-3xl border border-white/15 bg-neutral-950 p-3 shadow-2xl md:flex"
        >
          <section
            id="student-overview-panel"
            aria-label={text.studentOverviewAria}
            className="h-full overflow-hidden rounded-2xl border border-white/15 bg-black p-5 text-white"
            style={{ width: `${leftSize}%` }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              {text.snapshotTitle}
            </p>
            <h4 className="mt-2 text-xl font-bold text-white">{text.snapshotSubtitle}</h4>
            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <div className="flex items-center gap-3">
                  <HandCoins className="h-4 w-4 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-200">{text.financialPending}</p>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">12</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-200">{text.careerMatches}</p>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">38</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <div className="flex items-center gap-3">
                  <HeartPulse className="h-4 w-4 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-200">{text.wellnessCheckins}</p>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">27</p>
              </div>
            </div>
          </section>

          <div
            role="separator"
            aria-label={text.resizeHorizontalAria}
            aria-controls="student-overview-panel support-operations-panel"
            aria-orientation="vertical"
            aria-valuemin={H_MIN}
            aria-valuemax={H_MAX}
            aria-valuenow={Math.round(leftSize)}
            tabIndex={0}
            className="mx-2 flex w-3 cursor-col-resize items-center justify-center rounded-full bg-transparent outline-none ring-white/40 transition-colors hover:bg-white/10 focus-visible:ring-2"
            onPointerDown={startHorizontalDrag}
            onPointerMove={moveHorizontalDrag}
            onPointerUp={endHorizontalDrag}
            onPointerCancel={endHorizontalDrag}
            onKeyDown={onHorizontalKeyDown}
          >
            <div className="h-16 w-1.5 rounded-full bg-neutral-600" />
          </div>

          <section
            id="support-operations-panel"
            ref={verticalRef}
            aria-label={text.supportOperationsAria}
            className="flex h-full overflow-hidden rounded-2xl border border-white/15 bg-black"
            style={{ width: `${100 - leftSize}%` }}
          >
            <div className="flex w-full flex-col p-3">
              <div
                id="priority-queue-panel"
                className="overflow-hidden rounded-xl border border-white/15 bg-neutral-950 p-5"
                style={{ height: `${topSize}%` }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  {text.priorityQueueTitle}
                </p>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-100">
                    {text.priority1}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-100">
                    {text.priority2}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-100">
                    {text.priority3}
                  </div>
                </div>
              </div>

              <div
                role="separator"
                aria-label={text.resizeVerticalAria}
                aria-controls="priority-queue-panel action-planner-panel"
                aria-orientation="horizontal"
                aria-valuemin={V_MIN}
                aria-valuemax={V_MAX}
                aria-valuenow={Math.round(topSize)}
                tabIndex={0}
                className="my-2 flex h-3 cursor-row-resize items-center justify-center rounded-full bg-transparent outline-none ring-white/40 transition-colors hover:bg-white/10 focus-visible:ring-2"
                onPointerDown={startVerticalDrag}
                onPointerMove={moveVerticalDrag}
                onPointerUp={endVerticalDrag}
                onPointerCancel={endVerticalDrag}
                onKeyDown={onVerticalKeyDown}
              >
                <div className="h-1.5 w-16 rounded-full bg-neutral-600" />
              </div>

              <div
                id="action-planner-panel"
                className="overflow-hidden rounded-xl border border-white/15 bg-neutral-950 p-5"
                style={{ height: `${100 - topSize}%` }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  {text.actionPlannerTitle}
                </p>
                <div className="mt-3 space-y-2.5 text-sm text-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck2 className="h-4 w-4 text-neutral-400" />
                    {text.action1}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck2 className="h-4 w-4 text-neutral-400" />
                    {text.action2}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck2 className="h-4 w-4 text-neutral-400" />
                    {text.action3}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-3 md:hidden">
          <div className="rounded-xl border border-white/15 bg-neutral-950 p-4 text-white">
            <p className="text-sm font-semibold">{text.mobileStudentTitle}</p>
            <p className="mt-1 text-sm text-neutral-400">{text.mobileStudentBody}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-neutral-950 p-4 text-white">
            <p className="text-sm font-semibold">{text.mobilePriorityTitle}</p>
            <p className="mt-1 text-sm text-neutral-400">{text.mobilePriorityBody}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-neutral-950 p-4 text-white">
            <p className="text-sm font-semibold">{text.mobileActionTitle}</p>
            <p className="mt-1 text-sm text-neutral-400">{text.mobileActionBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
