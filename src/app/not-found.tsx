import { ButtonLink } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/server";

/** Friendly 404 page with a clear way back. */
export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <div className="wrap flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p className="text-sm font-semibold text-action">404</p>
      <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.errors.pageMissing}</h1>
      <ButtonLink href="/">{t.nav.home}</ButtonLink>
    </div>
  );
}
