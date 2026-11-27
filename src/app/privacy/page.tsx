import { Database, EyeOff, Fingerprint, KeyRound, ScrollText, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Privacy by design" };

const ICONS = [EyeOff, Users, ShieldCheck, Database, ScrollText, Fingerprint, KeyRound, TriangleAlert];

/** How the project protects information, and its honest limits. */
export default async function PrivacyPage() {
  const { t } = await getDictionary();
  return (
    <div className="wrap flex flex-1 flex-col gap-10 py-10 lg:py-14">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-[2.1rem] font-semibold tracking-tight sm:text-[2.6rem]">{t.privacy.title}</h1>
        <p className="text-lg text-ink/80">{t.privacy.intro}</p>
      </header>
      <ul className="grid gap-6 md:grid-cols-2">
        {t.privacy.sections.map((section, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <li key={section.title}>
              <Card className="flex h-full gap-4 p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-action">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <p className="text-ink/85">{section.body}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
