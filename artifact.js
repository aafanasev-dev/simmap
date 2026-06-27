<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<style>
  :root {
    --accent: #4f6df5;
    --accent-soft: rgba(79, 109, 245, 0.15);
    --danger: #dc2626;
    --green: #16a34a;
    --panel-bg: rgba(255, 255, 255, 0.92);
    --text: #1a1f36;
    --muted: #6b7280;
    --border: rgba(0, 0, 0, 0.08);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

  #app { position: relative; width: 100%; height: 100vh; overflow: hidden; }
  #map { position: absolute; inset: 0; z-index: 1; background: #aadaff; }

  #panel {
    position: absolute; top: 16px; left: 16px; z-index: 1000;
    width: 312px; max-width: calc(100% - 32px);
    background: var(--panel-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border); border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18); color: var(--text); overflow: hidden;
    max-height: calc(100vh - 32px); display: flex; flex-direction: column;
  }
  #panel-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; flex-shrink: 0; }
  #panel-header svg { color: var(--accent); flex-shrink: 0; }
  #panel-header h1 { font-size: 15px; font-weight: 650; letter-spacing: -0.2px; }
  #collapse-btn {
    margin-left: auto; border: none; background: var(--accent-soft); color: var(--accent);
    width: 26px; height: 26px; border-radius: 8px; cursor: pointer; font-size: 16px; line-height: 1;
    display: grid; place-items: center; transition: background 0.15s;
  }
  #collapse-btn:hover { background: rgba(79, 109, 245, 0.28); }

  #panel-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
  #panel.collapsed #panel-body { display: none; }

  #mode-toggle { display: flex; gap: 3px; background: rgba(0,0,0,0.05); border-radius: 11px; padding: 3px; }
  .seg-btn { flex: 1; border: none; background: transparent; color: var(--muted); padding: 8px; font-size: 13px; font-weight: 550; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
  .seg-btn.active { background: #fff; color: var(--accent); font-weight: 650; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

  .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--muted); margin-bottom: 7px; }

  .radius-row { display: flex; gap: 8px; }
  .radius-row input[type="number"] { flex: 1; min-width: 0; padding: 9px 11px; font-size: 14px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .radius-row input[type="number"]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .radius-row select { padding: 9px 8px; font-size: 14px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); cursor: pointer; outline: none; }
  input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; margin-top: 10px; }

  .presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .preset, .chip { border: 1px solid var(--border); background: #fff; color: var(--muted); font-size: 12px; padding: 5px 9px; border-radius: 8px; cursor: pointer; transition: all 0.12s; font-weight: 550; }
  .preset:hover, .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  .nav-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 550; cursor: pointer; }
  .nav-toggle input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

  .stats { background: rgba(0,0,0,0.025); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .stat-line { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; gap: 8px; }
  .stat-line .k { color: var(--muted); white-space: nowrap; }
  .stat-line .v { font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }

  #current-radius { background: var(--accent-soft); border: 1px solid rgba(79,109,245,0.25); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 1px; }
  .cr-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--accent); }
  .cr-value { font-size: 24px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
  .cr-sub { font-size: 12px; font-weight: 600; color: rgba(79,109,245,0.85); font-variant-numeric: tabular-nums; }

  .note { font-size: 11.5px; line-height: 1.5; color: var(--muted); }
  .note b { color: var(--text); font-weight: 600; }

  .btn-row { display: flex; gap: 8px; }
  .btn-sec { flex: 1; border: 1px solid var(--border); background: #fff; color: var(--text); font-weight: 550; font-size: 13px; padding: 9px; border-radius: 10px; cursor: pointer; transition: all 0.13s; }
  .btn-sec:hover { border-color: var(--accent); color: var(--accent); }
  .btn-sec.danger:hover { border-color: var(--danger); color: var(--danger); }
  #reset { border: none; background: var(--accent); color: #fff; font-weight: 600; font-size: 13px; padding: 10px; border-radius: 10px; cursor: pointer; transition: filter 0.15s; }
  #reset:hover { filter: brightness(1.08); }

  #coord-readout { position: absolute; bottom: 46px; right: 14px; z-index: 1000; background: rgba(26, 31, 54, 0.82); color: #fff; backdrop-filter: blur(6px); font-size: 11.5px; font-variant-numeric: tabular-nums; padding: 6px 11px; border-radius: 9px; pointer-events: none; letter-spacing: 0.2px; }

  #sim-disclaimer { position: absolute; bottom: 14px; right: 14px; z-index: 1000; background: rgba(26,31,54,0.72); color: #fff; backdrop-filter: blur(6px); font-size: 10.5px; font-weight: 500; line-height: 1.35; padding: 5px 10px; border-radius: 8px; max-width: 232px; text-align: right; pointer-events: none; }

  #toast { position: absolute; bottom: 52px; left: 50%; transform: translateX(-50%) translateY(8px); z-index: 1100; background: rgba(26,31,54,0.95); color: #fff; font-size: 12.5px; font-weight: 500; padding: 9px 16px; border-radius: 999px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); opacity: 0; pointer-events: none; transition: opacity 0.22s, transform 0.22s; }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  .center-pin { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
  .route-pin { width: 15px; height: 15px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 7px rgba(0,0,0,0.4); }
  .route-pin.start { background: var(--green); }
  .route-pin.mid { background: var(--accent); }
  .route-pin.last { background: var(--accent); box-shadow: 0 0 0 4px rgba(79,109,245,0.3), 0 2px 7px rgba(0,0,0,0.4); }

  /* Navaid markers */
  .navaid { display: flex; align-items: center; gap: 3px; white-space: nowrap; }
  .nav-sym { width: 11px; height: 11px; flex: none; filter: drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 1px rgba(255,255,255,0.95)); }
  .nav-vor .nav-sym { background: #2563eb; clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); }
  .nav-ndb .nav-sym { background: #db2777; border-radius: 50%; }
  .nav-dme .nav-sym { background: #0d9488; border-radius: 2px; }
  .nav-id { font: 700 10px/1 -apple-system, sans-serif; color: #16203c; text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff; }
  .nav-pop { font: 13px -apple-system, sans-serif; min-width: 150px; }
  .nav-pop-id { font-weight: 700; font-size: 14px; color: var(--text); }
  .nav-pop-id span { font-weight: 500; font-size: 10.5px; color: var(--muted); margin-left: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
  .nav-pop-name { color: var(--muted); margin: 2px 0 6px; }
  .nav-pop-freq { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text); }
  .nav-pop-btn { margin-top: 9px; width: 100%; border: none; background: var(--accent); color: #fff; border-radius: 8px; padding: 7px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .nav-pop-btn:hover { filter: brightness(1.08); }

  .leaflet-control-attribution { font-size: 10px; }
</style>

<div id="app">
  <div id="map"></div>

  <div id="panel">
    <div id="panel-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <h1>Radius & Route Map</h1>
      <button id="collapse-btn" title="Collapse">−</button>
    </div>

    <div id="panel-body">
      <div id="mode-toggle">
        <button class="seg-btn active" id="mode-radius">Radius</button>
        <button class="seg-btn" id="mode-route">Route</button>
      </div>

      <div id="radius-control">
        <div class="field-label" id="rc-label">Radius</div>
        <div class="radius-row">
          <input type="number" id="radius-input" min="0" step="any" value="100" />
          <select id="unit-select"><option value="km">km</option><option value="mi">mi</option><option value="nmi">nmi</option></select>
        </div>
        <input type="range" id="radius-slider" min="0" max="1000" value="0" />
        <div class="presets" id="presets"></div>

        <div style="margin-top:14px;">
          <div class="field-label">Cruise speed <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--muted);">· optional, unlocks hours</span></div>
          <div class="radius-row">
            <input type="number" id="speed-input" min="0" step="any" placeholder="e.g. 100" />
            <select id="speed-unit"><option value="kt">kt</option><option value="km/h">km/h</option><option value="mph">mph</option></select>
          </div>
        </div>
      </div>

      <!-- LAYERS (shared) -->
      <div id="layers-block">
        <div class="field-label">Map layers</div>
        <label class="nav-toggle"><input type="checkbox" id="nav-enable" /> <span>Navaids (VOR / NDB / DME)</span></label>
        <div class="presets" id="nav-types">
          <button class="chip active" data-cat="VOR">VOR</button>
          <button class="chip active" data-cat="NDB">NDB</button>
          <button class="chip active" data-cat="DME">DME / TACAN</button>
        </div>
        <div class="note" id="nav-status" style="margin-top:8px;">Enable to load worldwide beacons (source: OurAirports). Click a beacon for its frequency.</div>
      </div>

      <!-- RADIUS MODE -->
      <div id="radius-view">
        <div class="stats" id="radius-stats"></div>
        <div class="note" style="margin-top:14px;">Click or drag the pin to move the centre. The shape is a <b>true geodesic circle</b> — every point sits the same ground distance from the centre, so Web&nbsp;Mercator stretches it toward the poles.</div>
      </div>

      <!-- ROUTE MODE -->
      <div id="route-view" style="display:none;">
        <div id="current-radius">
          <span class="cr-label">Current circle radius</span>
          <span class="cr-value" id="current-radius-value">—</span>
          <span class="cr-sub" id="current-radius-time"></span>
        </div>
        <div class="stats" id="route-stats" style="margin-top:14px;"></div>
        <div class="btn-row" style="margin-top:14px;">
          <button class="btn-sec" id="undo-btn">↶ Undo point</button>
          <button class="btn-sec danger" id="clear-btn">Clear route</button>
        </div>
        <div class="note" style="margin-top:14px;">Click to drop the <b style="color:var(--green)">start</b>, then click <b>inside the circle</b> to extend. Each leg is subtracted from the budget; the circle shows the range left. Drag a point to adjust — a move that exceeds the budget is <b>cancelled</b>. Beacons can be added via their popup.</div>
      </div>

      <button id="reset" style="margin-top:4px;">Reset view</button>
    </div>
  </div>

  <div id="coord-readout">—</div>
  <div id="sim-disclaimer">For flight-simulator use only — not for real-world navigation.</div>
  <div id="toast"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
<script>
(function () {
  var R = 6371008.8;
  var UNITS = { km: 1000, mi: 1609.344, nmi: 1852 };
  var SPEED_UNITS = { "kt": 0.5144444, "km/h": 0.2777778, "mph": 0.44704 };
  var DIST_PRESETS = [ ["10 km", 10000], ["50 km", 50000], ["100 km", 100000], ["500 km", 500000], ["1000 km", 1000000] ];
  var TIME_PRESETS = [ ["1 h", 1], ["2 h", 2], ["3 h", 3], ["5 h", 5], ["8 h", 8] ];
  var SLIDER_MIN = 1000, SLIDER_MAX = 20000000;
  var DEFAULT_CENTER = [44.0, 20.5], DEFAULT_ZOOM = 6;
  var EPS = 1;
  var NAV_URL = "https://davidmegginson.github.io/ourairports-data/navaids.csv";
  var MIN_NAV_ZOOM = 6, MAX_NAV = 500;

  function toRad(d){ return d * Math.PI / 180; }
  function toDeg(r){ return r * 180 / Math.PI; }
  function escapeHtml(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }

  function haversineM(a, b) {
    var lat1 = toRad(a.lat), lat2 = toRad(b.lat);
    var dphi = toRad(b.lat - a.lat), dlmb = toRad(b.lng - a.lng);
    var h = Math.sin(dphi/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlmb/2)**2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function geodesicRing(c, radiusM, n) {
    n = n || 256;
    var lat1 = toRad(c.lat), lng1deg = c.lng, lng1 = toRad(c.lng);
    var d = radiusM / R, sinLat1 = Math.sin(lat1), cosLat1 = Math.cos(lat1), cosD = Math.cos(d), sinD = Math.sin(d);
    var ring = [];
    for (var i = 0; i <= n; i++) {
      var brng = (i / n) * 2 * Math.PI;
      var lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
      var lng2 = lng1 + Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));
      var lat2d = toDeg(lat2), lng2d = toDeg(lng2), delta = lng2d - lng1deg;
      while (delta > 180) { lng2d -= 360; delta -= 360; }
      while (delta < -180) { lng2d += 360; delta += 360; }
      ring.push([lat2d, lng2d]);
    }
    return ring;
  }
  function geodesicLine(a, b) {
    var lat1 = toRad(a.lat), lng1 = toRad(a.lng), lat2 = toRad(b.lat), lng2 = toRad(b.lng);
    var dphi = lat2 - lat1, dlmb = lng2 - lng1;
    var hav = Math.sin(dphi/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlmb/2)**2;
    var delta = 2 * Math.asin(Math.min(1, Math.sqrt(hav)));
    if (delta < 1e-9) return [[a.lat, a.lng], [b.lat, b.lng]];
    var segs = Math.max(2, Math.min(128, Math.round(delta * R / 30000)));
    var sinDelta = Math.sin(delta), pts = [];
    for (var i = 0; i <= segs; i++) {
      var f = i / segs;
      var A = Math.sin((1 - f) * delta) / sinDelta, B = Math.sin(f * delta) / sinDelta;
      var x = A*Math.cos(lat1)*Math.cos(lng1) + B*Math.cos(lat2)*Math.cos(lng2);
      var y = A*Math.cos(lat1)*Math.sin(lng1) + B*Math.cos(lat2)*Math.sin(lng2);
      var z = A*Math.sin(lat1) + B*Math.sin(lat2);
      pts.push([ toDeg(Math.atan2(z, Math.sqrt(x*x + y*y))), toDeg(Math.atan2(y, x)) ]);
    }
    for (var j = 1; j < pts.length; j++) {
      while (pts[j][1] - pts[j-1][1] > 180) pts[j][1] -= 360;
      while (pts[j][1] - pts[j-1][1] < -180) pts[j][1] += 360;
    }
    return pts;
  }

  function capArea(radiusM) { return 2 * Math.PI * R * R * (1 - Math.cos(radiusM / R)); }
  function fmt(n, dp) { return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
  function fmtCoord(ll) {
    var ns = ll.lat >= 0 ? "N" : "S", ew = ll.lng >= 0 ? "E" : "W";
    return Math.abs(ll.lat).toFixed(4) + "° " + ns + ", " + Math.abs(((ll.lng + 540) % 360) - 180).toFixed(4) + "° " + ew;
  }
  function fmtTime(sec) {
    if (!isFinite(sec) || sec <= 0) return "0 min";
    var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    if (m === 60) { h++; m = 0; }
    return (h > 0 ? h + " h " : "") + m + " min";
  }

  // ---- Map ----
  var map = L.map("map", { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 19 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
  map.attributionControl.setPosition("bottomleft");
  L.control.zoom({ position: "topright" }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: true, metric: true }).addTo(map);

  var pinIcon = L.divIcon({ className: "", html: '<div class="center-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  function routeMarkerIcon(role){ return L.divIcon({ className: "", html: '<div class="route-pin ' + role + '"></div>', iconSize: [15, 15], iconAnchor: [7.5, 7.5] }); }

  // ---- State ----
  var state = {
    mode: "radius", unit: "km", speedMS: 0, speedUnit: "kt",
    radius: { center: L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]), radiusM: 100000 },
    route: { budgetM: 100000, points: [] }
  };
  var navData = [], navState = { enabled: false, loaded: false, loading: false, types: { VOR: true, NDB: true, DME: true } };

  // ---- Layers ----
  var radiusCircle = L.polygon([], { color: "#4f6df5", weight: 2, fillColor: "#4f6df5", fillOpacity: 0.12 });
  var radiusMarker = L.marker(state.radius.center, { icon: pinIcon, draggable: true });
  var routeLinesGroup = L.layerGroup();
  var routeMarkersGroup = L.layerGroup();
  var routeCircle = L.polygon([], { color: "#4f6df5", weight: 2, fillColor: "#4f6df5", fillOpacity: 0.12 });
  var navaidLayer = L.layerGroup();
  radiusMarker.on("drag", function (e) { state.radius.center = e.target.getLatLng(); renderRadius(); });

  // ---- DOM ----
  var $input = document.getElementById("radius-input"), $unit = document.getElementById("unit-select"), $slider = document.getElementById("radius-slider");
  var $speedInput = document.getElementById("speed-input"), $speedUnit = document.getElementById("speed-unit");
  var $radiusStats = document.getElementById("radius-stats"), $routeStats = document.getElementById("route-stats");
  var $crValue = document.getElementById("current-radius-value"), $crTime = document.getElementById("current-radius-time"), $readout = document.getElementById("coord-readout");
  var rcLabel = document.getElementById("rc-label"), radiusView = document.getElementById("radius-view"), routeView = document.getElementById("route-view");
  var segRadius = document.getElementById("mode-radius"), segRoute = document.getElementById("mode-route");
  var presetWrap = document.getElementById("presets"), $navStatus = document.getElementById("nav-status");

  function row(k, v) { return '<div class="stat-line"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }

  // ---- Accessors ----
  function routeUsedM() { var p = state.route.points, s = 0; for (var i = 0; i < p.length - 1; i++) s += haversineM(p[i], p[i+1]); return s; }
  function activeRadiusM() { return state.mode === "radius" ? state.radius.radiusM : state.route.budgetM; }
  function setActiveRadiusM(m) {
    if (state.mode === "radius") state.radius.radiusM = m;
    else state.route.budgetM = Math.max(m, routeUsedM());
  }
  function metersToSlider(m){ var t=(Math.log(m)-Math.log(SLIDER_MIN))/(Math.log(SLIDER_MAX)-Math.log(SLIDER_MIN)); return Math.max(0,Math.min(1000,Math.round(t*1000))); }
  function sliderToMeters(v){ return Math.exp(Math.log(SLIDER_MIN) + (v/1000)*(Math.log(SLIDER_MAX)-Math.log(SLIDER_MIN))); }
  function radiusToInputValue(m){ return state.unit === "h" ? (state.speedMS > 0 ? m / (state.speedMS * 3600) : 0) : m / UNITS[state.unit]; }
  function inputValueToRadius(v){ return state.unit === "h" ? v * state.speedMS * 3600 : v * UNITS[state.unit]; }

  function syncControls() {
    var m = activeRadiusM(), val = radiusToInputValue(m);
    if (state.unit === "h") $input.value = val < 10 ? val.toFixed(2) : val.toFixed(1);
    else $input.value = val < 10 ? val.toFixed(2) : val < 100 ? val.toFixed(1) : Math.round(val);
    $slider.value = metersToSlider(m);
    if ($unit.value !== state.unit) $unit.value = state.unit;
  }
  function setHourOption(present) {
    var opt = $unit.querySelector('option[value="h"]');
    if (present && !opt) { var o = document.createElement("option"); o.value = "h"; o.textContent = "h"; $unit.appendChild(o); }
    if (!present && opt) { opt.remove(); if (state.unit === "h") { state.unit = "km"; $unit.value = "km"; } }
  }
  function addPreset(label, valFn) {
    var b = document.createElement("button"); b.className = "preset"; b.textContent = label;
    b.onclick = function () { setActiveRadiusM(Math.min(SLIDER_MAX, valFn())); syncControls(); render(); };
    presetWrap.appendChild(b);
  }
  function rebuildPresets() {
    presetWrap.innerHTML = "";
    if (state.unit === "h") TIME_PRESETS.forEach(function (p) { addPreset(p[0], function () { return p[1] * state.speedMS * 3600; }); });
    else DIST_PRESETS.forEach(function (p) { addPreset(p[0], function () { return p[1]; }); });
  }

  // ---- Radius render ----
  function renderRadius() {
    radiusMarker.setLatLng(state.radius.center);
    radiusCircle.setLatLngs(geodesicRing(state.radius.center, state.radius.radiusM, 256));
    var rM = state.radius.radiusM, km = rM / 1000, area = capArea(rM) / 1e6;
    $radiusStats.innerHTML =
      row("Centre", fmtCoord(state.radius.center)) +
      row("Radius", fmt(km, km < 100 ? 1 : 0) + " km · " + fmt(rM / UNITS.mi, 0) + " mi · " + fmt(rM / UNITS.nmi, 0) + " nmi") +
      (state.speedMS > 0 ? row("Flight time", fmtTime(rM / state.speedMS)) : "") +
      row("Diameter", fmt(km * 2, km < 100 ? 1 : 0) + " km") +
      row("Cap area", fmt(area, 0) + " km²");
  }

  // ---- Route render ----
  function redrawRouteGeometry() {
    var pts = state.route.points, budget = state.route.budgetM, sp = state.speedMS;
    routeLinesGroup.clearLayers();
    var used = routeUsedM(), over = used > budget + EPS, color = over ? "#dc2626" : "#4f6df5";
    for (var i = 0; i < pts.length - 1; i++)
      routeLinesGroup.addLayer(L.polyline(geodesicLine(pts[i], pts[i+1]), { color: color, weight: 3, opacity: 0.9 }));

    var remaining = budget - used, rem = Math.max(0, remaining);
    if (pts.length >= 1 && remaining > EPS) {
      routeCircle.setStyle({ color: "#4f6df5", fillColor: "#4f6df5", opacity: 1, fillOpacity: 0.12 });
      routeCircle.setLatLngs(geodesicRing(pts[pts.length - 1], remaining, 256));
    } else routeCircle.setLatLngs([]);

    if (state.unit === "h" && sp > 0) {
      $crValue.textContent = fmtTime(rem / sp);
      $crValue.style.color = over ? "var(--danger)" : "";
      $crTime.textContent = "≈ " + fmt(rem / 1000, rem/1000 < 100 ? 1 : 0) + " km"; $crTime.style.display = "";
    } else {
      var fu = UNITS[state.unit] || 1000, uName = UNITS[state.unit] ? state.unit : "km", v = rem / fu;
      $crValue.textContent = fmt(v, v < 100 ? 2 : 0) + " " + uName;
      $crValue.style.color = over ? "var(--danger)" : "";
      if (sp > 0) { $crTime.textContent = "≈ " + fmtTime(rem / sp); $crTime.style.display = ""; }
      else $crTime.style.display = "none";
    }

    $routeStats.innerHTML =
      row("Budget", fmt(budget / 1000, budget/1000 < 100 ? 1 : 0) + " km") +
      row("Used", fmt(used / 1000, used/1000 < 100 ? 1 : 0) + " km") +
      row("Remaining", (over ? "over by " : "") + fmt(Math.abs(remaining) / 1000, 1) + " km") +
      (sp > 0 ? row("Time budget", fmtTime(budget / sp)) : "") +
      (sp > 0 ? row("Time used", fmtTime(used / sp)) : "") +
      row("Legs", Math.max(0, pts.length - 1)) +
      row("Start", pts.length ? fmtCoord(pts[0]) : "—");
  }

  function rebuildRouteMarkers() {
    routeMarkersGroup.clearLayers();
    var pts = state.route.points;
    pts.forEach(function (p, i) {
      var role = i === 0 ? "start" : (i === pts.length - 1 ? "last" : "mid");
      var mk = L.marker(p, { icon: routeMarkerIcon(role), draggable: true });
      mk.on("dragstart", function () { mk._origin = mk.getLatLng(); });
      mk.on("drag", function () { state.route.points[i] = mk.getLatLng(); redrawRouteGeometry(); });
      mk.on("dragend", function () {
        state.route.points[i] = mk.getLatLng();
        if (routeUsedM() > state.route.budgetM + EPS) {
          state.route.points[i] = mk._origin; mk.setLatLng(mk._origin);
          toast("Move cancelled — total route would exceed the budget");
        }
        redrawRouteGeometry();
      });
      routeMarkersGroup.addLayer(mk);
    });
  }

  function tryAddRoutePoint(latlng) {
    var pts = state.route.points;
    if (pts.length === 0) { pts.push(latlng); rebuildRouteMarkers(); redrawRouteGeometry(); return true; }
    var remaining = state.route.budgetM - routeUsedM();
    var d = haversineM(pts[pts.length - 1], latlng);
    if (d <= remaining + EPS) { pts.push(latlng); rebuildRouteMarkers(); redrawRouteGeometry(); return true; }
    flashCircleInvalid(); toast("Outside range — pick a closer point"); return false;
  }

  function flashCircleInvalid() {
    if (!routeCircle.getLatLngs().length) return;
    routeCircle.setStyle({ color: "#dc2626", fillColor: "#dc2626" });
    setTimeout(function () { routeCircle.setStyle({ color: "#4f6df5", fillColor: "#4f6df5" }); }, 450);
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
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
  function setNavStatus(msg) { $navStatus.textContent = msg; }

  function makeNavMarker(n) {
    var cls = n.cat === "VOR" ? "vor" : n.cat === "NDB" ? "ndb" : "dme";
    var icon = L.divIcon({ className: "", iconSize: [12, 12], iconAnchor: [6, 6],
      html: '<div class="navaid nav-' + cls + '"><span class="nav-sym"></span><span class="nav-id">' + escapeHtml(n.ident) + '</span></div>' });
    var mk = L.marker([n.lat, n.lng], { icon: icon });
    mk._nav = n;
    mk.bindPopup('<div class="nav-pop"><div class="nav-pop-id">' + escapeHtml(n.ident) + '<span>' + escapeHtml(n.type) + '</span></div>' +
      '<div class="nav-pop-name">' + escapeHtml(n.name) + '</div>' +
      '<div class="nav-pop-freq">' + fmtNavFreq(n.freq) + '</div>' +
      '<button class="nav-pop-btn">＋ Add to route</button></div>');
    return mk;
  }

  function renderNavaids() {
    navaidLayer.clearLayers();
    if (!navState.enabled) return;
    if (navState.loading) { setNavStatus("Loading navaid database…"); return; }
    if (!navState.loaded) return;
    if (map.getZoom() < MIN_NAV_ZOOM) { setNavStatus("Zoom in to show navaids (≥ z" + MIN_NAV_ZOOM + ")"); return; }
    var b = map.getBounds(), shown = 0, total = 0;
    for (var i = 0; i < navData.length; i++) {
      var n = navData[i];
      if (!navState.types[n.cat]) continue;
      if (!b.contains([n.lat, n.lng])) continue;
      total++;
      if (shown >= MAX_NAV) continue;
      navaidLayer.addLayer(makeNavMarker(n));
      shown++;
    }
    setNavStatus(total > MAX_NAV ? ("Showing " + shown + " of " + total + " in view — zoom in for the rest")
      : (shown ? ("Showing " + shown + " navaid" + (shown === 1 ? "" : "s")) : "No matching navaids in view"));
  }

  function ingestNavaids(rows) {
    navData = [];
    rows.forEach(function (r) {
      var cat = navCategory(r.type || ""); if (!cat) return;
      var lat = parseFloat(r.latitude_deg), lng = parseFloat(r.longitude_deg);
      if (isNaN(lat) || isNaN(lng)) return;
      navData.push({ ident: r.ident || "?", name: r.name || "", type: r.type || "", freq: parseFloat(r.frequency_khz), lat: lat, lng: lng, cat: cat });
    });
    navState.loaded = true; navState.loading = false;
    renderNavaids();
  }

  function loadNavaids() {
    if (navState.loading || navState.loaded) { renderNavaids(); return; }
    if (typeof Papa === "undefined") { setNavStatus("CSV parser unavailable."); return; }
    navState.loading = true; setNavStatus("Loading navaid database…");
    var done = false;
    var guard = setTimeout(function () { if (!done && !navState.loaded) { navState.loading = false; setNavStatus("Navaid data blocked or slow — the sandbox may be preventing the download."); } }, 20000);
    try {
      Papa.parse(NAV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: function (res) { done = true; clearTimeout(guard); ingestNavaids(res.data || []); },
        error: function () { done = true; clearTimeout(guard); navState.loading = false; setNavStatus("Could not load navaid data (blocked or offline)."); }
      });
    } catch (e) { clearTimeout(guard); navState.loading = false; setNavStatus("Could not start navaid download."); }
  }

  function render() { if (state.mode === "radius") renderRadius(); else redrawRouteGeometry(); }

  function setMode(m) {
    state.mode = m;
    if (m === "radius") {
      map.addLayer(radiusCircle); map.addLayer(radiusMarker);
      map.removeLayer(routeCircle); map.removeLayer(routeLinesGroup); map.removeLayer(routeMarkersGroup);
      rcLabel.textContent = "Radius"; radiusView.style.display = ""; routeView.style.display = "none";
      segRadius.classList.add("active"); segRoute.classList.remove("active");
      syncControls(); renderRadius();
    } else {
      map.removeLayer(radiusCircle); map.removeLayer(radiusMarker);
      map.addLayer(routeCircle); map.addLayer(routeLinesGroup); map.addLayer(routeMarkersGroup);
      rcLabel.textContent = "Budget (total range)"; radiusView.style.display = "none"; routeView.style.display = "";
      segRoute.classList.add("active"); segRadius.classList.remove("active");
      syncControls(); rebuildRouteMarkers(); redrawRouteGeometry();
    }
    if (navState.enabled) map.addLayer(navaidLayer); // keep navaids above on top
  }

  function applySpeedChange() {
    var raw = parseFloat($speedInput.value);
    var newSpeed = (!isNaN(raw) && raw > 0) ? raw * SPEED_UNITS[state.speedUnit] : 0;
    if (state.unit === "h" && state.speedMS > 0 && newSpeed > 0) {
      var hours = activeRadiusM() / (state.speedMS * 3600);
      state.speedMS = newSpeed;
      setActiveRadiusM(Math.min(SLIDER_MAX, hours * newSpeed * 3600));
    } else { state.speedMS = newSpeed; }
    setHourOption(newSpeed > 0);
    rebuildPresets(); syncControls(); render();
  }

  // ---- Events ----
  $input.addEventListener("input", function () {
    var v = parseFloat($input.value);
    if (!isNaN(v) && v > 0) { setActiveRadiusM(Math.min(SLIDER_MAX, inputValueToRadius(v))); $slider.value = metersToSlider(activeRadiusM()); render(); }
  });
  $input.addEventListener("change", syncControls);
  $slider.addEventListener("input", function () { setActiveRadiusM(sliderToMeters(parseFloat($slider.value))); syncControls(); render(); });
  $unit.addEventListener("change", function () { state.unit = $unit.value; rebuildPresets(); syncControls(); render(); });
  $speedInput.addEventListener("input", applySpeedChange);
  $speedUnit.addEventListener("change", function () { state.speedUnit = $speedUnit.value; applySpeedChange(); });

  segRadius.onclick = function () { setMode("radius"); };
  segRoute.onclick = function () { setMode("route"); };

  document.getElementById("undo-btn").onclick = function () {
    if (state.route.points.length) { state.route.points.pop(); rebuildRouteMarkers(); redrawRouteGeometry(); }
  };
  document.getElementById("clear-btn").onclick = function () { state.route.points = []; rebuildRouteMarkers(); redrawRouteGeometry(); };

  // Navaid controls
  document.getElementById("nav-enable").addEventListener("change", function () {
    navState.enabled = this.checked;
    if (navState.enabled) { map.addLayer(navaidLayer); if (!navState.loaded && !navState.loading) loadNavaids(); else renderNavaids(); }
    else { map.removeLayer(navaidLayer); setNavStatus("Navaids hidden."); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("#nav-types .chip"), function (chip) {
    chip.addEventListener("click", function () {
      var cat = chip.getAttribute("data-cat");
      navState.types[cat] = !navState.types[cat];
      chip.classList.toggle("active", navState.types[cat]);
      if (navState.enabled) renderNavaids();
    });
  });

  // Add-to-route from navaid popup
  map.on("popupopen", function (e) {
    var node = e.popup._contentNode, src = e.popup._source;
    if (!node || !src || !src._nav) return;
    var btn = node.querySelector(".nav-pop-btn");
    if (!btn) return;
    btn.onclick = function () {
      if (state.mode !== "route") { toast("Switch to Route mode to add points"); return; }
      var ok = tryAddRoutePoint(L.latLng(src._nav.lat, src._nav.lng));
      if (ok) { map.closePopup(); toast("Added " + src._nav.ident + " to route"); }
    };
  });

  map.on("click", function (e) {
    if (state.mode === "radius") { state.radius.center = e.latlng; renderRadius(); }
    else tryAddRoutePoint(e.latlng);
  });
  map.on("mousemove", function (e) { $readout.textContent = fmtCoord(e.latlng) + "  ·  z" + map.getZoom(); });
  map.on("mouseout", function () { $readout.textContent = "—"; });
  map.on("moveend zoomend", function () { if (navState.enabled) renderNavaids(); });

  document.getElementById("reset").onclick = function () {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    if (state.mode === "radius") { state.radius.center = L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]); renderRadius(); }
  };

  var panel = document.getElementById("panel");
  document.getElementById("collapse-btn").onclick = function () {
    panel.classList.toggle("collapsed");
    this.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  };

  // ---- Init ----
  rebuildPresets();
  setMode("radius");
  setTimeout(function () { map.invalidateSize(); }, 80);
})();
</script>
