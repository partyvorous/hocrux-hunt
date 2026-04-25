"use client";

export default function ParseltongueSheet() {
  return (
    <main
      style={{
        fontFamily: "Georgia, serif",
        maxWidth: "680px",
        margin: "0 auto",
        padding: "40px 32px",
        color: "#1a1a1a",
        background: "#fff",
        minHeight: "100vh",
      }}
    >
      {/* Print button — hidden when printing */}
      <div style={{ textAlign: "right", marginBottom: "24px" }} className="no-print">
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 20px",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
            fontSize: "14px",
          }}
        >
          🖨 Print Sheet
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "3px double #1a1a1a", paddingBottom: "20px", marginBottom: "28px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", margin: "0 0 8px" }}>
          — Volunteer Reference — Stage 1 —
        </p>
        <h1 style={{ fontSize: "32px", margin: "0 0 6px", letterSpacing: "2px" }}>
          🐍 Parseltongue Direction Sheet
        </h1>
        <p style={{ fontSize: "13px", fontStyle: "italic", margin: 0, color: "#444" }}>
          Tom Riddle's Diary · The Basilisk's Trail
        </p>
      </div>

      {/* How it works */}
      <div style={{ background: "#f7f4ee", border: "1px solid #c8b98a", borderRadius: "4px", padding: "16px 20px", marginBottom: "28px" }}>
        <p style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 10px" }}>
          How This Works
        </p>
        <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: "1.8" }}>
          <li>The team chooses <strong>2 Basilisk Walkers</strong> (walk backwards) and <strong>1 Guide</strong> (faces forward).</li>
          <li>Hand this sheet to the <strong>Guide only</strong>. Do not let the walkers see it.</li>
          <li>The Basilisk Walkers stand at the start, facing <strong>away</strong> from the path, eyes closed.</li>
          <li>The Guide reads out Parseltongue commands one at a time to steer both walkers.</li>
          <li>If either walker turns to face forward → <strong>restart from the beginning</strong>.</li>
          <li>Once both walkers reach the end, <strong>reveal the stage code</strong>.</li>
        </ol>
      </div>

      {/* Parseltongue dictionary */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 14px", borderBottom: "1px solid #ccc", paddingBottom: "6px" }}>
          Parseltongue Commands
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
          <thead>
            <tr style={{ background: "#1a1a1a", color: "#fff" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontFamily: "Georgia, serif", letterSpacing: "1px", fontSize: "12px", fontWeight: "normal", textTransform: "uppercase" }}>
                Say This
              </th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontFamily: "Georgia, serif", letterSpacing: "1px", fontSize: "12px", fontWeight: "normal", textTransform: "uppercase" }}>
                Means
              </th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontFamily: "Georgia, serif", letterSpacing: "1px", fontSize: "12px", fontWeight: "normal", textTransform: "uppercase" }}>
                Pronunciation
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { command: "Sssethik", meaning: "Keep walking backwards", pronunciation: "sss-ETH-ick" },
              { command: "Issstra", meaning: "Step left", pronunciation: "iss-STRA" },
              { command: "Ressstra", meaning: "Step right", pronunciation: "res-STRA" },
              { command: "Hisssst!", meaning: "Stop / Freeze", pronunciation: "HISSST" },
              { command: "Ssslowss", meaning: "Slow down", pronunciation: "sss-LOWSS" },
              { command: "Sssafe", meaning: "Path is clear, keep going", pronunciation: "sss-AYF" },
              { command: "Vissserath", meaning: "Almost there, final stretch", pronunciation: "vis-se-RATH" },
              { command: "Parssselthi!", meaning: "You've made it — well done!", pronunciation: "par-SSSEL-thi" },
              { command: "Ssserpeth!", meaning: "Restart — a walker turned around", pronunciation: "SSSR-peth" },
            ].map((row, i) => (
              <tr
                key={row.command}
                style={{ background: i % 2 === 0 ? "#fff" : "#f9f6f0", borderBottom: "1px solid #e0d8c8" }}
              >
                <td style={{ padding: "10px 14px", fontWeight: "bold", letterSpacing: "1px", fontSize: "16px" }}>
                  {row.command}
                </td>
                <td style={{ padding: "10px 14px", color: "#1a1a1a" }}>
                  {row.meaning}
                </td>
                <td style={{ padding: "10px 14px", fontStyle: "italic", color: "#666", fontSize: "13px" }}>
                  {row.pronunciation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sample sequence */}
      <div style={{ background: "#f0f4f0", border: "1px solid #8aaa8c", borderRadius: "4px", padding: "16px 20px", marginBottom: "28px" }}>
        <p style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 10px" }}>
          Example Command Sequence
        </p>
        <p style={{ fontSize: "13px", lineHeight: "1.9", margin: 0, fontFamily: "monospace", color: "#2a4a2a" }}>
          "Sssethik… Sssethik… Issstra… Hisssst!… Sssafe… Sssethik… Ressstra… Sssethik… Vissserath… Parssselthi!"
        </p>
      </div>

      {/* Volunteer notes */}
      <div style={{ border: "2px solid #1a1a1a", borderRadius: "4px", padding: "16px 20px" }}>
        <p style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 10px" }}>
          Volunteer Notes
        </p>
        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: "1.8", color: "#333" }}>
          <li>Watch both walkers closely — they <em>will</em> try to sneak a peek.</li>
          <li>If a walker peeks or turns forward, call out <strong>"Ssserpeth!"</strong> and send them back to start.</li>
          <li>The Guide may only speak in Parseltongue — no plain English directions allowed.</li>
          <li>Once both walkers successfully complete the path, give the team the stage code.</li>
          <li><strong>Keep this sheet</strong> — do not let participants walk away with it.</li>
        </ul>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "32px", borderTop: "1px solid #ccc", paddingTop: "16px" }}>
        <p style={{ fontSize: "11px", color: "#999", letterSpacing: "2px", margin: 0, textTransform: "uppercase" }}>
          Horcrux Hunt · Stage 1 Volunteer Sheet · Do Not Distribute
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          main { padding: 20px 24px; }
        }
      `}</style>
    </main>
  );
}
