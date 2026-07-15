(function () {
  const ADMIN_CODE = "1234";
  const STORAGE_KEYS = {
    operator: "atlasPainelOperator",
    unlocked: "atlasPainelUnlocked",
    records: "atlasPainelRecords"
  };

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const state = {
    operator: localStorage.getItem(STORAGE_KEYS.operator) || "",
    unlocked: localStorage.getItem(STORAGE_KEYS.unlocked) === "true",
    records: readRecords(),
    currentView: "injecao",
    installPrompt: null,
    temperature: "--°C",
    locationLabel: "Localização atual"
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function isoParts(dateISO) {
    const [year, month, day] = String(dateISO || todayISO()).split("-");
    return { year, month, day };
  }

  function normalizeRecord(record) {
    const type = record.type || (String(record.tipo || "").toLowerCase().includes("serra") ? "serra" : "injecao");
    let dateISO = record.dateISO;

    if (!dateISO && record.data) {
      const match = String(record.data).match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
      if (match) {
        dateISO = `${match[3] || new Date().getFullYear()}-${match[2]}-${match[1]}`;
      }
    }

    dateISO = dateISO || todayISO();
    const parts = isoParts(dateISO);
    return {
      ...record,
      type,
      tipo: type === "serra" ? "Serra" : "Injeção",
      dateISO,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      operador: record.operador || "Operador",
      criadoEm: record.criadoEm || new Date().toISOString()
    };
  }

  function readRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.records) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
    } catch {
      return [];
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records.slice(0, 300)));
  }

  function formatDate(date) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatISO(dateISO) {
    const { year, month, day } = isoParts(dateISO);
    return `${day}/${month}/${year}`;
  }

  function updateClock() {
    const now = new Date();
    const hour = now.getHours();
    $("#dayIcon").textContent = hour >= 8 && hour < 18 ? "☀" : "☾";
    $("#currentTime").textContent = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    $("#currentDate").textContent = formatDate(now);
    $("#temperature").textContent = state.temperature;
    $("#locationLabel").textContent = state.locationLabel;
    $("#greeting").textContent = getGreeting(hour);
  }

  function getGreeting(hour = new Date().getHours()) {
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function updateOperator() {
    const hasOperator = Boolean(state.operator);
    $("#operatorPanel").hidden = hasOperator;
    $("#summaryPanel").hidden = !hasOperator;
    $("#operatorLabel").textContent = state.operator;
  }

  function updateAccess() {
    $("#accessState").textContent = state.unlocked ? "Modo premium" : "Modo operador";
    $("#accessText").textContent = state.unlocked ? "Sistema completo ativo" : "Somente visualizar relatórios";
    $("#loginButton").hidden = state.unlocked;
    $("#logoutButton").hidden = !state.unlocked;
    $$(".premiumOnly").forEach((element) => {
      element.hidden = !state.unlocked;
    });
  }

  function showView(view) {
    state.currentView = view;
    $$(".moduleTab").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    $$(".moduleView").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${view}View`);
    });
  }

  function sanitize(value) {
    return String(value || "").trim();
  }

  function buildRecord(type) {
    const dateISO = type === "injecao" ? $("#injecaoData").value : $("#serraData").value;
    const parts = isoParts(dateISO || todayISO());
    const base = {
      type,
      tipo: type === "serra" ? "Serra" : "Injeção",
      operador: state.operator || "Operador",
      dateISO: dateISO || todayISO(),
      year: parts.year,
      month: parts.month,
      day: parts.day,
      criadoEm: new Date().toISOString()
    };

    if (type === "injecao") {
      return {
        ...base,
        tipoPainel: sanitize($("#injecaoTipoPainel").value),
        ral: sanitize($("#injecaoRal").value) || "Sem RAL",
        pir: $("#injecaoPir").checked,
        espessura: sanitize($("#injecaoEspessura").value),
        metros: sanitize($("#injecaoMetros").value),
        espuma: sanitize($("#injecaoEspuma").value),
        fita: sanitize($("#injecaoFita").value),
        densidade: sanitize($("#injecaoDensidade").value),
        pol: sanitize($("#injecaoPol").value),
        polPir: sanitize($("#injecaoPolPir").value),
        mdi: sanitize($("#injecaoMdi").value),
        pen: sanitize($("#injecaoPen").value),
        cat1: sanitize($("#injecaoCat1").value),
        cat2: sanitize($("#injecaoCat2").value),
        cat3: sanitize($("#injecaoCat3").value),
        cat4: sanitize($("#injecaoCat4").value),
        velocidade: sanitize($("#injecaoVelocidade").value),
        maquina: sanitize($("#injecaoMaquina").value),
        produto: sanitize($("#injecaoProduto").value),
        quantidade: sanitize($("#injecaoQuantidade").value),
        status: sanitize($("#injecaoStatus").value),
        observacao: sanitize($("#injecaoObs").value)
      };
    }

    return {
      ...base,
      ordem: sanitize($("#serraOrdem").value),
      medida: sanitize($("#serraMedida").value),
      quantidade: sanitize($("#serraQuantidade").value),
      status: sanitize($("#serraStatus").value),
      observacao: sanitize($("#serraObs").value)
    };
  }

  function isRecordValid(record) {
    if (record.type === "injecao") return record.tipoPainel && record.espessura && record.metros;
    return record.ordem && record.medida && record.quantidade;
  }

  function clearForm(type) {
    if (type === "injecao") {
      $("#injecaoTipoPainel").value = "5 Ondas";
      $("#injecaoRal").value = "";
      $("#injecaoPir").checked = false;
      $("#injecaoEspessura").value = "30";
      $("#injecaoMetros").value = "";
      $("#injecaoEspuma").value = "";
      $("#injecaoFita").value = "";
      $("#injecaoDensidade").value = "";
      $("#injecaoPol").value = "";
      $("#injecaoPolPir").value = "";
      $("#injecaoMdi").value = "";
      $("#injecaoPen").value = "";
      $("#injecaoCat1").value = "";
      $("#injecaoCat2").value = "";
      $("#injecaoCat3").value = "";
      $("#injecaoCat4").value = "";
      $("#injecaoVelocidade").value = "";
      $("#injecaoMaquina").value = "";
      $("#injecaoProduto").value = "";
      $("#injecaoQuantidade").value = "";
      $("#injecaoObs").value = "";
      $("#injecaoData").value = todayISO();
      return;
    }
    $("#serraOrdem").value = "";
    $("#serraMedida").value = "";
    $("#serraQuantidade").value = "";
    $("#serraObs").value = "";
    $("#serraData").value = todayISO();
  }

  function saveRecord(type) {
    if (!state.unlocked) {
      alert("Libere o modo premium para inserir relatório.");
      return;
    }

    const record = buildRecord(type);
    if (!isRecordValid(record)) {
      alert("Preencha os campos principais antes de salvar.");
      return;
    }

    state.records.unshift(record);
    saveRecords();
    clearForm(type);
    renderAllReports();
    alert(`Relatório da ${record.tipo} salvo.`);
  }

  function recordSummary(record) {
    if (record.type === "injecao") {
      const pir = record.pir ? "PIR - " : "";
      const maquina = record.maquina ? ` | ${record.maquina}` : "";
      const velocidade = record.velocidade ? ` | ${record.velocidade}` : "";
      return `${pir}${record.tipoPainel || record.produto || "Painel"} | ${record.espessura || "--"} mm | ${record.ral || "Sem RAL"} | ${record.metros || record.quantidade || "0"} m${velocidade}${maquina}`;
    }
    return `${record.ordem} | ${record.medida} | ${record.quantidade} un | ${record.status}`;
  }

  function recordsByType(type) {
    return state.records
      .filter((record) => record.type === type)
      .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
  }

  function filteredRecords(type) {
    const year = $(`#${type}Ano`).value;
    const month = $(`#${type}Mes`).value;
    const day = $(`#${type}Dia`).value;
    return recordsByType(type).filter((record) => {
      if (year !== "todos" && record.year !== year) return false;
      if (month !== "todos" && record.month !== month) return false;
      if (day !== "todos" && record.day !== day) return false;
      return true;
    });
  }

  function uniqueValues(items, key) {
    return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
  }

  function fillSelect(select, values, current, allLabel, formatter = (value) => value) {
    const nextCurrent = values.includes(current) ? current : "todos";
    select.innerHTML = [
      `<option value="todos">${allLabel}</option>`,
      ...values.map((value) => `<option value="${value}">${formatter(value)}</option>`)
    ].join("");
    select.value = nextCurrent;
  }

  function updateFilters(type) {
    const items = recordsByType(type);
    const yearSelect = $(`#${type}Ano`);
    const monthSelect = $(`#${type}Mes`);
    const daySelect = $(`#${type}Dia`);

    const currentYear = yearSelect.value || "todos";
    const currentMonth = monthSelect.value || "todos";
    const currentDay = daySelect.value || "todos";

    const years = uniqueValues(items, "year").sort((a, b) => b.localeCompare(a));
    fillSelect(yearSelect, years, currentYear, "Todos os anos");

    const yearFiltered = yearSelect.value === "todos" ? items : items.filter((item) => item.year === yearSelect.value);
    const months = uniqueValues(yearFiltered, "month").sort((a, b) => Number(a) - Number(b));
    fillSelect(monthSelect, months, currentMonth, "Todos os meses", (value) => MONTH_NAMES[Number(value) - 1] || value);

    const monthFiltered = monthSelect.value === "todos" ? yearFiltered : yearFiltered.filter((item) => item.month === monthSelect.value);
    const days = uniqueValues(monthFiltered, "day").sort((a, b) => Number(a) - Number(b));
    fillSelect(daySelect, days, currentDay, "Todos os dias");
  }

  function renderModuleReport(type) {
    updateFilters(type);
    const list = $(`#${type}ReportList`);
    const records = filteredRecords(type);

    if (!records.length) {
      list.innerHTML = '<p class="emptyHistory">Nenhum relatório encontrado nesta data.</p>';
      return;
    }

    list.innerHTML = records.map((record) => `
      <article class="historyItem">
        <strong>${record.tipo} - ${formatISO(record.dateISO)}</strong>
        <span>${recordSummary(record)}</span>
        ${record.type === "injecao" ? `<span>${injectionDetailLine(record)}</span>` : ""}
        ${record.observacao ? `<span>Obs: ${record.observacao}</span>` : ""}
        <small>Operador: ${record.operador}</small>
      </article>
    `).join("");
  }

  function renderAllReports() {
    renderModuleReport("injecao");
    renderModuleReport("serra");
  }

  function reportTitle(type) {
    return type === "injecao" ? "RELATÓRIO DE INJEÇÃO" : "RELATÓRIO DE SERRA";
  }

  function injectionDetailLine(record) {
    const chemicals = [
      record.pol ? `POL ${record.pol}` : "",
      record.polPir ? `POL/PIR ${record.polPir}` : "",
      record.mdi ? `MDI ${record.mdi}` : "",
      record.pen ? `PEN ${record.pen}` : "",
      record.cat1 ? `C1 ${record.cat1}` : "",
      record.cat2 ? `C2 ${record.cat2}` : "",
      record.cat3 ? `C3 ${record.cat3}` : "",
      record.cat4 ? `C4 ${record.cat4}` : ""
    ].filter(Boolean).join(" | ");

    return [
      record.espuma ? `Espuma: ${record.espuma}` : "",
      record.fita ? `Fita: ${record.fita}` : "",
      record.densidade ? `Densidade: ${record.densidade}` : "",
      chemicals
    ].filter(Boolean).join(" | ");
  }

  function buildPrintHTML(type) {
    const records = filteredRecords(type);
    const title = reportTitle(type);
    const generatedAt = new Date().toLocaleString("pt-BR");
    const rows = records.map((record, index) => {
      const cells = type === "injecao"
        ? [
            `${record.pir ? "PIR - " : ""}${record.tipoPainel || record.produto || ""}`,
            record.espessura ? `${record.espessura} mm` : "",
            record.ral || "Sem RAL",
            record.metros || record.quantidade || "",
            record.velocidade || "",
            record.espuma || "",
            record.fita || "",
            record.densidade || "",
            [
              record.pol ? `POL ${record.pol}` : "",
              record.polPir ? `POL/PIR ${record.polPir}` : "",
              record.mdi ? `MDI ${record.mdi}` : "",
              record.pen ? `PEN ${record.pen}` : "",
              record.cat1 ? `C1 ${record.cat1}` : "",
              record.cat2 ? `C2 ${record.cat2}` : "",
              record.cat3 ? `C3 ${record.cat3}` : "",
              record.cat4 ? `C4 ${record.cat4}` : ""
            ].filter(Boolean).join(" | "),
            record.maquina || "",
            record.observacao || ""
          ]
        : [record.ordem, record.medida, record.quantidade, record.status, record.observacao || ""];
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${formatISO(record.dateISO)}</td>
          ${cells.map((cell) => `<td>${escapeHTML(cell)}</td>`).join("")}
          <td>${escapeHTML(record.operador)}</td>
        </tr>
      `;
    }).join("");

    const headers = type === "injecao"
      ? ["#", "Data", "Produto", "Esp.", "RAL", "Metros", "Vel.", "Espuma", "Fita", "Densidade", "Químicos", "Máquina", "Obs", "Operador"]
      : ["#", "Data", "Ordem/Cliente", "Medida", "Qtd", "Status", "Obs", "Operador"];

    return `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 20px; }
          .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #e3262f; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0; font-size: 22px; }
          small { color: #444; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #111; color: #fff; }
          th, td { border: 1px solid #000; padding: 7px; text-align: left; vertical-align: top; }
          .empty { padding: 30px; text-align: center; border: 1px solid #000; }
          .no-print { margin: 18px 0; text-align: center; }
          .no-print button { width: 100%; max-width: 360px; padding: 14px; background: #111; color: #fff; border: 3px solid #e3262f; border-radius: 8px; font-weight: 800; font-size: 16px; }
          @media print { .no-print { display: none; } body { margin: 8mm; } }
        </style>
      </head>
      <body>
        <div class="top">
          <div>
            <h1>${title}</h1>
            <small>Gerado em: ${generatedAt}</small>
          </div>
          <strong>ATLAS PAINEL</strong>
        </div>
        ${records.length ? `
          <table>
            <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        ` : '<div class="empty">Nenhum relatório encontrado nesta data.</div>'}
        <div class="no-print"><button onclick="window.print()">IMPRIMIR / SALVAR PDF</button></div>
      </body>
      </html>
    `;
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function openPDF(type, autoPrint) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("O navegador bloqueou a abertura do PDF.");
      return;
    }
    printWindow.document.write(buildPrintHTML(type));
    printWindow.document.close();
    if (autoPrint) {
      printWindow.onload = () => printWindow.print();
      setTimeout(() => printWindow.print(), 400);
    }
  }

  async function fetchTemperature(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("weather");
    const data = await response.json();
    const temp = data?.current?.temperature_2m;
    if (typeof temp !== "number") throw new Error("weather");
    state.temperature = `${Math.round(temp)}°C`;
    state.locationLabel = "Localização atual";
    updateClock();
  }

  function setupTemperature() {
    const fallback = () => {
      state.locationLabel = "Sem localização";
      state.temperature = "--°C";
      updateClock();
    };

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => fetchTemperature(position.coords.latitude, position.coords.longitude).catch(fallback),
      fallback,
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 30 * 60 * 1000 }
    );
  }

  function setupInstall() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      $("#installButton").style.display = "inline-block";
    });

    $("#installButton").addEventListener("click", async () => {
      if (!state.installPrompt) {
        alert("Abra o menu do navegador e toque em Instalar app ou Adicionar à tela inicial.");
        return;
      }
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      $("#installButton").style.display = "none";
    });
  }

  function bindEvents() {
    $("#saveOperator").addEventListener("click", () => {
      const name = sanitize($("#operatorName").value);
      if (!name) {
        alert("Digite o nome do operador.");
        return;
      }
      state.operator = name;
      localStorage.setItem(STORAGE_KEYS.operator, name);
      updateOperator();
      updateClock();
    });

    $("#operatorName").addEventListener("keydown", (event) => {
      if (event.key === "Enter") $("#saveOperator").click();
    });

    $("#changeOperator").addEventListener("click", () => {
      state.operator = "";
      localStorage.removeItem(STORAGE_KEYS.operator);
      $("#operatorName").value = "";
      updateOperator();
    });

    $("#loginButton").addEventListener("click", () => {
      const code = prompt("Digite o código para liberar o sistema premium:");
      if (code !== ADMIN_CODE) {
        alert("Código incorreto.");
        return;
      }
      state.unlocked = true;
      localStorage.setItem(STORAGE_KEYS.unlocked, "true");
      updateAccess();
    });

    $("#logoutButton").addEventListener("click", () => {
      state.unlocked = false;
      localStorage.removeItem(STORAGE_KEYS.unlocked);
      updateAccess();
    });

    $$(".moduleTab").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });

    $$("[data-save]").forEach((button) => {
      button.addEventListener("click", () => saveRecord(button.dataset.save));
    });

    ["injecao", "serra"].forEach((type) => {
      $(`#${type}Ano`).addEventListener("change", () => renderModuleReport(type));
      $(`#${type}Mes`).addEventListener("change", () => renderModuleReport(type));
      $(`#${type}Dia`).addEventListener("change", () => renderModuleReport(type));
    });

    $$("[data-pdf]").forEach((button) => {
      button.addEventListener("click", () => openPDF(button.dataset.pdf, false));
    });

    $$("[data-print]").forEach((button) => {
      button.addEventListener("click", () => openPDF(button.dataset.print, true));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#injecaoData").value = todayISO();
    $("#serraData").value = todayISO();
    updateOperator();
    updateAccess();
    renderAllReports();
    updateClock();
    setupTemperature();
    setupInstall();
    bindEvents();
    setInterval(updateClock, 1000);
  });
})();
