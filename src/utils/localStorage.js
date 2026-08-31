import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// Save a buffer to uploads/<subdir>/<filename> and return the public URL path.
// BASE_URL env var (e.g. https://api.example.com) is prepended so clients
// get the same shape as before when we used Supabase Storage public URLs.
export async function saveFile(buffer, subdir, filename) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  const base = (process.env.BASE_URL || "").replace(/\/$/, "");
  return `${base}/uploads/${subdir}/${filename}`;
}

// Delete a previously saved file given its stored URL or path.
export async function deleteLocalFile(fileUrl) {
  if (!fileUrl) return;
  let urlPath = fileUrl;
  try {
    urlPath = new URL(fileUrl).pathname;
  } catch {
    // Already a relative path
  }
  const uploadsIndex = urlPath.indexOf("/uploads/");
  if (uploadsIndex === -1) return;
  const relPath = urlPath.slice(uploadsIndex + "/uploads/".length);
  const filePath = path.join(UPLOADS_ROOT, relPath);
  try {
    await fs.unlink(filePath);
  } catch {
    // File not found — ignore
  }
}
