import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Playground } from "./Playground";
import "./index.css";

const PLAYGROUND_ENABLED = true;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {PLAYGROUND_ENABLED ? <Playground /> : <App />}
  </React.StrictMode>
);
