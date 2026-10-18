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
    page === "discuss.html" ? discussLink : null;

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

  sessionPromise.then(updateNavigation);
})();
