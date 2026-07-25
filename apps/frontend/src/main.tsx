import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles.css";
import "./styles/landing.css";
import "./styles/login.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
