import { ArrowRight, Fingerprint } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Home page (foundation version). Phase 3 adds search, featured products,
 * categories, quick refill and order tracking sections.
 */
export default async function HomePage() {
  const [{ t }, user] = await Promise.all([getDictionary(), getSessionUser()]);

  return (
    <section className="border-b border-line bg-sky-50">
      <div className="wrap flex flex-col gap-8 py-20 lg:py-28">
        <p className="text-sm font-semibold text-action">{t.brand.since}</p>
        <h1 className="max-w-3xl text-[2.6rem] leading-[1.08] font-semibold tracking-tight sm:text-[3.4rem]">
          {t.home.heroTitle}
        </h1>
        <p className="max-w-2xl text-xl text-ink/80">{t.home.heroBody}</p>
        <p className="font-serif text-2xl text-ink">
          “{t.brand.motto}”
          {t.brand.mottoNote && <span className="block text-lg text-muted">{t.brand.mottoNote}</span>}
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <ButtonLink href={homePathForRole(user.role)} size="lg" icon={<ArrowRight className="size-5" aria-hidden="true" />}>
              {t.nav.account}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" size="lg" icon={<Fingerprint className="size-5" aria-hidden="true" />}>
                {t.nav.signIn}
              </ButtonLink>
              <ButtonLink href="/register" size="lg" variant="secondary">
                {t.auth.createAccount}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
