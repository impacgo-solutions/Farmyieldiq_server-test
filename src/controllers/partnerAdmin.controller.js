import bcrypt from "bcryptjs";
import { tenantDb, publicDb } from "../utils/tenantDb.js";

// GET /api/partners
export const getAllPartners = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const { data, error } = await db
      .from("partners")
      .select("id, name, email, phone, address, joined_date, portfolio_value, profile_image_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/partners/:id
export const getPartnerById = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const { data, error } = await db
      .from("partners")
      .select("id, name, email, phone, address, joined_date, portfolio_value, profile_image_url, created_at")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Partner not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/partners
export const createPartner = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const {
      name,
      email,
      phone,
      address,
      portfolio_value,
      profile_image_url,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into tenant schema
    const { data, error } = await db
      .from("partners")
      .insert([
        {
          name,
          email: normalizedEmail,
          phone,
          address,
          portfolio_value: portfolio_value || 0,
          profile_image_url,
          password: hashedPassword,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Partner insert error:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      throw error;
    }

    // Insert email -> tenant schema mapping into public schema
    const { data: registryData, error: registryError } = await publicDb()
      .from("partner_registry")
      .upsert(
        {
          email: normalizedEmail,
          schema_name: req.tenantSchema,
        },
        {
          onConflict: "email",
        }
      )
      .select()
      .single();

    if (registryError) {
      console.error("Partner registry insert error:", registryError);

      return res.status(500).json({
        success: false,
        message: "Partner created but registry entry failed",
        error: registryError.message,
        details: registryError.details,
        hint: registryError.hint,
      });
    }

    console.log("Partner registry inserted:", registryData);

    return res.status(201).json({
      success: true,
      data,
      registry: registryData,
    });
  } catch (err) {
    console.error("createPartner error:", err);
    next(err);
  }
};
// PUT /api/partners/:id
export const updatePartner = async (req, res, next) => {
  try {
    const db = tenantDb(req);
    const updates = { ...req.body };

    let oldEmail = null;
    if (updates.email) {
      const { data: existing } = await db.from("partners").select("email").eq("id", req.params.id).single();
      oldEmail = existing?.email;
      updates.email = updates.email.toLowerCase().trim();
    }
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);

    const { data, error } = await db
      .from("partners")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Keep registry in sync if email changed
    if (updates.email && oldEmail && oldEmail !== updates.email) {
      await publicDb().from("partner_registry").delete().eq("email", oldEmail);
      await publicDb().from("partner_registry").upsert({ email: updates.email, schema_name: req.tenantSchema });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/partners/:id
export const deletePartner = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    // Fetch email before deletion so we can clean up the registry
    const { data: partner } = await db.from("partners").select("email").eq("id", req.params.id).single();

    const { error } = await db.from("partners").delete().eq("id", req.params.id);
    if (error) throw error;

    // Remove from public registry
    if (partner?.email) {
      await publicDb().from("partner_registry").delete().eq("email", partner.email);
    }

    res.status(200).json({ success: true, message: "Partner deleted" });
  } catch (err) {
    next(err);
  }
};
