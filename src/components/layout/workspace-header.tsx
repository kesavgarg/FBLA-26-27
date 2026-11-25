import { Badge } from "@/components/ui/card";
import type { SessionUser } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";

/** Page heading used at the top of every signed-in workspace. */
export async function WorkspaceHeader({
  user,
  title,
  description,
}: {
  user: SessionUser;
  title: string;
  description?: string;
}) {
  const { t } = await getDictionary();
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{t.account.roleLabel}</span>
        <Badge tone="info">{t.roles[user.role]}</Badge>
        {user.isDemo && <Badge>Demo account</Badge>}
      </div>
      <h1 className="text-[2.1rem] leading-tight font-semibold tracking-tight">{title}</h1>
      {description && <p className="max-w-prose text-lg text-ink/80">{description}</p>}
    </div>
  );
}
