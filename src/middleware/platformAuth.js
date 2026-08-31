// Guards every /api/platform/* route. Deliberately separate from
// src/middleware/auth.js's `authenticate` — that one gates access on a
// TENANT's trial/subscription state (isTenantExpired). Platform Super
// Admin sessions must NEVER be subject to any tenant's trial state, so
// this middleware doesn't call isTenantExpired at all: a platform admin
// stays able to log in and manage tenants regardless of any tenant's
// trial having expired.
import jwt from "jsonwebtoken";

export const PLATFORM_ROLE = "platform_super_admin";

export const authenticatePlatform = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== PLATFORM_ROLE) {
      return res.status(403).json({ success: false, message: "Platform admin access required" });
    }

    req.platformAdmin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
