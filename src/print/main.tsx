import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@shared/theme.css";
import "./print.css";
import { PrintApp } from "./PrintApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrintApp />
  </StrictMode>,
);
