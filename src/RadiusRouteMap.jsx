import { useEffect, useRef } from "react";
import L from "leaflet";
import Papa from "papaparse";
// Glider polars are bundled as raw CSV text (Vite ?raw). To add a glider later,
// import its CSV and add an entry to GLIDERS below (or switch to import.meta.glob).
import blanikRaw from "./blanik_L-13.csv?raw";

export default function RadiusRouteMap() {
  const appRef = useRef(null);
  const initedRef = useRef(false);

  useEffect(() => {
    // Guard against React re-running the effect on the same DOM (e.g. StrictMode).
    if (initedRef.current) return;
    initedRef.current = true;

    const cleanup = initMap();
    return () => {
      initedRef.current = false;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div id="app" ref={appRef}>
      <div id="map"></div>

      <div id="panel">
        <div id="panel-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <h1>Ranges &amp; Flight Plan</h1>
          <button id="collapse-btn" title="Collapse">
            −
          </button>
        </div>

        <div id="panel-body">
          <div id="mode-toggle">
            <button className="seg-btn active" id="mode-glider">
              Glider
            </button>
            <button className="seg-btn" id="mode-ranges">
              Ranges
            </button>
            <button className="seg-btn" id="mode-plan">
              Flight plan
            </button>
          </div>

          {/* RANGES MODE — fuel-based control */}
          <div id="ranges-control">
            <div className="field-label">Centre airport (ICAO)</div>
            <div className="radius-row">
              <input
                type="text"
                id="airport-input"
                maxLength="4"
                autoComplete="off"
                spellCheck="false"
                placeholder="e.g. LSGB"
                style={{ flex: 1, minWidth: 0, textTransform: "uppercase" }}
              />
            </div>
            <div className="note" id="airport-status" style={{ marginTop: 6 }}>
              Type an airport code to centre the circles there.
            </div>

            <div className="field-label" style={{ marginTop: 14 }}>
              Fuel capacity
            </div>
            <div className="radius-row">
              <input type="number" id="fuel-input" min="0" step="any" defaultValue="50" />
              <select id="fuel-unit" defaultValue="gal">
                <option value="gal">gal</option>
                <option value="L">L</option>
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>

            <label className="nav-toggle" style={{ marginTop: 12 }}>
              <input type="checkbox" id="reserve-toggle" defaultChecked /> <span>Include 40 min reserve</span>
            </label>

            <div className="rng-regime" style={{ marginTop: 14 }}>
              <div className="field-label">
                <span className="range-swatch rng-max"></span> Max cruise
              </div>
              <div className="radius-row">
                <input type="number" className="rng-speed" id="rng-max-speed" min="0" step="any" placeholder="speed" defaultValue="140" />
                <input type="number" className="rng-cons" id="rng-max-cons" min="0" step="any" placeholder="cons." defaultValue="11" />
                <span className="rng-cons-unit">gal/h</span>
              </div>
            </div>
            <div className="rng-regime" style={{ marginTop: 12 }}>
              <div className="field-label">
                <span className="range-swatch rng-opt"></span> Optimal cruise
              </div>
              <div className="radius-row">
                <input type="number" className="rng-speed" id="rng-opt-speed" min="0" step="any" placeholder="speed" defaultValue="120" />
                <input type="number" className="rng-cons" id="rng-opt-cons" min="0" step="any" placeholder="cons." defaultValue="8" />
                <span className="rng-cons-unit">gal/h</span>
              </div>
            </div>
            <div className="rng-regime" style={{ marginTop: 12 }}>
              <div className="field-label">
                <span className="range-swatch rng-end"></span> Best endurance
              </div>
              <div className="radius-row">
                <input type="number" className="rng-speed" id="rng-end-speed" min="0" step="any" placeholder="speed" defaultValue="90" />
                <input type="number" className="rng-cons" id="rng-end-cons" min="0" step="any" placeholder="cons." defaultValue="6" />
                <span className="rng-cons-unit">gal/h</span>
              </div>
            </div>

            <div className="radius-row" style={{ marginTop: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="field-label">Speed unit</div>
                <select id="rng-speed-unit" defaultValue="kt" style={{ width: "100%" }}>
                  <option value="kt">kt</option>
                  <option value="km/h">km/h</option>
                  <option value="mph">mph</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="field-label">Show radius in</div>
                <select id="rng-dist-unit" defaultValue="nmi" style={{ width: "100%" }}>
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                  <option value="nmi">nmi</option>
                </select>
              </div>
            </div>
          </div>

          <div id="radius-control">
            <div className="field-label" id="rc-label">
              Radius
            </div>
            <div className="radius-row">
              <input type="number" id="radius-input" min="0" step="any" defaultValue="100" />
              <select id="unit-select" defaultValue="km">
                <option value="km">km</option>
                <option value="mi">mi</option>
                <option value="nmi">nmi</option>
              </select>
            </div>
            <input type="range" id="radius-slider" min="0" max="1000" defaultValue="0" />
            <div className="presets" id="presets"></div>

            <div style={{ marginTop: 14 }}>
              <div className="field-label">
                Cruise speed{" "}
                <span
                  style={{
                    textTransform: "none",
                    letterSpacing: 0,
                    fontWeight: 500,
                    color: "var(--muted)",
                  }}
                >
                  · optional, unlocks hours
                </span>
              </div>
              <div className="radius-row">
                <input type="number" id="speed-input" min="0" step="any" placeholder="e.g. 100" />
                <select id="speed-unit" defaultValue="kt">
                  <option value="kt">kt</option>
                  <option value="km/h">km/h</option>
                  <option value="mph">mph</option>
                </select>
              </div>
            </div>
          </div>

          {/* GLIDER MODE — glide-range control */}
          <div id="glider-control" style={{ display: "none" }}>
            <div className="field-label">Altitude</div>
            <div className="radius-row">
              <input type="number" id="glide-height-input" min="0" step="any" defaultValue="1000" />
              <select id="glide-height-unit" defaultValue="m">
                <option value="m">m</option>
                <option value="ft">ft</option>
              </select>
              <select id="glide-datum" defaultValue="AGL">
                <option value="AGL">AGL</option>
                <option value="MSL">MSL</option>
              </select>
            </div>

            <div id="glide-ground-row" style={{ marginTop: 14, display: "none" }}>
              <div className="field-label">Ground elevation · auto from map</div>
              <div className="ground-readout">
                <span className="ground-value" id="glide-ground-value">
                  —
                </span>
              </div>
              <div className="note" id="glide-ground-status" style={{ marginTop: 6 }}>
                Terrain height at the launch point (source: Open-Meteo).
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="field-label">Aerodynamic quality</div>
              <div className="q-toggle">
                <button className="seg-btn active" id="glide-q-direct">
                  Direct
                </button>
                <button className="seg-btn" id="glide-q-polar">
                  From polar
                </button>
              </div>

              <div id="glide-direct-block" style={{ marginTop: 10 }}>
                <div className="radius-row">
                  <input type="number" id="glide-ratio-input" min="0" step="any" defaultValue="40" />
                  <span className="unit-suffix">:1</span>
                </div>
              </div>

              <div id="glide-polar-block" style={{ marginTop: 10, display: "none" }}>
                <div className="radius-row">
                  <select id="glide-glider-select" style={{ flex: 1, minWidth: 0 }}></select>
                </div>
                <div className="polar-chart" id="glide-polar-chart"></div>
                <div className="note" id="glide-polar-readout" style={{ marginTop: 6 }}></div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="field-label">Glider speed</div>
              <div className="radius-row">
                <input type="number" id="glide-speed-input" min="0" step="any" defaultValue="55" />
                <select id="glide-speed-unit" defaultValue="kt">
                  <option value="kt">kt</option>
                  <option value="km/h">km/h</option>
                  <option value="mph">mph</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="field-label">Wind</div>
              <div className="wind-block">
                <div className="wind-dial" id="glide-wind-dial" title="Drag to set the direction the wind blows toward">
                  <span className="wind-tick wt-n">N</span>
                  <span className="wind-tick wt-e">E</span>
                  <span className="wind-tick wt-s">S</span>
                  <span className="wind-tick wt-w">W</span>
                  <span className="wind-needle" id="glide-wind-needle"></span>
                  <span className="wind-dir-readout" id="glide-wind-dir">
                    0°
                  </span>
                </div>
                <div className="wind-speed-col">
                  <div className="field-label">Wind speed · blows toward arrow</div>
                  <div className="radius-row">
                    <input type="number" id="glide-wind-speed-input" min="0" step="any" defaultValue="0" />
                    <select id="glide-wind-speed-unit" defaultValue="kt">
                      <option value="kt">kt</option>
                      <option value="km/h">km/h</option>
                      <option value="mph">mph</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RANGES MODE */}
          <div id="ranges-view">
            <div className="stats" id="ranges-stats"></div>
            <div className="note" style={{ marginTop: 14 }}>
              Click or drag the pin to move the centre. Each circle is the{" "}
              <b>full one-way range</b> for that regime — a <b>true geodesic circle</b>, so
              Web&nbsp;Mercator stretches it toward the poles.
            </div>
          </div>

          {/* ROUTE MODE */}
          <div id="route-view" style={{ display: "none" }}>
            <div id="current-radius">
              <span className="cr-label">Current circle radius</span>
              <span className="cr-value" id="current-radius-value">
                —
              </span>
              <span className="cr-sub" id="current-radius-time"></span>
            </div>
            <div className="stats" id="route-stats" style={{ marginTop: 14 }}></div>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn-sec" id="undo-btn">
                ↶ Undo point
              </button>
              <button className="btn-sec danger" id="clear-btn">
                Clear route
              </button>
            </div>
            <div className="note" style={{ marginTop: 14 }}>
              Click to drop the <b style={{ color: "var(--green)" }}>start</b>, then click{" "}
              <b>inside the circle</b> to extend. Each leg is subtracted from the budget; the circle
              shows the range left. Drag a point to adjust — a move that exceeds the budget is{" "}
              <b>cancelled</b>. Beacons can be added via their popup.
            </div>

            <div className="field-label" style={{ marginTop: 16 }}>
              Route points
            </div>
            <div id="route-points"></div>
          </div>

          {/* GLIDER MODE — view */}
          <div id="glider-view" style={{ display: "none" }}>
            <div className="stats" id="glide-stats"></div>
            <div className="note" style={{ marginTop: 14 }}>
              Range a glider can reach by gliding down from the given altitude at the
              entered <b>glide ratio</b> (L/D), in <b>still air</b> — no wind or sink.
              The shape is a <b>true geodesic circle</b>. Click or drag the pin to move
              the launch point.
            </div>
          </div>

          <button id="reset" style={{ marginTop: 4 }}>
            Reset view
          </button>
        </div>
      </div>

      {/* LAYERS PANEL (top-right) */}
      <div id="layers-panel">
        <div id="layers-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span className="layers-title">Map layers</span>
          <button id="layers-collapse-btn" title="Collapse">
            −
          </button>
        </div>

        <div id="layers-panel-body">
          <div className="layer-group-label">Navaids</div>
          <div className="layer-row">
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-nav" data-cat="VOR" /> <span>VOR</span>
            </label>
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-nav" data-cat="DME" /> <span>DME / TACAN</span>
            </label>
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-nav" data-cat="NDB" /> <span>NDB</span>
            </label>
          </div>
          <div className="note" id="nav-status" style={{ marginTop: 8 }}>
            Tick a beacon type to load worldwide navaids (source: OurAirports). Click a beacon for
            its frequency.
          </div>
          <div className="layer-group-label" style={{ marginTop: 12 }}>
            Airports
          </div>
          <div className="layer-row">
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-apt" data-grp="small" /> <span>Small</span>
            </label>
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-apt" data-grp="medium" /> <span>Medium</span>
            </label>
            <label className="nav-toggle">
              <input type="checkbox" className="lyr-apt" data-grp="large" /> <span>Large</span>
            </label>
          </div>
          <div className="note" id="apt-status" style={{ marginTop: 8 }}>
            Tick an airport size to load airports (source: OurAirports). Click one for runways
            &amp; frequencies.
          </div>
          <div className="layer-group-label" style={{ marginTop: 12 }}>
            Waypoints
          </div>
          <label className="nav-toggle">
            <input type="checkbox" id="wpt-enable" /> <span>5-letter fixes</span>
          </label>
          <div className="note" id="wpt-status" style={{ marginTop: 8 }}>
            Tick to load worldwide RNAV waypoints (X-Plane GPL data, cycle 2012).
          </div>
        </div>
      </div>

      <div id="coord-readout">—</div>
      <div id="sim-disclaimer">For flight-simulator use only — not for real-world navigation.</div>
      <div id="toast"></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The original artifact logic, lifted verbatim and wrapped so it can be run
// once the React markup is mounted. Returns a cleanup function.
// ---------------------------------------------------------------------------
function initMap() {
  var R = 6371008.8;
  var SAVE_KEY = "simmap.state",
    SAVE_VERSION = 2;
  var UNITS = { km: 1000, mi: 1609.344, nmi: 1852 };
  var SPEED_UNITS = { kt: 0.5144444, "km/h": 0.2777778, mph: 0.44704 };
  var HEIGHT_UNITS = { m: 1, ft: 0.3048 };
  var RESERVE_MIN = 40;
  // Range regimes (order = draw order; later = drawn on top). Colours per request.
  var REGIMES = [
    { key: "max", label: "Max cruise", color: "#dc2626" },
    { key: "opt", label: "Optimal cruise", color: "#4f6df5" },
    { key: "end", label: "Best endurance", color: "#16a34a" },
  ];
  var DIST_PRESETS = [
    ["10 km", 10000],
    ["50 km", 50000],
    ["100 km", 100000],
    ["500 km", 500000],
    ["1000 km", 1000000],
  ];
  var TIME_PRESETS = [
    ["1 h", 1],
    ["2 h", 2],
    ["3 h", 3],
    ["5 h", 5],
    ["8 h", 8],
  ];
  var SLIDER_MIN = 1000,
    SLIDER_MAX = 20000000;
  var DEFAULT_CENTER = [44.0, 20.5],
    DEFAULT_ZOOM = 6;
  var EPS = 1;
  var NAV_URL = "https://davidmegginson.github.io/ourairports-data/navaids.csv";
  var MIN_NAV_ZOOM = 6,
    MAX_NAV = 500;
  var APT_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
  var RWY_URL = "https://davidmegginson.github.io/ourairports-data/runways.csv";
  var AFREQ_URL = "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";
  var MIN_APT_ZOOM = 7,
    MAX_APT = 400;
  var APT_TYPES = { small_airport: 1, medium_airport: 2, large_airport: 3 };
  var WPT_URL =
    "https://raw.githubusercontent.com/mcantsin/x-plane-navdata/master/earth_fix.dat";
  var MIN_WPT_ZOOM = 7,
    MAX_WPT = 400;
  var ELEV_URL = "https://api.open-meteo.com/v1/elevation";
  // Glider polars. Each entry names its sink/LD columns in the bundled CSV; two
  // Blaník variants share one file. Add a glider = import a CSV + push an entry.
  var GLIDERS = [
    { id: "blanik-l13", name: "Blaník L-13", csv: blanikRaw, sinkCol: "sink_ms_L13_472kg", ldCol: "LD_L13" },
    { id: "blanik-l13ac", name: "Blaník L-13AC", csv: blanikRaw, sinkCol: "sink_ms_L13AC_500kg", ldCol: "LD_L13AC" },
  ];

  function toRad(d) {
    return (d * Math.PI) / 180;
  }
  function toDeg(r) {
    return (r * 180) / Math.PI;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function haversineM(a, b) {
    var lat1 = toRad(a.lat),
      lat2 = toRad(b.lat);
    var dphi = toRad(b.lat - a.lat),
      dlmb = toRad(b.lng - a.lng);
    var h =
      Math.sin(dphi / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlmb / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function bearingDeg(a, b) {
    var p1 = toRad(a.lat),
      p2 = toRad(b.lat),
      dl = toRad(b.lng - a.lng);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360; // 0..360, true
  }
  function geodesicRing(c, radiusM, n) {
    n = n || 256;
    var lat1 = toRad(c.lat),
      lng1deg = c.lng,
      lng1 = toRad(c.lng);
    var d = radiusM / R,
      sinLat1 = Math.sin(lat1),
      cosLat1 = Math.cos(lat1),
      cosD = Math.cos(d),
      sinD = Math.sin(d);
    var ring = [];
    for (var i = 0; i <= n; i++) {
      var brng = (i / n) * 2 * Math.PI;
      var lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
      var lng2 = lng1 + Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));
      var lat2d = toDeg(lat2),
        lng2d = toDeg(lng2),
        delta = lng2d - lng1deg;
      while (delta > 180) {
        lng2d -= 360;
        delta -= 360;
      }
      while (delta < -180) {
        lng2d += 360;
        delta += 360;
      }
      ring.push([lat2d, lng2d]);
    }
    return ring;
  }
  // Forward geodesic: point at distM along a true bearing from c. Returns L.latLng.
  function destPoint(c, brngDeg, distM) {
    var lat1 = toRad(c.lat),
      lng1 = toRad(c.lng),
      d = distM / R,
      br = toRad(brngDeg);
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
    var lng2 =
      lng1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return L.latLng(toDeg(lat2), ((toDeg(lng2) + 540) % 360) - 180);
  }

  // ---- Glider polars ----
  var polarCache = {};
  function gliderById(id) {
    for (var i = 0; i < GLIDERS.length; i++) if (GLIDERS[i].id === id) return GLIDERS[i];
    return GLIDERS[0];
  }
  // Parse a glider's CSV into speed/sink/LD points, sorted by speed. Skips blank
  // and comment lines (the CSV has both `#…` and quoted `"#…"` comments) and reads
  // column positions from the header row. Memoised per glider id.
  function parsePolar(g) {
    if (polarCache[g.id]) return polarCache[g.id];
    var lines = g.csv.split(/\r?\n/),
      header = null,
      idx = {},
      pts = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln || ln.charAt(0) === "#" || ln.slice(0, 2) === '"#') continue;
      var cols = ln.split(",");
      if (!header) {
        header = cols;
        for (var c = 0; c < header.length; c++) idx[header[c].trim()] = c;
        continue;
      }
      var vMs = parseFloat(cols[idx.v_ms]),
        vKmh = parseFloat(cols[idx.v_kmh]),
        sink = parseFloat(cols[idx[g.sinkCol]]),
        ld = parseFloat(cols[idx[g.ldCol]]);
      if (isNaN(vMs) || isNaN(sink) || isNaN(ld)) continue;
      pts.push({ vMs: vMs, vKmh: vKmh, sink: Math.abs(sink), ld: ld });
    }
    pts.sort(function (a, b) {
      return a.vMs - b.vMs;
    });
    polarCache[g.id] = pts;
    return pts;
  }
  // Linear-interpolate sink & LD at an airspeed (m/s), clamped to the data range.
  function polarAt(pts, vMs) {
    if (!pts.length) return { sink: 0, ld: 0, clamped: false };
    var lo = pts[0],
      hi = pts[pts.length - 1];
    if (vMs <= lo.vMs) return { sink: lo.sink, ld: lo.ld, clamped: vMs < lo.vMs };
    if (vMs >= hi.vMs) return { sink: hi.sink, ld: hi.ld, clamped: vMs > hi.vMs };
    for (var i = 1; i < pts.length; i++) {
      if (vMs <= pts[i].vMs) {
        var a = pts[i - 1],
          b = pts[i],
          t = (vMs - a.vMs) / (b.vMs - a.vMs);
        return { sink: a.sink + t * (b.sink - a.sink), ld: a.ld + t * (b.ld - a.ld), clamped: false };
      }
    }
    return { sink: hi.sink, ld: hi.ld, clamped: false };
  }
  // Best-glide point = max L/D (where a line from the origin is tangent to the polar).
  function polarBest(pts) {
    var best = pts[0];
    for (var i = 1; i < pts.length; i++) if (pts[i].ld > best.ld) best = pts[i];
    return best;
  }
  function geodesicLine(a, b) {
    var lat1 = toRad(a.lat),
      lng1 = toRad(a.lng),
      lat2 = toRad(b.lat),
      lng2 = toRad(b.lng);
    var dphi = lat2 - lat1,
      dlmb = lng2 - lng1;
    var hav =
      Math.sin(dphi / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlmb / 2) ** 2;
    var delta = 2 * Math.asin(Math.min(1, Math.sqrt(hav)));
    if (delta < 1e-9) return [
      [a.lat, a.lng],
      [b.lat, b.lng],
    ];
    var segs = Math.max(2, Math.min(128, Math.round((delta * R) / 30000)));
    var sinDelta = Math.sin(delta),
      pts = [];
    for (var i = 0; i <= segs; i++) {
      var f = i / segs;
      var A = Math.sin((1 - f) * delta) / sinDelta,
        B = Math.sin(f * delta) / sinDelta;
      var x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
      var y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
      var z = A * Math.sin(lat1) + B * Math.sin(lat2);
      pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
    }
    for (var j = 1; j < pts.length; j++) {
      while (pts[j][1] - pts[j - 1][1] > 180) pts[j][1] -= 360;
      while (pts[j][1] - pts[j - 1][1] < -180) pts[j][1] += 360;
    }
    return pts;
  }

  function capArea(radiusM) {
    return 2 * Math.PI * R * R * (1 - Math.cos(radiusM / R));
  }
  function fmt(n, dp) {
    return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function fmtCoord(ll) {
    var ns = ll.lat >= 0 ? "N" : "S",
      ew = ll.lng >= 0 ? "E" : "W";
    return (
      Math.abs(ll.lat).toFixed(4) +
      "° " +
      ns +
      ", " +
      Math.abs(((ll.lng + 540) % 360) - 180).toFixed(4) +
      "° " +
      ew
    );
  }
  function fmtTime(sec) {
    if (!isFinite(sec) || sec <= 0) return "0 min";
    var h = Math.floor(sec / 3600),
      m = Math.round((sec % 3600) / 60);
    if (m === 60) {
      h++;
      m = 0;
    }
    return (h > 0 ? h + " h " : "") + m + " min";
  }

  // ---- Persisted state ----
  // The whole app state (view, mode, units, layers, drawn geometry) is mirrored
  // into a single localStorage key so it survives reloads. loadState() only reads
  // localStorage, so it is safe to call before the map/DOM exist.
  function loadState() {
    try {
      var d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      return d && d.v === SAVE_VERSION ? d : null;
    } catch (e) {
      return null;
    }
  }
  var saved = loadState();

  // ---- Map ----
  var map = L.map("map", {
    center: saved && saved.view ? [saved.view.lat, saved.view.lng] : DEFAULT_CENTER,
    zoom: saved && saved.view ? saved.view.zoom : DEFAULT_ZOOM,
    zoomControl: false,
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 19,
  });
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution:
      "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)",
    maxNativeZoom: 17,
    maxZoom: 19,
  }).addTo(map);
  map.attributionControl.setPosition("bottomleft");
  L.control.zoom({ position: "topright" }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(map);

  var pinIcon = L.divIcon({
    className: "",
    html: '<div class="center-pin"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  var glidePinIcon = L.divIcon({
    className: "",
    html: '<div class="center-pin glide"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  function routeMarkerIcon(role) {
    return L.divIcon({
      className: "",
      html: '<div class="route-pin ' + role + '"></div>',
      iconSize: [15, 15],
      iconAnchor: [7.5, 7.5],
    });
  }
  function legLabelMarker(latlng, deg, distM) {
    var txt = ("00" + (Math.round(deg) % 360)).slice(-3) + "°";
    var fu = UNITS[state.unit] || 1000,
      uName = UNITS[state.unit] ? state.unit : "km",
      d = distM / fu;
    txt += " · " + fmt(d, d < 100 ? 1 : 0) + " " + uName;
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "",
        html: '<div class="leg-label">' + txt + "</div>",
        iconSize: [82, 16],
        iconAnchor: [41, 8],
      }),
      interactive: false,
      keyboard: false,
    });
  }
  function rangeTimeMarker(latlng, text, key) {
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "",
        html: '<div class="range-time rng-' + key + '">' + text + "</div>",
        iconSize: [50, 16],
        iconAnchor: [25, 8],
      }),
      interactive: false,
      keyboard: false,
    });
  }

  // ---- State ----
  var state = {
    mode: "glider",
    unit: "km",
    speedMS: 0,
    speedUnit: "kt",
    ranges: {
      center: L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
      airport: "",
      fuel: 50,
      fuelUnit: "gal",
      speedUnit: "kt",
      distUnit: "nmi",
      reserve: true,
      profiles: {
        max: { speed: 140, cons: 11 },
        opt: { speed: 120, cons: 8 },
        end: { speed: 90, cons: 6 },
      },
    },
    route: { budgetM: 100000, points: [], info: [] },
    glide: {
      center: L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
      heightM: 1000,
      groundM: 0,
      ratio: 40,
      datum: "AGL",
      heightUnit: "m",
      qmode: "direct", // "direct" (typed ratio) | "polar" (from a glider polar)
      gliderId: "blanik-l13",
      speedMS: 55 * SPEED_UNITS.kt,
      speedUnit: "kt",
      windDir: 0, // degrees, direction the wind blows TO
      windMS: 0,
      windUnit: "kt",
    },
  };
  // Overlay any persisted state before layers/markers are built from it.
  if (saved) {
    state.mode = saved.mode || state.mode;
    state.unit = saved.unit || state.unit;
    state.speedUnit = saved.speedUnit || state.speedUnit;
    if (saved.ranges) {
      var sr = saved.ranges;
      if (sr.center) state.ranges.center = L.latLng(sr.center.lat, sr.center.lng);
      if (typeof sr.airport === "string") state.ranges.airport = sr.airport;
      if (typeof sr.fuel === "number") state.ranges.fuel = sr.fuel;
      state.ranges.fuelUnit = sr.fuelUnit || state.ranges.fuelUnit;
      state.ranges.speedUnit = sr.speedUnit || state.ranges.speedUnit;
      state.ranges.distUnit = sr.distUnit || state.ranges.distUnit;
      if (typeof sr.reserve === "boolean") state.ranges.reserve = sr.reserve;
      if (sr.profiles) {
        ["max", "opt", "end"].forEach(function (k) {
          if (sr.profiles[k]) state.ranges.profiles[k] = sr.profiles[k];
        });
      }
    }
    if (saved.route) {
      state.route.budgetM = saved.route.budgetM;
      state.route.points = (saved.route.points || []).map(function (p) {
        return L.latLng(p.lat, p.lng);
      });
      state.route.info = saved.route.info || [];
    }
    if (saved.glide) {
      var sg = saved.glide;
      if (sg.center) state.glide.center = L.latLng(sg.center.lat, sg.center.lng);
      if (typeof sg.heightM === "number") state.glide.heightM = sg.heightM;
      if (typeof sg.groundM === "number") state.glide.groundM = sg.groundM;
      if (typeof sg.ratio === "number") state.glide.ratio = sg.ratio;
      state.glide.datum = sg.datum || state.glide.datum;
      state.glide.heightUnit = sg.heightUnit || state.glide.heightUnit;
      state.glide.qmode = sg.qmode || state.glide.qmode;
      state.glide.gliderId = sg.gliderId || state.glide.gliderId;
      if (typeof sg.speedMS === "number") state.glide.speedMS = sg.speedMS;
      state.glide.speedUnit = sg.speedUnit || state.glide.speedUnit;
      if (typeof sg.windDir === "number") state.glide.windDir = sg.windDir;
      if (typeof sg.windMS === "number") state.glide.windMS = sg.windMS;
      state.glide.windUnit = sg.windUnit || state.glide.windUnit;
    }
  }
  var navData = [],
    navState = {
      loaded: false,
      loading: false,
      types: { VOR: false, NDB: false, DME: false },
    };
  var aptData = [],
    aptByIdent = {},
    rwyByApt = {},
    freqByApt = {},
    pendingAptLookup = null,
    aptState = {
      loaded: false,
      loading: false,
      pending: 0,
      types: { small: false, medium: false, large: false },
    };
  function navAnyOn() {
    return navState.types.VOR || navState.types.NDB || navState.types.DME;
  }
  function aptAnyOn() {
    return aptState.types.small || aptState.types.medium || aptState.types.large;
  }
  function aptGroupOf(t) {
    return t === "small_airport"
      ? "small"
      : t === "medium_airport"
      ? "medium"
      : t === "large_airport"
      ? "large"
      : null;
  }
  var wptData = [],
    wptState = { enabled: false, loaded: false, loading: false };
  // True while an airport popup is open, so the moveend re-render (triggered by the
  // popup's own autoPan) doesn't clearLayers() the marker and close the popup.
  var aptPopupOpen = false;

  // ---- Layers ----
  // One geodesic circle per regime, keyed by regime key. Drawn in REGIMES order
  // (max, opt, end) so the typically-smaller best-endurance circle sits on top.
  var rangeCircles = {};
  REGIMES.forEach(function (rg) {
    rangeCircles[rg.key] = L.polygon([], {
      color: rg.color,
      weight: 2,
      fillColor: rg.color,
      fillOpacity: 0.1,
    });
  });
  var rangeLabelLayer = L.layerGroup();
  var centerMarker = L.marker(state.ranges.center, { icon: pinIcon, draggable: true });
  var routeLinesGroup = L.layerGroup();
  var routeMarkersGroup = L.layerGroup();
  var routeCircle = L.polygon([], {
    color: "#4f6df5",
    weight: 2,
    fillColor: "#4f6df5",
    fillOpacity: 0.12,
  });
  var navaidLayer = L.layerGroup();
  var airportLayer = L.layerGroup();
  var waypointLayer = L.layerGroup();
  var glideCircle = L.polygon([], {
    color: "#f59e0b",
    weight: 2,
    fillColor: "#f59e0b",
    fillOpacity: 0.12,
  });
  var glideMarker = L.marker(state.glide.center, { icon: glidePinIcon, draggable: true });
  centerMarker.on("drag", function (e) {
    state.ranges.center = e.target.getLatLng();
    clearAirportCode();
    renderRanges();
  });
  glideMarker.on("drag", function (e) {
    state.glide.center = e.target.getLatLng();
    renderGlide();
  });
  glideMarker.on("dragend", function () {
    fetchGroundElevation();
    scheduleSave();
  });

  // ---- DOM ----
  var $input = document.getElementById("radius-input"),
    $unit = document.getElementById("unit-select"),
    $slider = document.getElementById("radius-slider");
  var $speedInput = document.getElementById("speed-input"),
    $speedUnit = document.getElementById("speed-unit");
  var $rangesStats = document.getElementById("ranges-stats"),
    $routeStats = document.getElementById("route-stats");
  var $crValue = document.getElementById("current-radius-value"),
    $crTime = document.getElementById("current-radius-time"),
    $readout = document.getElementById("coord-readout");
  var rcLabel = document.getElementById("rc-label"),
    rangesControl = document.getElementById("ranges-control"),
    radiusControl = document.getElementById("radius-control"),
    rangesView = document.getElementById("ranges-view"),
    routeView = document.getElementById("route-view");
  var segRanges = document.getElementById("mode-ranges"),
    segPlan = document.getElementById("mode-plan"),
    segGlider = document.getElementById("mode-glider");
  var gliderControl = document.getElementById("glider-control"),
    gliderView = document.getElementById("glider-view"),
    $glideHeight = document.getElementById("glide-height-input"),
    $glideHeightUnit = document.getElementById("glide-height-unit"),
    $glideDatum = document.getElementById("glide-datum"),
    $glideGroundRow = document.getElementById("glide-ground-row"),
    $glideGroundValue = document.getElementById("glide-ground-value"),
    $glideGroundStatus = document.getElementById("glide-ground-status"),
    $glideRatio = document.getElementById("glide-ratio-input"),
    $glideQDirect = document.getElementById("glide-q-direct"),
    $glideQPolar = document.getElementById("glide-q-polar"),
    $glideDirectBlock = document.getElementById("glide-direct-block"),
    $glidePolarBlock = document.getElementById("glide-polar-block"),
    $glideGliderSelect = document.getElementById("glide-glider-select"),
    $glidePolarChart = document.getElementById("glide-polar-chart"),
    $glidePolarReadout = document.getElementById("glide-polar-readout"),
    $glideSpeed = document.getElementById("glide-speed-input"),
    $glideSpeedUnit = document.getElementById("glide-speed-unit"),
    $glideWindDial = document.getElementById("glide-wind-dial"),
    $glideWindNeedle = document.getElementById("glide-wind-needle"),
    $glideWindDir = document.getElementById("glide-wind-dir"),
    $glideWindSpeed = document.getElementById("glide-wind-speed-input"),
    $glideWindSpeedUnit = document.getElementById("glide-wind-speed-unit"),
    $glideStats = document.getElementById("glide-stats");
  var presetWrap = document.getElementById("presets"),
    $navStatus = document.getElementById("nav-status");
  var $routePoints = document.getElementById("route-points");
  var $aptStatus = document.getElementById("apt-status");
  var $wptStatus = document.getElementById("wpt-status");
  // Ranges-mode inputs.
  var $airport = document.getElementById("airport-input"),
    $airportStatus = document.getElementById("airport-status");
  var $fuel = document.getElementById("fuel-input"),
    $fuelUnit = document.getElementById("fuel-unit"),
    $reserve = document.getElementById("reserve-toggle"),
    $rngSpeedUnit = document.getElementById("rng-speed-unit"),
    $rngDistUnit = document.getElementById("rng-dist-unit");
  var rngSpeedEl = {
      max: document.getElementById("rng-max-speed"),
      opt: document.getElementById("rng-opt-speed"),
      end: document.getElementById("rng-end-speed"),
    },
    rngConsEl = {
      max: document.getElementById("rng-max-cons"),
      opt: document.getElementById("rng-opt-cons"),
      end: document.getElementById("rng-end-cons"),
    };

  function row(k, v) {
    return '<div class="stat-line"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>";
  }

  // ---- Persistence ----
  function saveState() {
    try {
      var c = map.getCenter();
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          v: SAVE_VERSION,
          view: { lat: c.lat, lng: c.lng, zoom: map.getZoom() },
          mode: state.mode,
          unit: state.unit,
          speedInput: $speedInput.value,
          speedUnit: state.speedUnit,
          ranges: {
            center: { lat: state.ranges.center.lat, lng: state.ranges.center.lng },
            airport: state.ranges.airport,
            fuel: state.ranges.fuel,
            fuelUnit: state.ranges.fuelUnit,
            speedUnit: state.ranges.speedUnit,
            distUnit: state.ranges.distUnit,
            reserve: state.ranges.reserve,
            profiles: state.ranges.profiles,
          },
          route: {
            budgetM: state.route.budgetM,
            points: state.route.points.map(function (p) {
              return { lat: p.lat, lng: p.lng };
            }),
            info: state.route.info,
          },
          glide: {
            center: { lat: state.glide.center.lat, lng: state.glide.center.lng },
            heightM: state.glide.heightM,
            groundM: state.glide.groundM,
            ratio: state.glide.ratio,
            datum: state.glide.datum,
            heightUnit: state.glide.heightUnit,
            qmode: state.glide.qmode,
            gliderId: state.glide.gliderId,
            speedMS: state.glide.speedMS,
            speedUnit: state.glide.speedUnit,
            windDir: state.glide.windDir,
            windMS: state.glide.windMS,
            windUnit: state.glide.windUnit,
          },
          layers: { nav: navState.types, apt: aptState.types, wpt: wptState.enabled },
        })
      );
    } catch (e) {}
  }
  var saveTimer;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
  }

  // ---- Accessors ----
  function routeUsedM() {
    var p = state.route.points,
      s = 0;
    for (var i = 0; i < p.length - 1; i++) s += haversineM(p[i], p[i + 1]);
    return s;
  }
  // The shared slider/input/presets control only drives the Flight-plan budget now
  // (the Ranges mode has its own fuel-based control), so these target the route.
  function activeRadiusM() {
    return state.route.budgetM;
  }
  function setActiveRadiusM(m) {
    state.route.budgetM = Math.max(m, routeUsedM());
  }
  function metersToSlider(m) {
    var t = (Math.log(m) - Math.log(SLIDER_MIN)) / (Math.log(SLIDER_MAX) - Math.log(SLIDER_MIN));
    return Math.max(0, Math.min(1000, Math.round(t * 1000)));
  }
  function sliderToMeters(v) {
    return Math.exp(Math.log(SLIDER_MIN) + (v / 1000) * (Math.log(SLIDER_MAX) - Math.log(SLIDER_MIN)));
  }
  function radiusToInputValue(m) {
    return state.unit === "h" ? (state.speedMS > 0 ? m / (state.speedMS * 3600) : 0) : m / UNITS[state.unit];
  }
  function inputValueToRadius(v) {
    return state.unit === "h" ? v * state.speedMS * 3600 : v * UNITS[state.unit];
  }

  function syncControls() {
    var m = activeRadiusM(),
      val = radiusToInputValue(m);
    if (state.unit === "h") $input.value = val < 10 ? val.toFixed(2) : val.toFixed(1);
    else $input.value = val < 10 ? val.toFixed(2) : val < 100 ? val.toFixed(1) : Math.round(val);
    $slider.value = metersToSlider(m);
    if ($unit.value !== state.unit) $unit.value = state.unit;
  }
  function setHourOption(present) {
    var opt = $unit.querySelector('option[value="h"]');
    if (present && !opt) {
      var o = document.createElement("option");
      o.value = "h";
      o.textContent = "h";
      $unit.appendChild(o);
    }
    if (!present && opt) {
      opt.remove();
      if (state.unit === "h") {
        state.unit = "km";
        $unit.value = "km";
      }
    }
  }
  function addPreset(label, valFn) {
    var b = document.createElement("button");
    b.className = "preset";
    b.textContent = label;
    b.onclick = function () {
      setActiveRadiusM(Math.min(SLIDER_MAX, valFn()));
      syncControls();
      render();
    };
    presetWrap.appendChild(b);
  }
  function rebuildPresets() {
    presetWrap.innerHTML = "";
    if (state.unit === "h")
      TIME_PRESETS.forEach(function (p) {
        addPreset(p[0], function () {
          return p[1] * state.speedMS * 3600;
        });
      });
    else
      DIST_PRESETS.forEach(function (p) {
        addPreset(p[0], function () {
          return p[1];
        });
      });
  }

  // ---- Ranges render ----
  // Read the fuel/performance inputs from the DOM into state.
  function readRangesInputs() {
    var rg = state.ranges;
    rg.fuel = parseFloat($fuel.value);
    rg.fuelUnit = $fuelUnit.value;
    rg.speedUnit = $rngSpeedUnit.value;
    rg.distUnit = $rngDistUnit.value;
    rg.reserve = $reserve.checked;
    ["max", "opt", "end"].forEach(function (k) {
      rg.profiles[k] = {
        speed: parseFloat(rngSpeedEl[k].value),
        cons: parseFloat(rngConsEl[k].value),
      };
    });
  }
  // Push state.ranges back into the DOM inputs (used on init after restore).
  function syncRangesInputs() {
    var rg = state.ranges;
    $airport.value = rg.airport || "";
    $fuel.value = rg.fuel;
    $fuelUnit.value = rg.fuelUnit;
    $reserve.checked = rg.reserve;
    $rngSpeedUnit.value = rg.speedUnit;
    $rngDistUnit.value = rg.distUnit;
    ["max", "opt", "end"].forEach(function (k) {
      rngSpeedEl[k].value = rg.profiles[k].speed;
      rngConsEl[k].value = rg.profiles[k].cons;
    });
    var label = rg.fuelUnit + "/h";
    Array.prototype.forEach.call(document.querySelectorAll(".rng-cons-unit"), function (el) {
      el.textContent = label;
    });
  }

  // ---- Airport-code centre lookup ----
  function setAirportStatus(msg) {
    $airportStatus.textContent = msg;
  }
  // The centre was moved by hand (map click / pin drag): forget the airport code.
  function clearAirportCode() {
    state.ranges.airport = "";
    if ($airport.value) $airport.value = "";
    setAirportStatus("Type an airport code to centre the circles there.");
  }
  function applyAirportCode(code, fromUser) {
    code = (code || "").trim().toUpperCase();
    state.ranges.airport = code;
    if (!code) {
      setAirportStatus("Type an airport code to centre the circles there.");
      return;
    }
    if (!/^[A-Z0-9]{3,4}$/.test(code)) {
      setAirportStatus("Enter a 3–4 character ICAO code.");
      return;
    }
    if (!aptState.loaded) {
      pendingAptLookup = code;
      setAirportStatus("Loading airport database…");
      if (!aptState.loading) loadAirports();
      return;
    }
    var a = aptByIdent[code];
    if (a) {
      state.ranges.center = L.latLng(a.lat, a.lng);
      renderRanges();
      if (fromUser) map.panTo(state.ranges.center);
      setAirportStatus(code + (a.name ? " · " + a.name : ""));
    } else {
      setAirportStatus("No airport “" + code + "” found.");
    }
  }
  // Usable endurance (hours) for a regime after the optional 40-min reserve.
  function regimeEnduranceH(p) {
    var rg = state.ranges;
    if (!(rg.fuel > 0) || !(p.cons > 0)) return 0;
    var h = rg.fuel / p.cons - (rg.reserve ? RESERVE_MIN / 60 : 0);
    return h > 0 ? h : 0;
  }
  // Full one-way range (metres) for a regime.
  function regimeRangeM(p) {
    if (!(p.speed > 0)) return 0;
    return regimeEnduranceH(p) * 3600 * p.speed * SPEED_UNITS[state.ranges.speedUnit];
  }
  // ---- Glider (glide-range) ----
  function effGlideHeightM() {
    var g = state.glide;
    return g.datum === "MSL" ? Math.max(0, g.heightM - g.groundM) : g.heightM;
  }
  // Glide ratio (L/D): typed directly, or read off the selected glider's polar at
  // the current airspeed (sink → LD). One hook feeds the whole glide pipeline.
  function currentRatio() {
    var g = state.glide;
    if (g.qmode === "polar") return polarAt(parsePolar(gliderById(g.gliderId)), g.speedMS).ld;
    return g.ratio;
  }
  // Still-air, air-relative glide distance (metres).
  function glideDistanceM() {
    return Math.max(0, currentRatio() * effGlideHeightM());
  }
  // Ground centre of the reachable area: still-air circle drifted downwind by
  // wind_speed × time-aloft. No usable speed/wind ⇒ centred on the launch point.
  function glideDriftM() {
    var g = state.glide,
      R = glideDistanceM();
    if (!(g.speedMS > 0) || !(g.windMS > 0) || R <= 0) return 0;
    return g.windMS * (R / g.speedMS);
  }
  function glideAreaCenter() {
    var g = state.glide,
      drift = glideDriftM();
    return drift > 0 ? destPoint(g.center, g.windDir, drift) : g.center;
  }

  // Auto-fill MSL ground elevation from Open-Meteo at the launch point. Debounced;
  // a monotonic request id makes late responses no-ops. Only runs while in MSL.
  var elevReqId = 0,
    elevTimer;
  function setGroundStatus(msg) {
    $glideGroundStatus.textContent = msg;
  }
  function showGroundValue() {
    var f = HEIGHT_UNITS[state.glide.heightUnit];
    $glideGroundValue.textContent = fmt(state.glide.groundM / f, 0) + " " + state.glide.heightUnit;
  }
  function fetchGroundElevation() {
    if (state.glide.datum !== "MSL") return;
    clearTimeout(elevTimer);
    elevTimer = setTimeout(function () {
      var id = ++elevReqId,
        c = state.glide.center;
      setGroundStatus("Reading terrain elevation…");
      fetch(ELEV_URL + "?latitude=" + c.lat.toFixed(5) + "&longitude=" + c.lng.toFixed(5))
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.json();
        })
        .then(function (d) {
          if (id !== elevReqId) return; // superseded by a newer request
          var e = d && d.elevation && d.elevation[0];
          if (typeof e !== "number") throw new Error("no elevation");
          state.glide.groundM = e;
          showGroundValue();
          setGroundStatus("Terrain at launch point (source: Open-Meteo).");
          renderGlide();
          scheduleSave();
        })
        .catch(function () {
          if (id !== elevReqId) return;
          setGroundStatus("Couldn't read terrain elevation — using " + fmt(state.glide.groundM / HEIGHT_UNITS[state.glide.heightUnit], 0) + " " + state.glide.heightUnit + ".");
        });
    }, 400);
  }

  // Push state.glide back into the DOM inputs (used on init after restore).
  function populateGliderSelect() {
    $glideGliderSelect.innerHTML = GLIDERS.map(function (g) {
      return '<option value="' + g.id + '">' + escapeHtml(g.name) + "</option>";
    }).join("");
  }
  // Reflect the direct/polar choice: toggle buttons + which sub-block is visible.
  function applyQModeUI() {
    var polar = state.glide.qmode === "polar";
    $glideQDirect.classList.toggle("active", !polar);
    $glideQPolar.classList.toggle("active", polar);
    $glideDirectBlock.style.display = polar ? "none" : "";
    $glidePolarBlock.style.display = polar ? "" : "none";
  }
  function syncGlideInputs() {
    var g = state.glide,
      f = HEIGHT_UNITS[g.heightUnit];
    $glideHeight.value = Math.round(g.heightM / f);
    $glideHeightUnit.value = g.heightUnit;
    $glideDatum.value = g.datum;
    $glideGroundRow.style.display = g.datum === "MSL" ? "" : "none";
    showGroundValue();
    $glideRatio.value = g.ratio;
    populateGliderSelect();
    $glideGliderSelect.value = g.gliderId;
    applyQModeUI();
    $glideSpeed.value = Math.round(g.speedMS / SPEED_UNITS[g.speedUnit]);
    $glideSpeedUnit.value = g.speedUnit;
    $glideWindSpeed.value = fmt(g.windMS / SPEED_UNITS[g.windUnit], g.windMS < 5 ? 1 : 0);
    $glideWindSpeedUnit.value = g.windUnit;
    setWindNeedle(g.windDir);
    if (g.qmode === "polar") renderPolarChart();
  }
  function setWindNeedle(deg) {
    $glideWindNeedle.style.transform = "translate(-50%, -100%) rotate(" + deg + "deg)";
    $glideWindDir.textContent = Math.round(((deg % 360) + 360) % 360) + "°";
  }
  function renderGlide() {
    var g = state.glide,
      hu = g.heightUnit,
      distM = glideDistanceM(),
      center = glideAreaCenter(),
      drift = glideDriftM();
    glideMarker.setLatLng(g.center);
    glideCircle.setLatLngs(distM > 0 ? geodesicRing(center, distM, 256) : []);

    var effH = effGlideHeightM(),
      km = distM / 1000,
      area = capArea(distM) / 1e6,
      T = g.speedMS > 0 ? distM / g.speedMS : 0,
      ratio = currentRatio();
    var altLine = fmt(g.heightM / HEIGHT_UNITS[hu], 0) + " " + hu + " " + g.datum;
    if (g.datum === "MSL")
      altLine += " (" + fmt(effH / HEIGHT_UNITS[hu], 0) + " " + hu + " above ground)";

    var html =
      row("Launch point", fmtCoord(g.center)) +
      row("Altitude", altLine) +
      row(
        "Glide ratio" + (g.qmode === "polar" ? " · polar" : ""),
        fmt(ratio, ratio < 10 ? 1 : 0) + " : 1"
      ) +
      (g.qmode === "polar"
        ? row("Sink @ " + fmt(g.speedMS / SPEED_UNITS[g.speedUnit], 0) + " " + g.speedUnit, fmt(polarAt(parsePolar(gliderById(g.gliderId)), g.speedMS).sink, 2) + " m/s")
        : "") +
      row(
        "Still-air range",
        distM > 0
          ? fmt(km, km < 100 ? 1 : 0) +
              " km · " +
              fmt(distM / UNITS.mi, 0) +
              " mi · " +
              fmt(distM / UNITS.nmi, 0) +
              " nmi"
          : "—"
      ) +
      (g.speedMS > 0 ? row("Time aloft", fmtTime(T)) : "");

    if (g.windMS > 0 && distM > 0) {
      var down = km + drift / 1000,
        up = km - drift / 1000;
      html +=
        row("Wind", fmt(g.windMS / SPEED_UNITS[g.windUnit], g.windMS < 5 ? 1 : 0) + " " + g.windUnit + " → " + Math.round(g.windDir) + "°") +
        row("Downwind reach", fmt(down, down < 100 ? 1 : 0) + " km") +
        row(
          "Upwind reach",
          up > 0 ? fmt(up, up < 100 ? 1 : 0) + " km" : "drifts away — can't hold upwind"
        );
    }
    html += row("Diameter", fmt(km * 2, km < 100 ? 1 : 0) + " km") + row("Cap area", fmt(area, 0) + " km²");
    $glideStats.innerHTML = html;
    if (g.qmode === "polar") renderPolarChart();
  }

  // ---- Polar chart ----
  // Standard glider polar: airspeed on x (km/h), sink on y increasing downward
  // (m/s). A dashed line from the origin to the best-glide (tangent) point, and a
  // solid amber line to the operating point at the current speed. Theme-aware SVG.
  var polarGeom = null; // pixel↔speed mapping for click-to-set-speed
  function renderPolarChart() {
    var g = state.glide,
      pts = parsePolar(gliderById(g.gliderId));
    if (!pts.length) {
      $glidePolarChart.innerHTML = "";
      $glidePolarReadout.textContent = "";
      return;
    }
    var W = 264,
      H = 156,
      mL = 34,
      mR = 8,
      mT = 10,
      mB = 20,
      pw = W - mL - mR,
      ph = H - mT - mB;
    var maxV = pts[pts.length - 1].vKmh * 1.05,
      maxS = 0;
    pts.forEach(function (p) {
      if (p.sink > maxS) maxS = p.sink;
    });
    maxS *= 1.05;
    function X(vKmh) {
      return mL + (vKmh / maxV) * pw;
    }
    function Y(sink) {
      return mT + (sink / maxS) * ph;
    }
    polarGeom = { W: W, mL: mL, pw: pw, maxV: maxV, minKmh: pts[0].vKmh, maxKmh: pts[pts.length - 1].vKmh };

    var op = polarAt(pts, g.speedMS),
      opV = Math.max(pts[0].vKmh, Math.min(pts[pts.length - 1].vKmh, g.speedMS * 3.6)),
      best = polarBest(pts);

    // Literal colours: CSS var() doesn't resolve in SVG presentation attributes.
    var axisCol = "rgba(0,0,0,0.35)",
      curveCol = "#6b7280",
      opCol = "#f59e0b",
      bestCol = "#16a34a";
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMidYMid meet" class="polar-svg">';
    // Axes (origin at top-left of plot).
    s += '<line x1="' + mL + '" y1="' + mT + '" x2="' + mL + '" y2="' + (mT + ph) + '" stroke="' + axisCol + '" stroke-width="1"/>';
    s += '<line x1="' + mL + '" y1="' + mT + '" x2="' + (mL + pw) + '" y2="' + mT + '" stroke="' + axisCol + '" stroke-width="1"/>';
    // Axis labels.
    s += '<text x="' + (mL + pw) + '" y="' + (mT + ph + 14) + '" fill="' + axisCol + '" font-size="9" text-anchor="end">km/h</text>';
    s += '<text x="' + (mL - 4) + '" y="' + (mT + 8) + '" fill="' + axisCol + '" font-size="9" text-anchor="end">m/s</text>';
    // x ticks at rounded speeds.
    var step = maxV > 180 ? 50 : 25;
    for (var v = step; v < maxV; v += step) {
      var xx = X(v);
      s += '<line x1="' + xx + '" y1="' + mT + '" x2="' + xx + '" y2="' + (mT + 4) + '" stroke="' + axisCol + '" stroke-width="1"/>';
      s += '<text x="' + xx + '" y="' + (mT + ph + 14) + '" fill="' + axisCol + '" font-size="8.5" text-anchor="middle">' + v + "</text>";
    }
    // Polar curve.
    var d = pts
      .map(function (p, i) {
        return (i ? "L" : "M") + X(p.vKmh).toFixed(1) + " " + Y(p.sink).toFixed(1);
      })
      .join(" ");
    s += '<path d="' + d + '" fill="none" stroke="' + curveCol + '" stroke-width="2" stroke-linejoin="round"/>';
    // Origin → best-glide (tangent, dashed) and its marker.
    s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(best.vKmh) + '" y2="' + Y(best.sink) + '" stroke="' + bestCol + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
    s += '<circle cx="' + X(best.vKmh) + '" cy="' + Y(best.sink) + '" r="3.5" fill="none" stroke="' + bestCol + '" stroke-width="1.5"/>';
    // Origin → operating point (solid amber) and its marker.
    s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(opV) + '" y2="' + Y(op.sink) + '" stroke="' + opCol + '" stroke-width="2"/>';
    s += '<circle cx="' + X(opV) + '" cy="' + Y(op.sink) + '" r="4.5" fill="' + opCol + '" stroke="#fff" stroke-width="1.5"/>';
    s += "</svg>";
    $glidePolarChart.innerHTML = s;

    $glidePolarReadout.innerHTML =
      "At <b>" +
      fmt(g.speedMS / SPEED_UNITS[g.speedUnit], 0) +
      " " +
      g.speedUnit +
      "</b>: sink <b>" +
      fmt(op.sink, 2) +
      " m/s</b>, L/D <b>" +
      fmt(op.ld, op.ld < 10 ? 1 : 0) +
      "</b>. Best glide " +
      fmt(best.ld, 0) +
      ":1 at " +
      Math.round(best.vKmh) +
      " km/h." +
      (op.clamped ? " <span style=\"color:var(--danger)\">Speed outside polar range — clamped.</span>" : "");
  }

  function renderRanges() {
    var rg = state.ranges;
    centerMarker.setLatLng(rg.center);
    rangeLabelLayer.clearLayers();
    var distU = UNITS[rg.distUnit] || 1852;
    var stats = row("Centre", fmtCoord(rg.center));
    var drawn = [];
    REGIMES.forEach(function (def) {
      var p = rg.profiles[def.key],
        rM = regimeRangeM(p);
      if (rM > 0) {
        var ring = geodesicRing(rg.center, rM, 256);
        rangeCircles[def.key].setLatLngs(ring);
        // ring[0] is the northmost point (bearing 0) — labels stack vertically.
        rangeLabelLayer.addLayer(
          rangeTimeMarker(ring[0], fmtTime(regimeEnduranceH(p) * 3600), def.key)
        );
        drawn.push({ key: def.key, rM: rM });
      } else {
        rangeCircles[def.key].setLatLngs([]);
      }
      var key = '<span class="range-swatch rng-' + def.key + '"></span>' + def.label;
      var val =
        rM > 0
          ? fmt(rM / distU, rM / distU < 100 ? 1 : 0) +
            " " +
            rg.distUnit +
            " · " +
            fmtTime(regimeEnduranceH(p) * 3600)
          : "—";
      stats += row(key, val);
    });
    // Keep the smallest circle's outline on top so all three remain visible.
    drawn.sort(function (a, b) {
      return b.rM - a.rM;
    });
    drawn.forEach(function (d) {
      var c = rangeCircles[d.key];
      if (map.hasLayer(c)) c.bringToFront();
    });
    $rangesStats.innerHTML = stats;
    scheduleSave();
  }

  // ---- Route render ----
  function redrawRouteGeometry() {
    var pts = state.route.points,
      budget = state.route.budgetM,
      sp = state.speedMS;
    routeLinesGroup.clearLayers();
    var used = routeUsedM(),
      over = used > budget + EPS,
      color = over ? "#dc2626" : "#4f6df5";
    for (var i = 0; i < pts.length - 1; i++) {
      var line = geodesicLine(pts[i], pts[i + 1]);
      routeLinesGroup.addLayer(L.polyline(line, { color: color, weight: 3, opacity: 0.9 }));
      var d = haversineM(pts[i], pts[i + 1]);
      if (d > 1) {
        var mid = line[Math.floor(line.length / 2)]; // a point on the curve
        routeLinesGroup.addLayer(legLabelMarker(mid, bearingDeg(pts[i], pts[i + 1]), d));
      }
    }

    var remaining = budget - used,
      rem = Math.max(0, remaining);
    if (pts.length >= 1 && remaining > EPS) {
      routeCircle.setStyle({ color: "#4f6df5", fillColor: "#4f6df5", opacity: 1, fillOpacity: 0.12 });
      routeCircle.setLatLngs(geodesicRing(pts[pts.length - 1], remaining, 256));
    } else routeCircle.setLatLngs([]);

    if (state.unit === "h" && sp > 0) {
      $crValue.textContent = fmtTime(rem / sp);
      $crValue.style.color = over ? "var(--danger)" : "";
      $crTime.textContent = "≈ " + fmt(rem / 1000, rem / 1000 < 100 ? 1 : 0) + " km";
      $crTime.style.display = "";
    } else {
      var fu = UNITS[state.unit] || 1000,
        uName = UNITS[state.unit] ? state.unit : "km",
        v = rem / fu;
      $crValue.textContent = fmt(v, v < 100 ? 2 : 0) + " " + uName;
      $crValue.style.color = over ? "var(--danger)" : "";
      if (sp > 0) {
        $crTime.textContent = "≈ " + fmtTime(rem / sp);
        $crTime.style.display = "";
      } else $crTime.style.display = "none";
    }

    $routeStats.innerHTML =
      row("Budget", fmt(budget / 1000, budget / 1000 < 100 ? 1 : 0) + " km") +
      row("Used", fmt(used / 1000, used / 1000 < 100 ? 1 : 0) + " km") +
      row(
        "Remaining",
        (over ? "over by " : "") + fmt(Math.abs(remaining) / 1000, 1) + " km"
      ) +
      (sp > 0 ? row("Time budget", fmtTime(budget / sp)) : "") +
      (sp > 0 ? row("Time used", fmtTime(used / sp)) : "") +
      row("Legs", Math.max(0, pts.length - 1)) +
      row("Start", pts.length ? fmtCoord(pts[0]) : "—");

    renderRoutePointsTable();
    scheduleSave();
  }

  function renderRoutePointsTable() {
    var pts = state.route.points,
      info = state.route.info;
    if (!pts.length) {
      $routePoints.innerHTML = '<div class="rp-empty">No points yet — click the map to start.</div>';
      return;
    }
    var rows = "";
    for (var i = 0; i < pts.length; i++) {
      var nf = info[i],
        isIdOnly = nf && (nf.cat === "APT" || nf.cat === "FIX"),
        label = i === 0 ? "Start" : i === pts.length - 1 ? "End" : String(i),
        typeCell = isIdOnly
          ? escapeHtml(nf.ident)
          : nf
          ? '<span class="rp-tag rp-' +
            nf.cat.toLowerCase() +
            '">' +
            escapeHtml(nf.cat) +
            "</span> " +
            escapeHtml(nf.ident)
          : '<span class="rp-tag rp-wpt">WPT</span>',
        freqCell = nf && !isIdOnly ? escapeHtml(fmtNavFreq(nf.freq)) : "—";
      rows +=
        '<tr draggable="true" data-idx="' +
        i +
        '"><td class="rp-grip" title="Drag to reorder">⠿</td><td class="rp-n">' +
        label +
        '</td><td class="rp-type">' +
        typeCell +
        '</td><td class="rp-freq">' +
        freqCell +
        '</td><td class="rp-coord">' +
        fmtCoord(pts[i]) +
        '</td><td class="rp-act"><button class="rp-del" data-idx="' +
        i +
        '" title="Delete point" aria-label="Delete point">✕</button></td></tr>';
    }
    $routePoints.innerHTML =
      '<table class="rp-table"><thead><tr><th></th><th>#</th><th>Type</th><th>Freq</th><th>Coordinates</th><th></th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";
  }

  function deleteRoutePoint(i) {
    if (i < 0 || i >= state.route.points.length) return;
    state.route.points.splice(i, 1);
    state.route.info.splice(i, 1);
    map.closePopup();
    rebuildRouteMarkers();
    redrawRouteGeometry();
  }

  function moveRoutePoint(from, to) {
    var p = state.route.points,
      inf = state.route.info,
      n = p.length;
    if (from < 0 || from >= n || to < 0 || to >= n || from === to) return;
    var pSnap = p.slice(),
      iSnap = inf.slice(); // for revert
    p.splice(to, 0, p.splice(from, 1)[0]);
    inf.splice(to, 0, inf.splice(from, 1)[0]);
    if (routeUsedM() > state.route.budgetM + EPS) {
      state.route.points = pSnap;
      state.route.info = iSnap;
      toast("Reorder cancelled — total route would exceed the budget");
      return;
    }
    rebuildRouteMarkers();
    redrawRouteGeometry();
  }

  function rebuildRouteMarkers() {
    routeMarkersGroup.clearLayers();
    var pts = state.route.points;
    pts.forEach(function (p, i) {
      var role = i === 0 ? "start" : i === pts.length - 1 ? "last" : "mid";
      var mk = L.marker(p, { icon: routeMarkerIcon(role), draggable: true });
      mk._routeIdx = i;
      mk.bindPopup(
        '<div class="route-pop"><button class="route-pop-del" title="Delete point" aria-label="Delete point">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>' +
          "</button></div>",
        { className: "route-pop-wrap", closeButton: false, offset: [0, -4], autoPan: false }
      );
      mk.on("dragstart", function () {
        mk._origin = mk.getLatLng();
        mk.closePopup();
      });
      mk.on("drag", function () {
        state.route.points[i] = mk.getLatLng();
        redrawRouteGeometry();
      });
      mk.on("dragend", function () {
        state.route.points[i] = mk.getLatLng();
        if (routeUsedM() > state.route.budgetM + EPS) {
          state.route.points[i] = mk._origin;
          mk.setLatLng(mk._origin);
          toast("Move cancelled — total route would exceed the budget");
        } else {
          // Point was moved off its original location — no longer at the beacon.
          state.route.info[i] = null;
        }
        redrawRouteGeometry();
      });
      routeMarkersGroup.addLayer(mk);
    });
  }

  function tryAddRoutePoint(latlng, navInfo) {
    var pts = state.route.points;
    if (pts.length === 0) {
      pts.push(latlng);
      state.route.info.push(navInfo || null);
      rebuildRouteMarkers();
      redrawRouteGeometry();
      return true;
    }
    var remaining = state.route.budgetM - routeUsedM();
    var d = haversineM(pts[pts.length - 1], latlng);
    if (d <= remaining + EPS) {
      pts.push(latlng);
      state.route.info.push(navInfo || null);
      rebuildRouteMarkers();
      redrawRouteGeometry();
      return true;
    }
    flashCircleInvalid();
    toast("Outside range — pick a closer point");
    return false;
  }

  function flashCircleInvalid() {
    if (!routeCircle.getLatLngs().length) return;
    routeCircle.setStyle({ color: "#dc2626", fillColor: "#dc2626" });
    setTimeout(function () {
      routeCircle.setStyle({ color: "#4f6df5", fillColor: "#4f6df5" });
    }, 450);
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
    }, 2200);
  }

  // ---- Navaids (Option B) ----
  function navCategory(type) {
    if (/VOR|VORTAC/i.test(type)) return "VOR";
    if (/NDB/i.test(type)) return "NDB";
    if (/DME|TACAN/i.test(type)) return "DME";
    return null;
  }
  function fmtNavFreq(khz) {
    if (!isFinite(khz) || khz <= 0) return "—";
    return khz >= 1000 ? (khz / 1000).toFixed(2) + " MHz" : Math.round(khz) + " kHz";
  }
  function setNavStatus(msg) {
    $navStatus.textContent = msg;
  }

  function makeNavMarker(n) {
    var cls = n.cat === "VOR" ? "vor" : n.cat === "NDB" ? "ndb" : "dme";
    var icon = L.divIcon({
      className: "",
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      html:
        '<div class="navaid nav-' +
        cls +
        '"><span class="nav-sym"></span><span class="nav-id">' +
        escapeHtml(n.ident) +
        "</span></div>",
    });
    var mk = L.marker([n.lat, n.lng], { icon: icon });
    mk._nav = n;
    mk.bindPopup(
      '<div class="nav-pop"><div class="nav-pop-id">' +
        escapeHtml(n.ident) +
        "<span>" +
        escapeHtml(n.type) +
        "</span></div>" +
        '<div class="nav-pop-name">' +
        escapeHtml(n.name) +
        "</div>" +
        '<div class="nav-pop-freq">' +
        fmtNavFreq(n.freq) +
        "</div>" +
        '<button class="nav-pop-btn">＋ Add to route</button></div>'
    );
    return mk;
  }

  function renderNavaids() {
    navaidLayer.clearLayers();
    if (!navAnyOn()) return;
    if (navState.loading) {
      setNavStatus("Loading navaid database…");
      return;
    }
    if (!navState.loaded) return;
    if (map.getZoom() < MIN_NAV_ZOOM) {
      setNavStatus("Zoom in to show navaids (≥ z" + MIN_NAV_ZOOM + ")");
      return;
    }
    var b = map.getBounds(),
      shown = 0,
      total = 0;
    for (var i = 0; i < navData.length; i++) {
      var n = navData[i];
      if (!navState.types[n.cat]) continue;
      if (!b.contains([n.lat, n.lng])) continue;
      total++;
      if (shown >= MAX_NAV) continue;
      navaidLayer.addLayer(makeNavMarker(n));
      shown++;
    }
    setNavStatus(
      total > MAX_NAV
        ? "Showing " + shown + " of " + total + " in view — zoom in for the rest"
        : shown
        ? "Showing " + shown + " navaid" + (shown === 1 ? "" : "s")
        : "No matching navaids in view"
    );
  }

  function ingestNavaids(rows) {
    navData = [];
    rows.forEach(function (r) {
      var cat = navCategory(r.type || "");
      if (!cat) return;
      var lat = parseFloat(r.latitude_deg),
        lng = parseFloat(r.longitude_deg);
      if (isNaN(lat) || isNaN(lng)) return;
      navData.push({
        ident: r.ident || "?",
        name: r.name || "",
        type: r.type || "",
        freq: parseFloat(r.frequency_khz),
        lat: lat,
        lng: lng,
        cat: cat,
      });
    });
    navState.loaded = true;
    navState.loading = false;
    renderNavaids();
  }

  function loadNavaids() {
    if (navState.loading || navState.loaded) {
      renderNavaids();
      return;
    }
    if (typeof Papa === "undefined") {
      setNavStatus("CSV parser unavailable.");
      return;
    }
    navState.loading = true;
    setNavStatus("Loading navaid database…");
    var done = false;
    var guard = setTimeout(function () {
      if (!done && !navState.loaded) {
        navState.loading = false;
        setNavStatus("Navaid data blocked or slow — the sandbox may be preventing the download.");
      }
    }, 20000);
    try {
      Papa.parse(NAV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (res) {
          done = true;
          clearTimeout(guard);
          ingestNavaids(res.data || []);
        },
        error: function () {
          done = true;
          clearTimeout(guard);
          navState.loading = false;
          setNavStatus("Could not load navaid data (blocked or offline).");
        },
      });
    } catch (e) {
      clearTimeout(guard);
      navState.loading = false;
      setNavStatus("Could not start navaid download.");
    }
  }

  // ---- Airports ----
  function setAptStatus(msg) {
    $aptStatus.textContent = msg;
  }
  function fmtMHz(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(n) || n <= 0) return "—";
    return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + " MHz";
  }
  function isIls(type) {
    return /ILS|LOC|GLS|GP\b/i.test(type || "");
  }
  function aptTypeLabel(t) {
    return t === "large_airport"
      ? "Large airport"
      : t === "medium_airport"
      ? "Medium airport"
      : t === "small_airport"
      ? "Small airport"
      : t || "Airport";
  }

  function buildAirportPopup(a) {
    var head =
      '<div class="apt-pop-id">' +
      escapeHtml(a.ident) +
      (a.iata ? "<span>" + escapeHtml(a.iata) + "</span>" : "") +
      "</div>" +
      '<div class="apt-pop-name">' +
      escapeHtml(aptTypeLabel(a.type)) +
      (a.name ? " · " + escapeHtml(a.name) : "") +
      "</div>" +
      '<div class="apt-pop-name">' +
      escapeHtml([a.muni, a.country].filter(Boolean).join(", ")) +
      (isFinite(a.elev) ? " · " + Math.round(a.elev) + " ft" : "") +
      "</div>";

    var rwys = rwyByApt[a.ident] || [];
    var rwHtml = '<div class="apt-pop-sec">Runways</div>';
    if (!rwys.length) rwHtml += '<div class="apt-pop-row apt-pop-muted">No runway data</div>';
    else
      rwys.forEach(function (r) {
        var name = [r.le, r.he].filter(Boolean).join("/") || "RWY";
        var dims = r.len ? r.len + (r.wid ? "×" + r.wid : "") + " ft" : "";
        var bits = [dims, r.surface, r.lit ? "lit" : ""].filter(Boolean).join(" · ");
        rwHtml +=
          '<div class="apt-pop-row"><span class="apt-pop-k">' +
          escapeHtml(name) +
          '</span><span class="apt-pop-v">' +
          escapeHtml(bits) +
          "</span></div>";
      });

    var freqs = freqByApt[a.ident] || [];
    var atc = freqs.filter(function (f) {
      return !isIls(f.type);
    });
    var ils = freqs.filter(function (f) {
      return isIls(f.type);
    });

    function freqRow(f) {
      var label = f.description || f.type || "";
      return (
        '<div class="apt-pop-row"><span class="apt-pop-k">' +
        escapeHtml(label) +
        '</span><span class="apt-pop-v">' +
        escapeHtml(fmtMHz(f.mhz)) +
        "</span></div>"
      );
    }

    var atcHtml = '<div class="apt-pop-sec">ATC / COM</div>';
    if (!atc.length) atcHtml += '<div class="apt-pop-row apt-pop-muted">No frequency data</div>';
    else atcHtml += atc.map(freqRow).join("");

    var ilsHtml = "";
    if (ils.length) ilsHtml = '<div class="apt-pop-sec">ILS</div>' + ils.map(freqRow).join("");

    return (
      '<div class="apt-pop">' +
      head +
      rwHtml +
      atcHtml +
      ilsHtml +
      '<button class="apt-pop-btn">＋ Add to route</button></div>'
    );
  }

  function makeAirportMarker(a) {
    var cls = a.type === "large_airport" ? "lg" : a.type === "medium_airport" ? "md" : "sm";
    var icon = L.divIcon({
      className: "",
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      html:
        '<div class="airport apt-' +
        cls +
        '"><span class="apt-sym"></span><span class="apt-id">' +
        escapeHtml(a.ident) +
        "</span></div>",
    });
    var mk = L.marker([a.lat, a.lng], { icon: icon });
    mk._apt = a;
    mk.bindPopup(buildAirportPopup(a), { maxHeight: 280 });
    return mk;
  }

  function renderAirports() {
    airportLayer.clearLayers();
    if (!aptAnyOn()) return;
    if (aptState.loading) {
      setAptStatus("Loading airport database…");
      return;
    }
    if (!aptState.loaded) return;
    if (map.getZoom() < MIN_APT_ZOOM) {
      setAptStatus("Zoom in to show airports (≥ z" + MIN_APT_ZOOM + ")");
      return;
    }
    var b = map.getBounds(),
      inView = [];
    for (var i = 0; i < aptData.length; i++) {
      var a = aptData[i];
      if (!aptState.types[aptGroupOf(a.type)]) continue;
      if (b.contains([a.lat, a.lng])) inView.push(a);
    }
    var total = inView.length;
    // Prefer larger airports when capping.
    inView.sort(function (x, y) {
      return (APT_TYPES[y.type] || 0) - (APT_TYPES[x.type] || 0);
    });
    var shown = Math.min(total, MAX_APT);
    for (var j = 0; j < shown; j++) airportLayer.addLayer(makeAirportMarker(inView[j]));
    setAptStatus(
      total > MAX_APT
        ? "Showing " + shown + " of " + total + " in view — zoom in for the rest"
        : shown
        ? "Showing " + shown + " airport" + (shown === 1 ? "" : "s")
        : "No airports in view"
    );
  }

  function ingestAirports(rows) {
    aptData = [];
    aptByIdent = {};
    rows.forEach(function (r) {
      if (!APT_TYPES[r.type]) return;
      var lat = parseFloat(r.latitude_deg),
        lng = parseFloat(r.longitude_deg);
      if (isNaN(lat) || isNaN(lng)) return;
      var a = {
        ident: r.ident || "?",
        name: r.name || "",
        type: r.type || "",
        lat: lat,
        lng: lng,
        elev: parseFloat(r.elevation_ft),
        iata: r.iata_code || "",
        muni: r.municipality || "",
        country: r.iso_country || "",
      };
      aptData.push(a);
      // Index by ICAO/GPS ident for the Ranges-tab centre lookup.
      if (r.ident) aptByIdent[r.ident.toUpperCase()] = a;
    });
  }
  function ingestRunways(rows) {
    rwyByApt = {};
    rows.forEach(function (r) {
      if (r.closed === "1") return;
      var k = r.airport_ident;
      if (!k) return;
      (rwyByApt[k] || (rwyByApt[k] = [])).push({
        le: r.le_ident || "",
        he: r.he_ident || "",
        len: r.length_ft || "",
        wid: r.width_ft || "",
        surface: r.surface || "",
        lit: r.lighted === "1",
      });
    });
  }
  function ingestAptFreqs(rows) {
    freqByApt = {};
    rows.forEach(function (r) {
      var k = r.airport_ident;
      if (!k) return;
      (freqByApt[k] || (freqByApt[k] = [])).push({
        type: r.type || "",
        description: r.description || "",
        mhz: parseFloat(r.frequency_mhz),
      });
    });
  }

  function loadAirports() {
    if (aptState.loading || aptState.loaded) {
      renderAirports();
      return;
    }
    if (typeof Papa === "undefined") {
      setAptStatus("CSV parser unavailable.");
      return;
    }
    aptState.loading = true;
    aptState.pending = 3;
    setAptStatus("Loading airport database…");
    var failed = false;
    var guard = setTimeout(function () {
      if (aptState.loading && !aptState.loaded) {
        aptState.loading = false;
        setAptStatus("Airport data blocked or slow — the sandbox may be preventing the download.");
      }
    }, 30000);
    function fail() {
      if (failed) return;
      failed = true;
      clearTimeout(guard);
      aptState.loading = false;
      setAptStatus("Could not load airport data (blocked or offline).");
    }
    function part(ingest) {
      return function (res) {
        if (failed) return;
        ingest(res.data || []);
        if (--aptState.pending === 0) {
          clearTimeout(guard);
          aptState.loaded = true;
          aptState.loading = false;
          renderAirports();
          if (pendingAptLookup) {
            var code = pendingAptLookup;
            pendingAptLookup = null;
            applyAirportCode(code, true);
          }
        }
      };
    }
    try {
      var opts = { download: true, header: true, skipEmptyLines: true, error: fail };
      Papa.parse(APT_URL, Object.assign({ complete: part(ingestAirports) }, opts));
      Papa.parse(RWY_URL, Object.assign({ complete: part(ingestRunways) }, opts));
      Papa.parse(AFREQ_URL, Object.assign({ complete: part(ingestAptFreqs) }, opts));
    } catch (e) {
      fail();
    }
  }

  // ---- Waypoints (5-letter RNAV fixes) ----
  function setWptStatus(msg) {
    $wptStatus.textContent = msg;
  }

  function buildWaypointPopup(w) {
    return (
      '<div class="wpt-pop"><div class="wpt-pop-id">' +
      escapeHtml(w.ident) +
      "</div>" +
      '<div class="wpt-pop-name">' +
      fmtCoord({ lat: w.lat, lng: w.lng }) +
      "</div>" +
      '<button class="wpt-pop-btn">＋ Add to route</button></div>'
    );
  }

  function makeWaypointMarker(w) {
    var icon = L.divIcon({
      className: "",
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      html:
        '<div class="waypoint"><span class="wpt-sym"></span><span class="wpt-id">' +
        escapeHtml(w.ident) +
        "</span></div>",
    });
    var mk = L.marker([w.lat, w.lng], { icon: icon });
    mk._wpt = w;
    mk.bindPopup(buildWaypointPopup(w));
    return mk;
  }

  function renderWaypoints() {
    waypointLayer.clearLayers();
    if (!wptState.enabled) return;
    if (wptState.loading) {
      setWptStatus("Loading waypoint database…");
      return;
    }
    if (!wptState.loaded) return;
    if (map.getZoom() < MIN_WPT_ZOOM) {
      setWptStatus("Zoom in to show waypoints (≥ z" + MIN_WPT_ZOOM + ")");
      return;
    }
    var b = map.getBounds(),
      shown = 0,
      total = 0;
    for (var i = 0; i < wptData.length; i++) {
      var w = wptData[i];
      if (!b.contains([w.lat, w.lng])) continue;
      total++;
      if (shown >= MAX_WPT) continue;
      waypointLayer.addLayer(makeWaypointMarker(w));
      shown++;
    }
    setWptStatus(
      total > MAX_WPT
        ? "Showing " + shown + " of " + total + " in view — zoom in for the rest"
        : shown
        ? "Showing " + shown + " waypoint" + (shown === 1 ? "" : "s")
        : "No waypoints in view"
    );
  }

  function ingestWaypoints(text) {
    wptData = [];
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim().split(/\s+/);
      if (t.length < 3) continue;
      var id = t[2];
      if (!/^[A-Z]{5}$/.test(id) || id === "ZZZZZ") continue;
      var lat = parseFloat(t[0]),
        lng = parseFloat(t[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      wptData.push({ ident: id, lat: lat, lng: lng });
    }
    wptState.loaded = true;
    wptState.loading = false;
    renderWaypoints();
  }

  function loadWaypoints() {
    if (wptState.loading || wptState.loaded) {
      renderWaypoints();
      return;
    }
    wptState.loading = true;
    setWptStatus("Loading waypoint database…");
    var done = false;
    var guard = setTimeout(function () {
      if (!done && !wptState.loaded) {
        wptState.loading = false;
        setWptStatus("Waypoint data blocked or slow — the sandbox may be preventing the download.");
      }
    }, 30000);
    function fail() {
      done = true;
      clearTimeout(guard);
      wptState.loading = false;
      setWptStatus("Could not load waypoint data (blocked or offline).");
    }
    try {
      fetch(WPT_URL)
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (text) {
          done = true;
          clearTimeout(guard);
          ingestWaypoints(text);
        })
        .catch(fail);
    } catch (e) {
      fail();
    }
  }

  function render() {
    if (state.mode === "ranges") renderRanges();
    else if (state.mode === "glider") renderGlide();
    else redrawRouteGeometry();
  }

  function setMode(m) {
    state.mode = m;
    // Drop every mode's layers first, then re-add the active mode's below.
    REGIMES.forEach(function (rg) {
      map.removeLayer(rangeCircles[rg.key]);
    });
    map.removeLayer(rangeLabelLayer);
    map.removeLayer(centerMarker);
    map.removeLayer(routeCircle);
    map.removeLayer(routeLinesGroup);
    map.removeLayer(routeMarkersGroup);
    map.removeLayer(glideCircle);
    map.removeLayer(glideMarker);

    segRanges.classList.toggle("active", m === "ranges");
    segPlan.classList.toggle("active", m === "plan");
    segGlider.classList.toggle("active", m === "glider");

    rangesControl.style.display = m === "ranges" ? "" : "none";
    radiusControl.style.display = m === "plan" ? "" : "none";
    gliderControl.style.display = m === "glider" ? "" : "none";
    rangesView.style.display = m === "ranges" ? "" : "none";
    routeView.style.display = m === "plan" ? "" : "none";
    gliderView.style.display = m === "glider" ? "" : "none";

    if (m === "ranges") {
      REGIMES.forEach(function (rg) {
        map.addLayer(rangeCircles[rg.key]);
      });
      map.addLayer(rangeLabelLayer);
      map.addLayer(centerMarker);
      renderRanges();
    } else if (m === "glider") {
      map.addLayer(glideCircle);
      map.addLayer(glideMarker);
      $glideGroundRow.style.display = state.glide.datum === "MSL" ? "" : "none";
      renderGlide();
    } else {
      map.addLayer(routeCircle);
      map.addLayer(routeLinesGroup);
      map.addLayer(routeMarkersGroup);
      rcLabel.textContent = "Budget (total range)";
      syncControls();
      rebuildRouteMarkers();
      redrawRouteGeometry();
    }
    if (navAnyOn()) map.addLayer(navaidLayer); // keep navaids above on top
    if (aptAnyOn()) map.addLayer(airportLayer); // and airports on top
    if (wptState.enabled) map.addLayer(waypointLayer); // and waypoints on top
    scheduleSave();
  }

  function applySpeedChange() {
    var raw = parseFloat($speedInput.value);
    var newSpeed = !isNaN(raw) && raw > 0 ? raw * SPEED_UNITS[state.speedUnit] : 0;
    if (state.unit === "h" && state.speedMS > 0 && newSpeed > 0) {
      var hours = activeRadiusM() / (state.speedMS * 3600);
      state.speedMS = newSpeed;
      setActiveRadiusM(Math.min(SLIDER_MAX, hours * newSpeed * 3600));
    } else {
      state.speedMS = newSpeed;
    }
    setHourOption(newSpeed > 0);
    rebuildPresets();
    syncControls();
    render();
  }

  // ---- Events ----
  function onInputInput() {
    var v = parseFloat($input.value);
    if (!isNaN(v) && v > 0) {
      setActiveRadiusM(Math.min(SLIDER_MAX, inputValueToRadius(v)));
      $slider.value = metersToSlider(activeRadiusM());
      render();
    }
  }
  function onUnitChange() {
    state.unit = $unit.value;
    rebuildPresets();
    syncControls();
    render();
  }
  function onSliderInput() {
    setActiveRadiusM(sliderToMeters(parseFloat($slider.value)));
    syncControls();
    render();
  }
  function onSpeedUnitChange() {
    state.speedUnit = $speedUnit.value;
    applySpeedChange();
  }
  function onModeRanges() {
    setMode("ranges");
  }
  function onModePlan() {
    setMode("plan");
  }
  function onModeGlider() {
    setMode("glider");
  }
  // Glider-mode control handlers: update state, redraw, and persist.
  function onGlideHeightInput() {
    var v = parseFloat($glideHeight.value);
    state.glide.heightM = !isNaN(v) && v > 0 ? v * HEIGHT_UNITS[state.glide.heightUnit] : 0;
    renderGlide();
    scheduleSave();
  }
  function onGlideHeightUnitChange() {
    // Preserve the stored metres; just re-express the display in the new unit.
    state.glide.heightUnit = $glideHeightUnit.value;
    $glideHeight.value = Math.round(state.glide.heightM / HEIGHT_UNITS[state.glide.heightUnit]);
    showGroundValue();
    renderGlide();
    scheduleSave();
  }
  function onGlideDatumChange() {
    state.glide.datum = $glideDatum.value;
    $glideGroundRow.style.display = state.glide.datum === "MSL" ? "" : "none";
    if (state.glide.datum === "MSL") fetchGroundElevation();
    renderGlide();
    scheduleSave();
  }
  function onGlideRatioInput() {
    var v = parseFloat($glideRatio.value);
    state.glide.ratio = !isNaN(v) && v > 0 ? v : 0;
    renderGlide();
    scheduleSave();
  }
  function setQMode(m) {
    state.glide.qmode = m;
    applyQModeUI();
    renderGlide();
    scheduleSave();
  }
  function onGlideGliderChange() {
    state.glide.gliderId = $glideGliderSelect.value;
    renderGlide();
    scheduleSave();
  }
  // Click the polar chart to set the airspeed (pixel-x → km/h → m/s).
  function onPolarChartClick(e) {
    if (!polarGeom) return;
    var rect = $glidePolarChart.getBoundingClientRect();
    if (!rect.width) return;
    var vbX = ((e.clientX - rect.left) / rect.width) * polarGeom.W;
    var kmh = ((vbX - polarGeom.mL) / polarGeom.pw) * polarGeom.maxV;
    kmh = Math.max(polarGeom.minKmh, Math.min(polarGeom.maxKmh, kmh));
    state.glide.speedMS = (kmh / 3.6);
    $glideSpeed.value = Math.round(state.glide.speedMS / SPEED_UNITS[state.glide.speedUnit]);
    renderGlide();
    scheduleSave();
  }
  function onGlideSpeedInput() {
    var v = parseFloat($glideSpeed.value);
    state.glide.speedMS = !isNaN(v) && v > 0 ? v * SPEED_UNITS[state.glide.speedUnit] : 0;
    renderGlide();
    scheduleSave();
  }
  function onGlideSpeedUnitChange() {
    state.glide.speedUnit = $glideSpeedUnit.value;
    $glideSpeed.value = Math.round(state.glide.speedMS / SPEED_UNITS[state.glide.speedUnit]);
    renderGlide();
    scheduleSave();
  }
  function onGlideWindSpeedInput() {
    var v = parseFloat($glideWindSpeed.value);
    state.glide.windMS = !isNaN(v) && v > 0 ? v * SPEED_UNITS[state.glide.windUnit] : 0;
    renderGlide();
    scheduleSave();
  }
  function onGlideWindSpeedUnitChange() {
    state.glide.windUnit = $glideWindSpeedUnit.value;
    $glideWindSpeed.value = fmt(state.glide.windMS / SPEED_UNITS[state.glide.windUnit], state.glide.windMS < 5 ? 1 : 0);
    scheduleSave();
  }
  // Draggable compass dial for wind direction (bearing the wind blows TO). North
  // up; bearing = atan2(dx, -dy) from the dial centre. Pointer capture keeps
  // tracking off-dial, same idiom as the draggable panels.
  function initWindDial() {
    var dragging = false;
    function apply(e) {
      var r = $glideWindDial.getBoundingClientRect(),
        dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      var b = (toDeg(Math.atan2(dx, -dy)) + 360) % 360;
      state.glide.windDir = b;
      setWindNeedle(b);
      renderGlide();
    }
    $glideWindDial.addEventListener("pointerdown", function (e) {
      dragging = true;
      try {
        $glideWindDial.setPointerCapture(e.pointerId);
      } catch (_) {}
      apply(e);
      e.preventDefault();
    });
    $glideWindDial.addEventListener("pointermove", function (e) {
      if (dragging) apply(e);
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      try {
        $glideWindDial.releasePointerCapture(e.pointerId);
      } catch (_) {}
      scheduleSave();
    }
    $glideWindDial.addEventListener("pointerup", end);
    $glideWindDial.addEventListener("pointercancel", end);
  }
  // Ranges-mode control: re-read inputs and redraw on any change.
  function onRangesInput() {
    readRangesInputs();
    renderRanges();
  }
  function onFuelUnitChange() {
    readRangesInputs();
    var label = $fuelUnit.value + "/h";
    Array.prototype.forEach.call(document.querySelectorAll(".rng-cons-unit"), function (el) {
      el.textContent = label;
    });
    renderRanges();
  }
  function onUndo() {
    if (state.route.points.length) {
      state.route.points.pop();
      state.route.info.pop();
      rebuildRouteMarkers();
      redrawRouteGeometry();
    }
  }
  function onClear() {
    state.route.points = [];
    state.route.info = [];
    rebuildRouteMarkers();
    redrawRouteGeometry();
  }
  function setNavType(cat, on) {
    navState.types[cat] = on;
    if (navAnyOn()) {
      map.addLayer(navaidLayer);
      if (!navState.loaded && !navState.loading) loadNavaids();
      else renderNavaids();
    } else {
      map.removeLayer(navaidLayer);
      setNavStatus("Navaids hidden.");
    }
    scheduleSave();
  }
  function setAptGroup(grp, on) {
    aptState.types[grp] = on;
    if (aptAnyOn()) {
      map.addLayer(airportLayer);
      if (!aptState.loaded && !aptState.loading) loadAirports();
      else renderAirports();
    } else {
      map.removeLayer(airportLayer);
      setAptStatus("Airports hidden.");
    }
    scheduleSave();
  }
  function setWptEnabled(on) {
    wptState.enabled = on;
    if (on) {
      map.addLayer(waypointLayer);
      if (!wptState.loaded && !wptState.loading) loadWaypoints();
      else renderWaypoints();
    } else {
      map.removeLayer(waypointLayer);
      setWptStatus("Waypoints hidden.");
    }
    scheduleSave();
  }
  function onReset() {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    if (state.mode === "ranges") {
      state.ranges.center = L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      renderRanges();
    } else if (state.mode === "glider") {
      state.glide.center = L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      renderGlide();
    }
  }
  // On a narrow screen the panels fold to right-edge circular buttons (see the
  // @media block in styles.css); dragging is disabled there. Live media query so
  // resizing across the breakpoint re-applies the layout.
  var mql = window.matchMedia("(max-width: 640px)");
  var panel = document.getElementById("panel");
  var collapseBtn = document.getElementById("collapse-btn");
  var layersPanel = document.getElementById("layers-panel");
  var layersCollapseBtn = document.getElementById("layers-collapse-btn");
  function setPanelCollapsed(p, btn, collapsed) {
    p.classList.toggle("collapsed", collapsed);
    btn.textContent = collapsed ? "+" : "−";
  }
  function onCollapse() {
    setPanelCollapsed(panel, collapseBtn, !panel.classList.contains("collapsed"));
    // Mobile: only one full-width sheet open at a time.
    if (mql.matches && !panel.classList.contains("collapsed"))
      setPanelCollapsed(layersPanel, layersCollapseBtn, true);
  }
  function onLayersCollapse() {
    setPanelCollapsed(layersPanel, layersCollapseBtn, !layersPanel.classList.contains("collapsed"));
    if (mql.matches && !layersPanel.classList.contains("collapsed"))
      setPanelCollapsed(panel, collapseBtn, true);
  }
  function clearInlinePos(p) {
    p.style.left = p.style.top = p.style.right = p.style.bottom = "";
  }
  // Apply the layout for the current breakpoint. Mobile: fold both panels and drop
  // any inline drag offsets so the CSS centres the circles. Desktop: restore saved
  // positions and re-enable dragging.
  function applyResponsiveLayout(mobile) {
    if (mobile) {
      setPanelCollapsed(panel, collapseBtn, true);
      setPanelCollapsed(layersPanel, layersCollapseBtn, true);
      clearInlinePos(panel);
      clearInlinePos(layersPanel);
    } else {
      clearInlinePos(panel);
      clearInlinePos(layersPanel);
      restorePanelPosition(panel, "simmap.pos.panel");
      restorePanelPosition(layersPanel, "simmap.pos.layers");
    }
  }

  // ---- Draggable panels ----
  // Both floating panels can be repositioned by dragging their header bar; the
  // position is remembered across reloads via localStorage. Pointer Events give
  // mouse + touch in one path, and setPointerCapture keeps tracking off-panel.
  function clampPanel(panel, left, top) {
    var maxX = Math.max(0, window.innerWidth - panel.offsetWidth);
    var maxY = Math.max(0, window.innerHeight - panel.offsetHeight);
    return {
      left: Math.max(0, Math.min(left, maxX)),
      top: Math.max(0, Math.min(top, maxY)),
    };
  }
  function placePanel(panel, left, top) {
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
  }
  function restorePanelPosition(panel, key) {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      saved = null;
    }
    if (!saved || typeof saved.left !== "number" || typeof saved.top !== "number") return;
    var c = clampPanel(panel, saved.left, saved.top);
    placePanel(panel, c.left, c.top);
  }
  function makeDraggable(panel, handle, key) {
    var dragging = false,
      moved = false,
      startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0;
    function onDown(e) {
      if (mql.matches) return; // circles are fixed in mobile layout
      if (e.button !== 0 || (e.target.closest && e.target.closest("button"))) return;
      var rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      placePanel(panel, rect.left, rect.top);
      dragging = true;
      moved = false;
      handle.__dragMoved = false;
      panel.classList.add("panel-dragging");
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) moved = true;
      var c = clampPanel(panel, startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
      placePanel(panel, c.left, c.top);
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      // Mark a real move so the synthetic click that follows the drag doesn't
      // trigger the tap-to-expand handler on the same header.
      if (moved) handle.__dragMoved = true;
      panel.classList.remove("panel-dragging");
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch (_) {}
      try {
        var rect = panel.getBoundingClientRect();
        localStorage.setItem(key, JSON.stringify({ left: rect.left, top: rect.top }));
      } catch (_) {}
    }
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
    return function () {
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
  }

  $input.addEventListener("input", onInputInput);
  $input.addEventListener("change", syncControls);
  $slider.addEventListener("input", onSliderInput);
  $unit.addEventListener("change", onUnitChange);
  $speedInput.addEventListener("input", applySpeedChange);
  $speedUnit.addEventListener("change", onSpeedUnitChange);

  // Ranges-mode inputs.
  $airport.addEventListener("input", function () {
    applyAirportCode($airport.value, true);
  });
  $airport.addEventListener("change", function () {
    applyAirportCode($airport.value, true);
  });
  $fuel.addEventListener("input", onRangesInput);
  $fuelUnit.addEventListener("change", onFuelUnitChange);
  $reserve.addEventListener("change", onRangesInput);
  $rngSpeedUnit.addEventListener("change", onRangesInput);
  $rngDistUnit.addEventListener("change", onRangesInput);
  ["max", "opt", "end"].forEach(function (k) {
    rngSpeedEl[k].addEventListener("input", onRangesInput);
    rngConsEl[k].addEventListener("input", onRangesInput);
  });

  segRanges.onclick = onModeRanges;
  segPlan.onclick = onModePlan;
  segGlider.onclick = onModeGlider;

  // Glider-mode inputs.
  $glideHeight.addEventListener("input", onGlideHeightInput);
  $glideHeightUnit.addEventListener("change", onGlideHeightUnitChange);
  $glideDatum.addEventListener("change", onGlideDatumChange);
  $glideRatio.addEventListener("input", onGlideRatioInput);
  $glideQDirect.onclick = function () {
    setQMode("direct");
  };
  $glideQPolar.onclick = function () {
    setQMode("polar");
  };
  $glideGliderSelect.addEventListener("change", onGlideGliderChange);
  $glidePolarChart.addEventListener("click", onPolarChartClick);
  $glideSpeed.addEventListener("input", onGlideSpeedInput);
  $glideSpeedUnit.addEventListener("change", onGlideSpeedUnitChange);
  $glideWindSpeed.addEventListener("input", onGlideWindSpeedInput);
  $glideWindSpeedUnit.addEventListener("change", onGlideWindSpeedUnitChange);
  initWindDial();

  document.getElementById("undo-btn").onclick = onUndo;
  document.getElementById("clear-btn").onclick = onClear;

  // Route points table — delegate delete clicks (innerHTML is rebuilt on every change).
  $routePoints.addEventListener("click", function (e) {
    var btn = e.target.closest(".rp-del");
    if (!btn) return;
    var i = parseInt(btn.getAttribute("data-idx"), 10);
    if (!isNaN(i)) deleteRoutePoint(i);
  });

  // Route points table — drag rows to reorder (delegated; HTML5 DnD events bubble).
  var rpDragFrom = -1;
  function rpClearIndicators() {
    var rows = $routePoints.querySelectorAll(".rp-drop-before, .rp-drop-after, .rp-dragging");
    Array.prototype.forEach.call(rows, function (el) {
      el.classList.remove("rp-drop-before", "rp-drop-after", "rp-dragging");
    });
  }
  function rpDropAfter(tr, clientY) {
    var r = tr.getBoundingClientRect();
    return clientY - r.top > r.height / 2;
  }
  $routePoints.addEventListener("dragstart", function (e) {
    var tr = e.target.closest("tr[draggable]");
    if (!tr) return;
    rpDragFrom = parseInt(tr.getAttribute("data-idx"), 10);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(rpDragFrom));
    tr.classList.add("rp-dragging");
  });
  $routePoints.addEventListener("dragover", function (e) {
    if (rpDragFrom < 0) return;
    var tr = e.target.closest("tbody tr");
    if (!tr) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    var after = rpDropAfter(tr, e.clientY);
    $routePoints.querySelectorAll(".rp-drop-before, .rp-drop-after").forEach(function (el) {
      el.classList.remove("rp-drop-before", "rp-drop-after");
    });
    tr.classList.add(after ? "rp-drop-after" : "rp-drop-before");
  });
  $routePoints.addEventListener("drop", function (e) {
    if (rpDragFrom < 0) return;
    var tr = e.target.closest("tbody tr");
    if (tr) {
      e.preventDefault();
      var overIdx = parseInt(tr.getAttribute("data-idx"), 10);
      var insertPos = rpDropAfter(tr, e.clientY) ? overIdx + 1 : overIdx;
      var to = insertPos > rpDragFrom ? insertPos - 1 : insertPos;
      moveRoutePoint(rpDragFrom, to);
    }
    rpClearIndicators();
    rpDragFrom = -1;
  });
  $routePoints.addEventListener("dragend", function () {
    rpClearIndicators();
    rpDragFrom = -1;
  });

  // Layer checkboxes — one per beacon type / airport size, each independent.
  Array.prototype.forEach.call(document.querySelectorAll(".lyr-nav"), function (cb) {
    cb.addEventListener("change", function () {
      setNavType(cb.getAttribute("data-cat"), cb.checked);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".lyr-apt"), function (cb) {
    cb.addEventListener("change", function () {
      setAptGroup(cb.getAttribute("data-grp"), cb.checked);
    });
  });
  document.getElementById("wpt-enable").addEventListener("change", function () {
    setWptEnabled(this.checked);
  });

  // Add-to-route from navaid popup
  map.on("popupopen", function (e) {
    var node = e.popup._contentNode,
      src = e.popup._source;
    if (!node || !src) return;
    aptPopupOpen = !!src._apt;

    // Route waypoint popup: delete the point and reconnect its neighbours.
    if (src._routeIdx != null) {
      var del = node.querySelector(".route-pop-del");
      if (del)
        del.onclick = function () {
          deleteRoutePoint(src._routeIdx);
        };
      return;
    }

    // Airport popup: add the airport as a route waypoint.
    if (src._apt) {
      var aBtn = node.querySelector(".apt-pop-btn");
      if (aBtn)
        aBtn.onclick = function () {
          if (state.mode !== "plan") {
            toast("Switch to Flight plan mode to add points");
            return;
          }
          var a = src._apt;
          var added = tryAddRoutePoint(L.latLng(a.lat, a.lng), {
            kind: "airport",
            cat: "APT",
            ident: a.ident,
          });
          if (added) {
            map.closePopup();
            toast("Added " + a.ident + " to route");
          }
        };
      return;
    }

    // Waypoint popup: add the 5-letter fix as a route waypoint.
    if (src._wpt) {
      var wBtn = node.querySelector(".wpt-pop-btn");
      if (wBtn)
        wBtn.onclick = function () {
          if (state.mode !== "plan") {
            toast("Switch to Flight plan mode to add points");
            return;
          }
          var w = src._wpt;
          var added = tryAddRoutePoint(L.latLng(w.lat, w.lng), {
            kind: "waypoint",
            cat: "FIX",
            ident: w.ident,
          });
          if (added) {
            map.closePopup();
            toast("Added " + w.ident + " to route");
          }
        };
      return;
    }

    if (!src._nav) return;
    var btn = node.querySelector(".nav-pop-btn");
    if (!btn) return;
    btn.onclick = function () {
      if (state.mode !== "plan") {
        toast("Switch to Flight plan mode to add points");
        return;
      }
      var ok = tryAddRoutePoint(L.latLng(src._nav.lat, src._nav.lng), {
        ident: src._nav.ident,
        cat: src._nav.cat,
        type: src._nav.type,
        name: src._nav.name,
        freq: src._nav.freq,
      });
      if (ok) {
        map.closePopup();
        toast("Added " + src._nav.ident + " to route");
      }
    };
  });

  map.on("click", function (e) {
    if (state.mode === "ranges") {
      state.ranges.center = e.latlng;
      clearAirportCode();
      renderRanges();
    } else if (state.mode === "glider") {
      state.glide.center = e.latlng;
      renderGlide();
      fetchGroundElevation();
      scheduleSave();
    } else tryAddRoutePoint(e.latlng);
  });
  map.on("mousemove", function (e) {
    $readout.textContent = fmtCoord(e.latlng) + "  ·  z" + map.getZoom();
  });
  map.on("mouseout", function () {
    $readout.textContent = "—";
  });
  map.on("moveend zoomend", function () {
    if (navAnyOn()) renderNavaids();
    // Skip while an airport popup is open: re-rendering would clearLayers() and close it.
    if (aptAnyOn() && !aptPopupOpen) renderAirports();
    if (wptState.enabled) renderWaypoints();
    scheduleSave();
  });
  map.on("popupclose", function (e) {
    if (e.popup && e.popup._source && e.popup._source._apt) {
      aptPopupOpen = false;
      if (aptAnyOn()) renderAirports(); // refresh markers for the (possibly panned) view
    }
  });

  document.getElementById("reset").onclick = onReset;
  collapseBtn.onclick = onCollapse;
  layersCollapseBtn.onclick = onLayersCollapse;

  // Tapping a folded panel (its header) expands it. Ignore clicks on the inner
  // buttons (the collapse "−" handles itself when expanded).
  document.getElementById("panel-header").addEventListener("click", function (e) {
    if (this.__dragMoved) { this.__dragMoved = false; return; }
    if (e.target.closest("button")) return;
    if (panel.classList.contains("collapsed")) onCollapse();
  });
  document.getElementById("layers-header").addEventListener("click", function (e) {
    if (this.__dragMoved) { this.__dragMoved = false; return; }
    if (e.target.closest("button")) return;
    if (layersPanel.classList.contains("collapsed")) onLayersCollapse();
  });

  // ---- Init ----
  // Restore persisted state (saved was read at the top). Drive the existing
  // setters so layer data lazy-loads and the checkboxes reflect what's enabled.
  if (saved) {
    // Speed first: recreates the "h" unit option before syncControls runs.
    if (saved.speedInput != null && saved.speedInput !== "") {
      $speedInput.value = saved.speedInput;
      $speedUnit.value = state.speedUnit;
      var savedRaw = parseFloat(saved.speedInput);
      state.speedMS =
        !isNaN(savedRaw) && savedRaw > 0 ? savedRaw * SPEED_UNITS[state.speedUnit] : 0;
      setHourOption(state.speedMS > 0);
    }
    var L_ = saved.layers || {};
    ["VOR", "NDB", "DME"].forEach(function (cat) {
      if (L_.nav && L_.nav[cat]) {
        var cb = document.querySelector('.lyr-nav[data-cat="' + cat + '"]');
        if (cb) cb.checked = true;
        setNavType(cat, true);
      }
    });
    ["small", "medium", "large"].forEach(function (grp) {
      if (L_.apt && L_.apt[grp]) {
        var cb = document.querySelector('.lyr-apt[data-grp="' + grp + '"]');
        if (cb) cb.checked = true;
        setAptGroup(grp, true);
      }
    });
    if (L_.wpt) {
      var wcb = document.getElementById("wpt-enable");
      if (wcb) wcb.checked = true;
      setWptEnabled(true);
    }
  }
  rebuildPresets();
  syncRangesInputs();
  syncGlideInputs();
  setMode(state.mode);
  if (state.glide.datum === "MSL") fetchGroundElevation();
  // Dragging is always wired (onDown no-ops in mobile); the responsive layout is
  // (re)applied at load and whenever the viewport crosses the 640px breakpoint.
  var disposeDragPanel = makeDraggable(panel, document.getElementById("panel-header"), "simmap.pos.panel");
  var disposeDragLayers = makeDraggable(layersPanel, document.getElementById("layers-header"), "simmap.pos.layers");
  applyResponsiveLayout(mql.matches);
  var onMqlChange = function (e) {
    applyResponsiveLayout(e.matches);
  };
  mql.addEventListener("change", onMqlChange);
  var sizeTimer = setTimeout(function () {
    map.invalidateSize();
  }, 80);

  // ---- Cleanup (called when the component unmounts) ----
  return function cleanup() {
    clearTimeout(sizeTimer);
    clearTimeout(toastTimer);
    clearTimeout(saveTimer);
    clearTimeout(elevTimer);
    mql.removeEventListener("change", onMqlChange);
    disposeDragPanel();
    disposeDragLayers();
    map.remove();
  };
}
