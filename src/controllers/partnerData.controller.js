// import { supabase } from "../config/supabase.js";

// // ── DFMS helpers ─────────────────────────────────────────────────────────────
// const _dfmsBase  = () => process.env.DFMS_API_URL    || "https://dfms.impacgo.com";
// const _dfmsId    = () => process.env.DFMS_ADMIN_ID   || "";
// const _dfmsToken = () => process.env.DFMS_ADMIN_TOKEN || "";
// const _dfmsReady = () => Boolean(_dfmsId() && _dfmsToken());

// // ============================================================
// // PARTNER COWS — Supabase cows + DFMS assigned cows
// // ============================================================

// // GET /api/partner/cows
// export const getMyCows = async (req, res, next) => {
//   try {
//     // 1. Supabase cows directly assigned to this partner (cameras etc.)
//     const { data: supabaseCows, error } = await supabase
//       .from("cows")
//       .select("*")
//       .eq("assigned_user_id", req.user.id)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     const supabaseMapped = (supabaseCows || []).map(c => ({ ...c, source: "supabase" }));

//     // 2. DFMS cows assigned via cow_assignments table
//     const { data: assignments } = await supabase
//       .from("cow_assignments")
//       .select("cow_id")
//       .eq("customer_id", req.user.id);

//     let dfmsCows = [];
//     if (assignments?.length > 0 && _dfmsReady()) {
//       try {
//         const url = `${_dfmsBase()}/api/super-admin/admins/${_dfmsId()}/cows`;
//         const resp = await fetch(url, { headers: { Authorization: `Bearer ${_dfmsToken()}` } });
//         if (resp.ok) {
//           const result = await resp.json();
//           const allDfms = result.cows || result.data || [];
//           const assignedIds = new Set(assignments.map(a => String(a.cow_id)));
//           dfmsCows = allDfms
//             .filter(c => assignedIds.has(String(c.id)))
//             .map(c => {
//               const ageYears = parseFloat(c.age) || 0;
//               const st = (c.status || "").toLowerCase();
//               return {
//                 id: String(c.id),
//                 tag_number: c.tag_number || "",
//                 breed: c.breed || "Unknown",
//                 age: Math.round(ageYears * 12),
//                 milk_production: parseFloat(c.average_milk_production) || 0,
//                 health_status: st === "sick" ? "Needs Check" : st === "dry" ? "Stable" : "Healthy",
//                 status: c.status || "active",
//                 live_feed_url: null,
//                 assigned_user_id: req.user.id,
//                 source: "dfms",
//               };
//             });
//         }
//       } catch (_) { /* DFMS not live yet — skip silently */ }
//     }

//     const all = [...supabaseMapped, ...dfmsCows];
//     res.status(200).json({ success: true, count: all.length, data: all });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // PARTNER PLOTS - only assigned to logged-in partner
// // ============================================================

// // GET /api/partner/plots
// export const getMyPlots = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("plots")
//       .select("*")
//       .eq("assigned_user_id", req.user.id)
//       .order("created_at", { ascending: false });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {      
//     next(err);
//   }
// };

// // GET /api/partner/plots/:id
// export const getMyPlotById = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("plots")
//       .select("*")
//       .eq("id", req.params.id)
//       .eq("assigned_user_id", req.user.id)
//       .single();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Plot not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // PARTNER PAYMENTS / TRANSACTIONS
// // ============================================================

// // GET /api/partner/transactions
// export const getMyTransactions = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("payments")
//       .select("*")
//       .eq("user_id", req.user.id)
//       .order("date", { ascending: false });

//     if (error) throw error;

//     const transactions = (data || []).map((p) => {
//       const abs = Math.abs(Number(p.amount));
//       const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
//       return {
//         id: p.id,
//         date: new Date(p.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
//         amount: (p.amount >= 0 ? "+" : "-") + "₹" + formatted,
//         status: "Completed",
//         type_label: p.description || "Payment",
//         type: p.amount >= 0 ? "returnLabel" : "investment",
//         is_credit: p.amount >= 0,
//       };
//     });

//     res.status(200).json({ success: true, count: transactions.length, data: transactions });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // PARTNER DOCUMENTS
// // ============================================================

// // GET /api/partner/documents
// export const getMyDocuments = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("documents")
//       .select("*")
//       .eq("related_user_id", req.user.id)
//       .order("upload_date", { ascending: false });

//     if (error) throw error;
    
//     console.log(`📄 Found ${data.length} documents`);
    
//     // ADD THESE 3 LINES — prevent browser caching
//     res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//     res.set("Pragma", "no-cache");
//     res.set("Expires", "0");
    
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // PARTNER NOTIFICATIONS
// // ============================================================

// export const getMyNotifications = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("notifications")
//       .select("*")
//       .eq("partner_id", req.user.id)
//       .order("created_at", { ascending: false });

//     if (error) throw error;

//     const enriched = (data || []).map((n) => ({
//       ...n,
//       time: _timeAgo(n.created_at),
//     }));

//     res.status(200).json({ success: true, count: enriched.length, data: enriched });
//   } catch (err) {
//     next(err);
//   }
// };

// export const markNotificationRead = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("notifications")
//       .update({ is_read: true })
//       .eq("id", req.params.id)
//       .eq("partner_id", req.user.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// export const markAllNotificationsRead = async (req, res, next) => {
//   try {
//     const { error } = await supabase
//       .from("notifications")
//       .update({ is_read: true })
//       .eq("partner_id", req.user.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "All notifications marked as read" });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // SCHEDULE VISIT
// // ============================================================

// export const scheduleVisit = async (req, res, next) => {
//   try {
//     const { visit_type, visit_date, visit_time, notes } = req.body;
//     if (!visit_type || !visit_date || !visit_time) {
//       return res.status(400).json({
//         success: false,
//         message: "visit_type, visit_date, and visit_time are required",
//       });
//     }

//     const { data, error } = await supabase
//       .from("visit_schedules")
//       .insert([{
//         partner_id: req.user.id,
//         visit_type, visit_date, visit_time, notes,
//         status: "pending",
//       }])
//       .select()
//       .single();

//     if (error) throw error;

//     // Fetch partner name for admin notification
//     const { data: partner } = await supabase
//       .from("partners")
//       .select("name")
//       .eq("id", req.user.id)
//       .single();
//     const partnerName = partner?.name || req.user.email || "A partner";

//     // Notify admin
//     await supabase.from("admin_notifications").insert([{
//       title: "New Visit Request",
//       message: `${partnerName} has requested a ${visit_type} on ${visit_date} at ${visit_time}`,
//       type: "visit_request",
//       partner_id: req.user.id,
//       partner_name: partnerName,
//       data: { visit_id: data.id, visit_type, visit_date, visit_time },
//     }]);

//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// export const getMyVisits = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("visit_schedules")
//       .select("*")
//       .eq("partner_id", req.user.id)
//       .order("visit_date", { ascending: false });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // SUPPORT CHAT
// // ============================================================

// export const getMySupportMessages = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("support_messages")
//       .select("*")
//       .eq("partner_id", req.user.id)
//       .order("created_at", { ascending: true });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// export const sendSupportMessage = async (req, res, next) => {
//   try {
//     const { message } = req.body;
//     if (!message?.trim()) {
//       return res.status(400).json({ success: false, message: "Message is required" });
//     }

//     const { data: userMsg, error: userErr } = await supabase
//       .from("support_messages")
//       .insert([{
//         partner_id: req.user.id,
//         message: message.trim(),
//         is_from_bot: false,
//         is_from_admin: false,
//       }])
//       .select().single();
//     if (userErr) throw userErr;

//     // Notify admin (fire-and-forget — don't block response)
//     supabase.from("partners").select("name").eq("id", req.user.id).single()
//       .then(({ data: partner }) => {
//         const partnerName = partner?.name || req.user.email || "A partner";
//         const preview = message.trim().length > 80 ? message.trim().substring(0, 80) + "…" : message.trim();
//         return supabase.from("admin_notifications").insert([{
//           title: "New Support Message",
//           message: `${partnerName}: "${preview}"`,
//           type: "support_message",
//           partner_id: req.user.id,
//           partner_name: partnerName,
//           data: { message_id: userMsg.id },
//         }]);
//       })
//       .catch(() => {});

//     res.status(201).json({ success: true, data: { user_message: userMsg } });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // OWNERSHIP TRANSFER
// // ============================================================

// export const getMyTransfers = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("ownership_transfers")
//       .select("*")
//       .eq("from_partner_id", req.user.id)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// export const requestOwnershipTransfer = async (req, res, next) => {
//   try {
//     const { asset_type, asset_id, reason } = req.body;
//     if (!asset_type) {
//       return res.status(400).json({ success: false, message: "asset_type is required" });
//     }

//     const { data, error } = await supabase
//       .from("ownership_transfers")
//       .insert([{
//         from_partner_id: req.user.id,
//         asset_type, asset_id, reason,
//         status: "pending",
//       }])
//       .select().single();

//     if (error) throw error;

//     // Fetch partner name and notify admin
//     const { data: partner } = await supabase
//       .from("partners")
//       .select("name")
//       .eq("id", req.user.id)
//       .single();
//     const partnerName = partner?.name || req.user.email || "A partner";

//     await supabase.from("admin_notifications").insert([{
//       title: "Ownership Transfer Request",
//       message: `${partnerName} has requested an ownership transfer for ${asset_type}${reason ? `: "${reason}"` : ""}`,
//       type: "ownership_transfer",
//       partner_id: req.user.id,
//       partner_name: partnerName,
//       data: { transfer_id: data.id, asset_type, asset_id },
//     }]);

//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // ============================================================
// // PARTNER DASHBOARD
// // ============================================================

// export const cancelVisit = async (req, res, next) => {
//   try {
//     const { data: visit, error: fetchErr } = await supabase
//       .from("visit_schedules")
//       .select("id, status")
//       .eq("id", req.params.id)
//       .eq("partner_id", req.user.id)
//       .single();
//     if (fetchErr || !visit) return res.status(404).json({ success: false, message: "Visit not found" });
//     if (visit.status !== "pending") return res.status(400).json({ success: false, message: "Only pending visits can be cancelled" });

//     const { error } = await supabase.from("visit_schedules").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Visit cancelled" });
//   } catch (err) {
//     next(err);
//   }
// };

// export const cancelTransfer = async (req, res, next) => {
//   try {
//     const { data: transfer, error: fetchErr } = await supabase
//       .from("ownership_transfers")
//       .select("id, status")
//       .eq("id", req.params.id)
//       .eq("from_partner_id", req.user.id)
//       .single();
//     if (fetchErr || !transfer) return res.status(404).json({ success: false, message: "Transfer not found" });
//     if (transfer.status !== "pending") return res.status(400).json({ success: false, message: "Only pending transfers can be cancelled" });

//     const { error } = await supabase.from("ownership_transfers").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Transfer cancelled" });
//   } catch (err) {
//     next(err);
//   }
// };

// export const getMyDashboard = async (req, res, next) => {
//   try {
//     const partnerId = req.user.id;

//     const [plotsRes, paymentsRes, notifRes, cowCountRes] = await Promise.all([
//       supabase.from("plots").select("status, total_price, paid_amount").eq("assigned_user_id", partnerId),
//       supabase.from("payments").select("amount").eq("user_id", partnerId),
//       supabase.from("notifications").select("id", { count: "exact", head: true }).eq("partner_id", partnerId).eq("is_read", false),
//       supabase.from("cow_assignments").select("id", { count: "exact", head: true }).eq("customer_id", partnerId),
//     ]);

//     const plots = plotsRes.data || [];
//     const totalPortfolio = plots.reduce((s, p) => s + Number(p.total_price || 0), 0);
//     const totalPaid = plots.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
//     const totalRevenue = (paymentsRes.data || [])
//       .filter((p) => Number(p.amount) > 0)
//       .reduce((s, p) => s + Number(p.amount), 0);
//     const growthPercent = totalPaid > 0 ? Math.round((totalRevenue / totalPaid) * 100) : 0;

//     res.status(200).json({
//       success: true,
//       data: {
//         portfolio_value: totalPortfolio,
//         total_invested: totalPaid,
//         active_plots: plots.length,
//         total_returns: totalRevenue,
//         unread_notifications: notifRes.count || 0,
//         cattle_owned: cowCountRes.count || 0,
//         portfolio_growth_percent: growthPercent,
//       },
//     });
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
//   return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// }

// function _generateBotReply(userMessage) {
//   const text = userMessage.toLowerCase();
//   if (text.includes("plot")) {
//     return "I see you're inquiring about your plots. You can view all your plots in the Plots tab. For specific plot details, please share the plot number.";
//   }
//   if (text.includes("cow") || text.includes("cattle") || text.includes("livestock")) {
//     return "Your livestock portfolio details are available in the Cattle tab. For specific concerns, our farm specialist will reach out within 24 hours.";
//   }
//   if (text.includes("payment") || text.includes("transaction")) {
//     return "You can find all your transactions in the Transaction Hub from the side menu. For payment-related queries, our finance team will assist you shortly.";
//   }
//   if (text.includes("document")) {
//     return "Your documents are available in the Digital Vault. You can download certificates and agreements from there.";
//   }
//   if (text.includes("hello") || text.includes("hi")) {
//     return "Greetings! I'm your ETOR concierge. How may I assist you with your portfolio today?";
//   }
//   return "I'm connecting you with a Senior Success Manager. Estimated wait time: 45 seconds. In the meantime, you can browse our Help Center.";
// }
import { tenantDb } from "../utils/tenantDb.js";

// ── DFMS helpers ─────────────────────────────────────────────────────────────
const _dfmsBase  = () => process.env.DFMS_API_URL    || "https://dfms.impacgo.com";
const _dfmsId    = () => process.env.DFMS_ADMIN_ID   || "";
const _dfmsToken = () => process.env.DFMS_ADMIN_TOKEN || "";
const _dfmsReady = () => Boolean(_dfmsId() && _dfmsToken());

// ============================================================
// PARTNER COWS — Supabase cows + DFMS assigned cows
// ============================================================

// GET /api/partner/cows
export const getMyCows = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    // 1. Supabase cows directly assigned to this partner (cameras etc.)
    const { data: supabaseCows, error } = await db
      .from("cows")
      .select("*")
      .eq("assigned_user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const supabaseMapped = (supabaseCows || []).map(c => ({ ...c, source: "supabase" }));

    // 2. DFMS cows assigned via cow_assignments table
    const { data: assignments } = await db
      .from("cow_assignments")
      .select("cow_id")
      .eq("customer_id", req.user.id);

    let dfmsCows = [];
    if (assignments?.length > 0 && _dfmsReady()) {
      try {
        const url = `${_dfmsBase()}/api/super-admin/admins/${_dfmsId()}/cows`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${_dfmsToken()}` } });
        if (resp.ok) {
          const result = await resp.json();
          const allDfms = result.cows || result.data || [];
          const assignedIds = new Set(assignments.map(a => String(a.cow_id)));
          dfmsCows = allDfms
            .filter(c => assignedIds.has(String(c.id)))
            .map(c => {
              const ageYears = parseFloat(c.age) || 0;
              const st = (c.status || "").toLowerCase();
              return {
                id: String(c.id),
                tag_number: c.tag_number || "",
                breed: c.breed || "Unknown",
                age: Math.round(ageYears * 12),
                milk_production: parseFloat(c.average_milk_production) || 0,
                health_status: st === "sick" ? "Needs Check" : st === "dry" ? "Stable" : "Healthy",
                status: c.status || "active",
                live_feed_url: null,
                assigned_user_id: req.user.id,
                source: "dfms",
              };
            });
        }
      } catch (_) { /* DFMS not live yet — skip silently */ }
    }

    const all = [...supabaseMapped, ...dfmsCows];
    res.status(200).json({ success: true, count: all.length, data: all });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PARTNER PLOTS - only assigned to logged-in partner
// ============================================================

// GET /api/partner/plots
export const getMyPlots = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("plots")
      .select("*")
      .eq("assigned_user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {      
    next(err);
  }
};

// GET /api/partner/plots/:id
export const getMyPlotById = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("plots")
      .select("*")
      .eq("id", req.params.id)
      .eq("assigned_user_id", req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Plot not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PARTNER PAYMENTS / TRANSACTIONS
// ============================================================

// GET /api/partner/transactions
export const getMyTransactions = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("payments")
      .select("*")
      .eq("user_id", req.user.id)
      .order("date", { ascending: false });

    if (error) throw error;

    const transactions = (data || []).map((p) => {
      const abs = Math.abs(Number(p.amount));
      const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      return {
        id: p.id,
        date: new Date(p.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
        amount: (p.amount >= 0 ? "+" : "-") + "₹" + formatted,
        status: "Completed",
        type_label: p.description || "Payment",
        type: p.amount >= 0 ? "returnLabel" : "investment",
        is_credit: p.amount >= 0,
      };
    });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PARTNER DOCUMENTS
// ============================================================

// GET /api/partner/documents
export const getMyDocuments = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("documents")
      .select("*")
      .eq("related_user_id", req.user.id)
      .order("upload_date", { ascending: false });

    if (error) throw error;
    
    console.log(`📄 Found ${data.length} documents`);
    
    // ADD THESE 3 LINES — prevent browser caching
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PARTNER NOTIFICATIONS
// ============================================================

export const getMyNotifications = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("notifications")
      .select("*")
      .eq("partner_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const enriched = (data || []).map((n) => ({
      ...n,
      time: _timeAgo(n.created_at),
    }));

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.id)
      .eq("partner_id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("partner_id", req.user.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SCHEDULE VISIT
// ============================================================

export const scheduleVisit = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { visit_type, visit_date, visit_time, notes } = req.body;
    if (!visit_type || !visit_date || !visit_time) {
      return res.status(400).json({
        success: false,
        message: "visit_type, visit_date, and visit_time are required",
      });
    }

    const { data, error } = await db
      .from("visit_schedules")
      .insert([{
        partner_id: req.user.id,
        visit_type, visit_date, visit_time, notes,
        status: "pending",
      }])
      .select()
      .single();

    if (error) throw error;

    // Fetch partner name for admin notification
    const { data: partner } = await db
      .from("partners")
      .select("name")
      .eq("id", req.user.id)
      .single();
    const partnerName = partner?.name || req.user.email || "A partner";

    // Notify admin
    await db.from("admin_notifications").insert([{
      title: "New Visit Request",
      message: `${partnerName} has requested a ${visit_type} on ${visit_date} at ${visit_time}`,
      type: "visit_request",
      partner_id: req.user.id,
      partner_name: partnerName,
      data: { visit_id: data.id, visit_type, visit_date, visit_time },
    }]);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMyVisits = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("visit_schedules")
      .select("*")
      .eq("partner_id", req.user.id)
      .order("visit_date", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SUPPORT CHAT
// ============================================================

export const getMySupportMessages = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("support_messages")
      .select("*")
      .eq("partner_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const sendSupportMessage = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const { data: userMsg, error: userErr } = await db
      .from("support_messages")
      .insert([{
        partner_id: req.user.id,
        message: message.trim(),
        is_from_bot: false,
        is_from_admin: false,
      }])
      .select().single();
    if (userErr) throw userErr;

    // Notify admin (fire-and-forget — don't block response)
    // `db` is captured from the outer closure, so this still hits the
    // correct tenant schema even though it runs after the response.
    db.from("partners").select("name").eq("id", req.user.id).single()
      .then(({ data: partner }) => {
        const partnerName = partner?.name || req.user.email || "A partner";
        const preview = message.trim().length > 80 ? message.trim().substring(0, 80) + "…" : message.trim();
        return db.from("admin_notifications").insert([{
          title: "New Support Message",
          message: `${partnerName}: "${preview}"`,
          type: "support_message",
          partner_id: req.user.id,
          partner_name: partnerName,
          data: { message_id: userMsg.id },
        }]);
      })
      .catch(() => {});

    res.status(201).json({ success: true, data: { user_message: userMsg } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// OWNERSHIP TRANSFER
// ============================================================

export const getMyTransfers = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("ownership_transfers")
      .select("*")
      .eq("from_partner_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const requestOwnershipTransfer = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { asset_type, asset_id, reason } = req.body;
    if (!asset_type) {
      return res.status(400).json({ success: false, message: "asset_type is required" });
    }

    const { data, error } = await db
      .from("ownership_transfers")
      .insert([{
        from_partner_id: req.user.id,
        asset_type, asset_id, reason,
        status: "pending",
      }])
      .select().single();

    if (error) throw error;

    // Fetch partner name and notify admin
    const { data: partner } = await db
      .from("partners")
      .select("name")
      .eq("id", req.user.id)
      .single();
    const partnerName = partner?.name || req.user.email || "A partner";

    await db.from("admin_notifications").insert([{
      title: "Ownership Transfer Request",
      message: `${partnerName} has requested an ownership transfer for ${asset_type}${reason ? `: "${reason}"` : ""}`,
      type: "ownership_transfer",
      partner_id: req.user.id,
      partner_name: partnerName,
      data: { transfer_id: data.id, asset_type, asset_id },
    }]);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PARTNER DASHBOARD
// ============================================================

export const cancelVisit = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: visit, error: fetchErr } = await db
      .from("visit_schedules")
      .select("id, status")
      .eq("id", req.params.id)
      .eq("partner_id", req.user.id)
      .single();
    if (fetchErr || !visit) return res.status(404).json({ success: false, message: "Visit not found" });
    if (visit.status !== "pending") return res.status(400).json({ success: false, message: "Only pending visits can be cancelled" });

    const { error } = await db.from("visit_schedules").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Visit cancelled" });
  } catch (err) {
    next(err);
  }
};

export const cancelTransfer = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: transfer, error: fetchErr } = await db
      .from("ownership_transfers")
      .select("id, status")
      .eq("id", req.params.id)
      .eq("from_partner_id", req.user.id)
      .single();
    if (fetchErr || !transfer) return res.status(404).json({ success: false, message: "Transfer not found" });
    if (transfer.status !== "pending") return res.status(400).json({ success: false, message: "Only pending transfers can be cancelled" });

    const { error } = await db.from("ownership_transfers").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Transfer cancelled" });
  } catch (err) {
    next(err);
  }
};

export const getMyDashboard = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const partnerId = req.user.id;

    const [plotsRes, paymentsRes, notifRes, cowCountRes] = await Promise.all([
      db.from("plots").select("status, total_price, paid_amount").eq("assigned_user_id", partnerId),
      db.from("payments").select("amount").eq("user_id", partnerId),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("partner_id", partnerId).eq("is_read", false),
      db.from("cow_assignments").select("id", { count: "exact", head: true }).eq("customer_id", partnerId),
    ]);

    const plots = plotsRes.data || [];
    const totalPortfolio = plots.reduce((s, p) => s + Number(p.total_price || 0), 0);
    const totalPaid = plots.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
    const totalRevenue = (paymentsRes.data || [])
      .filter((p) => Number(p.amount) > 0)
      .reduce((s, p) => s + Number(p.amount), 0);
    const growthPercent = totalPaid > 0 ? Math.round((totalRevenue / totalPaid) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        portfolio_value: totalPortfolio,
        total_invested: totalPaid,
        active_plots: plots.length,
        total_returns: totalRevenue,
        unread_notifications: notifRes.count || 0,
        cattle_owned: cowCountRes.count || 0,
        portfolio_growth_percent: growthPercent,
      },
    });
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function _generateBotReply(userMessage) {
  const text = userMessage.toLowerCase();
  if (text.includes("plot")) {
    return "I see you're inquiring about your plots. You can view all your plots in the Plots tab. For specific plot details, please share the plot number.";
  }
  if (text.includes("cow") || text.includes("cattle") || text.includes("livestock")) {
    return "Your livestock portfolio details are available in the Cattle tab. For specific concerns, our farm specialist will reach out within 24 hours.";
  }
  if (text.includes("payment") || text.includes("transaction")) {
    return "You can find all your transactions in the Transaction Hub from the side menu. For payment-related queries, our finance team will assist you shortly.";
  }
  if (text.includes("document")) {
    return "Your documents are available in the Digital Vault. You can download certificates and agreements from there.";
  }
  if (text.includes("hello") || text.includes("hi")) {
    return "Greetings! I'm your ETOR concierge. How may I assist you with your portfolio today?";
  }
  return "I'm connecting you with a Senior Success Manager. Estimated wait time: 45 seconds. In the meantime, you can browse our Help Center.";
}