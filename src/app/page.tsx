import { ArrowRight, Fingerprint } from "lucide-react";
import { HeroWordmark } from "@/components/home/hero-wordmark";
import { ShopPreview } from "@/components/home/shop-preview";
import { LiquidGlass } from "@/components/effects/liquid-glass";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";
import Link from "next/link";

/**
 * Home page.
 *   1. Hero: navy ground, the interactive "Goodson" wordmark, the promise.
 *   2. Shop: search, categories and featured products (live stock).
 *   3. Refill band: the three-step refill, on a liquid-glass surface.
 *   4. Heritage: three dates from the store's public history.
 */
export default async function HomePage() {
  const [{ t, locale }, user] = await Promise.all([getDictionary(), getSessionUser()]);
  const primaryHref = user ? homePathForRole(user.role) : "/login";

  return (
    <>
      {/* 1. Hero ------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-[#0B1E30] text-white" aria-labelledby="hero-title">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 pt-10 text-[0.94rem] text-sky-100/80 lg:pt-14">
          <p className="font-medium text-sky-300">{t.brand.since}</p>
          <p>{t.home.heroNote}</p>
        </div>

        <HeroWordmark />

        <div className="wrap grid gap-10 pb-14 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:pb-20">
          <div className="flex flex-col gap-5">
            <h1 id="hero-title" className="max-w-2xl text-[2.3rem] leading-[1.08] font-semibold tracking-tight sm:text-[3.2rem]">
              {t.home.heroTitle}
            </h1>
            <p className="max-w-xl text-lg text-sky-100/85 sm:text-xl">{t.home.heroBody}</p>
          </div>
          <div className="flex flex-col gap-6 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className={buttonClasses("bright", "lg")}
              >
                {user ? <ArrowRight className="size-5" aria-hidden="true" /> : <Fingerprint className="size-5" aria-hidden="true" />}
                {user ? t.nav.account : t.nav.signIn}
              </Link>
              {!user && (
                <Link
                  href="/register"
                  className={buttonClasses("outline", "lg")}
                >
                  {t.auth.createAccount}
                </Link>
              )}
            </div>
            <p className="font-serif text-xl text-sky-100 lg:text-right">
              “{t.brand.motto}”
              {t.brand.mottoNote && <span className="block text-base text-sky-100/70">{t.brand.mottoNote}</span>}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Shop ---------------------------------------------------------- */}
      <ShopPreview t={t} locale={locale} />

      {/* 3. Refill band -------------------------------------------------- */}
      <section className="pb-16 lg:pb-24" aria-labelledby="refill-title">
        <div className="wrap">
          <LiquidGlass className="rounded-[28px] text-white">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:p-16">
              <div className="flex flex-col items-start gap-5">
                <p className="rounded-[var(--radius-pill)] border border-white/25 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-md">
                  {t.home.refillLabel}
                </p>
                <h2 id="refill-title" className="text-[2rem] leading-tight font-semibold tracking-tight sm:text-[2.6rem]">
                  {t.home.refillTitle}
                </h2>
                <p className="max-w-md text-lg text-white/85">{t.home.refillBody}</p>
                <ButtonLink
                  href={user ? "/account/prescriptions" : "/login?next=%2Faccount%2Fprescriptions"}
                  size="lg"
                  variant="bright"
                  className="mt-2"
                  icon={<Fingerprint className="size-5" aria-hidden="true" />}
                >
                  {user ? t.refills.title : t.home.refillCta}
                </ButtonLink>
              </div>
              <ol className="flex flex-col gap-3">
                {t.home.refillSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-5 rounded-[var(--radius-card)] border border-white/20 bg-white/10 p-5 backdrop-blur-xl sm:p-6"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-ink tabular">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="text-white/80">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </LiquidGlass>
        </div>
      </section>

      {/* 4. Heritage ------------------------------------------------------ */}
      <section className="border-t border-line bg-sky-50 py-16 lg:py-24" aria-labelledby="heritage-title">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div className="flex flex-col gap-4">
            <h2 id="heritage-title" className="font-serif text-[2.1rem] leading-tight font-semibold tracking-tight sm:text-[2.6rem]">
              {t.home.heritageTitle}
            </h2>
            <p className="max-w-md text-lg text-ink/80">{t.home.heritageBody}</p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-sky-200 bg-sky-200 sm:grid-cols-3">
            {t.home.heritage.map((item) => (
              <li key={item.year} className="flex flex-col gap-3 bg-canvas p-6">
                <span className="font-serif text-[2.4rem] leading-none font-semibold text-action tabular">{item.year}</span>
                <p className="text-ink/85">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
