"use client";

import { ArrowRight, MessageCircleQuestion, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { answerQuestion, type HelpEntry } from "@/lib/domain/help";
import { useI18n } from "@/lib/i18n/provider";

type Turn = { id: number; question: string; best: HelpEntry | null; related: HelpEntry[] };

/**
 * Interactive help assistant. Questions are matched against the help
 * knowledge base in the browser (src/lib/domain/help.ts) — nothing is sent
 * to an AI service, and it never gives medical advice.
 */
export function HelpAssistant() {
  const { t, locale } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns]);

  function ask(text: string) {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    const { best, related } = answerQuestion(clean);
    setTurns((previous) => [...previous.slice(-9), { id: Date.now(), question: clean, best, related }]);
    setQuestion("");
    inputRef.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <section aria-labelledby="assistant-title" className="flex flex-col gap-5 rounded-[28px] border border-sky-200 bg-sky-50 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-action text-white">
          <MessageCircleQuestion className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="assistant-title" className="text-xl font-semibold">
            {t.help.assistantTitle}
          </h2>
          <p className="text-sm text-muted">{t.help.assistantHint}</p>
        </div>
      </div>

      <div aria-live="polite" className="flex max-h-[28rem] flex-col gap-4 overflow-y-auto">
        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col gap-2">
            <p className="max-w-[85%] self-end rounded-[18px] rounded-br-md bg-ink px-4 py-2 text-white">{turn.question}</p>
            <div className="max-w-[90%] self-start rounded-[18px] rounded-bl-md border border-line bg-canvas px-4 py-3">
              {turn.best ? (
                <>
                  <p className="font-semibold">{turn.best.question[locale]}</p>
                  <p className="mt-1 text-ink/90">{turn.best.answer[locale]}</p>
                  {turn.best.href && (
                    <Link href={turn.best.href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-action hover:underline">
                      {t.help.open}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </>
              ) : (
                <p>{t.help.noMatch}</p>
              )}
              {turn.related.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                  <p className="text-sm text-muted">{t.help.didYouMean}</p>
                  <div className="flex flex-wrap gap-2">
                    {turn.related.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => ask(entry.question[locale])}
                        className="min-h-11 rounded-[var(--radius-pill)] border border-line-strong px-3 text-left text-sm font-medium hover:border-action"
                      >
                        {entry.question[locale]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {t.help.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="min-h-11 rounded-[var(--radius-pill)] border border-line-strong bg-canvas px-4 text-sm font-medium hover:border-action"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="help-question" className="sr-only">
          {t.help.assistantLabel}
        </label>
        <input
          ref={inputRef}
          id="help-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={200}
          autoComplete="off"
          placeholder={t.help.assistantLabel}
          className="min-h-13 min-w-0 flex-1 rounded-[var(--radius-pill)] border border-line-strong bg-canvas px-5 text-base focus:border-action focus:ring-4 focus:ring-sky-200 focus:outline-none"
        />
        <Button type="submit" size="lg" icon={<Send className="size-4" aria-hidden="true" />}>
          {t.help.ask}
        </Button>
      </form>
      <p className="text-sm text-muted">{t.help.disclaimer}</p>
    </section>
  );
}
