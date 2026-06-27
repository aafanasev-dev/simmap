# Radius & Route Map (React)

A React port of the Claude-generated Leaflet artifact. It renders an interactive
map with two modes:

- **Radius** — drop a centre pin and see a true geodesic circle with distance,
  diameter, cap area, and optional flight time.
- **Route** — drop waypoints inside a remaining-range "budget" circle, with
  undo/clear and drag-to-adjust.

Optional **Navaids** (VOR / NDB / DME) load worldwide beacons from OurAirports.

## Prerequisites

- [Node.js](https://nodejs.org) 18 or newer (includes `npm`)

## Run locally

```bash
npm install      # first time only
npm run dev      # start the dev server
```

Vite prints a local URL (default <http://localhost:5173>). Open it in a browser.

## Production build

```bash
npm run build    # outputs static files to dist/
npm run preview  # serve the built dist/ locally to verify
```

The contents of `dist/` are fully static and can be hosted on any static host.

## Run with Docker

The `Dockerfile` builds the static site and serves it with nginx.

```bash
docker build -t radius-route-map .
docker run --rm -p 8080:80 radius-route-map
```

Then open <http://localhost:8080>. (Internet access is still needed at runtime
for the OSM tiles and OurAirports navaid data.)

## Notes

- Map tiles come from OpenStreetMap and the navaid CSV from OurAirports — both
  require internet access at runtime.
- Leaflet and PapaParse are installed from npm (not CDN), so the only external
  runtime dependencies are the tile/data fetches above.

## Project layout

```
index.html              # Vite entry
src/main.jsx            # React bootstrap (imports leaflet + app CSS)
src/RadiusRouteMap.jsx  # the component: JSX markup + Leaflet logic in useEffect
src/styles.css          # styles lifted from the original artifact
```
