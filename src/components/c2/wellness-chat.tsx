"use client";
import { FormEvent, useState } from "react";
import { ArrowUp, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { guidedReply, type SupportReply } from "@/lib/c2/assistant";
import { fieldClass, panel, SafetySupport, secondaryText } from "./wellness-ui";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  reply?: SupportReply;
};
export function WellnessChat({ onSupport }: { onSupport: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const lastReply = [...messages].reverse().find((m) => m.reply)?.reply;
  function send(text: string) {
    if (!text.trim()) {
      setError("Write a message or choose a topic.");
      return;
    }
    if (text.length > 1200) {
      setError("Please keep the message within 1,200 characters.");
      return;
    }
    const reply = guidedReply(text.trim(), lastReply?.topic);
    setMessages((previous) => [
      ...previous,
      { id: previous.length + 1, role: "user", text: text.trim() },
      { id: previous.length + 2, role: "assistant", text: reply.text, reply },
    ]);
    setDraft("");
    setError("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }
  return (
    <section className={panel} aria-label="Support chat">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-semibold">
              A space to talk it through.
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Guided support · stays on your device
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setMessages([]);
            setDraft("");
            setError("");
          }}
          aria-label="Clear chat"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <p className={`mt-4 ${secondaryText}`}>
        You can write freely or choose a topic. Replies are selected from a
        limited support library; this is not a live counselor or an open-ended
        generative AI. Your messages are not used to diagnose you.
      </p>
      <div
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="mt-6 max-h-[32rem] space-y-4 overflow-y-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"
      >
        <div className="max-w-xl rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
            UniCare assistant
          </p>
          What would you like some space for today: worry, study pressure,
          sleep, or feeling connected?
        </div>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${message.role === "user" ? "ml-auto rounded-tr-sm bg-blue-600 text-white" : "mr-auto rounded-tl-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"} max-w-xl rounded-2xl p-4 text-sm leading-6`}
          >
            <p
              className={`mb-1 text-xs font-semibold ${message.role === "user" ? "text-blue-100" : "text-blue-600 dark:text-blue-300"}`}
            >
              {message.role === "user" ? "You" : "UniCare assistant"}
            </p>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            {message.reply?.source ? (
              <a
                href={message.reply.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-medium text-blue-700 underline dark:text-blue-300"
              >
                {message.reply.source.label}
              </a>
            ) : null}
            {message.reply?.action === "support" ? (
              <Button
                variant="secondary"
                className="mt-3 block"
                onClick={onSupport}
              >
                Find a professional
              </Button>
            ) : null}
            {message.reply?.action === "safety" ? (
              <div className="mt-4">
                <SafetySupport />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="my-4 flex flex-wrap gap-2">
        {(
          lastReply?.suggestions ?? [
            "Help with worry",
            "Study pressure",
            "I feel lonely",
            "Who can see my answers?",
          ]
        ).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              value === "Find a professional" ? onSupport() : send(value)
            }
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-blue-200 dark:hover:bg-blue-950"
          >
            {value}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <label htmlFor="c2-chat-message" className="sr-only">
          Your message
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id="c2-chat-message"
            rows={2}
            maxLength={1200}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={fieldClass}
            placeholder="What would you like to talk about?"
          />
          <Button
            type="submit"
            aria-label="Send message"
            className="mb-1 shrink-0 rounded-2xl px-3 py-3"
          >
            <ArrowUp aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          This chat is not monitored. For immediate danger, use immediate help
          rather than waiting here.
        </p>
      </form>
    </section>
  );
}
