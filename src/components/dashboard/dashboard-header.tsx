"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage, type Language } from "@/context/language-context";
import { User } from "lucide-react";

function getTimeBasedGreeting(language: Language): string {
  const hour = new Date().getHours();
  if (language === "si") {
    if (hour >= 5 && hour < 12) return "සුභ උදෑසනක්";
    if (hour >= 12 && hour < 17) return "සුභ මධ්‍යහ්නයක්";
    if (hour >= 17 && hour < 22) return "සුභ සැන්දෑවක්";
    return "සුභ රාත්‍රියක්";
  }
  if (language === "ta") {
    if (hour >= 5 && hour < 12) return "காலை வணக்கம்";
    if (hour >= 12 && hour < 17) return "மதிய வணக்கம்";
    if (hour >= 17 && hour < 22) return "மாலை வணக்கம்";
    return "இரவு வணக்கம்";
  }
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

/** Title-case a single word */
function titleWord(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Format full name with a space between first and last.
 * If name is stored as one word (e.g. "wijesinghesachithra"), split so it displays as two words.
 */
function formatFullName(fullName: string | undefined, language: Language): string {
  const raw = fullName?.trim();
  if (!raw) {
    if (language === "si") return "ශිෂ්‍ය";
    if (language === "ta") return "மாணவர்";
    return "Student";
  }
  const hasSpace = /\s/.test(raw);
  if (hasSpace) {
    return raw.split(/\s+/).map(titleWord).join(" ");
  }
  const len = raw.length;
  if (len <= 1) return titleWord(raw);
  const camel = raw.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  if (camel !== raw) {
    return camel.split(/\s+/).map(titleWord).join(" ");
  }
  const splitAt = Math.max(1, Math.ceil(len / 2));
  return `${titleWord(raw.slice(0, splitAt))} ${titleWord(raw.slice(splitAt))}`;
}

export function DashboardHeader() {
  const { user, refreshUser, updateUserProfile } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePic: base64 })
      });
      const data = (await res.json()) as { user?: { profilePic?: string }; profilePic?: string };
      if (res.ok) {
        if (data.user) {
          updateUserProfile({ profilePic: data.user.profilePic });
        } else if (data.profilePic !== undefined) {
          updateUserProfile({ profilePic: data.profilePic });
        }
        await refreshUser();
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const greeting = getTimeBasedGreeting(language);
  const fullNameDisplay = formatFullName(user?.name, language);
  const uploadProfilePhotoAria =
    language === "si"
      ? "පැතිකඩ ඡායාරූපය උඩුගත කරන්න"
      : language === "ta"
        ? "சுயவிவரப் புகைப்படத்தை பதிவேற்றவும்"
        : "Upload profile photo";

  return (
    <div className="flex h-full items-center py-2">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white shadow-md ring-4 ring-slate-100 transition-all hover:scale-[1.03] hover:border-slate-400 dark:border-white/20 dark:bg-neutral-950 dark:ring-white/10"
          aria-label={uploadProfilePhotoAria}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
            aria-hidden
          />
          {user?.profilePic ? (
            <img
              src={user.profilePic}
              alt=""
              className="h-20 w-20 object-cover sm:h-24 sm:w-24"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center text-slate-400 transition-colors group-hover:text-slate-700 sm:h-24 sm:w-24 dark:text-neutral-500 dark:group-hover:text-neutral-200">
              <User className="h-10 w-10 sm:h-12 sm:w-12" />
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white">
              ...
            </span>
          )}
        </button>

        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{greeting}</span>
          </div>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {fullNameDisplay}
          </h1>
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-neutral-400">
            {user?.email ?? ""}
          </p>
        </div>
      </div>
    </div>
  );
}
