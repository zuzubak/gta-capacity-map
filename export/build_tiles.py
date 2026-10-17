"""Vector tiles for the eleven-municipality capacity map.

    python export/build_tiles.py

Reads the regional model from the TRREB project and writes ONE PMTiles file per
municipality. One combined file is not an option: Toronto alone fills 96 of GitHub's
100 MiB at parcel detail, and the eleven together hold roughly twice Toronto's parcel
count. Splitting also means a reader panning around Durham never downloads Peel.

Numeric attributes ride as integers, with the one-decimal fields multiplied by ten and
divided back in the browser -- a double costs eight bytes in every tile a feature appears
in. site/map.js holds the matching TENTHS list.
"""
import json
import os
import subprocess
import sys
import tempfile

import geopandas as gpd
import pandas as pd

TRREB = os.path.expanduser("~/projects/TRREB")
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FIELDS = ["municipality", "zone", "method", "selected_by",
          "frontage_m", "depth_m", "area_m2", "buildable_width_m",
          "footprint_sqft", "storeys", "n_units_main", "detached_unit",
          "detached_unit_sqft", "n_units", "max_units_zoned", "greenbelt", "orm"]
TENTHS = ["frontage_m", "depth_m", "buildable_width_m"]
WHOLE = ["area_m2", "footprint_sqft", "detached_unit_sqft",
         "storeys", "n_units_main", "n_units", "max_units_zoned"]
BOOLS = ["detached_unit", "greenbelt", "orm"]

MINZOOM, MAXZOOM = 10, 15     # a regional overview, not a parcel-detail tool


def log(m):
    print(m, file=sys.stderr, flush=True)


def as_int(col):
    v = pd.to_numeric(col, errors="coerce").round()
    return [None if pd.isna(x) else int(x) for x in v]


def slug(m):
    return m.lower().replace(" ", "-")


def tippecanoe(src, out, layer):
    cmd = ["tippecanoe", "-o", out, "-l", layer, "-Z", str(MINZOOM), "-z", str(MAXZOOM),
           "--drop-densest-as-needed", "--extend-zooms-if-still-dropping", "--force", src]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.getsize(out) / 1048576


def main():
    out_dir = os.path.join(HERE, "site", "data")
    os.makedirs(out_dir, exist_ok=True)
    attrs = pd.read_csv(os.path.join(TRREB, "data/derived/region_model.csv"), low_memory=False)
    geom = gpd.read_file(os.path.join(TRREB, "data/derived/region_lots.gpkg"))
    log(f"{len(attrs):,} modelled parcels, {len(geom):,} geometries")

    g = geom.merge(attrs[FIELDS + ["parcel_ix"]], on=["municipality", "parcel_ix"], how="inner")
    log(f"{len(g):,} joined")
    g = g.drop(columns="parcel_ix")
    for c in TENTHS:
        g[c] = as_int(g[c] * 10)
    for c in WHOLE:
        g[c] = as_int(g[c])
    for c in BOOLS:
        g[c] = g[c].fillna(False).astype(bool).astype("int32")

    index = []
    with tempfile.TemporaryDirectory() as tmp:
        for muni, part in g.groupby("municipality"):
            s = slug(muni)
            src = os.path.join(tmp, s + ".geojsonl")
            part.to_crs(4326).to_file(src, driver="GeoJSONSeq")
            mb = tippecanoe(src, os.path.join(out_dir, s + ".pmtiles"), "parcels")
            # total_bounds, not a unary_union envelope: unioning 150,000 polygons to
            # find a bounding box takes minutes and tells you nothing extra.
            b = part.to_crs(4326).total_bounds
            index.append({"name": muni, "slug": s, "parcels": int(len(part)),
                          "units": int(part.n_units.sum()),
                          "bounds": [round(float(x), 4) for x in b]})
            log(f"  {muni:<14} {len(part):>7,} parcels  {mb:5.1f} MiB")

    index.sort(key=lambda r: -r["units"])
    json.dump(index, open(os.path.join(out_dir, "index.json"), "w"), indent=1)
    log(f"\nwrote index.json ({len(index)} municipalities)")
    total = sum(os.path.getsize(os.path.join(out_dir, f))
                for f in os.listdir(out_dir) if f.endswith(".pmtiles")) / 1048576
    log(f"total tiles {total:.1f} MiB; largest file must stay under 100 MiB")


if __name__ == "__main__":
    main()
