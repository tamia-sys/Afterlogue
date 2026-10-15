
/* AFTERLOGUE — SAVE FIRST IMPRESSIONS */

window.saveFirstImpressions = async function (client) {

  // Identify the signed-in account.
  const { data, error: userError } = await client.auth.getUser();

  if (userError || !data.user) {
    throw new Error("Please sign in to save your impressions.");
  }

  const user = data.user;

  // Check whether onboarding has already been completed.
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  // Never repeat onboarding for an existing account.
  if (profile?.onboarding_completed) {
    return "already-completed";
  }

  const validRatings = ["Loved", "Liked", "Okay", "Not for me"];
  const impressions = [];

  // Collect the impressions stored on this device.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key || !key.startsWith("afterlogue-")) continue;

    const rating = localStorage.getItem(key);

    if (!validRatings.includes(rating)) continue;

    impressions.push({
      user_id: user.id,
      title_key: key.slice("afterlogue-".length),
      rating: rating,
      updated_at: new Date().toISOString()
    });
  }

  // Save impressions before completing onboarding.
  if (impressions.length > 0) {
    const { error: saveError } = await client
      .from("impressions")
      .upsert(impressions, {
        onConflict: "user_id,title_key"
      });

    if (saveError) throw saveError;
  }

  return "impressions-saved";
};
