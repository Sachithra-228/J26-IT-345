"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { OTHER_DEGREE_VALUE, localizeSignupOptionLabel } from "@/lib/signup-data";
import { useLanguage } from "@/context/language-context";

type DegreePickerProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

export function DegreePicker({
  options,
  value,
  onChange,
  id,
  placeholder = "Select degree program",
  disabled = false,
  "aria-label": ariaLabel,
  className = ""
}: DegreePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const text =
    language === "si"
      ? {
          otherLabel: "වෙනත් (විස්තර කරන්න)",
          defaultPlaceholder: "උපාධි වැඩසටහන තෝරන්න"
        }
      : language === "ta"
        ? {
            otherLabel: "மற்றவை (தயவுசெய்து குறிப்பிடவும்)",
            defaultPlaceholder: "பட்டப்படிப்பு திட்டத்தை தேர்ந்தெடுக்கவும்"
          }
        : {
            otherLabel: "Other (Please specify)",
            defaultPlaceholder: "Select degree program"
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
    value === OTHER_DEGREE_VALUE || value === "Other"
      ? text.otherLabel
      : value
        ? localizeSignupOptionLabel(value, language)
        : "";
  const optionsWithoutOther = options.filter(
    (o) => o !== "Other (Please specify)" && o !== "Other"
  );

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
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-neutral-900 px-3.5 text-left text-sm transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          open && !disabled ? "border-white/40 ring-1 ring-white/20" : "border-white/15 hover:border-white/30"
        }`}
      >
        <span className={displayValue ? "truncate pr-2 font-medium text-white" : "truncate pr-2 text-neutral-500"}>
          {displayValue || placeholder || text.defaultPlaceholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
            open && !disabled ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {open && !disabled ? (
        <div
          role="listbox"
          className="mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-black/95 shadow-xl"
        >
          <div className="max-h-36 overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
            {optionsWithoutOther.map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(opt)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-white/15 font-semibold text-white"
                      : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <span>{localizeSignupOptionLabel(opt, language)}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-white" /> : null}
                </button>
              );
            })}
            <div className="mt-1 border-t border-white/10 pt-1">
              <button
                type="button"
                role="option"
                aria-selected={value === OTHER_DEGREE_VALUE || value === "Other (Please specify)" || value === "Other"}
                onClick={() => select(OTHER_DEGREE_VALUE)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                  value === OTHER_DEGREE_VALUE || value === "Other (Please specify)" || value === "Other"
                    ? "bg-white/15 text-white"
                    : "text-neutral-200 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span>{text.otherLabel}</span>
                {value === OTHER_DEGREE_VALUE || value === "Other (Please specify)" || value === "Other" ? (
                  <Check className="h-4 w-4 shrink-0 text-white" />
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
