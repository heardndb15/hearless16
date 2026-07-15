const STARS: { top: string; left: string; size: number; opacity: number }[] = [
  { top: "8%", left: "12%", size: 14, opacity: 0.7 },
  { top: "14%", left: "82%", size: 10, opacity: 0.5 },
  { top: "22%", left: "45%", size: 16, opacity: 0.6 },
  { top: "30%", left: "68%", size: 8, opacity: 0.45 },
  { top: "38%", left: "20%", size: 12, opacity: 0.55 },
  { top: "46%", left: "90%", size: 10, opacity: 0.5 },
  { top: "52%", left: "8%", size: 18, opacity: 0.65 },
  { top: "58%", left: "55%", size: 9, opacity: 0.4 },
  { top: "64%", left: "35%", size: 13, opacity: 0.5 },
  { top: "70%", left: "78%", size: 11, opacity: 0.55 },
  { top: "76%", left: "15%", size: 15, opacity: 0.6 },
  { top: "82%", left: "60%", size: 8, opacity: 0.4 },
  { top: "88%", left: "40%", size: 12, opacity: 0.5 },
  { top: "93%", left: "85%", size: 10, opacity: 0.45 },
  { top: "97%", left: "25%", size: 14, opacity: 0.55 },
];

export default function StarfieldBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 120% 80% at 20% 10%, #1A2440 0%, transparent 55%)," +
          "radial-gradient(ellipse 100% 70% at 80% 25%, #131C33 0%, transparent 60%)," +
          "radial-gradient(ellipse 90% 90% at 50% 95%, #0C1120 0%, transparent 70%)," +
          "linear-gradient(160deg, #0A0E1A 0%, #10182C 50%, #0A0E1A 100%)",
      }}
    >
      {STARS.map((s, i) => (
        <svg
          key={i}
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          fill="#AFC6EA"
          style={{ position: "absolute", top: s.top, left: s.left, opacity: s.opacity }}
        >
          <path d="M12 0l2 10 10 2-10 2-2 10-2-10L0 12l10-2z" />
        </svg>
      ))}
    </div>
  );
}
