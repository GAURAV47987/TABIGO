import { useEffect, useMemo, useState } from "react";
import { Luggage } from "lucide-react";
import { buildPackingCategories } from "./constants";
import { getTripClimate } from "./weather";
import { Section, ChecklistRow, ProgressRing } from "./ui";

export default function PackingTab({ trip, onSave }) {
  const checklist = trip.packing || {};
  const [climate, setClimate] = useState(undefined); // undefined = loading, null = unavailable

  useEffect(() => {
    if (!trip.start_date) {
      setClimate(null);
      return;
    }
    let cancelled = false;
    setClimate(undefined);
    getTripClimate(trip.destination_lat, trip.destination_lng, trip.start_date, trip.end_date)
      .then((c) => !cancelled && setClimate(c))
      .catch(() => !cancelled && setClimate(null));
    return () => {
      cancelled = true;
    };
  }, [trip.destination_lat, trip.destination_lng, trip.start_date, trip.end_date]);

  const categories = useMemo(() => buildPackingCategories(climate || null), [climate]);

  const totalItems = useMemo(() => categories.reduce((sum, cat) => sum + cat.items.length, 0), [categories]);
  const checkedCount = useMemo(() => {
    let count = 0;
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (checklist[`pack-${cat.id}-${item}`]) count++;
      });
    });
    return count;
  }, [categories, checklist]);

  const pct = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const toggle = (key) => onSave({ ...checklist, [key]: !checklist[key] });

  const climateNote =
    !trip.start_date
      ? "Add your trip dates in the Itinerary tab to get a climate-aware packing list."
      : climate === undefined
      ? "Checking the weather for this trip…"
      : climate === null || climate.avgHigh == null
      ? "Couldn't get weather data for this destination — showing a general list."
      : climate.source === "forecast"
      ? `Based on the live forecast (avg high ${Math.round(climate.avgHigh)}°C).`
      : `Based on typical weather for these dates (avg high ${Math.round(climate.avgHigh)}°C).`;

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{climateNote}</p>
      <div className="flex items-center gap-4 mb-5">
        <ProgressRing pct={pct} />
        <div>
          <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{checkedCount} / {totalItems} packed</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Tap items below to check them off.</div>
        </div>
      </div>

      {categories.map((cat) => (
        <Section key={cat.id} icon={<Luggage size={15} />} title={cat.title} accent="var(--text-primary)">
          <div className="space-y-1.5">
            {cat.items.map((item) => {
              const key = `pack-${cat.id}-${item}`;
              return <ChecklistRow key={key} checked={!!checklist[key]} onClick={() => toggle(key)} text={item} accent="var(--text-primary)" />;
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
