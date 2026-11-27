import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { Logo } from "./logo";

/** Site footer: business facts, motto and the student-project disclaimer. */
export async function SiteFooter() {
  const { t } = await getDictionary();
  return (
    <footer className="mt-auto border-t print:hidden border-line bg-sky-50">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="font-serif text-xl text-ink">
            “{t.brand.motto}”
            {t.brand.mottoNote && (
              <span className="block text-base text-muted">
                {t.brand.mottoNote}
              </span>
            )}
          </p>
          <p className="text-muted">
            {t.brand.since} · {t.brand.address}
          </p>
        </div>
        <div className="flex flex-col gap-5 md:justify-self-end">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-semibold">
              <li>
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center text-action hover:underline"
                >
                  {t.footer.about}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-11 items-center text-action hover:underline"
                >
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="inline-flex min-h-11 items-center text-action hover:underline"
                >
                  {t.footer.help}
                </Link>
              </li>
            </ul>
          </nav>
          <p className="max-w-prose text-sm leading-relaxed text-muted">
            {t.footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Thin strip at the very top of every page that labels the demo honestly. */
export async function DemoBanner() {
  const { t } = await getDictionary();
  return (
    <div className="bg-ink text-white">
      <p className="wrap py-2 text-center text-[0.84rem] leading-snug">
        {t.demo.banner}
      </p>
    </div>
  );
}
