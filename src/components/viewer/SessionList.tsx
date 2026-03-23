import type { Session } from "@/types";
import { highlightText } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface SessionListProps {
  sessions: Session[];
  searchQuery: string;
  selectedRow: number;
  onOpen: (index: number) => void;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, searchQuery, selectedRow, onOpen, onDelete }: SessionListProps) {
  const q = searchQuery.trim().toLowerCase();
  const filtered = [...sessions].reverse().filter(s =>
    !q ||
    s.title.toLowerCase().includes(q) ||
    s.lines.some(l => l.content.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 py-8">
        <span className="font-mono text-[9px] tracking-wider" style={{ color: "rgba(255,255,255,0.18)" }}>
          {q ? `no match for "${q}"` : "no sessions yet"}
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {filtered.map((s, i) => {
        const realIndex = sessions.indexOf(s);
        const match = q ? s.lines.find(l => l.content.toLowerCase().includes(q)) : null;
        const isSelected = i === selectedRow;

        return (
          <div
            key={s.id}
            className="flex items-center px-4 cursor-default group"
            style={{
              height: 48,
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              background: isSelected ? "rgba(255,255,255,0.03)" : "transparent",
              transition: "background 0.1s ease",
            }}
            onClick={() => onOpen(realIndex)}
          >
            <div className="flex flex-col gap-[3px] flex-1 min-w-0">
              <span
                className="font-mono text-[11px] truncate leading-none"
                style={{ color: "rgba(255,255,255,0.70)" }}
                dangerouslySetInnerHTML={{ __html: highlightText(s.title, q) }}
              />
              <span className="font-mono text-[9px] leading-snug" style={{ color: "rgba(255,255,255,0.24)", hyphens: "auto", overflowWrap: "break-word" }} lang="pt-BR">
                {match
                  ? <span dangerouslySetInnerHTML={{ __html: highlightText(match.content, q) }} />
                  : <>{s.date} · {s.lines.length} lines</>
                }
              </span>
            </div>

            <button
              className="flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity text-white/22 hover:text-red-400/70"
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
