/**
 * Create (or repair) the demo accounts, then load the demo data.
 *
 * Usage:  npm run seed:users
 *
 * Reads from .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (which database)
 *   DEMO_USER_PASSWORD                                   (shared demo password)
 *
 * The accounts use fixed ids that match public.demo_user_id() in the
 * database, and fictional addresses on the reserved .example domain.
 * Safe to run more than once.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_USER_PASSWORD in .env.local");
  process.exit(1);
}
if (password.length < 10) {
  console.error("DEMO_USER_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const DEMO_USERS = [
  { id: "0d000000-0000-4000-8000-000000000001", email: "owner@goodson-demo.example", full_name: "Lee Hartwell" },
  { id: "0d000000-0000-4000-8000-000000000002", email: "pharmacist@goodson-demo.example", full_name: "Dana Whitfield" },
  { id: "0d000000-0000-4000-8000-000000000003", email: "doctor@goodson-demo.example", full_name: "Dr. Priya Raman" },
  { id: "0d000000-0000-4000-8000-000000000010", email: "margaret@goodson-demo.example", full_name: "Margaret Ellis" },
  { id: "0d000000-0000-4000-8000-000000000011", email: "daniel@goodson-demo.example", full_name: "Daniel Ortiz" },
];

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser(user) {
  const existing = await admin.auth.admin.getUserById(user.id);
  if (existing.data?.user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(`Could not update ${user.email}: ${error.message}`);
    return "updated";
  }
  const { error } = await admin.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (error) throw new Error(`Could not create ${user.email}: ${error.message}`);
  return "created";
}

console.log(`Seeding demo accounts on ${new URL(url).host}`);
for (const user of DEMO_USERS) {
  console.log(`  ${user.email}: ${await ensureUser(user)}`);
}

// reset_demo_data() sets roles and loads products, prescriptions and history.
const { data, error } = await admin.rpc("reset_demo_data");
if (error) {
  console.error("reset_demo_data failed:", error.message);
  process.exit(1);
}
console.log("Demo data loaded:", data);
