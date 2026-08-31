// Configuration tab. Backed by public.platform_settings — one row per
// setting (key/label/description/is_toggle/value/enabled), matching the
// AdminConfigItem shape the Flutter app already renders, so this is a
// direct read/write with no reshaping needed on either side.
import { publicDb } from "../utils/tenantDb.js";

// GET /api/platform/settings
export const listSettings = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("platform_settings")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/platform/settings  { items: [{ key, value?, enabled? }, ...] }
// Saves the whole edited list in one request, matching the Configuration
// screen's single "Save Changes" button for every item at once.
export const updateSettings = async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "items must be a non-empty array" });
    }
    for (const item of items) {
      if (!item || typeof item.key !== "string" || !item.key.trim()) {
        return res.status(400).json({ success: false, message: "Every item needs a string key" });
      }
    }

    const db = publicDb();
    const saved = [];
    for (const item of items) {
      const updates = { updated_at: new Date().toISOString() };
      if (item.value !== undefined) updates.value = String(item.value);
      if (item.enabled !== undefined) updates.enabled = Boolean(item.enabled);

      const { data, error } = await db
        .from("platform_settings")
        .update(updates)
        .eq("key", item.key)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) saved.push(data);
    }

    saved.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    res.status(200).json({ success: true, count: saved.length, data: saved });
  } catch (err) {
    next(err);
  }
};
