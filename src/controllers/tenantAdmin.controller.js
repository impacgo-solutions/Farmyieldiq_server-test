// Cross-tenant Super Admin views. Every row in public.admin_users is one
// organization's own admin account — there is no separate "organizations"
// table — so this is the tenant registry the rest of the app never exposes
// a list of. Only reachable via requireSuperAdmin (see src/middleware/auth.js).
import { publicDb } from "../utils/tenantDb.js";

const TENANT_FIELDS =
  "id, email, name, tenant_schema, role, is_active, is_subscribed, trial_ends_at, created_at";

const DAY_MS = 24 * 60 * 60 * 1000;

const _tenantStatus = (row) => {
  if (row.is_subscribed) return "active";
  if (row.trial_ends_at && new Date(row.trial_ends_at).getTime() < Date.now()) return "expired";
  return "trialing";
};

const _toTenantResponse = (row) => ({ ...row, status: _tenantStatus(row) });

const _fetchAllTenants = async () => {
  const { data, error } = await publicDb()
    .from("admin_users")
    .select(TENANT_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(_toTenantResponse);
};

// GET /api/admin/tenants
export const listTenants = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await _fetchAllTenants() });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/overview — platform-wide counts for the Super Admin dashboard.
export const getPlatformOverview = async (req, res, next) => {
  try {
    const tenants = await _fetchAllTenants();
    const now = Date.now();

    const activeList = tenants.filter((t) => t.status === "active");
    const trialingList = tenants.filter((t) => t.status === "trialing");
    const expiredList = tenants.filter((t) => t.status === "expired");
    const expiringSoon = trialingList.filter((t) => {
      if (!t.trial_ends_at) return false;
      const daysLeft = (new Date(t.trial_ends_at).getTime() - now) / DAY_MS;
      return daysLeft >= 0 && daysLeft <= 7;
    });

    res.status(200).json({
      success: true,
      data: {
        total_tenants: tenants.length,
        active_subscriptions: activeList.length,
        trial_accounts: trialingList.length,
        expired_accounts: expiredList.length,
        expiring_soon: expiringSoon,
        expired: expiredList,
        recent_tenants: tenants.slice(0, 10),
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tenants/:id/extend-trial   body: { days }
export const extendTrial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const days = Number(req.body?.days);
    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({ success: false, message: "days must be a positive number" });
    }

    const { data: existing, error: fetchError } = await publicDb()
      .from("admin_users")
      .select("id, trial_ends_at")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ success: false, message: "Tenant not found" });

    // Extend from whichever is later — "now" (trial already lapsed) or the
    // existing trial_ends_at (still running) — so extending a live trial
    // adds on top of it instead of resetting the clock back to today.
    const stillRunning =
      existing.trial_ends_at && new Date(existing.trial_ends_at).getTime() > Date.now();
    const base = stillRunning ? new Date(existing.trial_ends_at) : new Date();
    const newTrialEndsAt = new Date(base.getTime() + days * DAY_MS);

    const { data, error } = await publicDb()
      .from("admin_users")
      .update({ trial_ends_at: newTrialEndsAt.toISOString(), is_subscribed: false })
      .eq("id", id)
      .select(TENANT_FIELDS)
      .single();
    if (error) throw error;

    res.status(200).json({ success: true, data: _toTenantResponse(data) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tenants/:id/subscription   body: { is_subscribed }
// Marking a tenant subscribed makes them bypass trial_ends_at entirely
// (see src/utils/subscription.js); unsetting it puts them back on whatever
// trial_ends_at is already on file.
export const setTenantSubscribed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_subscribed } = req.body;
    if (typeof is_subscribed !== "boolean") {
      return res.status(400).json({ success: false, message: "is_subscribed must be a boolean" });
    }

    const { data, error } = await publicDb()
      .from("admin_users")
      .update({ is_subscribed })
      .eq("id", id)
      .select(TENANT_FIELDS)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Tenant not found" });

    res.status(200).json({ success: true, data: _toTenantResponse(data) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tenants/:id/status   body: { is_active }
// is_active gates login itself (see _findAccount in auth.controller.js),
// so flipping this off immediately locks the org's admin out.
export const setTenantActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ success: false, message: "is_active must be a boolean" });
    }

    const { data, error } = await publicDb()
      .from("admin_users")
      .update({ is_active })
      .eq("id", id)
      .select(TENANT_FIELDS)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Tenant not found" });

    res.status(200).json({ success: true, data: _toTenantResponse(data) });
  } catch (err) {
    next(err);
  }
};
