(function () {
  const ADMIN_CODE = "1234";
  const STORAGE_KEYS = {
    operator: "atlasPainelOperator",
    unlocked: "atlasPainelUnlocked",
    records: "atlasPainelRecords"
  };

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

  function readRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.records) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records.slice(0, 100)));
  }

  function formatDate(date) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
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
    $("#accessState").textContent = state.unlocked ? "Modo liberado" : "Modo operador";
    $("#accessText").textContent = state.unlocked ? "Sistema completo ativo" : "Relatórios bloqueados";
    $("#loginButton").hidden = state.unlocked;
    $("#logoutButton").hidden = !state.unlocked;
    $$(".adminOnly").forEach((element) => {
      element.hidden = !state.unlocked;
    });
    $(".moduleTabs").classList.toggle("unlocked", state.unlocked);

    if (!state.unlocked && state.currentView === "relatorio") {
      showView("injecao");
    }
  }

  function showView(view) {
    if (view === "relatorio" && !state.unlocked) return;
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
    const now = new Date();
    if (type === "injecao") {
      return {
        tipo: "Injeção",
        operador: state.operator || "Operador",
        data: now.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        maquina: sanitize($("#injecaoMaquina").value),
        produto: sanitize($("#injecaoProduto").value),
        quantidade: sanitize($("#injecaoQuantidade").value),
        status: sanitize($("#injecaoStatus").value),
        observacao: sanitize($("#injecaoObs").value)
      };
    }

    return {
      tipo: "Serra",
      operador: state.operator || "Operador",
      data: now.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      ordem: sanitize($("#serraOrdem").value),
      medida: sanitize($("#serraMedida").value),
      quantidade: sanitize($("#serraQuantidade").value),
      status: sanitize($("#serraStatus").value),
      observacao: sanitize($("#serraObs").value)
    };
  }

  function isRecordValid(record) {
    if (record.tipo === "Injeção") return record.maquina && record.produto && record.quantidade;
    return record.ordem && record.medida && record.quantidade;
  }

  function clearForm(type) {
    if (type === "injecao") {
      $("#injecaoMaquina").value = "";
      $("#injecaoProduto").value = "";
      $("#injecaoQuantidade").value = "";
      $("#injecaoObs").value = "";
      return;
    }
    $("#serraOrdem").value = "";
    $("#serraMedida").value = "";
    $("#serraQuantidade").value = "";
    $("#serraObs").value = "";
  }

  function saveRecord(type) {
    const record = buildRecord(type);
    if (!isRecordValid(record)) {
      alert("Preencha os campos principais antes de salvar.");
      return;
    }
    state.records.unshift(record);
    saveRecords();
    clearForm(type);
    renderHistory();
    alert(`${record.tipo} salvo.`);
  }

  function recordSummary(record) {
    if (record.tipo === "Injeção") {
      return `${record.maquina} | ${record.produto} | ${record.quantidade} un | ${record.status}`;
    }
    return `${record.ordem} | ${record.medida} | ${record.quantidade} un | ${record.status}`;
  }

  function renderHistory() {
    const list = $("#historyList");
    if (!state.records.length) {
      list.innerHTML = '<p class="emptyHistory">Nenhum registro salvo ainda.</p>';
      return;
    }

    list.innerHTML = state.records.slice(0, 12).map((record) => `
      <article class="historyItem">
        <strong>${record.tipo}</strong>
        <span>${recordSummary(record)}</span>
        <small>${record.data} | ${record.operador}</small>
      </article>
    `).join("");
  }

  function generateReport() {
    if (!state.unlocked) return;
    const now = new Date();
    const injecao = state.records.filter((record) => record.tipo === "Injeção");
    const serra = state.records.filter((record) => record.tipo === "Serra");
    const lines = [
      "RELATÓRIO ATLAS PAINEL",
      `Gerado em: ${now.toLocaleString("pt-BR")}`,
      `Operador: ${state.operator || "Operador"}`,
      "",
      `Total Injeção: ${injecao.length}`,
      `Total Serra: ${serra.length}`,
      "",
      "REGISTROS"
    ];

    if (!state.records.length) {
      lines.push("Nenhum registro salvo.");
    } else {
      state.records.forEach((record, index) => {
        lines.push("");
        lines.push(`${index + 1}. ${record.tipo} - ${record.data}`);
        lines.push(`Operador: ${record.operador}`);
        lines.push(recordSummary(record));
        if (record.observacao) lines.push(`Obs: ${record.observacao}`);
      });
    }

    $("#reportOutput").value = lines.join("\n");
  }

  function downloadReport() {
    if (!state.unlocked) return;
    if (!$("#reportOutput").value) generateReport();
    const blob = new Blob([$("#reportOutput").value], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-atlas-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function printReport() {
    if (!state.unlocked) return;
    if (!$("#reportOutput").value) generateReport();
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre>${$("#reportOutput").value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]))}</pre>`);
    printWindow.document.close();
    printWindow.print();
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
      const code = prompt("Digite o código para liberar o sistema:");
      if (code !== ADMIN_CODE) {
        alert("Código incorreto.");
        return;
      }
      state.unlocked = true;
      localStorage.setItem(STORAGE_KEYS.unlocked, "true");
      updateAccess();
      showView("relatorio");
    });

    $("#logoutButton").addEventListener("click", () => {
      state.unlocked = false;
      localStorage.removeItem(STORAGE_KEYS.unlocked);
      updateAccess();
      showView("injecao");
    });

    $$(".moduleTab").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });

    $$("[data-save]").forEach((button) => {
      button.addEventListener("click", () => saveRecord(button.dataset.save));
    });

    $("#generateReport").addEventListener("click", generateReport);
    $("#downloadReport").addEventListener("click", downloadReport);
    $("#printReport").addEventListener("click", printReport);

    $("#clearHistory").addEventListener("click", () => {
      if (!confirm("Limpar histórico deste celular?")) return;
      state.records = [];
      saveRecords();
      renderHistory();
      $("#reportOutput").value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateOperator();
    updateAccess();
    renderHistory();
    updateClock();
    setupTemperature();
    setupInstall();
    bindEvents();
    setInterval(updateClock, 1000);
  });
})();
