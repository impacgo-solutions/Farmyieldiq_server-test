import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { tenantDb, publicDb } from "../utils/tenantDb.js";
import { saveFile, deleteLocalFile } from "../utils/localStorage.js";

// POST /api/partner-auth/login
export const partnerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 1: Find which tenant schema this partner belongs to
    const { data: registry, error: regError } = await publicDb()
      .from("partner_registry")
      .select("schema_name")
      .eq("email", normalizedEmail)
      .single();

    if (regError || !registry) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Step 2: Query that tenant's schema for the partner record
    req.tenantSchema = registry.schema_name;
    const db = tenantDb(req);

    const { data: partner, error } = await db
      .from("partners")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .single();

    if (error || !partner) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Step 3: Validate password (support both bcrypt and plain → auto-upgrade to bcrypt)
    const isBcryptHash = partner.password && partner.password.startsWith("$2");
    let isValid;
    if (isBcryptHash) {
      isValid = await bcrypt.compare(password, partner.password);
    } else {
      isValid = partner.password === password;
      if (isValid) {
        const hashed = await bcrypt.hash(password, 10);
        await db.from("partners").update({ password: hashed }).eq("id", partner.id);
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Step 4: Issue JWT with tenant_schema embedded so all subsequent requests
    // are automatically routed to the correct schema via auth middleware
    const token = jwt.sign(
      { id: partner.id, email: partner.email, role: "partner", tenant_schema: registry.schema_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );

    res.status(200).json({
      success: true,
      data: { token, user: _toProfileResponse(partner) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/partner-auth/me
export const getPartnerMe = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const { data: partner, error } = await db
      .from("partners")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    res.status(200).json({ success: true, data: _toProfileResponse(partner) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/partner-auth/profile
export const updatePartnerProfile = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const allowed = ["phone", "address", "city", "state", "pin_code", "profile_image_url", "date_of_birth"];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const { data, error } = await db
      .from("partners")
      .update(updates)
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data: _toProfileResponse(data) });
  } catch (err) {
    next(err);
  }
};

// POST /api/partner-auth/change-password
export const changePartnerPassword = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: "current_password and new_password are required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const { data: partner, error: fetchErr } = await db
      .from("partners")
      .select("password")
      .eq("id", req.user.id)
      .single();
    if (fetchErr) throw fetchErr;

    const isBcryptHash = partner.password && partner.password.startsWith("$2");
    let valid;
    if (isBcryptHash) {
      valid = await bcrypt.compare(current_password, partner.password);
    } else {
      valid = partner.password === current_password;
    }
    if (!valid) return res.status(401).json({ success: false, message: "Current password incorrect" });

    const newHash = await bcrypt.hash(new_password, 10);
    const { error } = await db
      .from("partners")
      .update({ password: newHash })
      .eq("id", req.user.id);
    if (error) throw error;

    res.status(200).json({ success: true, message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

// POST /api/partner-auth/avatar
export const uploadAvatar = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    if (!req.file) {
      return res.status(400).json({ success: false, message: "file is required" });
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be smaller than 5MB" });
    }

    const originalName = req.file.originalname || "avatar.jpg";
    const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
    const validExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
    if (!validExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: `Only image files are allowed (jpg, png, gif, webp). Got: .${ext}`,
      });
    }

    const partnerId = req.user.id;

    const { data: existing } = await db.from("partners").select("profile_image_url").eq("id", partnerId).single();
    await deleteLocalFile(existing?.profile_image_url);

    const filename = `${partnerId}_${Date.now()}.${ext}`;
    const avatarUrl = await saveFile(req.file.buffer, "avatars", filename);

    const { data, error } = await db
      .from("partners")
      .update({ profile_image_url: avatarUrl })
      .eq("id", partnerId)
      .select()
      .single();
    if (error) throw error;

    res.status(200).json({ success: true, message: "Avatar updated successfully", data: _toProfileResponse(data) });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    next(err);
  }
};

// DELETE /api/partner-auth/avatar
export const deleteAvatar = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const partnerId = req.user.id;

    const { data: existing } = await db.from("partners").select("profile_image_url").eq("id", partnerId).single();
    await deleteLocalFile(existing?.profile_image_url);

    const { data, error } = await db
      .from("partners")
      .update({ profile_image_url: null })
      .eq("id", partnerId)
      .select()
      .single();
    if (error) throw error;

    res.status(200).json({ success: true, data: _toProfileResponse(data) });
  } catch (err) {
    next(err);
  }
};

function _toProfileResponse(p) {
  return {
    id: p.id,
    full_name: p.name,
    email: p.email,
    phone: p.phone || "",
    avatar_url: p.profile_image_url,
    date_of_birth: p.date_of_birth,
    partner_id: p.partner_code || "",
    member_since: p.member_since || "",
    tier: p.tier || "Standard",
    address: p.address,
    city: p.city,
    state: p.state,
    country: p.country,
    pin_code: p.pin_code,
    kyc_status: p.kyc_status || "pending",
    aadhaar_masked: p.aadhaar_masked,
    pan_number: p.pan_number,
    passport_status: p.passport_status,
    bank_name: p.bank_name,
    account_number_masked: p.account_number_masked,
    ifsc_code: p.ifsc_code,
    portfolio_value: p.portfolio_value || 0,
  };
}
