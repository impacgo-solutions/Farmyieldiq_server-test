// Super Admin's tenant-management API: list/create tenants, show each
// one's trial state, and the three actions that restore access
// (Extend / Renew / Upgrade). Every mutation writes an audit_log row and
// a notification row — nothing here ever touches a tenant's own schema,
// so no tenant's business data is ever at risk from these endpoints.
import { publicDb } from "../utils/tenantDb.js";
import { createTenantAdmin, TenantProvisioningError } from "../utils/tenantProvisioning.js";
import { sendSignupNotification } from "../utils/notifyEmail.js";
import {
  computeTrialStatus,
  getNotificationSettings,
  extendTrial,
  renewTenant,
  upgradeTenant,
  setTenantActive,
  TRIAL_TOTAL_DAYS,
} from "../utils/trialManagement.js";

const PUBLIC_FIELDS =
  "id, email, name, organization_name, tenant_schema, is_active, is_employee, created_at, " +
  "trial_started_at, trial_ends_at, is_subscribed, subscription_plan, trial_extension_count, upgraded_at";

// GET /api/platform/tenants
export const listTenants = async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    const { data, error } = await publicDb()
      .from("admin_users")
      .select(PUBLIC_FIELDS)
      .eq("is_employee", false)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const tenants = (data || []).map((t) => {
      const { status, daysLeft } = computeTrialStatus(t, settings);
      return { ...t, trial_status: status, days_left: daysLeft };
    });

    res.status(200).json({ success: true, count: tenants.length, data: tenants });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/tenants/:id
export const getTenant = async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    const { data, error } = await publicDb()
      .from("admin_users")
      .select(PUBLIC_FIELDS)
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Tenant not found" });

    const { status, daysLeft } = computeTrialStatus(data, settings);
    res.status(200).json({ success: true, data: { ...data, trial_status: status, days_left: daysLeft } });
  } catch (err) {
    next(err);
  }
};

// POST /api/platform/tenants — Super Admin creates a new Admin/tenant.
// Reuses the exact same provisioning path as public self-service signup
// (POST /api/auth/register): inserting into admin_users fires the existing
// tenant-schema trigger, and trial_started_at/trial_ends_at/subscription_plan
// are all set by column defaults — a fresh 15-day trial, every time.
export const createTenant = async (req, res, next) => {
  try {
    const { email, password, name, organization_name } = req.body;
    const tenant = await createTenantAdmin({
      email,
      password,
      name,
      organizationName: organization_name,
    });

    await publicDb().from("trial_audit_log").insert({
      admin_user_id: tenant.id,
      action: "tenant_created",
      performed_by: req.platformAdmin.id,
      performed_by_name: req.platformAdmin.name,
      new_state: {
        tenant_schema: tenant.tenant_schema,
        trial_ends_at: tenant.trial_ends_at,
        subscription_plan: tenant.subscription_plan,
      },
      note: `Created by ${req.platformAdmin.name} via Super Admin portal`,
    });

    sendSignupNotification({
      name: tenant.name,
      email: tenant.email,
      organization_name: tenant.organization_name || tenant.tenant_schema,
      req,
    });

    const { status, daysLeft } = computeTrialStatus(tenant);
    res.status(201).json({
      success: true,
      data: { ...tenant, trial_status: status, days_left: daysLeft },
    });
  } catch (err) {
    if (err instanceof TenantProvisioningError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// POST /api/platform/tenants/:id/extend  { days?: number }
export const extendTenantTrial = async (req, res, next) => {
  try {
    const days = Number.isFinite(req.body?.days) ? Math.max(1, Math.floor(req.body.days)) : TRIAL_TOTAL_DAYS;
    const updated = await extendTrial(req.params.id, days, req.platformAdmin, req.body?.note);
    const { status, daysLeft } = computeTrialStatus(updated);
    res.status(200).json({ success: true, data: { ...updated, trial_status: status, days_left: daysLeft } });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// POST /api/platform/tenants/:id/renew  { note?: string }
export const renewTenantSubscription = async (req, res, next) => {
  try {
    const updated = await renewTenant(req.params.id, req.platformAdmin, req.body?.note);
    const { status, daysLeft } = computeTrialStatus(updated);
    res.status(200).json({ success: true, data: { ...updated, trial_status: status, days_left: daysLeft } });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// POST /api/platform/tenants/:id/upgrade  { plan: 'starter'|'growth'|'enterprise' }
export const upgradeTenantPlan = async (req, res, next) => {
  try {
    const { plan, note } = req.body || {};
    if (!plan) return res.status(400).json({ success: false, message: "plan is required" });
    const updated = await upgradeTenant(req.params.id, plan, req.platformAdmin, note);
    const { status, daysLeft } = computeTrialStatus(updated);
    res.status(200).json({ success: true, data: { ...updated, trial_status: status, days_left: daysLeft } });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// PATCH /api/platform/tenants/:id/active  { is_active: boolean }
// Manual account suspend/reactivate — independent of trial expiry, reuses
// the existing admin_users.is_active column already enforced at login.
export const setTenantActiveStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body || {};
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ success: false, message: "is_active must be true or false" });
    }
    const updated = await setTenantActive(req.params.id, is_active, req.platformAdmin, req.body?.note);
    const { status, daysLeft } = computeTrialStatus(updated);
    res.status(200).json({ success: true, data: { ...updated, trial_status: status, days_left: daysLeft } });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// GET /api/platform/tenants/:id/audit-log
export const getTenantAuditLog = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("trial_audit_log")
      .select("*")
      .eq("admin_user_id", req.params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/tenants/:id/notifications
export const getTenantNotifications = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("trial_notifications")
      .select("*")
      .eq("admin_user_id", req.params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/notifications — most recent notifications across ALL
// tenants, with tenant identity joined in, for the Super Admin's global feed.
export const getAllNotifications = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("trial_notifications")
      .select("*, admin_users:admin_user_id(email, name, organization_name, tenant_schema)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/admin-users — the Users tab's data source. Each
// admin_users row IS one tenant's org admin (one owner account per
// organization), so this is the same underlying data as listTenants()
// above, just reshaped for that screen's table/filters. admin_users.role
// is always the literal string "super_admin" (that tenant's own,
// unrelated-to-the-platform role name — see auth.controller.js) so it's
// relabeled "Org Admin" here for display, matching what it actually means
// from the Super Admin's point of view. No "last login" tracking exists
// anywhere in the schema, so created_at is used as the closest available
// proxy for "last active".
export const listAdminUsersView = async (req, res, next) => {
  try {
    const { data, error } = await publicDb()
      .from("admin_users")
      .select("id, name, email, organization_name, tenant_schema, is_active, created_at")
      .eq("is_employee", false)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const users = (data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: "Org Admin",
      organization: u.organization_name || u.tenant_schema,
      is_active: u.is_active,
      last_active: u.created_at,
    }));

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/dashboard — replaces the Flutter app's mocked
// fetchDashboardSummary with real, live-computed counts.
export const getPlatformDashboard = async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    const { data, error } = await publicDb()
      .from("admin_users")
      .select(PUBLIC_FIELDS)
      .eq("is_employee", false)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const tenants = (data || []).map((t) => ({ ...t, ...computeTrialStatus(t, settings) }));
    const counts = { trial_active: 0, expiring_soon: 0, expired: 0, extended: 0, upgraded: 0 };
    for (const t of tenants) counts[t.status] = (counts[t.status] || 0) + 1;

    const { data: recentLog } = await publicDb()
      .from("trial_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        total_tenants: tenants.length,
        counts,
        recent_activity: recentLog || [],
      },
    });
  } catch (err) {
    next(err);
  }
};
