/* AFTERLOGUE — SHARED MEMBER / GUEST NAVIGATION
   Navigating via the logo never signs anyone out.
   Guests return to the landing page; members return to Discover.
*/
(() => {
  "use strict";

  const logo = document.querySelector("header a.logo, header a.logo-link");
  const navLinks = [...document.querySelectorAll("header nav a")];
  const byLabel = label => navLinks.find(link => link.textContent.trim() === label);
  const homeLink = byLabel("Home");
  const exploreLink = byLabel("Explore");
  const logLink = byLabel("Log");
  const discussLink = byLabel("Discuss");
  const accountLabel = document.getElementById("explore-account-label");
  const accountLink = document.getElementById("explore-account-link");
  const client = window.afterlogueSupabase;

  // One session lookup, shared by link updates and an immediate logo click.
  // This only reads authentication state — it never calls signOut().
  const sessionPromise = client?.auth?.getSession
    ? client.auth.getSession()
        .then(({ data, error }) => error ? null : (data?.session?.user || null))
        .catch(error => {
          console.warn("Afterlogue: Navigation session check unavailable.", error);
          return null;
        })
    : Promise.resolve(null);

  // Mark the current destination without moving any header elements.
  // Onboarding (log.html) is separate from the member's personal Log.
  const page = window.location.pathname.split("/").pop() || "index.html";
  const currentLink =
    page === "discover.html" ? homeLink :
    page === "explore.html" ? exploreLink :
    page === "my-log.html" ? logLink :
    ["discuss.html", "discuss-thread.html", "discuss-compose.html"].includes(page) ? discussLink : null;

  for (const link of navLinks) {
    if (link === currentLink) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  function updateNavigation(user) {
    const isMember = Boolean(user);
    if (logo) {
      logo.href = isMember ? "discover.html" : "index.html";
      logo.setAttribute(
        "aria-label",
        isMember ? "Afterlogue Home — Discover" : "Afterlogue landing page"
      );
    }
    if (homeLink) homeLink.href = isMember ? "discover.html" : "discover.html?guest=1";
    if (exploreLink) exploreLink.href = isMember ? "explore.html" : "explore.html?guest=1";
    if (logLink) {
      logLink.href = "my-log.html";
      logLink.hidden = !isMember;
    }
    if (discussLink) discussLink.href = isMember ? "discuss.html" : "discuss.html?guest=1";

    if (accountLabel && accountLink) {
      accountLabel.textContent = isMember ? (user.email || "Afterlogue member") : "Browsing as guest";
      accountLink.textContent = isMember ? "Your Log" : "Sign in / Create account";
      accountLink.href = isMember ? "my-log.html" : "signup.html?mode=signin";
    }

    // Personal Log is members-only, including when visited by a typed URL.
    if (!isMember && window.location.pathname.endsWith("/my-log.html")) {
      window.location.replace("signup.html?mode=signin");
    }
  }

  // Wait for the same session lookup if the logo is clicked before it finishes.
  if (logo) {
    logo.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      sessionPromise.then(user => {
        window.location.assign(user ? "discover.html" : "index.html");
      });
    });
  }


  async function showMemberAvatar(user){
    const summaries=[...document.querySelectorAll("details.account-menu > summary")];
    if(!summaries.length||!user||!client)return;
    try{
      const {data,error}=await client.from("member_profiles").select("avatar_path,avatar_preset").eq("user_id",user.id).maybeSingle();
      if(error||!data)return;
      for(const el of summaries){
        if(data.avatar_path){
          const imageUrl=client.storage.from("member-avatars").getPublicUrl(data.avatar_path).data.publicUrl;
          el.style.backgroundImage="url("+imageUrl+")";
          el.style.backgroundSize="cover";
          el.style.backgroundPosition="center";
        }else if(data.avatar_preset){
          const n=data.avatar_preset;
          el.style.backgroundImage="url(assets/afterlogue-avatars.png)";
          el.style.backgroundSize="400% 300%";
          el.style.backgroundPosition=((n-1)%4)*100/3+"% "+Math.floor((n-1)/4)*50+"%";
        }else continue;
        el.classList.add("member-avatar");
      }
    }catch(error){console.warn("Account avatar unavailable",error);}
  }
  const avatarStyles=document.createElement("style");
  avatarStyles.textContent="details.account-menu>summary.member-avatar{width:34px!important;height:34px!important;min-width:34px!important;border-radius:50%!important;overflow:hidden!important;border:1px solid #ad9772!important;background-repeat:no-repeat!important}details.account-menu>summary.member-avatar svg{display:none!important}";
  document.head.append(avatarStyles);

  // The account icon is the direct entry point for public profile and editing.
  // Keep these links consistent across Home, Explore, Log, Discuss and member profiles.
  function updateAccountMenu(user){
    const isMember=Boolean(user);
    for(const menu of document.querySelectorAll('details.account-menu .account-dropdown')){
      let edit=menu.querySelector('a.account-settings[href="account-settings.html"]');
      if(!edit){
        const old=menu.querySelector('.account-settings');
        if(old){
          edit=document.createElement('a');
          old.replaceWith(edit);
        }else{
          edit=document.createElement('a');
          const divider=menu.querySelector('.account-divider');
          if(divider)divider.insertAdjacentElement('afterend',edit);
          else menu.prepend(edit);
        }
      }
      edit.className='account-settings';
      edit.href='account-settings.html';
      edit.textContent='Edit profile ↗';
      edit.style.display=isMember?'block':'none';
      edit.style.marginBottom='12px';
      edit.setAttribute('aria-label','Edit your Afterlogue profile');

      let view=menu.querySelector('a.account-profile-link');
      if(!view){
        view=document.createElement('a');
        view.className='account-profile-link';
        edit.insertAdjacentElement('beforebegin',view);
      }
      view.textContent='View my profile ↗';
      view.href=isMember?'member-profile.html?id='+encodeURIComponent(user.id):'signup.html?mode=signin';
      view.style.display=isMember?'block':'none';
      view.style.marginBottom='12px';
      view.style.fontSize='13px';
      view.style.color='#e8d6b5';
      view.style.textDecoration='none';

      const signin=menu.querySelector('#account-signin');
      if(signin)signin.hidden=isMember;
    }
  }
  sessionPromise.then(user => {updateNavigation(user);updateAccountMenu(user);showMemberAvatar(user);});
})();
