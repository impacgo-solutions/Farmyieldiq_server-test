// Run with: node seedPlatformAdmin.js
// Creates (or updates the password for) the first real platform Super
// Admin in public.platform_admins — the identity the Super Admin Flutter
// app should actually log in with, replacing its old client-side demo
// bypass. Override via env vars if you don't want the defaults below:
//   PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_NAME

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { supabase } from "./src/config/supabase.js";

dotenv.config();

const seedPlatformAdmin = async () => {
  const email = process.env.PLATFORM_ADMIN_EMAIL || "superadmin@farmyieldiq.com";
  const password = process.env.PLATFORM_ADMIN_PASSWORD || "SuperAdmin@123";
  const name = process.env.PLATFORM_ADMIN_NAME || "Super Admin";

  console.log("🌱 Seeding platform super admin...");
  const hashed = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("platform_admins")
    .upsert({ email, password: hashed, name, is_active: true }, { onConflict: "email" })
    .select()
    .single();

  if (error) {
    console.error("❌ Error:", error.message);
    console.error("   Did you run database/migrations/add_trial_management_system.sql yet?");
    process.exit(1);
  }

  console.log("✅ Platform Super Admin created/updated:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   ID:       ${data.id}`);
  console.log("\n⚠️  CHANGE THIS PASSWORD IN PRODUCTION!");
  process.exit(0);
};

seedPlatformAdmin();
