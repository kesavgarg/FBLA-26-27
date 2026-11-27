import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { HelpAssistant } from "@/components/help/help-assistant";
import { HELP_ENTRIES } from "@/lib/domain/help";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Help" };

/** Help center: the interactive assistant plus every answer as an FAQ list. */
export default async function HelpPage() {
  const { t, locale } = await getDictionary();
  return (
    <div className="wrap flex flex-1 flex-col gap-10 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-[2.1rem] font-semibold tracking-tight sm:text-[2.6rem]">{t.help.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.help.intro}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <HelpAssistant />
        <section aria-labelledby="faq-title" className="flex flex-col gap-4">
          <h2 id="faq-title" className="text-xl font-semibold">
            {t.help.faqTitle}
          </h2>
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {HELP_ENTRIES.map((entry) => (
              <details key={entry.id} className="group px-5 py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {entry.question[locale]}
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-ink/85">{entry.answer[locale]}</p>
                {entry.href && (
                  <Link href={entry.href} className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-action hover:underline">
                    {t.help.open}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
