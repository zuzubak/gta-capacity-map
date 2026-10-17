# GTA capacity map — The Art of the Possible

Preliminary as-of-right housing capacity across the eleven GTA municipalities in the TRREB
missing-middle study. Published, unlisted, at
<https://malcolmkennedy.com/gta-capacity-map/>.

This is **not** the Toronto model. `TRREB/scripts/toronto_envelope.py` and
`toronto_capacity.py` build Toronto parcel by parcel from its own zoning, overlays,
building footprints and address points, and that remains the deep dive — it lives at
<https://malcolmkennedy.com/to-parcel-map/>.

Toronto on this map comes from that detailed model, marked `method = detailed`. The other
ten use one representative low-rise zone standard per municipality, from HM Planning's D1
Regulatory Baseline of 14 October 2026, marked `method = representative zone`. Running
Toronto the coarse way as well put it 29% low, which is the best measure we have of how
much the coarse method misses.

Residential parcels are selected by real zoning where a layer exists — Toronto, Ajax,
Barrie, Mississauga, Oshawa and Vaughan — and by a lot-shape filter for the five that
publish no zone geometry: Brampton, Markham, Richmond Hill, Whitby and Pickering. Each
parcel carries `selected_by` saying which. Zoning finds materially more parcels than the
shape filter does (Mississauga 138,818 against 99,667), so those five are understated.

Not modelled for the ten: conversion of existing buildings, which in Toronto carries most
lots, zone-by-zone standards within a municipality, party walls, and front-yard averaging.

## Build

```sh
python ../TRREB/scripts/region_model.py   # writes region_model.csv + region_lots.gpkg
python export/build_tiles.py              # one .pmtiles per municipality + index.json
```

Tiles are committed. One file per municipality because Toronto alone fills 96 of GitHub's
100 MiB at parcel detail.

## Licensing

Only Toronto's parcel geometry is Open Government Licence – Toronto. Every other parcel
layer is unlicensed working data and Pickering's is a consultant copy of unconfirmed
licence, which is why this page is unlisted and carries `noindex`. It must not be linked
publicly without municipal sign-off.
