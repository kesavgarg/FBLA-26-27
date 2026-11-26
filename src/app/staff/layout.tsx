import { StaffNav } from "@/components/staff/staff-nav";
import { requireRole } from "@/lib/auth/session";

/** Pharmacy staff workspace. Only staff and the owner may enter. */
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  await requireRole(["staff", "owner"], "/staff");
  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <StaffNav />
      {children}
    </div>
  );
}
