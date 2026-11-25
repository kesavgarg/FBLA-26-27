import { requireRole } from "@/lib/auth/session";

/** Simulated prescriber workspace. Only the doctor role and the owner may enter. */
export default async function DoctorLayout({ children }: LayoutProps<"/doctor">) {
  await requireRole(["doctor", "owner"], "/doctor");
  return <div className="wrap flex flex-1 flex-col gap-10 py-10 lg:py-14">{children}</div>;
}
