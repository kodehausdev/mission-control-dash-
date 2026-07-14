// One-off ops CLI: grant a user Mission Control operator access.
// Usage: node scripts/seed-operator.mjs <email> [password] [--name "Full Name"] [--role owner]
//
// - If the auth user doesn't exist it is created (password required then).
// - Inserts/updates the operators row (service role — RLS bypass by design).
// Reads .env.local like medlab-web's ops scripts.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args.find((a) => a.includes("@"))?.toLowerCase();
const password = args.find((a, i) => i > 0 && !a.startsWith("--") && !a.includes("@"));
const nameIdx = args.indexOf("--name");
const displayName = nameIdx >= 0 ? args[nameIdx + 1] : null;
const roleIdx = args.indexOf("--role");
const role = roleIdx >= 0 ? args[roleIdx + 1] : "owner";

if (!email) {
  console.error('Usage: node scripts/seed-operator.mjs <email> [password] [--name "Full Name"] [--role owner]');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Find or create the auth user.
let userId = null;
const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}
userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;

if (!userId) {
  if (!password) {
    console.error(`No auth user for ${email}. Pass a password to create one.`);
    process.exit(1);
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Create user failed:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`Created auth user ${email} (${userId})`);
} else {
  console.log(`Found existing auth user ${email} (${userId})`);
}

// This path sets a real password directly, so the operator is "joined"
// immediately — no invite/accept-password step for them to complete.
const { error: opError } = await admin.from("operators").upsert({
  user_id: userId,
  email,
  display_name: displayName,
  role,
  joined_at: new Date().toISOString(),
});
if (opError) {
  console.error(
    "Operator grant failed:",
    opError.message,
    "\nHas the 0006_mission_control.sql migration been applied?"
  );
  process.exit(1);
}

console.log(`✔ ${email} is now a Mission Control ${role}. Sign in at http://localhost:3002/login`);
