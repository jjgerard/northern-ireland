# Northern Ireland Schools

A searchable map of open primary and post-primary schools in Northern Ireland,
including the directory's independent and preparatory school categories.
Schools can be filtered by phase, Department of Education (DE) institution
type, management type and local government district. Hover over a marker for
the school name; select it for the available school link.

## Run locally

Serve the repository root over HTTP, for example:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. The map uses Leaflet and OpenStreetMap
tiles, so an internet connection is needed.

## Data and location accuracy

`data/schools.json` is a snapshot of open schools from the DE Schools+ Institution
Search export. The map includes DE types `Primary`, `Secondary`, `Grammar`,
`Independent` and `Preps`. Grammar schools are grouped under the post-primary
phase and remain separately filterable by their official type. Independent and
preparatory schools are grouped together because the directory does not specify
their phase. This snapshot contains **973 schools**: 760 primary, 122 secondary,
66 grammar, 15 independent and 10 preparatory.

School names, identifiers, addresses, postcodes, types and management
classifications come from the Department of Education Northern Ireland's
[Institution Search](https://apps.education-ni.gov.uk/appinstitutes/default.aspx).
The exported directory does not include school website URLs. The map opens a
school website if a `websiteUrl` is present; otherwise it links to that school's
location in Google Maps.

The DE export does not contain coordinates. Most points use postcode-centre
coordinates from [postcodes.io](https://postcodes.io/), with three missing
postcode lookups filled from OpenStreetMap. These are approximate locations,
not surveyed school-site coordinates. The `locationSource` field in the data
identifies how each point was placed. Shared postcodes can cause markers to
overlap; the map clusters nearby schools to keep them selectable.

The directory's Crown copyright reuse terms are described on DE's
[copyright page](https://www.education-ni.gov.uk/crown-copyright). Postcode
lookups are from the UK postcode data exposed by postcodes.io; OpenStreetMap
data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
The dataset's `snapshotDate` records when this snapshot was retrieved.
Refresh the committed snapshot from PowerShell with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-schools.ps1
```

The importer downloads the DE directory export and performs postcode lookups;
it does not retain the directory's contact-email field.

## Structure

- `data/schools.json` holds school locations and official classifications.
- `app.js` owns the map, filter state, result list and school details.
- `scripts/build-schools.ps1` refreshes the directory snapshot and postcode
  lookups.
- Survey results should be stored separately and joined to the same stable DE
  institution reference, rather than added as school-directory fields. This
  keeps the school map reusable when additional survey layers are introduced.

The interaction follows the Language Atlas pattern of a page-specific map and
filter controls backed by a prepared JSON dataset. It does not reuse the Atlas's
world-map geometry or its global country/sector model.
