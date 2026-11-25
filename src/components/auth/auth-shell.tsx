import type { ReactNode } from "react";
import { LiquidGlass } from "@/components/effects/liquid-glass";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Two-panel layout for sign-in, registration and recovery.
 * Desktop: a calm brand panel on the left, the form on the right.
 * Phone: the form comes first; the brand panel is reduced to a short line.
 */
export async function AuthShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const { t } = await getDictionary();
  return (
    <div className="wrap grid flex-1 gap-10 py-10 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 lg:py-16">
      <LiquidGlass className="order-2 hidden min-h-[36rem] rounded-[28px] text-white lg:order-1 lg:block">
        <aside className="flex h-full flex-col justify-between p-10">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold text-sky-300">{t.brand.since}</p>
            <p className="max-w-md font-serif text-[2.8rem] leading-[1.08] font-semibold tracking-tight">
              “{t.brand.motto}”
            </p>
            {t.brand.mottoNote && <p className="text-lg text-white/75">{t.brand.mottoNote}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-card)] border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
              <dt className="font-serif text-2xl font-semibold text-sky-300">1959</dt>
              <dd className="mt-1 font-medium">{t.brand.founded}</dd>
            </div>
            <div className="rounded-[var(--radius-card)] border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
              <dt className="font-serif text-2xl font-semibold text-sky-300">2025</dt>
              <dd className="mt-1 font-medium">{t.brand.reopened}</dd>
            </div>
          </dl>
        </aside>
      </LiquidGlass>

      <section className="order-1 flex flex-col gap-8 lg:order-2 lg:py-6" aria-labelledby="auth-title">
        <div className="flex flex-col gap-3">
          <h1 id="auth-title" className="text-[2.1rem] leading-tight font-semibold tracking-tight">
            {title}
          </h1>
          <p className="max-w-prose text-lg text-ink/80">{intro}</p>
        </div>
        {children}
      </section>
    </div>
  );
}
