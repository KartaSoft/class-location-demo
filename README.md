# Class location demonstration

A demonstration of a 49 CFR 192.5 class location method on public data, for a
36-inch intrastate gas transmission line in Denton and Collin counties, from
the Texas RRC public pipeline dataset.

Site: https://kartasoft.github.io/class-location-demo/

This repository holds the built static site only: the map (index.html), a short
page for operators (operators.html), the data files the map reads (data/) and
the map library (vendor/).

## Disclaimer

This site demonstrates a class location method on public data. It is not a
compliance determination for any operator. Class locations are computed from
public building, parcel and pipeline data whose positions and dates carry
errors. The pipe attributes behind the 192.609 study years, the 192.611 options
and their deadlines are synthetic: the real attributes of the line are not
public.

## Data and attribution

- Pipeline centerline: Railroad Commission of Texas, Texas Pipeline Mapping
  System, public data retrieved 2026-11-07. The RRC states that these data are
  not an authoritative record. Positional accuracy reported by the operator: 51
  to 300 ft.
- County boundaries: US Census Bureau, 2024 cartographic boundary files.
- Building footprints: USA Structures, Oak Ridge National Laboratory and FEMA.
- Additional building footprints: Overture Maps Foundation (release
  2026-10-21.0), overturemaps.org, including data from (c) OpenStreetMap
  contributors, available under the Open Database License, Microsoft ML
  Buildings (ODbL) and Esri Community Maps contributors (CC BY 4.0).
- Parcels and year built: Denton Central Appraisal District, Collin Central
  Appraisal District, Grayson Central Appraisal District, and Tarrant Appraisal
  District data through the City of Fort Worth parcel view.
- Permits: Denton County and City of Denton public permit records.
- Satellite basemap: USGS The National Map orthoimagery, public domain. Where
  the page is built with an ArcGIS API key, Esri World Imagery through the
  ArcGIS basemap styles service, with the attribution the service delivers.
- Streets basemap and map label fonts: OpenFreeMap, with OpenMapTiles. Map data
  (c) OpenStreetMap contributors, under the Open Database License.
- City labels: US Census Bureau, 2024 Gazetteer of places, public domain.
- Map library: MapLibre GL JS 5.24.0, BSD 3-Clause license, see
  vendor/LICENSE-maplibre-gl.txt.
- Pipe attributes (diameter, grade, wall, MAOP, test record): synthetic, marked
  as such in every file that carries them.

## License notice for the structure layers

The structure layers (structures, secondary_buildings, assembly_candidates and
centerline_conflicts) contain building footprints derived from Overture Maps
data that include OpenStreetMap and Microsoft ML Buildings data under the Open
Database License 1.0 (https://opendatacommons.org/licenses/odbl/1-0/). As
derivative databases, these layers are made available under the ODbL 1.0. (c)
OpenStreetMap contributors.

KartaSoft
