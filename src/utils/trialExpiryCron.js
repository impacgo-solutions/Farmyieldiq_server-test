// ── Trial Expiry Notification Cron ──────────────────────────────────────────
// Runs daily at 8 AM. Two configurable notices (Super Admin app >
// Notification Settings, public.notification_settings):
//   - a reminder `reminder_days_before` (default 3) days before trial_ends_at
//   - an expiry notice on the day the trial actually lapses (day 15), if
//     notify_on_expiry_day is enabled
// Every notice is persisted to public.trial_notifications (unique per
// tenant/type/day) BEFORE the email send is attempted, so a duplicate cron
// run — or a run that started late and skipped the exact reminder day —
// never re-sends the same notice, and the Super Admin app always has an
// accurate history even if outbound email fails.
//
// This cron only ever touches public.admin_users (read) and the
// public.trial_notifications / public.trial_audit_log tables (append-only)
// — never a tenant's own schema/data. Access enforcement itself already
// happens live on every login/request via src/utils/subscription.js's
// isTenantExpired() — this file's job is notification + audit, not gating.
import cron from "node-cron";
import { pool } from "../config/supabase.js";
import { publicDb } from "./tenantDb.js";
import { mailTransporter } from "./notifyEmail.js";
import { getNotificationSettings, recordNotification } from "./trialManagement.js";

const wasAlreadyRecordedToday = async (adminUserId, notifType) => {
  const { data } = await publicDb()
    .from("trial_notifications")
    .select("id")
    .eq("admin_user_id", adminUserId)
    .eq("notif_type", notifType)
    .eq("notif_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  return !!data;
};

const sendReminder = async (admin, daysLeft) => {
  if (await wasAlreadyRecordedToday(admin.id, "trial_reminder")) return false;
  await recordNotification({
    adminUserId: admin.id,
    notifType: "trial_reminder",
    daysLeft,
    message: `Trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
    channel: "email",
  });

  const expiryDate = new Date(admin.trial_ends_at).toDateString();
  const displayName = admin.name || admin.email;

  await mailTransporter.sendMail({
    from: process.env.SMTP_USER,
    to: admin.email,
    subject: `Your FarmYieldIQ trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    html: `
      <h3>Your FarmYieldIQ Trial is Expiring Soon</h3>
      <p>Hi <b>${displayName}</b>,</p>
      <p>Your free trial will expire in <b>${daysLeft} day${daysLeft === 1 ? "" : "s"}</b> on <b>${expiryDate}</b>.</p>
      <p>To continue using FarmYieldIQ without interruption, please contact us to upgrade your plan before the trial ends.</p>
      <p>If you have any questions, reply to this email or contact us at info@impacgo.com.</p>
      <br/><p>— The FarmYieldIQ Team</p>
    `,
  }).catch((err) => console.error(`❌ Failed to notify tenant ${admin.email}:`, err.message));

  await mailTransporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `Trial Expiry Alert: ${admin.tenant_schema || admin.email} — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    html: `
      <h3>Trial Expiry Alert — ${daysLeft} Day${daysLeft === 1 ? "" : "s"} Remaining</h3>
      <p><b>Tenant:</b> ${admin.tenant_schema || "N/A"}</p>
      <p><b>Admin Name:</b> ${admin.name || "N/A"}</p>
      <p><b>Admin Email:</b> ${admin.email}</p>
      <p><b>Trial Expiry:</b> ${expiryDate}</p>
      <p><b>Days Left:</b> ${daysLeft}</p>
    `,
  }).catch((err) => console.error("❌ Failed to send internal expiry alert:", err.message));

  return true;
};

const sendExpiredNotice = async (admin) => {
  if (await wasAlreadyRecordedToday(admin.id, "trial_expired")) return false;
  await recordNotification({
    adminUserId: admin.id,
    notifType: "trial_expired",
    daysLeft: 0,
    message: "Trial period ended — application access blocked until extended/renewed/upgraded.",
    channel: "email",
  });

  await publicDb().from("trial_audit_log").insert({
    admin_user_id: admin.id,
    action: "trial_expired_detected",
    performed_by: null,
    performed_by_name: "system",
    previous_state: { is_subscribed: false },
    new_state: { is_subscribed: false, trial_ends_at: admin.trial_ends_at },
    note: "Detected by trial expiry cron",
  });

  const displayName = admin.name || admin.email;
  await mailTransporter.sendMail({
    from: process.env.SMTP_USER,
    to: admin.email,
    subject: "Your FarmYieldIQ trial has ended",
    html: `
      <h3>Your FarmYieldIQ Trial Has Ended</h3>
      <p>Hi <b>${displayName}</b>,</p>
      <p>Your 15-day free trial ended today. Access to the FarmYieldIQ application is now blocked for your organization,
      but all of your data is fully preserved and nothing has been lost.</p>
      <p>Contact info@impacgo.com to extend your trial, renew, or upgrade to a paid plan — access is restored immediately
      once that happens.</p>
      <br/><p>— The FarmYieldIQ Team</p>
    `,
  }).catch((err) => console.error(`❌ Failed to notify tenant ${admin.email} of expiry:`, err.message));

  await mailTransporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `Trial Expired: ${admin.tenant_schema || admin.email}`,
    html: `
      <h3>Trial Expired — Access Blocked</h3>
      <p><b>Tenant:</b> ${admin.tenant_schema || "N/A"}</p>
      <p><b>Admin Email:</b> ${admin.email}</p>
      <p><b>Trial Ended:</b> ${new Date(admin.trial_ends_at).toDateString()}</p>
    `,
  }).catch((err) => console.error("❌ Failed to send internal expiry alert:", err.message));

  return true;
};

export function startTrialExpiryCron() {
  cron.schedule("0 8 * * *", async () => {
    console.log("🕒 Running trial expiry notification check...");
    try {
      const settings = await getNotificationSettings();

      const { rows } = await pool.query(`
        SELECT id, email, name, tenant_schema, trial_ends_at,
               DATE(trial_ends_at) - CURRENT_DATE AS days_left
        FROM public.admin_users
        WHERE is_subscribed = false
          AND is_active = true
          AND trial_ends_at IS NOT NULL
      `);

      let reminded = 0;
      let expired = 0;

      for (const admin of rows) {
        const daysLeft = Number(admin.days_left);

        if (daysLeft > 0 && daysLeft <= settings.reminder_days_before) {
          // <= (not ===) so a cron outage on the exact reminder day doesn't
          // permanently skip that tenant's reminder for the whole trial —
          // the per-day uniqueness constraint still guarantees at most one
          // reminder notice per calendar day.
          if (await sendReminder(admin, daysLeft)) reminded++;
        } else if (daysLeft <= 0 && settings.notify_on_expiry_day) {
          // Fires the first time the cron sees this tenant past expiry —
          // covers both "exactly day 15" and a missed run catching up later.
          if (await sendExpiredNotice(admin)) expired++;
        }
      }

      console.log(`✅ Trial expiry check done. ${reminded} reminder(s), ${expired} expiry notice(s) sent.`);
    } catch (err) {
      console.error("❌ Trial expiry cron failed:", err.message);
    }
  });

  console.log("⏰ Trial expiry notification cron scheduled (daily at 8 AM).");
}
