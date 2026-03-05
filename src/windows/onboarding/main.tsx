import React from "react";
import ReactDOM from "react-dom/client";
import { Onboarding } from "@/components/onboarding/Onboarding";
import "@/styles/globals.css";

function OnboardingApp() {
  const handleDismiss = async () => {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const win = await WebviewWindow.getByLabel("onboarding");
  await win?.hide();
};

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Onboarding onDismiss={handleDismiss} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OnboardingApp />
  </React.StrictMode>
);
