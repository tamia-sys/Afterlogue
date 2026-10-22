
/* AFTERLOGUE — SHARED SUPABASE CONNECTION */

const AFTERLOGUE_SUPABASE_URL = "https://lerrhzrabrqgogfnlsbd.supabase.co";
const AFTERLOGUE_PUBLISHABLE_KEY = "sb_publishable_4frMAHSyIeVNTbVC6umquQ_qsi-XAK4";

window.afterlogueSupabase = window.supabase.createClient(
 AFTERLOGUE_SUPABASE_URL,
  AFTERLOGUE_PUBLISHABLE_KEY
);

/* Navigation and Home are display-only session consumers.
   Prefer Supabase's initialized local session to a network-bound getUser()
   call when deciding whether to show member navigation on an installed PWA.
   RLS continues to authorize all private database operations server-side. */
(()=>{
 const client=window.afterlogueSupabase;
 let pending=null;
 const shape=(session)=>session?.user
   ?{status:"member",user:session.user}
   :{status:"guest",user:null};
 window.AfterlogueAuth={
  resolve(){
   if(!pending)pending=(async()=>{
    try{
     const {data,error}=await client.auth.getSession();
     if(error)throw error;
     return shape(data?.session);
    }catch(error){
     console.warn("Afterlogue: Session check temporarily unavailable.",error);
     return {status:"unavailable",user:null};
    }
   })();
   return pending;
  },
  update(session){pending=Promise.resolve(shape(session));},
  refresh(){pending=null;return this.resolve();}
 };
})();
