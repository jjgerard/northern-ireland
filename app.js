const DATA_URL = "./data/schools.json";
const NI_VIEW = { center: [54.62, -6.72], zoom: 8 };

const elements = {
  search: document.querySelector("#search"),
  phase: document.querySelector("#phase-filter"),
  type: document.querySelector("#type-filter"),
  management: document.querySelector("#management-filter"),
  area: document.querySelector("#area-filter"),
  reset: document.querySelector("#reset-filters"),
  count: document.querySelector("#result-count"),
  list: document.querySelector("#school-list"),
  empty: document.querySelector("#empty-state"),
  status: document.querySelector("#map-status"),
};

const map = L.map("map", { zoomControl: false, scrollWheelZoom: true }).setView(NI_VIEW.center, NI_VIEW.zoom);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const markerGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 34,
  spiderfyOnMaxZoom: true,
});
map.addLayer(markerGroup);

let schools = [];
let markers = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function uniqueValues(key) {
  return [...new Set(schools.map((school) => school[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function addOptions(select, values) {
  const fragment = document.createDocumentFragment();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.append(option);
  }
  select.append(fragment);
}

function schoolMatches(school, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const searchable = [
    school.name,
    school.town,
    school.postcode,
    school.schoolType,
    school.managementType,
    school.area,
  ].join(" ").toLocaleLowerCase();
  return terms.every((term) => searchable.includes(term));
}

function getVisibleSchools() {
  const query = elements.search.value;
  return schools.filter((school) =>
    (!elements.phase.value || school.phase === elements.phase.value) &&
    (!elements.type.value || school.schoolType === elements.type.value) &&
    (!elements.management.value || school.managementType === elements.management.value) &&
    (!elements.area.value || school.area === elements.area.value) &&
    schoolMatches(school, query)
  );
}

function createSchoolPopup(school) {
  const address = [school.address, school.town, school.postcode].filter(Boolean).join(", ");
  const mapsQuery = [school.name, address, "Northern Ireland"].filter(Boolean).join(", ");
  const destination = school.websiteUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  const linkLabel = school.websiteUrl ? "Visit school website" : "View location in Google Maps";
  const popup = document.createElement("article");
  popup.className = "school-popup";
  popup.innerHTML = `
    <p class="popup-kicker">${escapeHtml(school.phase)} · ${escapeHtml(school.schoolType)}</p>
    <h3>${escapeHtml(school.name)}</h3>
    <p>${escapeHtml(address)}<br>${escapeHtml(school.managementType)}</p>
    <a href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer">${linkLabel} <span aria-hidden="true">↗</span></a>
  `;
  return popup;
}

function makeMarker(school) {
  const phaseClass = school.phase === "Primary" ? "primary" :
    school.phase === "Post-primary" ? "post-primary" : "independent";
  const marker = L.marker([school.latitude, school.longitude], {
    icon: L.divIcon({
      className: `school-marker ${phaseClass}`,
      html: "<span></span>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
    title: school.name,
    alt: school.name,
  });
  marker.bindTooltip(school.name, { direction: "top", sticky: true, opacity: 0.96 });
  marker.bindPopup(() => createSchoolPopup(school), { minWidth: 205, maxWidth: 280 });
  return marker;
}

function renderSchoolList(visible) {
  const fragment = document.createDocumentFragment();
  for (const school of visible) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "school-row";
    button.setAttribute("aria-label", `Locate ${school.name}, ${school.town}`);

    const dot = document.createElement("i");
    const phaseClass = school.phase === "Primary" ? "" :
      school.phase === "Post-primary" ? " post-primary" : " independent";
    dot.className = `row-dot${phaseClass}`;
    dot.setAttribute("aria-hidden", "true");
    const content = document.createElement("span");
    content.className = "row-content";
    const name = document.createElement("span");
    name.className = "row-name";
    name.textContent = school.name;
    const meta = document.createElement("span");
    meta.className = "row-meta";
    meta.textContent = `${school.schoolType} · ${school.town}`;
    content.append(name, meta);
    button.append(dot, content);
    button.addEventListener("click", () => focusSchool(school));
    item.append(button);
    fragment.append(item);
  }

  elements.list.replaceChildren(fragment);
  elements.count.textContent = `${visible.length.toLocaleString()} of ${schools.length.toLocaleString()}`;
  elements.empty.hidden = visible.length !== 0;
}

function focusSchool(school) {
  const marker = markers.get(school.id);
  if (!marker) return;
  markerGroup.zoomToShowLayer(marker, () => {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13), { animate: true });
    marker.openPopup();
  });
}

function render() {
  const visible = getVisibleSchools();
  markerGroup.clearLayers();
  for (const school of visible) markerGroup.addLayer(markers.get(school.id));
  renderSchoolList(visible);
  elements.status.textContent = `${visible.length.toLocaleString()} schools shown`;
}

function resetFilters() {
  elements.search.value = "";
  elements.phase.value = "";
  elements.type.value = "";
  elements.management.value = "";
  elements.area.value = "";
  render();
}

async function loadSchools() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`School data request failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.schools) || data.schools.length === 0) {
    throw new Error("The school data file is empty or has an invalid format");
  }

  schools = data.schools.filter((school) =>
    school.id && school.name && Number.isFinite(school.latitude) && Number.isFinite(school.longitude)
  );
  if (schools.length !== data.schools.length) {
    throw new Error(`Some school records have missing locations (${data.schools.length - schools.length})`);
  }

  addOptions(elements.phase, uniqueValues("phase"));
  addOptions(elements.type, uniqueValues("schoolType"));
  addOptions(elements.management, uniqueValues("managementType"));
  addOptions(elements.area, uniqueValues("area"));

  for (const school of schools) markers.set(school.id, makeMarker(school));
  document.querySelector(".sidebar-footer p").firstChild.textContent =
    `Locations are approximate (${data.locationMethod}). `;
  render();
}

for (const control of [elements.search, elements.phase, elements.type, elements.management, elements.area]) {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
}
elements.reset.addEventListener("click", resetFilters);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});

loadSchools().catch((error) => {
  console.error("Could not load school locations:", error);
  elements.status.textContent = "School locations could not be loaded";
  elements.count.textContent = "Unavailable";
  elements.empty.hidden = false;
  elements.empty.textContent = error.message;
});
