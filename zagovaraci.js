let zagovarackeData = null;
let filteredData = [];
let charts = {};
let activeDistrict = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM učitan, provera obaveznih elemenata...");

  const okrugFilter = document.getElementById("okrug-filter");
  const periodFilter = document.getElementById("period-filter");
  const statusFilter = document.getElementById("status-filter");
  const fokusFilter = document.getElementById("fokus-filter");
  const nivoFilter = document.getElementById("nivo-filter");
  const odgovorFilter = document.getElementById("odgovor-filter");
  const applyFiltersBtn = document.getElementById("apply-filters");
  const resetFiltersBtn = document.getElementById("reset-filters");
  const serbiaMapContainer = document.getElementById("serbia-map");

  const totalInitiatives = document.getElementById("total-initiatives");
  const activeOrganizations = document.getElementById("active-organizations");
  const receivedResponses = document.getElementById("received-responses");
  const positiveResponses = document.getElementById("positive-responses");

  const initiativesTable = document.getElementById("initiatives-table");
  const initiativesBody = document.getElementById("initiatives-body");

  const modal = document.getElementById("initiative-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.querySelector(".close");

  window.okrugFilter = okrugFilter;
  window.periodFilter = periodFilter;
  window.statusFilter = statusFilter;
  window.fokusFilter = fokusFilter;
  window.nivoFilter = nivoFilter;
  window.odgovorFilter = odgovorFilter;
  window.totalInitiatives = totalInitiatives;
  window.activeOrganizations = activeOrganizations;
  window.receivedResponses = receivedResponses;
  window.positiveResponses = positiveResponses;
  window.initiativesTable = initiativesTable;
  window.initiativesBody = initiativesBody;
  window.modal = modal;
  window.modalTitle = modalTitle;
  window.modalContent = modalContent;
  window.serbiaMapContainer = serbiaMapContainer;

  if (!checkRequiredElements()) {
    console.error(
      "Aplikacija ne može da se inicijalizuje zbog nedostajućih elemenata."
    );
    return;
  }

  console.log("Svi elementi pronađeni, inicijalizujem aplikaciju...");

  loadSerbiaMap();

  loadData(initiativesTable);

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", applyFilters);
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      resetFilters();
      resetMapSelection();
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (modal) {
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }
});

function checkRequiredElements() {
  const requiredElements = [
    { id: "okrug-filter", name: "Filter okruga" },
    { id: "period-filter", name: "Filter perioda" },
    { id: "status-filter", name: "Filter statusa" },
    { id: "fokus-filter", name: "Filter fokusa" },
    { id: "nivo-filter", name: "Filter nivoa" },
    { id: "odgovor-filter", name: "Filter odgovora" },
    { id: "initiatives-table", name: "Tabela inicijativa" },
    { id: "focus-chart", name: "Grafikon fokusa" },
    { id: "level-chart", name: "Grafikon nivoa" },
    { id: "status-chart", name: "Grafikon statusa" },
    { id: "period-chart", name: "Grafikon perioda" },
    { id: "region-chart", name: "Grafikon regiona" },
  ];

  let missingElements = [];

  requiredElements.forEach((elem) => {
    if (!document.getElementById(elem.id)) {
      missingElements.push(elem.name);
    }
  });

  if (missingElements.length > 0) {
    console.error("Nedostaju sledeći elementi u HTML-u:", missingElements);
    alert("Nedostaju elementi u HTML strukturi: " + missingElements.join(", "));
    return false;
  }

  return true;
}

function setupTable(initiativesTable) {
  if (!initiativesTable) {
    console.error("Tabela nije pronađena u DOM-u!");
    return;
  }

  let tableHead = initiativesTable.querySelector("thead");
  if (!tableHead) {
    tableHead = document.createElement("thead");
    initiativesTable.appendChild(tableHead);
  }

  tableHead.innerHTML = `
        <tr>
            <th>Organizacija</th>
            <th>Naziv inicijative</th>
            <th>Fokus</th>
            <th>Status</th>
            <th>Nivo</th>
            <th>Period</th>
            <th>Odgovor</th>
            <th>Detalji</th>
        </tr>
    `;
}

async function loadData(initiativesTable) {
  try {
    console.log("Pokušavam učitati podatke...");
    const response = await fetch("zagovaracke.json");
    if (!response.ok) {
      throw new Error(`HTTP greška: ${response.status}`);
    }

    const text = await response.text();
    try {
      const cleanText = text.replace(/^\uFEFF/, "").replace(/\/\/.*/g, "");
      zagovarackeData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      alert("JSON format nije ispravan");
      return;
    }

    if (!zagovarackeData.nodes) {
      throw new Error("Nedostaje 'nodes' property u JSON-u");
    }

    processData();

    if (filteredData.length === 0) {
      console.warn("Nije pronađena nijedna inicijativa u podacima");
    } else {
      console.log(`Pronađeno ${filteredData.length} inicijativa`);
    }

    setupTable(initiativesTable);
    populateFilters();

    if (window.serbiaMapContainer?.innerHTML) {
      setupMapInteractivity();
    }

    updateUI();
  } catch (error) {
    console.error("Greška pri učitavanju podataka:", error);
    alert("Došlo je do greške pri učitavanju podataka: " + error.message);
  }
}

function diagnoseJsonStructure() {
  if (!zagovarackeData || !zagovarackeData.nodes) {
    console.error("JSON podaci nisu pravilno učitani");
    return;
  }

  const nodes = zagovarackeData.nodes;
  const organizationCount = Object.keys(nodes).length;
  console.log(`Ukupno organizacija u JSON-u: ${organizationCount}`);

  const sampleOrgs = Object.keys(nodes).slice(0, 3);
  sampleOrgs.forEach((orgName) => {
    const orgData = nodes[orgName];
    console.log(`Organizacija: ${orgName}`);
    console.log(`Okrug:`, orgData.Okrug);
    console.log(`Period:`, orgData.Period);
    console.log(
      `Započeli inicijativu:`,
      orgData[
        "Započeli sa sprovođenjem neke zagovaračke inicijative u izveštajnom periodu"
      ]
    );
    console.log(
      `Broj inicijativa:`,
      orgData[
        "Koliko ste ukupno zagovaračkih inicijativa sprovodili u izveštajnom periodu"
      ]
    );
    console.log(
      `Naziv inicijative-1:`,
      orgData["Naziv zagovaračke inicijative - 1"]
    );
    console.log("-----------------------");
  });
}

function processData() {
  filteredData = [];
  if (!zagovarackeData || !zagovarackeData.nodes) {
    console.error("JSON podaci nisu dostupni ili su pogrešnog formata");
    return;
  }

  const nodes = zagovarackeData.nodes;

  for (const [orgName, orgData] of Object.entries(nodes)) {
    if (!orgData) continue;

    Object.keys(orgData.Period || {}).forEach((key) => {
      const zapoceliIniciativu =
        (
          orgData[
            "Započeli sa sprovođenjem neke zagovaračke inicijative u izveštajnom periodu?"
          ]?.[key] || ""
        ).trim() === "Da";
      const brojIniciativaStr = (
        orgData[
          "Koliko ste ukupno zagovaračkih inicijativa sprovodili u izveštajnom periodu?"
        ]?.[key] || ""
      ).trim();
      let brojIniciativa = brojIniciativaStr ? parseInt(brojIniciativaStr) : 0;

      if (zapoceliIniciativu && brojIniciativa === 0) {
        brojIniciativa = 1;
      }

      if (brojIniciativa > 0 || zapoceliIniciativu) {
        for (let i = 1; i <= Math.min(brojIniciativa || 1, 5); i++) {
          const suffix = i > 1 ? ` - ${i}` : " - 1";

          const nazivField = `Naziv zagovaračke inicijative${suffix}`;
          const nivoField = `Nivo donosilaca odluka prema kome je ova zagovaračka inicijativa upućena?${suffix}`;
          const drugoNivoField = `Drugo - Nivo donosilaca odluka${suffix}`;
          const institucijaField = `Naziv institucije kojoj je incijativa upućena?${suffix}`;
          const statusField = `Trenutni status inicijative${suffix}`;
          const fokusField = `Fokus inicijative${suffix}`;
          const drugoFokusField = `Drugo - Fokus inicijative${suffix}`;
          const odgovorPrimljenField = `Da li ste u izveštajnom periodu primili neki odgovor od donosilaca odluka kojima ste inicijativu uputili?${suffix}`;
          const kakavOdgovorField = `Kakav odgovor ste primili od strane donosilaca odluka?${suffix}`;
          const drugoOdgovorField = `Drugo${suffix}`;

          const naziv = (orgData[nazivField]?.[key] || "").trim();
          const nivo = (orgData[nivoField]?.[key] || "").trim();
          const drugoNivo = (orgData[drugoNivoField]?.[key] || "").trim();
          const institucija = (orgData[institucijaField]?.[key] || "").trim();
          const status = (orgData[statusField]?.[key] || "").trim();
          const fokus = (orgData[fokusField]?.[key] || "").trim();
          const drugoFokus = (orgData[drugoFokusField]?.[key] || "").trim();
          const odgovorPrimljen = (
            orgData[odgovorPrimljenField]?.[key] || ""
          ).trim();
          const kakavOdgovor = (orgData[kakavOdgovorField]?.[key] || "").trim();
          const drugoOdgovor = (orgData[drugoOdgovorField]?.[key] || "").trim();

          const initiative = {
            organization: orgName.trim(),
            okrug: (orgData.Okrug?.[key] || "Nepoznat okrug").trim(),
            period: (orgData.Period?.[key] || "").trim(),
            naziv: naziv || `Inicijativa ${i} (${orgName})`,
            nivo: nivo || "Nepoznato",
            drugoNivo: drugoNivo || "",
            institucija: institucija || "Nepoznato",
            status: status || "Nepoznato",
            fokus: fokus || "Nepoznato",
            drugoFokus: drugoFokus || "",
            odgovorPrimljen: odgovorPrimljen || "Nepoznato",
            kakavOdgovor: kakavOdgovor || "Nepoznato",
            drugoOdgovor: drugoOdgovor || "",
          };

          filteredData.push(initiative);
        }
      }
    });
  }

  console.log(`Ukupno obrađeno ${filteredData.length} inicijativa`);
  return filteredData;
}

function populateFilters() {
  const nivoOptions = [
    "Lokalnim donosiocima odluka",
    "Nacionalnim donosiocima odluka",
    "Drugo (navedite)",
  ];

  const statusOptions = [
    "Definisana (određen cilj i razrađen plan zagovaranja)",
    "Pokrenuta (javno objavljeno da se počinje sa zagovaranjem)",
    "Baza podrške upoznata sa inicijativom",
    "Inicijativa formalno predstavljena/dostavljena donosiocima odluka",
    "Inicijativa medijski prezentovana (društvene mreže i/ili tradicionalni mediji)",
  ];

  const fokusOptions = [
    "Obrazovanje",
    "Zaštita životne sredine",
    "Socijalna inkluzija i ranjive grupe",
    "Decentralizacija",
    "Poljoprivreda",
    "Antikorupcija",
    "Zdravstvo",
    "Ljudska i građanska prava",
    "Dobro upravljanje",
    "Ekonomija i zapošljavanje",
    "Mladi",
    "Evropske integracije",
    "Rodna ravnopravnost",
    "Spoljna i bezbednosna politika",
    "Drugo",
  ];

  const odgovorOptions = ["Da", "Ne"];

  if (window.nivoFilter) {
    window.nivoFilter.innerHTML =
      '<option value="all">Svi nivoi</option>' +
      nivoOptions
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
  }

  if (window.statusFilter) {
    window.statusFilter.innerHTML =
      '<option value="all">Svi statusi</option>' +
      statusOptions
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
  }

  if (window.fokusFilter) {
    window.fokusFilter.innerHTML =
      '<option value="all">Svi fokusi</option>' +
      fokusOptions
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
  }

  if (window.odgovorFilter) {
    window.odgovorFilter.innerHTML =
      '<option value="all">Svi odgovori</option>' +
      odgovorOptions
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
  }

  const okruzi = new Set();
  const periodi = new Set();

  if (zagovarackeData && zagovarackeData.nodes) {
    for (const orgData of Object.values(zagovarackeData.nodes)) {
      if (orgData && orgData.Okrug) {
        Object.values(orgData.Okrug).forEach((okrug) => {
          if (okrug) okruzi.add(okrug.replace(/\n/g, "").trim());
        });
      }
      if (orgData && orgData.Period) {
        Object.values(orgData.Period).forEach((period) => {
          if (period) periodi.add(period);
        });
      }
    }
  }

  if (window.okrugFilter) {
    window.okrugFilter.innerHTML =
      '<option value="all">Svi okruzi</option>' +
      [...okruzi]
        .sort()
        .map((okrug) => `<option value="${okrug}">${okrug}</option>`)
        .join("");
  }

  if (window.periodFilter) {
    window.periodFilter.innerHTML =
      '<option value="all">Svi periodi</option>' +
      [...periodi]
        .sort()
        .map((period) => `<option value="${period}">${period}</option>`)
        .join("");
  }
}

function applyFilters() {
  console.log("Applying filters...");

  const selectedPeriod = window.periodFilter.value.trim();
  const selectedOkrug = window.okrugFilter.value.trim();
  const selectedStatus = window.statusFilter.value.trim();
  const selectedFokus = window.fokusFilter.value.trim();
  const selectedNivo = window.nivoFilter.value.trim();
  const selectedOdgovor = window.odgovorFilter.value.trim();

  console.log("Selected filters:", {
    period: selectedPeriod,
    okrug: selectedOkrug,
    status: selectedStatus,
    fokus: selectedFokus,
    nivo: selectedNivo,
    odgovor: selectedOdgovor,
  });

  processData();

  filteredData = filteredData.filter((initiative) => {
    if (selectedPeriod !== "all" && initiative.period !== selectedPeriod)
      return false;

    if (selectedOkrug !== "all" && initiative.okrug !== selectedOkrug)
      return false;

    if (selectedStatus !== "all" && initiative.status !== selectedStatus)
      return false;

    if (selectedFokus !== "all" && initiative.fokus !== selectedFokus)
      return false;

    if (selectedNivo !== "all" && initiative.nivo !== selectedNivo)
      return false;

    if (
      selectedOdgovor !== "all" &&
      initiative.odgovorPrimljen !== selectedOdgovor
    )
      return false;

    return true;
  });

  console.log(`Filtered to ${filteredData.length} initiatives`);
  updateUI();
}

function resetFilters() {
  window.periodFilter.value = "all";
  window.okrugFilter.value = "all";
  window.statusFilter.value = "all";
  window.fokusFilter.value = "all";
  window.nivoFilter.value = "all";
  window.odgovorFilter.value = "all";

  processData();
  updateUI();
  resetMapSelection();
}

function updateUI() {
  updateStats();
  updateCharts();
  updateTable();
}

function updateStats() {
  if (window.totalInitiatives) {
    window.totalInitiatives.textContent = filteredData.length;
  }

  if (window.activeOrganizations) {
    const activeOrgs = new Set(filteredData.map((i) => i.organization)).size;
    window.activeOrganizations.textContent = activeOrgs;
  }

  if (window.receivedResponses) {
    const responses = filteredData.filter(
      (i) => i.odgovorPrimljen === "Da"
    ).length;
    window.receivedResponses.textContent = responses;
  }

  if (window.positiveResponses) {
    const positive = filteredData.filter(
      (i) => i.kakavOdgovor && i.kakavOdgovor.includes("pozitivan")
    ).length;
    window.positiveResponses.textContent = positive;
  }
}

function updateCharts() {
  if (typeof Chart === "undefined") {
    console.error(
      "Chart.js nije dostupan! Dodajte <script src='https://cdn.jsdelivr.net/npm/chart.js'></script> u vaš HTML."
    );
    return;
  }

  const focusChartElement = document.getElementById("focus-chart");
  const levelChartElement = document.getElementById("level-chart");
  const statusChartElement = document.getElementById("status-chart");
  const periodChartElement = document.getElementById("period-chart");
  const regionChartElement = document.getElementById("region-chart");

  if (focusChartElement) {
    updateFocusChart();
  }

  if (levelChartElement) {
    updateLevelChart();
  }

  if (statusChartElement) {
    updateStatusChart();
  }

  if (periodChartElement) {
    updatePeriodChart();
  }

  if (regionChartElement) {
    updateRegionChart();
  }
}

function updateFocusChart() {
  try {
    const focusData = {};
    filteredData.forEach((initiative) => {
      const fokus =
        initiative.fokus === "Drugo" && initiative.fokusOther
          ? "Drugo: " + initiative.fokusOther.substring(0, 20) + "..."
          : initiative.fokus || "Nepoznato";

      focusData[fokus] = (focusData[fokus] || 0) + 1;
    });

    const labels = Object.keys(focusData);
    const data = Object.values(focusData);
    const backgroundColors = generateColors(labels.length);

    if (charts.focusChart) {
      charts.focusChart.destroy();
    }

    const ctx = document.getElementById("focus-chart").getContext("2d");
    charts.focusChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 15,
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Greška pri ažuriranju focus chart-a:", error);
  }
}

function updateLevelChart() {
  try {
    const levelData = {};
    filteredData.forEach((initiative) => {
      const nivo = initiative.nivo || "Nepoznato";
      levelData[nivo] = (levelData[nivo] || 0) + 1;
    });

    const labels = Object.keys(levelData);
    const data = Object.values(levelData);
    const backgroundColors = generateColors(labels.length);

    if (charts.levelChart) {
      charts.levelChart.destroy();
    }

    const ctx = document.getElementById("level-chart").getContext("2d");
    charts.levelChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 15,
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Greška pri ažuriranju level chart-a:", error);
  }
}

function updateStatusChart() {
  try {
    const statusData = {};
    filteredData.forEach((initiative) => {
      let status = "Nepoznato";
      if (initiative.status.includes("Definisana")) {
        status = "Definisana";
      } else if (initiative.status.includes("Pokrenuta")) {
        status = "Pokrenuta";
      } else if (initiative.status.includes("Baza podrške")) {
        status = "Baza podrške";
      } else if (initiative.status.includes("formalno predstavljena")) {
        status = "Formalno predstavljena";
      } else if (initiative.status.includes("medijski prezentovana")) {
        status = "Medijski prezentovana";
      }

      statusData[status] = (statusData[status] || 0) + 1;
    });

    const labels = Object.keys(statusData);
    const data = Object.values(statusData);
    const backgroundColors = generateColors(labels.length);

    if (charts.statusChart) {
      charts.statusChart.destroy();
    }

    const ctx = document.getElementById("status-chart").getContext("2d");
    charts.statusChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Broj inicijativa",
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Greška pri ažuriranju status chart-a:", error);
  }
}

function updatePeriodChart() {
  try {
    const periodData = {
      "I kvartal": 0,
      "II kvartal": 0,
    };

    filteredData.forEach((initiative) => {
      if (periodData.hasOwnProperty(initiative.period)) {
        periodData[initiative.period]++;
      }
    });

    const labels = Object.keys(periodData);
    const data = Object.values(periodData);
    const backgroundColors = ["#3498db", "#e74c3c"];

    if (charts.periodChart) {
      charts.periodChart.destroy();
    }

    const ctx = document.getElementById("period-chart").getContext("2d");
    charts.periodChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Broj inicijativa",
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Greška pri ažuriranju period chart-a:", error);
  }
}

function updateRegionChart() {
  try {
    const regionData = {};
    filteredData.forEach((initiative) => {
      const region = initiative.okrug || "Nepoznato";
      regionData[region] = (regionData[region] || 0) + 1;
    });

    const sortedRegions = Object.entries(regionData)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const labels = Object.keys(sortedRegions);
    const data = Object.values(sortedRegions);
    const backgroundColors = generateColors(labels.length);

    if (charts.regionChart) {
      charts.regionChart.destroy();
    }

    const ctx = document.getElementById("region-chart").getContext("2d");
    charts.regionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Broj inicijativa",
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Greška pri ažuriranju region chart-a:", error);
  }
}

function updateTable() {
  if (window.initiativesBody) {
    window.initiativesBody.innerHTML = "";

    if (filteredData.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.textContent = "Nema podataka za izabrane filtere";
      cell.style.textAlign = "center";
      row.appendChild(cell);
      window.initiativesBody.appendChild(row);
      return;
    }

    filteredData.forEach((initiative, index) => {
      const row = document.createElement("tr");

      const cellOrg = document.createElement("td");
      cellOrg.textContent = initiative.organization;
      row.appendChild(cellOrg);

      const cellNaziv = document.createElement("td");
      cellNaziv.textContent = truncateText(initiative.naziv, 40);
      cellNaziv.title = initiative.naziv;
      row.appendChild(cellNaziv);

      const cellFokus = document.createElement("td");
      cellFokus.textContent = initiative.fokus || "Nepoznato";
      row.appendChild(cellFokus);

      const cellStatus = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = "status-badge";
      let statusText = "Nepoznat";

      if (initiative.status && initiative.status.includes("Definisana")) {
        statusBadge.classList.add("status-defined");
        statusText = "Definisana";
      } else if (initiative.status && initiative.status.includes("Pokrenuta")) {
        statusBadge.classList.add("status-launched");
        statusText = "Pokrenuta";
      } else if (
        initiative.status &&
        initiative.status.includes("Baza podrške")
      ) {
        statusBadge.classList.add("status-support");
        statusText = "Baza podrške";
      } else if (
        initiative.status &&
        initiative.status.includes("formalno predstavljena")
      ) {
        statusBadge.classList.add("status-presented");
        statusText = "Predstavljena";
      } else if (
        initiative.status &&
        initiative.status.includes("medijski prezentovana")
      ) {
        statusBadge.classList.add("status-media");
        statusText = "Medijski";
      }

      statusBadge.textContent = statusText;
      cellStatus.appendChild(statusBadge);
      row.appendChild(cellStatus);

      const cellNivo = document.createElement("td");
      let nivoText = initiative.nivo || "Nepoznato";
      if (nivoText.includes("Lokalnim")) {
        nivoText = "Lokalni";
      } else if (nivoText.includes("Nacionalnim")) {
        nivoText = "Nacionalni";
      }
      cellNivo.textContent = nivoText;
      row.appendChild(cellNivo);

      const cellPeriod = document.createElement("td");
      cellPeriod.textContent = initiative.period;
      row.appendChild(cellPeriod);

      const cellOdgovor = document.createElement("td");
      const odgovorBadge = document.createElement("span");
      odgovorBadge.className = "response-badge";

      if (initiative.odgovorPrimljen === "Da") {
        odgovorBadge.classList.add("response-yes");

        if (
          initiative.kakavOdgovor &&
          initiative.kakavOdgovor.includes("pozitivan")
        ) {
          odgovorBadge.textContent = "Pozitivan";
        } else if (
          initiative.kakavOdgovor &&
          initiative.kakavOdgovor.includes("negativan")
        ) {
          odgovorBadge.textContent = "Negativan";
        } else {
          odgovorBadge.textContent = "Drugo";
        }
      } else {
        odgovorBadge.classList.add("response-no");
        odgovorBadge.textContent = "Ne";
      }

      cellOdgovor.appendChild(odgovorBadge);
      row.appendChild(cellOdgovor);

      const cellDetalji = document.createElement("td");
      const btnDetalji = document.createElement("button");
      btnDetalji.className = "btn-details";
      btnDetalji.textContent = "Detalji";
      btnDetalji.dataset.index = index;
      btnDetalji.addEventListener("click", () => showDetails(index));
      cellDetalji.appendChild(btnDetalji);
      row.appendChild(cellDetalji);

      window.initiativesBody.appendChild(row);
    });
  } else {
    console.error("Element initiativesBody nije pronađen!");
  }
}

function showDetails(index) {
  if (!window.modal) {
    console.error("Modal element nije pronađen!");
    return;
  }

  const initiative = filteredData[index];

  window.modalTitle.textContent = initiative.naziv;

  const content = document.createElement("dl");
  content.className = "modal-info";

  const dtOrg = document.createElement("dt");
  dtOrg.textContent = "Organizacija:";
  const ddOrg = document.createElement("dd");
  ddOrg.textContent = initiative.organization;
  content.appendChild(dtOrg);
  content.appendChild(ddOrg);

  const dtOkrug = document.createElement("dt");
  dtOkrug.textContent = "Okrug:";
  const ddOkrug = document.createElement("dd");
  ddOkrug.textContent = initiative.okrug;
  content.appendChild(dtOkrug);
  content.appendChild(ddOkrug);

  const dtPeriod = document.createElement("dt");
  dtPeriod.textContent = "Period:";
  const ddPeriod = document.createElement("dd");
  ddPeriod.textContent = initiative.period;
  content.appendChild(dtPeriod);
  content.appendChild(ddPeriod);

  const dtNivo = document.createElement("dt");
  dtNivo.textContent = "Nivo donosilaca odluka:";
  const ddNivo = document.createElement("dd");
  ddNivo.textContent = initiative.nivo;
  content.appendChild(dtNivo);
  content.appendChild(ddNivo);

  if (initiative.nivo === "Drugo (navedite)" && initiative.drugoNivo) {
    const dtDrugoNivo = document.createElement("dt");
    dtDrugoNivo.textContent = "Drugo - nivo donosilaca odluka:";
    const ddDrugoNivo = document.createElement("dd");
    ddDrugoNivo.textContent = initiative.drugoNivo;
    content.appendChild(dtDrugoNivo);
    content.appendChild(ddDrugoNivo);
  }

  if (initiative.institucija) {
    const dtInst = document.createElement("dt");
    dtInst.textContent = "Institucija kojoj je upućena:";
    const ddInst = document.createElement("dd");
    ddInst.textContent = initiative.institucija;
    content.appendChild(dtInst);
    content.appendChild(ddInst);
  }

  const dtStatus = document.createElement("dt");
  dtStatus.textContent = "Status inicijative:";
  const ddStatus = document.createElement("dd");
  ddStatus.textContent = initiative.status;
  content.appendChild(dtStatus);
  content.appendChild(ddStatus);

  const dtFokus = document.createElement("dt");
  dtFokus.textContent = "Fokus inicijative:";
  const ddFokus = document.createElement("dd");
  ddFokus.textContent = initiative.fokus;
  content.appendChild(dtFokus);
  content.appendChild(ddFokus);

  if (initiative.fokus === "Drugo" && initiative.drugoFokus) {
    const dtDrugoFokus = document.createElement("dt");
    dtDrugoFokus.textContent = "Drugo - fokus inicijative:";
    const ddDrugoFokus = document.createElement("dd");
    ddDrugoFokus.textContent = initiative.drugoFokus;
    content.appendChild(dtDrugoFokus);
    content.appendChild(ddDrugoFokus);
  }

  const dtOdgovor = document.createElement("dt");
  dtOdgovor.textContent = "Primljen odgovor:";
  const ddOdgovor = document.createElement("dd");
  ddOdgovor.textContent = initiative.odgovorPrimljen;
  content.appendChild(dtOdgovor);
  content.appendChild(ddOdgovor);

  if (initiative.odgovorPrimljen === "Da") {
    const dtKakavOdg = document.createElement("dt");
    dtKakavOdg.textContent = "Vrsta odgovora:";
    const ddKakavOdg = document.createElement("dd");
    ddKakavOdg.textContent = initiative.kakavOdgovor;
    content.appendChild(dtKakavOdg);
    content.appendChild(ddKakavOdg);

    if (initiative.kakavOdgovor === "Drugo" && initiative.drugoOdgovor) {
      const dtDrugoOdg = document.createElement("dt");
      dtDrugoOdg.textContent = "Detalji odgovora:";
      const ddDrugoOdg = document.createElement("dd");
      ddDrugoOdg.textContent = initiative.drugoOdgovor;
      content.appendChild(dtDrugoOdg);
      content.appendChild(ddDrugoOdg);
    }
  }

  window.modalContent.innerHTML = "";
  window.modalContent.appendChild(content);

  window.modal.style.display = "block";
}

function generateColors(count) {
  const colors = [
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#d35400",
    "#34495e",
    "#16a085",
    "#c0392b",
    "#27ae60",
    "#7f8c8d",
    "#2980b9",
    "#8e44ad",
    "#f1c40f",
  ];

  if (count > colors.length) {
    for (let i = colors.length; i < count; i++) {
      const r = Math.floor(Math.random() * 200);
      const g = Math.floor(Math.random() * 200);
      const b = Math.floor(Math.random() * 200);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
  }

  return colors.slice(0, count);
}

function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

async function loadSerbiaMap() {
  try {
    if (!window.serbiaMapContainer) {
      console.error("Serbia map container not found");
      return;
    }

    const response = await fetch("serbia.svg");
    const svgContent = await response.text();

    window.serbiaMapContainer.innerHTML = svgContent;

    if (zagovarackeData) {
      setupMapInteractivity();
    } else {
      console.log("Waiting for data before setting up map interactivity");
    }

    console.log("Serbia map loaded successfully");
  } catch (error) {
    console.error("Error loading Serbia map:", error);
  }
}

function setupMapInteractivity() {
  const mapTooltip = document.createElement("div");
  mapTooltip.className = "map-tooltip";
  document.body.appendChild(mapTooltip);

  const districtMap = {
    "RS-00": "Grad Beograd",
    "RS-01": "Severno-bački okrug",
    "RS-05": "Zapadno-bački okrug",
    "RS-06": "Južno-bački okrug",
    "RS-07": "Sremski okrug",
    "RS-08": "Mačvanski okrug",
    "RS-14": "Borski okrug",
    "RS-15": "Zaječarski okrug",
    "RS-16": "Zlatiborski okrug",
    "RS-18": "Raški okrug",
    "RS-19": "Rasinski okrug",
    "RS-20": "Nišavski okrug",
    "RS-23": "Jablanički okrug",
    "RS-24": "Pčinjski okrug",
    "RS-12": "Šumadijski okrug",
    "RS-13": "Pomoravski okrug",
  };

  const availableDistricts = new Set();
  if (zagovarackeData && zagovarackeData.nodes) {
    for (const orgData of Object.values(zagovarackeData.nodes)) {
      if (orgData && orgData.Okrug) {
        Object.values(orgData.Okrug).forEach((okrug) => {
          if (okrug) availableDistricts.add(okrug.replace(/\n/g, "").trim());
        });
      }
    }
  }

  console.log("Available districts:", availableDistricts);

  const paths = document.querySelectorAll("#serbia-map path");

  paths.forEach((path) => {
    const districtId = path.id;
    const districtName =
      path.getAttribute("title") || districtMap[districtId] || "Nepoznat okrug";

    const isAvailable = availableDistricts.has(districtName);

    if (isAvailable) {
      path.classList.add("available");
    } else {
      path.classList.add("unavailable");
    }

    path.addEventListener("mouseover", (event) => {
      mapTooltip.textContent = districtName;
      if (!isAvailable) {
        mapTooltip.textContent += " (nema podataka)";
      }
      mapTooltip.style.display = "block";
      mapTooltip.style.left = event.pageX + 10 + "px";
      mapTooltip.style.top = event.pageY + 10 + "px";
    });

    path.addEventListener("mousemove", (event) => {
      mapTooltip.style.left = event.pageX + 10 + "px";
      mapTooltip.style.top = event.pageY + 10 + "px";
    });

    path.addEventListener("mouseout", () => {
      mapTooltip.style.display = "none";
    });

    path.addEventListener("click", () => {
      if (!isAvailable) return;

      paths.forEach((p) => p.classList.remove("active"));

      if (activeDistrict === districtName) {
        resetMapSelection();
        return;
      }

      path.classList.add("active");
      activeDistrict = districtName;

      if (window.okrugFilter) {
        const options = Array.from(window.okrugFilter.options);
        const option = options.find((opt) => opt.text === districtName);

        if (option) {
          window.okrugFilter.value = option.value;
          applyFilters();
        } else {
          console.warn(
            `Option for "${districtName}" not found in the dropdown`
          );
        }
      }
    });
  });
}

function resetMapSelection() {
  const paths = document.querySelectorAll("#serbia-map path");
  paths.forEach((path) => path.classList.remove("active"));
  activeDistrict = null;
}

function resetFilters() {
  window.periodFilter.value = "all";
  window.okrugFilter.value = "all";
  window.statusFilter.value = "all";
  window.fokusFilter.value = "all";
  window.nivoFilter.value = "all";
  window.odgovorFilter.value = "all";

  processData();
  updateUI();
  resetMapSelection();
}
