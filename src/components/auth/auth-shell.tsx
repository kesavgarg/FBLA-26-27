import type { ReactNode } from "react";
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
      <aside className="order-2 hidden flex-col justify-between rounded-[28px] border border-sky-200 bg-sky-50 p-10 lg:order-1 lg:flex">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-action">{t.brand.since}</p>
          <p className="max-w-md font-serif text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-ink">
            “{t.brand.motto}”
          </p>
          {t.brand.mottoNote && <p className="text-lg text-muted">{t.brand.mottoNote}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-6 border-t border-sky-200 pt-8">
          <div>
            <dt className="text-sm text-muted">1959</dt>
            <dd className="font-medium">{t.brand.founded}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Dec 29, 2025</dt>
            <dd className="font-medium">{t.brand.reopened}</dd>
          </div>
        </dl>
      </aside>

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
