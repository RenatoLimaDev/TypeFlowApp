import React from "react";
import ReactDOM from "react-dom/client";
import { Viewer } from "@/components/viewer/Viewer";
import { useViewerStore } from "@/store/useViewerStore";
import "@/styles/globals.css";

function ViewerApp() {
  const load = useViewerStore((s) => s.load);

  React.useEffect(() => {
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("session-saved", () => load());
    });
  }, [load]);

  return (
    <div className="flex flex-col w-full h-full">
      <Viewer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ViewerApp />
  </React.StrictMode>
);