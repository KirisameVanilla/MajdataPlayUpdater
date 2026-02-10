import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PathProvider } from "./contexts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PathProvider>
      <App />
    </PathProvider>
  </React.StrictMode>,
);
