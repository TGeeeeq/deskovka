import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@shared/theme.css";
import "./collect-page.css";
import { CollectApp } from "./CollectApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CollectApp />
  </StrictMode>,
);
