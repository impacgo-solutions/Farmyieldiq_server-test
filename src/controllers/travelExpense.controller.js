// import mime from "mime-types";
// import { supabase } from "../config/supabase.js";
// import { getDirectReportIds } from "../utils/hierarchy.js";

// const BUCKET = "receipts";
// // employee_id is usually an employee_accounts id, but has no FK constraint —
// // the super admin can also submit their own expense (employee_id = an
// // admin_users id), and Postgres can't FK a column to "one of two tables".
// // That also means we can't use Supabase's auto-embed (`select("*, x:y(...)")`)
// // since PostgREST needs a declared FK to know the relationship — so employee
// // name/role are looked up and merged in JS instead (see _attachEmployeeInfo).
// const EXPENSE_SELECT = "*";

// const _attachEmployeeInfo = async (rows) => {
//   const ids = [...new Set(rows.map((r) => r.employee_id))];
//   if (ids.length === 0) return rows;

//   const [{ data: employees }, { data: admins }] = await Promise.all([
//     supabase.from("employee_accounts").select("id, name, role_title").in("id", ids),
//     supabase.from("admin_users").select("id, name, role").in("id", ids),
//   ]);

//   const infoById = new Map();
//   for (const a of admins || []) infoById.set(a.id, { name: a.name, role: a.role || "Super Admin" });
//   for (const e of employees || []) infoById.set(e.id, { name: e.name, role: e.role_title });

//   return rows.map((r) => {
//     const info = infoById.get(r.employee_id);
//     return { ...r, employee_name: info?.name || "Unknown", employee_role: info?.role || "" };
//   });
// };

// const _attachEmployeeInfoSingle = async (row) => (await _attachEmployeeInfo([row]))[0];

// // True if the caller (from the JWT) is the super admin, i.e. their id is an
// // admin_users row rather than an employee_accounts row.
// const _isCallerSuperAdmin = async (callerId) => {
//   const { data } = await supabase.from("admin_users").select("id").eq("id", callerId).maybeSingle();
//   return !!data;
// };

// // GET /api/travel-expenses/mine
// export const getMyExpenses = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .select(EXPENSE_SELECT)
//       .eq("employee_id", req.user.id)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/travel-expenses/team
// export const getTeamExpenses = async (req, res, next) => {
//   try {
//     const { data: rows, error: rowsError } = await supabase.from("employee_accounts").select("id, reports_to_id");
//     if (rowsError) throw rowsError;
//     const reportIds = getDirectReportIds(rows, req.user.id);

//     if (reportIds.length === 0) {
//       return res.status(200).json({ success: true, count: 0, data: [] });
//     }

//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .select(EXPENSE_SELECT)
//       .in("employee_id", reportIds)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/travel-expenses (super admin only)
// export const getAllExpenses = async (req, res, next) => {
//   try {
//     if (!(await _isCallerSuperAdmin(req.user.id))) {
//       return res.status(403).json({ success: false, message: "Only the super admin can view all expenses" });
//     }

//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .select(EXPENSE_SELECT)
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/travel-expenses (multipart/form-data, file optional)
// export const createExpense = async (req, res, next) => {
//   try {
//     const {
//       tripPurpose, travelDateFrom, travelDateTo, fromLocation, toLocation,
//       modeOfTravel, category, amount, currency, paidBy, description,
//     } = req.body;

//     if (!tripPurpose || !travelDateFrom || !fromLocation || !toLocation || !modeOfTravel || !category || !amount || !paidBy) {
//       return res.status(400).json({
//         success: false,
//         message: "tripPurpose, travelDateFrom, fromLocation, toLocation, modeOfTravel, category, amount and paidBy are required",
//       });
//     }
//     if (!["company", "employee"].includes(paidBy)) {
//       return res.status(400).json({ success: false, message: "paidBy must be 'company' or 'employee'" });
//     }

//     let receipt_url = null;
//     let receipt_file_name = null;
//     if (req.file) {
//       const filePath = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
//       const contentType = mime.lookup(req.file.originalname) || req.file.mimetype;
//       const { error: uploadError } = await supabase.storage
//         .from(BUCKET)
//         .upload(filePath, req.file.buffer, { contentType, upsert: false });
//       if (uploadError) throw uploadError;

//       const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
//       receipt_url = urlData.publicUrl;
//       receipt_file_name = req.file.originalname;
//     }

//     // A trip made in a company vehicle needs no manager sign-off — it's
//     // auto-approved on submission. A trip in the employee's own vehicle
//     // still goes through the normal pending → manager-approval flow below
//     // (updateExpenseStatus), unchanged.
//     const autoApproved = modeOfTravel === "Company Vehicle";

//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .insert([{
//         employee_id: req.user.id,
//         trip_purpose: tripPurpose,
//         travel_date_from: travelDateFrom,
//         travel_date_to: travelDateTo || null,
//         from_location: fromLocation,
//         to_location: toLocation,
//         mode_of_travel: modeOfTravel,
//         category,
//         amount: Number(amount),
//         currency: currency || "INR",
//         paid_by: paidBy,
//         description: description || null,
//         receipt_url,
//         receipt_file_name,
//         status: autoApproved ? "approved" : "pending",
//         ...(autoApproved ? {
//           approved_at: new Date().toISOString(),
//           admin_note: "Auto-approved — company vehicle, no manager approval required",
//         } : {}),
//       }])
//       .select(EXPENSE_SELECT)
//       .single();

//     if (error) throw error;
//     res.status(201).json({ success: true, data: await _attachEmployeeInfoSingle(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // Shared authorization check for approve/reject/reimburse: caller must be
// // the expense owner's direct manager (reports_to_id), or the super admin.
// const _resolveExpenseAndAuthorize = async (req) => {
//   const { data: expense, error: expenseError } = await supabase
//     .from("travel_expenses").select("*").eq("id", req.params.id).single();
//   if (expenseError || !expense) return { error: { status: 404, message: "Expense not found" } };

//   const { data: owner } = await supabase
//     .from("employee_accounts").select("reports_to_id").eq("id", expense.employee_id).maybeSingle();
//   const isSuperAdmin = await _isCallerSuperAdmin(req.user.id);
//   const isDirectManager = owner?.reports_to_id === req.user.id;
//   if (!isSuperAdmin && !isDirectManager) {
//     return { error: { status: 403, message: "You are not authorized to act on this expense" } };
//   }
//   return { expense };
// };

// // PATCH /api/travel-expenses/:id/status
// export const updateExpenseStatus = async (req, res, next) => {
//   try {
//     const { status, admin_note } = req.body;
//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
//     }

//     const { expense, error: authError } = await _resolveExpenseAndAuthorize(req);
//     if (authError) return res.status(authError.status).json({ success: false, message: authError.message });

//     if (expense.status !== "pending") {
//       return res.status(400).json({ success: false, message: "Only pending expenses can be approved or rejected" });
//     }

//     const updates = {
//       status,
//       ...(admin_note ? { admin_note } : {}),
//       ...(status === "approved" ? { approved_at: new Date().toISOString() } : { rejected_at: new Date().toISOString() }),
//     };

//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .update(updates)
//       .eq("id", req.params.id)
//       .select(EXPENSE_SELECT)
//       .single();
//     if (error) throw error;
//     res.status(200).json({ success: true, data: await _attachEmployeeInfoSingle(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/travel-expenses/:id/reimburse
// export const reimburseExpense = async (req, res, next) => {
//   try {
//     const { reimbursement_note } = req.body;

//     const { expense, error: authError } = await _resolveExpenseAndAuthorize(req);
//     if (authError) return res.status(authError.status).json({ success: false, message: authError.message });

//     if (expense.status !== "approved" || expense.paid_by !== "employee") {
//       return res.status(400).json({ success: false, message: "Only approved, employee-paid expenses can be reimbursed" });
//     }

//     const { data, error } = await supabase
//       .from("travel_expenses")
//       .update({
//         status: "reimbursed",
//         reimbursed_at: new Date().toISOString(),
//         ...(reimbursement_note ? { reimbursement_note } : {}),
//       })
//       .eq("id", req.params.id)
//       .select(EXPENSE_SELECT)
//       .single();
//     if (error) throw error;
//     res.status(200).json({ success: true, data: await _attachEmployeeInfoSingle(data) });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/travel-expenses/:id
// export const deleteExpense = async (req, res, next) => {
//   try {
//     const { data: expense, error: fetchError } = await supabase
//       .from("travel_expenses").select("employee_id, status, receipt_url").eq("id", req.params.id).single();
//     if (fetchError || !expense) return res.status(404).json({ success: false, message: "Expense not found" });

//     const isSuperAdmin = await _isCallerSuperAdmin(req.user.id);
//     const isOwner = expense.employee_id === req.user.id;
//     if (!isSuperAdmin && !isOwner) {
//       return res.status(403).json({ success: false, message: "You are not authorized to delete this expense" });
//     }
//     if (expense.status !== "pending") {
//       return res.status(400).json({ success: false, message: "Only pending expenses can be deleted" });
//     }

//     if (expense.receipt_url) {
//       const parts = expense.receipt_url.split(`/${BUCKET}/`);
//       if (parts.length > 1) await supabase.storage.from(BUCKET).remove([parts[1]]);
//     }

//     const { error } = await supabase.from("travel_expenses").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Expense deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";
import { getDirectReportIds } from "../utils/hierarchy.js";
import { saveFile, deleteLocalFile } from "../utils/localStorage.js";
// employee_id is usually an employee_accounts id, but has no FK constraint —
// the super admin can also submit their own expense (employee_id = an
// admin_users id), and Postgres can't FK a column to "one of two tables".
// That also means we can't use Supabase's auto-embed (`select("*, x:y(...)")`)
// since PostgREST needs a declared FK to know the relationship — so employee
// name/role are looked up and merged in JS instead (see _attachEmployeeInfo).
const EXPENSE_SELECT = "*";

const _attachEmployeeInfo = async (req, rows) => {
  const db = tenantDb(req);
  const ids = [...new Set(rows.map((r) => r.employee_id))];
  if (ids.length === 0) return rows;

  const [{ data: employees }, { data: admins }] = await Promise.all([
    db.from("employee_accounts").select("id, name, role_title").in("id", ids),
    db.from("admin_users").select("id, name, role").in("id", ids),
  ]);

  const infoById = new Map();
  for (const a of admins || []) infoById.set(a.id, { name: a.name, role: a.role || "Super Admin" });
  for (const e of employees || []) infoById.set(e.id, { name: e.name, role: e.role_title });

  return rows.map((r) => {
    const info = infoById.get(r.employee_id);
    return { ...r, employee_name: info?.name || "Unknown", employee_role: info?.role || "" };
  });
};

const _attachEmployeeInfoSingle = async (req, row) => (await _attachEmployeeInfo(req, [row]))[0];

// True if the caller (from the JWT) is the super admin, i.e. their id is an
// admin_users row rather than an employee_accounts row.
const _isCallerSuperAdmin = async (req) => {
  const db = tenantDb(req);
  const { data } = await db.from("admin_users").select("id").eq("id", req.user.id).maybeSingle();
  return !!data;
};

// GET /api/travel-expenses/mine
export const getMyExpenses = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("travel_expenses")
      .select(EXPENSE_SELECT)
      .eq("employee_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(req, data) });
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-expenses/team
export const getTeamExpenses = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: rows, error: rowsError } = await db.from("employee_accounts").select("id, reports_to_id");
    if (rowsError) throw rowsError;
    const reportIds = getDirectReportIds(rows, req.user.id);

    if (reportIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const { data, error } = await db
      .from("travel_expenses")
      .select(EXPENSE_SELECT)
      .in("employee_id", reportIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(req, data) });
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-expenses (super admin only)
export const getAllExpenses = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    if (!(await _isCallerSuperAdmin(req))) {
      return res.status(403).json({ success: false, message: "Only the super admin can view all expenses" });
    }

    const { data, error } = await db
      .from("travel_expenses")
      .select(EXPENSE_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data: await _attachEmployeeInfo(req, data) });
  } catch (err) {
    next(err);
  }
};

// POST /api/travel-expenses (multipart/form-data, file optional)
export const createExpense = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const {
      tripPurpose, travelDateFrom, travelDateTo, fromLocation, toLocation,
      modeOfTravel, category, amount, currency, paidBy, description,
    } = req.body;

    if (!tripPurpose || !travelDateFrom || !fromLocation || !toLocation || !modeOfTravel || !category || !amount || !paidBy) {
      return res.status(400).json({
        success: false,
        message: "tripPurpose, travelDateFrom, fromLocation, toLocation, modeOfTravel, category, amount and paidBy are required",
      });
    }
    if (!["company", "employee"].includes(paidBy)) {
      return res.status(400).json({ success: false, message: "paidBy must be 'company' or 'employee'" });
    }

    let receipt_url = null;
    let receipt_file_name = null;
    if (req.file) {
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
      receipt_url = await saveFile(req.file.buffer, "receipts", filename);
      receipt_file_name = req.file.originalname;
    }

    // A trip made in a company vehicle needs no manager sign-off — it's
    // auto-approved on submission. A trip in the employee's own vehicle
    // still goes through the normal pending → manager-approval flow below
    // (updateExpenseStatus), unchanged.
    const autoApproved = modeOfTravel === "Company Vehicle";

    const { data, error } = await db
      .from("travel_expenses")
      .insert([{
        employee_id: req.user.id,
        trip_purpose: tripPurpose,
        travel_date_from: travelDateFrom,
        travel_date_to: travelDateTo || null,
        from_location: fromLocation,
        to_location: toLocation,
        mode_of_travel: modeOfTravel,
        category,
        amount: Number(amount),
        currency: currency || "INR",
        paid_by: paidBy,
        description: description || null,
        receipt_url,
        receipt_file_name,
        status: autoApproved ? "approved" : "pending",
        ...(autoApproved ? {
          approved_at: new Date().toISOString(),
          admin_note: "Auto-approved — company vehicle, no manager approval required",
        } : {}),
      }])
      .select(EXPENSE_SELECT)
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: await _attachEmployeeInfoSingle(req, data) });
  } catch (err) {
    next(err);
  }
};

// Shared authorization check for approve/reject/reimburse: caller must be
// the expense owner's direct manager (reports_to_id), or the super admin.
const _resolveExpenseAndAuthorize = async (req) => {
  const db = tenantDb(req);

  const { data: expense, error: expenseError } = await db
    .from("travel_expenses").select("*").eq("id", req.params.id).single();
  if (expenseError || !expense) return { error: { status: 404, message: "Expense not found" } };

  const { data: owner } = await db
    .from("employee_accounts").select("reports_to_id").eq("id", expense.employee_id).maybeSingle();
  const isSuperAdmin = await _isCallerSuperAdmin(req);
  const isDirectManager = owner?.reports_to_id === req.user.id;
  if (!isSuperAdmin && !isDirectManager) {
    return { error: { status: 403, message: "You are not authorized to act on this expense" } };
  }
  return { expense };
};

// PATCH /api/travel-expenses/:id/status
export const updateExpenseStatus = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { status, admin_note } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }

    const { expense, error: authError } = await _resolveExpenseAndAuthorize(req);
    if (authError) return res.status(authError.status).json({ success: false, message: authError.message });

    if (expense.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending expenses can be approved or rejected" });
    }

    const updates = {
      status,
      ...(admin_note ? { admin_note } : {}),
      ...(status === "approved" ? { approved_at: new Date().toISOString() } : { rejected_at: new Date().toISOString() }),
    };

    const { data, error } = await db
      .from("travel_expenses")
      .update(updates)
      .eq("id", req.params.id)
      .select(EXPENSE_SELECT)
      .single();
    if (error) throw error;
    res.status(200).json({ success: true, data: await _attachEmployeeInfoSingle(req, data) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/travel-expenses/:id/reimburse
export const reimburseExpense = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { reimbursement_note } = req.body;

    const { expense, error: authError } = await _resolveExpenseAndAuthorize(req);
    if (authError) return res.status(authError.status).json({ success: false, message: authError.message });

    if (expense.status !== "approved" || expense.paid_by !== "employee") {
      return res.status(400).json({ success: false, message: "Only approved, employee-paid expenses can be reimbursed" });
    }

    const { data, error } = await db
      .from("travel_expenses")
      .update({
        status: "reimbursed",
        reimbursed_at: new Date().toISOString(),
        ...(reimbursement_note ? { reimbursement_note } : {}),
      })
      .eq("id", req.params.id)
      .select(EXPENSE_SELECT)
      .single();
    if (error) throw error;
    res.status(200).json({ success: true, data: await _attachEmployeeInfoSingle(req, data) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/travel-expenses/:id
export const deleteExpense = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: expense, error: fetchError } = await db
      .from("travel_expenses").select("employee_id, status, receipt_url").eq("id", req.params.id).single();
    if (fetchError || !expense) return res.status(404).json({ success: false, message: "Expense not found" });

    const isSuperAdmin = await _isCallerSuperAdmin(req);
    const isOwner = expense.employee_id === req.user.id;
    if (!isSuperAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this expense" });
    }
    if (expense.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending expenses can be deleted" });
    }

    await deleteLocalFile(expense.receipt_url);

    const { error } = await db.from("travel_expenses").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (err) {
    next(err);
  }
};