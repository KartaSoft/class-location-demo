/* Class location map. Plain JavaScript on MapLibre GL JS 5. The files in data/ are
   loaded when a layer or the panel needs them. Every number shown is read from those
   files or computed from them in the browser (the sliding mile under the cursor, the
   watch list order, the changes of the slider year). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ constants

  const DATA = 'data/';
  const MILE = 5280;
  const YEAR_MIN = 2006;
  const YEAR_MAX = 2026;
  const HORIZONS = [1, 2, 3, 5];
  const DISPLAYS = ['exp', 'cexp', 'cp90', 'pinc'];
  const CLASS_COLOR = {1: '#35b04a', 2: '#f5a623', 3: '#e0301e', 4: '#8e44ad'};
  const FONT = ['Noto Sans Bold'];
  const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
  const STREET_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const USGS_TILES = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
  const USGS_ATTR = '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank" rel="noopener">USGS The National Map</a> orthoimagery (public domain)';
  const DATA_ATTR = 'Line: Texas RRC public pipeline data. Buildings: USA Structures (ORNL, FEMA) and Overture Maps Foundation, (c) <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL). Parcels: appraisal districts. Pipe attributes synthetic.';
  const REACH_BOUNDS = [[-97.38, 32.97], [-96.54, 33.43]];
  const MAX_BOUNDS = [[-98.6, 32.3], [-95.4, 34.1]];
  const EMPTY = {type: 'FeatureCollection', features: []};

  // Building categories: counted buildings by occupancy, then the ones that are not counted.
  const BLD = {
    sf: {sat: '#2fd5f5', street: '#0e7490', label: 'Single family'},
    mf: {sat: '#ff6ec7', street: '#be185d', label: 'Multifamily, units labeled from zoom 16'},
    com: {sat: '#ffe14d', street: '#a16207', label: 'Commercial or industrial'},
    inst: {sat: '#ffffff', street: '#1f2937', label: 'Institutional'},
    asm: {sat: '#ff8a1f', street: '#c2410c', label: 'Assembly candidate (school, church, day care)'},
    excl: {sat: '#c9c9c9', street: '#8a8a8a', label: 'Not occupied (barn, shed, utility)'},
    sec: {sat: '#8e8e8e', street: '#5c5c5c', label: 'Secondary building on a lot, not counted'},
    out: {sat: 'rgba(255,255,255,0.6)', street: '#a9b1ba', label: 'Outside the 220-yard corridor'}
  };
  const BLD_ORDER = ['sf', 'mf', 'com', 'inst', 'asm', 'excl', 'sec', 'out'];
  const COM_CLASSES = new Set(['commercial', 'industrial']);
  const INST_CLASSES = new Set(['education', 'government', 'institutional', 'assembly']);

  // Parcel year built by decade (cividis, kept away from the class colors).
  const DECADES = [
    ['pre', 'Before 1960', '#00224e'], ['1960', '1960s', '#233e6c'], ['1970', '1970s', '#4c546c'],
    ['1980', '1980s', '#6b6b70'], ['1990', '1990s', '#8a8678'], ['2000', '2000s', '#aba274'],
    ['2010', '2010s', '#cfc063'], ['2020', '2020s', '#fee838']
  ];

  // US Census Bureau 2024 Gazetteer, internal points of the incorporated places.
  const CITIES = [
    ['Justin', -97.314234, 33.081837], ['Ponder', -97.296467, 33.171716],
    ['Krum', -97.224939, 33.265033], ['Sanger', -97.165412, 33.382098],
    ['Aubrey', -96.979088, 33.30855], ['Pilot Point', -96.955528, 33.398264],
    ['Celina', -96.798821, 33.32296], ['Weston', -96.665863, 33.330038],
    ['Anna', -96.553452, 33.348167], ['Van Alstyne', -96.583202, 33.421688]
  ];

  const BOOKMARKS = [
    {name: 'Justin', center: [-97.3197, 33.0819], zoom: 13.2},
    {name: 'Aubrey', center: [-96.9815, 33.3105], zoom: 14},
    {name: 'Celina', center: [-96.8182, 33.3391], zoom: 14.6},
    {name: 'Anna', center: [-96.5935, 33.4003], zoom: 13.8},
    {name: 'Church, MP 40.8', center: [-96.98568, 33.31198], zoom: 17, layers: ['bld']},
    {name: 'Farmstead conflict, MP 25.1', center: [-97.23899, 33.29191], zoom: 17.2, layers: ['bld', 'conf']}
  ];

  const COUNTY = {'121': 'Denton', '085': 'Collin', '181': 'Grayson', '439': 'Tarrant'};
  const CODE_TEXT = {
    A: 'single-family residence', B: 'multifamily', C: 'vacant lot', D: 'farm or ranch land',
    E: 'rural land with a home', F: 'commercial or industrial', J: 'utility', L: 'business personal property',
    M: 'mobile home', O: 'residential inventory', X: 'exempt'
  };
  const OCC_TEXT = {
    residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
    education: 'Education (school)', government: 'Government', institutional: 'Institutional (exempt parcel)',
    assembly: 'Assembly', agriculture: 'Agriculture (barn or farm building)',
    agriculture_residence: 'Farm residence (the largest building on a residential parcel)',
    utility_misc: 'Utility or miscellaneous structure',
    utility_misc_residence: 'Residence on a parcel classed as utility',
    unclassified: 'Unclassified footprint on a residential or commercial parcel',
    unclassified_excluded: 'Unclassified footprint, excluded (mostly barns on farm parcels)',
    outbuilding: 'Outbuilding (garage or shed)',
    secondary_single_family: 'Secondary building on a single-family lot (garage, shed or guest house)'
  };
  const SOURCE_TEXT = {
    usa_structures: 'USA Structures footprint (ORNL and FEMA)',
    overture: 'Overture Maps building, missing from USA Structures',
    parcel_synthetic: 'Synthetic parcel square: an improved parcel without a footprint, drawn as a 40 by 40 ft square at its address point'
  };
  const FLAG_TEXT = {
    secondary: 'secondary building on a single-family lot',
    assembly_candidate: 'assembly candidate for the 100-yard rule (192.5(b)(3)(ii))',
    centerline_conflict: 'within 25 ft of the public centerline, so the line position is off here',
    year_estimated: 'estimated year built',
    units_estimated: 'dwelling units estimated from the living area',
    synthetic_square: 'synthetic parcel square, position approximate'
  };
  const BASIS_TEXT = {
    count: 'Building count in the sliding mile, ending 220 yards beyond the outermost building of the cluster',
    none: 'No mile containing it reaches 11 buildings inside the cluster boundary',
    assembly: '100-yard rule: an assembly candidate within 300 ft (192.5(b)(3)(ii)), pending confirmation',
    'assembly+count': 'Building count, and the 100-yard rule for an assembly candidate within 300 ft'
  };
  const PLAT_DATE_TEXT = {
    dateappr: 'recorded approval date', datefile: 'recorded filing date', FILE_DATE: 'recorded filing date'
  };

  const LAYER_KEYS = ['class', 'chg', 'watch', 'area', 'bld', 'par', 'plat', 'perm', 'pred', 'cons', 'sens',
    'conf', 'city', 'mp'];
  // Consequence on the synthetic pipe: outcome colors (DECISIONS 1.39)
  const CONS_COLOR = {none: '#9aa5b1', confirm: '#2e9e4f', reduce: '#d7261c'};
  const CONS_LABEL = {none: 'No action, MAOP commensurate', confirm: 'Confirm MAOP by the 2006 test',
    reduce: 'Reduce MAOP, retest, replace or the alternative'};
  const DEFAULT_ON = ['class', 'chg', 'area', 'bld', 'city', 'mp'];
  const BASES = {sat: 'Satellite (USGS)', street: 'Streets (OpenFreeMap)'};
  const ESRI = {enabled: false, key: null, style: null, font: null}; // filled from data/site_config.json
  const BLD_ZOOM = 11.5; // the buildings file loads once the map is this close and the layer is on

  // ------------------------------------------------------------------ state

  const S = {
    year: YEAR_MAX, horizon: 5, display: 'exp', base: 'sat',
    layers: Object.fromEntries(LAYER_KEYS.map(function (k) { return [k, DEFAULT_ON.includes(k)]; }))
  };

  let map = null;
  let MANIFEST = null;
  let CL = null;        // centerline.json: stations every 50 ft with the corridor edges
  let CBY = null;       // class_by_year.json
  let CNT = null;       // counts_by_year.json: counted buildings and units per year
  let WC = null;        // window_counts.json
  let SENS = null;      // class_sensitivity features
  let COUNTED = null;   // counted buildings in the corridor: year, station interval, units
  let CHG = null;       // change_markers features
  let CONS = null;      // consequence_synthetic.json: pipe, miles by outcome per year, changes
  let LOTS = null;      // predicted lots: centroid and probability by horizon

  const SRC = {};       // GeoJSON of every overlay source, kept for basemap switches
  const IDX = {
    seg: new Map(), segF: new Map(), bld: new Map(), chg: new Map(), chgF: new Map(), watch: new Map(),
    watchF: new Map(), lots: new Map(), sens: new Map(), conf: new Map(), par: new Map(), plat: new Map(),
    perm: new Map(), pseg: {}, cons: new Map(), consChg: new Map()
  };
  const CLASS_FC = {};
  const SOURCE_IDS = ['cl-par', 'cl-plat', 'cl-corr', 'cl-lots', 'cl-lotpts', 'cl-bld', 'cl-win', 'cl-watch',
    'cl-seg', 'cl-cons', 'cl-hlseg', 'cl-margin', 'cl-class', 'cl-pseg', 'cl-sens', 'cl-hl', 'cl-chg', 'cl-perm',
    'cl-confpoly', 'cl-confpt', 'cl-mp', 'cl-city', 'cl-jump'];

  // ------------------------------------------------------------------ formatting

  function num(v, d) {
    return Number(v).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
  }
  function int(v) { return num(Math.round(Number(v)), 0); }
  function f1(v) { return num(v, 1); }
  function f2(v) { return num(v, 2); }
  function pct(v) { return Math.round(Number(v) * 100) + '%'; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }
  function tr(k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; }
  function dl(k, v) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }
  function plural(n, one, many) { return int(n) + ' ' + (Math.round(n) === 1 ? one : many); }
  function mpOf(station) { return (station - (CL ? CL.milepost_origin_ft : MILE)) / MILE; }
  function mpRange(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return 'MP ' + f2(lo) + ' to ' + f2(hi);
  }
  function classOfCount(n) { return n <= 10 ? 1 : (n < 46 ? 2 : 3); }
  function badge(c) { return '<span class="badge c' + c + '">Class ' + c + '</span>'; }
  function pill(c) { return '<span class="pill c' + c + '">' + c + '</span>'; }
  function sw(cls, style) { return '<i class="sw ' + cls + '"' + (style ? ' style="' + style + '"' : '') + '></i>'; }
  const CLOSE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="2"/></svg>';

  // ------------------------------------------------------------------ loading

  const cache = {};
  const inflight = {};
  const loadingLabels = new Map();
  const once = {};

  function showLoading() {
    const el = document.getElementById('loading');
    if (el.classList.contains('error')) return;
    if (loadingLabels.size === 0) { el.hidden = true; return; }
    document.getElementById('loading-text').textContent = 'Loading ' + Array.from(loadingLabels.keys()).join(', ');
    el.hidden = false;
  }

  function showError(msg) {
    const el = document.getElementById('loading');
    el.classList.add('error');
    document.getElementById('loading-text').textContent = msg;
    el.hidden = false;
    clearTimeout(showError.timer);
    showError.timer = setTimeout(function () { el.classList.remove('error'); showLoading(); }, 9000);
  }

  function fileLabel(name, what) {
    const bytes = MANIFEST && MANIFEST.files ? MANIFEST.files[name] : null;
    if (!bytes) return what;
    return what + ' (' + (bytes >= 1e6 ? f1(bytes / 1e6) + ' MB' : int(bytes / 1e3) + ' kB') + ')';
  }

  function getJSON(name, what) {
    if (cache[name]) return Promise.resolve(cache[name]);
    if (inflight[name]) return inflight[name];
    const label = fileLabel(name, what || name);
    loadingLabels.set(label, true);
    showLoading();
    const p = fetch(DATA + name).then(function (r) {
      if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      cache[name] = d;
      return d;
    }).finally(function () {
      loadingLabels.delete(label);
      delete inflight[name];
      showLoading();
    });
    inflight[name] = p;
    return p;
  }

  // Runs a loader once. A failure is reported and can be retried later.
  function loadOnce(key, what, fn) {
    if (!once[key]) {
      once[key] = fn().catch(function (err) {
        console.warn('Could not load ' + what + ':', err && err.message ? err.message : err);
        showError('Could not load ' + what + '. Check the connection and try again.');
        delete once[key];
        return null;
      });
    }
    return once[key];
  }

  function setSrc(id, data) {
    SRC[id] = data;
    const s = map ? map.getSource(id) : null;
    if (s) s.setData(data);
  }

  function fc(features) { return {type: 'FeatureCollection', features: features}; }

  // ------------------------------------------------------------------ centerline geometry

  function stIndex(s) {
    const st = CL.station;
    let lo = 0;
    let hi = st.length - 1;
    if (s <= st[0]) return 0;
    if (s >= st[hi]) return hi - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (st[mid] <= s) lo = mid; else hi = mid;
    }
    return lo;
  }

  function lerpAt(s, xs, ys) {
    const i = stIndex(s);
    const st = CL.station;
    const t = st[i + 1] > st[i] ? Math.max(0, Math.min(1, (s - st[i]) / (st[i + 1] - st[i]))) : 0;
    return [xs[i] + (xs[i + 1] - xs[i]) * t, ys[i] + (ys[i + 1] - ys[i]) * t];
  }

  function pointAt(s) { return lerpAt(s, CL.lon, CL.lat); }

  function arrays(side) {
    if (side === 'left') return [CL.left_lon, CL.left_lat];
    if (side === 'right') return [CL.right_lon, CL.right_lat];
    return [CL.lon, CL.lat];
  }

  function pathBetween(a, b, side) {
    const xy = arrays(side);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const st = CL.station;
    const out = [lerpAt(lo, xy[0], xy[1])];
    for (let i = stIndex(lo) + 1; i < st.length && st[i] < hi; i++) {
      if (st[i] > lo) out.push([xy[0][i], xy[1][i]]);
    }
    out.push(lerpAt(hi, xy[0], xy[1]));
    return out;
  }

  // Station of the point of the centerline nearest to a position.
  function stationAt(lng, lat) {
    const k = Math.cos(lat * Math.PI / 180);
    const X = CL.lon;
    const Y = CL.lat;
    const st = CL.station;
    let best = Infinity;
    let bi = 0;
    for (let i = 0; i < X.length; i++) {
      const dx = (X[i] - lng) * k;
      const dy = Y[i] - lat;
      const d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    let bs = st[bi];
    let bd = best;
    for (let j = bi - 1; j <= bi; j++) {
      if (j < 0 || j + 1 >= X.length) continue;
      const ax = X[j] * k;
      const ay = Y[j];
      const vx = X[j + 1] * k - ax;
      const vy = Y[j + 1] - ay;
      const L2 = vx * vx + vy * vy;
      if (!L2) continue;
      let t = ((lng * k - ax) * vx + (lat - ay) * vy) / L2;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + vx * t;
      const qy = ay + vy * t;
      const d = (lng * k - qx) * (lng * k - qx) + (lat - qy) * (lat - qy);
      if (d <= bd) { bd = d; bs = st[j] + (st[j + 1] - st[j]) * t; }
    }
    return bs;
  }

  function classFC(year) {
    if (!CLASS_FC[year]) {
      const runs = CBY.classes[String(year)] || [];
      CLASS_FC[year] = fc(runs.map(function (r) {
        return {type: 'Feature', properties: {c: r[2], a: r[0], b: r[1]},
          geometry: {type: 'LineString', coordinates: pathBetween(r[0], r[1])}};
      }));
    }
    return CLASS_FC[year];
  }

  function marginFC() {
    const r0 = CL.report_range_ft[0];
    const r1 = CL.report_range_ft[1];
    return fc([[0, r0], [r1, CL.length_ft]].map(function (ab) {
      return {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: pathBetween(ab[0], ab[1])}};
    }));
  }

  function milepostFC() {
    const r0 = CL.report_range_ft[0];
    const r1 = CL.report_range_ft[1];
    const feats = [];
    for (let k = 0; r0 + k * MILE <= r1 + 1; k++) {
      feats.push({type: 'Feature', properties: {label: 'MP ' + k, major: k % 5 === 0},
        geometry: {type: 'Point', coordinates: pointAt(r0 + k * MILE)}});
    }
    return fc(feats);
  }

  function cityFC() {
    return fc(CITIES.map(function (c) {
      return {type: 'Feature', properties: {name: c[0]}, geometry: {type: 'Point', coordinates: [c[1], c[2]]}};
    }));
  }

  function windowAt(s) {
    const w0 = Math.max(0, Math.min(CL.length_ft - MILE, s - MILE / 2));
    return [w0, w0 + MILE];
  }

  function segCross(a, b, c, d) {
    const rx = b[0] - a[0];
    const ry = b[1] - a[1];
    const sx = d[0] - c[0];
    const sy = d[1] - c[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-20) return null;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + t * rx, a[1] + t * ry] : null;
  }

  // An edge 660 ft off the centerline folds over itself on the inside of a sharp bend.
  // Cut every such loop at its crossing so the window outline stays a simple polygon.
  function removeLoops(pts) {
    const out = [];
    pts.forEach(function (p) {
      out.push(p);
      const n = out.length;
      if (n < 4) return;
      const a = out[n - 2];
      for (let i = n - 3; i >= 1; i--) {
        const x = segCross(out[i - 1], out[i], a, p);
        if (x) { out.splice(i, n - i, x, p); break; }
      }
    });
    return out;
  }

  function windowFeature(w0, w1) {
    const left = removeLoops(pathBetween(w0, w1, 'left'));
    const right = removeLoops(pathBetween(w0, w1, 'right'));
    const ring = left.concat(right.reverse());
    ring.push(ring[0]);
    return fc([{type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [ring]}}]);
  }

  function unitsAt(year, w) {
    const P = WC ? WC.pieces[String(year)] : null;
    if (!P) return null;
    const a = P.start_from;
    let lo = 0;
    let hi = a.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (a[mid] <= w) lo = mid; else hi = mid - 1;
    }
    return P.count[lo];
  }

  function buildingsIn(year, w0, w1) {
    if (!COUNTED) return null;
    let n = 0;
    let u = 0;
    for (const c of COUNTED) {
      if (c.y <= year && c.a <= w1 && c.b >= w0) { n++; u += c.u; }
    }
    return {n: n, u: u};
  }

  // ------------------------------------------------------------------ data loaders

  function loadBase() {
    return loadOnce('base', 'the centerline', function () {
      return Promise.all([
        window.Site.manifest().then(function (m) { MANIFEST = m; return m; }).catch(function () { return null; }),
        getJSON('centerline.json', 'centerline'),
        getJSON('class_by_year.json', 'class by year'),
        getJSON('counts_by_year.json', 'counts by year'),
        getJSON('consequence_synthetic.json', 'consequence on the synthetic pipe')
      ]).then(function (r) {
        CL = r[1];
        CBY = r[2];
        CNT = r[3];
        CONS = r[4];
        (CONS.changes || []).forEach(function (c) {
          if (!IDX.consChg.has(c.change_id)) IDX.consChg.set(c.change_id, []);
          IDX.consChg.get(c.change_id).push(c);
        });
        renderChanges();
        setSrc('cl-class', classFC(S.year));
        setSrc('cl-margin', marginFC());
        setSrc('cl-mp', milepostFC());
        renderSummary();
        return true;
      });
    });
  }

  function loadSegments() {
    return loadOnce('seg', 'the class segments', function () {
      return getJSON('segments_2026.geojson', 'class segments').then(function (d) {
        d.features.forEach(function (f) {
          IDX.seg.set(f.properties.segment_id, f.properties);
          IDX.segF.set(f.properties.segment_id, f);
        });
        setSrc('cl-seg', d);
        return d;
      });
    });
  }

  function prepStructures(d) {
    const counted = [];
    for (const f of d.features) {
      const p = f.properties;
      const inCorr = p.station_min != null;
      const flags = p.flags ? p.flags.split(';') : [];
      let cat;
      if (flags.includes('assembly_candidate') && (p.counted || inCorr)) cat = 'asm';
      else if (p.occupancy_class === 'secondary_single_family') cat = 'sec';
      else if (p.counted) {
        if (p.units >= 2) cat = 'mf';
        else if (COM_CLASSES.has(p.occupancy_class)) cat = 'com';
        else if (INST_CLASSES.has(p.occupancy_class)) cat = 'inst';
        else cat = 'sf';
      } else cat = inCorr ? 'excl' : 'out';
      p.cat = cat;
      p.y = p.year_built == null ? 0 : p.year_built;
      p.sq = p.source === 'parcel_synthetic' ? 1 : 0;
      IDX.bld.set(p.id, f);
      if (p.counted && inCorr) counted.push({y: p.y, a: p.station_min, b: p.station_max, u: p.units});
    }
    COUNTED = counted;
  }

  function loadStructures() {
    return loadOnce('bld', 'the buildings', function () {
      return Promise.all([loadBase(), getJSON('structures.geojson', 'buildings')]).then(function (r) {
        if (!CL) throw new Error('centerline missing');
        prepStructures(r[1]);
        setSrc('cl-bld', r[1]);
        if (recordRender) recordRender();
        return r[1];
      });
    });
  }

  // The buildings file is the largest one. It loads when the buildings layer is on and the
  // map is close enough to draw them, or when a record or the sliding mile needs the counts.
  function structuresWhenClose() {
    if (map && S.layers.bld && !once.bld && map.getZoom() >= BLD_ZOOM) loadStructures();
  }

  function loadChanges() {
    return loadOnce('chg', 'the class changes', function () {
      return getJSON('change_markers.geojson', 'class changes').then(function (d) {
        CHG = d.features;
        d.features.forEach(function (f) { IDX.chg.set(f.properties.change_id, f.properties); IDX.chgF.set(f.properties.change_id, f); });
        setSrc('cl-chg', d);
        renderSummary();
        renderChanges();
        return d;
      });
    });
  }

  function loadCons() {
    return loadOnce('cons', 'the consequence layer', function () {
      return getJSON('consequence_synthetic.geojson', 'consequence (synthetic pipe)').then(function (d) {
        d.features.forEach(function (f) {
          const p = f.properties;
          if (!IDX.cons.has(p.segment_id)) IDX.cons.set(p.segment_id, []);
          IDX.cons.get(p.segment_id).push(p);
        });
        setSrc('cl-cons', d);
        if (recordRender) recordRender();
        return d;
      });
    });
  }

  function loadCorridor() {
    return loadOnce('corr', 'the corridor', function () {
      return getJSON('corridor.geojson', 'corridor').then(function (d) { setSrc('cl-corr', d); return d; });
    });
  }

  function loadWindows() {
    return loadOnce('wc', 'the window counts', function () {
      return getJSON('window_counts.json', 'window counts').then(function (d) { WC = d; return d; });
    });
  }

  function loadWatch() {
    return loadOnce('watch', 'the watch list', function () {
      return getJSON('near_threshold.geojson', 'watch list').then(function (d) {
        d.features.forEach(function (f) { IDX.watch.set(f.properties.stretch_id, f.properties); IDX.watchF.set(f.properties.stretch_id, f); });
        setSrc('cl-watch', d);
        renderWatch();
        return d;
      });
    });
  }

  function decadeOf(y) {
    if (y == null) return 'none';
    if (y < 1960) return 'pre';
    return String(Math.min(2020, Math.floor(y / 10) * 10));
  }

  function loadParcels() {
    return loadOnce('par', 'the parcels', function () {
      return getJSON('parcels.geojson', 'parcels').then(function (d) {
        d.features.forEach(function (f) {
          f.properties.dec = decadeOf(f.properties.year_built);
          IDX.par.set(f.properties.parcel_id, f.properties);
        });
        setSrc('cl-par', d);
        return d;
      });
    });
  }

  function loadPlats() {
    return loadOnce('plat', 'the plats', function () {
      return getJSON('plats.geojson', 'plats').then(function (d) {
        d.features.forEach(function (f) {
          const p = f.properties;
          p.year = p.plat_year == null ? null : Math.round(p.plat_year);
          p.label = p.year == null ? 'no plat date' : String(p.year);
          IDX.plat.set(p.plat_id, p);
        });
        setSrc('cl-plat', d);
        return d;
      });
    });
  }

  function loadPermits() {
    return loadOnce('perm', 'the permits', function () {
      return getJSON('permits.geojson', 'permits').then(function (d) {
        d.features.forEach(function (f) { IDX.perm.set(f.properties.permit_id, f.properties); });
        setSrc('cl-perm', d);
        return d;
      });
    });
  }

  function ringCentroid(geom) {
    let ring = null;
    if (geom.type === 'Polygon') ring = geom.coordinates[0];
    else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0][0];
    if (!ring || !ring.length) return null;
    let x = 0;
    let y = 0;
    const n = ring.length > 1 ? ring.length - 1 : 1;
    for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1]; }
    return [x / n, y / n];
  }

  function loadLots() {
    return loadOnce('lots', 'the platted lots', function () {
      return getJSON('predicted_lots.geojson', 'platted lots').then(function (d) {
        const pts = [];
        LOTS = [];
        d.features.forEach(function (f) {
          const p = f.properties;
          IDX.lots.set(p.lot_id, p);
          const c = ringCentroid(f.geometry);
          if (!c) return;
          pts.push({type: 'Feature', properties: p, geometry: {type: 'Point', coordinates: c}});
          if (p.status === 'predicted') LOTS.push({x: c[0], y: c[1], p: {1: p.p_1, 2: p.p_2, 3: p.p_3, 5: p.p_5}});
        });
        setSrc('cl-lots', d);
        setSrc('cl-lotpts', fc(pts));
        return d;
      });
    });
  }

  function loadPredSegs(h) {
    return loadOnce('pseg' + h, 'the predicted classes', function () {
      return getJSON('predicted_segments_h' + h + '.geojson', 'predicted classes, ' + h + ' yr').then(function (d) {
        IDX.pseg[h] = new Map(d.features.map(function (f) { return [f.properties.segment_id, f.properties]; }));
        return d;
      });
    });
  }

  function loadSens() {
    return loadOnce('sens', 'the sensitivity runs', function () {
      return getJSON('class_sensitivity.geojson', 'centerline sensitivity').then(function (d) {
        SENS = d.features.map(function (f) { return f.properties; });
        d.features.forEach(function (f) { IDX.sens.set(f.properties.segment_id, f.properties); });
        setSrc('cl-sens', d);
        return d;
      });
    });
  }

  function loadConflicts() {
    return loadOnce('conf', 'the centerline conflicts', function () {
      return getJSON('centerline_conflicts.geojson', 'centerline conflicts').then(function (d) {
        const pts = [];
        d.features.forEach(function (f) {
          IDX.conf.set(f.properties.id, f.properties);
          const c = ringCentroid(f.geometry);
          if (c) pts.push({type: 'Feature', properties: f.properties, geometry: {type: 'Point', coordinates: c}});
        });
        setSrc('cl-confpoly', d);
        setSrc('cl-confpt', fc(pts));
        return d;
      });
    });
  }

  function ensure(key) {
    const loaders = {
      class: function () { return Promise.all([loadBase(), loadSegments()]); },
      chg: loadChanges,
      watch: loadWatch,
      area: function () { return Promise.all([loadBase(), loadCorridor(), loadSegments()]); },
      bld: function () { structuresWhenClose(); return Promise.resolve(true); },
      par: loadParcels,
      plat: loadPlats,
      perm: loadPermits,
      pred: function () {
        if (S.display === 'exp') return loadLots();
        const h = S.horizon;
        return loadPredSegs(h).then(function (d) { if (d && S.horizon === h) setSrc('cl-pseg', d); return d; });
      },
      cons: function () { return Promise.all([loadBase(), loadSegments(), loadCons()]); },
      sens: loadSens,
      conf: loadConflicts,
      city: function () { return Promise.resolve(true); },
      mp: loadBase
    };
    const row = document.querySelector('.lrow[data-key="' + key + '"]');
    if (row) row.classList.add('loading');
    return Promise.resolve(loaders[key] ? loaders[key]() : null).then(function (r) {
      if (row) row.classList.remove('loading');
      return r;
    });
  }

  // ------------------------------------------------------------------ map style and layers

  function satStyle() {
    return {
      version: 8,
      glyphs: GLYPHS,
      sources: {
        usgs: {type: 'raster', tiles: [USGS_TILES], tileSize: 256, maxzoom: 16, attribution: USGS_ATTR}
      },
      layers: [
        {id: 'background', type: 'background', paint: {'background-color': '#1f262e'}},
        {id: 'usgs-imagery', type: 'raster', source: 'usgs',
          paint: {'raster-brightness-max': 0.9, 'raster-saturation': -0.15}}
      ]
    };
  }

  // The OpenFreeMap styles compare properties that some features lack, for example
  // ["<=", ["get", "ref_length"], 6] on road shields, and MapLibre reports every such
  // feature in the console. A ["has", key] guard in front of the comparison draws the same
  // map without the warnings.
  function guardStyle(style) {
    const ops = ['<', '<=', '>', '>='];
    (style.layers || []).forEach(function (l) {
      const f = l.filter;
      if (!Array.isArray(f)) return;
      const parts = f[0] === 'all' ? f.slice(1) : [f];
      const keys = [];
      parts.forEach(function (e) {
        if (Array.isArray(e) && ops.includes(e[0]) && Array.isArray(e[1]) && e[1][0] === 'get' &&
            typeof e[1][1] === 'string' && typeof e[2] === 'number' && !keys.includes(e[1][1])) keys.push(e[1][1]);
      });
      if (keys.length) l.filter = ['all'].concat(keys.map(function (k) { return ['has', k]; }), parts);
    });
    return style;
  }

  let streetJSON = null;
  function streetStyle() {
    if (streetJSON) return Promise.resolve(JSON.parse(streetJSON));
    return fetch(STREET_STYLE).then(function (r) {
      if (!r.ok) throw new Error('streets style: HTTP ' + r.status);
      return r.json();
    }).then(function (st) {
      streetJSON = JSON.stringify(guardStyle(st));
      return JSON.parse(streetJSON);
    });
  }

  // Esri World Imagery through the ArcGIS basemap styles service (the key is written by
  // classloc site when ARCGIS_API_KEY is set, for a referrer-restricted public page). The
  // attribution comes with the style and is shown by the attribution control.
  let esriJSON = null;
  function esriStyle() {
    if (esriJSON) return Promise.resolve(JSON.parse(esriJSON));
    const url = ESRI.style + (ESRI.style.indexOf('?') < 0 ? '?' : '&') + 'token=' + encodeURIComponent(ESRI.key);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Esri imagery style: HTTP ' + r.status);
      return r.json();
    }).then(function (st) {
      if (!st || !st.sources || !st.layers) throw new Error('Esri imagery style: unexpected answer');
      ESRI.font = pickFont(st);
      esriJSON = JSON.stringify(st);
      return JSON.parse(esriJSON);
    });
  }

  // A bold font stack the style itself uses, so our labels resolve at its glyph endpoint.
  function pickFont(st) {
    let any = null;
    for (const l of st.layers || []) {
      const f = l.layout && l.layout['text-font'];
      if (Array.isArray(f) && typeof f[0] === 'string') {
        if (/bold/i.test(f[0])) return f[0];
        if (!any) any = f[0];
      }
    }
    return any;
  }

  function baseStyle() {
    if (S.base === 'esri') return esriStyle();
    return S.base === 'sat' ? Promise.resolve(satStyle()) : streetStyle();
  }

  function fallBackToSatellite(err) {
    console.warn('Basemap not loaded:', err && err.message ? err.message : err);
    showError('Could not load that basemap, showing the USGS satellite basemap.');
    S.base = 'sat';
    syncControls();
    renderLegends();
    scheduleHash();
    return satStyle();
  }

  function applyBase() {
    baseStyle().catch(fallBackToSatellite).then(function (st) { map.setStyle(st, {diff: false}); });
  }

  function blueScale(v) {
    return ['interpolate', ['linear'], v, 0, '#deebf7', 0.25, '#9ecae1', 0.5, '#4292c6', 0.75, '#2171b5', 1, '#08306b'];
  }

  function classColor(prop) {
    return ['match', ['get', prop], 1, CLASS_COLOR[1], 2, CLASS_COLOR[2], 3, CLASS_COLOR[3], 4, CLASS_COLOR[4], '#888888'];
  }

  function isSat() { return S.base !== 'street'; }
  function font() { return S.base === 'esri' && ESRI.font ? [ESRI.font] : FONT; }

  // Every overlay layer with its visibility, filter and paint for the current state.
  function specs() {
    const sat = isSat();
    const k = sat ? 'sat' : 'street';
    const on = S.layers;
    const yr = ['<=', ['get', 'y'], S.year];
    const ph = ['get', 'p_' + S.horizon];
    const catColor = ['match', ['get', 'cat']];
    BLD_ORDER.slice(0, -1).forEach(function (c) { catColor.push(c, BLD[c][k]); });
    catColor.push(BLD.out[k]);
    const decColor = ['match', ['get', 'dec']];
    DECADES.forEach(function (d) { decColor.push(d[0], d[2]); });
    decColor.push('rgba(0,0,0,0)');
    const pred = on.pred;
    const disp = S.display;
    const pClass = disp === 'cp90' ? 'p90_class' : 'expected_class';
    const pInc = disp === 'cp90' ? 'p90_increase' : 'expected_increase';
    const text = sat ? '#ffffff' : '#1b2531';
    const halo = sat ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
    const offRight = ['interpolate', ['linear'], ['zoom'], 8, 7, 16, 12];
    const thisYear = ['==', ['get', 'year'], S.year];
    return [
      {id: 'cl-par-fill', type: 'fill', source: 'cl-par', vis: on.par,
        paint: {'fill-color': decColor, 'fill-opacity': sat ? 0.5 : 0.55}},
      {id: 'cl-par-line', type: 'line', source: 'cl-par', vis: on.par, minzoom: 12,
        paint: {'line-color': sat ? 'rgba(255,255,255,0.5)' : 'rgba(60,72,85,0.5)', 'line-width': 0.6}},
      {id: 'cl-plat-fill', type: 'fill', source: 'cl-plat', vis: on.plat,
        paint: {'fill-color': '#ffffff', 'fill-opacity': 0}},
      {id: 'cl-plat-line', type: 'line', source: 'cl-plat', vis: on.plat,
        paint: {'line-color': sat ? '#ffffff' : '#334155', 'line-width': 1.6, 'line-dasharray': [3, 2]}},
      {id: 'cl-plat-label', type: 'symbol', source: 'cl-plat', vis: on.plat, minzoom: 12.5,
        layout: {'text-field': ['get', 'label'], 'text-font': font(), 'text-size': 11.5, 'text-padding': 4},
        paint: {'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.4}},
      {id: 'cl-corr-fill', type: 'fill', source: 'cl-corr', vis: on.area,
        paint: {'fill-color': sat ? '#ffffff' : '#1d5ea8', 'fill-opacity': sat ? 0.07 : 0.07}},
      {id: 'cl-corr-line', type: 'line', source: 'cl-corr', vis: on.area,
        paint: {'line-color': sat ? '#ffffff' : '#1d5ea8', 'line-width': 1.2, 'line-opacity': 0.85,
          'line-dasharray': [4, 3]}},
      {id: 'cl-lotpts', type: 'circle', source: 'cl-lotpts', vis: pred && disp === 'exp', maxzoom: 14,
        filter: ['>', ph, 0],
        paint: {'circle-color': blueScale(ph), 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.8, 13.9, 3.6],
          'circle-stroke-color': '#08306b', 'circle-stroke-width': 0.6}},
      {id: 'cl-lots-fill', type: 'fill', source: 'cl-lots', vis: pred && disp === 'exp', minzoom: 14,
        filter: ['==', ['get', 'status'], 'predicted'],
        paint: {'fill-color': blueScale(ph), 'fill-opacity': 0.85}},
      {id: 'cl-lots-line', type: 'line', source: 'cl-lots', vis: pred && disp === 'exp', minzoom: 14,
        paint: {'line-color': ['case', ['==', ['get', 'status'], 'predicted'], '#08306b', sat ? '#d0d5db' : '#7b8794'],
          'line-width': ['case', ['==', ['get', 'status'], 'predicted'], 0.8, 1.4]}},
      {id: 'cl-bld-fill', type: 'fill', source: 'cl-bld', vis: on.bld, minzoom: 12, filter: yr,
        paint: {'fill-color': catColor,
          'fill-opacity': sat ? ['match', ['get', 'cat'], ['excl', 'sec', 'out'], 0, 0.22]
            : ['match', ['get', 'cat'], 'out', 0.15, ['excl', 'sec'], 0.35, 0.65]}},
      {id: 'cl-bld-line', type: 'line', source: 'cl-bld', vis: on.bld, minzoom: 12,
        filter: ['all', yr, ['==', ['get', 'sq'], 0]],
        paint: {'line-color': catColor, 'line-width': ['match', ['get', 'cat'], 'out', 0.7, ['excl', 'sec'], 1.1, 1.7]}},
      {id: 'cl-bld-dash', type: 'line', source: 'cl-bld', vis: on.bld, minzoom: 12,
        filter: ['all', yr, ['==', ['get', 'sq'], 1]],
        paint: {'line-color': catColor, 'line-width': ['match', ['get', 'cat'], 'out', 0.9, 1.7],
          'line-dasharray': [2, 1.4]}},
      {id: 'cl-bld-units', type: 'symbol', source: 'cl-bld', vis: on.bld, minzoom: 15.5,
        filter: ['all', yr, ['==', ['get', 'cat'], 'mf']],
        layout: {'text-field': ['concat', ['to-string', ['get', 'units']], ' units'], 'text-font': font(),
          'text-size': 11},
        paint: {'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.4}},
      {id: 'cl-win-fill', type: 'fill', source: 'cl-win', vis: on.area,
        paint: {'fill-color': sat ? '#ffffff' : '#111827', 'fill-opacity': sat ? 0.16 : 0.08}},
      {id: 'cl-win-line', type: 'line', source: 'cl-win', vis: on.area,
        paint: {'line-color': sat ? '#ffffff' : '#111827', 'line-width': 2.2}},
      {id: 'cl-watch-halo', type: 'line', source: 'cl-watch', vis: on.watch,
        layout: {'line-cap': 'round', 'line-join': 'round'},
        paint: {'line-color': classColor('target_class'), 'line-opacity': 0.42, 'line-blur': 2,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 24]}},
      {id: 'cl-hlseg', type: 'line', source: 'cl-hlseg', vis: true,
        layout: {'line-cap': 'round', 'line-join': 'round'},
        paint: {'line-color': sat ? '#ffffff' : '#14213d', 'line-opacity': 0.75, 'line-blur': 2,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 14, 16, 22]}},
      {id: 'cl-margin', type: 'line', source: 'cl-margin', vis: on.class,
        paint: {'line-color': sat ? '#d4d9df' : '#7b8794', 'line-width': 2.5, 'line-dasharray': [2, 2]}},
      {id: 'cl-class-casing', type: 'line', source: 'cl-class', vis: on.class,
        layout: {'line-join': 'round'},
        paint: {'line-color': '#0b0f14', 'line-opacity': sat ? 0.6 : 0.35,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 12, 7.5, 16, 11]}},
      {id: 'cl-class-line', type: 'line', source: 'cl-class', vis: on.class,
        layout: {'line-join': 'round'},
        paint: {'line-color': classColor('c'), 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.6, 12, 4.8, 16, 7]}},
      {id: 'cl-cons-casing', type: 'line', source: 'cl-cons', vis: on.cons,
        layout: {'line-join': 'round'},
        paint: {'line-color': '#0b0f14', 'line-opacity': sat ? 0.6 : 0.35,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 7, 12, 8.5, 16, 12]}},
      {id: 'cl-cons-line', type: 'line', source: 'cl-cons', vis: on.cons,
        layout: {'line-join': 'round'},
        paint: {'line-color': ['match', ['get', 'outcome_code'], 'none', CONS_COLOR.none, 'confirm', CONS_COLOR.confirm,
          'reduce', CONS_COLOR.reduce, '#888888'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4.6, 12, 5.8, 16, 8]}},
      {id: 'cl-pending', type: 'line', source: 'cl-seg', vis: on.class && S.year === YEAR_MAX,
        filter: ['==', ['get', 'pending_confirmation'], true],
        paint: {'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 16, 3.5],
          'line-dasharray': [1, 1]}},
      {id: 'cl-pseg-class', type: 'line', source: 'cl-pseg', vis: pred && (disp === 'cexp' || disp === 'cp90'),
        paint: {'line-color': classColor(pClass), 'line-width': ['case', ['==', ['get', pInc], true], 5.5, 3],
          'line-offset': offRight, 'line-dasharray': [1.6, 1.1]}},
      {id: 'cl-pseg-prob', type: 'line', source: 'cl-pseg', vis: pred && disp === 'pinc',
        paint: {'line-color': ['case', ['>', ['get', 'p_increase'], 0], blueScale(['get', 'p_increase']),
          sat ? 'rgba(255,255,255,0.75)' : '#9aa5b1'],
        'line-width': ['case', ['>', ['get', 'p_increase'], 0], 6, 2], 'line-offset': offRight}},
      {id: 'cl-sens-cl', type: 'line', source: 'cl-sens', vis: on.sens,
        filter: ['==', ['get', 'centerline_sensitive'], true],
        paint: {'line-color': sat ? '#ffffff' : '#111827', 'line-width': 3.5, 'line-dasharray': [0.7, 1.3],
          'line-offset': ['interpolate', ['linear'], ['zoom'], 8, -7, 16, -12]}},
      {id: 'cl-sens-cnt', type: 'line', source: 'cl-sens', vis: on.sens,
        filter: ['==', ['get', 'counting_sensitive'], true],
        paint: {'line-color': sat ? '#fde047' : '#a16207', 'line-width': 3.5, 'line-dasharray': [2.2, 1.4],
          'line-offset': ['interpolate', ['linear'], ['zoom'], 8, -13, 16, -20]}},
      {id: 'cl-hit', type: 'line', source: 'cl-seg', vis: on.class || on.area || on.cons,
        paint: {'line-color': '#000000', 'line-opacity': 0, 'line-width': 20}},
      {id: 'cl-hl-casing', type: 'line', source: 'cl-hl', vis: true,
        paint: {'line-color': '#000000', 'line-width': 6, 'line-opacity': 0.75}},
      {id: 'cl-hl-line', type: 'line', source: 'cl-hl', vis: true,
        paint: {'line-color': '#ffffff', 'line-width': 3}},
      {id: 'cl-chg', type: 'circle', source: 'cl-chg', vis: on.chg, filter: ['<=', ['get', 'year'], S.year],
        paint: {'circle-color': classColor('to_class'),
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['case', thisYear, 8, 5], 14, ['case', thisYear, 11, 8]],
          'circle-stroke-color': sat ? '#ffffff' : '#14213d', 'circle-stroke-width': 2}},
      {id: 'cl-perm', type: 'circle', source: 'cl-perm', vis: on.perm,
        paint: {'circle-color': ['case', ['==', ['get', 'residential_new'], true], '#ffffff', '#b0b8c1'],
          'circle-stroke-color': ['case', ['==', ['get', 'residential_new'], true], '#0b4f8a', '#4a5561'],
          'circle-stroke-width': 1.5, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 15, 5.5]}},
      {id: 'cl-conf-poly', type: 'line', source: 'cl-confpoly', vis: on.conf, minzoom: 14,
        paint: {'line-color': '#ff2bd6', 'line-width': 2.2}},
      {id: 'cl-conf', type: 'circle', source: 'cl-confpt', vis: on.conf,
        paint: {'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 15], 'circle-color': 'rgba(255,43,214,0.12)',
          'circle-stroke-color': '#ff2bd6', 'circle-stroke-width': 3}},
      {id: 'cl-mp-dot', type: 'circle', source: 'cl-mp', vis: on.mp, filter: ['==', ['get', 'major'], true],
        paint: {'circle-radius': 3.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#0b0f14', 'circle-stroke-width': 1.5}},
      {id: 'cl-mp-dot-minor', type: 'circle', source: 'cl-mp', vis: on.mp, minzoom: 12,
        filter: ['==', ['get', 'major'], false],
        paint: {'circle-radius': 2.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#0b0f14', 'circle-stroke-width': 1.2}},
      {id: 'cl-mp-label', type: 'symbol', source: 'cl-mp', vis: on.mp, filter: ['==', ['get', 'major'], true],
        layout: {'text-field': ['get', 'label'], 'text-font': font(), 'text-size': 11.5, 'text-offset': [0, 0.9],
          'text-anchor': 'top', 'text-padding': 4},
        paint: {'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.5}},
      {id: 'cl-mp-label-minor', type: 'symbol', source: 'cl-mp', vis: on.mp, minzoom: 12,
        filter: ['==', ['get', 'major'], false],
        layout: {'text-field': ['get', 'label'], 'text-font': font(), 'text-size': 10.5, 'text-offset': [0, 0.9],
          'text-anchor': 'top', 'text-padding': 4},
        paint: {'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.4}},
      {id: 'cl-city', type: 'symbol', source: 'cl-city', vis: on.city && S.base === 'sat',
        layout: {'text-field': ['get', 'name'], 'text-font': font(), 'text-letter-spacing': 0.03, 'text-padding': 6,
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 13, 16]},
        paint: {'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.8}},
      {id: 'cl-jump', type: 'circle', source: 'cl-jump', vis: true,
        paint: {'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': '#0b0f14', 'circle-stroke-width': 3}},
      {id: 'cl-jump-label', type: 'symbol', source: 'cl-jump', vis: true,
        layout: {'text-field': ['get', 'label'], 'text-font': font(), 'text-size': 13, 'text-offset': [0, -1.3],
          'text-anchor': 'bottom', 'text-allow-overlap': true},
        paint: {'text-color': text, 'text-halo-color': halo, 'text-halo-width': 1.8}}
    ];
  }

  function addOverlay() {
    SOURCE_IDS.forEach(function (id) {
      if (!map.getSource(id)) map.addSource(id, {type: 'geojson', data: SRC[id] || EMPTY});
    });
    specs().forEach(function (sp) {
      if (map.getLayer(sp.id)) return;
      const layer = {id: sp.id, type: sp.type, source: sp.source,
        layout: Object.assign({}, sp.layout || {}, {visibility: sp.vis ? 'visible' : 'none'}),
        paint: sp.paint || {}};
      if (sp.filter) layer.filter = sp.filter;
      if (sp.minzoom != null) layer.minzoom = sp.minzoom;
      if (sp.maxzoom != null) layer.maxzoom = sp.maxzoom;
      map.addLayer(layer);
    });
  }

  function applyState() {
    if (!map) return;
    specs().forEach(function (sp) {
      if (!map.getLayer(sp.id)) return;
      map.setLayoutProperty(sp.id, 'visibility', sp.vis ? 'visible' : 'none');
      if (sp.filter) map.setFilter(sp.id, sp.filter);
      Object.keys(sp.paint || {}).forEach(function (key) { map.setPaintProperty(sp.id, key, sp.paint[key]); });
    });
  }

  // ------------------------------------------------------------------ panel: summary, layer list, lists

  function classMiles(year) {
    const m = {1: 0, 2: 0, 3: 0, 4: 0};
    (CBY.classes[String(year)] || []).forEach(function (r) { m[r[2]] += (r[1] - r[0]) / MILE; });
    return m;
  }

  function countsOf(year) {
    if (!CNT) return null;
    const i = CNT.years.indexOf(year);
    return i < 0 ? null : {n: CNT.counted_buildings[i], u: CNT.dwelling_units[i]};
  }

  function renderSummary() {
    const el = document.getElementById('summary');
    if (!CBY) { el.innerHTML = '<p class="note">Loading the class profile.</p>'; return; }
    const y = S.year;
    const m = classMiles(y);
    const total = m[1] + m[2] + m[3] + m[4];
    let h = '<div class="sum-bar" role="img" aria-label="Class miles in ' + y + '">';
    [1, 2, 3, 4].forEach(function (c) {
      if (m[c] > 0) h += '<span style="width:' + (100 * m[c] / total).toFixed(3) + '%;background:' + CLASS_COLOR[c] + '"></span>';
    });
    h += '</div><table class="sum-table"><tbody>';
    [1, 2, 3].forEach(function (c) {
      h += '<tr><td>' + sw('c' + c) + 'Class ' + c + '</td><td class="num">' + f2(m[c]) + ' mi</td></tr>';
    });
    h += '<tr><td>' + sw('c4') + 'Class 4</td><td class="num">' + (m[4] > 0 ? f2(m[4]) + ' mi' : 'none') + '</td></tr>';
    h += '</tbody></table><ul class="sum-lines">';
    const c = countsOf(y);
    if (c) h += '<li>Counted buildings <b>' + int(c.n) + '</b>, dwelling units <b>' + int(c.u) + '</b></li>';
    if (CHG) {
      const k = CHG.filter(function (f) { return f.properties.year <= y; }).length;
      const k1 = CHG.filter(function (f) { return f.properties.year === y; }).length;
      h += '<li>Class increases since 2006 <b>' + int(k) + '</b>' + (y > YEAR_MIN ? ', in ' + y + ' <b>' + int(k1) + '</b>' : '') + '</li>';
    }
    h += summaryExtra(y);
    h += '</ul>';
    el.innerHTML = h;
  }

  // Miles needing action on the synthetic pipe in the slider year (confirm or reduce).
  function summaryExtra(y) {
    const m = CONS && CONS.miles_by_outcome_by_year ? CONS.miles_by_outcome_by_year[String(y)] : null;
    if (!m) return '';
    return '<li>Miles needing action (synthetic pipe) <b>' + f2(m.needing_action) + '</b></li>';
  }

  function consPieces(map0, id) {
    const rows = map0.get(id);
    return rows && rows.length ? rows : null;
  }

  function outcomeOf(rows) {
    if (!rows) return null;
    const codes = rows.map(function (r) { return r.outcome_code; });
    const worst = codes.includes('reduce') ? 'reduce' : (codes.includes('confirm') ? 'confirm' : 'none');
    const r = rows.find(function (x) { return x.outcome_code === worst; });
    return {code: worst, text: r.outcome, row: r};
  }

  // The class changes of the slider year, one row each. A click flies to the marker.
  function renderChanges() {
    const sec = document.getElementById('changes-sec');
    const el = document.getElementById('changes');
    if (!CHG || !S.layers.chg) { sec.hidden = true; return; }
    const y = S.year;
    document.getElementById('h-changes').textContent = 'Changes in ' + y;
    const rows = CHG.filter(function (f) { return f.properties.year === y; })
      .sort(function (a, b) { return a.properties.mile_from - b.properties.mile_from; });
    sec.hidden = false;
    if (!rows.length) { el.innerHTML = '<p class="note">None.</p>'; return; }
    let h = '<table class="plist"><thead><tr><th>Milepost</th><th>Class</th><th>192.609 study</th><th>192.611(d) by</th></tr></thead><tbody>';
    rows.forEach(function (f) {
      const p = f.properties;
      h += '<tr data-id="' + p.change_id + '" tabindex="0"><td>' + f2(p.mile_from) + ' to ' + f2(p.mile_to) + '</td>' +
        '<td>' + pill(p.from_class) + ' to ' + pill(p.to_class) + '</td><td class="num">' + p.study_trigger_year + '</td>' +
        '<td class="num">' + p.maop_deadline + '</td></tr>' + changeExtraRow(p);
    });
    h += '</tbody></table>';
    el.innerHTML = h;
    el.querySelectorAll('tr[data-id]').forEach(function (row) {
      const go = function () { flyToChange(Number(row.getAttribute('data-id'))); };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    });
  }

  // A second row under a change: its outcome on the synthetic pipe.
  function changeExtraRow(p) {
    const o = outcomeOf(consPieces(IDX.consChg, p.change_id));
    if (!o) return '';
    return '<tr data-id="' + p.change_id + '" class="sub-row"><td colspan="4"><span class="mark" style="background:' +
      CONS_COLOR[o.code] + '"></span>' + esc(o.text) + ' (synthetic pipe)</td></tr>';
  }

  function flyToChange(id, opts) {
    const f = IDX.chgF.get(id);
    if (!f || !map) return;
    if (!S.layers.chg) setLayer('chg', true);
    if (S.year < f.properties.year) setYear(f.properties.year);
    const c = f.geometry.coordinates;
    const zoom = Math.max(map.getZoom(), 14);
    closePopup();
    map.once('moveend', function () { openPopup({layer: {id: 'cl-chg'}, properties: f.properties}, c); });
    map.flyTo({center: c, zoom: zoom, essential: true, duration: (opts && opts.duration) || 1400});
    if (window.innerWidth <= 760) setPanel(false);
  }

  // The watch list: stretches ordered by the chance of crossing at the chosen horizon,
  // the ones at zero at every horizon last. A click flies to the stretch.
  function renderWatch() {
    const sec = document.getElementById('watch-sec');
    const el = document.getElementById('watch');
    if (!IDX.watchF.size || !S.layers.watch) { sec.hidden = true; return; }
    const h0 = S.horizon;
    const rows = Array.from(IDX.watchF.values()).map(function (f) { return f.properties; });
    rows.sort(function (a, b) {
      const d = b['p_cross_h' + h0] - a['p_cross_h' + h0];
      if (d) return d;
      const e = b['expected_lots_h' + h0] - a['expected_lots_h' + h0];
      if (e) return e;
      return a.mile_from - b.mile_from;
    });
    sec.hidden = false;
    document.getElementById('h-watch').textContent = 'Watch list, ' + h0 + (h0 === 1 ? ' year' : ' years');
    let h = '<table class="plist"><thead><tr><th>Milepost</th><th>Class</th><th class="num">Count</th>' +
      '<th class="num">Expected</th><th class="num">Chance</th></tr></thead><tbody>';
    rows.forEach(function (p) {
      const pc = p['p_cross_h' + h0];
      h += '<tr data-id="' + p.stretch_id + '" tabindex="0"><td>' + f2(p.mile_from) + ' to ' + f2(p.mile_to) + '</td>' +
        '<td>' + pill(p.current_class) + ' to ' + pill(p.target_class) + '</td>' +
        '<td class="num">' + int(p.max_count) + '<span class="sub">' + int(p.margin) + ' short</span></td>' +
        '<td class="num">' + f1(p['expected_lots_h' + h0]) + '</td>' +
        '<td class="num">' + (pc > 0 ? pct(pc) : '0') + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
    el.querySelectorAll('tr[data-id]').forEach(function (row) {
      const go = function () { flyToStretch(Number(row.getAttribute('data-id'))); };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    });
  }

  function flyToStretch(id, opts) {
    const f = IDX.watchF.get(id);
    if (!f || !map) return;
    if (!S.layers.watch) setLayer('watch', true);
    const b = bboxOf([f]);
    const mid = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
    closePopup();
    map.once('moveend', function () { openPopup({layer: {id: 'cl-watch-halo'}, properties: f.properties}, mid); });
    map.fitBounds(b, {padding: 90, maxZoom: 14.5, duration: (opts && opts.duration) || 1400, essential: true});
    document.querySelectorAll('#watch tr[data-id]').forEach(function (r) { r.classList.toggle('on', Number(r.getAttribute('data-id')) === id); });
    if (window.innerWidth <= 760) setPanel(false);
  }

  function bldSwatch(c) {
    const k = isSat() ? 'sat' : 'street';
    const col = BLD[c][k];
    const bg = isSat() ? '#33404d' : (['excl', 'sec', 'out'].includes(c) ? '#ffffff' : col);
    return sw('poly', 'border-color:' + col + ';background:' + bg);
  }

  function predControls() {
    let h = '<li class="ctl-row"><span class="seg" id="horizon" role="group" aria-label="Horizon in years">';
    HORIZONS.forEach(function (hz) {
      h += '<button type="button" data-h="' + hz + '" aria-pressed="' + (hz === S.horizon ? 'true' : 'false') + '">' + hz + ' yr</button>';
    });
    h += '</span></li><li><fieldset class="radios" id="display"><legend class="sr-only">Display</legend>';
    [['exp', 'Expected buildings on platted lots'], ['cexp', 'Predicted class at the expected count'],
      ['cp90', 'Predicted class at the 90th percentile count'], ['pinc', 'Probability of a class increase']
    ].forEach(function (d) {
      h += '<label><input type="radio" name="display" value="' + d[0] + '"' + (S.display === d[0] ? ' checked' : '') + '> ' + d[1] + '</label>';
    });
    h += '</fieldset></li>';
    h += '<li>' + sw('', 'width:60px;background:linear-gradient(90deg,#deebf7,#4292c6,#08306b)') + 'Probability 0 to 1</li>' +
      '<li>' + sw('dash', 'border-top-color:' + CLASS_COLOR[3]) + 'Predicted class, wider where it rises</li>';
    return h;
  }

  const GROUPS = [
    {items: [
      {key: 'class', label: 'Class location',
        legend: function () {
          return '<li>' + sw('line', 'background:' + CLASS_COLOR[1]) + 'Class 1, 10 or fewer buildings in any mile</li>' +
            '<li>' + sw('line', 'background:' + CLASS_COLOR[2]) + 'Class 2, 11 to 45</li>' +
            '<li>' + sw('line', 'background:' + CLASS_COLOR[3]) + 'Class 3, 46 or more, or the 100-yard rule</li>' +
            '<li>' + sw('line', 'background:' + CLASS_COLOR[4]) + 'Class 4, four-story buildings prevalent (none)</li>' +
            '<li>' + sw('dot', 'border-top-color:#59636e') + '100-yard rule, pending confirmation (2026)</li>' +
            '<li>' + sw('dash', 'border-top-color:#9aa5b1') + 'Analysis margin, one mile beyond each end</li>';
        }},
      {key: 'chg', label: 'Class changes',
        legend: function () {
          return '<li>' + sw('round', 'background:' + CLASS_COLOR[2]) + 'Increase to Class 2</li>' +
            '<li>' + sw('round', 'background:' + CLASS_COLOR[3]) + 'Increase to Class 3</li>' +
            '<li>' + sw('none') + 'Larger markers: the slider year</li>';
        }},
      {key: 'watch', label: 'Watch list',
        legend: function () {
          return '<li>' + sw('halo', 'background:' + CLASS_COLOR[2]) + 'Close to Class 2 (8 to 10 in a mile)</li>' +
            '<li>' + sw('halo', 'background:' + CLASS_COLOR[3]) + 'Close to Class 3 (40 to 45 in a mile)</li>';
        }},
      {key: 'area', label: 'Corridor and sliding mile',
        legend: function () {
          return '<li>' + sw('poly dashed', 'border-color:#1d5ea8;background:transparent') + '220 yards either side of the line</li>' +
            '<li>' + sw('poly', 'border-color:#111827;background:rgba(17,24,39,0.12)') + 'One mile under the pointer</li>';
        }}
    ]},
    {items: [
      {key: 'bld', label: 'Buildings',
        legend: function () {
          let h = '';
          BLD_ORDER.forEach(function (c) { h += '<li>' + bldSwatch(c) + BLD[c].label + '</li>'; });
          h += '<li>' + sw('poly dashed', 'border-color:#59636e;background:transparent') + 'Dashed: parcel square, no footprint yet</li>';
          return h;
        }},
      {key: 'par', label: 'Parcels by year built',
        legend: function () {
          let h = '';
          DECADES.forEach(function (d) { h += '<li>' + sw('', 'background:' + d[2]) + d[1] + '</li>'; });
          return h + '<li>' + sw('poly', 'border-color:#9aa5b1;background:transparent') + 'No year built</li>';
        }},
      {key: 'plat', label: 'Plats',
        legend: function () {
          return '<li>' + sw('poly dashed', 'border-color:#334155;background:transparent') + 'Plat outline with its year</li>';
        }},
      {key: 'perm', label: 'Permits',
        legend: function () {
          return '<li>' + sw('round', 'background:#ffffff;box-shadow:0 0 0 2px #0b4f8a') + 'New residential building</li>' +
            '<li>' + sw('round', 'background:#b0b8c1;box-shadow:0 0 0 2px #4a5561') + 'Other permit</li>';
        }}
    ]},
    {items: [
      {key: 'pred', label: 'Prediction', legend: predControls}
    ]},
    {items: [
      {key: 'cons', label: 'Consequence (synthetic pipe)',
        legend: function () {
          return '<li>' + sw('line', 'background:' + CONS_COLOR.none) + CONS_LABEL.none + '</li>' +
            '<li>' + sw('line', 'background:' + CONS_COLOR.confirm) + CONS_LABEL.confirm + '</li>' +
            '<li>' + sw('line', 'background:' + CONS_COLOR.reduce) + CONS_LABEL.reduce + '</li>' +
            '<li>' + sw('none') + 'Pipe attributes are synthetic</li>';
        }}
    ]},
    {items: [
      {key: 'sens', label: 'Centerline sensitivity',
        legend: function () {
          return '<li>' + sw('dot', 'border-top-color:#111827') + 'Class moves with a 75 or 150 ft shift of the line</li>' +
            '<li>' + sw('dash', 'border-top-color:#a16207') + 'Class moves if garages and sheds are counted</li>';
        }},
      {key: 'conf', label: 'Centerline conflicts',
        legend: function () {
          return '<li>' + sw('round', 'background:transparent;box-shadow:0 0 0 2px #ff2bd6') + 'Building within 25 ft of the line</li>';
        }}
    ]},
    {items: [
      {key: 'city', label: 'City labels'},
      {key: 'mp', label: 'Mileposts'}
    ]}
  ];

  function layerItem(key) {
    for (const g of GROUPS) for (const it of g.items) if (it.key === key) return it;
    return null;
  }

  function renderLayerList() {
    const el = document.getElementById('layer-list');
    let h = '';
    GROUPS.forEach(function (g) {
      h += '<div class="lgroup">';
      g.items.forEach(function (it) {
        const id = 'lyr-' + it.key;
        h += '<div class="lrow" data-key="' + it.key + '"><input type="checkbox" id="' + id + '"' +
          (S.layers[it.key] ? ' checked' : '') + '><label for="' + id + '">' + it.label + '</label><span class="lstate" aria-hidden="true"></span></div>';
        if (it.legend) h += '<ul class="legend" id="lg-' + it.key + '"' + (S.layers[it.key] ? '' : ' hidden') + '>' + it.legend() + '</ul>';
      });
      h += '</div>';
    });
    el.innerHTML = h;
    el.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () { setLayer(cb.closest('.lrow').getAttribute('data-key'), cb.checked); });
    });
    wirePredControls();
  }

  function wirePredControls() {
    document.querySelectorAll('#horizon button').forEach(function (b) {
      b.addEventListener('click', function () { setHorizon(Number(b.getAttribute('data-h'))); });
    });
    document.querySelectorAll('input[name=display]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) setDisplay(r.value); });
    });
  }

  function renderLegends() {
    GROUPS.forEach(function (g) {
      g.items.forEach(function (it) {
        const el = document.getElementById('lg-' + it.key);
        if (el && it.legend) el.innerHTML = it.legend();
      });
    });
    wirePredControls();
  }

  function renderBasemaps() {
    const el = document.getElementById('basemap');
    let h = '<legend class="sr-only">Basemap</legend>';
    Object.keys(BASES).forEach(function (k) {
      h += '<label><input type="radio" name="base" value="' + k + '"' + (S.base === k ? ' checked' : '') + '> ' + BASES[k] + '</label>';
    });
    el.innerHTML = h;
    el.querySelectorAll('input[name=base]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) setBase(r.value); });
    });
  }

  // ------------------------------------------------------------------ state changes

  function setLayer(key, on) {
    S.layers[key] = on;
    const cb = document.getElementById('lyr-' + key);
    if (cb && cb.checked !== on) cb.checked = on;
    const lg = document.getElementById('lg-' + key);
    if (lg) lg.hidden = !on;
    if (on) ensure(key);
    applyState();
    if (key === 'area' && !on) { hideTooltip(); clearWindow(true); }
    if (key === 'chg') renderChanges();
    if (key === 'watch') renderWatch();
    scheduleHash();
  }

  function setYear(y) {
    y = Math.max(YEAR_MIN, Math.min(YEAR_MAX, y));
    S.year = y;
    document.getElementById('year').value = String(y);
    document.getElementById('year-out').textContent = String(y);
    if (CBY) setSrc('cl-class', classFC(y));
    applyState();
    renderSummary();
    renderChanges();
    if (recordRender) recordRender();
    scheduleHash();
  }

  function setHorizon(h) {
    S.horizon = h;
    syncControls();
    if (S.layers.pred) ensure('pred');
    applyState();
    renderWatch();
    scheduleHash();
  }

  function setDisplay(d) {
    S.display = d;
    syncControls();
    if (!S.layers.pred) { setLayer('pred', true); } else { ensure('pred'); applyState(); }
    scheduleHash();
  }

  function setBase(b) {
    if (b === S.base || !BASES[b]) return;
    S.base = b;
    syncControls();
    renderLegends();
    if (map) applyBase();
    scheduleHash();
  }

  function syncControls() {
    document.getElementById('year').value = String(S.year);
    document.getElementById('year-out').textContent = String(S.year);
    document.querySelectorAll('#horizon button').forEach(function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-h')) === S.horizon ? 'true' : 'false');
    });
    document.querySelectorAll('input[name=display]').forEach(function (r) { r.checked = r.value === S.display; });
    document.querySelectorAll('input[name=base]').forEach(function (r) { r.checked = r.value === S.base; });
    LAYER_KEYS.forEach(function (k) {
      const cb = document.getElementById('lyr-' + k);
      if (cb) cb.checked = !!S.layers[k];
      const lg = document.getElementById('lg-' + k);
      if (lg) lg.hidden = !S.layers[k];
    });
  }

  let playTimer = null;
  function stopPlay() {
    if (playTimer) clearInterval(playTimer);
    playTimer = null;
    const b = document.getElementById('play');
    b.textContent = 'Play';
    b.setAttribute('aria-pressed', 'false');
  }
  function togglePlay() {
    if (playTimer) { stopPlay(); return; }
    if (S.year >= YEAR_MAX) setYear(YEAR_MIN);
    const b = document.getElementById('play');
    b.textContent = 'Pause';
    b.setAttribute('aria-pressed', 'true');
    playTimer = setInterval(function () {
      if (S.year >= YEAR_MAX) { stopPlay(); return; }
      setYear(S.year + 1);
    }, 900);
  }

  // ------------------------------------------------------------------ URL hash

  function readHash() {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return null;
    const q = new URLSearchParams(raw);
    const view = {};
    const m = (q.get('map') || '').split('/').map(Number);
    if (m.length === 3 && m.every(Number.isFinite)) { view.zoom = m[0]; view.center = [m[2], m[1]]; }
    const y = parseInt(q.get('year'), 10);
    if (y >= YEAR_MIN && y <= YEAR_MAX) S.year = y;
    const h = parseInt(q.get('h'), 10);
    if (HORIZONS.includes(h)) S.horizon = h;
    const d = q.get('d');
    if (DISPLAYS.includes(d)) S.display = d;
    const b = q.get('base');
    if (BASES[b]) S.base = b;
    if (q.has('layers')) {
      const on = q.get('layers').split(',').filter(Boolean);
      LAYER_KEYS.forEach(function (k) { S.layers[k] = on.includes(k); });
    }
    const st = parseInt(q.get('step'), 10);
    view.step = st >= 1 && st <= SEQ_STEPS.length ? st : null;
    return view;
  }

  function hashExtra() { return SEQ.step ? '&step=' + SEQ.step : ''; }

  function hashString() {
    const c = map.getCenter();
    return 'map=' + map.getZoom().toFixed(2) + '/' + c.lat.toFixed(5) + '/' + c.lng.toFixed(5) +
      '&year=' + S.year + '&h=' + S.horizon + '&d=' + S.display + '&base=' + S.base +
      '&layers=' + LAYER_KEYS.filter(function (k) { return S.layers[k]; }).join(',') + hashExtra();
  }

  let hashTimer = 0;
  function scheduleHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      if (!map) return;
      const q = hashString();
      if (location.hash.slice(1) !== q) history.replaceState(null, '', '#' + q);
    }, 250);
  }

  function onHashChange() {
    if (!map || location.hash.slice(1) === hashString()) return;
    const before = S.base;
    const view = readHash() || {};
    syncControls();
    if (S.base !== before) {
      renderLegends();
      applyBase();
    }
    LAYER_KEYS.forEach(function (k) { if (S.layers[k]) ensure(k); });
    if (CBY) setSrc('cl-class', classFC(S.year));
    applyState();
    renderSummary();
    renderChanges();
    renderWatch();
    if (view.center) map.jumpTo({center: view.center, zoom: view.zoom});
    if (view.step && view.step !== SEQ.step) seqGo(view.step);
  }

  // ------------------------------------------------------------------ records in the panel

  const recordEl = document.getElementById('record');
  let recordKey = null;
  let recordRender = null; // redraws the open record, for example when the year changes

  function setPanel(open) {
    document.body.classList.toggle('panel-collapsed', !open);
    document.getElementById('panel-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (map) map.resize();
  }

  function openRecord(key, html) {
    const same = recordKey === key;
    recordKey = key;
    recordEl.innerHTML = '<button type="button" class="close" aria-label="Close the record">' + CLOSE_ICON + '</button>' + html;
    recordEl.hidden = false;
    recordEl.querySelector('.close').addEventListener('click', closeRecord);
    if (document.body.classList.contains('panel-collapsed')) setPanel(true);
    if (!same) document.getElementById('panel').scrollTop = 0;
  }

  function closeRecord() {
    recordEl.hidden = true;
    recordEl.innerHTML = '';
    recordKey = null;
    recordRender = null;
    setSrc('cl-hl', EMPTY);
    setSrc('cl-hlseg', EMPTY);
    clearWindow(true);
  }

  function governingText(p) {
    const ws = p.window_start;
    const we = p.window_end;
    if (ws == null || we == null) return 'not reported';
    let t = mpRange(mpOf(ws), mpOf(we)) + ': ' + plural(p.max_window_count, 'dwelling unit', 'dwelling units');
    const b = buildingsIn(YEAR_MAX, ws, we);
    if (b) t += ' in ' + plural(b.n, 'counted building', 'counted buildings');
    return t + ' (2026)';
  }

  function sensFor(p) {
    if (!SENS) return null;
    const out = {clFt: 0, cntFt: 0, min: 9, max: 0, sec: 0};
    SENS.forEach(function (r) {
      const ov = Math.min(r.station_to, p.station_to) - Math.max(r.station_from, p.station_from);
      if (ov <= 1) return;
      if (r.centerline_sensitive) {
        out.clFt += ov;
        out.min = Math.min(out.min, r.class_min_shift, r.class_baseline);
        out.max = Math.max(out.max, r.class_max_shift, r.class_baseline);
      }
      if (r.counting_sensitive) { out.cntFt += ov; out.sec = Math.max(out.sec, r.class_secondary_counted); }
    });
    return out;
  }

  function historyHtml(p) {
    const parts = String(p.history || '').split(';').filter(Boolean).map(function (t) {
      const a = t.split(':');
      return [Number(a[0]), Number(a[1])];
    });
    if (!parts.length) return '<p>No history.</p>';
    let h = '<ol>';
    parts.forEach(function (yc, i) {
      if (i === 0) {
        h += '<li>' + yc[0] + ': Class ' + yc[1] + ' at the start of the record</li>';
      } else if (yc[1] > parts[i - 1][1]) {
        h += '<li>' + yc[0] + ': increase to Class ' + yc[1] + '. 192.609 study in ' + yc[0] +
          ', 192.611(d) deadline ' + (yc[0] + 2) + '</li>';
      } else {
        h += '<li>' + yc[0] + ': decrease to Class ' + yc[1] + '</li>';
      }
    });
    return h + '</ol>';
  }

  function flagsHtml(p) {
    const out = [];
    if (p.pending_confirmation) {
      out.push('Pending confirmation: Class 3 rests on the 100-yard rule for a school, church or day care whose occupancy public data cannot show.');
    }
    if (p.edge) out.push('Edge: within one mile of the end of the data.');
    if (p.n_year_estimated > 0) {
      out.push(plural(p.n_year_estimated, 'building that sets the class has', 'buildings that set the class have') + ' an estimated year built.');
    }
    if (p.n_unknown_year > 0) {
      out.push(plural(p.n_unknown_year, 'building has', 'buildings have') + ' no year built and count in every year.');
    }
    if (p.centerline_conflict) {
      out.push(plural(p.n_centerline_conflict, 'footprint that sets the class lies', 'footprints that set the class lie') +
        ' within 25 ft of the public centerline, so the line position is off here.');
    }
    const s = sensFor(p);
    if (s) {
      if (s.clFt > 0) {
        out.push('Centerline sensitive: a shift of 75 or 150 ft changes the class on ' + int(s.clFt) +
          ' ft of this segment (between Class ' + s.min + ' and Class ' + s.max + ').');
      }
      if (s.cntFt > 0) {
        out.push('Counting sensitive: counting garages and sheds on single-family lots makes it Class ' + s.sec +
          ' on ' + int(s.cntFt) + ' ft.');
      }
    } else {
      out.push('Checking the sensitivity flags.');
    }
    if (!out.length) return '<p>None.</p>';
    return '<ul>' + out.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  function windowSentence(s, year) {
    const w = windowAt(s);
    const u = unitsAt(year, w[0]);
    const b = buildingsIn(year, w[0], w[1]);
    let t = 'The mile from ' + mpRange(mpOf(w[0]), mpOf(w[1]));
    if (u == null) return t + ': loading the counts.';
    t += ' holds ' + plural(u, 'dwelling unit', 'dwelling units');
    if (b) t += ' in ' + plural(b.n, 'counted building', 'counted buildings');
    return t + ' in ' + year + '. By its count alone it is ' + badge(classOfCount(u)) + '.';
  }

  // Consequence of the class of the segment on the synthetic pipe: hoop stress, allowance, options.
  function consequenceHtml(p) {
    let h = '<h4>Consequence, synthetic pipe</h4>';
    const rows = consPieces(IDX.cons, p.segment_id);
    if (!rows) return h + '<p class="note">Loading the consequence table.</p>';
    rows.forEach(function (r) {
      h += '<div class="cons">';
      if (rows.length > 1) h += '<p class="note">' + mpRange(r.mile_from, r.mile_to) + '</p>';
      h += '<p class="out k-' + r.outcome_code + '">' + esc(r.outcome.charAt(0).toUpperCase() + r.outcome.slice(1)) + '</p><dl>';
      h += dl('Pipe', CONS ? int(CONS.pipe.outside_diameter_in) + ' in ' + esc(CONS.pipe.grade) + ', ' + esc(CONS.pipe.seam) + ', ' + CONS.pipe.installed_year : 'synthetic');
      h += dl('Wall', r.wall_in.toFixed(3) + ' in (2006 Class ' + r.class_2006 + ' design)');
      h += dl('MAOP', int(r.maop_psig) + ' psig');
      h += dl('Hoop stress at MAOP', f1(r.hoop_stress_pct_smys) + '% of SMYS');
      h += dl('Class ' + (r.class != null ? r.class : r.present_class) + ' allowance', int(r.allowance_pct_smys) + '% of SMYS (design factor ' + r.design_factor.toFixed(2) + ')');
      if (r.study_year != null) h += dl('192.609 study', String(r.study_year));
      if (r.maop_deadline != null) h += dl('192.611(d) deadline', String(r.maop_deadline));
      if (!r.commensurate) {
        h += dl('(a)(1) 2006 test', (r.a1_maop_psig != null ? 'supports ' + int(r.a1_maop_psig) + ' psig' : 'not applicable') +
          (r.a1_confirms ? ', keeps the MAOP' : ''));
        if (!r.a1_confirms) {
          h += dl('(a)(2) reduce', 'to ' + int(r.a2_maop_psig) + ' psig at the design factor');
          h += dl('(a)(3) retest', r.a3_test_psig != null ? 'to ' + int(r.a3_test_psig) + ' psig (' + f1(r.a3_test_pct_smys) + '% of SMYS), ' +
            (r.a3_feasible ? 'feasible' : 'not feasible') : 'not applicable');
          h += dl('Replace', r.replacement_wall_in != null ? r.replacement_wall_in.toFixed(3) + ' in wall, ' + f2(r.length_ft / MILE) + ' mi' : 'not needed');
          h += dl('(a)(4) alternative', r.a4_available ? 'available, by ' + esc(r.a4_deadline) + ', then a 192.609 study each calendar year' : 'not available: ' + esc(r.a4_reason));
        }
      }
      h += '</dl><p class="note">Pipe attributes are synthetic.</p></div>';
    });
    return h;
  }

  function segmentHtml(p, s) {
    let h = '<h3>' + badge(p.class) + ' Segment ' + p.segment_id + ', 2026</h3><dl>';
    h += dl('Mileposts', mpRange(p.mile_from, p.mile_to));
    h += dl('Length', int(p.length_ft) + ' ft (' + f2(p.length_ft / MILE) + ' mi)');
    h += dl('Basis', BASIS_TEXT[p.basis] || esc(p.basis));
    h += dl('Busiest mile', governingText(p));
    h += dl('Buildings that set the class', int(p.n_structures));
    h += '</dl>';
    if (p.class === 1 && p.max_window_count > 10) {
      h += '<p class="note">A mile touching this stretch holds more than 10 dwelling units, but the stretch lies more than 220 yards beyond the outermost building of that cluster. Under 192.5(c)(2) the class location ends there, so this stretch stays Class 1.</p>';
    }
    if (s != null) h += '<h4>Sliding mile at the clicked point</h4><p>' + windowSentence(s, S.year) + '</p>';
    h += '<h4>Change history</h4>' + historyHtml(p);
    h += consequenceHtml(p);
    h += '<h4>Flags</h4>' + flagsHtml(p);
    return h;
  }

  function showSegment(id, s) {
    const p = IDX.seg.get(id);
    if (!p) return;
    const f = IDX.segF.get(id);
    setSrc('cl-hl', EMPTY);
    setSrc('cl-hlseg', f ? fc([f]) : EMPTY);
    const key = 'seg:' + id;
    const render = function () { if (recordKey === key) openRecord(key, segmentHtml(p, s)); };
    openRecord(key, segmentHtml(p, s));
    recordRender = render;
    Promise.all([loadStructures(), loadSens(), loadWindows()].concat(recordLoaders())).then(render);
  }

  // Loaders a record waits for besides the buildings, sensitivity and window counts.
  function recordLoaders() { return [loadCons()]; }

  function yearHow(flag) {
    if (!flag) return 'actual year built from the appraisal record';
    if (flag.indexOf('estimated:') === 0) {
      const m = flag.slice(10);
      const base = m.replace(':capped_image', '');
      let t = {
        effective_year_built: 'estimated from the effective year built of the parcel',
        plat_year_plus_1: 'estimated as the plat year plus one',
        plat_year_plus_1_stand_in: 'estimated as the plat year plus one, with a stand-in plat year (median year built of the subdivision minus one)',
        first_snapshot: 'estimated as the first Denton CAD parcel snapshot (2015, 2020, 2023 or 2025) that shows the parcel',
        usa_image_date: 'estimated as the date of the USA Structures imagery'
      }[base] || 'estimated';
      if (m.indexOf(':capped_image') >= 0) t += ', capped at the imagery date';
      return t;
    }
    return {
      vacant_parcel: 'no year: the parcel is coded vacant, so the building counts in every year',
      parcel_no_attributes: 'no year: the parcel has no appraisal attributes, so the building counts in every year',
      parcel_no_year: 'no year on the parcel, so the building counts in every year',
      no_parcel: 'no year: no parcel found, so the building counts in every year'
    }[flag] || esc(flag);
  }

  function buildingHtml(f) {
    const p = f.properties;
    const flags = p.flags ? p.flags.split(';') : [];
    let counted;
    if (p.counted) counted = 'Yes. A building intended for human occupancy inside the 220-yard corridor.';
    else if (p.cat === 'sec') counted = 'No. A secondary building on a single-family lot, usually a garage or shed. The lot counts its largest building plus one for each extra address point.';
    else if (p.station_min == null) counted = 'No. Outside the 220-yard corridor.';
    else counted = 'No. Not intended for human occupancy.';
    let where;
    if (p.station_min != null) {
      const a = mpOf(p.station_min);
      const b = mpOf(p.station_max);
      where = Math.abs(b - a) < 0.005 ? 'MP ' + f2(a) : mpRange(a, b);
    } else {
      const c = ringCentroid(f.geometry);
      where = c && CL ? 'about MP ' + f2(mpOf(stationAt(c[0], c[1]))) + ' (outside the corridor)' : 'outside the corridor';
    }
    let h = '<h3>Building ' + esc(p.id) + '</h3><dl>';
    h += dl('Source', SOURCE_TEXT[p.source] || esc(p.source));
    h += dl('Occupancy', OCC_TEXT[p.occupancy_class] || esc(p.occupancy_class));
    h += dl('Counted', counted);
    h += dl('Dwelling units', int(p.units) + (flags.includes('units_estimated') ? ' (estimated from the living area)' : ''));
    h += dl('Year built', (p.year_built == null ? 'none' : esc(p.year_built)) + ', ' + yearHow(p.year_flag));
    h += dl('Distance from the line', f1(p.lateral_min) + ' ft from the centerline to the nearest point of the footprint');
    h += dl('Milepost', where);
    const fl = flags.map(function (t) { return FLAG_TEXT[t] || esc(t); });
    h += dl('Flags', fl.length ? fl.join(', ') : 'none');
    h += '</dl>';
    if (p.y > S.year) h += '<p class="note">Built after the slider year ' + S.year + '.</p>';
    return h;
  }

  function showBuilding(id) {
    const f = IDX.bld.get(id);
    if (!f) return;
    setSrc('cl-hl', fc([f]));
    setSrc('cl-hlseg', EMPTY);
    clearWindow(true);
    const key = 'bld:' + id;
    openRecord(key, buildingHtml(f));
    recordRender = function () { if (recordKey === key) openRecord(key, buildingHtml(f)); };
  }

  // ------------------------------------------------------------------ popups

  let popup = null;

  function closePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  function codesText(codes) {
    return String(codes || '').split(',').filter(Boolean).map(function (c) {
      const t = CODE_TEXT[c.charAt(0)];
      return esc(c) + (t ? ' (' + t + ')' : '');
    }).join(', ') || 'none';
  }

  // The outcome of a change on the synthetic pipe, in its popup.
  function changePopupExtra(p) {
    const o = outcomeOf(consPieces(IDX.consChg, p.change_id));
    if (!o) return '';
    const r = o.row;
    let h = tr('Synthetic pipe', r.wall_in.toFixed(3) + ' in wall, MAOP ' + int(r.maop_psig) + ' psig, ' +
      f1(r.hoop_stress_pct_smys) + '% of SMYS against ' + int(r.allowance_pct_smys) + '% allowed');
    h += tr('Outcome', '<span class="mark" style="background:' + CONS_COLOR[o.code] + '"></span>' + esc(o.text));
    if (r.a4_available) h += tr('(a)(4) deadline', esc(r.a4_deadline));
    return h;
  }

  function popupHtml(f) {
    const id = f.layer.id;
    const q = f.properties;
    let p;
    if (id === 'cl-chg') {
      p = IDX.chg.get(q.change_id) || q;
      let h = '<h4>Class ' + p.from_class + ' to Class ' + p.to_class + ' in ' + p.year + '</h4><table>';
      h += tr('Mileposts', mpRange(p.mile_from, p.mile_to)) + tr('Length', int(p.length_ft) + ' ft');
      h += tr('192.609 study', String(p.study_trigger_year)) + tr('192.611(d) deadline', String(p.maop_deadline));
      h += tr('Buildings that entered', int(p.n_entered)) + changePopupExtra(p) + '</table>';
      if (p.pending_confirmation) h += '<p>Rests on the 100-yard rule, pending confirmation.</p>';
      if (p.n_entered > 0) h += '<button type="button" class="btn" data-action="entered" data-id="' + p.change_id + '">Show the buildings that entered</button>';
      return h;
    }
    if (id === 'cl-conf') {
      p = IDX.conf.get(q.id) || q;
      let h = '<h4>Building within 25 ft of the centerline</h4><table>';
      h += tr('Occupancy', OCC_TEXT[p.occupancy_class] || esc(p.occupancy_class));
      h += tr('Counted', p.counted ? 'yes' : 'no') + tr('Year built', esc(p.year_built));
      h += tr('Distance', f1(p.lateral_min) + ' ft') + tr('Milepost', 'MP ' + f2(p.milepost));
      h += tr('In the reach', p.in_report_range ? 'yes' : 'no, in the analysis margin');
      if (p.determines_segment_class) h += tr('Sets the class of', 'segments ' + esc(String(p.determines_segment_class).split(';').join(', ')));
      h += '</table><p class="note">A 36-inch line in an easement cannot pass under a building, so the public centerline is off here.</p>';
      return h;
    }
    if (id === 'cl-perm') {
      p = IDX.perm.get(q.permit_id) || q;
      let h = '<h4>Permit: ' + esc(String(p.permit_type || 'unknown').toLowerCase()) + '</h4><table>';
      h += tr('Year', p.year == null ? 'unknown' : String(Math.round(p.year)));
      h += tr('Issued by', p.source === 'city_of_denton' ? 'City of Denton' : 'Denton County');
      h += tr('Area', esc(p.city)) + tr('New residential', p.residential_new ? 'yes' : 'no') + '</table>';
      return h;
    }
    if (id === 'cl-lots-fill' || id === 'cl-lotpts') {
      p = IDX.lots.get(q.lot_id) || q;
      const pred = p.status === 'predicted';
      let h = '<h4>' + (pred ? 'Platted vacant lot' : 'Lot not predicted') + '</h4><table>';
      if (!pred) h += tr('Why', esc(p.status));
      const src = PLAT_DATE_TEXT[p.plat_year_source] || esc(p.plat_year_source);
      h += tr('Plat year', p.plat_year == null ? 'none' : esc(p.plat_year) + ' (' + src + ')');
      h += tr('Years since plat', esc(p.age_years));
      if (pred) {
        h += tr('Chance of a building', 'within 1 yr ' + pct(p.p_1) + ', 2 yr ' + pct(p.p_2) + ', 3 yr ' + pct(p.p_3) + ', 5 yr ' + pct(p.p_5));
      }
      h += tr('Milepost', 'MP ' + f2(p.milepost)) + tr('County', COUNTY[p.county] || esc(p.county)) + '</table>';
      if (String(p.flags || '').indexOf('beyond_curve') >= 0) h += '<p class="note">Older than the observed build-out curve, so the probability is near zero.</p>';
      return h;
    }
    if (id === 'cl-watch-halo') {
      p = IDX.watch.get(q.stretch_id) || q;
      const h0 = S.horizon;
      const e = p['expected_lots_h' + h0];
      const pc = p['p_cross_h' + h0];
      let h = '<h4>Watch list: close to Class ' + p.target_class + '</h4><table>';
      h += tr('Mileposts', mpRange(p.mile_from, p.mile_to)) + tr('Class now', 'Class ' + p.current_class);
      h += tr('Highest count', plural(p.max_count, 'dwelling unit', 'dwelling units') + ' in one mile, ' + int(p.margin) + ' short of Class ' + p.target_class);
      h += tr('Within ' + h0 + ' yr', f1(e) + ' expected new buildings in its miles');
      h += tr('Chance of crossing', pct(pc) + ' that part of it reaches Class ' + p.target_class) + '</table>';
      if (pc === 0 && e > 0.5) {
        h += '<p class="note">A chance of 0 with new buildings expected means the stretch lies more than 220 yards beyond the clusters that grow, so the cluster boundary rule keeps its class.</p>';
      }
      return h;
    }
    if (id === 'cl-sens-cl' || id === 'cl-sens-cnt') {
      p = IDX.sens.get(q.segment_id) || q;
      let h = '<h4>Class depends on assumptions</h4><table>';
      h += tr('Mileposts', mpRange(p.mile_from, p.mile_to)) + tr('Class as mapped', 'Class ' + p.class_baseline);
      const lo = Math.min(p.class_min_shift, p.class_baseline);
      const hi = Math.max(p.class_max_shift, p.class_baseline);
      h += tr('Line shifted 75 or 150 ft', lo === hi ? 'Class ' + lo : 'Class ' + lo + ' to Class ' + hi);
      h += tr('Garages and sheds counted', 'Class ' + p.class_secondary_counted) + '</table>';
      return h;
    }
    if (id === 'cl-pseg-class' || id === 'cl-pseg-prob') {
      const m = IDX.pseg[S.horizon];
      p = (m && m.get(q.segment_id)) || q;
      let h = '<h4>Within ' + p.horizon_years + (p.horizon_years === 1 ? ' year' : ' years') + '</h4><table>';
      h += tr('Mileposts', mpRange(p.mile_from, p.mile_to)) + tr('Class in 2026', 'Class ' + p.current_class);
      h += tr('At the expected count', 'Class ' + p.expected_class) + tr('At the 90th percentile', 'Class ' + p.p90_class);
      h += tr('Chance of an increase', pct(p.p_increase)) + '</table>';
      return h;
    }
    if (id === 'cl-plat-fill') {
      p = IDX.plat.get(q.plat_id) || q;
      let h = '<h4>' + esc(p.name || 'Unnamed plat') + '</h4><table>';
      h += tr('Plat year', p.year == null ? 'no recorded date' : p.year + ' (' + (PLAT_DATE_TEXT[p.plat_year_source] || esc(p.plat_year_source)) + ')');
      h += tr('County', COUNTY[p.county] || esc(p.county)) + '</table>';
      return h;
    }
    if (id === 'cl-par-fill') {
      p = IDX.par.get(q.parcel_id) || q;
      let h = '<h4>Parcel, ' + (COUNTY[p.county] || esc(p.county)) + ' County</h4><table>';
      h += tr('Property class', codesText(p.state_codes));
      h += tr('Year built', p.year_built == null ? 'none' : esc(p.year_built));
      h += tr('In the corridor', p.in_corridor_660 ? 'yes' : 'no') + '</table>';
      return h;
    }
    return popupExtra(id, q);
  }

  // Popups of layers other modules add.
  function popupExtra() { return null; }

  function openPopup(f, lngLat) {
    const html = popupHtml(f);
    if (!html) return;
    closePopup();
    popup = new maplibregl.Popup({maxWidth: '320px', focusAfterOpen: false}).setLngLat(lngLat).setHTML(html).addTo(map);
    popup.getElement().addEventListener('click', function (ev) {
      const t = ev.target.closest('[data-action]');
      if (t && t.getAttribute('data-action') === 'entered') showEntered(Number(t.getAttribute('data-id')));
    });
  }

  function bboxOf(features) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    function walk(c) {
      if (typeof c[0] === 'number') {
        x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]);
      } else c.forEach(walk);
    }
    features.forEach(function (f) { walk(f.geometry.coordinates); });
    return [[x0, y0], [x1, y1]];
  }

  function showEntered(changeId) {
    const p = IDX.chg.get(changeId);
    if (!p) return;
    loadStructures().then(function () {
      const ids = String(p.entered_ids || '').split(';').filter(Boolean);
      const feats = ids.map(function (i) { return IDX.bld.get(i); }).filter(Boolean);
      setSrc('cl-hl', fc(feats));
      if (!S.layers.bld) setLayer('bld', true);
      if (feats.length) map.fitBounds(bboxOf(feats), {padding: 70, maxZoom: 16.5, duration: 700});
    });
  }

  // ------------------------------------------------------------------ hover, click, sliding mile

  const CLICKABLE = ['cl-chg', 'cl-conf', 'cl-perm', 'cl-bld-fill', 'cl-bld-line', 'cl-bld-dash', 'cl-lots-fill',
    'cl-lotpts', 'cl-watch-halo', 'cl-sens-cl', 'cl-sens-cnt', 'cl-pseg-class', 'cl-pseg-prob', 'cl-hit',
    'cl-plat-fill', 'cl-par-fill'];

  function visibleLayers(ids) {
    return ids.filter(function (id) { return map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none'; });
  }

  function around(pt, r) { return [[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]]; }

  const tooltip = document.getElementById('tooltip');
  let pinned = null;
  let winShown = false;
  let lastWinStation = null;
  let wcWaiting = false;

  function hideTooltip() { tooltip.hidden = true; }

  function clearWindow(force) {
    if (force) pinned = null;
    if (pinned != null) return;
    if (winShown) { setSrc('cl-win', EMPTY); winShown = false; lastWinStation = null; }
  }

  function windowTooltip(s, year) {
    const w = windowAt(s);
    const u = unitsAt(year, w[0]);
    const b = buildingsIn(year, w[0], w[1]);
    let h = '<b>Sliding mile ' + mpRange(mpOf(w[0]), mpOf(w[1])) + '</b>, ' + year + '<br>';
    if (u == null) return h + 'Loading the counts.';
    h += '<b>' + int(u) + '</b> dwelling units' + (b ? ' in <b>' + int(b.n) + '</b> counted buildings' : '') + '<br>';
    h += 'By its count alone: ' + badge(classOfCount(u)) + '<br>';
    h += '<span class="note">The line shows the highest class of any mile containing a point, ending 220 yards beyond the outermost building (192.5(c)).</span>';
    return h;
  }

  function placeTooltip(point) {
    const W = document.getElementById('map-wrap').clientWidth;
    const H = document.getElementById('map-wrap').clientHeight;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let x = point.x + 16;
    let y = point.y + 16;
    if (x + tw > W - 6) x = point.x - tw - 16;
    if (y + th > H - 6) y = point.y - th - 16;
    tooltip.style.left = Math.max(6, x) + 'px';
    tooltip.style.top = Math.max(6, y) + 'px';
  }

  function showWindowInfo(s, point) {
    if (!CL) return;
    if (lastWinStation == null || Math.abs(s - lastWinStation) > 8) {
      const w = windowAt(s);
      setSrc('cl-win', windowFeature(w[0], w[1]));
      winShown = true;
      lastWinStation = s;
    }
    if (!WC && !wcWaiting) {
      wcWaiting = true;
      Promise.all([loadWindows(), loadStructures()]).then(function () {
        wcWaiting = false;
        if (lastMove && !tooltip.hidden) onHover();
        if (recordRender) recordRender();
      });
    } else if (!COUNTED) {
      loadStructures();
    }
    if (!point) return;
    tooltip.innerHTML = windowTooltip(s, S.year);
    tooltip.hidden = false;
    placeTooltip(point);
  }

  let hoverFrame = 0;
  let lastMove = null;

  function onHover() {
    hoverFrame = 0;
    const e = lastMove;
    if (!e || !map.getLayer('cl-hit')) return;
    const ids = visibleLayers(CLICKABLE);
    const feats = ids.length ? map.queryRenderedFeatures(around(e.point, 3), {layers: ids}) : [];
    map.getCanvas().style.cursor = feats.length ? 'pointer' : '';
    const onLine = feats.some(function (f) { return f.layer.id === 'cl-hit'; });
    if (onLine && S.layers.area && CL) {
      showWindowInfo(stationAt(e.lngLat.lng, e.lngLat.lat), e.point);
    } else {
      hideTooltip();
      if (pinned != null) showWindowInfo(pinned, null); else clearWindow(false);
    }
  }

  function onClick(e) {
    const ids = visibleLayers(CLICKABLE);
    if (!ids.length) return;
    const feats = map.queryRenderedFeatures(around(e.point, 4), {layers: ids});
    function by(...wanted) {
      for (const id of wanted) {
        const f = feats.find(function (x) { return x.layer.id === id; });
        if (f) return f;
      }
      return null;
    }
    const marker = by('cl-chg', 'cl-conf', 'cl-perm');
    if (marker) { openPopup(marker, e.lngLat); return; }
    const bld = by('cl-bld-fill', 'cl-bld-line', 'cl-bld-dash');
    if (bld) { closePopup(); showBuilding(bld.properties.id); return; }
    const pop = by('cl-lots-fill', 'cl-lotpts', 'cl-watch-halo', 'cl-sens-cl', 'cl-sens-cnt', 'cl-pseg-class', 'cl-pseg-prob');
    const hit = by('cl-hit');
    if (pop) openPopup(pop, e.lngLat);
    if (hit && CL) {
      if (!pop) closePopup();
      const s = stationAt(e.lngLat.lng, e.lngLat.lat);
      if (S.layers.area) { pinned = null; lastWinStation = null; showWindowInfo(s, null); pinned = s; }
      showSegment(hit.properties.segment_id, s);
      return;
    }
    if (pop) return;
    const other = by('cl-plat-fill', 'cl-par-fill');
    if (other) { openPopup(other, e.lngLat); return; }
    closePopup();
    if (pinned != null) clearWindow(true);
  }

  // ------------------------------------------------------------------ places and milepost jump

  function renderBookmarks() {
    const el = document.getElementById('bookmarks');
    el.innerHTML = BOOKMARKS.map(function (b, i) {
      return '<button type="button" class="btn" data-i="' + i + '">' + esc(b.name) + '</button>';
    }).join('');
    el.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const b = BOOKMARKS[Number(btn.getAttribute('data-i'))];
        (b.layers || []).forEach(function (k) { if (!S.layers[k]) setLayer(k, true); });
        map.flyTo({center: b.center, zoom: b.zoom, essential: true, duration: 1600});
        if (window.innerWidth <= 760) setPanel(false);
      });
    });
  }

  function onJump(ev) {
    ev.preventDefault();
    const input = document.getElementById('jump-mp');
    const v = parseFloat(input.value);
    if (!CL || !Number.isFinite(v)) return;
    const reach = (CL.report_range_ft[1] - CL.report_range_ft[0]) / MILE;
    const m = Math.max(0, Math.min(reach, v));
    const c = pointAt(CL.report_range_ft[0] + m * MILE);
    setSrc('cl-jump', fc([{type: 'Feature', properties: {label: 'MP ' + f2(m)}, geometry: {type: 'Point', coordinates: c}}]));
    map.flyTo({center: c, zoom: Math.max(map.getZoom(), 15), essential: true, duration: 1400});
    if (window.innerWidth <= 760) setPanel(false);
  }

  // ------------------------------------------------------------------ start

  function wireControls() {
    document.getElementById('panel-toggle').addEventListener('click', function () {
      setPanel(document.body.classList.contains('panel-collapsed'));
    });
    document.getElementById('year').addEventListener('input', function (ev) {
      if (playTimer) stopPlay();
      setYear(Number(ev.target.value));
    });
    document.getElementById('play').addEventListener('click', togglePlay);
    document.getElementById('jump').addEventListener('submit', onJump);
    window.addEventListener('hashchange', onHashChange);
    wireSequence();
  }

  // ------------------------------------------------------------------ guided sequence

  // Seven views with their captions (verbatim from the Phase 5 scope). Each step sets the
  // layers, the year and the view, then does one thing once the map has moved there.
  const SEQ_STEPS = [
    {text: 'A 36-inch gas transmission line, 70 miles across Denton and Collin counties, from public records. Colors show the class location today.',
      layers: ['class', 'city', 'mp'], year: YEAR_MAX, bounds: REACH_BOUNDS},
    {text: 'Every mile of line is tested on its own. Point at the line to see the buildings counted in that mile and the class they give.',
      layers: ['class', 'area', 'bld', 'city', 'mp'], year: YEAR_MAX, mp: 52.35, zoom: 14.6, then: 'mile'},
    {text: 'Slide the year. Houses built since 2020 moved this stretch from Class 1 to Class 3.',
      layers: ['class', 'chg', 'bld', 'city', 'mp'], year: YEAR_MIN, mp: 52.4, zoom: 13.9, then: 'years'},
    {text: 'Each change carries the year a 192.609 study was due and the 24-month 192.611 deadline.',
      layers: ['class', 'chg', 'city', 'mp'], year: YEAR_MAX, change: 43, zoom: 14.2, then: 'popup'},
    {text: 'The watch list ranks stretches close to the next class by the chance of crossing within one, two or five years, from platted lots and the build-out rate of nearby subdivisions.',
      layers: ['class', 'watch', 'pred', 'city', 'mp'], year: YEAR_MAX, horizon: 1, display: 'exp', mp: 8.3, zoom: 13.3, then: 'watch'},
    {text: 'With the pipe\'s MAOP, wall and test record each change becomes an action: confirm, reduce pressure, retest, replace, or the 2026 integrity management alternative. Pipe data here are synthetic.',
      layers: ['class', 'cons', 'city', 'mp'], year: YEAR_MAX, segment: 56, zoom: 13.6, then: 'record'},
    {html: 'Running this on your line takes your centerline, your structure and pipe records, and a schedule. See <a href="operators.html">For operators</a>.',
      text: 'Running this on your line takes your centerline, your structure and pipe records, and a schedule. See For operators.',
      layers: ['class', 'city', 'mp'], year: YEAR_MAX, bounds: REACH_BOUNDS}
  ];
  const SEQ = {step: 0, token: 0, timer: null};
  const seqCard = document.getElementById('seqcard');

  function seqStopAnimation() {
    if (SEQ.timer) clearInterval(SEQ.timer);
    SEQ.timer = null;
  }

  function seqRenderCard(k) {
    const st = SEQ_STEPS[k - 1];
    document.getElementById('seq-text').innerHTML = st.html || esc(st.text);
    seqCard.querySelector('.step').textContent = k + ' of ' + SEQ_STEPS.length;
    seqCard.querySelector('[data-seq=back]').disabled = k <= 1;
    seqCard.querySelector('[data-seq=next]').textContent = k < SEQ_STEPS.length ? 'Next' : 'Done';
    seqCard.hidden = false;
  }

  function seqClear() {
    seqStopAnimation();
    closePopup();
    hideTooltip();
    clearWindow(true);
    if (recordKey) closeRecord();
  }

  // Runs step k. Everything the step needs is loaded on the way, and a later click cancels
  // the finishing touch of an earlier step through the token.
  function seqGo(k) {
    if (!map || !CL) return;
    k = Math.max(1, Math.min(SEQ_STEPS.length, k));
    const st = SEQ_STEPS[k - 1];
    const token = ++SEQ.token;
    SEQ.step = k;
    seqClear();
    seqRenderCard(k);
    LAYER_KEYS.forEach(function (key) {
      const want = st.layers.includes(key);
      if (S.layers[key] !== want) setLayer(key, want);
    });
    if (st.horizon && st.horizon !== S.horizon) setHorizon(st.horizon);
    if (st.display && st.display !== S.display) setDisplay(st.display);
    if (st.year != null && st.year !== S.year) setYear(st.year);
    if (window.innerWidth <= 760 && !(st.then === 'watch' || st.then === 'record')) setPanel(false);
    const finish = function () { if (SEQ.token === token) seqFinish(st, token); };
    map.once('moveend', finish);
    const dur = 1600;
    if (st.bounds) {
      map.fitBounds(st.bounds, {padding: 24, duration: dur, essential: true});
    } else if (st.change && IDX.chgF.get(st.change)) {
      map.flyTo({center: IDX.chgF.get(st.change).geometry.coordinates, zoom: st.zoom, duration: dur, essential: true});
    } else if (st.segment && IDX.segF.get(st.segment)) {
      const f = IDX.segF.get(st.segment);
      map.fitBounds(bboxOf([f]), {padding: 80, maxZoom: st.zoom, duration: dur, essential: true});
    } else {
      map.flyTo({center: pointAt(CL.milepost_origin_ft + st.mp * MILE), zoom: st.zoom, duration: dur, essential: true});
    }
    scheduleHash();
  }

  function seqFinish(st, token) {
    const live = function () { return SEQ.token === token; };
    if (st.then === 'mile') {
      const s0 = CL.milepost_origin_ft + st.mp * MILE;
      Promise.all([loadWindows(), loadStructures()]).then(function () {
        if (!live()) return;
        pinned = null;
        lastWinStation = null;
        showWindowInfo(s0, null);
        pinned = s0;
        const pt = map.project(pointAt(s0));
        tooltip.innerHTML = windowTooltip(s0, S.year);
        tooltip.hidden = false;
        placeTooltip(pt);
      });
    } else if (st.then === 'years') {
      seqStopAnimation();
      SEQ.timer = setInterval(function () {
        if (!live()) { seqStopAnimation(); return; }
        if (S.year >= YEAR_MAX) { seqStopAnimation(); return; }
        setYear(S.year + 1);
      }, 380);
    } else if (st.then === 'popup') {
      loadChanges().then(function () {
        const f = IDX.chgF.get(st.change);
        if (live() && f) openPopup({layer: {id: 'cl-chg'}, properties: f.properties}, f.geometry.coordinates);
      });
    } else if (st.then === 'watch') {
      loadWatch().then(function () {
        if (!live()) return;
        renderWatch();
        const sec = document.getElementById('watch-sec');
        if (!sec.hidden) sec.scrollIntoView({block: 'start', behavior: 'smooth'});
      });
    } else if (st.then === 'record') {
      Promise.all([loadSegments(), loadCons()]).then(function () {
        if (live() && IDX.seg.get(st.segment)) showSegment(st.segment, null);
      });
    }
  }

  function seqClose() {
    SEQ.token++;
    SEQ.step = 0;
    seqClear();
    seqCard.hidden = true;
    scheduleHash();
  }

  function wireSequence() {
    document.getElementById('start').addEventListener('click', function () {
      loadBase().then(function () { seqGo(1); });
    });
    seqCard.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-seq]');
      if (!b) return;
      const what = b.getAttribute('data-seq');
      if (what === 'close') seqClose();
      else if (what === 'back') seqGo(SEQ.step - 1);
      else if (what === 'next') { if (SEQ.step >= SEQ_STEPS.length) seqClose(); else seqGo(SEQ.step + 1); }
    });
    document.addEventListener('keydown', function (ev) {
      if (seqCard.hidden) return;
      if (ev.key === 'Escape') seqClose();
      else if (ev.key === 'ArrowRight' && SEQ.step < SEQ_STEPS.length) seqGo(SEQ.step + 1);
      else if (ev.key === 'ArrowLeft' && SEQ.step > 1) seqGo(SEQ.step - 1);
    });
  }

  // Hooks other modules fill in: run once the map exists (they get the view read from the hash).
  const afterMap = [function (view) {
    if (view.step) {
      map.once('idle', function () { loadBase().then(function () { if (!SEQ.step) seqGo(view.step); }); });
    }
  }];

  function start() {
    if (!window.maplibregl) {
      showError('The map library did not load.');
      return;
    }
    fetch(DATA + 'site_config.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (cfg) {
        const e = cfg && cfg.esri_imagery;
        if (e && e.enabled && e.api_key && e.style_url) {
          ESRI.enabled = true;
          ESRI.key = e.api_key;
          ESRI.style = e.style_url;
          const rest = Object.assign({}, BASES);
          Object.keys(BASES).forEach(function (k) { delete BASES[k]; });
          BASES.esri = 'Satellite (Esri World Imagery)';
          Object.assign(BASES, rest);
          S.base = 'esri';
        }
        start2();
      });
  }

  function start2() {
    const view = readHash() || {};
    renderLayerList();
    renderBasemaps();
    renderBookmarks();
    syncControls();
    renderSummary();
    wireControls();
    setPanel(window.innerWidth > 760);
    SRC['cl-city'] = cityFC();
    // First view: the centerline, the class profile, the counts and the small layers that are on.
    loadBase();
    loadChanges();
    LAYER_KEYS.forEach(function (k) { if (S.layers[k] && k !== 'bld' && k !== 'par') ensure(k); });
    baseStyle().catch(fallBackToSatellite).then(function (style) { createMap(style, view); });
  }

  function createMap(style, view) {
    const opts = {
      container: 'map',
      style: style,
      minZoom: 7,
      maxZoom: 19,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false
    };
    if (view.center) { opts.center = view.center; opts.zoom = view.zoom; } else { opts.bounds = REACH_BOUNDS; opts.fitBoundsOptions = {padding: 24}; }
    map = new maplibregl.Map(opts);
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
    // Attribution first, then the scale, so the scale sits above the attribution text.
    map.addControl(new maplibregl.AttributionControl({compact: true, customAttribution: DATA_ATTR}), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({unit: 'imperial', maxWidth: 110}), 'bottom-right');
    window.classlocMap = map;
    // The compact attribution control starts expanded. Start it folded: the i button opens it.
    map.once('load', function () {
      const el = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (el) { el.classList.remove('maplibregl-compact-show'); el.removeAttribute('open'); }
    });

    map.on('style.load', function () { addOverlay(); });
    // The OpenFreeMap sprite lacks a few icons (for example "gate"). An empty image draws
    // the same map without a console warning for each of them.
    map.on('styleimagemissing', function (e) {
      if (!map.hasImage(e.id)) map.addImage(e.id, {width: 1, height: 1, data: new Uint8Array(4)});
    });
    map.on('error', function (e) {
      const err = e && e.error;
      const msg = err && err.message ? err.message : String(err);
      if (err && (err.status || /tile|Failed to fetch|NetworkError/i.test(msg))) console.warn('Map resource not loaded:', msg);
      else console.error('Map error:', msg);
    });
    map.on('mousemove', function (e) {
      lastMove = e;
      if (!hoverFrame) hoverFrame = requestAnimationFrame(onHover);
    });
    map.on('mouseout', function () { hideTooltip(); clearWindow(false); });
    map.on('click', onClick);
    map.on('moveend', function () {
      scheduleHash();
      structuresWhenClose();
    });

    // After the first view: the parcels if a link turned them on, the buildings when close.
    let started = false;
    function second() {
      if (started) return;
      started = true;
      structuresWhenClose();
      if (S.layers.par) ensure('par');
    }
    map.once('idle', second);
    setTimeout(second, 3000);
    afterMap.forEach(function (fn) { fn(view); });
  }

  start();
})();
