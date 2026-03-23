import { useState } from "react";
import type { Session } from "@/types";
import { stripTags, groupByTopic } from "@/lib/utils";

interface DrillDownProps {
  session: Session;
  onDelete: () => void;
}

export function DrillDown({ session, onDelete }: DrillDownProps) {
  const [status, setStatus] = useState<string | null>(null);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(session.lines.map(l => l.content).join("\n"));
      flash("copied");
    } catch { flash("error"); }
  };

  const handleMd = async () => {
    try {
      const content = `# ${session.title}\n\n${session.lines.map(l => `- ${l.content}`).join("\n")}`;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${session.title.replace(/\s+/g, "_").toLowerCase()}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (path) { await writeTextFile(path, content); flash("saved"); }
    } catch { flash("error"); }
  };

  const handleTxt = async () => {
    try {
      const content = `${session.title}\n\n${session.lines.map(l => l.content).join("\n")}`;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${session.title.replace(/\s+/g, "_").toLowerCase()}.txt`,
        filters: [{ name: "Text", extensions: ["txt"] }],
      });
      if (path) { await writeTextFile(path, content); flash("saved"); }
    } catch { flash("error"); }
  };

  const groups = groupByTopic(session.lines);
  let lineNum = 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Lines */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-2">
            {group.tag && (
              <div
                className="font-mono text-[8px] tracking-[0.14em] uppercase mb-1.5"
                style={{ color: "rgba(125,211,252,0.35)", paddingLeft: 24 }}
              >
                {group.tag.replace(/^#/, "")}
              </div>
            )}
            {group.lines.map((line, li) => {
              lineNum++;
              const n = lineNum;
              return (
                <div key={li} className="flex items-baseline gap-3 py-[3px]">
                  <span
                    className="font-mono text-[9px] select-none flex-shrink-0 text-right"
                    style={{ color: "rgba(255,255,255,0.14)", width: 16 }}
                  >
                    {n}
                  </span>
                  <span
                    className="font-mono text-[14px] leading-relaxed whitespace-nowrap overflow-hidden"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {group.tag ? stripTags(line.content) : line.content}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-0.5 px-3 py-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {[
          { label: "copy", fn: handleCopy, danger: false },
          { label: ".md",  fn: handleMd,   danger: false },
          { label: ".txt", fn: handleTxt,  danger: false },
          { label: "delete", fn: onDelete, danger: true  },
        ].map(({ label, fn, danger }) => (
          <button
            key={label}
            onClick={fn}
            className={`font-mono text-[9px] transition-colors px-2 py-1 rounded ${
              danger
                ? "text-white/20 hover:text-red-400/60 hover:bg-red-400/[0.04]"
                : "text-white/25 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            {label}
          </button>
        ))}
        {status && (
          <span className="font-mono text-[9px] ml-1" style={{ color: "rgba(125,211,252,0.5)" }}>
            {status}
          </span>
        )}
        <span
          className="font-mono text-[9px] ml-auto"
          style={{ color: "rgba(255,255,255,0.14)" }}
        >
          {session.date}
        </span>
      </div>
    </div>
  );
}
