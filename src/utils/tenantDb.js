import { supabase } from "../config/supabase.js";

export const tenantDb = (req) => supabase.schema(req.tenantSchema);

export const publicDb = () => supabase.schema("public");