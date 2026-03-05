import { useState } from "react";
import type { Session } from "@/types";
import { sessionSize, highlightText } from "@/lib/utils";

interface SessionListProps {
  sessions: Session[];
  searchQuery: string;
  selectedRow: number;
  onOpen: (index: number) => void;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, searchQuery, selectedRow, onOpen, onDelete }: SessionListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const filtered = [...sessions]
    .reverse()
    .filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.lines.some((l) => l.content.toLowerCase().includes(q))
    );

  if (filtered.length === 0) {
    return (
      // Fix: text visible (white/40 instead of invisible)
      <div className="font-mono text-[11px] text-white/40 text-center py-9 tracking-wider">
        {q ? `nothing matched "${q}"` : "no sessions yet — finish one to see it here"}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((s, i) => {
        const realIndex = sessions.indexOf(s);
        const match = q ? s.lines.find((l) => l.content.toLowerCase().includes(q)) : null;
        const isSelected = i === selectedRow;

        return (
          <div
            key={s.id}
            className={`
              flex items-center justify-between gap-2.5 px-1 py-2.5
              border-b border-white/[0.04] last:border-b-0
              rounded cursor-pointer transition-all animate-fadeIn
              ${isSelected ? "bg-accent/8 outline outline-1 outline-accent/20" : "hover:bg-white/[0.04]"}
            `}
            style={{ animationDelay: `${i * 22}ms` }}
            onClick={() => onOpen(realIndex)}
          >
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              {/* Fix: title always accent color, highlighted when searched */}
              <div
                className="font-mono text-[12px] tracking-[0.02em] text-accent"
                dangerouslySetInnerHTML={{ __html: highlightText(s.title, q) }}
              />
              {/* Fix: subtitle/date visible in white/50, dash white/50 */}
              <div className="font-mono text-[9px] text-white/50 tracking-[0.04em] whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                {match ? (
                  <>
                    {/* Fix: dash visible */}
                    <span className="text-white/50">—</span>
                    <span dangerouslySetInnerHTML={{ __html: highlightText(match.content, q) }} />
                  </>
                ) : (
                  `${sessionSize(s.lines)}  ·  ${s.date}`
                )}
              </div>
            </div>

            {/* Fix: X button visible */}
            <button
              className={`font-mono text-[8px] tracking-widest uppercase px-1.5 py-px rounded border transition-all flex-shrink-0 ${
                confirmId === s.id
                  ? "text-red-400 border-red-400/55 bg-red-400/10"
                  : "text-white/40 border-white/20 hover:text-red-400 hover:border-red-400/38"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (confirmId === s.id) {
                  onDelete(s.id);
                  setConfirmId(null);
                } else {
                  setConfirmId(s.id);
                  setTimeout(() => setConfirmId((id) => (id === s.id ? null : id)), 2000);
                }
              }}
            >
              {confirmId === s.id ? "delete?" : "✕"}
            </button>
          </div>
        );
      })}
    </div>
  );
}