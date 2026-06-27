import React from "react";
import { createRoot } from "react-dom/client";
import RadiusRouteMap from "./RadiusRouteMap.jsx";
import "leaflet/dist/leaflet.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  // StrictMode intentionally omitted: the map logic is imperative and would
  // initialise twice under StrictMode's double-mount in development.
  <RadiusRouteMap />
);
