import { useEffect, useState } from "react";
import {
  getSession,
  onAuthStateChange,
  signIn,
  signUp,
  signOut,
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  listAllTripsAsAdmin,
} from "./supabase";
import { geocodeDestination } from "./geocode";
import { isAdmin } from "./admin";
import ItineraryTab from "./Itinerary";

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
        <div className="max-w-sm text-center p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
        className="w-full max-w-sm p-6 rounded-2xl"
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
          className="w-full py-2.5 rounded-lg font-semibold mb-3"
          style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}
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

function NewTripModal({ onClose, onCreated }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const place = await geocodeDestination(destination);
      const trip = await createTrip({
        destinationName: destination,
        lat: place.lat,
        lng: place.lng,
        startDate,
        endDate,
      });
      onCreated(trip);
    } catch (err) {
      setError(err.message || "Could not create trip");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-6 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>New trip</h2>

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Where to?</label>
        <input
          required
          placeholder="e.g. Bali, Indonesia"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Start</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>End</label>
            <input
              type="date"
              required
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
            />
          </div>
        </div>

        {error && <p className="text-sm mb-3" style={{ color: "var(--stamp)" }}>{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text-body)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}
          >
            {busy ? "Creating…" : "Create trip"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AIGenerateCard() {
  return (
    <div className="p-4 rounded-2xl mb-4" style={{ background: "var(--surface)", border: "1px dashed var(--tape)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>✨ Generate itinerary with AI</p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        Draft a full day-by-day plan for this trip automatically — coming very soon.
      </p>
      <button disabled className="w-full py-2.5 rounded-lg font-semibold opacity-50 cursor-not-allowed" style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}>
        Generate itinerary
      </button>
    </div>
  );
}

function TripHub({ tripId, onBack }) {
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    getTrip(tripId).then(setTrip);
  }, [tripId]);

  if (!trip) return <p className="p-6" style={{ color: "var(--text-body)" }}>Loading…</p>;

  const saveItinerary = (itinerary) => {
    setTrip((t) => ({ ...t, itinerary }));
    updateTrip(tripId, { itinerary });
  };

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "var(--bg)" }}>
      <button onClick={onBack} className="mb-4 text-sm underline" style={{ color: "var(--text-secondary)" }}>
        ← My trips
      </button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{trip.destination_name}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {trip.start_date} — {trip.end_date}
      </p>
      <ItineraryTab trip={trip} onSave={saveItinerary} aiSlot={<AIGenerateCard />} />
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
            <div key={t.id} className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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

function Dashboard({ session }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [openTripId, setOpenTripId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const refresh = () => {
    setLoading(true);
    listTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  if (openTripId) {
    return <TripHub tripId={openTripId} onBack={() => setOpenTripId(null)} />;
  }

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>TABIGO</h1>
        <div className="flex items-center gap-4">
          {isAdmin(session) && (
            <button onClick={() => setShowAdmin(true)} className="text-sm underline" style={{ color: "var(--stamp)" }}>
              Admin
            </button>
          )}
          <button onClick={signOut} className="text-sm underline" style={{ color: "var(--text-secondary)" }}>
            Sign out
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowNewTrip(true)}
        className="w-full mb-6 py-3 rounded-xl font-semibold"
        style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}
      >
        + New trip
      </button>

      {loading ? (
        <p style={{ color: "var(--text-body)" }}>Loading…</p>
      ) : trips.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No trips yet — plan your first one above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenTripId(t.id)}
              className="text-left p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.destination_name}</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t.start_date} — {t.end_date}
              </p>
            </button>
          ))}
        </div>
      )}

      {showNewTrip && (
        <NewTripModal
          onClose={() => setShowNewTrip(false)}
          onCreated={(trip) => {
            setShowNewTrip(false);
            refresh();
            setOpenTripId(trip.id);
          }}
        />
      )}
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
