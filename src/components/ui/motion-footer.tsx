"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: 'Plus Jakarta Sans', var(--font-inter), sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #000000;
  color: #f8fafc;

  --pill-bg-1: rgba(255, 255, 255, 0.05);
  --pill-bg-2: rgba(255, 255, 255, 0.02);
  --pill-shadow: rgba(0, 0, 0, 0.8);
  --pill-highlight: rgba(255, 255, 255, 0.14);
  --pill-inset-shadow: rgba(0, 0, 0, 0.9);
  --pill-border: rgba(255, 255, 255, 0.14);

  --pill-bg-1-hover: rgba(255, 255, 255, 0.12);
  --pill-bg-2-hover: rgba(255, 255, 255, 0.04);
  --pill-border-hover: rgba(255, 255, 255, 0.32);
  --pill-shadow-hover: rgba(255, 255, 255, 0.08);
  --pill-highlight-hover: rgba(255, 255, 255, 0.28);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.75; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    rgba(255, 255, 255, 0.06) 0%, 
    rgba(59, 130, 246, 0.05) 40%, 
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 
      0 10px 30px -10px var(--pill-shadow), 
      inset 0 1px 1px var(--pill-highlight), 
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 
      0 20px 40px -10px var(--pill-shadow-hover), 
      inset 0 1px 1px var(--pill-highlight-hover);
  color: #ffffff;
}

.footer-giant-bg-text {
  font-size: 22vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.11) 0%, transparent 65%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.45) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px rgba(255, 255, 255, 0.12));
}
`;

export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.4,
            y: y * 0.4,
            rotationX: -y * 0.15,
            rotationY: x * 0.15,
            scale: 1.05,
            ease: "power2.out",
            duration: 0.4,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
          });
        };

        element.addEventListener("mousemove", handleMouseMove as EventListener);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove as EventListener);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

export function CinematicFooter() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const navText = getUiTranslations(language).topNav;

  const footerCopy =
    language === "si"
      ? {
          marquee: ["මූල්‍ය ආධාර", "විනිවිද පෙනෙන නිරීක්ෂණය", "වෘත්තීය වර්ධනය", "මානසික සුවතාව", "මාර්ගෝපදේශනය"],
          heading: "සෑම ශිෂ්‍යයෙකුම බලගන්වමු.",
          description:
            "විශ්වවිද්‍යාල අවශ්‍යතා සමඟ ගැලපෙන ආරක්ෂිත වේදිකාවක මූල්‍ය ආධාර, වෘත්තීය වර්ධනය, සුවතා සේවා සහ මාර්ගෝපදේශනය එකට ගෙන එන්න.",
          copyright: "© 2026 UniCare Connect. සියලුම හිමිකම් ඇවිරිණි.",
        }
      : language === "ta"
        ? {
            marquee: ["நிதி உதவி", "வெளிப்படையான கண்காணிப்பு", "தொழில் வளர்ச்சி", "மனநல ஆதரவு", "வழிகாட்டுதல்"],
            heading: "ஒவ்வொரு மாணவரையும் வலுப்படுத்துவோம்.",
            description:
              "பல்கலைக்கழக தேவைகளுக்கு ஏற்ப நிதி உதவி, தொழில் வளர்ச்சி, நல சேவைகள் மற்றும் வழிகாட்டுதலை ஒரு பாதுகாப்பான தளத்தில் ஒன்றிணைக்கவும்.",
            copyright: "© 2026 UniCare Connect. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
          }
        : {
            marquee: ["Financial Aid", "Transparent Tracking", "Career Growth", "Mental Wellness", "Mentorship"],
            heading: "Empowering Every Student.",
            description:
              "Bring financial aid, career growth, wellness services, and mentorship together in one secure platform aligned with university needs.",
            copyright: "© 2026 UniCare Connect. All rights reserved.",
          };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.85, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 45%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      window.clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={wrapperRef}
        className="relative h-screen w-full border-t border-white/10"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-black text-white">
          <div className="footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
          <div className="footer-bg-grid pointer-events-none absolute inset-0 z-0" />

          <div
            ref={giantTextRef}
            className="footer-giant-bg-text pointer-events-none absolute -bottom-[4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap"
          >
            UNICARE
          </div>

          {/* 1. Diagonal Sleek Marquee */}
          <div className="absolute left-0 top-12 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y border-white/10 bg-black/75 py-4 shadow-2xl backdrop-blur-md">
            <div className="flex w-max animate-footer-scroll-marquee text-xs font-bold uppercase tracking-[0.3em] text-neutral-400 md:text-sm">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center space-x-12 px-6">
                  {footerCopy.marquee.map((item) => (
                    <React.Fragment key={`${dup}-${item}`}>
                      <span>{item}</span>
                      <span className="text-neutral-500">✦</span>
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Main Center Content */}
          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <h2
              ref={headingRef}
              className="footer-text-glow mb-6 text-center text-4xl font-black tracking-tighter sm:text-5xl md:text-7xl"
            >
              {footerCopy.heading}
            </h2>
            <p className="mb-10 max-w-2xl text-center text-sm text-neutral-400 md:text-base">
              {footerCopy.description}
            </p>

            <div ref={linksRef} className="flex flex-wrap justify-center gap-3 md:gap-5">
              <MagneticButton
                as="a"
                href="/overview"
                className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-neutral-300 hover:text-white md:text-sm"
              >
                {navText.overview}
              </MagneticButton>
              <MagneticButton
                as="a"
                href="/university-connect"
                className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-neutral-300 hover:text-white md:text-sm"
              >
                {navText.universities}
              </MagneticButton>
              <MagneticButton
                as="a"
                href="/student-support"
                className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-neutral-300 hover:text-white md:text-sm"
              >
                {navText.studentSupport}
              </MagneticButton>
              <MagneticButton
                as="a"
                href="/stories"
                className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-neutral-300 hover:text-white md:text-sm"
              >
                {navText.stories}
              </MagneticButton>
              <MagneticButton
                as="a"
                href="/login"
                className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-neutral-300 hover:text-white md:text-sm"
              >
                {navText.signIn}
              </MagneticButton>
            </div>
          </div>

          {/* 3. Bottom Bar */}
          <div className="relative z-20 flex w-full items-center justify-between gap-6 px-6 pb-8 md:px-12">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 md:text-xs">
              {footerCopy.copyright}
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              aria-label="Scroll back to top"
              className="footer-glass-pill group flex h-12 w-12 items-center justify-center rounded-full text-neutral-400 hover:text-white"
            >
              <svg
                className="h-5 w-5 transform transition-transform duration-300 group-hover:-translate-y-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
