# The Art of the Possible — regional capacity map

Preliminary as-of-right housing capacity across the eleven GTA municipalities in the TRREB
missing-middle study. Published, unlisted, at
<https://malcolmkennedy.com/art-of-the-possible/>.

This is **not** the Toronto model. `TRREB/scripts/toronto_envelope.py` and
`toronto_capacity.py` build Toronto parcel by parcel from its own zoning, overlays,
building footprints and address points, and that remains the deep dive — it lives at
<https://malcolmkennedy.com/to-parcel-map/>.

Nothing comparable exists for the other ten municipalities. Five of them publish no zoning
geometry at all, and only Toronto has address points joined to parcels. So this map takes
one representative low-rise zone standard per municipality, from HM Planning's D1
Regulatory Baseline of 14 October 2026, and applies it to every parcel in the residential
range. Toronto is included on that same coarse basis so the eleven are comparable with each
other; where it disagrees with the detailed Toronto figure, the detailed one is right.

Deliberately not modelled here: conversion of existing buildings (in Toronto that path
carries 83% of lots, so this understates), zone-by-zone standards, party walls, and
front-yard averaging.

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
