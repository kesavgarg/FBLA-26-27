import { MapPin } from "lucide-react";
import { LiquidGlass } from "@/components/effects/liquid-glass";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "About Goodson" };

/**
 * About Goodson and the heritage timeline. Public facts only, credited
 * below; no real photographs or logos of the business are used.
 */
export default async function AboutPage() {
  const { t } = await getDictionary();
  const a = t.about;

  return (
    <>
      <section className="border-b border-line bg-sky-50">
        <div className="wrap flex flex-col gap-5 py-16 lg:py-24">
          <p className="text-sm font-semibold text-action">{a.eyebrow}</p>
          <h1 className="max-w-4xl font-serif text-[2.4rem] leading-[1.08] font-semibold tracking-tight sm:text-[3.4rem]">{a.heading}</h1>
          <p className="max-w-2xl text-xl text-ink/80">{a.intro}</p>
        </div>
      </section>

      <section className="py-16 lg:py-24" aria-labelledby="motto">
        <div className="wrap">
          <LiquidGlass className="rounded-[28px] text-white">
            <div className="flex flex-col gap-4 p-10 sm:p-16">
              <p id="motto" className="text-sm font-semibold text-sky-300">
                {a.mottoLabel}
              </p>
              <p className="font-serif text-[2.6rem] leading-[1.05] font-semibold sm:text-[4rem]">“{t.brand.motto}”</p>
              {t.brand.mottoNote && <p className="text-xl text-white/80">{t.brand.mottoNote}</p>}
            </div>
          </LiquidGlass>
        </div>
      </section>

      <section className="pb-16 lg:pb-24" aria-labelledby="timeline-title">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_2fr]">
          <h2 id="timeline-title" className="font-serif text-[2.1rem] font-semibold tracking-tight lg:sticky lg:top-28 lg:self-start">
            {a.timelineTitle}
          </h2>
          <ol className="relative flex flex-col gap-10 border-l-2 border-sky-200 pl-8">
            {a.timeline.map((item) => (
              <li key={item.year} className="relative">
                <span aria-hidden="true" className="absolute top-2 -left-[2.55rem] size-4 rounded-full border-4 border-canvas bg-action" />
                <p className="font-serif text-2xl font-semibold text-action">{item.year}</p>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="max-w-prose text-lg text-ink/85">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line bg-sky-50 py-16 lg:py-24" aria-labelledby="philosophy">
        <div className="wrap flex flex-col gap-8">
          <h2 id="philosophy" className="font-serif text-[2.1rem] font-semibold tracking-tight">
            {a.philosophyTitle}
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {a.philosophy.map((p) => (
              <li key={p.title}>
                <Card className="h-full p-6">
                  <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
                  <p className="text-ink/85">{p.body}</p>
                </Card>
              </li>
            ))}
          </ul>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex gap-4 p-6">
              <MapPin className="size-6 shrink-0 text-action" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">{a.visit}</h3>
                <p>{t.brand.address}</p>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold">{a.projectTitle}</h3>
              <p className="text-ink/85">{a.projectBody}</p>
            </Card>
          </div>
          <p className="text-sm text-muted">{a.sources}</p>
        </div>
      </section>
    </>
  );
}
