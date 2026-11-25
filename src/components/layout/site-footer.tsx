import { getDictionary } from "@/lib/i18n/server";
import { Logo } from "./logo";

/** Site footer: business facts, motto and the student-project disclaimer. */
export async function SiteFooter() {
  const { t } = await getDictionary();
  return (
    <footer className="mt-auto border-t border-line bg-sky-50">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="font-serif text-xl text-ink">
            “{t.brand.motto}”
            {t.brand.mottoNote && <span className="block text-base text-muted">{t.brand.mottoNote}</span>}
          </p>
          <p className="text-muted">
            {t.brand.since} · {t.brand.address}
          </p>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-muted md:justify-self-end">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}

/** Thin strip at the very top of every page that labels the demo honestly. */
export async function DemoBanner() {
  const { t } = await getDictionary();
  return (
    <div className="bg-ink text-white">
      <p className="wrap py-2 text-center text-[0.84rem] leading-snug">{t.demo.banner}</p>
    </div>
  );
}
