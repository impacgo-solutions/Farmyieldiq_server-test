// import bcrypt from "bcryptjs";
// import crypto from "crypto";
// import mime from "mime-types";
// import { supabase } from "../config/supabase.js";
// import { wouldCreateCycle } from "../utils/hierarchy.js";
// import { resolveAdminUserId } from "./employee.controller.js";

// // The Sales module's "team" is employee_accounts — there is no separate
// // sales_team_members table anymore (it held the exact same people as
// // employee_accounts, just duplicated). Column names differ slightly from
// // this file's original sales_team_members-era contract, so they're
// // aliased in the select to keep the JSON response shape — and therefore
// // the Flutter SalesProvider/SalesTeamMember model — completely unchanged:
// //   phone_number  -> phone
// //   created_at    -> joined_at
// // `password` is deliberately excluded — never send a password hash to the
// // frontend, even hashed.
// const TEAM_SELECT = "id, name, role_title, branch, email, phone:phone_number, commission_rate, target, reports_to_id, admin_user_id, joined_at:created_at";

// const LEAD_DOCUMENTS_BUCKET = "lead-documents";

// // GET /api/sales/team
// export const getTeam = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("employee_accounts")
//       .select(TEAM_SELECT)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/sales/team
// // A holdover from the old sales_team_members-only flow, kept working for
// // the (currently hidden) Team tab — this now creates a full employee_accounts
// // login. Since that screen never collects a password (or, previously, even
// // required an email), both are generated when missing so this endpoint's
// // required fields stay exactly what they always were (name + roleTitle) —
// // employee_accounts' email UNIQUE NOT NULL constraint is an implementation
// // detail this endpoint absorbs, not something its caller needs to know about.
// export const addTeamMember = async (req, res, next) => {
//   try {
//     const { name, roleTitle, branch, email, phone, commissionRate, target, reportsToId } = req.body;
//     if (!name || !roleTitle) {
//       return res.status(400).json({ success: false, message: "name and roleTitle are required" });
//     }

//     const normalizedEmail = (email && email.trim() ? email : `${crypto.randomUUID()}@team.placeholder.local`).toLowerCase().trim();
//     const generatedPassword = crypto.randomBytes(16).toString("hex");
//     const hashedPassword = await bcrypt.hash(generatedPassword, 10);
//     const adminUserId = await resolveAdminUserId();

//     const { data, error } = await supabase
//       .from("employee_accounts")
//       .insert([{
//         name,
//         role_title: roleTitle,
//         branch: branch || null,
//         email: normalizedEmail,
//         password: hashedPassword,
//         phone_number: phone || null,
//         commission_rate: commissionRate ?? 1.0,
//         target: target ?? 0,
//         reports_to_id: reportsToId ?? null,
//         is_active: true,
//         admin_user_id: adminUserId,
//       }])
//       .select(TEAM_SELECT)
//       .single();

//     if (error) {
//       if (error.code === "23505") return res.status(409).json({ success: false, message: "This email is already in use" });
//       throw error;
//     }
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PUT /api/sales/team/:id
// export const updateTeamMember = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { target, commissionRate, reportsToId } = req.body;

//     const updates = {};
//     if (target !== undefined) updates.target = target;
//     if (commissionRate !== undefined) updates.commission_rate = commissionRate;

//     if (Object.prototype.hasOwnProperty.call(req.body, "reportsToId")) {
//       if (reportsToId === id) {
//         return res.status(400).json({ success: false, message: "An agent can't report to themselves" });
//       }
//       if (reportsToId) {
//         const { data: allRows, error: rowsError } = await supabase.from("employee_accounts").select("id, reports_to_id");
//         if (rowsError) throw rowsError;
//         if (wouldCreateCycle(allRows, id, reportsToId)) {
//           return res.status(400).json({ success: false, message: "That would create a reporting cycle" });
//         }
//       }
//       updates.reports_to_id = reportsToId ?? null;
//     }

//     const { data, error } = await supabase
//       .from("employee_accounts")
//       .update(updates)
//       .eq("id", id)
//       .select(TEAM_SELECT)
//       .maybeSingle();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Team member not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/sales/team/:id
// // employee_accounts and sales_team_members are the same table now, so this
// // removes the underlying employee login entirely — same as deleting them
// // from the Employees screen.
// export const deleteTeamMember = async (req, res, next) => {
//   try {
//     const { data: existing, error: fetchError } = await supabase
//       .from("employee_accounts").select("id").eq("id", req.params.id).maybeSingle();
//     if (fetchError) throw fetchError;
//     if (!existing) return res.status(404).json({ success: false, message: "Team member not found" });

//     const { error } = await supabase.from("employee_accounts").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Team member deleted" });
//   } catch (err) {
//     next(err);
//   }
// };

// // ── Leads ────────────────────────────────────────────────────────────────
// // sales_leads has no FK to employee_accounts (same reasoning as elsewhere
// // in this codebase — keeps a lead from erroring out if its agent is later
// // removed) — assigned_to_name is resolved and merged in JS instead.

// // GET /api/sales/leads
// export const getLeads = async (req, res, next) => {
//   try {
//     const { data: leads, error } = await supabase.from("sales_leads").select("*").order("created_at", { ascending: false });
//     if (error) throw error;

//     const { data: team, error: teamError } = await supabase.from("employee_accounts").select("id, name");
//     if (teamError) throw teamError;
//     const nameById = new Map((team ?? []).map((t) => [t.id, t.name]));

//     const leadIds = leads.map((l) => l.id);
//     const notesByLead = new Map();
//     if (leadIds.length > 0) {
//       const { data: notes, error: notesError } = await supabase
//         .from("sales_notes").select("*").in("lead_id", leadIds).order("created_at", { ascending: true });
//       if (notesError) throw notesError;
//       for (const n of notes) {
//         const list = notesByLead.get(n.lead_id) ?? [];
//         list.push(n);
//         notesByLead.set(n.lead_id, list);
//       }
//     }

//     const data = leads.map((l) => ({
//       ...l,
//       assigned_to_name: nameById.get(l.assigned_to_id) ?? null,
//       notes: notesByLead.get(l.id) ?? [],
//     }));

//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/sales/leads
// export const createLead = async (req, res, next) => {
//   try {
//     const {
//       name, phone, email, project, budget, temperature, source, assignedToId, author,
//       marketValue, totalAmount, registrationCharges, stampDuty, userCharges,
//     } = req.body;
//     if (!name || !phone) {
//       return res.status(400).json({ success: false, message: "name and phone are required" });
//     }

//     // The deal-financials fields (market value, total amount, registration
//     // charges, stamp duty, user charges) are all optional — most leads are
//     // created before any of this is known — so each is only stored when
//     // actually provided, otherwise left null rather than defaulted to 0.
//     const toNullableNumber = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

//     const { data: lead, error } = await supabase
//       .from("sales_leads")
//       .insert([{
//         name,
//         phone,
//         email: email || null,
//         project: project || null,
//         budget: Number(budget) || 0,
//         temperature: temperature || "new",
//         source: source || "Walk-in",
//         assigned_to_id: assignedToId || null,
//         status: "new",
//         market_value: toNullableNumber(marketValue),
//         total_amount: toNullableNumber(totalAmount),
//         registration_charges: toNullableNumber(registrationCharges),
//         stamp_duty: toNullableNumber(stampDuty),
//         user_charges: toNullableNumber(userCharges),
//       }])
//       .select("*")
//       .single();
//     if (error) throw error;

//     let agentName = null;
//     if (lead.assigned_to_id) {
//       const { data: agent } = await supabase.from("employee_accounts").select("name").eq("id", lead.assigned_to_id).maybeSingle();
//       agentName = agent?.name ?? null;
//     }

//     const { data: note, error: noteError } = await supabase
//       .from("sales_notes")
//       .insert([{ lead_id: lead.id, type: "note", text: `Lead created and assigned to ${agentName ?? "an agent"}.`, author: author || "Admin" }])
//       .select("*")
//       .single();
//     if (noteError) throw noteError;

//     res.status(201).json({ success: true, data: { ...lead, assigned_to_name: agentName, notes: [note] } });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/sales/leads/:id/document (multipart/form-data)
// // Kept separate from createLead so a plain lead can still be created with a
// // simple JSON request — the file (if any) is attached in a second step
// // right after, from the Add Lead dialog. See SalesProvider.addLead.
// export const uploadLeadDocument = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     if (!req.file) return res.status(400).json({ success: false, message: "file is required" });

//     const { data: existing, error: fetchError } = await supabase.from("sales_leads").select("id").eq("id", id).maybeSingle();
//     if (fetchError) throw fetchError;
//     if (!existing) return res.status(404).json({ success: false, message: "Lead not found" });

//     const filePath = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
//     const contentType = mime.lookup(req.file.originalname) || req.file.mimetype;
//     const { error: uploadError } = await supabase.storage
//       .from(LEAD_DOCUMENTS_BUCKET)
//       .upload(filePath, req.file.buffer, { contentType, upsert: false });
//     if (uploadError) throw uploadError;

//     const { data: urlData } = supabase.storage.from(LEAD_DOCUMENTS_BUCKET).getPublicUrl(filePath);

//     const { data, error } = await supabase
//       .from("sales_leads")
//       .update({ document_url: urlData.publicUrl, document_file_name: req.file.originalname })
//       .eq("id", id)
//       .select("*")
//       .single();
//     if (error) throw error;

//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PUT /api/sales/leads/:id
// export const updateLead = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { temperature, status, assignedToId, nextFollowUp } = req.body;

//     const updates = {};
//     if (temperature !== undefined) updates.temperature = temperature;
//     if (status !== undefined) updates.status = status;
//     if (Object.prototype.hasOwnProperty.call(req.body, "assignedToId")) updates.assigned_to_id = assignedToId;
//     if (Object.prototype.hasOwnProperty.call(req.body, "nextFollowUp")) updates.next_follow_up = nextFollowUp;

//     const { data, error } = await supabase.from("sales_leads").update(updates).eq("id", id).select("*").maybeSingle();
//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Lead not found" });

//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/sales/leads/:id
// export const deleteLead = async (req, res, next) => {
//   try {
//     const { data: existing, error: fetchError } = await supabase
//       .from("sales_leads").select("id").eq("id", req.params.id).maybeSingle();
//     if (fetchError) throw fetchError;
//     if (!existing) return res.status(404).json({ success: false, message: "Lead not found" });

//     await supabase.from("sales_notes").delete().eq("lead_id", req.params.id);
//     const { error } = await supabase.from("sales_leads").delete().eq("id", req.params.id);
//     if (error) throw error;

//     res.status(200).json({ success: true, message: "Lead deleted" });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/sales/leads/:id/notes
// export const addLeadNote = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { type, text, author } = req.body;
//     if (!text) return res.status(400).json({ success: false, message: "text is required" });

//     const { data, error } = await supabase
//       .from("sales_notes")
//       .insert([{ lead_id: id, type: type || "note", text, author: author || "Admin" }])
//       .select("*")
//       .single();
//     if (error) throw error;

//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/sales/leads/:id/convert
// export const convertLeadToBooking = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { unitNo, amount, paymentPlan, author } = req.body;
//     if (!unitNo || amount === undefined || amount === null || !paymentPlan) {
//       return res.status(400).json({ success: false, message: "unitNo, amount and paymentPlan are required" });
//     }

//     const { data: lead, error: leadError } = await supabase.from("sales_leads").select("*").eq("id", id).maybeSingle();
//     if (leadError) throw leadError;
//     if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

//     let agentName = null;
//     if (lead.assigned_to_id) {
//       const { data: agent } = await supabase.from("employee_accounts").select("name").eq("id", lead.assigned_to_id).maybeSingle();
//       agentName = agent?.name ?? null;
//     }

//     const { data: booking, error: bookingError } = await supabase
//       .from("sales_bookings")
//       .insert([{
//         lead_id: lead.id,
//         lead_name: lead.name,
//         phone: lead.phone,
//         project: lead.project,
//         agent_id: lead.assigned_to_id,
//         agent_name: agentName,
//         unit_no: unitNo,
//         amount: Number(amount),
//         payment_plan: paymentPlan,
//       }])
//       .select("*")
//       .single();
//     if (bookingError) throw bookingError;

//     const { data: updatedLead, error: updateError } = await supabase
//       .from("sales_leads")
//       .update({ status: "booked", next_follow_up: null })
//       .eq("id", id)
//       .select("*")
//       .single();
//     if (updateError) throw updateError;

//     const { data: note, error: noteError } = await supabase
//       .from("sales_notes")
//       .insert([{ lead_id: id, type: "status_change", text: `Converted to booking — unit ${unitNo}, ₹${amount}.`, author: author || "Admin" }])
//       .select("*")
//       .single();
//     if (noteError) throw noteError;

//     res.status(201).json({ success: true, data: { lead: updatedLead, booking, note } });
//   } catch (err) {
//     next(err);
//   }
// };

// // ── Bookings ─────────────────────────────────────────────────────────────

// // GET /api/sales/bookings
// export const getBookings = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase.from("sales_bookings").select("*").order("booked_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { tenantDb } from "../utils/tenantDb.js";
import { saveFile } from "../utils/localStorage.js";
import { wouldCreateCycle } from "../utils/hierarchy.js";
import { resolveAdminUserId } from "./employee.controller.js";

// The Sales module's "team" is employee_accounts — there is no separate
// sales_team_members table anymore (it held the exact same people as
// employee_accounts, just duplicated). Column names differ slightly from
// this file's original sales_team_members-era contract, so they're
// aliased in the select to keep the JSON response shape — and therefore
// the Flutter SalesProvider/SalesTeamMember model — completely unchanged:
//   phone_number  -> phone
//   created_at    -> joined_at
// `password` is deliberately excluded — never send a password hash to the
// frontend, even hashed.
const TEAM_SELECT = "id, name, role_title, branch, email, phone:phone_number, commission_rate, target, reports_to_id, admin_user_id, joined_at:created_at";

// GET /api/sales/team
export const getTeam = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("employee_accounts")
      .select(TEAM_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/team
// A holdover from the old sales_team_members-only flow, kept working for
// the (currently hidden) Team tab — this now creates a full employee_accounts
// login. Since that screen never collects a password (or, previously, even
// required an email), both are generated when missing so this endpoint's
// required fields stay exactly what they always were (name + roleTitle) —
// employee_accounts' email UNIQUE NOT NULL constraint is an implementation
// detail this endpoint absorbs, not something its caller needs to know about.
export const addTeamMember = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { name, roleTitle, branch, email, phone, commissionRate, target, reportsToId } = req.body;
    if (!name || !roleTitle) {
      return res.status(400).json({ success: false, message: "name and roleTitle are required" });
    }

    const normalizedEmail = (email && email.trim() ? email : `${crypto.randomUUID()}@team.placeholder.local`).toLowerCase().trim();
    const generatedPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const adminUserId = await resolveAdminUserId(req);

    const { data, error } = await db
      .from("employee_accounts")
      .insert([{
        name,
        role_title: roleTitle,
        branch: branch || null,
        email: normalizedEmail,
        password: hashedPassword,
        phone_number: phone || null,
        commission_rate: commissionRate ?? 1.0,
        target: target ?? 0,
        reports_to_id: reportsToId ?? null,
        is_active: true,
        admin_user_id: adminUserId,
      }])
      .select(TEAM_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ success: false, message: "This email is already in use" });
      throw error;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/sales/team/:id
export const updateTeamMember = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id } = req.params;
    const { target, commissionRate, reportsToId } = req.body;

    const updates = {};
    if (target !== undefined) updates.target = target;
    if (commissionRate !== undefined) updates.commission_rate = commissionRate;

    if (Object.prototype.hasOwnProperty.call(req.body, "reportsToId")) {
      if (reportsToId === id) {
        return res.status(400).json({ success: false, message: "An agent can't report to themselves" });
      }
      if (reportsToId) {
        const { data: allRows, error: rowsError } = await db.from("employee_accounts").select("id, reports_to_id");
        if (rowsError) throw rowsError;
        if (wouldCreateCycle(allRows, id, reportsToId)) {
          return res.status(400).json({ success: false, message: "That would create a reporting cycle" });
        }
      }
      updates.reports_to_id = reportsToId ?? null;
    }

    const { data, error } = await db
      .from("employee_accounts")
      .update(updates)
      .eq("id", id)
      .select(TEAM_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Team member not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sales/team/:id
// employee_accounts and sales_team_members are the same table now, so this
// removes the underlying employee login entirely — same as deleting them
// from the Employees screen.
export const deleteTeamMember = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: existing, error: fetchError } = await db
      .from("employee_accounts").select("id").eq("id", req.params.id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ success: false, message: "Team member not found" });

    const { error } = await db.from("employee_accounts").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Team member deleted" });
  } catch (err) {
    next(err);
  }
};

// ── Leads ────────────────────────────────────────────────────────────────
// sales_leads has no FK to employee_accounts (same reasoning as elsewhere
// in this codebase — keeps a lead from erroring out if its agent is later
// removed) — assigned_to_name is resolved and merged in JS instead.

// GET /api/sales/leads
export const getLeads = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: leads, error } = await db.from("sales_leads").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const { data: team, error: teamError } = await db.from("employee_accounts").select("id, name");
    if (teamError) throw teamError;
    const nameById = new Map((team ?? []).map((t) => [t.id, t.name]));

    const leadIds = leads.map((l) => l.id);
    const notesByLead = new Map();
    if (leadIds.length > 0) {
      const { data: notes, error: notesError } = await db
        .from("sales_notes").select("*").in("lead_id", leadIds).order("created_at", { ascending: true });
      if (notesError) throw notesError;
      for (const n of notes) {
        const list = notesByLead.get(n.lead_id) ?? [];
        list.push(n);
        notesByLead.set(n.lead_id, list);
      }
    }

    const data = leads.map((l) => ({
      ...l,
      assigned_to_name: nameById.get(l.assigned_to_id) ?? null,
      notes: notesByLead.get(l.id) ?? [],
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/leads
export const createLead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const {
      name, phone, email, project, budget, temperature, source, assignedToId, author,
      marketValue, totalAmount, registrationCharges, stampDuty, userCharges,
    } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "name and phone are required" });
    }

    // The deal-financials fields (market value, total amount, registration
    // charges, stamp duty, user charges) are all optional — most leads are
    // created before any of this is known — so each is only stored when
    // actually provided, otherwise left null rather than defaulted to 0.
    const toNullableNumber = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

    const { data: lead, error } = await db
      .from("sales_leads")
      .insert([{
        name,
        phone,
        email: email || null,
        project: project || null,
        budget: Number(budget) || 0,
        temperature: temperature || "new",
        source: source || "Walk-in",
        assigned_to_id: assignedToId || null,
        status: "new",
        market_value: toNullableNumber(marketValue),
        total_amount: toNullableNumber(totalAmount),
        registration_charges: toNullableNumber(registrationCharges),
        stamp_duty: toNullableNumber(stampDuty),
        user_charges: toNullableNumber(userCharges),
      }])
      .select("*")
      .single();
    if (error) throw error;

    let agentName = null;
    if (lead.assigned_to_id) {
      const { data: agent } = await db.from("employee_accounts").select("name").eq("id", lead.assigned_to_id).maybeSingle();
      agentName = agent?.name ?? null;
    }

    const { data: note, error: noteError } = await db
      .from("sales_notes")
      .insert([{ lead_id: lead.id, type: "note", text: `Lead created and assigned to ${agentName ?? "an agent"}.`, author: author || "Admin" }])
      .select("*")
      .single();
    if (noteError) throw noteError;

    res.status(201).json({ success: true, data: { ...lead, assigned_to_name: agentName, notes: [note] } });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/leads/:id/document (multipart/form-data)
// Kept separate from createLead so a plain lead can still be created with a
// simple JSON request — the file (if any) is attached in a second step
// right after, from the Add Lead dialog. See SalesProvider.addLead.
export const uploadLeadDocument = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: "file is required" });

    const { data: existing, error: fetchError } = await db.from("sales_leads").select("id").eq("id", id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ success: false, message: "Lead not found" });

    const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
    const documentUrl = await saveFile(req.file.buffer, "leads", filename);

    const { data, error } = await db
      .from("sales_leads")
      .update({ document_url: documentUrl, document_file_name: req.file.originalname })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/sales/leads/:id
export const updateLead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id } = req.params;
    const { temperature, status, assignedToId, nextFollowUp } = req.body;

    const updates = {};
    if (temperature !== undefined) updates.temperature = temperature;
    if (status !== undefined) updates.status = status;
    if (Object.prototype.hasOwnProperty.call(req.body, "assignedToId")) updates.assigned_to_id = assignedToId;
    if (Object.prototype.hasOwnProperty.call(req.body, "nextFollowUp")) updates.next_follow_up = nextFollowUp;

    const { data, error } = await db.from("sales_leads").update(updates).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Lead not found" });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sales/leads/:id
export const deleteLead = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: existing, error: fetchError } = await db
      .from("sales_leads").select("id").eq("id", req.params.id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ success: false, message: "Lead not found" });

    await db.from("sales_notes").delete().eq("lead_id", req.params.id);
    const { error } = await db.from("sales_leads").delete().eq("id", req.params.id);
    if (error) throw error;

    res.status(200).json({ success: true, message: "Lead deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/leads/:id/notes
export const addLeadNote = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id } = req.params;
    const { type, text, author } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "text is required" });

    const { data, error } = await db
      .from("sales_notes")
      .insert([{ lead_id: id, type: type || "note", text, author: author || "Admin" }])
      .select("*")
      .single();
    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales/leads/:id/convert
export const convertLeadToBooking = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id } = req.params;
    const { unitNo, amount, paymentPlan, author } = req.body;
    if (!unitNo || amount === undefined || amount === null || !paymentPlan) {
      return res.status(400).json({ success: false, message: "unitNo, amount and paymentPlan are required" });
    }

    const { data: lead, error: leadError } = await db.from("sales_leads").select("*").eq("id", id).maybeSingle();
    if (leadError) throw leadError;
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    let agentName = null;
    if (lead.assigned_to_id) {
      const { data: agent } = await db.from("employee_accounts").select("name").eq("id", lead.assigned_to_id).maybeSingle();
      agentName = agent?.name ?? null;
    }

    const { data: booking, error: bookingError } = await db
      .from("sales_bookings")
      .insert([{
        lead_id: lead.id,
        lead_name: lead.name,
        phone: lead.phone,
        project: lead.project,
        agent_id: lead.assigned_to_id,
        agent_name: agentName,
        unit_no: unitNo,
        amount: Number(amount),
        payment_plan: paymentPlan,
      }])
      .select("*")
      .single();
    if (bookingError) throw bookingError;

    const { data: updatedLead, error: updateError } = await db
      .from("sales_leads")
      .update({ status: "booked", next_follow_up: null })
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) throw updateError;

    const { data: note, error: noteError } = await db
      .from("sales_notes")
      .insert([{ lead_id: id, type: "status_change", text: `Converted to booking — unit ${unitNo}, ₹${amount}.`, author: author || "Admin" }])
      .select("*")
      .single();
    if (noteError) throw noteError;

    res.status(201).json({ success: true, data: { lead: updatedLead, booking, note } });
  } catch (err) {
    next(err);
  }
};

// ── Bookings ─────────────────────────────────────────────────────────────

// GET /api/sales/bookings
export const getBookings = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db.from("sales_bookings").select("*").order("booked_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};