import Link from "next/link";
import { SymptomCheckWizard } from "@/components/health/symptom-check-wizard";
import { Alert } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth/session";
import { getHealthProfile } from "@/lib/data/health";
import { storeToday } from "@/lib/domain/refills";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Symptom check" };

/** The guided symptom check (four steps, then a suggested next step). */
export default async function SymptomCheckPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account/health/check");
  const { t } = await getDictionary();
  const profile = await getHealthProfile(user.id);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link href="/account/health" className="self-start text-[0.94rem] font-semibold text-action hover:underline">
          ← {t.health.title}
        </Link>
        <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.check.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.check.intro}</p>
      </div>
      <Alert tone="warning">{t.health.disclaimer}</Alert>
      <div className="max-w-4xl">
        <SymptomCheckWizard
          today={storeToday()}
          allergies={profile.allergies.map((a) => a.substance)}
          medications={profile.medications.map((m) => m.name)}
        />
      </div>
    </>
  );
}
