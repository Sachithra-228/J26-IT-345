"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export type RoleOption = { value: string; label: string };

type RolePickerProps = {
  options: RoleOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
};

export function RolePicker({
  options,
  value,
  onChange,
  id,
  placeholder = "Choose your role",
  "aria-label": ariaLabel,
  className = ""
}: RolePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder =
    language === "si"
      ? "ඔබගේ භූමිකාව තෝරන්න"
      : language === "ta"
        ? "உங்கள் பங்கையை தேர்ந்தெடுக்கவும்"
        : "Choose your role";

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

  const displayValue = options.find((o) => o.value === value)?.label ?? "";

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={"w-full " + className}>
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
          {displayValue || (placeholder === "Choose your role" ? defaultPlaceholder : placeholder)}
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
            {options.map((o) => {
              const isSelected = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(o.value)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-white/15 font-semibold text-white"
                      : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <span>{o.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
