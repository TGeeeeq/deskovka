import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@shared/theme.css";
import "./presentation.css";
import { Presentation } from "./Presentation";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Presentation />
  </StrictMode>,
);
