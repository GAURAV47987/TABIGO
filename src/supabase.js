import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

// --- Trips (one row per trip, owned by the signed-in user) --------------

export async function createTrip({ destinationName, lat, lng, startDate, endDate }) {
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
      start_date: startDate,
      end_date: endDate,
      itinerary: [],
      budget: [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination_name, destination_lat, destination_lng, start_date, end_date, created_at")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTrip(id) {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
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
