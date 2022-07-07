import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Playground } from "./Playground";
import "./index.css";

const PLAYGROUND_ENABLED = false;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>{PLAYGROUND_ENABLED ? <Playground /> : <App />}</>
);
