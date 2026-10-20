"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  GOVERNMENT_UNIVERSITIES,
  PRIVATE_UNIVERSITIES,
  OTHER_UNIVERSITY_VALUE
} from "@/lib/signup-data";
import { useLanguage } from "@/context/language-context";

type UniversityPickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
};

export function UniversityPicker({
  value,
  onChange,
  id,
  placeholder = "Select your university",
  "aria-label": ariaLabel,
  className = ""
}: UniversityPickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const text =
    language === "si"
      ? {
          otherLabel: "වෙනත් (විස්තර කරන්න)",
          defaultPlaceholder: "ඔබගේ විශ්වවිද්‍යාලය තෝරන්න",
          govUniversities: "රජයේ විශ්වවිද්‍යාල",
          privateUniversities: "පෞද්ගලික විශ්වවිද්‍යාල"
        }
      : language === "ta"
        ? {
            otherLabel: "மற்றவை (தயவுசெய்து குறிப்பிடவும்)",
            defaultPlaceholder: "உங்கள் பல்கலைக்கழகத்தை தேர்ந்தெடுக்கவும்",
            govUniversities: "அரசு பல்கலைக்கழகங்கள்",
            privateUniversities: "தனியார் பல்கலைக்கழகங்கள்"
          }
        : {
            otherLabel: "Other (Please specify)",
            defaultPlaceholder: "Select your university",
            govUniversities: "Government Universities",
            privateUniversities: "Private Universities"
          };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const displayValue =
    value === OTHER_UNIVERSITY_VALUE ? text.otherLabel : value || "";

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-neutral-900 px-3.5 text-left text-sm transition focus:outline-none ${
          open ? "border-white/40 ring-1 ring-white/20" : "border-white/15 hover:border-white/30"
        }`}
      >
        <span className={displayValue ? "truncate pr-2 font-medium text-white" : "truncate pr-2 text-neutral-500"}>
          {displayValue || placeholder || text.defaultPlaceholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
            open ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-black/95 shadow-xl"
        >
          <div className="max-h-36 overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="py-0.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {text.govUniversities}
              </p>
              {GOVERNMENT_UNIVERSITIES.map((u) => {
                const isSelected = value === u;
                return (
                  <button
                    key={u}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(u)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-white/15 font-semibold text-white"
                        : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <span>{u}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-white" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="py-0.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {text.privateUniversities}
              </p>
              {PRIVATE_UNIVERSITIES.map((u) => {
                const isSelected = value === u;
                return (
                  <button
                    key={u}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(u)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-white/15 font-semibold text-white"
                        : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <span>{u}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-white" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 border-t border-white/10 pt-1">
              <button
                type="button"
                role="option"
                aria-selected={value === OTHER_UNIVERSITY_VALUE}
                onClick={() => select(OTHER_UNIVERSITY_VALUE)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                  value === OTHER_UNIVERSITY_VALUE
                    ? "bg-white/15 text-white"
                    : "text-neutral-200 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span>{text.otherLabel}</span>
                {value === OTHER_UNIVERSITY_VALUE ? <Check className="h-4 w-4 shrink-0 text-white" /> : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
