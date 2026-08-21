"use client";

import { Check, LoaderCircle, MessageSquareText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type FeedbackDialogProps = {
  compact?: boolean;
  onOpen?: () => void;
};

export function FeedbackDialog({
  compact = false,
  onOpen,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const close = () => {
    if (status !== "sending") setOpen(false);
  };

  const show = () => {
    setOpen(true);
    setStatus("idle");
    setError("");
    onOpen?.();
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, status]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setError("Tell us a little more before sending.");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, page: window.location.pathname }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok)
        throw new Error(body?.error || "Feedback could not be sent.");
      setStatus("sent");
      setMessage("");
    } catch (submissionError) {
      setStatus("idle");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Feedback could not be sent.",
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        title={compact ? "Give feedback" : undefined}
        aria-label={compact ? "Give feedback" : undefined}
        className={cn(
          "text-dust hover:bg-linen/[.04] hover:text-linen flex min-h-9 items-center rounded-lg text-xs transition-colors",
          compact ? "w-9 justify-center" : "w-full gap-2 px-2",
        )}
      >
        <MessageSquareText className="size-3.5" />
        {!compact && "Give feedback"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={close}
            aria-label="Close feedback form"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="surface-raised relative z-10 w-full max-w-lg rounded-2xl p-6 sm:p-7"
          >
            <button
              type="button"
              onClick={close}
              className="text-dust hover:bg-linen/[.05] hover:text-linen absolute top-4 right-4 flex size-9 items-center justify-center rounded-lg transition-colors"
              aria-label="Close feedback form"
            >
              <X className="size-4" />
            </button>

            {status === "sent" ? (
              <div className="py-5 text-center">
                <span className="bg-sage/15 text-sage mx-auto flex size-11 items-center justify-center rounded-full">
                  <Check className="size-5" />
                </span>
                <h2 id="feedback-title" className="mt-4 text-xl font-semibold">
                  Thanks for the feedback
                </h2>
                <p className="text-canvas mt-2 text-sm">
                  Your message has been sent to the Roleward team.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="bg-amber text-night hover:bg-amber/90 mt-6 min-h-10 rounded-xl px-5 text-sm font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <p className="section-label">Help shape Roleward</p>
                <h2 id="feedback-title" className="mt-2 text-xl font-semibold">
                  Give feedback
                </h2>
                <p className="text-canvas mt-2 pr-8 text-sm leading-6">
                  Share an idea, report a problem, or tell us what could work
                  better.
                </p>
                <label htmlFor="feedback-message" className="sr-only">
                  Your feedback
                </label>
                <textarea
                  ref={textareaRef}
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={4000}
                  rows={7}
                  placeholder="What would you like us to know?"
                  className="border-iron bg-night/60 text-linen placeholder:text-dust mt-5 w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-amber"
                  disabled={status === "sending"}
                />
                <div className="mt-2 flex min-h-5 items-start justify-between gap-4">
                  <p className="text-amber text-xs" role="alert">
                    {error}
                  </p>
                  <span className="text-dust ml-auto font-mono text-[10px]">
                    {message.length}/4000
                  </span>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={status === "sending"}
                    className="text-canvas hover:bg-linen/[.04] hover:text-linen min-h-10 rounded-xl px-4 text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending" || message.trim().length < 3}
                    className="bg-amber text-night hover:bg-amber/90 flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === "sending" && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {status === "sending" ? "Sending" : "Send feedback"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
