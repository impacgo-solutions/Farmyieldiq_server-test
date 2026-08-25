// import { supabase } from "../config/supabase.js";

// // ============================================================
// // ADMIN NOTIFICATIONS
// // ============================================================

// // GET /api/admin/notifications
// export const getAdminNotifications = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("admin_notifications")
//       .select("*")
//       .order("created_at", { ascending: false })
//       .limit(50);
//     if (error) throw error;
//     const enriched = (data || []).map((n) => ({ ...n, time: _timeAgo(n.created_at) }));
//     res.status(200).json({ success: true, count: enriched.length, data: enriched });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/admin/notifications/count
// export const getAdminNotificationCount = async (req, res, next) => {
//   try {
//     const { count, error } = await supabase
//       .from("admin_notifications")
//       .select("id", { count: "exact", head: true })
//       .eq("is_read", false);
//     if (error) throw error;
//     res.status(200).json({ success: true, count: count || 0 });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/admin/notifications/:id/read
// export const markAdminNotificationRead = async (req, res, next) => {
//   try {
//     const { error } = await supabase
//       .from("admin_notifications")
//       .update({ is_read: true })
//       .eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/admin/notifications/mark-all-read
// export const markAllAdminNotificationsRead = async (req, res, next) => {
//   try {
//     const { error } = await supabase
//       .from("admin_notifications")
//       .update({ is_read: true })
//       .eq("is_read", false);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "All notifications marked as read" });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // VISIT REQUESTS
// // ============================================================

// // GET /api/admin/requests/visits
// export const getAdminVisitRequests = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("visit_schedules")
//       .select("*, partners:partner_id(name, email, phone)")
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     const mapped = (data || []).map((v) => ({
//       id: v.id,
//       partner_id: v.partner_id,
//       partner_name: v.partners?.name || "Unknown",
//       partner_email: v.partners?.email || "",
//       partner_phone: v.partners?.phone || "",
//       visit_type: v.visit_type,
//       visit_date: v.visit_date,
//       visit_time: v.visit_time,
//       notes: v.notes,
//       status: v.status,
//       admin_note: v.admin_note,
//       created_at: v.created_at,
//       time: _timeAgo(v.created_at),
//     }));
//     res.status(200).json({ success: true, count: mapped.length, data: mapped });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/admin/requests/visits/:id
// export const updateAdminVisitRequest = async (req, res, next) => {
//   try {
//     const { status, admin_note } = req.body;
//     if (!["approved", "rejected", "pending"].includes(status)) {
//       return res.status(400).json({ success: false, message: "status must be approved, rejected, or pending" });
//     }

//     const { data: visit, error } = await supabase
//       .from("visit_schedules")
//       .update({ status, ...(admin_note ? { admin_note } : {}) })
//       .eq("id", req.params.id)
//       .select("*, partners:partner_id(name)")
//       .single();
//     if (error) throw error;

//     // Notify the partner about the status change
//     const notifTitle = status === "approved" ? "Visit Approved!" : status === "rejected" ? "Visit Update" : "Visit Status Changed";
//     const notifMsg = status === "approved"
//       ? `Your ${visit.visit_type} on ${visit.visit_date} at ${visit.visit_time} has been approved. See you then!`
//       : status === "rejected"
//       ? `Your ${visit.visit_type} request could not be accommodated. ${admin_note ? `Note: ${admin_note}` : "Please reschedule."}`
//       : `Your visit request status has been updated to: ${status}`;

//     supabase.from("notifications").insert([{
//       partner_id: visit.partner_id,
//       title: notifTitle,
//       message: notifMsg,
//       type: "visit_update",
//     }]).catch((e) => console.error("Notification insert failed:", e.message));

//     res.status(200).json({ success: true, data: { ...visit, partner_name: visit.partners?.name } });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // OWNERSHIP TRANSFER REQUESTS
// // ============================================================

// // GET /api/admin/requests/transfers
// export const getAdminTransferRequests = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("ownership_transfers")
//       .select("*, partners:from_partner_id(name, email, phone)")
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     const mapped = (data || []).map((t) => ({
//       id: t.id,
//       from_partner_id: t.from_partner_id,
//       partner_name: t.partners?.name || "Unknown",
//       partner_email: t.partners?.email || "",
//       asset_type: t.asset_type,
//       asset_id: t.asset_id,
//       reason: t.reason,
//       status: t.status,
//       admin_note: t.admin_note,
//       created_at: t.created_at,
//       time: _timeAgo(t.created_at),
//     }));
//     res.status(200).json({ success: true, count: mapped.length, data: mapped });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/admin/requests/transfers/:id
// export const updateAdminTransferRequest = async (req, res, next) => {
//   try {
//     const { status, admin_note } = req.body;
//     if (!["approved", "rejected", "pending"].includes(status)) {
//       return res.status(400).json({ success: false, message: "status must be approved, rejected, or pending" });
//     }

//     const { data: transfer, error } = await supabase
//       .from("ownership_transfers")
//       .update({ status, ...(admin_note ? { admin_note } : {}) })
//       .eq("id", req.params.id)
//       .select("*, partners:from_partner_id(name)")
//       .single();
//     if (error) throw error;

//     const notifMsg = status === "approved"
//       ? `Your ownership transfer request for ${transfer.asset_type} has been approved!`
//       : `Your ownership transfer request status: ${status}. ${admin_note ? `Note: ${admin_note}` : ""}`;

//     supabase.from("notifications").insert([{
//       partner_id: transfer.from_partner_id,
//       title: status === "approved" ? "Transfer Approved!" : "Transfer Request Update",
//       message: notifMsg,
//       type: "transfer_update",
//     }]).catch((e) => console.error("Notification insert failed:", e.message));

//     res.status(200).json({ success: true, data: { ...transfer, partner_name: transfer.partners?.name } });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // SUPPORT MESSAGES (admin view — all partner messages)
// // ============================================================

// // GET /api/admin/requests/support  — one entry per partner (latest message preview)
// export const getAdminSupportMessages = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("support_messages")
//       .select("*, partners:partner_id(name, email)")
//       .order("created_at", { ascending: false });
//     if (error) throw error;

//     // Group by partner_id — first occurrence per partner is the latest message
//     const map = new Map();
//     for (const m of data || []) {
//       if (!map.has(m.partner_id)) {
//         map.set(m.partner_id, {
//           partner_id: m.partner_id,
//           partner_name: m.partners?.name || "Unknown",
//           partner_email: m.partners?.email || "",
//           last_message: m.message,
//           last_is_from_admin: m.is_from_admin === true,
//           last_is_from_bot: m.is_from_bot === true,
//           last_message_time: m.created_at,
//           time: _timeAgo(m.created_at),
//         });
//       }
//     }

//     const conversations = Array.from(map.values());
//     res.status(200).json({ success: true, count: conversations.length, data: conversations });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/admin/support/:partnerId/thread  — full chat thread for one partner
// export const getAdminSupportThread = async (req, res, next) => {
//   try {
//     const { partnerId } = req.params;
//     const { data, error } = await supabase
//       .from("support_messages")
//       .select("*")
//       .eq("partner_id", partnerId)
//       .order("created_at", { ascending: true });
//     if (error) throw error;

//     const mapped = (data || []).map((m) => ({ ...m, time: _timeAgo(m.created_at) }));
//     res.status(200).json({ success: true, count: mapped.length, data: mapped });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // ADMIN REPLY TO SUPPORT MESSAGE
// // ============================================================

// // POST /api/admin/requests/support/:partnerId/reply
// export const replyToSupportMessage = async (req, res, next) => {
//   try {
//     const { message } = req.body;
//     if (!message?.trim()) {
//       return res.status(400).json({ success: false, message: "Message is required" });
//     }

//     const { data, error } = await supabase
//       .from("support_messages")
//       .insert([{
//         partner_id: req.params.partnerId,
//         message: message.trim(),
//         is_from_bot: false,
//         is_from_admin: true,
//       }])
//       .select()
//       .single();
//     if (error) throw error;

//     // Notify partner that admin replied
//     const preview = message.trim().length > 80 ? message.trim().substring(0, 80) + "…" : message.trim();
//     supabase.from("notifications").insert([{
//       partner_id: req.params.partnerId,
//       title: "New message from Admin",
//       message: preview,
//       type: "support_reply",
//     }]).catch((e) => console.error("Notification insert failed:", e.message));

//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // HELPERS
// // ============================================================

// function _timeAgo(dateStr) {
//   if (!dateStr) return "";
//   const date = new Date(dateStr);
//   const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
//   if (seconds < 60) return "just now";
//   const minutes = Math.floor(seconds / 60);
//   if (minutes < 60) return `${minutes}m ago`;
//   const hours = Math.floor(minutes / 60);
//   if (hours < 24) return `${hours}h ago`;
//   const days = Math.floor(hours / 24);
//   if (days < 7) return `${days}d ago`;
//   return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
// }
import { tenantDb } from "../utils/tenantDb.js";

// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

// GET /api/admin/notifications
export const getAdminNotifications = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const enriched = (data || []).map((n) => ({ ...n, time: _timeAgo(n.created_at) }));
    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/notifications/count
export const getAdminNotificationCount = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { count, error } = await db
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) throw error;
    res.status(200).json({ success: true, count: count || 0 });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/notifications/:id/read
export const markAdminNotificationRead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/notifications/mark-all-read
export const markAllAdminNotificationsRead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) throw error;
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// VISIT REQUESTS
// ============================================================

// GET /api/admin/requests/visits
export const getAdminVisitRequests = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("visit_schedules")
      .select("*, partners:partner_id(name, email, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((v) => ({
      id: v.id,
      partner_id: v.partner_id,
      partner_name: v.partners?.name || "Unknown",
      partner_email: v.partners?.email || "",
      partner_phone: v.partners?.phone || "",
      visit_type: v.visit_type,
      visit_date: v.visit_date,
      visit_time: v.visit_time,
      notes: v.notes,
      status: v.status,
      admin_note: v.admin_note,
      created_at: v.created_at,
      time: _timeAgo(v.created_at),
    }));
    res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/requests/visits/:id
export const updateAdminVisitRequest = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { status, admin_note } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be approved, rejected, or pending" });
    }

    const { data: visit, error } = await db
      .from("visit_schedules")
      .update({ status, ...(admin_note ? { admin_note } : {}) })
      .eq("id", req.params.id)
      .select("*, partners:partner_id(name)")
      .single();
    if (error) throw error;

    // Notify the partner about the status change
    const notifTitle = status === "approved" ? "Visit Approved!" : status === "rejected" ? "Visit Update" : "Visit Status Changed";
    const notifMsg = status === "approved"
      ? `Your ${visit.visit_type} on ${visit.visit_date} at ${visit.visit_time} has been approved. See you then!`
      : status === "rejected"
      ? `Your ${visit.visit_type} request could not be accommodated. ${admin_note ? `Note: ${admin_note}` : "Please reschedule."}`
      : `Your visit request status has been updated to: ${status}`;

    db.from("notifications").insert([{
      partner_id: visit.partner_id,
      title: notifTitle,
      message: notifMsg,
      type: "visit_update",
    }]).catch((e) => console.error("Notification insert failed:", e.message));

    res.status(200).json({ success: true, data: { ...visit, partner_name: visit.partners?.name } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// OWNERSHIP TRANSFER REQUESTS
// ============================================================

// GET /api/admin/requests/transfers
export const getAdminTransferRequests = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("ownership_transfers")
      .select("*, partners:from_partner_id(name, email, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((t) => ({
      id: t.id,
      from_partner_id: t.from_partner_id,
      partner_name: t.partners?.name || "Unknown",
      partner_email: t.partners?.email || "",
      asset_type: t.asset_type,
      asset_id: t.asset_id,
      reason: t.reason,
      status: t.status,
      admin_note: t.admin_note,
      created_at: t.created_at,
      time: _timeAgo(t.created_at),
    }));
    res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/requests/transfers/:id
export const updateAdminTransferRequest = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { status, admin_note } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be approved, rejected, or pending" });
    }

    const { data: transfer, error } = await db
      .from("ownership_transfers")
      .update({ status, ...(admin_note ? { admin_note } : {}) })
      .eq("id", req.params.id)
      .select("*, partners:from_partner_id(name)")
      .single();
    if (error) throw error;

    const notifMsg = status === "approved"
      ? `Your ownership transfer request for ${transfer.asset_type} has been approved!`
      : `Your ownership transfer request status: ${status}. ${admin_note ? `Note: ${admin_note}` : ""}`;

    db.from("notifications").insert([{
      partner_id: transfer.from_partner_id,
      title: status === "approved" ? "Transfer Approved!" : "Transfer Request Update",
      message: notifMsg,
      type: "transfer_update",
    }]).catch((e) => console.error("Notification insert failed:", e.message));

    res.status(200).json({ success: true, data: { ...transfer, partner_name: transfer.partners?.name } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SUPPORT MESSAGES (admin view — all partner messages)
// ============================================================

// GET /api/admin/requests/support  — one entry per partner (latest message preview)
export const getAdminSupportMessages = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("support_messages")
      .select("*, partners:partner_id(name, email)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Group by partner_id — first occurrence per partner is the latest message
    const map = new Map();
    for (const m of data || []) {
      if (!map.has(m.partner_id)) {
        map.set(m.partner_id, {
          partner_id: m.partner_id,
          partner_name: m.partners?.name || "Unknown",
          partner_email: m.partners?.email || "",
          last_message: m.message,
          last_is_from_admin: m.is_from_admin === true,
          last_is_from_bot: m.is_from_bot === true,
          last_message_time: m.created_at,
          time: _timeAgo(m.created_at),
        });
      }
    }

    const conversations = Array.from(map.values());
    res.status(200).json({ success: true, count: conversations.length, data: conversations });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/support/:partnerId/thread  — full chat thread for one partner
export const getAdminSupportThread = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { partnerId } = req.params;
    const { data, error } = await db
      .from("support_messages")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const mapped = (data || []).map((m) => ({ ...m, time: _timeAgo(m.created_at) }));
    res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ADMIN REPLY TO SUPPORT MESSAGE
// ============================================================

// POST /api/admin/requests/support/:partnerId/reply
export const replyToSupportMessage = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const { data, error } = await db
      .from("support_messages")
      .insert([{
        partner_id: req.params.partnerId,
        message: message.trim(),
        is_from_bot: false,
        is_from_admin: true,
      }])
      .select()
      .single();
    if (error) throw error;

    // Notify partner that admin replied
    const preview = message.trim().length > 80 ? message.trim().substring(0, 80) + "…" : message.trim();
    db.from("notifications").insert([{
      partner_id: req.params.partnerId,
      title: "New message from Admin",
      message: preview,
      type: "support_reply",
    }]).catch((e) => console.error("Notification insert failed:", e.message));

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// HELPERS
// ============================================================

function _timeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}