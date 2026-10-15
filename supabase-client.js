
/* AFTERLOGUE — SHARED SUPABASE CONNECTION */

const AFTERLOGUE_SUPABASE_URL = "https://lerrhzrabrqgogfnlsbd.supabase.co";
const AFTERLOGUE_PUBLISHABLE_KEY = "sb_publishable_4frMAHSyIeVNTbVC6umquQ_qsi-XAK4";

window.afterlogueSupabase = window.supabase.createClient(
 AFTERLOGUE_SUPABASE_URL,
  AFTERLOGUE_PUBLISHABLE_KEY
);
