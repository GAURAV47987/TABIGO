import { useEffect, useRef, useState } from "react";
import { Plus, X, Sparkles, Check } from "lucide-react";
import { createTrip, suggestPopularPlaces } from "./supabase";
import { geocodeDestination } from "./geocode";
import { searchPlaces } from "./geonames";
import { buildDatedStops } from "./stops";
import { getTripClimate } from "./weather";
import { CURRENCIES } from "./constants";
import { PlaceBanner } from "./PlacePhoto";

const STEPS = ["Destination", "Route", "Dates", "Add-ons"];

function PlaceAutocomplete({ value, onChange, onPick, placeholder, autoFocus }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const handleInput = (text) => {
    onChange(text);
    clearTimeout(timerRef.current);
    setError("");
    if (text.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchPlaces(text);
        setSuggestions(results);
        setOpen(true);
        if (!results.length) setError("No matches found for that search.");
      } catch (err) {
        setSuggestions([]);
        setError(err.message || "Place search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="relative flex-1">
      <input
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
      />
      {loading && <p className="absolute text-xs mt-1" style={{ color: "var(--text-muted)" }}>Searching…</p>}
      {!loading && error && <p className="absolute text-xs mt-1" style={{ color: "var(--stamp)" }}>{error}</p>}
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-10 left-0 right-0 mt-1 rounded-lg max-h-48 overflow-y-auto tg-card"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={i}
              onMouseDown={() => {
                onPick(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm"
              style={{ color: "var(--text-body)", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StampBadge({ label }) {
  return (
    <div
      className="absolute flex items-center justify-center text-center"
      style={{
        top: 12,
        right: 12,
        width: 74,
        height: 74,
        borderRadius: "50%",
        border: "3px dashed var(--stamp)",
        color: "var(--stamp)",
        background: "rgba(255,255,255,0.88)",
        transform: "rotate(-12deg)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        lineHeight: 1.15,
        padding: 6,
      }}
    >
      {label}
    </div>
  );
}

function JourneyStrip({ stops, onChangeDays, onRemove }) {
  return (
    <div className="flex items-start overflow-x-auto pb-2 -mx-1 px-1">
      {stops.map((s, i) => (
        <div key={`${s.name}-${i}`} className="flex items-start shrink-0">
          <div className="flex flex-col items-center" style={{ width: 92 }}>
            <div className="w-3 h-3 rounded-full mb-1 shrink-0" style={{ background: "var(--stamp)" }} />
            <p className="text-xs font-medium text-center px-1 leading-tight" style={{ color: "var(--text-primary)" }}>{s.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => onChangeDays(i, -1)}
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                −
              </button>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.days}d</span>
              <button
                type="button"
                onClick={() => onChangeDays(i, 1)}
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                +
              </button>
            </div>
            {stops.length > 1 && (
              <button type="button" onClick={() => onRemove(i)} className="text-[10px] underline mt-1" style={{ color: "var(--stamp)" }}>
                remove
              </button>
            )}
          </div>
          {i < stops.length - 1 && (
            <div className="shrink-0" style={{ width: 20, height: 2, borderTop: "2px dashed var(--border)", marginTop: 6 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewTripWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [stops, setStops] = useState([]);
  const [pendingName, setPendingName] = useState("");
  const [addingStop, setAddingStop] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [homeCurrency, setHomeCurrency] = useState("USD");
  const [climate, setClimate] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [geocodingName, setGeocodingName] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changeDays = (i, delta) => {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, days: Math.max(1, s.days + delta) } : s)));
  };
  const removeStop = (i) => setStops((prev) => prev.filter((_, idx) => idx !== i));

  const pickFirstPlace = (place) => {
    setError("");
    setStops([{ name: place.name, lat: place.lat, lng: place.lng, days: 3 }]);
    setStep(2);
  };

  const continueStep1 = async () => {
    if (!pendingName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const place = await geocodeDestination(pendingName.trim());
      setStops([{ name: pendingName.trim(), lat: place.lat, lng: place.lng, days: 3 }]);
      setStep(2);
    } catch (err) {
      setError(err.message || "Could not find that place");
    } finally {
      setBusy(false);
    }
  };

  const addStop = async (place) => {
    setStops((prev) => [...prev, { name: place.name, lat: place.lat, lng: place.lng, days: 2 }]);
    setAddingStop(false);
    setNewStopName("");
  };

  // Climate preview once a start date and at least one stop exist.
  useEffect(() => {
    if (step !== 3 || !startDate || !stops[0]) {
      setClimate(null);
      return;
    }
    let cancelled = false;
    const dated = buildDatedStops(stops, startDate);
    getTripClimate(stops[0].lat, stops[0].lng, startDate, dated[dated.length - 1].endDate)
      .then((c) => !cancelled && setClimate(c))
      .catch(() => !cancelled && setClimate(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, startDate]);

  // AI-curated add-on suggestions, fetched once when reaching step 4.
  useEffect(() => {
    if (step !== 4 || suggestions !== null || !stops[0]) return;
    setSuggestLoading(true);
    setSuggestError("");
    suggestPopularPlaces(stops[0].name)
      .then(setSuggestions)
      .catch((err) => setSuggestError(err.message || "Could not load suggestions"))
      .finally(() => setSuggestLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleSuggestion = async (place) => {
    const already = stops.some((s) => s.name === place.name);
    if (already) {
      setStops((prev) => prev.filter((s) => s.name !== place.name));
      return;
    }
    setGeocodingName(place.name);
    try {
      const geo = await geocodeDestination(place.name);
      setStops((prev) => [...prev, { name: place.name, lat: geo.lat, lng: geo.lng, days: 2 }]);
    } catch (err) {
      // Couldn't geocode this suggestion — just leave it unselected.
    } finally {
      setGeocodingName(null);
    }
  };

  const finalize = async () => {
    setBusy(true);
    setError("");
    try {
      const dated = buildDatedStops(stops, startDate);
      const endDate = dated[dated.length - 1].endDate;
      const trip = await createTrip({
        destinationName: tripName.trim() || stops.map((s) => s.name).join(" → "),
        lat: dated[0].lat,
        lng: dated[0].lng,
        startDate,
        endDate,
        homeCurrency,
        stops: dated,
      });
      onCreated(trip);
    } catch (err) {
      setError(err.message || "Could not create trip");
    } finally {
      setBusy(false);
    }
  };

  const climateNote =
    climate && climate.avgHigh != null
      ? `Expect around ${Math.round(climate.avgHigh)}°C${climate.rainyDays > 0 ? ", some rain" : ", mostly dry"}.`
      : null;

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50 py-8" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 tg-card flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Step {step} of {STEPS.length} · {STEPS[step - 1]}
          </p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-5 shrink-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 h-1.5 rounded-full" style={{ background: i < step ? "var(--stamp)" : "var(--border)" }} />
          ))}
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Where are you going?</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Type a city, or a whole country to see its biggest cities.
              </p>
              <PlaceAutocomplete autoFocus placeholder="e.g. Bali, or Japan" value={pendingName} onChange={setPendingName} onPick={pickFirstPlace} />
              {error && <p className="text-sm mt-3" style={{ color: "var(--stamp)" }}>{error}</p>}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>Your route</h2>

              <PlaceBanner placeName={stops[0]?.name} height={150} className="rounded-xl mb-4 tg-card">
                <StampBadge label={stops[0]?.name} />
              </PlaceBanner>

              <JourneyStrip stops={stops} onChangeDays={changeDays} onRemove={removeStop} />

              {addingStop ? (
                <div className="flex gap-2 items-center mt-2">
                  <PlaceAutocomplete autoFocus placeholder="e.g. Paris" value={newStopName} onChange={setNewStopName} onPick={addStop} />
                  <button type="button" onClick={() => setAddingStop(false)} style={{ color: "var(--text-tertiary)" }}>
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingStop(true)}
                  className="flex items-center gap-1 text-sm mt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Plus size={14} /> Add another stop
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>When are you going?</h2>

              <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Trip name (optional)</label>
              <input
                placeholder={stops.map((s) => s.name).join(" → ")}
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-lg"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
              />

              <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mb-1 px-3 py-2 rounded-lg"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
              />
              {climateNote && (
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>☀ {climateNote}</p>
              )}
              {!climateNote && <div className="mb-3" />}

              <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Home currency (for budget totals)</label>
              <select
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Popular add-ons</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Tap a stamp to add it to your route — collect as many as you like.
              </p>

              {suggestLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Finding ideas…</p>}
              {suggestError && <p className="text-sm" style={{ color: "var(--stamp)" }}>{suggestError}</p>}

              {suggestions && suggestions.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {suggestions.map((place) => {
                    const added = stops.some((s) => s.name === place.name);
                    const loadingThis = geocodingName === place.name;
                    return (
                      <button
                        key={place.name}
                        type="button"
                        onClick={() => toggleSuggestion(place)}
                        disabled={loadingThis}
                        className="text-left p-3 rounded-xl tg-card relative"
                        style={{
                          background: added ? "color-mix(in srgb, var(--stamp) 14%, var(--surface))" : "var(--surface)",
                          border: added ? "1.5px solid var(--stamp)" : "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold" style={{ color: added ? "var(--stamp)" : "var(--text-primary)" }}>
                            {place.name}
                          </span>
                          {added && <Check size={14} style={{ color: "var(--stamp)" }} />}
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {loadingThis ? "Adding…" : place.reason}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions && suggestions.length === 0 && !suggestLoading && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No suggestions this time — that's fine, your route is ready as-is.</p>
              )}

              <JourneyStrip stops={stops} onChangeDays={changeDays} onRemove={removeStop} />

              {error && <p className="text-sm mt-2" style={{ color: "var(--stamp)" }}>{error}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5 shrink-0">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-lg font-semibold tg-btn"
              style={{ border: "1px solid var(--border)", color: "var(--text-body)", background: "var(--surface)" }}
            >
              Back
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={continueStep1}
              disabled={busy || !pendingName.trim()}
              className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
              style={{ color: "var(--primary-text)" }}
            >
              {busy ? "Finding…" : "Continue"}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={stops.length === 0}
              className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
              style={{ color: "var(--primary-text)" }}
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={!startDate}
              className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
              style={{ color: "var(--primary-text)" }}
            >
              Next
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={finalize}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-stamp"
              style={{ color: "white" }}
            >
              {busy ? "Creating…" : <><Sparkles size={14} className="inline mr-1" />Create trip</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
