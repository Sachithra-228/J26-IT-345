"use client";

import { useEffect, useState } from "react";
import { aidRequestSchema } from "@/lib/validation";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { TextArea } from "@/components/shared/text-area";
import { useLanguage } from "@/context/language-context";

type AidCategory = "emergency" | "equipment" | "boarding" | "tuition";

type AidRequestFormProps = {
  onSuccess?: () => void;
  onShowSuccessPopup?: () => void;
  defaultCategory?: AidCategory;
  lockCategory?: boolean;
  submitLabel?: string;
};

const FETCH_TIMEOUT_MS = 60000;

function normalizeAidCategory(value: string): AidCategory | "other" {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("equipment")) return "equipment";
  if (normalized.includes("meal") || normalized.includes("voucher") || normalized.includes("boarding")) return "boarding";
  if (normalized.includes("tuition") || normalized.includes("maintenance") || normalized.includes("fee")) return "tuition";
  if (normalized.includes("emergency")) return "emergency";
  return "other";
}

function amountDigits(value: unknown) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function isLikelySavedRequest(
  item: { category?: unknown; amount?: unknown; description?: unknown; createdAt?: unknown; submittedAt?: unknown },
  values: { category: string; amount: string; description: string },
  submittedAtMs: number
) {
  const createdAtRaw = item.createdAt ?? item.submittedAt;
  if (createdAtRaw) {
    const createdAtMs = new Date(String(createdAtRaw)).getTime();
    const isValidDate = Number.isFinite(createdAtMs);
    if (isValidDate && createdAtMs < submittedAtMs - 5 * 60 * 1000) {
      return false;
    }
  }

  const sameCategory = normalizeAidCategory(String(item.category ?? "")) === normalizeAidCategory(values.category);
  const sameAmount = amountDigits(item.amount) === amountDigits(values.amount);
  const sameDescription = String(item.description ?? "").trim() === values.description.trim();
  return sameCategory && sameAmount && sameDescription;
}

export function AidRequestForm({
  onSuccess,
  onShowSuccessPopup,
  defaultCategory,
  lockCategory = false,
  submitLabel
}: AidRequestFormProps) {
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          invalid: "අවශ්‍ය ක්ෂේත්‍ර පුරවා විස්තරාත්මක පැහැදිලි කිරීමක් එක් කරන්න.",
          submitFailed: "ඔබගේ ඉල්ලීම යැවීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.",
          submitted: "ඔබගේ අයදුම්පත විශ්වවිද්‍යාල සත්‍යාපනය සඳහා යවා ඇත.",
          requestSent:
            "ඉල්ලීම යවා ඇත. පහළ ලැයිස්තුවේ අයදුම්පත පෙනේ නම් සාර්ථකව යවා ඇත. නොපෙනේ නම් නැවත උත්සාහ කරන්න.",
          networkFail: "ඉල්ලීම යැවීමට නොහැකි විය. සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.",
          category: "ආධාර ප්‍රවර්ගය",
          select: "තෝරන්න",
          emergency: "හදිසි අධ්‍යයන ආධාර",
          equipment: "උපාංග සහ සම්පත්",
          boarding: "නවාතැන් සහ දෛනික අවශ්‍යතා",
          tuition: "පාඨමාලා සහ නඩත්තු ආධාර",
          amount: "ඇස්තමේන්තු මුදල (SL LKR)",
          summary: "තත්ව සාරාංශය",
          summaryPlaceholder: "අවශ්‍යතාව පැහැදිලි කර සහායක ලේඛන උඩුගත කරන්න.",
          documents: "සහායක ලේඛන",
          uploadAria: "ලේඛන උඩුගත කරන්න",
          submitting: "යවමින්...",
          submit: "අයදුම්පත යවන්න"
        }
      : language === "ta"
        ? {
            invalid: "தேவையான புலங்களை நிரப்பி விரிவான விளக்கத்தை சேர்க்கவும்.",
            submitFailed: "உங்கள் கோரிக்கையை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
            submitted: "உங்கள் விண்ணப்பம் பல்கலைக்கழக சரிபார்ப்பிற்கு சமர்ப்பிக்கப்பட்டது.",
            requestSent:
              "கோரிக்கை அனுப்பப்பட்டது. கீழே பட்டியலில் விண்ணப்பம் இருந்தால் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. இல்லையெனில் மீண்டும் முயற்சிக்கவும்.",
            networkFail: "கோரிக்கையை சமர்ப்பிக்க முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
            category: "உதவி வகை",
            select: "தேர்வு செய்யவும்",
            emergency: "அவசர கல்வி உதவி",
            equipment: "சாதனங்கள் மற்றும் வளங்கள்",
            boarding: "தங்குமிடம் மற்றும் அன்றாட தேவைகள்",
            tuition: "கட்டணம் மற்றும் பராமரிப்பு உதவி",
            amount: "மதிப்பிடப்பட்ட தொகை (SL LKR)",
            summary: "நிலை சுருக்கம்",
            summaryPlaceholder: "தேவையை விளக்கி ஆதார ஆவணங்களைப் பதிவேற்றவும்.",
            documents: "ஆதார ஆவணங்கள்",
            uploadAria: "ஆவணங்களைப் பதிவேற்றவும்",
            submitting: "சமர்ப்பிக்கப்படுகிறது...",
            submit: "விண்ணப்பத்தை சமர்ப்பிக்கவும்"
          }
        : {
            invalid: "Please complete the required fields and add a detailed description.",
            submitFailed: "Unable to submit your request. Please try again.",
            submitted: "Your application has been submitted for university verification.",
            requestSent:
              "Request sent. If you see your application in the list below, it was submitted successfully. Otherwise try again.",
            networkFail: "Unable to submit your request. Please check your connection and try again.",
            category: "Aid category",
            select: "Select",
            emergency: "Emergency academic aid",
            equipment: "Equipment & resources",
            boarding: "Boarding & necessities",
            tuition: "Tuition & maintenance",
            amount: "Estimated amount (SL LKR)",
            summary: "Situation summary",
            summaryPlaceholder: "Explain the need and upload supporting documents.",
            documents: "Supporting documents",
            uploadAria: "Upload documents",
            submitting: "Submitting...",
            submit: "Submit application"
          };

  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(defaultCategory ?? "");

  useEffect(() => {
    setCategory(defaultCategory ?? "");
  }, [defaultCategory]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    setAmount(v);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = {
      category: category || String(formData.get("category") ?? ""),
      amount: amount || String(formData.get("amount") ?? ""),
      description: String(formData.get("description") ?? "")
    };
    const submittedAtMs = Date.now();

    const result = aidRequestSchema.safeParse(values);
    if (!result.success) {
      setMessage(text.invalid);
      return;
    }

    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const finalizeSubmit = (nextMessage: string) => {
      setMessage(nextMessage);
      form.reset();
      setAmount("");
      setCategory(defaultCategory ?? "");
      try {
        onSuccess?.();
      } catch (callbackError) {
        void callbackError;
      }
      try {
        onShowSuccessPopup?.();
      } catch (popupError) {
        void popupError;
      }
    };

    try {
      const response = await fetch("/api/aid-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(result.data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const serverMessage = (body as { message?: string }).message;
        setMessage(serverMessage || text.submitFailed);
        return;
      }

      finalizeSubmit(text.submitted);
    } catch (err) {
      clearTimeout(timeoutId);
      const errorName =
        err && typeof err === "object" && "name" in err ? String((err as { name?: unknown }).name ?? "") : "";
      const errorMessage =
        err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
      const lowerMessage = errorMessage.toLowerCase();
      const isAbort = errorName === "AbortError" || lowerMessage.includes("abort");
      const isNetwork =
        lowerMessage.includes("failed to fetch") ||
        lowerMessage.includes("network") ||
        lowerMessage.includes("load failed") ||
        lowerMessage.includes("fetch");

      if (isAbort || isNetwork) {
        finalizeSubmit(text.requestSent);
      } else {
        try {
          const verifyResponse = await fetch("/api/aid-requests");
          const verifyData = await verifyResponse.json().catch(() => null);
          const requestList = Array.isArray(verifyData) ? verifyData : [];
          const isSaved = requestList.some((item) =>
            isLikelySavedRequest(
              item as { category?: unknown; amount?: unknown; description?: unknown; createdAt?: unknown; submittedAt?: unknown },
              values,
              submittedAtMs
            )
          );

          if (isSaved) {
            finalizeSubmit(text.requestSent);
            return;
          }
        } catch (verifyError) {
          void verifyError;
        }

        setMessage(text.networkFail);
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400" htmlFor="category">
          {text.category}
        </label>
        <Select
          id="category"
          name="category"
          aria-required="true"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={lockCategory}
          className="border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-80"
        >
          <option value="">{text.select}</option>
          <option value="emergency">{text.emergency}</option>
          <option value="equipment">{text.equipment}</option>
          <option value="boarding">{text.boarding}</option>
          <option value="tuition">{text.tuition}</option>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400" htmlFor="amount">
          {text.amount}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={handleAmountChange}
            required
            aria-required="true"
            className="flex-1 border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-700"
          />
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-neutral-400">SL LKR</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400" htmlFor="description">
          {text.summary}
        </label>
        <TextArea
          id="description"
          name="description"
          rows={4}
          required
          aria-required="true"
          placeholder={text.summaryPlaceholder}
          className="border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-700"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400" htmlFor="document">
          {text.documents}
        </label>
        <Input
          id="document"
          name="document"
          type="file"
          aria-label={text.uploadAria}
          className="border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700 dark:file:bg-white dark:file:text-neutral-900 dark:hover:file:bg-neutral-200"
        />
      </div>
      {message ? <p className="text-sm text-slate-600 dark:text-neutral-300">{message}</p> : null}
      <Button type="submit" disabled={submitting} className="block w-full text-center">
        {submitting ? text.submitting : submitLabel ?? text.submit}
      </Button>
    </form>
  );
}
