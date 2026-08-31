// Shared tenant-provisioning logic used by BOTH the public self-service
// signup (POST /api/auth/register) and the Super Admin's "Create New Admin"
// (POST /api/platform/tenants) — one code path, so a tenant created either
// way goes through the exact same schema-provisioning + trial-initialization
// steps.
//
// Provisioning the tenant SCHEMA itself is not done here: inserting into
// public.admin_users fires the existing `trg_create_tenant` trigger
// (tenant_trigger() in Postgres), which creates the tenant schema and
// clones the per-tenant tables into it. Trial initialization is just the
// admin_users column defaults doing their job — trial_started_at,
// trial_ends_at (+15 days), subscription_plan ('trial'), is_subscribed
// (false) all come from column DEFAULTs, so nothing here has to compute
// them by hand.
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase.js";

export class TenantProvisioningError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const slugify = (organizationName) =>
  organizationName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);

// Returns the newly-created public.admin_users row (trial fields included).
export const createTenantAdmin = async ({ email, password, name, organizationName }) => {
  if (!email || !password || !name || !organizationName) {
    throw new TenantProvisioningError(
      "email, password, name, and organization_name are required"
    );
  }

  const tenant_schema = slugify(organizationName);
  if (!tenant_schema) {
    throw new TenantProvisioningError(
      "organization_name must contain at least one alphanumeric character"
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: email.toLowerCase().trim(),
      password: hashed,
      name: name.trim(),
      organization_name: organizationName.trim(),
      tenant_schema,
      is_employee: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || (error.message && error.message.includes("unique"))) {
      const isEmail = error.message && error.message.toLowerCase().includes("email");
      throw new TenantProvisioningError(
        isEmail
          ? "An account with this email already exists"
          : "An organization with this name already exists",
        409
      );
    }
    throw error;
  }

  return data;
};
