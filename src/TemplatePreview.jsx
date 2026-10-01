import { useState } from "react";
import { X, Camera, Utensils, Sparkles } from "lucide-react";
import { createTrip, updateTrip } from "./supabase";
import { buildDatedStops } from "./stops";
import { enumerateDates } from "./dates";
import { PlaceBanner } from "./PlacePhoto";
import { useEdgeSwipeBack } from "./useEdgeSwipeBack";

const TYPE_ICON = {
  photo: <Camera size={14} style={{ color: "var(--stamp)" }} />,
  food: <Utensils size={14} style={{ color: "var(--text-secondary)" }} />,
};

export default function TemplatePreview({ template, onClose, onCreated }) {
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEdgeSwipeBack(onClose);

  const totalDays = template.stops.reduce((sum, s) => sum + s.days, 0);

  const useTemplate = async () => {
    if (!startDate) return;
    setBusy(true);
    setError("");
    try {
      const dated = buildDatedStops(template.stops, startDate);
      const endDate = dated[dated.length - 1].endDate;
      const calendarDates = enumerateDates(startDate, endDate);
      const itinerary = [];
      template.days.forEach((day) => {
        const date = calendarDates[day.day - 1];
        if (!date) return;
        day.items.forEach((item) => {
          itinerary.push({ id: crypto.randomUUID(), date, ...item });
        });
      });
      const trip = await createTrip({
        destinationName: template.name,
        lat: dated[0].lat,
        lng: dated[0].lng,
        startDate,
        endDate,
        homeCurrency: "USD",
        stops: dated,
      });
      // createTrip always starts a new trip with an empty itinerary —
      // fill in the template's pre-built one right after.
      await updateTrip(trip.id, { itinerary });
      onCreated(trip);
    } catch (err) {
      setError(err.message || "Could not create trip");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="w-full mx-auto" style={{ maxWidth: "var(--app-max-width)", paddingBottom: 110 }}>
        <PlaceBanner placeName={template.stops[0].name} height={180}>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full z-10" style={{ background: "rgba(0,0,0,0.45)", color: "white" }}>
            <X size={18} />
          </button>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <h1 className="text-xl font-bold" style={{ color: "white" }}>{template.name}</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{totalDays} days</p>
          </div>
        </PlaceBanner>

        <div className="px-4 pt-4">
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{template.tagline}</p>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            {template.stops.map((s) => `${s.name} (${s.days}d)`).join(" → ")}
          </p>

          {template.days.map((day) => (
            <div key={day.day} className="p-4 rounded-2xl mb-3 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Day {day.day}</p>
              <div className="flex flex-col gap-2">
                {day.items.map((item, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--bg)" }}>
                    <p className="flex items-center gap-1.5" style={{ color: "var(--text-body)" }}>
                      {TYPE_ICON[item.type]}
                      {item.time && <span className="font-semibold mr-1">{item.time}</span>}
                      {item.title}
                    </p>
                    {item.notes && <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="px-4 py-4"
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "var(--app-max-width)",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>When are you starting?</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
          />
          <button
            type="button"
            onClick={useTemplate}
            disabled={busy || !startDate}
            className="px-4 py-2 rounded-lg font-semibold tg-btn tg-btn-stamp whitespace-nowrap"
            style={{ color: "white" }}
          >
            {busy ? "Creating…" : <><Sparkles size={14} className="inline mr-1" />Use this</>}
          </button>
        </div>
        {error && <p className="text-sm mt-2" style={{ color: "var(--stamp)" }}>{error}</p>}
      </div>
    </div>
  );
}
