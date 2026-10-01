import { useEffect, useRef, useState } from "react";
import {
  getSession,
  onAuthStateChange,
  signIn,
  signUp,
  signOut,
  changePassword,
  getAvatarUrl,
  uploadAvatar,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  listAllTripsAsAdmin,
  generateItinerary,
} from "./supabase";
import { Plus, Trash2, User, Calendar, Wallet, ArrowLeftRight, Map as MapIcon, Luggage, Compass } from "lucide-react";
import { enumerateDates } from "./dates";
import { getEffectiveStops } from "./stops";
import { isAdmin } from "./admin";
import NewTripWizard from "./NewTripWizard";
import ItineraryTab from "./Itinerary";
import BudgetTab from "./Budget";
import ConverterTab from "./Converter";
import PackingTab from "./Packing";
import TripMap from "./TripMap";
import { PlaceBanner } from "./PlacePhoto";

// A joined multi-stop label ("Athens → Paris") won't resolve to any one
// Wikipedia page, so photos always key off the first stop's plain name.
function photoQuery(trip) {
  return getEffectiveStops(trip)[0]?.name || trip.destination_name;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setConfirmSent(true);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div className="max-w-sm text-center p-6 rounded-2xl tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Check your email</h1>
          <p style={{ color: "var(--text-body)" }}>We sent a confirmation link to {email}. Click it, then come back and sign in.</p>
          <button
            className="mt-4 underline"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => { setConfirmSent(false); setMode("signin"); }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-6 rounded-2xl tg-card"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>TABIGO</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Plan any trip, anywhere.</p>

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        {error && <p className="text-sm mb-3" style={{ color: "var(--stamp)" }}>{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg font-semibold mb-3 tg-btn tg-btn-primary"
          style={{ color: "var(--primary-text)" }}
        >
          {busy ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="w-full text-sm underline"
          style={{ color: "var(--text-secondary)" }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

function AIGenerateCard({ trip, onGenerated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const effectiveStops = getEffectiveStops(trip);
      const totalDays = enumerateDates(trip.start_date, trip.end_date).length;
      const result = await generateItinerary({
        stops: effectiveStops.map((s) => ({ name: s.name, days: s.days || totalDays })),
      });
      const dates = enumerateDates(trip.start_date, trip.end_date);
      const newItems = [];
      (result.days || []).forEach((day) => {
        const date = dates[day.day - 1];
        if (!date) return;
        (day.items || []).forEach((item) => {
          newItems.push({
            id: crypto.randomUUID(),
            date,
            time: item.time || "",
            title: item.title || "",
            notes: item.notes || "",
            type: item.type || "activity",
          });
        });
      });
      onGenerated(newItems);
    } catch (err) {
      setError(err.message || "Could not generate itinerary");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl mb-4 tg-card" style={{ background: "var(--surface)", border: "1px dashed var(--tape)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>✨ Generate itinerary with AI</p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        Draft a full day-by-day plan for this trip automatically, including a must-visit photo spot.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--stamp)" }}>{error}</p>}
      <button
        onClick={generate}
        disabled={busy}
        className="w-full py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
        style={{ color: "var(--primary-text)", opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "Generating…" : "Generate itinerary"}
      </button>
    </div>
  );
}

const TRIP_TABS = [
  { id: "itinerary", label: "Itinerary", icon: Calendar },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "pack", label: "Pack", icon: Luggage },
];

function TripHub({ tripId, onBack }) {
  const [trip, setTrip] = useState(null);
  const [tab, setTab] = useState("itinerary");

  useEffect(() => {
    getTrip(tripId).then(setTrip);
  }, [tripId]);

  if (!trip) return <p className="p-6" style={{ color: "var(--text-body)" }}>Loading…</p>;

  const save = (field) => (value) => {
    setTrip((t) => ({ ...t, [field]: value }));
    updateTrip(tripId, { [field]: value });
  };

  return (
    <div className="min-h-screen px-4 pt-6" style={{ background: "var(--bg)", paddingBottom: 100 }}>
      <button onClick={onBack} className="mb-4 text-sm underline" style={{ color: "var(--text-secondary)" }}>
        ← My trips
      </button>

      <PlaceBanner
        placeName={photoQuery(trip)}
        savedUrl={trip.photo_url}
        onResolved={(url) => {
          setTrip((t) => ({ ...t, photo_url: url }));
          updateTrip(tripId, { photo_url: url });
        }}
        height={160}
        className="rounded-2xl mb-4 tg-card"
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <h1 className="text-2xl font-bold" style={{ color: "white" }}>{trip.destination_name}</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
            {trip.start_date} — {trip.end_date}
          </p>
          {getEffectiveStops(trip).length > 1 && (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
              {getEffectiveStops(trip).map((s) => `${s.name} (${s.days}d)`).join(" → ")}
            </p>
          )}
        </div>
      </PlaceBanner>

      {tab === "itinerary" && (
        <ItineraryTab
          trip={trip}
          onSave={save("itinerary")}
          aiSlot={
            <AIGenerateCard
              trip={trip}
              onGenerated={(newItems) => save("itinerary")([...(trip.itinerary || []), ...newItems])}
            />
          }
        />
      )}
      {tab === "budget" && <BudgetTab trip={trip} onSave={save("budget")} />}
      {tab === "convert" && <ConverterTab homeCurrency={trip.home_currency || "USD"} />}
      {tab === "map" && <TripMap trip={trip} onSave={save("map_pins")} />}
      {tab === "pack" && <PackingTab trip={trip} onSave={save("packing")} />}

      <div className="tg-bottom-nav flex">
        {TRIP_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2"
              style={{ color: active ? "var(--stamp)" : "var(--text-muted)" }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminPanel({ onBack }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listAllTripsAsAdmin()
      .then(setRows)
      .catch((err) => setError(err.message || "Could not load admin data"));
  }, []);

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "var(--bg)" }}>
      <button onClick={onBack} className="mb-4 text-sm underline" style={{ color: "var(--text-secondary)" }}>
        ← My trips
      </button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Admin: all trips</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Every trip, every user.</p>

      {error && <p style={{ color: "var(--stamp)" }}>{error}</p>}
      {!error && rows === null && <p style={{ color: "var(--text-body)" }}>Loading…</p>}
      {rows && rows.length === 0 && <p style={{ color: "var(--text-secondary)" }}>No trips created yet.</p>}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((t) => (
            <div key={t.id} className="p-4 rounded-2xl tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.destination_name}</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t.start_date} — {t.end_date}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>{t.user_email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePanel({ session, onBack }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => getAvatarUrl(session.user.id));
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      setAvatarBroken(false);
    } catch (err) {
      setAvatarError(err.message || "Could not upload photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const memberSince = session.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  const submitPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await changePassword(newPassword);
      setSuccess("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "var(--bg)" }}>
      <button onClick={onBack} className="mb-4 text-sm underline" style={{ color: "var(--text-secondary)" }}>
        ← My trips
      </button>
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Profile</h1>

      <div className="flex flex-col items-center mb-4">
        <div
          className="relative rounded-full overflow-hidden mb-2 tg-card"
          style={{ width: 96, height: 96, background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {!avatarBroken ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={36} style={{ color: "var(--icon-empty)" }} />
            </div>
          )}
          {avatarBusy && (
            <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: "rgba(0,0,0,0.4)", color: "white" }}>
              Uploading…
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarBusy}
          className="text-sm underline"
          style={{ color: "var(--text-secondary)" }}
        >
          {avatarBroken ? "Add a photo" : "Change photo"}
        </button>
        {avatarError && <p className="text-sm mt-1" style={{ color: "var(--stamp)" }}>{avatarError}</p>}
      </div>

      <div className="p-4 rounded-2xl mb-4 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Email</p>
        <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>{session.user.email}</p>
        {memberSince && (
          <>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Member since</p>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{memberSince}</p>
          </>
        )}
      </div>

      <div className="p-4 rounded-2xl mb-4 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Plan</p>
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>Free</p>
      </div>

      <form onSubmit={submitPassword} className="p-4 rounded-2xl mb-4 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Change password</p>

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>New password</label>
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Confirm new password</label>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        {error && <p className="text-sm mb-3" style={{ color: "var(--stamp)" }}>{error}</p>}
        {success && <p className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>{success}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
          style={{ color: "var(--primary-text)" }}
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>

      <button onClick={signOut} className="w-full py-2.5 rounded-lg font-semibold tg-btn" style={{ border: "1px solid var(--border)", color: "var(--stamp)", background: "var(--surface)" }}>
        Sign out
      </button>
    </div>
  );
}

function Dashboard({ session }) {
  const [homeTab, setHomeTab] = useState("home");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [openTripId, setOpenTripId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => {
    setLoading(true);
    setLoadError("");
    listTrips()
      .then(setTrips)
      .catch((err) => setLoadError(err.message || "Could not load your trips"))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  if (showProfile) {
    return <ProfilePanel session={session} onBack={() => setShowProfile(false)} />;
  }

  if (openTripId) {
    return <TripHub tripId={openTripId} onBack={() => setOpenTripId(null)} />;
  }

  return (
    <div className="min-h-screen px-4 pt-6" style={{ background: "var(--bg)", paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>TABIGO</h1>
        <div className="flex items-center gap-4">
          {isAdmin(session) && (
            <button onClick={() => setShowAdmin(true)} className="text-sm underline" style={{ color: "var(--stamp)" }}>
              Admin
            </button>
          )}
          <button
            onClick={() => setShowProfile(true)}
            aria-label="Profile"
            className="p-2 rounded-full tg-btn"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <User size={16} />
          </button>
        </div>
      </div>

      {homeTab === "home" && (
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "55vh" }}>
          <p style={{ color: "var(--text-secondary)" }}>Your next adventure starts here.</p>
        </div>
      )}

      {homeTab === "explore" && (
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "55vh" }}>
          <Compass size={40} style={{ color: "var(--icon-empty)" }} />
          <p className="mt-3" style={{ color: "var(--text-secondary)" }}>Explore is coming soon.</p>
        </div>
      )}

      {homeTab === "trips" && (
        <>
          {loading ? (
            <p style={{ color: "var(--text-body)" }}>Loading…</p>
          ) : loadError ? (
            <p style={{ color: "var(--stamp)" }}>Couldn't load your trips: {loadError}</p>
          ) : trips.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>No trips yet — tap + below to plan your first one.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {trips.map((t) => (
                <button key={t.id} onClick={() => setOpenTripId(t.id)} className="text-left rounded-2xl overflow-hidden tg-card relative">
                  <PlaceBanner
                    placeName={photoQuery(t)}
                    savedUrl={t.photo_url}
                    onResolved={(url) => updateTrip(t.id, { photo_url: url })}
                    height={140}
                  >
                    <span
                      role="button"
                      aria-label={`Delete ${t.destination_name}`}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        setDeleteTarget(t);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full"
                      style={{ background: "rgba(0,0,0,0.45)", color: "white" }}
                    >
                      <Trash2 size={14} />
                    </span>
                    <div className="absolute inset-0 flex flex-col justify-end p-3">
                      <p className="font-semibold text-sm leading-tight" style={{ color: "white" }}>{t.destination_name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {t.start_date} — {t.end_date}
                      </p>
                    </div>
                  </PlaceBanner>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-sm p-6 rounded-2xl tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Delete this trip?</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              "{deleteTarget.destination_name}" and everything in it — itinerary, budget, packing list — will be
              permanently deleted. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg font-semibold tg-btn"
                style={{ border: "1px solid var(--border)", color: "var(--text-body)", background: "var(--surface)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteTrip(deleteTarget.id);
                    setDeleteTarget(null);
                    refresh();
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-stamp"
                style={{ color: "white" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTrip && (
        <NewTripWizard
          onClose={() => setShowNewTrip(false)}
          onCreated={() => {
            setShowNewTrip(false);
            refresh();
            setHomeTab("trips");
          }}
        />
      )}

      <div className="tg-bottom-nav flex items-center justify-around">
        <button
          onClick={() => setHomeTab("trips")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={{ color: homeTab === "trips" ? "var(--stamp)" : "var(--text-muted)" }}
        >
          <Luggage size={20} strokeWidth={homeTab === "trips" ? 2.5 : 2} />
          <span className="text-[11px] font-medium">Trips</span>
        </button>

        <button
          onClick={() => setShowNewTrip(true)}
          aria-label="Create new trip"
          className="flex items-center justify-center rounded-full tg-btn tg-btn-primary shrink-0"
          style={{ width: 56, height: 56, marginTop: -28, color: "var(--primary-text)" }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => setHomeTab("explore")}
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={{ color: homeTab === "explore" ? "var(--stamp)" : "var(--text-muted)" }}
        >
          <Compass size={20} strokeWidth={homeTab === "explore" ? 2.5 : 2} />
          <span className="text-[11px] font-medium">Explore</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthStateChange(setSession);
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
  }

  return session ? <Dashboard session={session} /> : <AuthScreen />;
}
