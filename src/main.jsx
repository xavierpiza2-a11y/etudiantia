// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Polices embarquées dans l'application (aucune requête vers Internet)
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./index.css";
import "./theme.css"; // peau cartoon + ergonomie mobile (après index.css)
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
