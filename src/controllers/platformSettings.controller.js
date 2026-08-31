// Configurable notification scheduling (Super Admin app > Notification
// Settings). Backed by the public.notification_settings singleton row.
import { publicDb } from "../utils/tenantDb.js";

// GET /api/platform/notification-settings
export const getNotificationSettings = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("notification_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    res.status(200).json({
      success: true,
      data: data || { id: 1, reminder_days_before: 3, notify_on_expiry_day: true },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/platform/notification-settings  { reminder_days_before?, notify_on_expiry_day? }
export const updateNotificationSettings = async (req, res, next) => {
  try {
    const { reminder_days_before, notify_on_expiry_day } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };

    if (reminder_days_before !== undefined) {
      const n = Number(reminder_days_before);
      if (!Number.isFinite(n) || n < 1 || n > 14) {
        return res.status(400).json({ success: false, message: "reminder_days_before must be between 1 and 14" });
      }
      updates.reminder_days_before = Math.floor(n);
    }
    if (notify_on_expiry_day !== undefined) {
      if (typeof notify_on_expiry_day !== "boolean") {
        return res.status(400).json({ success: false, message: "notify_on_expiry_day must be true or false" });
      }
      updates.notify_on_expiry_day = notify_on_expiry_day;
    }

    const { data, error } = await publicDb()
      .from("notification_settings")
      .update(updates)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
