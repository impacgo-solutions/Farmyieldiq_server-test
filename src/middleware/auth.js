import jwt from "jsonwebtoken";

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

    // No role's access is blocked here — admin, employee, and partner
    // requests all go through regardless of trial/suspension state. Every
    // app (Admin, Super Admin, Partner) instead reads is_active/trial_status
    // from its own login/getMe response (see getTenantTrialSummary in
    // trialManagement.js — the single shared computation every app reads)
    // and blocks its own screens client-side. This keeps one trial gate
    // instead of duplicating enforcement between the API and each UI.
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};