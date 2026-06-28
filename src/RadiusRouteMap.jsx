import { useEffect, useRef } from "react";
import L from "leaflet";
import Papa from "papaparse";

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
            <button className="seg-btn active" id="mode-ranges">
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

          <button id="reset" style={{ marginTop: 4 }}>
            Reset view
          </button>
        </div>
      </div>

      {/* LAYERS PANEL (top-right) */}
      <div id="layers-panel">
        <div id="layers-header">
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
  function routeMarkerIcon(role) {
    return L.divIcon({
      className: "",
      html: '<div class="route-pin ' + role + '"></div>',
      iconSize: [15, 15],
      iconAnchor: [7.5, 7.5],
    });
  }
  function legLabelMarker(latlng, deg) {
    var txt = ("00" + (Math.round(deg) % 360)).slice(-3) + "°";
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "",
        html: '<div class="leg-label">' + txt + "</div>",
        iconSize: [34, 16],
        iconAnchor: [17, 8],
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
    mode: "ranges",
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
  centerMarker.on("drag", function (e) {
    state.ranges.center = e.target.getLatLng();
    clearAirportCode();
    renderRanges();
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
    segPlan = document.getElementById("mode-plan");
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
      if (haversineM(pts[i], pts[i + 1]) > 1) {
        var mid = line[Math.floor(line.length / 2)]; // a point on the curve
        routeLinesGroup.addLayer(legLabelMarker(mid, bearingDeg(pts[i], pts[i + 1])));
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
    else redrawRouteGeometry();
  }

  function setMode(m) {
    state.mode = m;
    if (m === "ranges") {
      REGIMES.forEach(function (rg) {
        map.addLayer(rangeCircles[rg.key]);
      });
      map.addLayer(rangeLabelLayer);
      map.addLayer(centerMarker);
      map.removeLayer(routeCircle);
      map.removeLayer(routeLinesGroup);
      map.removeLayer(routeMarkersGroup);
      rangesControl.style.display = "";
      radiusControl.style.display = "none";
      rangesView.style.display = "";
      routeView.style.display = "none";
      segRanges.classList.add("active");
      segPlan.classList.remove("active");
      renderRanges();
    } else {
      REGIMES.forEach(function (rg) {
        map.removeLayer(rangeCircles[rg.key]);
      });
      map.removeLayer(rangeLabelLayer);
      map.removeLayer(centerMarker);
      map.addLayer(routeCircle);
      map.addLayer(routeLinesGroup);
      map.addLayer(routeMarkersGroup);
      rcLabel.textContent = "Budget (total range)";
      rangesControl.style.display = "none";
      radiusControl.style.display = "";
      rangesView.style.display = "none";
      routeView.style.display = "";
      segPlan.classList.add("active");
      segRanges.classList.remove("active");
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
    }
  }
  var panel = document.getElementById("panel");
  var collapseBtn = document.getElementById("collapse-btn");
  function onCollapse() {
    panel.classList.toggle("collapsed");
    collapseBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  }
  var layersPanel = document.getElementById("layers-panel");
  var layersCollapseBtn = document.getElementById("layers-collapse-btn");
  function onLayersCollapse() {
    layersPanel.classList.toggle("collapsed");
    layersCollapseBtn.textContent = layersPanel.classList.contains("collapsed") ? "+" : "−";
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
      startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0;
    function onDown(e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest("button"))) return;
      var rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      placePanel(panel, rect.left, rect.top);
      dragging = true;
      panel.classList.add("panel-dragging");
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      var c = clampPanel(panel, startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
      placePanel(panel, c.left, c.top);
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
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
  setMode(state.mode);
  var disposeDragPanel = makeDraggable(panel, document.getElementById("panel-header"), "simmap.pos.panel");
  var disposeDragLayers = makeDraggable(layersPanel, document.getElementById("layers-header"), "simmap.pos.layers");
  restorePanelPosition(panel, "simmap.pos.panel");
  restorePanelPosition(layersPanel, "simmap.pos.layers");
  var sizeTimer = setTimeout(function () {
    map.invalidateSize();
  }, 80);

  // ---- Cleanup (called when the component unmounts) ----
  return function cleanup() {
    clearTimeout(sizeTimer);
    clearTimeout(toastTimer);
    clearTimeout(saveTimer);
    disposeDragPanel();
    disposeDragLayers();
    map.remove();
  };
}
