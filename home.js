async function loadSchoolCounts() {
  const response = await fetch("./data/schools.json");
  if (!response.ok) throw new Error(`School data request failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.schools)) throw new Error("School data has an invalid format");

  const schools = data.schools;
  const primary = schools.filter((school) => school.phase === "Primary").length;
  const postPrimary = schools.filter((school) => school.phase === "Post-primary").length;
  document.querySelector("#school-total").textContent = schools.length.toLocaleString();
  document.querySelector("#primary-total").textContent = primary.toLocaleString();
  document.querySelector("#post-primary-total").textContent = postPrimary.toLocaleString();
}

loadSchoolCounts().catch((error) => {
  console.error("Could not load school counts:", error);
  document.querySelector(".home-stats").setAttribute("aria-label", "School counts are unavailable");
});
