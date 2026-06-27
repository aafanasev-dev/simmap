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
          <h1>Radius &amp; Route Map</h1>
          <button id="collapse-btn" title="Collapse">
            −
          </button>
        </div>

        <div id="panel-body">
          <div id="mode-toggle">
            <button className="seg-btn active" id="mode-radius">
              Radius
            </button>
            <button className="seg-btn" id="mode-route">
              Route
            </button>
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

          {/* LAYERS (shared) */}
          <div id="layers-block">
            <div className="field-label">Map layers</div>
            <label className="nav-toggle">
              <input type="checkbox" id="nav-enable" /> <span>Navaids (VOR / NDB / DME)</span>
            </label>
            <div className="presets" id="nav-types">
              <button className="chip active" data-cat="VOR">
                VOR
              </button>
              <button className="chip active" data-cat="NDB">
                NDB
              </button>
              <button className="chip active" data-cat="DME">
                DME / TACAN
              </button>
            </div>
            <div className="note" id="nav-status" style={{ marginTop: 8 }}>
              Enable to load worldwide beacons (source: OurAirports). Click a beacon for its
              frequency.
            </div>
            <label className="nav-toggle" style={{ marginTop: 10 }}>
              <input type="checkbox" id="apt-enable" /> <span>Airports</span>
            </label>
            <div className="note" id="apt-status" style={{ marginTop: 8 }}>
              Enable to load airports (source: OurAirports). Click one for runways &amp;
              frequencies.
            </div>
          </div>

          {/* RADIUS MODE */}
          <div id="radius-view">
            <div className="stats" id="radius-stats"></div>
            <div className="note" style={{ marginTop: 14 }}>
              Click or drag the pin to move the centre. The shape is a{" "}
              <b>true geodesic circle</b> — every point sits the same ground distance from the
              centre, so Web&nbsp;Mercator stretches it toward the poles.
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
  var UNITS = { km: 1000, mi: 1609.344, nmi: 1852 };
  var SPEED_UNITS = { kt: 0.5144444, "km/h": 0.2777778, mph: 0.44704 };
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

  // ---- Map ----
  var map = L.map("map", {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
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

  // ---- State ----
  var state = {
    mode: "radius",
    unit: "km",
    speedMS: 0,
    speedUnit: "kt",
    radius: { center: L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]), radiusM: 100000 },
    route: { budgetM: 100000, points: [], info: [] },
  };
  var navData = [],
    navState = {
      enabled: false,
      loaded: false,
      loading: false,
      types: { VOR: true, NDB: true, DME: true },
    };
  var aptData = [],
    rwyByApt = {},
    freqByApt = {},
    aptState = { enabled: false, loaded: false, loading: false, pending: 0 };
  // True while an airport popup is open, so the moveend re-render (triggered by the
  // popup's own autoPan) doesn't clearLayers() the marker and close the popup.
  var aptPopupOpen = false;

  // ---- Layers ----
  var radiusCircle = L.polygon([], {
    color: "#4f6df5",
    weight: 2,
    fillColor: "#4f6df5",
    fillOpacity: 0.12,
  });
  var radiusMarker = L.marker(state.radius.center, { icon: pinIcon, draggable: true });
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
  radiusMarker.on("drag", function (e) {
    state.radius.center = e.target.getLatLng();
    renderRadius();
  });

  // ---- DOM ----
  var $input = document.getElementById("radius-input"),
    $unit = document.getElementById("unit-select"),
    $slider = document.getElementById("radius-slider");
  var $speedInput = document.getElementById("speed-input"),
    $speedUnit = document.getElementById("speed-unit");
  var $radiusStats = document.getElementById("radius-stats"),
    $routeStats = document.getElementById("route-stats");
  var $crValue = document.getElementById("current-radius-value"),
    $crTime = document.getElementById("current-radius-time"),
    $readout = document.getElementById("coord-readout");
  var rcLabel = document.getElementById("rc-label"),
    radiusView = document.getElementById("radius-view"),
    routeView = document.getElementById("route-view");
  var segRadius = document.getElementById("mode-radius"),
    segRoute = document.getElementById("mode-route");
  var presetWrap = document.getElementById("presets"),
    $navStatus = document.getElementById("nav-status");
  var $routePoints = document.getElementById("route-points");
  var $aptStatus = document.getElementById("apt-status");

  function row(k, v) {
    return '<div class="stat-line"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>";
  }

  // ---- Accessors ----
  function routeUsedM() {
    var p = state.route.points,
      s = 0;
    for (var i = 0; i < p.length - 1; i++) s += haversineM(p[i], p[i + 1]);
    return s;
  }
  function activeRadiusM() {
    return state.mode === "radius" ? state.radius.radiusM : state.route.budgetM;
  }
  function setActiveRadiusM(m) {
    if (state.mode === "radius") state.radius.radiusM = m;
    else state.route.budgetM = Math.max(m, routeUsedM());
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

  // ---- Radius render ----
  function renderRadius() {
    radiusMarker.setLatLng(state.radius.center);
    radiusCircle.setLatLngs(geodesicRing(state.radius.center, state.radius.radiusM, 256));
    var rM = state.radius.radiusM,
      km = rM / 1000,
      area = capArea(rM) / 1e6;
    $radiusStats.innerHTML =
      row("Centre", fmtCoord(state.radius.center)) +
      row(
        "Radius",
        fmt(km, km < 100 ? 1 : 0) +
          " km · " +
          fmt(rM / UNITS.mi, 0) +
          " mi · " +
          fmt(rM / UNITS.nmi, 0) +
          " nmi"
      ) +
      (state.speedMS > 0 ? row("Flight time", fmtTime(rM / state.speedMS)) : "") +
      row("Diameter", fmt(km * 2, km < 100 ? 1 : 0) + " km") +
      row("Cap area", fmt(area, 0) + " km²");
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
    for (var i = 0; i < pts.length - 1; i++)
      routeLinesGroup.addLayer(
        L.polyline(geodesicLine(pts[i], pts[i + 1]), { color: color, weight: 3, opacity: 0.9 })
      );

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
        isApt = nf && nf.cat === "APT",
        label = i === 0 ? "Start" : i === pts.length - 1 ? "End" : String(i),
        typeCell = isApt
          ? escapeHtml(nf.ident)
          : nf
          ? '<span class="rp-tag rp-' +
            nf.cat.toLowerCase() +
            '">' +
            escapeHtml(nf.cat) +
            "</span> " +
            escapeHtml(nf.ident)
          : '<span class="rp-tag rp-wpt">WPT</span>',
        freqCell = nf && !isApt ? escapeHtml(fmtNavFreq(nf.freq)) : "—";
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
    if (!navState.enabled) return;
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
    if (!aptState.enabled) return;
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
    rows.forEach(function (r) {
      if (!APT_TYPES[r.type]) return;
      var lat = parseFloat(r.latitude_deg),
        lng = parseFloat(r.longitude_deg);
      if (isNaN(lat) || isNaN(lng)) return;
      aptData.push({
        ident: r.ident || "?",
        name: r.name || "",
        type: r.type || "",
        lat: lat,
        lng: lng,
        elev: parseFloat(r.elevation_ft),
        iata: r.iata_code || "",
        muni: r.municipality || "",
        country: r.iso_country || "",
      });
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

  function render() {
    if (state.mode === "radius") renderRadius();
    else redrawRouteGeometry();
  }

  function setMode(m) {
    state.mode = m;
    if (m === "radius") {
      map.addLayer(radiusCircle);
      map.addLayer(radiusMarker);
      map.removeLayer(routeCircle);
      map.removeLayer(routeLinesGroup);
      map.removeLayer(routeMarkersGroup);
      rcLabel.textContent = "Radius";
      radiusView.style.display = "";
      routeView.style.display = "none";
      segRadius.classList.add("active");
      segRoute.classList.remove("active");
      syncControls();
      renderRadius();
    } else {
      map.removeLayer(radiusCircle);
      map.removeLayer(radiusMarker);
      map.addLayer(routeCircle);
      map.addLayer(routeLinesGroup);
      map.addLayer(routeMarkersGroup);
      rcLabel.textContent = "Budget (total range)";
      radiusView.style.display = "none";
      routeView.style.display = "";
      segRoute.classList.add("active");
      segRadius.classList.remove("active");
      syncControls();
      rebuildRouteMarkers();
      redrawRouteGeometry();
    }
    if (navState.enabled) map.addLayer(navaidLayer); // keep navaids above on top
    if (aptState.enabled) map.addLayer(airportLayer); // and airports on top
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
  function onModeRadius() {
    setMode("radius");
  }
  function onModeRoute() {
    setMode("route");
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
  function onNavEnable() {
    navState.enabled = this.checked;
    if (navState.enabled) {
      map.addLayer(navaidLayer);
      if (!navState.loaded && !navState.loading) loadNavaids();
      else renderNavaids();
    } else {
      map.removeLayer(navaidLayer);
      setNavStatus("Navaids hidden.");
    }
  }
  function onAptEnable() {
    aptState.enabled = this.checked;
    if (aptState.enabled) {
      map.addLayer(airportLayer);
      if (!aptState.loaded && !aptState.loading) loadAirports();
      else renderAirports();
    } else {
      map.removeLayer(airportLayer);
      setAptStatus("Airports hidden.");
    }
  }
  function onReset() {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    if (state.mode === "radius") {
      state.radius.center = L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      renderRadius();
    }
  }
  var panel = document.getElementById("panel");
  var collapseBtn = document.getElementById("collapse-btn");
  function onCollapse() {
    panel.classList.toggle("collapsed");
    collapseBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  }

  $input.addEventListener("input", onInputInput);
  $input.addEventListener("change", syncControls);
  $slider.addEventListener("input", onSliderInput);
  $unit.addEventListener("change", onUnitChange);
  $speedInput.addEventListener("input", applySpeedChange);
  $speedUnit.addEventListener("change", onSpeedUnitChange);

  segRadius.onclick = onModeRadius;
  segRoute.onclick = onModeRoute;

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

  // Navaid controls
  var navEnableEl = document.getElementById("nav-enable");
  navEnableEl.addEventListener("change", onNavEnable);
  document.getElementById("apt-enable").addEventListener("change", onAptEnable);
  var chipEls = document.querySelectorAll("#nav-types .chip");
  Array.prototype.forEach.call(chipEls, function (chip) {
    chip.addEventListener("click", function () {
      var cat = chip.getAttribute("data-cat");
      navState.types[cat] = !navState.types[cat];
      chip.classList.toggle("active", navState.types[cat]);
      if (navState.enabled) renderNavaids();
    });
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
          if (state.mode !== "route") {
            toast("Switch to Route mode to add points");
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

    if (!src._nav) return;
    var btn = node.querySelector(".nav-pop-btn");
    if (!btn) return;
    btn.onclick = function () {
      if (state.mode !== "route") {
        toast("Switch to Route mode to add points");
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
    if (state.mode === "radius") {
      state.radius.center = e.latlng;
      renderRadius();
    } else tryAddRoutePoint(e.latlng);
  });
  map.on("mousemove", function (e) {
    $readout.textContent = fmtCoord(e.latlng) + "  ·  z" + map.getZoom();
  });
  map.on("mouseout", function () {
    $readout.textContent = "—";
  });
  map.on("moveend zoomend", function () {
    if (navState.enabled) renderNavaids();
    // Skip while an airport popup is open: re-rendering would clearLayers() and close it.
    if (aptState.enabled && !aptPopupOpen) renderAirports();
  });
  map.on("popupclose", function (e) {
    if (e.popup && e.popup._source && e.popup._source._apt) {
      aptPopupOpen = false;
      if (aptState.enabled) renderAirports(); // refresh markers for the (possibly panned) view
    }
  });

  document.getElementById("reset").onclick = onReset;
  collapseBtn.onclick = onCollapse;

  // ---- Init ----
  rebuildPresets();
  setMode("radius");
  var sizeTimer = setTimeout(function () {
    map.invalidateSize();
  }, 80);

  // ---- Cleanup (called when the component unmounts) ----
  return function cleanup() {
    clearTimeout(sizeTimer);
    clearTimeout(toastTimer);
    map.remove();
  };
}
