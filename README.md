# Northern Ireland Schools

A small, extensible site for exploring school locations and Department of
Education enrolment trends.

## Run locally

Serve the repository root over HTTP, for example:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>. The Schools page is at
<http://localhost:8000/schools.html>, and school trends are at
<http://localhost:8000/enrolments.html>. The school map uses Leaflet and
OpenStreetMap tiles, so an internet connection is needed.

## Publish with GitHub Pages

The `Deploy GitHub Pages` workflow publishes the static site whenever changes
are pushed to `main`, or when the workflow is run manually. Once GitHub Pages
is enabled for the repository with **GitHub Actions** as its build and deploy
source, the site is available at
<https://jjgerard.github.io/northern-ireland/> and the school map at
<https://jjgerard.github.io/northern-ireland/schools.html>.

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

The Department's Crown copyright reuse terms for its data are described on
DE's [copyright page](https://www.education-ni.gov.uk/crown-copyright). Postcode
lookups are from the UK postcode data exposed by postcodes.io; OpenStreetMap
data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
The dataset's `snapshotDate` records when this snapshot was retrieved.
Refresh the committed snapshot from PowerShell with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-schools.ps1
```

The importer downloads the DE directory export and performs postcode lookups;
it does not retain the directory's contact-email field.

## School trends

`data/school-trends.json` combines the Department's [Northern Ireland school
census summary data](https://www.education-ni.gov.uk/publications/school-enrolments-northern-ireland-summary-data)
with annual [pupil attendance workbooks](https://www.education-ni.gov.uk/articles/pupil-attendance).
The census slices cover enrolments by school category, religion, free school
meal entitlement, newcomer pupils and Irish-medium education. Attendance is a
separate, school-level dataset containing attendance and absence rates from
2007/08–2024/25 where downloadable spreadsheets are available. Attendance
figures should not be averaged across schools to estimate a pupil-weighted
Northern Ireland rate.

The dataset retains the Department's published granularity and missing values.
In particular, the source enrolment Grand Total includes funded pre-school
places; these are shown as a separate series from nursery enrolments.
Newcomer counts suppressed for disclosure and small numbers remain unavailable.
Religion is not available for 2023/24 in the current Department workbook, and
school-level attendance data has no downloadable 2022/23 workbook.
The Department also publishes annual pupil infographics with characteristics
such as sex, age, ethnicity and special educational needs. Its attendance
bulletins discuss pupil characteristics including gender and ethnicity, but
those breakdowns are not included in the downloadable school-level workbooks.

To download the Department's workbooks and refresh the prepared datasets,
install the Python dependency and run:

```powershell
python -m pip install -r .\requirements.txt
python .\scripts\build-trends.py
```

The Department notes that 2023/24 census data was affected by Action Short of
Strike. The builder preserves blanks, dashes and suppressed values as
unavailable rather than zero, and notes where source definitions vary by year.

## Structure

- `data/schools.json` holds school locations and official classifications.
- `data/school-trends.json` contains the prepared, selectable series.
- `data/*.xlsx` contains the Department source workbooks used to build it.
- `schools.html` and `app.js` implement the Schools directory and map.
- `enrolments.html` and `enrolments.js` implement the trend slice builder.
- `index.html` and `home.js` provide the site overview and live directory counts.
- `scripts/build-schools.ps1` refreshes the directory snapshot and postcode
  lookups.
- `scripts/build-trends.py` downloads and prepares the census and attendance
  workbooks.

The interaction follows the Language Atlas pattern of a page-specific map and
filter controls backed by a prepared JSON dataset. It does not reuse the Atlas's
world-map geometry or its global country/sector model.
