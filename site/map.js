/* The Art of the Possible — eleven-municipality capacity map.

   One PMTiles file per municipality, listed in data/index.json, each added as its own
   source. They do not overlap, so every source can stay on at once and the viewer only
   downloads tiles for what is on screen.

   Numeric attributes arrive as integers; the TENTHS fields were multiplied by ten on the
   way in. export/build_tiles.py holds the matching list. */
(function () {
  "use strict";

  const GTA = [-79.42, 43.72];
  const MINZOOM = 10;

  const TENTHS = new Set(["frontage_m", "depth_m", "buildable_width_m"]);
  const scaled = (f, v) => (TENTHS.has(f) ? v * 10 : v);
  const unscale = (f, v) => (TENTHS.has(f) ? v / 10 : v);

  const RAMP = ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"];
  const NO_DATA = "#d9d9d9";

  // Eleven categories need a palette that stays separable; this is Tableau 10 plus one.
  const MUNI_COLOURS = ["#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#b07aa1", "#edc948",
                        "#76b7b2", "#ff9da7", "#9c755f", "#bab0ac", "#1b9e77"];

  const SCALES = {
    n_units: { label: "Units permitted", unit: "", breaks: [2, 3, 4, 5] },
  };

  let map, index = [], muniColour = {}, selected = null;

  function colourFor(field) {
    if (field === "municipality") {
      const m = ["match", ["get", "municipality"]];
      index.forEach((r) => m.push(r.name, muniColour[r.name]));
      m.push(NO_DATA);
      return m;
    }
    const s = SCALES[field];
    const step = ["step", ["to-number", ["get", field]], RAMP[0]];
    s.breaks.forEach((b, i) => step.push(scaled(field, b), RAMP[i + 1] || RAMP[RAMP.length - 1]));
    return ["case", ["has", field], step, NO_DATA];
  }

  function renderLegend(field) {
    const el = document.getElementById("legend");
    el.innerHTML = "";
    const row = (c, t) => {
      const d = document.createElement("div");
      d.className = "legend-row";
      d.innerHTML = '<span class="sw" style="background:' + c + '"></span><span>' + t + "</span>";
      el.appendChild(d);
    };
    if (field === "municipality") {
      index.forEach((r) => row(muniColour[r.name], r.name));
      return;
    }
    const b = SCALES[field].breaks;
    row(RAMP[0], "under " + b[0]);
    for (let i = 0; i < b.length - 1; i++) row(RAMP[i + 1], b[i] + "–" + b[i + 1]);
    row(RAMP[b.length] || RAMP[RAMP.length - 1], b[b.length - 1] + " and over");
    row(NO_DATA, "No data");
  }

  const YESNO = (v) => (Number(v) ? "Yes" : "No");
  const FMT = { detached_unit: YESNO, greenbelt: YESNO, orm: YESNO };
  const PANEL_FIELDS = [
    ["municipality", "Municipality"],
    ["zone", "Zone"],
    ["method", "Method"],
    ["selected_by", "Residential by"],
    ["frontage_m", "Frontage (m)"],
    ["depth_m", "Depth (m)"],
    ["area_m2", "Lot area (m²)"],
    ["buildable_width_m", "Buildable width (m)"],
    ["footprint_sqft", "Floor plate (sq ft)"],
    ["storeys", "Storeys"],
    ["n_units_main", "Units in main building"],
    ["detached_unit", "Detached unit fits"],
    ["detached_unit_sqft", "Detached unit (sq ft)"],
    ["n_units", "Units total"],
    ["max_units_zoned", "Zoned maximum"],
    ["greenbelt", "In the Greenbelt"],
    ["orm", "On the Oak Ridges Moraine"],
  ];

  function showPanel(p) {
    document.getElementById("panel-title").textContent = p.municipality || "Parcel";
    document.getElementById("panel-sub").textContent =
      (Number(p.n_units) || 0) + " units permitted as of right";
    const dl = document.getElementById("panel-body");
    dl.innerHTML = "";
    PANEL_FIELDS.forEach(([k, label]) => {
      const raw = p[k];
      let v;
      if (raw === undefined || raw === null || raw === "") v = "—";
      else if (FMT[k]) v = FMT[k](raw);
      else if (TENTHS.has(k)) v = unscale(k, Number(raw)).toFixed(1);
      else v = raw;
      const dt = document.createElement("dt"); dt.textContent = label;
      const dd = document.createElement("dd"); dd.textContent = v;
      if (v === "—") dd.className = "muted";
      dl.appendChild(dt); dl.appendChild(dd);
    });
    document.getElementById("panel").hidden = false;
  }

  function renderTally() {
    const tb = document.querySelector("#tally tbody");
    const total = index.reduce((a, r) => a + r.units, 0);
    tb.innerHTML = index.map((r) =>
      "<tr><td>" + r.name + "</td><td class='n'>" + r.units.toLocaleString() + "</td></tr>"
    ).join("") + "<tr class='tot'><td>Total</td><td class='n'>" +
      total.toLocaleString() + "</td></tr>";
  }

  function basemap() {
    // CARTO's keyless endpoint now stamps "API KEY REQUIRED" across every tile, so without
    // a key fall back to OpenStreetMap's own raster tiles rather than ship a watermark.
    // Set the CARTO_API_KEY repository secret and the workflow writes config.js for the
    // lighter CARTO basemap, which suits a data map better.
    const key = (window.CARTO_API_KEY || "").trim();
    const carto = "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key="
      + encodeURIComponent(key);
    const osm = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution = key
      ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>'
      : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    return {
      version: 8,
      sources: { base: { type: "raster", tiles: [key ? carto : osm], tileSize: 256,
                         maxzoom: 19, attribution } },
      layers: [{ id: "base", type: "raster", source: "base" }],
    };
  }

  function updateZoomNote() {
    const n = document.getElementById("zoom-note");
    n.hidden = map.getZoom() >= MINZOOM;
  }

  async function init() {
    index = await (await fetch("data/index.json")).json();
    index.forEach((r, i) => { muniColour[r.name] = MUNI_COLOURS[i % MUNI_COLOURS.length]; });
    renderTally();

    const proto = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", proto.tile);

    map = new maplibregl.Map({
      container: "map", style: basemap(), center: GTA, zoom: 9.2, maxZoom: 17.5, hash: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    map.on("load", () => {
      index.forEach((r) => {
        const id = "p-" + r.slug;
        map.addSource(id, {
          type: "vector",
          url: "pmtiles://" + new URL("data/" + r.slug + ".pmtiles", location.href).href,
          promoteId: "parcel_ix",
        });
        map.addLayer({
          id: id + "-fill", type: "fill", source: id, "source-layer": "parcels",
          minzoom: MINZOOM,
          paint: { "fill-color": colourFor("n_units"), "fill-opacity": 0.75 },
        });
        map.addLayer({
          id: id + "-line", type: "line", source: id, "source-layer": "parcels",
          minzoom: 14,
          paint: { "line-color": "#5c5c5c", "line-width": 0.4, "line-opacity": 0.6 },
        });
        map.on("click", id + "-fill", (e) => {
          const f = e.features && e.features[0];
          if (f) showPanel(f.properties);
        });
        map.on("mouseenter", id + "-fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", id + "-fill", () => { map.getCanvas().style.cursor = ""; });
      });
      renderLegend("n_units");
      updateZoomNote();
    });
    map.on("zoomend", updateZoomNote);

    document.getElementById("colour-by").addEventListener("change", (e) => {
      const f = e.target.value;
      index.forEach((r) => map.setPaintProperty("p-" + r.slug + "-fill", "fill-color", colourFor(f)));
      renderLegend(f);
    });
    document.getElementById("panel-close").addEventListener("click", () => {
      document.getElementById("panel").hidden = true;
    });

    if (window.MapSearch) {
      MapSearch.mount({
        container: "#search", inputId: "ms-address",
        placeholder: "e.g. 17 Spring Garden Rd",
        onSelect: (r) => {
          map.once("moveend", () => {
            const pt = map.project([r.lon, r.lat]);
            for (const row of index) {
              const hits = map.queryRenderedFeatures(pt, { layers: ["p-" + row.slug + "-fill"] });
              if (hits.length) { showPanel(hits[0].properties); return; }
            }
          });
          map.flyTo({ center: [r.lon, r.lat], zoom: Math.max(map.getZoom(), 17) });
        },
      });
    }
  }

  init();
})();
