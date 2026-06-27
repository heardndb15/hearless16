"use client";

export type Fingers = {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  shape?: "o" | "default";
};

export function HandSign({
  fingers,
  size = 120,
  color = "#0EA5E9",
}: {
  fingers: Fingers;
  size?: number;
  color?: string;
}) {
  const { thumb, index, middle, ring, pinky, shape } = fingers;
  const gray = "#CBD5E1";
  const palm = "#E2E8F0";

  if (shape === "o") {
    return (
      <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
        <rect x="5" y="60" width="70" height="36" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
        {[7, 23, 39, 55].map((x, i) => (
          <rect key={i} x={x} y="44" width="14" height="18" rx="6" fill={gray} />
        ))}
        <circle cx="40" cy="34" r="17" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M 14 62 Q 8 46 22 34" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }

  const cols = [
    { key: "pinky",  x: 7,  ext: !!pinky  },
    { key: "ring",   x: 23, ext: !!ring   },
    { key: "middle", x: 39, ext: !!middle },
    { key: "index",  x: 55, ext: !!index  },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
      {cols.map(({ key, x, ext }) => (
        <rect key={key} x={x} y={ext ? 2 : 44} width={14} height={ext ? 58 : 17} rx={6} fill={ext ? color : gray} />
      ))}
      <rect x="5" y="58" width="70" height="38" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
      <rect
        x="-6"
        y={thumb ? -25 : -11}
        width="13"
        height={thumb ? 27 : 13}
        rx="5"
        fill={thumb ? color : gray}
        transform="translate(16, 72) rotate(-40)"
      />
    </svg>
  );
}
