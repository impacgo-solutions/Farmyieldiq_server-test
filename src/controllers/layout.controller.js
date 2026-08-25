// import { supabase } from "../config/supabase.js";

// const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// // GET /api/layouts
// export const getAllLayouts = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("layouts")
//       .select("*")
//       .order("created_at", { ascending: false });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/layouts/:id
// export const getLayoutById = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("layouts")
//       .select("*, blocks(*)")
//       .eq("id", req.params.id)
//       .single();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Layout not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/layouts (creates new — DB auto-generates UUID)
// export const upsertLayout = async (req, res, next) => {
//   try {
//     const { id, name, address, village_name } = req.body;

//     if (!name || !address || !village_name) {
//       return res.status(400).json({
//         success: false,
//         message: "name, address, and village_name are required",
//       });
//     }

//     const payload = { name, address, village_name };

//     // Only honor client-sent ID if it's a valid UUID (for updates)
//     if (id && UUID_REGEX.test(id)) {
//       payload.id = id;
//     }

//     const { data, error } = await supabase
//       .from("layouts")
//       .upsert(payload)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PUT /api/layouts/:id
// export const updateLayout = async (req, res, next) => {
//   try {
//     const { name, address, village_name } = req.body;
//     const { data, error } = await supabase
//       .from("layouts")
//       .update({ name, address, village_name })
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/layouts/:id
// export const deleteLayout = async (req, res, next) => {
//   try {
//     const { error } = await supabase.from("layouts").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Layout deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/layouts
export const getAllLayouts = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("layouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/layouts/:id
export const getLayoutById = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("layouts")
      .select("*, blocks(*)")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Layout not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/layouts (creates new — DB auto-generates UUID)
export const upsertLayout = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { id, name, address, village_name } = req.body;

    if (!name || !address || !village_name) {
      return res.status(400).json({
        success: false,
        message: "name, address, and village_name are required",
      });
    }

    const payload = { name, address, village_name };

    // Only honor client-sent ID if it's a valid UUID (for updates)
    if (id && UUID_REGEX.test(id)) {
      payload.id = id;
    }

    const { data, error } = await db
      .from("layouts")
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/layouts/:id
export const updateLayout = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { name, address, village_name } = req.body;
    const { data, error } = await db
      .from("layouts")
      .update({ name, address, village_name })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/layouts/:id
export const deleteLayout = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db.from("layouts").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Layout deleted" });
  } catch (err) {
    next(err);
  }
};