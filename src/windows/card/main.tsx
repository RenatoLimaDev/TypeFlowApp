import ReactDOM from "react-dom/client";
import { Card } from "@/components/card/Card";
import { saveSession } from "@/lib/storage";
import { generateId, formatDate } from "@/lib/utils";
import "@/styles/globals.css";

function CardApp() {
  const handleFinish = (title: string, lines: { content: string }[]) => {
    const session = {
      id: generateId(),
      title,
      lines,
      date: formatDate(),
      createdAt: Date.now(),
    };
    saveSession(session);

    import("@tauri-apps/api/event").then(({ emit }) => {
      emit("session-saved", session);
    });

  };

  return <Card onFinish={handleFinish} />;
}

// StrictMode removido — causa duplo registro de event listeners em dev
// o que duplica cada tecla capturada pelo hook global do Rust
ReactDOM.createRoot(document.getElementById("root")!).render(<CardApp />);