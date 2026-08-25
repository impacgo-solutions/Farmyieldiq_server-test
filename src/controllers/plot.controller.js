// import { supabase } from "../config/supabase.js";

// const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// // GET /api/plots?layout_id=&block_id=&status=&assigned_user_id=
// export const getAllPlots = async (req, res, next) => {
//   try {
//     let query = supabase.from("plots").select("*").order("created_at", { ascending: false });

//     const { layout_id, block_id, status, assigned_user_id, payment_status } = req.query;
//     if (layout_id) query = query.eq("layout_id", layout_id);
//     if (block_id) query = query.eq("block_id", block_id);
//     if (status) query = query.eq("status", status);
//     if (assigned_user_id) query = query.eq("assigned_user_id", assigned_user_id);
//     if (payment_status) query = query.eq("payment_status", payment_status);

//     const { data, error } = await query;
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/plots/:id
// export const getPlotById = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("plots")
//       .select("*")
//       .eq("id", req.params.id)
//       .single();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Plot not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/plots (upsert)
// export const upsertPlot = async (req, res, next) => {
//   try {
//     const body = { ...req.body };
//     const required = ["layout_id", "block_id", "plot_number", "survey_number", "length", "width", "area", "facing", "status", "price_per_sqft", "total_price"];
//     for (const field of required) {
//       if (body[field] === undefined || body[field] === null || body[field] === "") {
//         return res.status(400).json({ success: false, message: `${field} is required` });
//       }
//     }

//     // Validate layout_id and block_id are UUIDs
//     if (!UUID_REGEX.test(body.layout_id)) {
//       return res.status(400).json({ success: false, message: "layout_id must be a valid UUID" });
//     }
//     if (!UUID_REGEX.test(body.block_id)) {
//       return res.status(400).json({ success: false, message: "block_id must be a valid UUID" });
//     }

//     // Strip non-UUID id (let DB generate one)
//     if (body.id && !UUID_REGEX.test(body.id)) {
//       delete body.id;
//     }

//     // Auto-calc balance if missing
//     if (body.balance_amount === undefined) {
//       body.balance_amount = body.total_price - (body.paid_amount || 0);
//     }

//     const { data, error } = await supabase.from("plots").upsert(body).select().single();
//     if (error) throw error;
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PUT /api/plots/:id
// export const updatePlot = async (req, res, next) => {
//   try {
//     const updates = { ...req.body };
//     if (updates.paid_amount !== undefined && updates.total_price !== undefined) {
//       updates.balance_amount = updates.total_price - updates.paid_amount;
//     }

//     const { data, error } = await supabase
//       .from("plots")
//       .update(updates)
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/plots/:id/status
// export const updatePlotStatus = async (req, res, next) => {
//   try {
//     const { status } = req.body;
//     if (!status) return res.status(400).json({ success: false, message: "status is required" });

//     const { data, error } = await supabase
//       .from("plots")
//       .update({ status })
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/plots/:id/payment
// export const updatePayment = async (req, res, next) => {
//   try {
//     const { paid_amount } = req.body;
//     if (paid_amount === undefined) {
//       return res.status(400).json({ success: false, message: "paid_amount is required" });
//     }

//     const { data: plot, error: fetchError } = await supabase
//       .from("plots").select("total_price").eq("id", req.params.id).single();
//     if (fetchError) throw fetchError;

//     const balance = plot.total_price - paid_amount;
//     let payment_status = "Not Paid";
//     if (paid_amount >= plot.total_price) payment_status = "Fully Paid";
//     else if (paid_amount > 0) payment_status = "Partially Paid";

//     const { data, error } = await supabase
//       .from("plots")
//       .update({ paid_amount, balance_amount: balance, payment_status })
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/plots/assign
// export const assignPlotsToUser = async (req, res, next) => {
//   try {
//     const { user_id, plot_ids } = req.body;
//     if (!user_id || !Array.isArray(plot_ids) || plot_ids.length === 0) {
//       return res.status(400).json({ success: false, message: "user_id and plot_ids[] are required" });
//     }

//     const { data, error } = await supabase
//       .from("plots")
//       .update({ assigned_user_id: user_id })
//       .in("id", plot_ids)
//       .select();

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/plots/:id
// export const deletePlot = async (req, res, next) => {
//   try {
//     const { error } = await supabase.from("plots").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Plot deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/plots?layout_id=&block_id=&status=&assigned_user_id=
export const getAllPlots = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    let query = db.from("plots").select("*").order("created_at", { ascending: false });

    const { layout_id, block_id, status, assigned_user_id, payment_status } = req.query;
    if (layout_id) query = query.eq("layout_id", layout_id);
    if (block_id) query = query.eq("block_id", block_id);
    if (status) query = query.eq("status", status);
    if (assigned_user_id) query = query.eq("assigned_user_id", assigned_user_id);
    if (payment_status) query = query.eq("payment_status", payment_status);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/plots/:id
export const getPlotById = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("plots")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Plot not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/plots (upsert)
export const upsertPlot = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const body = { ...req.body };
    const required = ["layout_id", "block_id", "plot_number", "survey_number", "length", "width", "area", "facing", "status", "price_per_sqft", "total_price"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    // Validate layout_id and block_id are UUIDs
    if (!UUID_REGEX.test(body.layout_id)) {
      return res.status(400).json({ success: false, message: "layout_id must be a valid UUID" });
    }
    if (!UUID_REGEX.test(body.block_id)) {
      return res.status(400).json({ success: false, message: "block_id must be a valid UUID" });
    }

    // Strip non-UUID id (let DB generate one)
    if (body.id && !UUID_REGEX.test(body.id)) {
      delete body.id;
    }

    // Auto-calc balance if missing
    if (body.balance_amount === undefined) {
      body.balance_amount = body.total_price - (body.paid_amount || 0);
    }

    const { data, error } = await db.from("plots").upsert(body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/plots/:id
export const updatePlot = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const updates = { ...req.body };
    if (updates.paid_amount !== undefined && updates.total_price !== undefined) {
      updates.balance_amount = updates.total_price - updates.paid_amount;
    }

    const { data, error } = await db
      .from("plots")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/plots/:id/status
export const updatePlotStatus = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });

    const { data, error } = await db
      .from("plots")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/plots/:id/payment
export const updatePayment = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { paid_amount } = req.body;
    if (paid_amount === undefined) {
      return res.status(400).json({ success: false, message: "paid_amount is required" });
    }

    const { data: plot, error: fetchError } = await db
      .from("plots").select("total_price").eq("id", req.params.id).single();
    if (fetchError) throw fetchError;

    const balance = plot.total_price - paid_amount;
    let payment_status = "Not Paid";
    if (paid_amount >= plot.total_price) payment_status = "Fully Paid";
    else if (paid_amount > 0) payment_status = "Partially Paid";

    const { data, error } = await db
      .from("plots")
      .update({ paid_amount, balance_amount: balance, payment_status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/plots/assign
export const assignPlotsToUser = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { user_id, plot_ids } = req.body;
    if (!user_id || !Array.isArray(plot_ids) || plot_ids.length === 0) {
      return res.status(400).json({ success: false, message: "user_id and plot_ids[] are required" });
    }

    const { data, error } = await db
      .from("plots")
      .update({ assigned_user_id: user_id })
      .in("id", plot_ids)
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/plots/:id
export const deletePlot = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db.from("plots").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Plot deleted" });
  } catch (err) {
    next(err);
  }
};