import React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

const rootElement =
  document.getElementById("root");

function showFatalError(error) {
  const message =
    error?.stack ||
    error?.message ||
    String(error);

  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      box-sizing: border-box;
      padding: 32px;
      background: #080c10;
      color: #ffffff;
      font-family: Arial, sans-serif;
    ">
      <div style="
        max-width: 1000px;
        margin: 0 auto;
      ">
        <h1 style="
          margin: 0 0 20px;
          color: #ff6b6b;
          font-size: 28px;
        ">
          NUMENDEX STARTUP ERROR
        </h1>

        <pre style="
          white-space: pre-wrap;
          word-break: break-word;
          padding: 20px;
          border: 1px solid #333;
          border-radius: 12px;
          background: #111820;
          color: #ffffff;
          font-size: 14px;
          line-height: 1.6;
        ">${message
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}</pre>
      </div>
    </div>
  `;
}

window.addEventListener(
  "error",
  (event) => {
    showFatalError(
      event.error ||
        event.message
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    showFatalError(
      event.reason
    );
  }
);

async function startApp() {
  try {
    const appModule =
      await import(
        "./App.jsx"
      );

    const App =
      appModule.default;

    if (!App) {
      throw new Error(
        "App.jsx does not have a default export."
      );
    }

    createRoot(
      rootElement
    ).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    showFatalError(
      error
    );
  }
}

startApp();