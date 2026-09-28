import { useMemo } from "react";
import { Luggage } from "lucide-react";
import { PACKING_CATEGORIES } from "./constants";
import { Section, ChecklistRow, ProgressRing } from "./ui";

export default function PackingTab({ trip, onSave }) {
  const checklist = trip.packing || {};

  const totalItems = useMemo(() => PACKING_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0), []);
  const checkedCount = useMemo(() => {
    let count = 0;
    PACKING_CATEGORIES.forEach((cat) => {
      cat.items.forEach((_, i) => {
        if (checklist[`pack-${cat.id}-${i}`]) count++;
      });
    });
    return count;
  }, [checklist]);

  const pct = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const toggle = (key) => onSave({ ...checklist, [key]: !checklist[key] });

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        A general-purpose packing checklist — tap items to check them off.
      </p>
      <div className="flex items-center gap-4 mb-5">
        <ProgressRing pct={pct} />
        <div>
          <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{checkedCount} / {totalItems} packed</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Tap items below to check them off.</div>
        </div>
      </div>

      {PACKING_CATEGORIES.map((cat) => (
        <Section key={cat.id} icon={<Luggage size={15} />} title={cat.title} accent="var(--text-primary)">
          <div className="space-y-1.5">
            {cat.items.map((item, i) => {
              const key = `pack-${cat.id}-${i}`;
              return <ChecklistRow key={i} checked={!!checklist[key]} onClick={() => toggle(key)} text={item} accent="var(--text-primary)" />;
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
