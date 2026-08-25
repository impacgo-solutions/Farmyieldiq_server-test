// Trial/subscription gate. One admin_users row (public schema) per tenant
// holds trial_ends_at + is_subscribed — checked on every authenticated
// request (not just at login) so a session already in progress gets locked
// out the moment the trial lapses, and a manual `is_subscribed = true` flip
// takes effect immediately without waiting for the JWT to expire/re-login.
import { publicDb } from "./tenantDb.js";

export const TRIAL_EXPIRED_CODE = "TRIAL_EXPIRED";
export const TRIAL_EXPIRED_MESSAGE =
  "Your trial period has ended. Contact info@impacgo.com to resume your service.";

// Returns true only when the tenant is unsubscribed AND past trial_ends_at.
// Any lookup failure (missing tenant_schema, no matching row, columns not
// migrated yet) fails OPEN — never lock a tenant out due to a query error.
export const isTenantExpired = async (tenantSchema) => {
  if (!tenantSchema) return false;

  const { data, error } = await publicDb()
    .from("admin_users")
    .select("trial_ends_at, is_subscribed")
    .eq("tenant_schema", tenantSchema)
    .maybeSingle();

  if (error || !data || data.is_subscribed || !data.trial_ends_at) return false;
  return new Date(data.trial_ends_at).getTime() < Date.now();
};
