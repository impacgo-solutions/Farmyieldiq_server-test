// Roles & Permissions tab. Backed by public.platform_roles — a plain
// catalog of role/permission-set pairs (no per-user role assignment
// exists anywhere in the schema yet, so `user_count` is an informational
// column, not something computed from real assignments).
import { publicDb } from "../utils/tenantDb.js";
import { pool } from "../config/supabase.js";

const ALL_PERMISSIONS = [
  "Manage Users",
  "Manage Organizations",
  "Manage Roles & Permissions",
  "Manage Billing & Subscriptions",
  "Manage Farm Data",
  "View Reports",
  "System Configuration",
];

// GET /api/platform/roles
export const listRoles = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("platform_roles")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/platform/roles/:id/permissions  { permissions: string[] }
export const updateRolePermissions = async (req, res, next) => {
  try {
    const permissions = req.body?.permissions;
    if (!Array.isArray(permissions) || permissions.some((p) => typeof p !== "string")) {
      return res.status(400).json({ success: false, message: "permissions must be an array of strings" });
    }
    const unknown = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (unknown.length) {
      return res.status(400).json({ success: false, message: `Unknown permission(s): ${unknown.join(", ")}` });
    }

    // Goes through the raw pool, not the shared QueryBuilder: that builder's
    // generic .update() JSON-stringifies any array/object value (correct for
    // the jsonb columns it's normally used with, e.g. allowed_modules), but
    // permissions is a native Postgres text[] column — JSON.stringify'ing an
    // array produces "[\"a\",\"b\"]", which Postgres rejects as a malformed
    // array literal. node-postgres's own parameter serialization handles a
    // plain JS array of strings correctly for a text[] column, so this
    // bypasses the builder for just this one write.
    const { rows } = await pool.query(
      `UPDATE public.platform_roles SET permissions = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [permissions, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Role not found" });

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};
