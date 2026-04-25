"use client";

// Unicode chess pieces: white = uppercase FEN, black = lowercase FEN
const PIECE_UNICODE: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

// Returns a 64-element array (rank 8→1, file a→h) from a FEN position string
function parseFen(fen: string): (string | null)[] {
  const position = fen.split(" ")[0];
  const ranks = position.split("/");
  const board: (string | null)[] = [];
  for (const rank of ranks) {
    for (const ch of rank) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) board.push(null);
      } else {
        board.push(ch);
      }
    }
  }
  return board;
}

interface ChessBoardProps {
  fen: string;
  houseColor: string;
  houseGlow: string;
}

export default function ChessBoard({ fen, houseColor, houseGlow }: ChessBoardProps) {
  const board = parseFen(fen);

  return (
    <div className="space-y-2">
      {/* Coordinate: files (a–h) */}
      <div className="flex items-center">
        {/* rank-label spacer */}
        <div style={{ width: "1.25rem" }} />
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((f) => (
          <div
            key={f}
            className="flex-1 text-center font-cinzel"
            style={{ fontSize: "0.55rem", color: `${houseColor}80`, letterSpacing: "0.05em" }}
          >
            {f}
          </div>
        ))}
      </div>

      {/* Board rows: rank 8 (index 0) down to rank 1 (index 7) */}
      {Array.from({ length: 8 }, (_, rankIdx) => {
        const rankLabel = 8 - rankIdx;
        return (
          <div key={rankIdx} className="flex items-center">
            {/* rank label */}
            <div
              className="font-cinzel text-center flex-shrink-0"
              style={{ width: "1.25rem", fontSize: "0.55rem", color: `${houseColor}80` }}
            >
              {rankLabel}
            </div>

            {Array.from({ length: 8 }, (_, fileIdx) => {
              const squareIdx = rankIdx * 8 + fileIdx;
              const piece = board[squareIdx];
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const isWhitePiece = piece && piece === piece.toUpperCase();

              return (
                <div
                  key={fileIdx}
                  className="flex-1 flex items-center justify-center select-none"
                  style={{
                    aspectRatio: "1",
                    background: isLight
                      ? "rgba(240,217,160,0.12)"
                      : "rgba(181,136,99,0.18)",
                    border: isLight
                      ? "1px solid rgba(240,217,160,0.08)"
                      : "1px solid rgba(181,136,99,0.12)",
                    fontSize: "clamp(1.1rem, 4.5vw, 1.6rem)",
                    lineHeight: 1,
                  }}
                >
                  {piece && (
                    <span
                      style={{
                        color: isWhitePiece ? "#f5f0e8" : "#1a1208",
                        filter: isWhitePiece
                          ? `drop-shadow(0 0 4px ${houseGlow}) drop-shadow(0 1px 0 rgba(0,0,0,0.9))`
                          : "drop-shadow(0 0 3px rgba(0,0,0,0.8)) drop-shadow(0 1px 0 rgba(255,255,255,0.15))",
                      }}
                    >
                      {PIECE_UNICODE[piece] ?? piece}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Caption */}
      <p
        className="text-center font-crimson italic"
        style={{ fontSize: "0.7rem", color: `${houseColor}60`, marginTop: "0.5rem" }}
      >
        White to move — checkmate in one
      </p>
    </div>
  );
}
