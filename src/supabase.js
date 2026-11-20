import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lkfyahpzqciruydzwxim.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Q08ycjx2uonvfHwwi62oyQ_9UkmCj1o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth (real accounts — email + password) ---------------------------

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Sends a reset-password email whose link lands back on this same deployed
// page (works for github.io now and any custom domain later) and opens a
// temporary recovery session there — see onAuthStateChange below.
export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw error;
}

const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

// The object's filename is always the user's own id, so re-uploading
// replaces the old photo and the public URL never changes.
export function getAvatarUrl(userId) {
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(userId);
  // Cache-bust so a just-replaced photo doesn't show the browser's cached
  // copy of the old one at the same URL.
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadAvatar(file) {
  if (file.size > MAX_AVATAR_SIZE) throw new Error("Photo is too large (max 5MB)");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(user.id, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return getAvatarUrl(user.id);
}

export async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

// --- Trips (one row per trip, owned by the signed-in user) --------------

export async function createTrip({ destinationName, lat, lng, startDate, endDate, homeCurrency, stops }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      destination_name: destinationName,
      destination_lat: lat,
      destination_lng: lng,
      start_date: startDate || null,
      end_date: endDate || null,
      home_currency: homeCurrency || "USD",
      stops: stops || [],
      itinerary: [],
      budget: [],
      packing: {},
      map_pins: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select("id, user_id, destination_name, destination_lat, destination_lng, start_date, end_date, stops, photo_url, created_at")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

// ---- Sharing / collaboration -------------------------------------------
// See supabase/add_trip_collaborators.sql — every write here goes through
// a security-definer RPC, never a direct table write, so a client can
// only ever read a collaborator row, not tamper with it (e.g. an invitee
// bumping their own role while accepting).

// Whichever of owner/editor/viewer is most permissive for this trip and
// session — "viewer" if an accepted collaborator row exists but isn't
// resolved yet, since that's the safe default while loading.
export async function getMyTripRole(trip) {
  const userId = await getCurrentUserId();
  if (!userId) return "viewer";
  if (trip.user_id === userId) return "owner";
  const { data } = await supabase
    .from("trip_collaborators")
    .select("role")
    .eq("trip_id", trip.id)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();
  return data?.role === "editor" ? "editor" : "viewer";
}

export async function inviteTripCollaborator(tripId, email, role) {
  const { error } = await supabase.rpc("invite_trip_collaborator", { p_trip_id: tripId, p_email: email, p_role: role });
  if (error) throw error;
}

export async function updateCollaboratorRole(collaboratorId, role) {
  const { error } = await supabase.rpc("update_trip_collaborator_role", { p_collaborator_id: collaboratorId, p_role: role });
  if (error) throw error;
}

export async function removeCollaborator(collaboratorId) {
  const { error } = await supabase.rpc("remove_trip_collaborator", { p_collaborator_id: collaboratorId });
  if (error) throw error;
}

export async function listTripCollaborators(tripId) {
  const { data, error } = await supabase.rpc("list_trip_collaborators", { p_trip_id: tripId });
  if (error) throw error;
  return data;
}

export async function listMyPendingInvites() {
  const { data, error } = await supabase.rpc("list_my_pending_invites");
  if (error) throw error;
  return data;
}

export async function acceptTripInvite(tripId) {
  const { error } = await supabase.rpc("accept_trip_invite", { p_trip_id: tripId });
  if (error) throw error;
}

export async function declineTripInvite(tripId) {
  const { error } = await supabase.rpc("decline_trip_invite", { p_trip_id: tripId });
  if (error) throw error;
}

export async function leaveTrip(tripId) {
  const { error } = await supabase.rpc("leave_trip", { p_trip_id: tripId });
  if (error) throw error;
}

// A shared, app-wide photo cache (see supabase/add_place_photos_cache.sql):
// once anyone's trip resolves a photo for a place name, every other trip
// that asks for the same name gets it from here instead of re-querying
// GeoNames/Pexels. undefined means "no cache row yet" (genuinely new place,
// go do the live lookup); "" means "looked up before, nothing found".
export async function getCachedPlacePhoto(name) {
  const { data, error } = await supabase.from("place_photos").select("photo_url").eq("name", name).maybeSingle();
  if (error) return undefined;
  return data ? data.photo_url : undefined;
}

export async function cachePlacePhoto(name, photoUrl) {
  await supabase.from("place_photos").upsert({ name, photo_url: photoUrl, resolved_at: new Date().toISOString() });
}

// Admin-only: every trip from every user, with the owner's email. The
// admin_list_trips function checks the caller's email server-side before
// returning anything, so this call fails for anyone else regardless of
// what the client sends.
export async function listAllTripsAsAdmin() {
  const { data, error } = await supabase.rpc("admin_list_trips");
  if (error) throw error;
  return data;
}

export async function getTrip(id) {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function friendlyFunctionError(error) {
  try {
    const body = await error?.context?.json();
    if (body?.error) return new Error(body.error);
  } catch (e) {}
  return error;
}

// Deployed under the name "rapid-function" in Supabase (its creation
// template's route stuck even after the function was renamed in the
// dashboard), not "generate-itinerary" — this is its actual route.
export async function generateItinerary({ stops }) {
  const { data, error } = await supabase.functions.invoke("rapid-function", {
    body: { stops },
  });
  if (error) throw await friendlyFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data; // { days: [{ day, items: [{ time, title, notes, type }] }] }
}

// A Gemini call takes several seconds — shared with every user the same
// way place_photos is, so only the first person to ask about a given
// destination ever pays that cost. Everyone after gets it instantly.
export async function suggestPopularPlaces(destination) {
  const key = destination.trim().toLowerCase();
  try {
    const { data: cached } = await supabase.from("place_suggestions").select("places").eq("name", key).maybeSingle();
    if (cached) return cached.places;
  } catch (e) {
    // Shared cache unreachable — fall through to a live call.
  }

  const { data, error } = await supabase.functions.invoke("rapid-function", {
    body: { mode: "suggest_places", destination },
  });
  if (error) throw await friendlyFunctionError(error);
  if (data?.error) throw new Error(data.error);
  const places = data.places; // [{ name, reason }]
  supabase.from("place_suggestions").upsert({ name: key, places }).then(
    () => {},
    () => {}
  );
  return places;
}

export async function updateTrip(id, fields) {
  const { error } = await supabase
    .from("trips")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(id) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
