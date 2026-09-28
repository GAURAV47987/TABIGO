import { CheckCircle2, Circle } from "lucide-react";

export function Section({ icon, title, children, accent }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2" style={{ color: accent }}>
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function ChecklistRow({ checked, onClick, text, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 transition-transform active:scale-[0.98]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {checked ? (
        <CheckCircle2 size={16} style={{ color: accent }} className="shrink-0" />
      ) : (
        <Circle size={16} style={{ color: "var(--icon-empty)" }} className="shrink-0" />
      )}
      <span
        className="text-sm"
        style={{ color: checked ? "var(--text-faint)" : "var(--text-body)", textDecoration: checked ? "line-through" : "none" }}
      >
        {text}
      </span>
    </button>
  );
}

export function ProgressRing({ pct, size = 64, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary-bg)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: "var(--text-primary)" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
