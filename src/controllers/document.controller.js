// import { supabase } from "../config/supabase.js";   // this should be the service-role client
// import mime from "mime-types";

// const BUCKET = "documents";

// // GET /api/documents?related_user_id=xxx
// export const getAllDocuments = async (req, res, next) => {
//   try {
//     let query = supabase.from("documents").select("*").order("upload_date", { ascending: false });
//     if (req.query.related_user_id) query = query.eq("related_user_id", req.query.related_user_id);

//     const { data, error } = await query;
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET /api/documents/:id
// export const getDocumentById = async (req, res, next) => {
//   try {
//     const { data, error } = await supabase
//       .from("documents").select("*").eq("id", req.params.id).single();

//     if (error) throw error;
//     if (!data) return res.status(404).json({ success: false, message: "Document not found" });
//     res.status(200).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/documents (with file upload via multipart/form-data)
// export const uploadDocument = async (req, res, next) => {
//   try {
//     const { title, type, related_user_id } = req.body;
//     if (!title || !type) {
//       return res.status(400).json({ success: false, message: "title and type are required" });
//     }
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "file is required" });
//     }

//     // Upload to Supabase Storage
//     const filePath = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
//     const contentType = mime.lookup(req.file.originalname) || req.file.mimetype;
//     const { error: uploadError } = await supabase.storage
//       .from(BUCKET)
//       .upload(filePath, req.file.buffer, {
//         contentType,
//         upsert: false,
//       });

//     if (uploadError) throw uploadError;

//     // Get public URL
//     const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

//     // Save to documents table
//     const { data, error } = await supabase
//       .from("documents")
//       .insert([{
//         title,
//         type,
//         related_user_id: related_user_id || null,
//         file_url: urlData.publicUrl,
//         file_name: req.file.originalname,
//       }])
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/documents/:id (deletes file from storage too)
// export const deleteDocument = async (req, res, next) => {
//   try {
//     const { data: doc, error: fetchError } = await supabase
//       .from("documents").select("file_url").eq("id", req.params.id).single();
//     if (fetchError) throw fetchError;

//     // Extract storage path from public URL
//     if (doc?.file_url) {
//       const parts = doc.file_url.split(`/${BUCKET}/`);
//       if (parts.length > 1) {
//         await supabase.storage.from(BUCKET).remove([parts[1]]);
//       }
//     }

//     const { error } = await supabase.from("documents").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Document deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { supabase } from "../config/supabase.js";   // this should be the service-role client
import { tenantDb } from "../utils/tenantDb.js";
import mime from "mime-types";

const BUCKET = "documents";

// GET /api/documents?related_user_id=xxx
export const getAllDocuments = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    let query = db.from("documents").select("*").order("upload_date", { ascending: false });
    if (req.query.related_user_id) query = query.eq("related_user_id", req.query.related_user_id);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id
export const getDocumentById = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("documents").select("*").eq("id", req.params.id).single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Document not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/documents (with file upload via multipart/form-data)
export const uploadDocument = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { title, type, related_user_id } = req.body;
    if (!title || !type) {
      return res.status(400).json({ success: false, message: "title and type are required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "file is required" });
    }

    // Upload to Supabase Storage — storage buckets are not schema-scoped, so this stays on the raw client
    const filePath = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
    const contentType = mime.lookup(req.file.originalname) || req.file.mimetype;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    // Save to documents table (tenant-scoped)
    const { data, error } = await db
      .from("documents")
      .insert([{
        title,
        type,
        related_user_id: related_user_id || null,
        file_url: urlData.publicUrl,
        file_name: req.file.originalname,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documents/:id (deletes file from storage too)
export const deleteDocument = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: doc, error: fetchError } = await db
      .from("documents").select("file_url").eq("id", req.params.id).single();
    if (fetchError) throw fetchError;

    // Extract storage path from public URL — storage stays on the raw client
    if (doc?.file_url) {
      const parts = doc.file_url.split(`/${BUCKET}/`);
      if (parts.length > 1) {
        await supabase.storage.from(BUCKET).remove([parts[1]]);
      }
    }

    const { error } = await db.from("documents").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
};