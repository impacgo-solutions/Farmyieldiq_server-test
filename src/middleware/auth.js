import jwt from "jsonwebtoken";
import { isTenantExpired, TRIAL_EXPIRED_CODE, TRIAL_EXPIRED_MESSAGE } from "../utils/subscription.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    // Tenant Schema
    req.tenantSchema = decoded.tenant_schema;

    // Blocks every screen/API call — for both the admin and any employee
    // under them — the moment the tenant's trial lapses, regardless of how
    // long the JWT itself has left to live.
    if (await isTenantExpired(req.tenantSchema)) {
      return res.status(402).json({
        success: false,
        code: TRIAL_EXPIRED_CODE,
        message: TRIAL_EXPIRED_MESSAGE,
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Gates the cross-tenant Super Admin routes (trial extension, subscription
// toggling, tenant listing). Every registered org's own admin also carries
// role "super_admin" — but scoped to their own tenant — so that alone can't
// be trusted here; only accounts flagged is_platform_admin in public.admin_users
// (stamped into the JWT at login) may see or edit data across all tenants.
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.is_platform_admin) {
    return res.status(403).json({
      success: false,
      message: "Platform Super Admin access required",
    });
  }
  next();
};