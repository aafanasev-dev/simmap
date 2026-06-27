# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # first time only
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build    # static build to dist/
npm run preview  # serve the built dist/ to verify

docker build -t radius-route-map .   # build static site + serve via nginx
docker run --rm -p 8080:80 radius-route-map
```

There is no test, lint, or typecheck setup in this project.

## Architecture

This is a single-screen Leaflet map app (flight-simulator planning tool, not for
real navigation) ported from a standalone Claude artifact. The whole app is one
component plus its imperative map engine.

- **`src/RadiusRouteMap.jsx`** is the entire app and the only file you normally
  edit. It has two distinct halves:
  1. The React component `RadiusRouteMap()` renders **static JSX markup only** —
     the panel, buttons, inputs, and `<div id="map">`. React holds no app state
     and does no re-rendering of map data.
  2. `initMap()` is a large vanilla-JS function (lifted verbatim from the
     original artifact) holding all logic: Leaflet setup, a plain `state` object,
     geodesic math, rendering, and event wiring. It reaches into the DOM with
     `document.getElementById` and updates `.innerHTML` / Leaflet layers
     directly — it does **not** use React state or refs for any of this.
- The two halves are bridged by a single `useEffect` in the component that calls
  `initMap()` once after mount and returns its cleanup function (`map.remove()`).
  A `initedRef` guard prevents double-initialisation.
- **`src/main.jsx`** bootstraps React **without `StrictMode`** — this is
  deliberate. StrictMode's double-mount would initialise the imperative map twice.
  Do not re-add StrictMode.
- **`artifact.js`** is the original standalone artifact this was ported from. It
  is not imported or built; treat it as historical reference, not live code.

### Consequences for editing

- To change layout/markup, edit the JSX in `RadiusRouteMap()`. To change
  behaviour, edit `initMap()`. The two are coupled by DOM element `id`s — a
  `getElementById` in `initMap()` must match an `id` in the JSX. JSX uses
  `className`/`defaultValue` (React attrs) but plain `id`s.
- State lives in the `state` object inside `initMap()` (mode, unit, speed, the
  radius circle, and the route points/budget), plus a separate `navState`/
  `navData`. There is no store and no prop flow.

### Two modes (toggled by `setMode`)

- **Radius**: one draggable centre pin; draws a true geodesic circle (not a
  Leaflet `L.circle`) via `geodesicRing`, with distance/diameter/cap-area stats.
- **Route**: click to drop waypoints inside a shrinking "budget" range circle;
  each leg is subtracted from the budget. Drags that would exceed the budget are
  reverted. Geodesic legs via `geodesicLine`.

The radius/budget control supports km/mi/nmi, and unlocks an "h" (hours) unit
only once a cruise speed is entered (`setHourOption`).

### Navaids (optional layer)

When enabled, `loadNavaids()` fetches `navaids.csv` from OurAirports at runtime
and parses it with PapaParse. Markers are viewport-culled and capped at `MAX_NAV`
(500), only shown at zoom ≥ `MIN_NAV_ZOOM`. Beacon popups can add the beacon as a
route waypoint.

## Runtime external dependencies

The app needs internet at runtime for OpenStreetMap tiles and (if navaids are
enabled) the OurAirports CSV. Leaflet and PapaParse are bundled from npm, not CDN.

## Deployment

`dist/` is fully static. The Docker image builds it and serves via nginx with an
SPA fallback (`nginx.conf`).
