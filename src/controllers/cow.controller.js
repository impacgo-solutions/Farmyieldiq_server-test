// import { supabase } from "../config/supabase.js";

// const FARM_API = process.env.FARM_API_URL || "https://dfms.impacgo.com";

// // ── DFMS helpers ─────────────────────────────────────────────────────────────
// const dfmsBaseUrl  = () => process.env.DFMS_API_URL   || "https://dfms.impacgo.com";
// const dfmsAdminId  = () => process.env.DFMS_ADMIN_ID  || "";
// const dfmsToken    = () => process.env.DFMS_ADMIN_TOKEN || "";
// const dfmsReady    = () => Boolean(dfmsAdminId() && dfmsToken());

// async function fetchAllDfmsCows() {
//   if (!dfmsReady()) return [];
//   const url = `${dfmsBaseUrl()}/api/super-admin/admins/${dfmsAdminId()}/cows`;
//   const resp = await fetch(url, {
//     headers: { Authorization: `Bearer ${dfmsToken()}`, "Content-Type": "application/json" },
//   });
//   if (!resp.ok) return [];
//   const result = await resp.json();
//   return result.cows || result.data || result || [];
// }

// // GET /api/cows/dfms/list — all DFMS cows (admin use; graceful if DFMS not live)
// export const getDfmsCows = async (req, res, next) => {
//   try {
//     if (!dfmsReady()) {
//       return res.status(200).json({
//         success: true, available: false, data: [],
//         message: "Set DFMS_ADMIN_ID and DFMS_ADMIN_TOKEN in .env to enable DFMS integration.",
//       });
//     }
//     const cows = await fetchAllDfmsCows();
//     const mapped = cows.map(c => ({ ...c, source: "dfms" }));
//     res.status(200).json({ success: true, available: true, count: mapped.length, data: mapped });
//   } catch (err) {
//     res.status(200).json({ success: true, available: false, data: [], message: "DFMS not reachable." });
//   }
// };

// // GET /api/cows/farm/:farmAdminId  (proxies external API, hides token from client)
// export const getCowsForFarm = async (req, res, next) => {
//   try {
//     const { farmAdminId } = req.params;
//     const farmToken = req.headers["x-farm-token"] || req.query.farm_token;

//     if (!farmToken) {
//       return res.status(400).json({ success: false, message: "Farm token required" });
//     }

//     const response = await fetch(`${FARM_API}/api/super-admin/admins/${farmAdminId}/cows`, {
//       headers: {
//         Authorization: `Bearer ${farmToken}`,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       return res.status(response.status).json({ success: false, message: "Failed to load cows from farm API" });
//     }

//     const data = await response.json();
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/cows  (local cows from Supabase)
// export const getAllCows = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("cows")
//       .select("*")
//       .order("created_at", { ascending: false });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/cows/assign   { customer_id, cow_ids: [...] }
// export const assignCowsToCustomer = async (req, res, next) => {
//   try {
//     const { customer_id, cow_ids } = req.body;
//     if (!customer_id || !Array.isArray(cow_ids) || cow_ids.length === 0) {
//       return res.status(400).json({ success: false, message: "customer_id and cow_ids[] are required" });
//     }

//     const rows = cow_ids.map((cow_id) => ({ customer_id, cow_id }));
//     const { data, error } = await supabase
//       .from("cow_assignments")
//       .upsert(rows, { onConflict: "customer_id,cow_id" })
//       .select();

//     if (error) throw error;
//     res.status(201).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/cows/assign   { customer_id, cow_id }
// export const unassignCow = async (req, res, next) => {
//   try {
//     const { customer_id, cow_id } = req.body;
//     if (!customer_id || !cow_id) {
//       return res.status(400).json({ success: false, message: "customer_id and cow_id are required" });
//     }

//     const { error } = await supabase
//       .from("cow_assignments")
//       .delete()
//       .eq("customer_id", customer_id)
//       .eq("cow_id", cow_id);

//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Cow unassigned" });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/cows/assignments/:customerId
// export const getAssignmentsForCustomer = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("cow_assignments")
//       .select("*")
//       .eq("customer_id", req.params.customerId);

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/cows/assignments  (all assignments grouped)
// export const getAllAssignments = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase.from("cow_assignments").select("*");
//     if (error) throw error;

//     // Group by customer_id
//     const grouped = {};
//     data.forEach((row) => {
//       if (!grouped[row.customer_id]) grouped[row.customer_id] = [];
//       grouped[row.customer_id].push(row.cow_id);
//     });

//     res.status(200).json({ success: true, data: grouped });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/cows  (create a cow record in Supabase — used for camera assignments)
// export const createCow = async (req, res, next) => {
//   try {
//     const { tag_number, breed, live_feed_url, assigned_user_id, health_status, status } = req.body;

//     const { data, error } = await supabase
//       .from("cows")
//       .insert([{
//         tag_number: tag_number || "CAM",
//         breed: breed || "Camera",
//         live_feed_url,
//         assigned_user_id,
//         health_status: health_status || "Healthy",
//         status: status || "active",
//         age: 0,
//         milk_production: 0,
//       }])
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // PATCH /api/cows/:id/live-feed  (update live_feed_url for a cow)
// export const updateCowLiveFeed = async (req, res, next) => {
//   try {
//     const { live_feed_url } = req.body;
//     if (!live_feed_url) {
//       return res.status(400).json({ success: false, message: "live_feed_url is required" });
//     }

//     const { data, error } = await supabase
//       .from("cows")
//       .update({ live_feed_url })
//       .eq("id", req.params.id)
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/cows/for-user/:userId  (admin: get Supabase cows assigned to a specific partner)
// export const getCowsForUser = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("cows")
//       .select("*")
//       .eq("assigned_user_id", req.params.userId)
//       .order("created_at", { ascending: false });

//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

const FARM_API = process.env.FARM_API_URL || "https://dfms.impacgo.com";

// ── DFMS helpers ─────────────────────────────────────────────────────────────
const dfmsBaseUrl  = () => process.env.DFMS_API_URL   || "https://dfms.impacgo.com";
const dfmsAdminId  = () => process.env.DFMS_ADMIN_ID  || "";
const dfmsToken    = () => process.env.DFMS_ADMIN_TOKEN || "";
const dfmsReady    = () => Boolean(dfmsAdminId() && dfmsToken());

async function fetchAllDfmsCows() {
  if (!dfmsReady()) return [];
  const url = `${dfmsBaseUrl()}/api/super-admin/admins/${dfmsAdminId()}/cows`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${dfmsToken()}`, "Content-Type": "application/json" },
  });
  if (!resp.ok) return [];
  const result = await resp.json();
  return result.cows || result.data || result || [];
}

// GET /api/cows/dfms/list — all DFMS cows (admin use; graceful if DFMS not live)
export const getDfmsCows = async (req, res, next) => {
  try {
    if (!dfmsReady()) {
      return res.status(200).json({
        success: true, available: false, data: [],
        message: "Set DFMS_ADMIN_ID and DFMS_ADMIN_TOKEN in .env to enable DFMS integration.",
      });
    }
    const cows = await fetchAllDfmsCows();
    const mapped = cows.map(c => ({ ...c, source: "dfms" }));
    res.status(200).json({ success: true, available: true, count: mapped.length, data: mapped });
  } catch (err) {
    res.status(200).json({ success: true, available: false, data: [], message: "DFMS not reachable." });
  }
};

// GET /api/cows/farm/:farmAdminId  (proxies external API, hides token from client)
export const getCowsForFarm = async (req, res, next) => {
  try {
    const { farmAdminId } = req.params;
    const farmToken = req.headers["x-farm-token"] || req.query.farm_token;

    if (!farmToken) {
      return res.status(400).json({ success: false, message: "Farm token required" });
    }

    const response = await fetch(`${FARM_API}/api/super-admin/admins/${farmAdminId}/cows`, {
      headers: {
        Authorization: `Bearer ${farmToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Failed to load cows from farm API" });
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/cows  (local cows from Supabase)
export const getAllCows = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("cows")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/cows/assign   { customer_id, cow_ids: [...] }
export const assignCowsToCustomer = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { customer_id, cow_ids } = req.body;
    if (!customer_id || !Array.isArray(cow_ids) || cow_ids.length === 0) {
      return res.status(400).json({ success: false, message: "customer_id and cow_ids[] are required" });
    }

    const rows = cow_ids.map((cow_id) => ({ customer_id, cow_id }));
    const { data, error } = await db
      .from("cow_assignments")
      .upsert(rows, { onConflict: "customer_id,cow_id" })
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/cows/assign   { customer_id, cow_id }
export const unassignCow = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { customer_id, cow_id } = req.body;
    if (!customer_id || !cow_id) {
      return res.status(400).json({ success: false, message: "customer_id and cow_id are required" });
    }

    const { error } = await db
      .from("cow_assignments")
      .delete()
      .eq("customer_id", customer_id)
      .eq("cow_id", cow_id);

    if (error) throw error;
    res.status(200).json({ success: true, message: "Cow unassigned" });
  } catch (err) {
    next(err);
  }
};

// GET /api/cows/assignments/:customerId
export const getAssignmentsForCustomer = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("cow_assignments")
      .select("*")
      .eq("customer_id", req.params.customerId);

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/cows/assignments  (all assignments grouped)
export const getAllAssignments = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db.from("cow_assignments").select("*");
    if (error) throw error;

    // Group by customer_id
    const grouped = {};
    data.forEach((row) => {
      if (!grouped[row.customer_id]) grouped[row.customer_id] = [];
      grouped[row.customer_id].push(row.cow_id);
    });

    res.status(200).json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
};

// POST /api/cows  (create a cow record in Supabase — used for camera assignments)
export const createCow = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { tag_number, breed, live_feed_url, assigned_user_id, health_status, status } = req.body;

    const { data, error } = await db
      .from("cows")
      .insert([{
        tag_number: tag_number || "CAM",
        breed: breed || "Camera",
        live_feed_url,
        assigned_user_id,
        health_status: health_status || "Healthy",
        status: status || "active",
        age: 0,
        milk_production: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/cows/:id/live-feed  (update live_feed_url for a cow)
export const updateCowLiveFeed = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { live_feed_url } = req.body;
    if (!live_feed_url) {
      return res.status(400).json({ success: false, message: "live_feed_url is required" });
    }

    const { data, error } = await db
      .from("cows")
      .update({ live_feed_url })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/cows/for-user/:userId  (admin: get Supabase cows assigned to a specific partner)
export const getCowsForUser = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("cows")
      .select("*")
      .eq("assigned_user_id", req.params.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};