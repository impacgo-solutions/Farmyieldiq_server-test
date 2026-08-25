// ── Trial Expiry Notification Cron ──────────────────────────────────────────
// Runs daily at 8 AM. Notifies the tenant admin + info@impacgo.com when a
// tenant's trial is exactly 3 days or 1 day away from expiry.
//
// public.admin_users holds one row per tenant (see src/utils/subscription.js
// for the same trial_ends_at/is_subscribed columns used to gate requests) —
// there is no separate "admins" table, so this reads from there directly via
// the raw pool rather than the QueryBuilder, since DATE(...) - CURRENT_DATE
// isn't expressible through that API.
import cron from "node-cron";
import { pool } from "../config/supabase.js";
import { mailTransporter } from "./notifyEmail.js";

export function startTrialExpiryCron() {
  cron.schedule("0 8 * * *", async () => {
    console.log("🕒 Running trial expiry notification check...");
    try {
      const { rows } = await pool.query(`
        SELECT id, email, name, tenant_schema, trial_ends_at,
               DATE(trial_ends_at) - CURRENT_DATE AS days_left
        FROM public.admin_users
        WHERE is_subscribed = false
          AND is_active = true
          AND trial_ends_at IS NOT NULL
          AND DATE(trial_ends_at) - CURRENT_DATE IN (3, 1)
      `);

      if (rows.length === 0) {
        console.log("✅ No trial expiry notifications needed today.");
        return;
      }

      for (const admin of rows) {
        const daysLeft = Number(admin.days_left);
        const expiryDate = new Date(admin.trial_ends_at).toDateString();
        const displayName = admin.name || admin.email;

        const adminHtml = `
          <h3>Your FarmYieldIQ Trial is Expiring Soon</h3>
          <p>Hi <b>${displayName}</b>,</p>
          <p>Your free trial will expire in <b>${daysLeft} day${daysLeft > 1 ? "s" : ""}</b> on <b>${expiryDate}</b>.</p>
          <p>To continue using FarmYieldIQ without interruption, please contact us to upgrade your plan before the trial ends.</p>
          <p>If you have any questions, reply to this email or contact us at info@impacgo.com.</p>
          <br/><p>— The FarmYieldIQ Team</p>
        `;

        const internalHtml = `
          <h3>Trial Expiry Alert — ${daysLeft} Day${daysLeft > 1 ? "s" : ""} Remaining</h3>
          <p><b>Tenant:</b> ${admin.tenant_schema || "N/A"}</p>
          <p><b>Admin Name:</b> ${admin.name || "N/A"}</p>
          <p><b>Admin Email:</b> ${admin.email}</p>
          <p><b>Trial Expiry:</b> ${expiryDate}</p>
          <p><b>Days Left:</b> ${daysLeft}</p>
        `;

        // Notify the tenant admin
        await mailTransporter.sendMail({
          from: process.env.SMTP_USER,
          to: admin.email,
          subject: `Your FarmYieldIQ trial expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
          html: adminHtml,
        }).catch(err => console.error(`❌ Failed to notify tenant ${admin.email}:`, err.message));

        // Notify info@impacgo.com
        await mailTransporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.NOTIFY_EMAIL,
          subject: `Trial Expiry Alert: ${admin.tenant_schema || admin.email} — ${daysLeft} day${daysLeft > 1 ? "s" : ""} left`,
          html: internalHtml,
        }).catch(err => console.error("❌ Failed to send internal expiry alert:", err.message));

        console.log(`📧 Trial expiry notification sent for ${admin.email} (${daysLeft} days left)`);
      }

      console.log(`✅ Trial expiry check done. Notified ${rows.length} tenant(s).`);
    } catch (err) {
      console.error("❌ Trial expiry cron failed:", err.message);
    }
  });

  console.log("⏰ Trial expiry notification cron scheduled (daily at 8 AM).");
}
