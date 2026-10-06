const DATA_URL = "./data/school-trends.json";
const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const percentageFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

const elements = {
  dataset: document.querySelector("#dataset-select"),
  metricField: document.querySelector("#metric-field"),
  metric: document.querySelector("#metric-select"),
  groupField: document.querySelector("#group-field"),
  groupLabel: document.querySelector("#group-field span"),
  group: document.querySelector("#group-filter"),
  from: document.querySelector("#year-from"),
  to: document.querySelector("#year-to"),
  searchLabel: document.querySelector("#search-label"),
  search: document.querySelector("#series-search"),
  sort: document.querySelector("#sort-by"),
  picker: document.querySelector("#category-picker"),
  options: document.querySelector("#category-options"),
  sourceLinks: document.querySelector("#source-links"),
  tableTitle: document.querySelector("#table-heading"),
  tableSummary: document.querySelector("#table-summary"),
  status: document.querySelector("#data-status"),
  tableScroll: document.querySelector("#table-scroll"),
  tableHead: document.querySelector("#trend-head"),
  tableBody: document.querySelector("#trend-body"),
  empty: document.querySelector("#table-empty"),
  chart: document.querySelector("#trend-chart"),
  chartSvg: document.querySelector("#trend-chart-svg"),
  chartSummary: document.querySelector("#chart-summary"),
  chartLegend: document.querySelector("#chart-legend"),
  download: document.querySelector("#download-csv"),
};

const chartColors = [
  "#14766c", "#bf6048", "#4775a8", "#b18421", "#76579b",
  "#358a9a", "#b34b78", "#6d8835", "#8b684f", "#53616d",
];
const svgNamespace = "http://www.w3.org/2000/svg";
let datasets = [];
let activeDataset = null;
let currentTable = [];
let visibleYears = [];

function appendOptions(select, values) {
  const fragment = document.createDocumentFragment();
  for (const item of values) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    fragment.append(option);
  }
  select.replaceChildren(fragment);
}

function makeOption(label, value) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function renderDatasetOptions() {
  appendOptions(elements.dataset, datasets.map((dataset) => ({
    value: dataset.id,
    label: dataset.label,
  })));
}

function renderMetricOptions() {
  if (!activeDataset.metricOptions?.length) {
    elements.metricField.hidden = true;
    elements.metric.replaceChildren();
    return;
  }
  appendOptions(elements.metric, activeDataset.metricOptions.map((metric) => ({
    value: metric.id,
    label: metric.label,
  })));
  elements.metric.disabled = false;
  elements.metric.value = activeDataset.defaultMetric ?? activeDataset.metricOptions[0].id;
  elements.metricField.hidden = false;
}

function renderGroupOptions() {
  const groups = [...new Set(activeDataset.rows.map((row) => row.group).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  if (groups.length < 2) {
    elements.groupField.hidden = true;
    elements.group.replaceChildren();
    return;
  }
  elements.groupLabel.textContent = activeDataset.id === "attendance" ? "School phase" : "School category";
  elements.group.replaceChildren(
    makeOption(activeDataset.id === "attendance" ? "All school phases" : "All school categories", ""),
    ...groups.map((group) => makeOption(group, group))
  );
  elements.group.disabled = false;
  elements.group.value = activeDataset.id === "attendance" && groups.includes("Primary")
    ? "Primary"
    : "";
  elements.groupField.hidden = false;
}

function renderSeriesOptions() {
  const useGroupFilter = activeDataset.rows.length > 80;
  elements.picker.hidden = useGroupFilter;
  elements.picker.disabled = useGroupFilter;
  elements.searchLabel.textContent = activeDataset.id === "attendance" ? "Find a school" : "Find a series";
  elements.search.placeholder = activeDataset.id === "attendance" ? "Search school name" : "Search series";
  elements.search.value = "";

  if (useGroupFilter) {
    elements.options.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of activeDataset.rows) {
    const label = document.createElement("label");
    label.className = "category-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = row.id;
    input.checked = true;
    const text = document.createElement("span");
    text.textContent = row.label;
    label.append(input, text);
    fragment.append(label);
  }
  elements.options.replaceChildren(fragment);
}

function renderSourceLinks() {
  const fragment = document.createDocumentFragment();
  if (activeDataset.sourceFile) {
    const download = document.createElement("a");
    download.className = "source-link";
    download.href = activeDataset.sourceFile;
    download.download = "";
    download.textContent = "Download source workbook ↓";
    fragment.append(download);
  }
  if (activeDataset.sourceUrl) {
    const source = document.createElement("a");
    source.className = "source-link";
    source.href = activeDataset.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Department data and notes ↗";
    fragment.append(source);
  }
  for (const link of activeDataset.relatedLinks ?? []) {
    const related = document.createElement("a");
    related.className = "source-link";
    related.href = link.url;
    related.target = "_blank";
    related.rel = "noopener noreferrer";
    related.textContent = `${link.label} ↗`;
    fragment.append(related);
  }
  elements.sourceLinks.replaceChildren(fragment);
  const sourceDescription = document.querySelector("#source-description");
  sourceDescription.textContent = activeDataset.title ? `${activeDataset.title}.` : "";
}

function valuesForRow(row) {
  return visibleYears.map((year) => {
    const value = row.values[year.label];
    if (activeDataset.metricOptions?.length) {
      return value?.[elements.metric.value] ?? null;
    }
    return value;
  });
}

function rowChange(row) {
  const first = row.values[visibleYears[0]?.label];
  const last = row.values[visibleYears.at(-1)?.label];
  const firstValue = activeDataset.metricOptions?.length ? first?.[elements.metric.value] : first;
  const lastValue = activeDataset.metricOptions?.length ? last?.[elements.metric.value] : last;
  if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue)) return null;
  return lastValue - firstValue;
}

function matchingRows() {
  const selected = new Set(
    [...elements.options.querySelectorAll("input:checked")].map((input) => input.value)
  );
  const query = elements.search.value.trim().toLocaleLowerCase();
  const group = elements.group.value;
  const useGroupFilter = activeDataset.rows.length > 80;

  return activeDataset.rows
    .filter((row) =>
      (useGroupFilter || selected.has(row.id)) &&
      (!group || row.group === group) &&
      (!query || row.label.toLocaleLowerCase().includes(query))
    )
    .sort((left, right) => {
      if (elements.sort.value === "latest") {
        const leftValue = valuesForRow(left).at(-1);
        const rightValue = valuesForRow(right).at(-1);
        return (rightValue ?? Number.NEGATIVE_INFINITY) - (leftValue ?? Number.NEGATIVE_INFINITY);
      }
      if (elements.sort.value === "change") {
        return (rowChange(right) ?? Number.NEGATIVE_INFINITY) -
          (rowChange(left) ?? Number.NEGATIVE_INFINITY);
      }
      return left.label.localeCompare(right.label);
    });
}

function buildTableHead() {
  const row = document.createElement("tr");
  const changeLabel = activeDataset.format === "percent" ? "Change (pp)" : "Change";
  const headings = [
    activeDataset.rows.length > 80 ? "School" : "Series",
    ...visibleYears.map((year) => year.label),
    changeLabel,
  ];
  if (activeDataset.format !== "percent") headings.push("% change");
  for (const label of headings) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    row.append(cell);
  }
  elements.tableHead.replaceChildren(row);
}

function formatValue(value) {
  if (!Number.isFinite(value)) return "—";
  return activeDataset.format === "percent"
    ? `${numberFormat.format(value)}%`
    : numberFormat.format(value);
}

function buildTableRow(rowData) {
  const row = document.createElement("tr");
  const name = document.createElement("th");
  name.scope = "row";
  name.textContent = rowData.label;
  row.append(name);

  const values = valuesForRow(rowData);
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = formatValue(value);
    if (!Number.isFinite(value)) cell.className = "not-reported";
    row.append(cell);
  }

  const change = rowChange(rowData);
  const changeCell = document.createElement("td");
  changeCell.textContent = Number.isFinite(change)
    ? `${change > 0 ? "+" : ""}${numberFormat.format(change)}${activeDataset.format === "percent" ? " pp" : ""}`
    : "—";
  changeCell.className = change > 0 ? "positive-change" : change < 0 ? "negative-change" : "";
  row.append(changeCell);

  if (activeDataset.format !== "percent") {
    const percentageCell = document.createElement("td");
    const first = values[0];
    percentageCell.textContent = Number.isFinite(first) && first !== 0 && Number.isFinite(change)
      ? `${change > 0 ? "+" : ""}${percentageFormat.format((change / first) * 100)}%`
      : "—";
    row.append(percentageCell);
  }
  return row;
}

function svgElement(name, attributes = {}, text) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

function niceStep(range, targetTicks) {
  const roughStep = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

function renderChart() {
  const rows = currentTable;
  elements.chart.hidden = rows.length === 0;
  elements.chartSvg.replaceChildren(
    svgElement("desc", { id: "chart-description" },
      `A line chart showing ${rows.length} selected series across ${visibleYears.length} academic years.`)
  );
  elements.chartLegend.replaceChildren();
  if (!rows.length || !visibleYears.length) return;

  const width = 960;
  const height = 390;
  const margin = { top: 22, right: 20, bottom: 55, left: 78 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = rows.flatMap((row) => valuesForRow(row).filter(Number.isFinite));
  if (!values.length) {
    elements.chartSummary.textContent = "No numeric values are reported for this selection.";
    elements.chartSvg.append(svgElement("text", {
      x: width / 2, y: height / 2, class: "chart-empty-message", "text-anchor": "middle",
    }, "No numeric values to plot"));
    return;
  }

  const minimum = Math.min(0, ...values);
  const maximum = Math.max(...values);
  const step = niceStep(maximum - minimum || 1, 5);
  const yMinimum = Math.floor(minimum / step) * step;
  const yMaximum = Math.ceil(maximum / step) * step || step;
  const x = (index) => margin.left + (visibleYears.length < 2
    ? plotWidth / 2
    : (index / (visibleYears.length - 1)) * plotWidth);
  const y = (value) => margin.top + ((yMaximum - value) / (yMaximum - yMinimum)) * plotHeight;

  const grid = svgElement("g", { class: "chart-grid", "aria-hidden": "true" });
  const tickCount = Math.round((yMaximum - yMinimum) / step);
  for (let index = 0; index <= tickCount; index += 1) {
    const value = yMinimum + step * index;
    const tickY = y(value);
    grid.append(
      svgElement("line", { x1: margin.left, x2: width - margin.right, y1: tickY, y2: tickY }),
      svgElement("text", { x: margin.left - 12, y: tickY + 4, "text-anchor": "end" },
        `${numberFormat.format(value)}${activeDataset.format === "percent" ? "%" : ""}`)
    );
  }
  const xTickIndices = new Set([0, visibleYears.length - 1]);
  const maxXTicks = 7;
  if (visibleYears.length > 2) {
    for (let index = 1; index < maxXTicks - 1; index += 1) {
      xTickIndices.add(Math.round((index / (maxXTicks - 1)) * (visibleYears.length - 1)));
    }
  }
  for (const index of [...xTickIndices].sort((a, b) => a - b)) {
    const tickX = x(index);
    grid.append(
      svgElement("line", { x1: tickX, x2: tickX, y1: margin.top, y2: height - margin.bottom, class: "chart-x-gridline" }),
      svgElement("text", { x: tickX, y: height - margin.bottom + 22, "text-anchor": "middle" }, visibleYears[index].label)
    );
  }
  grid.append(
    svgElement("line", { x1: margin.left, x2: margin.left, y1: margin.top, y2: height - margin.bottom, class: "chart-axis" }),
    svgElement("line", { x1: margin.left, x2: width - margin.right, y1: height - margin.bottom, y2: height - margin.bottom, class: "chart-axis" })
  );
  elements.chartSvg.append(grid);

  const lineGroup = svgElement("g", { class: "chart-lines" });
  rows.forEach((row, rowIndex) => {
    const rowValues = valuesForRow(row);
    let path = "";
    let segmentOpen = false;
    rowValues.forEach((value, yearIndex) => {
      if (!Number.isFinite(value)) {
        segmentOpen = false;
        return;
      }
      path += `${segmentOpen ? "L" : "M"}${x(yearIndex).toFixed(2)},${y(value).toFixed(2)} `;
      segmentOpen = true;
    });
    if (path) {
      const color = chartColors[rowIndex % chartColors.length];
      const line = svgElement("path", {
        d: path.trim(),
        class: "chart-line",
        stroke: color,
        "stroke-opacity": rows.length > 12 ? "0.55" : "1",
      });
      line.append(svgElement("title", {}, row.label));
      lineGroup.append(line);

      if (rows.length <= 12) {
        const item = document.createElement("li");
        item.className = "chart-legend-item";
        item.append(
          svgElement("svg", { viewBox: "0 0 20 10", "aria-hidden": "true" }),
          document.createTextNode(row.label)
        );
        item.firstElementChild.append(svgElement("line", {
          x1: 1, x2: 19, y1: 5, y2: 5, stroke: color, "stroke-width": 2.5,
        }));
        elements.chartLegend.append(item);
      }
    }
  });
  elements.chartSvg.append(lineGroup);
  elements.chartSummary.textContent = rows.length > 12
    ? `${rows.length.toLocaleString()} series shown; legend hidden for readability.`
    : `${rows.length.toLocaleString()} series · ${activeDataset.unit}`;
}

function renderTable() {
  visibleYears = activeDataset.years.slice(
    activeDataset.years.findIndex((year) => year.label === elements.from.value),
    activeDataset.years.findIndex((year) => year.label === elements.to.value) + 1
  );
  if (!visibleYears.length || !visibleYears[0]) {
    elements.status.textContent = "Choose a valid year range to build the table.";
    elements.tableScroll.hidden = true;
    elements.empty.hidden = true;
    elements.chart.hidden = true;
    elements.download.disabled = true;
    return;
  }

  currentTable = matchingRows();
  buildTableHead();
  const fragment = document.createDocumentFragment();
  for (const row of currentTable) fragment.append(buildTableRow(row));
  elements.tableBody.replaceChildren(fragment);

  elements.tableScroll.hidden = currentTable.length === 0;
  elements.empty.hidden = currentTable.length !== 0;
  elements.download.disabled = currentTable.length === 0;
  elements.empty.textContent = "Select at least one series to build the table.";
  elements.status.textContent = currentTable.length
    ? `${currentTable.length.toLocaleString()} ${currentTable.length === 1 ? "row" : "rows"} · ${visibleYears.length} academic ${visibleYears.length === 1 ? "year" : "years"}`
    : "";
  elements.tableSummary.textContent = `${activeDataset.title} · ${visibleYears[0].label}–${visibleYears.at(-1).label} · ${activeDataset.unit}`;
  elements.tableTitle.textContent = activeDataset.title;
  renderChart();
}

function updateYearBounds(changed) {
  const fromIndex = activeDataset.years.findIndex((year) => year.label === elements.from.value);
  const toIndex = activeDataset.years.findIndex((year) => year.label === elements.to.value);
  if (fromIndex > toIndex) {
    if (changed === elements.from) elements.to.value = elements.from.value;
    else elements.from.value = elements.to.value;
  }
  renderTable();
}

function downloadCsv() {
  const changeLabel = activeDataset.format === "percent" ? "Change (pp)" : "Change";
  const headings = [
    activeDataset.rows.length > 80 ? "School" : "Series",
    ...visibleYears.map((year) => year.label),
    changeLabel,
  ];
  if (activeDataset.format !== "percent") headings.push("% change");
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [headings.map(csvCell)];
  for (const row of currentTable) {
    const values = valuesForRow(row);
    const change = rowChange(row);
    const cells = [
      row.label,
      ...values.map((value) => Number.isFinite(value) ? value : ""),
      Number.isFinite(change) ? change : "",
    ];
    if (activeDataset.format !== "percent") {
      const first = values[0];
      cells.push(Number.isFinite(first) && first !== 0 && Number.isFinite(change)
        ? `${change > 0 ? "+" : ""}${percentageFormat.format((change / first) * 100)}%`
        : "—");
    }
    rows.push(cells.map(csvCell));
  }
  const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `northern-ireland-${activeDataset.id}-trends.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function populateYears() {
  appendOptions(elements.from, activeDataset.years.map((year) => ({
    value: year.label,
    label: year.label,
  })));
  appendOptions(elements.to, activeDataset.years.map((year) => ({
    value: year.label,
    label: year.label,
  })));
  elements.from.value = activeDataset.years[0].label;
  elements.to.value = activeDataset.years.at(-1).label;
}

function renderNotes() {
  const notes = document.querySelector("#source-notes");
  const fragment = document.createDocumentFragment();
  for (const note of activeDataset.notes ?? []) {
    const item = document.createElement("li");
    item.textContent = note;
    fragment.append(item);
  }
  notes.replaceChildren(fragment);
}

function selectDataset() {
  activeDataset = datasets.find((dataset) => dataset.id === elements.dataset.value);
  if (!activeDataset?.years.length || !activeDataset.rows.length) {
    throw new Error("The selected Department dataset has no data.");
  }
  populateYears();
  renderMetricOptions();
  renderGroupOptions();
  renderSeriesOptions();
  renderSourceLinks();
  renderNotes();
  renderTable();
}

async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`The school trends data request failed (${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data.datasets) || !data.datasets.length) {
    throw new Error("The school trends data file has an invalid format.");
  }
  datasets = data.datasets.filter((dataset) =>
    Array.isArray(dataset.years) && dataset.years.length &&
    Array.isArray(dataset.rows) && dataset.rows.length
  );
  if (!datasets.length) throw new Error("The Department data contains no usable time series.");
  renderDatasetOptions();
  for (const control of [elements.dataset, elements.from, elements.to, elements.search, elements.sort, elements.download]) {
    control.disabled = false;
  }
  elements.dataset.value = datasets[0].id;
  document.querySelector("#snapshot-date").textContent = `Data snapshot: ${data.snapshotDate}.`;
  selectDataset();
}

elements.dataset.addEventListener("change", selectDataset);
elements.metric.addEventListener("change", renderTable);
elements.group.addEventListener("change", renderTable);
elements.from.addEventListener("change", () => updateYearBounds(elements.from));
elements.to.addEventListener("change", () => updateYearBounds(elements.to));
elements.options.addEventListener("change", renderTable);
elements.search.addEventListener("input", renderTable);
elements.sort.addEventListener("change", renderTable);
document.querySelector("#select-all").addEventListener("click", () => {
  for (const checkbox of elements.options.querySelectorAll("input")) checkbox.checked = true;
  renderTable();
});
document.querySelector("#select-none").addEventListener("click", () => {
  for (const checkbox of elements.options.querySelectorAll("input")) checkbox.checked = false;
  renderTable();
});
elements.download.addEventListener("click", downloadCsv);

loadData().catch((error) => {
  console.error("Could not load school trends:", error);
  elements.status.textContent = error.message;
  elements.tableSummary.textContent = "The Department's data is unavailable.";
});
