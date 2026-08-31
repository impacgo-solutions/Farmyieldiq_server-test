import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { PLATFORM_ROLE } from "../middleware/platformAuth.js";

// POST /api/platform/auth/login — separate identity table (public.platform_admins),
// separate JWT role claim. Never checks any tenant's trial state.
export const platformLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const { data: account, error } = await supabase
      .from("platform_admins")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!account) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, account.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: account.id, email: account.email, name: account.name, role: PLATFORM_ROLE },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: account.id, email: account.email, name: account.name, role: PLATFORM_ROLE },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/platform/auth/me
export const getPlatformMe = async (req, res, next) => {
  try {
    const { data: account, error } = await supabase
      .from("platform_admins")
      .select("id, email, name, is_active, created_at")
      .eq("id", req.platformAdmin.id)
      .maybeSingle();
    if (error) throw error;
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });
    res.status(200).json({ success: true, data: { ...account, role: PLATFORM_ROLE } });
  } catch (err) {
    next(err);
  }
};
