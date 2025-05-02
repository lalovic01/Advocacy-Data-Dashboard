document.addEventListener("DOMContentLoaded", function () {
  const serbiaMapContainer = document.getElementById("serbia-map");
  if (!serbiaMapContainer) return;

  if (serbiaMapContainer.querySelector("svg")) return;

  fetch("serbia.svg").catch((error) => {
    console.warn("Could not fetch serbia.svg, using embedded SVG fallback");

    serbiaMapContainer.innerHTML =
      "<p>Map could not be loaded. Please make sure serbia.svg is available.</p>";
  });
});
