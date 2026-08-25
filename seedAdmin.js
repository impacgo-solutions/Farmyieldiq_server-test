// Run with: node seedAdmin.js
// Creates the default admin@etor.com / password account

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { supabase } from "./src/config/supabase.js";

dotenv.config();

const seedAdmin = async () => {
  const email = "admin@etor.com";
  const password = "password";
  const name = "Admin User";

  console.log("🌱 Seeding admin user...");
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("admin_users")
    .upsert(
      { email, password_hash, name, role: "super_admin", is_active: true },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  console.log("✅ Admin created/updated:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   ID:       ${data.id}`);
  console.log("\n⚠️  CHANGE THIS PASSWORD IN PRODUCTION!");
  process.exit(0);
};

seedAdmin();
