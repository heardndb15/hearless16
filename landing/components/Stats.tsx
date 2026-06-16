export default function Stats() {
  return (
    <section style={{ background: "var(--heading)" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "var(--accent)",
              }}
            >
              1.8M
            </div>
            <div style={{ fontSize: 16, color: "var(--card)", marginTop: 8 }}>
              глухих и слабослышащих в Казахстане
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "var(--accent)",
              }}
            >
              200M+
            </div>
            <div style={{ fontSize: 16, color: "var(--card)", marginTop: 8 }}>
              людей с нарушениями слуха в мире
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "var(--accent)",
              }}
            >
              0
            </div>
            <div style={{ fontSize: 16, color: "var(--card)", marginTop: 8 }}>
              конкурентов в Казахстане
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
