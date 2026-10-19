import { ShieldCheck } from "lucide-react";

export const panel =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900";
export const secondaryText =
  "text-sm leading-6 text-slate-600 dark:text-slate-300";
export const fieldClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100";
export const choiceClass =
  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500";
export function SafetySupport({ reported = false }: { reported?: boolean }) {
  return (
    <section
      aria-label="Immediate support"
      className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">You can reach out now.</h3>
          <p className="mt-2 text-sm leading-6">
            {reported
              ? "You reported thoughts about death or self-harm. Please discuss this with a qualified professional, even if your other answers have low scores. "
              : ""}
            If you are in immediate danger, might act on thoughts of harming
            yourself or feel unable to stay safe, contact local emergency
            services or go to the nearest emergency department now. Ask someone
            you trust to stay with you.
          </p>
          <p className="mt-2 text-sm leading-6">
            This service is not monitored and does not alert anyone. Counselor
            bookings and community posts are not emergency-response services.
          </p>
        </div>
      </div>
    </section>
  );
}
