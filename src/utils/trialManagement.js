// Trial state + the three Super Admin actions that restore access
// (Extend / Renew / Upgrade). Nothing here ever touches a tenant's own
// schema/data — only the single public.admin_users row that tracks its
// trial/subscription, plus append-only audit/notification rows. So
// extending, renewing, or upgrading a tenant can never lose or reset any
// of that tenant's existing business data.
import { publicDb } from "./tenantDb.js";

export const TRIAL_TOTAL_DAYS = 15;

export const TRIAL_STATUS = {
  ACTIVE: "trial_active",
  EXPIRING_SOON: "expiring_soon",
  EXPIRED: "expired",
  EXTENDED: "extended",
  UPGRADED: "upgraded",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Pulls the configurable reminder lead time; falls back to the same
// default the DB column carries if the settings table isn't there yet
// (e.g. this migration hasn't been applied in this environment).
export const getNotificationSettings = async () => {
  const { data } = await publicDb()
    .from("notification_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return {
    reminder_days_before: data?.reminder_days_before ?? 3,
    notify_on_expiry_day: data?.notify_on_expiry_day ?? true,
  };
};

// Pure function: never touches the DB. Never trusts a stored "status"
// column — the state is always derived live from trial_ends_at /
// is_subscribed / trial_extension_count so it can't drift out of sync.
// Second arg accepts the raw object getNotificationSettings() returns
// (snake_case reminder_days_before) — every call site passes that object
// straight through, so this destructures the same key name rather than a
// mismatched camelCase one that would silently always fall back to 3.
export const computeTrialStatus = (adminUser, { reminder_days_before: reminderDaysBefore = 3 } = {}) => {
  const now = Date.now();

  if (adminUser.is_subscribed) {
    return {
      status: TRIAL_STATUS.UPGRADED,
      daysLeft: null,
      trialEndsAt: adminUser.trial_ends_at,
    };
  }

  const endsAtMs = adminUser.trial_ends_at ? new Date(adminUser.trial_ends_at).getTime() : null;
  if (!endsAtMs) {
    return { status: TRIAL_STATUS.ACTIVE, daysLeft: null, trialEndsAt: null };
  }

  const daysLeft = Math.ceil((endsAtMs - now) / DAY_MS);

  if (endsAtMs <= now) {
    return { status: TRIAL_STATUS.EXPIRED, daysLeft: Math.min(daysLeft, 0), trialEndsAt: adminUser.trial_ends_at };
  }
  if ((adminUser.trial_extension_count || 0) > 0) {
    return { status: TRIAL_STATUS.EXTENDED, daysLeft, trialEndsAt: adminUser.trial_ends_at };
  }
  if (daysLeft <= reminderDaysBefore) {
    return { status: TRIAL_STATUS.EXPIRING_SOON, daysLeft, trialEndsAt: adminUser.trial_ends_at };
  }
  return { status: TRIAL_STATUS.ACTIVE, daysLeft, trialEndsAt: adminUser.trial_ends_at };
};

const insertAuditLog = async ({ adminUserId, action, performedBy, previousState, newState, note }) => {
  await publicDb()
    .from("trial_audit_log")
    .insert({
      admin_user_id: adminUserId,
      action,
      performed_by: performedBy?.id ?? null,
      performed_by_name: performedBy?.name ?? "system",
      previous_state: previousState,
      new_state: newState,
      note: note ?? null,
    });
};

// Notifications are keyed (admin_user_id, notif_type, notif_date) with a
// unique constraint, so calling this twice for the same tenant/type/day
// is a safe no-op rather than a duplicate row or an error.
export const recordNotification = async ({ adminUserId, notifType, daysLeft, message, channel = "system" }) => {
  await publicDb()
    .from("trial_notifications")
    .upsert(
      {
        admin_user_id: adminUserId,
        notif_type: notifType,
        days_left: daysLeft ?? null,
        message: message ?? null,
        channel,
      },
      { onConflict: "admin_user_id,notif_type,notif_date" }
    );
};

// For every app's login/getMe response (Admin, Super Admin's own view of a
// tenant, and Partner): the ORG's suspension + trial state, so each app can
// show its own block screen instead of the API ever rejecting the request.
// Works for the admin's own login (adminUserRow is already the admin_users
// row — no extra query), an employee login, and a partner login alike
// (employee_accounts/partners have no trial columns of their own, so this
// looks the tenant up by schema instead). Also carries the tenant admin's
// own contact details — the Partner app's "Contact Admin" action needs to
// reach the ADMIN, not FarmYieldIQ support.
export const getTenantTrialSummary = async (tenantSchema, adminUserRow = null) => {
  let row = adminUserRow;
  if (!row) {
    const { data } = await publicDb()
      .from("admin_users")
      .select("name, email, is_active, trial_ends_at, is_subscribed, trial_extension_count")
      .eq("tenant_schema", tenantSchema)
      .maybeSingle();
    row = data;
  }
  if (!row) {
    return {
      is_active: true,
      trial_status: TRIAL_STATUS.ACTIVE,
      days_left: null,
      admin_name: null,
      admin_email: null,
    };
  }

  const settings = await getNotificationSettings();
  const { status, daysLeft } = computeTrialStatus(row, settings);
  return {
    is_active: row.is_active !== false,
    trial_status: status,
    days_left: daysLeft,
    admin_name: row.name ?? null,
    admin_email: row.email ?? null,
  };
};

const getTenantOrThrow = async (adminUserId) => {
  const { data, error } = await publicDb()
    .from("admin_users")
    .select("*")
    .eq("id", adminUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error("Tenant not found");
    err.statusCode = 404;
    throw err;
  }
  return data;
};

// Extend the trial by `extraDays` (default a fresh 15-day window). Extends
// from whichever is later — "now" or the current trial_ends_at — so a
// tenant that already expired gets a full fresh window from today, while
// one that hasn't expired yet gets extra runway added on top of what's left.
export const extendTrial = async (adminUserId, extraDays = TRIAL_TOTAL_DAYS, performedBy = null, note = null) => {
  const tenant = await getTenantOrThrow(adminUserId);
  const base = Math.max(Date.now(), tenant.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : Date.now());
  const newEndsAt = new Date(base + extraDays * DAY_MS).toISOString();

  const { data, error } = await publicDb()
    .from("admin_users")
    .update({
      trial_ends_at: newEndsAt,
      trial_extension_count: (tenant.trial_extension_count || 0) + 1,
    })
    .eq("id", adminUserId)
    .select()
    .single();
  if (error) throw error;

  await insertAuditLog({
    adminUserId,
    action: "trial_extended",
    performedBy,
    previousState: { trial_ends_at: tenant.trial_ends_at, trial_extension_count: tenant.trial_extension_count },
    newState: { trial_ends_at: data.trial_ends_at, trial_extension_count: data.trial_extension_count },
    note: note ?? `Extended by ${extraDays} day(s)`,
  });
  await recordNotification({
    adminUserId,
    notifType: "trial_extended",
    message: `Trial extended by ${extraDays} day(s), now ending ${newEndsAt}.`,
  });

  return data;
};

// Re-activate a lapsed (or about-to-lapse) paid subscription on the
// tenant's EXISTING plan — access restored, nothing about the tenant's
// data changes. Distinct from Upgrade, which also changes the plan tier.
export const renewTenant = async (adminUserId, performedBy = null, note = null) => {
  const tenant = await getTenantOrThrow(adminUserId);
  const plan = tenant.subscription_plan && tenant.subscription_plan !== "trial"
    ? tenant.subscription_plan
    : "starter";

  const { data, error } = await publicDb()
    .from("admin_users")
    .update({ is_subscribed: true, subscription_plan: plan, upgraded_at: new Date().toISOString() })
    .eq("id", adminUserId)
    .select()
    .single();
  if (error) throw error;

  await insertAuditLog({
    adminUserId,
    action: "trial_renewed",
    performedBy,
    previousState: { is_subscribed: tenant.is_subscribed, subscription_plan: tenant.subscription_plan },
    newState: { is_subscribed: data.is_subscribed, subscription_plan: data.subscription_plan },
    note,
  });
  await recordNotification({
    adminUserId,
    notifType: "trial_renewed",
    message: `Subscription renewed on the ${plan} plan.`,
  });

  return data;
};

const VALID_PLANS = ["starter", "growth", "enterprise"];

// Move the tenant onto a paid plan tier. Always restores access
// (is_subscribed = true) regardless of trial state.
export const upgradeTenant = async (adminUserId, plan, performedBy = null, note = null) => {
  if (!VALID_PLANS.includes(plan)) {
    const err = new Error(`plan must be one of: ${VALID_PLANS.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  const tenant = await getTenantOrThrow(adminUserId);

  const { data, error } = await publicDb()
    .from("admin_users")
    .update({ is_subscribed: true, subscription_plan: plan, upgraded_at: new Date().toISOString() })
    .eq("id", adminUserId)
    .select()
    .single();
  if (error) throw error;

  await insertAuditLog({
    adminUserId,
    action: "trial_upgraded",
    performedBy,
    previousState: { is_subscribed: tenant.is_subscribed, subscription_plan: tenant.subscription_plan },
    newState: { is_subscribed: data.is_subscribed, subscription_plan: data.subscription_plan },
    note,
  });
  await recordNotification({
    adminUserId,
    notifType: "trial_upgraded",
    message: `Upgraded to the ${plan} plan.`,
  });

  return data;
};

export const setTenantActive = async (adminUserId, isActive, performedBy = null, note = null) => {
  const tenant = await getTenantOrThrow(adminUserId);

  const { data, error } = await publicDb()
    .from("admin_users")
    .update({ is_active: isActive })
    .eq("id", adminUserId)
    .select()
    .single();
  if (error) throw error;

  await insertAuditLog({
    adminUserId,
    action: isActive ? "tenant_activated" : "tenant_suspended",
    performedBy,
    previousState: { is_active: tenant.is_active },
    newState: { is_active: data.is_active },
    note,
  });

  return data;
};
