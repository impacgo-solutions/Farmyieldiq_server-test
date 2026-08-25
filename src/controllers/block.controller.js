// import { supabase } from "../config/supabase.js";

// const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// // GET /api/blocks?layout_id=xxx
// export const getAllBlocks = async (req, res, next) => {
//   try {
//     let query = supabase.from("blocks").select("*").order("created_at", { ascending: false });
//     if (req.query.layout_id) query = query.eq("layout_id", req.query.layout_id);

//     const { data, error } = await query;
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/blocks/:id
// export const getBlockById = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("blocks")
//       .select("*, plots(*)")
//       .eq("id", req.params.id)
//       .single();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Block not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/blocks (upsert)
// export const upsertBlock = async (req, res, next) => {
//   try {
//     const { id, name, layout_id, total_plots, description, layout_name } = req.body;

//     if (!name || !layout_id) {
//       return res.status(400).json({ success: false, message: "name and layout_id are required" });
//     }

//     // Validate layout_id is a UUID
//     if (!UUID_REGEX.test(layout_id)) {
//       return res.status(400).json({ success: false, message: "layout_id must be a valid UUID" });
//     }

//     const payload = { name, layout_id, total_plots: total_plots || 0, description, layout_name };

//     if (id && UUID_REGEX.test(id)) {
//       payload.id = id;
//     }

//     const { data, error } = await supabase.from("blocks").upsert(payload).select().single();
//     if (error) throw error;
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PUT /api/blocks/:id
// export const updateBlock = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("blocks")
//       .update(req.body)
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/blocks/:id
// export const deleteBlock = async (req, res, next) => {
//   try {
//     const { error } = await supabase.from("blocks").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Block deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/blocks?layout_id=xxx
export const getAllBlocks = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    let query = db.from("blocks").select("*").order("created_at", { ascending: false });
    if (req.query.layout_id) query = query.eq("layout_id", req.query.layout_id);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/blocks/:id
export const getBlockById = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("blocks")
      .select("*, plots(*)")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Block not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/blocks (upsert)
export const upsertBlock = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id, name, layout_id, total_plots, description, layout_name } = req.body;

    if (!name || !layout_id) {
      return res.status(400).json({ success: false, message: "name and layout_id are required" });
    }

    // Validate layout_id is a UUID
    if (!UUID_REGEX.test(layout_id)) {
      return res.status(400).json({ success: false, message: "layout_id must be a valid UUID" });
    }

    const payload = { name, layout_id, total_plots: total_plots || 0, description, layout_name };

    if (id && UUID_REGEX.test(id)) {
      payload.id = id;
    }

    const { data, error } = await db.from("blocks").upsert(payload).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/blocks/:id
export const updateBlock = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("blocks")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/blocks/:id
export const deleteBlock = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db.from("blocks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Block deleted" });
  } catch (err) {
    next(err);
  }
};