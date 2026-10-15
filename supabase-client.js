
/* AFTERLOGUE — SHARED SUPABASE CONNECTION */

const AFTERLOGUE_SUPABASE_URL = "https://lerrhzrabrqgogfnlsbd.supabase.co";
const AFTERLOGUE_PUBLISHABLE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY_HERE";

window.afterlogueSupabase = window.supabase.createClient(
 AFTERLOGUE_SUPABASE_URL,
  AFTERLOGUE_PUBLISHABLE_KEY
);
