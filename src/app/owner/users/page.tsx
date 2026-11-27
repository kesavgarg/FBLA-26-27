import { RoleForm } from "@/components/owner/owner-forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner · Users" };

/**
 * Users and roles. New sign-ups are always customers; only the owner can
 * grant staff, doctor or owner access, and never to themselves.
 */
export default async function UsersPage() {
  const owner = await requireRole(["owner"], "/owner/users");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email, role, is_demo, created_at").order("created_at");

  return (
    <>
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Users & roles</h1>
        <p className="text-lg text-ink/80">Everyone who signs up starts as a customer. Only you can give someone staff, doctor or owner access.</p>
      </div>
      <Alert tone="info">Role changes are checked in the database and written to the audit log. Owners can’t change their own role.</Alert>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-canvas">
        {(data ?? []).map((person) => (
          <li key={person.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {person.full_name}
                {person.is_demo && <Badge>Demo</Badge>}
                {person.id === owner.id && <Badge tone="info">You</Badge>}
              </p>
              <p className="truncate text-sm text-muted">{person.email}</p>
            </div>
            {person.id === owner.id ? <Badge tone="info">Owner</Badge> : <RoleForm userId={person.id} role={person.role} name={person.full_name} />}
          </li>
        ))}
      </ul>
    </>
  );
}
