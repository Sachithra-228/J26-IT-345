"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";

const clampIndex = (value: number, count: number) => Math.min(count - 1, Math.max(0, value));

export function FaqMiniAccordion() {
  const { language } = useLanguage();
  const text = getUiTranslations(language).faq;
  const faqs = text.items;

  const sectionRef = useRef<HTMLElement | null>(null);
  const cooldownRef = useRef(0);

  const [inView, setInView] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionKey, setMotionKey] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const navigateBy = useCallback((delta: 1 | -1) => {
    setActiveIndex((prev) => {
      const next = clampIndex(prev + delta, faqs.length);
      if (next !== prev) {
        setDirection(delta);
        setMotionKey((key) => key + 1);
      }
      return next;
    });
  }, [faqs.length]);

  const navigateTo = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const next = clampIndex(index, faqs.length);
      if (next !== prev) {
        setDirection(next > prev ? 1 : -1);
        setMotionKey((key) => key + 1);
      }
      return next;
    });
  }, [faqs.length]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktopMode(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(desktopMode && entry.isIntersecting);
      },
      { threshold: desktopMode ? 0.7 : 0.2 }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [desktopMode]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (!desktopMode || !inView) return;

      const delta = event.deltaY;
      if (Math.abs(delta) < 8) return;

      const movingDown = delta > 0;
      const atFirst = activeIndex === 0;
      const atLast = activeIndex === faqs.length - 1;
      const canMove = movingDown ? !atLast : !atFirst;
      if (!canMove) return;

      const now = Date.now();
      if (now - cooldownRef.current < 520) return;
      cooldownRef.current = now;

      navigateBy(movingDown ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!desktopMode || !inView) return;

      if (event.key === "ArrowDown" && activeIndex < faqs.length - 1) {
        event.preventDefault();
        navigateBy(1);
      } else if (event.key === "ArrowUp" && activeIndex > 0) {
        event.preventDefault();
        navigateBy(-1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, desktopMode, faqs.length, inView, navigateBy]);

  const activeFaq = faqs[activeIndex];

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-black py-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px] opacity-35" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
        <div className="hidden gap-8 md:grid md:grid-cols-[0.95fr_1.05fr]">
          <aside
            className="min-h-[320px] py-8"
          >
            <div key={`faq-left-${motionKey}`} className={direction === 1 ? "faq-left-up" : "faq-left-down"}>
              <h4 className="text-[2.3rem] font-semibold leading-tight text-white">{activeFaq.question}</h4>
            </div>
          </aside>

          <article
            className="min-h-[320px] py-8"
          >
            <div
              key={`faq-right-${motionKey}`}
              className={direction === 1 ? "faq-right-down" : "faq-right-up"}
              aria-live="polite"
            >
              <p className="text-xl leading-9 text-slate-100">{activeFaq.answer}</p>

              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigateBy(-1)}
                  className="rounded-full border border-white/25 p-2 text-slate-100 transition-colors hover:bg-white/10"
                  aria-label={text.previousQuestion}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2">
                  {faqs.map((_, index) => (
                    <button
                      key={`faq-dot-${index}`}
                      type="button"
                      onClick={() => navigateTo(index)}
                      aria-label={`${text.goToQuestion} ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        index === activeIndex ? "w-8 bg-blue-300" : "w-2.5 bg-white/40"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigateBy(1)}
                  className="rounded-full border border-white/25 p-2 text-slate-100 transition-colors hover:bg-white/10"
                  aria-label={text.nextQuestion}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </div>

        <div className="mx-auto mt-8 max-w-4xl md:hidden">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question} className="border-b border-white/20">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-mobile-${index}`}
                  onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-lg font-medium text-white">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  id={`faq-panel-mobile-${index}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-2 text-sm leading-7 text-slate-300">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
