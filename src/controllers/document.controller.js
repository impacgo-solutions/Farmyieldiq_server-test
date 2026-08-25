import { tenantDb } from "../utils/tenantDb.js";
import { saveFile, deleteLocalFile } from "../utils/localStorage.js";

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

    const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;
    const fileUrl = await saveFile(req.file.buffer, "documents", filename);

    const { data, error } = await db
      .from("documents")
      .insert([{
        title,
        type,
        related_user_id: related_user_id || null,
        file_url: fileUrl,
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

// DELETE /api/documents/:id
export const deleteDocument = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { data: doc, error: fetchError } = await db
      .from("documents").select("file_url").eq("id", req.params.id).single();
    if (fetchError) throw fetchError;

    await deleteLocalFile(doc?.file_url);

    const { error } = await db.from("documents").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
};
