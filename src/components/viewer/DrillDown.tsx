import { useState } from "react";
import type { Session, ExportTheme } from "@/types";
import { groupByTopic, stripTags } from "@/lib/utils";
import { buildPdfHtml } from "@/lib/pdf";

interface DrillDownProps {
  session: Session;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEditLines: (sessionId: string, lines: { content: string }[]) => void;
}

export function DrillDown({ session, onBack, onDelete, onEditLines }: DrillDownProps) {
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ExportTheme>("ink");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const groups = groupByTopic(session.lines);

  const showStatus = (msg: string) => {
    setExportStatus(msg);
    setTimeout(() => setExportStatus(null), 2500);
  };

  const handleExportPdf = async () => {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: `${session.title.replace(/\s+/g, "_").toLowerCase()}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!path) return;

    // Abre o HTML em uma janela oculta e manda imprimir como PDF
    const html = buildPdfHtml(session, selectedTheme);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Cria iframe oculto para imprimir sem abrir janela
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
        showStatus("exported ✓");
      }, 2000);
    };
  } catch (e) {
    console.error("[Export PDF]", e);
    showStatus("failed ✗");
  }
};

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(session.lines.map((l) => l.content).join("\n"));
      showStatus("copied ✓");
    } catch (e) { console.error("[Copy]", e); showStatus("failed ✗"); }
  };

  const handleExportMd = async () => {
    try {
      const content = `# ${session.title}\n\n${session.lines.map((l) => `- ${l.content}`).join("\n")}`;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${session.title.replace(/\s+/g, "_").toLowerCase()}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (path) { await writeTextFile(path, content); showStatus("exported ✓"); }
    } catch (e) { console.error("[Export MD]", e); showStatus("failed ✗"); }
  };

  const handleExportTxt = async () => {
    try {
      const content = `${session.title}\n${"─".repeat(30)}\n\n${session.lines.map((l) => l.content).join("\n")}`;
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${session.title.replace(/\s+/g, "_").toLowerCase()}.txt`,
        filters: [{ name: "Text", extensions: ["txt"] }],
      });
      if (path) { await writeTextFile(path, content); showStatus("exported ✓"); }
    } catch (e) { console.error("[Export TXT]", e); showStatus("failed ✗"); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="font-mono text-[13px] font-semibold text-slate-200 tracking-[0.04em] text-center px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
        {session.title}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {groups.map((group, gi) => (
              <tr key={gi} className="border-b border-white/[0.07] last:border-b-0">
                <td className="w-40 min-w-[160px] border-r border-white/[0.08] px-4 py-3.5 align-middle font-mono text-[10px] tracking-[0.04em] text-pink-400/80 capitalize break-words text-center">
                  {group.tag?.replace(/^#/, "") ?? ""}
                </td>
                <td className="px-4 py-2.5 align-top relative">
                  {editingGroup === gi ? (
                    <div>
                      <textarea
                        className="w-full bg-white/[0.04] border border-pink-400/35 rounded font-mono text-[12.5px] text-slate-200 leading-[1.7] p-2 resize-none outline-none caret-pink-400 min-h-[40px] overflow-hidden"
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        autoFocus
                      />
                      <div className="flex gap-1.5 mt-1.5 justify-end">
                        <button className="font-mono text-[8px] tracking-widest uppercase text-white/30 border border-white/10 rounded px-2 py-[3px] hover:text-white/60 transition-colors" onClick={() => setEditingGroup(null)}>cancel</button>
                        <button
                          className="font-mono text-[8px] tracking-widest uppercase text-pink-400 border border-pink-400/40 bg-pink-400/8 rounded px-2 py-[3px] hover:bg-pink-400/18 transition-colors"
                          onClick={() => {
                            const newLines = editValue.split("\n").map((l) => l.trim()).filter(Boolean);
                            const tag = group.tag ? group.tag.replace(/^#/, "") : "";
                            const tagged = newLines.map((l) => tag ? `${l} #${tag}` : l);
                            const allLines = [...session.lines];
                            const start = allLines.indexOf(group.lines[0]);
                            if (start !== -1) {
                              allLines.splice(start, group.lines.length, ...tagged.map((c) => ({ content: c })));
                              onEditLines(session.id, allLines);
                            }
                            setEditingGroup(null);
                          }}
                        >save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        {group.lines.map((line, li) => (
                          <div key={li} className="flex gap-2.5 py-[3px] border-b border-white/[0.03] last:border-b-0">
                            {/* Fix: dash visible */}
                            <span className="font-mono text-[10px] text-white/40 w-4 text-center flex-shrink-0 leading-[1.7]">—</span>
                            <span className="font-mono text-[12.5px] text-slate-200 leading-[1.7] flex-1 break-words select-text">
                              {group.tag ? stripTags(line.content) : line.content}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="absolute bottom-1.5 right-2 text-[11px] bg-none border-none text-white/20 hover:text-pink-400 transition-colors px-1 rounded"
                        onClick={() => { setEditingGroup(gi); setEditValue(group.lines.map((l) => group.tag ? stripTags(l.content) : l.content).join("\n")); }}
                      >✏</button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {/* Export row */}
            <tr>
              <td className="w-40 min-w-[160px] border-r border-white/[0.08] px-3 py-3.5 align-top">
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: "copy all", fn: handleCopyAll },
                    { label: "export .md", fn: handleExportMd },
                    { label: "export .txt", fn: handleExportTxt },
                    { label: "export .pdf", fn: () => setShowPdfModal(true) },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn} className="font-mono text-[8px] tracking-widest uppercase text-white/30 border border-white/10 rounded px-1.5 py-[3px] hover:text-accent hover:border-accent/35 transition-all text-left">
                      {label}
                    </button>
                  ))}
                  {/* Fix: status only shown here, doesn't touch date cell */}
                  {exportStatus && (
                    <span className={`font-mono text-[8px] tracking-wider mt-0.5 ${exportStatus.includes("✗") ? "text-red-400/70" : "text-accent/70"}`}>
                      {exportStatus}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 align-bottom">
                {/* Fix: date always visible, independent from export status */}
                <div className="text-right font-mono text-[8px] tracking-wider text-white/40 uppercase">
                  {session.date}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[rgba(12,13,18,0.99)] border border-white/[0.09] rounded-xl p-6 w-[500px] max-w-[calc(100vw-40px)] shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/38 mb-3.5">choose export theme</div>
            <div className="flex gap-2.5 mb-5">
              {(["ink", "night"] as ExportTheme[]).map((theme) => (
                <div key={theme} className={`flex-1 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${selectedTheme === theme ? "border-accent" : "border-transparent hover:border-white/20"}`} onClick={() => setSelectedTheme(theme)}>
                  <div className={theme === "ink" ? "bg-white p-3" : "bg-[#0e0f14] p-3"}>
                    <div className={`text-[10px] font-semibold border-b pb-1.5 mb-1 ${theme === "ink" ? "text-[#0d0d0d] border-[#111] font-serif italic" : "text-[#f0f2f7] border-white/10 font-mono"}`}>Sample Title</div>
                    <div className="flex gap-2 text-[7px]">
                      <span className={`w-12 ${theme === "ink" ? "text-[#0d0d0d] italic" : "text-pink-400 font-mono uppercase"}`}>Topic</span>
                      <span className={theme === "ink" ? "text-[#333]" : "text-white/60 font-mono"}>Sample note line here</span>
                    </div>
                  </div>
                  <div className={`font-mono text-[8px] tracking-widest uppercase text-center py-1.5 ${selectedTheme === theme ? "text-accent" : "text-white/33"} bg-[rgba(12,13,18,0.99)]`}>
                    {theme === "ink" ? "Minimal Ink" : "Night Study"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="font-mono text-[8px] tracking-widest uppercase text-white/30 border border-white/10 rounded px-3 py-1 hover:text-white/65 transition-colors" onClick={() => setShowPdfModal(false)}>cancel</button>
              <button className="font-mono text-[8px] tracking-widest uppercase text-accent border border-accent/35 bg-accent/8 rounded px-3 py-1 hover:bg-accent/17 transition-colors" onClick={() => { setShowPdfModal(false); handleExportPdf(); }}>export pdf</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}