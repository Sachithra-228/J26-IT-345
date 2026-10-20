"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useLanguage } from "@/context/language-context";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          invalid: "වලංගු විද්‍යුත් තැපෑලක් ඇතුල් කරන්න.",
          sent: "මුරපද යළි සැකසුම් සබැඳිය ඔබගේ විද්‍යුත් තැපෑලට යවා ඇත.",
          failed: "දැනට යළි සැකසුම් සබැඳිය යැවිය නොහැක. කරුණාකර නැවත උත්සාහ කරන්න.",
          sending: "යවමින්...",
          title: "ඔබගේ මුරපදය යළි සකසන්න",
          subtitle: "තත්පර කිහිපයකින් ආරක්ෂිත යළි සැකසුම් සබැඳිය ඔබගේ විද්‍යුත් තැපෑලට ලැබේ.",
          email: "විද්‍යුත් තැපෑල",
          emailPlaceholder: "name@example.com",
          submit: "යළි සැකසුම් සබැඳිය යවන්න",
          tipTitle: "ඊළඟට සිදුවෙන්නේ",
          tip1: "ඔබගේ ලියාපදිංචි විද්‍යුත් තැපෑල ඇතුල් කරන්න",
          tip2: "Inbox සහ Spam ෆෝල්ඩර දෙකම පරීක්ෂා කරන්න",
          tip3: "ආරක්ෂාව සඳහා සබැඳිය කෙටි කාලයකින් කල් ඉකුත් වේ",
          backToSignIn: "← පිවිසුමට ආපසු යන්න"
        }
      : language === "ta"
        ? {
            invalid: "சரியான மின்னஞ்சலை உள்ளிடவும்.",
            sent: "கடவுச்சொல் மீட்டமைப்பு இணைப்பு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது.",
            failed: "தற்போது மீட்டமைப்பு இணைப்பை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
            sending: "அனுப்புகிறது...",
            title: "உங்கள் கடவுச்சொல்லை மீட்டமைக்கவும்",
            subtitle: "சில வினாடிகளில் பாதுகாப்பான மீட்டமைப்பு இணைப்பு உங்கள் மின்னஞ்சலுக்கு வரும்.",
            email: "மின்னஞ்சல்",
            emailPlaceholder: "name@example.com",
            submit: "மீட்டமைப்பு இணைப்பை அனுப்பவும்",
            tipTitle: "அடுத்து என்ன நடக்கும்",
            tip1: "உங்கள் பதிவு செய்யப்பட்ட மின்னஞ்சலை உள்ளிடவும்",
            tip2: "Inbox மற்றும் Spam கோப்புறைகளையும் சரிபார்க்கவும்",
            tip3: "பாதுகாப்புக்காக இணைப்பு விரைவில் காலாவதியாகும்",
            backToSignIn: "← உள்நுழைவுக்கு திரும்பவும்"
          }
        : {
            invalid: "Please enter a valid email.",
            sent: "Password reset link sent to your email.",
            failed: "Unable to send reset link right now. Please try again.",
            sending: "Sending...",
            title: "Reset your password",
            subtitle: "A secure reset link will arrive in your inbox in a few seconds.",
            email: "Email",
            emailPlaceholder: "name@example.com",
            submit: "Send reset link",
            tipTitle: "What happens next",
            tip1: "Enter the email used for your UniCare account",
            tip2: "Check both inbox and spam folders",
            tip3: "For security, the link expires shortly",
            backToSignIn: "← Back to sign in"
          };

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setMessage({ type: "error", text: text.invalid });
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(email);
      setMessage({ type: "success", text: text.sent });
    } catch {
      setMessage({ type: "error", text: text.failed });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

      {/* Top minimal bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between px-6 pt-5">
        <Link href="/" aria-label="UniCare Connect Home" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="UniCare Connect"
            width={150}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-lg items-center justify-center px-4 py-2">
        <ScrollReveal className="w-full">
          <div className="w-full rounded-3xl border border-white/15 bg-neutral-950/95 p-6 shadow-2xl sm:p-7">
            <div className="mb-6 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{text.title}</h1>
              <p className="text-sm text-neutral-400">{text.subtitle}</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-200" htmlFor="email">
                  {text.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-required="true"
                  placeholder={text.emailPlaceholder}
                  className="h-11 w-full rounded-xl border border-white/15 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none"
                />
              </div>

              {message ? (
                <p
                  role="status"
                  className={`rounded-xl border px-3.5 py-2.5 text-sm ${
                    message.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-full bg-white text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                {isSubmitting ? text.sending : text.submit}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">{text.tipTitle}</p>
              <ul className="mt-2 space-y-1.5 text-xs text-neutral-400">
                <li>• {text.tip1}</li>
                <li>• {text.tip2}</li>
                <li>• {text.tip3}</li>
              </ul>
            </div>

            <div className="mt-6">
              <Link href="/login" className="text-sm font-medium text-neutral-300 transition hover:text-white">
                {text.backToSignIn}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
