// Run with: node seedPartner.js
// Creates a test partner: bhushan@etor.in / password

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { supabase } from "./src/config/supabase.js";

dotenv.config();

const seedPartner = async () => {
  const email = "bhushan@etor.in";
  const password = "password";
  const name = "Bhushan Gonthina";

  console.log("🌱 Seeding test partner...");
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("partners")
    .upsert(
      {
        email,
        password_hash,
        name,
        phone: "+91 98765 43210",
        address: "Hyderabad, Telangana",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        pin_code: "500081",
        tier: "Concierge",
        kyc_status: "verified",
        aadhaar_masked: "XXXX XXXX 4821",
        pan_number: "ABCDE1234F",
        bank_name: "HDFC Bank",
        account_number_masked: "XXXX XXXX 7890",
        ifsc_code: "HDFC0001234",
        portfolio_value: 42850.0,
        is_active: true,
      },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  console.log("✅ Partner created/updated:");
  console.log(`   Email:        ${email}`);
  console.log(`   Password:     ${password}`);
  console.log(`   ID:           ${data.id}`);
  console.log(`   Partner Code: ${data.partner_code}`);
  console.log("\n⚠️  CHANGE THIS PASSWORD IN PRODUCTION!");
  process.exit(0);
};

seedPartner();
