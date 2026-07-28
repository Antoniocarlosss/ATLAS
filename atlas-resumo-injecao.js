(function () {
  const QUIMICOS = [
    ["pol", "POL"],
    ["polpir", "POL/PIR"],
    ["mdi", "MDI"],
    ["pen", "PEN"],
    ["cat1", "CAT 1"],
    ["cat2", "CAT 2"],
    ["cat3", "CAT 3"],
    ["cat4", "CAT 4"]
  ];

  const MESES = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const PAINEL_STORAGE_KEY = "atlas_injecao_filtros_resumo_aberto";

  function numero(valor) {
    const n = parseFloat(String(valor ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(valor, unidade, casas = 2) {
    return `${numero(valor).toFixed(casas)} ${unidade}`;
  }

  function fmtCompacto(valor) {
    return `${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  }

  function dataMs(dataPt) {
    const partes = String(dataPt || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!partes) return 0;
    return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]), 12, 0, 0).getTime();
  }

  function dataPt(ms) {
    if (!ms) return "--/--/----";
    return new Date(ms).toLocaleDateString("pt-BR");
  }

  function dataIsoMs(dataIso, fimDia) {
    if (!dataIso) return 0;
    const partes = String(dataIso).split("-").map(Number);
    if (partes.length !== 3 || partes.some(n => !Number.isFinite(n))) return 0;
    return new Date(partes[0], partes[1] - 1, partes[2], fimDia ? 23 : 0, fimDia ? 59 : 0, fimDia ? 59 : 0).getTime();
  }

  function textoSeguro(valor) {
    return String(valor ?? "").replace(/[<>&"]/g, s => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[s]));
  }

  function todosRelatorios(modulo) {
    const db = JSON.parse(localStorage.getItem("atlas_db") || "{}");
    const relatorios = [];
    Object.keys(db || {}).forEach(ano => {
      Object.keys(db[ano] || {}).forEach(mes => {
        (Array.isArray(db[ano][mes]) ? db[ano][mes] : []).forEach((rel, index) => {
          if (rel && rel.modulo === modulo) {
            relatorios.push({ ...rel, ano, mes, index, dataMs: dataMs(rel.data) });
          }
        });
      });
    });
    return relatorios.sort((a, b) => a.dataMs - b.dataMs);
  }

  function itemComMeta(rel, item) {
    const manha = numero(item.metrosManha);
    const tarde = numero(item.metrosTarde);
    const total = numero(item.metros || manha + tarde);
    return {
      rel,
      data: rel.data || "",
      dataMs: rel.dataMs || dataMs(rel.data),
      operador: rel.operador || "",
      tipo: item.nome || item.tipo || "Sem tipo",
      esp: String(item.esp || item.espessura || "").replace(" mm", "") || "Sem espessura",
      manha,
      tarde,
      total,
      item
    };
  }

  function itensDosRelatorios(relatorios) {
    const itens = [];
    (Array.isArray(relatorios) ? relatorios : []).forEach(rel => {
      (Array.isArray(rel.itens) ? rel.itens : []).forEach(item => itens.push(itemComMeta(rel, item)));
    });
    return itens;
  }

  function periodoBase(todos, tipo) {
    if (!todos.length) return { inicio: 0, fim: 0, label: "Sem registros" };
    const fimBase = Math.max(...todos.map(rel => rel.dataMs || 0));
    const fim = new Date(fimBase || Date.now());
    let inicio = new Date(fim);
    let label = "";

    if (tipo === "mensal") {
      inicio = new Date(fim.getFullYear(), fim.getMonth(), 1);
      label = `${MESES[fim.getMonth()]} de ${fim.getFullYear()}`;
    } else if (tipo === "trimestral") {
      inicio = new Date(fim.getFullYear(), fim.getMonth() - 2, 1);
      label = `${MESES[inicio.getMonth()]} a ${MESES[fim.getMonth()]} de ${fim.getFullYear()}`;
    } else if (tipo === "semestral") {
      inicio = new Date(fim.getFullYear(), fim.getMonth() - 5, 1);
      label = `${MESES[inicio.getMonth()]} a ${MESES[fim.getMonth()]} de ${fim.getFullYear()}`;
    } else {
      inicio = new Date(fim.getFullYear(), 0, 1);
      label = `Ano de ${fim.getFullYear()}`;
    }

    return {
      inicio: inicio.getTime(),
      fim: new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59).getTime(),
      label
    };
  }

  function filtrosAtuais() {
    const todos = todosRelatorios("injecao");
    const tipoPeriodo = document.getElementById("atlas-inj-periodo")?.value || "mensal";
    const conteudo = document.getElementById("atlas-inj-conteudo")?.value || "completo";
    const base = periodoBase(todos, tipoPeriodo);
    let inicio = base.inicio;
    let fim = base.fim;
    let label = base.label;

    if (tipoPeriodo === "personalizado") {
      inicio = dataIsoMs(document.getElementById("atlas-inj-data-inicio")?.value, false) || 0;
      fim = dataIsoMs(document.getElementById("atlas-inj-data-fim")?.value, true) || Number.MAX_SAFE_INTEGER;
      label = `${dataPt(inicio)} ate ${fim === Number.MAX_SAFE_INTEGER ? "--/--/----" : dataPt(fim)}`;
    }

    return {
      tipoPeriodo,
      conteudo,
      inicio,
      fim,
      label,
      tipoPainel: document.getElementById("atlas-inj-tipo-painel")?.value || "todos",
      espessura: document.getElementById("atlas-inj-espessura")?.value || "todas"
    };
  }

  function aplicarFiltros(relatorios, filtros) {
    return itensDosRelatorios(relatorios).filter(reg => {
      if (reg.dataMs < filtros.inicio || reg.dataMs > filtros.fim) return false;
      if (filtros.conteudo === "painel" && filtros.tipoPainel !== "todos" && reg.tipo !== filtros.tipoPainel) return false;
      if (filtros.conteudo === "painel" && filtros.espessura !== "todas" && String(reg.esp) !== String(filtros.espessura)) return false;
      return true;
    });
  }

  function totalizar(registros) {
    const total = {
      relatoriosIds: new Set(),
      dias: new Set(),
      itens: registros.length,
      manha: 0,
      tarde: 0,
      metros: 0,
      quimicos: Object.fromEntries(QUIMICOS.map(([k]) => [k, 0]))
    };
    registros.forEach(reg => {
      total.relatoriosIds.add(`${reg.rel.ano}-${reg.rel.mes}-${reg.rel.index}`);
      total.dias.add(reg.data);
      total.manha += reg.manha;
      total.tarde += reg.tarde;
      total.metros += reg.total;
      QUIMICOS.forEach(([k]) => total.quimicos[k] += numero(reg.item[k]));
    });
    total.relatorios = total.relatoriosIds.size;
    total.diasProducao = total.dias.size;
    return total;
  }

  function agrupar(registros, seletor) {
    const mapa = new Map();
    registros.forEach(reg => {
      const chave = seletor(reg);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(reg);
    });
    return Array.from(mapa.entries())
      .map(([chave, lista]) => ({ chave, lista, total: totalizar(lista) }))
      .sort((a, b) => a.chave.localeCompare(b.chave));
  }

  function opcoesTipos() {
    const tipos = new Set((Array.isArray(window.OPCOES_TIPO_PLANO) ? window.OPCOES_TIPO_PLANO : []).map(String));
    itensDosRelatorios(todosRelatorios("injecao")).forEach(reg => tipos.add(reg.tipo));
    return Array.from(tipos).filter(Boolean).sort();
  }

  function opcoesEspessuras() {
    const esp = new Set(["20", "30", "40", "50", "60", "80", "100", "120"]);
    itensDosRelatorios(todosRelatorios("injecao")).forEach(reg => esp.add(String(reg.esp)));
    return Array.from(esp).filter(Boolean).sort((a, b) => numero(a) - numero(b));
  }

  function card(label, valor, cor) {
    return `<div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:8px 10px; min-height:54px;">
      <small style="display:block; color:#94a3b8; font-size:11px;">${label}</small>
      <b style="font-size:16px; color:${cor || "white"};">${valor}</b>
    </div>`;
  }

  function quimicosLinha(total) {
    return QUIMICOS.map(([k, label]) => `
      <div style="display:flex; justify-content:space-between; gap:6px; background:#020617; border:1px solid #1e293b; border-radius:6px; padding:7px 8px; font-size:12px;">
        <span style="color:#94a3b8;">${label}</span><b>${fmt(total.quimicos[k], "kg")}</b>
      </div>
    `).join("");
  }

  function detalhesGrupo(grupos) {
    if (!grupos.length) return `<p style="color:#94a3b8; margin:8px 0;">Nenhum dado encontrado neste periodo.</p>`;
    return grupos.map((grupo, idx) => {
      const t = grupo.total;
      return `
        <details style="background:#020617; border:1px solid #263449; border-radius:8px; margin-top:8px; overflow:hidden;">
          <summary style="cursor:pointer; padding:10px; font-weight:900; color:white; display:flex; justify-content:space-between; gap:8px;">
            <span>${textoSeguro(grupo.chave)}</span>
            <span style="color:#22c55e;">${fmt(t.metros, "m")}</span>
          </summary>
          <div style="padding:10px; border-top:1px solid #263449;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:6px; margin-bottom:8px;">
              ${card("Manha", fmt(t.manha, "m"))}
              ${card("Tarde", fmt(t.tarde, "m"))}
              ${card("Total", fmt(t.metros, "m"), "#22c55e")}
              ${card("Dias", t.diasProducao)}
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:6px;">
              ${quimicosLinha(t)}
            </div>
          </div>
        </details>
      `;
    }).join("");
  }

  function resumoMesHtml(relatorios, titulo) {
    const total = totalizar(itensDosRelatorios(relatorios));
    return `
      <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin:8px 0 10px;">
        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
          <b style="color:#93c5fd;">${textoSeguro(titulo)}</b>
          <b style="color:#22c55e;">${fmt(total.metros, "m")}</b>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(125px, 1fr)); gap:6px;">
          ${card("Relatorios", total.relatorios)}
          ${card("Manha", fmt(total.manha, "m"))}
          ${card("Tarde", fmt(total.tarde, "m"))}
          ${card("Total", fmt(total.metros, "m"), "#22c55e")}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:6px; margin-top:8px;">
          ${quimicosLinha(total)}
        </div>
      </div>
    `;
  }

  function controlesHtml() {
    return `
      <div class="atlas-inj-painel" style="background:#111827; border:1px solid #334155; border-radius:10px; margin:10px 0 12px 0; color:white;">
        <button id="atlas-inj-painel-toggle" class="atlas-inj-painel-toggle" type="button" aria-expanded="false" aria-controls="atlas-inj-painel-conteudo" onclick="atlasInjecaoAlternarPainel()">
          <span><strong>Filtros e resumo do relat&oacute;rio</strong><small id="atlas-inj-resumo-compacto">A carregar resumo...</small></span>
          <i class="fas fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div id="atlas-inj-painel-conteudo" class="atlas-inj-painel-conteudo">
        <div class="atlas-inj-painel-interior">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(145px, 1fr)); gap:8px; align-items:end;">
          <div>
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Periodo</label>
            <select id="atlas-inj-periodo" onchange="atlasInjecaoAlternarFiltros(); atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="personalizado">Periodo personalizado</option>
            </select>
          </div>
          <div>
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Conteudo do relatorio</label>
            <select id="atlas-inj-conteudo" onchange="atlasInjecaoAlternarFiltros(); atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              <option value="completo">Relatorio completo</option>
              <option value="painel">Painel especifico</option>
            </select>
          </div>
          <div class="atlas-inj-data-filtro">
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Data inicial</label>
            <input id="atlas-inj-data-inicio" type="date" onchange="atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
          </div>
          <div class="atlas-inj-data-filtro">
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Data final</label>
            <input id="atlas-inj-data-fim" type="date" onchange="atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
          </div>
          <div class="atlas-inj-painel-filtro">
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Tipo de painel</label>
            <select id="atlas-inj-tipo-painel" onchange="atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              <option value="todos">Todos os tipos</option>
              ${opcoesTipos().map(v => `<option value="${textoSeguro(v)}">${textoSeguro(v)}</option>`).join("")}
            </select>
          </div>
          <div class="atlas-inj-painel-filtro">
            <label style="display:block; color:#94a3b8; font-size:11px; margin-bottom:4px;">Espessura</label>
            <select id="atlas-inj-espessura" onchange="atlasInjecaoAtualizarResumo()" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              <option value="todas">Todas as espessuras</option>
              ${opcoesEspessuras().map(v => `<option value="${textoSeguro(v)}">${textoSeguro(v)} mm</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-top:10px;">
          <button onclick="atlasInjecaoGerarPDF()" style="padding:11px; background:#ef233c; color:white; border:none; border-radius:8px; font-weight:900;">Gerar PDF</button>
          <button onclick="atlasInjecaoGerarPDF(true)" style="padding:11px; background:#334155; color:white; border:none; border-radius:8px; font-weight:900;">Imprimir</button>
          <button onclick="atlasInjecaoExportarCSV()" style="padding:11px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:900;">Exportar CSV</button>
          <button onclick="atlasInjecaoLimparFiltros()" style="padding:11px; background:#475569; color:white; border:none; border-radius:8px; font-weight:900;">Limpar filtros</button>
        </div>
        <div id="atlas-inj-resumo-render"></div>
        </div>
        </div>
      </div>
    `;
  }

  function resumoTelaHtml() {
    const filtros = filtrosAtuais();
    const relatorios = todosRelatorios("injecao");
    const registros = aplicarFiltros(relatorios, filtros);
    const total = totalizar(registros);
    const porTipoEsp = agrupar(registros, reg => `${reg.tipo} ${reg.esp} mm`);

    return `
      <div style="margin-top:10px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(145px, 1fr)); gap:8px;">
          ${card("Periodo selecionado", textoSeguro(filtros.label))}
          ${card("Relatorios encontrados", total.relatorios)}
          ${card("Turno da manha", fmt(total.manha, "m"))}
          ${card("Turno da tarde", fmt(total.tarde, "m"))}
          ${card("Metros totais", fmt(total.metros, "m"), "#22c55e")}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:6px; margin-top:8px;">
          ${quimicosLinha(total)}
        </div>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer; color:#93c5fd; font-weight:900;">Resumo por tipo de painel e espessura</summary>
          ${detalhesGrupo(porTipoEsp)}
        </details>
      </div>
    `;
  }

  window.atlasInjecaoAlternarFiltros = function () {
    const tipoPeriodo = document.getElementById("atlas-inj-periodo")?.value || "mensal";
    const conteudo = document.getElementById("atlas-inj-conteudo")?.value || "completo";
    document.querySelectorAll(".atlas-inj-data-filtro").forEach(el => {
      el.style.display = tipoPeriodo === "personalizado" || conteudo === "painel" ? "block" : "none";
    });
    document.querySelectorAll(".atlas-inj-painel-filtro").forEach(el => {
      el.style.display = conteudo === "painel" ? "block" : "none";
    });
  };

  window.atlasInjecaoAtualizarResumo = function () {
    const destino = document.getElementById("atlas-inj-resumo-render");
    if (!destino) return;
    destino.innerHTML = resumoTelaHtml();
    const filtros = filtrosAtuais();
    const total = totalizar(aplicarFiltros(todosRelatorios("injecao"), filtros));
    const compacto = document.getElementById("atlas-inj-resumo-compacto");
    if (compacto) compacto.textContent = `${filtros.label} \u2022 ${fmtCompacto(total.metros)}`;
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  function definirPainelAberto(aberto, salvar) {
    const painel = document.querySelector(".atlas-inj-painel");
    const botao = document.getElementById("atlas-inj-painel-toggle");
    if (!painel || !botao) return;
    painel.classList.toggle("is-open", aberto);
    botao.setAttribute("aria-expanded", String(aberto));
    if (salvar) localStorage.setItem(PAINEL_STORAGE_KEY, String(aberto));
  }

  window.atlasInjecaoAlternarPainel = function () {
    const botao = document.getElementById("atlas-inj-painel-toggle");
    definirPainelAberto(botao?.getAttribute("aria-expanded") !== "true", true);
  };

  function iniciarPainel() {
    localStorage.removeItem(PAINEL_STORAGE_KEY);
    definirPainelAberto(false, false);
  }

  window.atlasInjecaoLimparFiltros = function () {
    const p = document.getElementById("atlas-inj-periodo");
    const c = document.getElementById("atlas-inj-conteudo");
    if (p) p.value = "mensal";
    if (c) c.value = "completo";
    ["atlas-inj-data-inicio", "atlas-inj-data-fim"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const tipo = document.getElementById("atlas-inj-tipo-painel");
    const esp = document.getElementById("atlas-inj-espessura");
    if (tipo) tipo.value = "todos";
    if (esp) esp.value = "todas";
    atlasInjecaoAlternarFiltros();
    atlasInjecaoAtualizarResumo();
  };

  function tabelaProducaoRelatorio(titulo, grupos, coluna) {
    return `
      <section class="report-section">
        <h2>${textoSeguro(titulo)}</h2>
        <table><thead><tr><th>${textoSeguro(coluna)}</th><th>Manhã</th><th>Tarde</th><th>Total</th></tr></thead>
        <tbody>${grupos.length ? grupos.map(g => `<tr><td>${textoSeguro(g.chave)}</td><td>${fmt(g.total.manha, "m")}</td><td>${fmt(g.total.tarde, "m")}</td><td class="meters">${fmt(g.total.metros, "m")}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">Sem dados para este período.</td></tr>`}</tbody></table>
      </section>
    `;
  }

  function htmlRelatorio() {
    const filtros = filtrosAtuais();
    const registros = aplicarFiltros(todosRelatorios("injecao"), filtros);
    const total = totalizar(registros);
    const porTipo = agrupar(registros, reg => reg.tipo);
    const porEsp = agrupar(registros, reg => `${reg.esp} mm`);
    const operador = document.getElementById("user-display")?.innerText || "VISITANTE";
    const especifico = filtros.conteudo === "painel";
    const logoUrl = new URL("logo.png", location.href).href;
    const filtrosAplicados = especifico ? [
      filtros.tipoPainel !== "todos" && `Painel: ${filtros.tipoPainel}`,
      filtros.espessura !== "todas" && `Espessura: ${filtros.espessura} mm`
    ].filter(Boolean) : [];

    return `
      <!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de Injeção - ATLAS</title>
      <style>
        *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        :root{--navy:#071329;--blue:#123d73;--red:#ed1b2f;--green:#087f45;--line:#b8c4d3;--soft:#eef3f8}
        body{margin:0;background:#dfe5ec;color:#101827;font-family:Arial,Helvetica,sans-serif}
        .sheet{width:min(210mm,calc(100% - 24px));min-height:297mm;margin:20px auto;padding:10mm;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.22)}
        .report-header{display:flex;align-items:center;justify-content:center;gap:22px;min-height:96px;padding:12px 20px;border:2px solid var(--navy);border-bottom:7px solid var(--red);background:var(--navy);text-align:center}
        .report-header img{width:165px;height:72px;object-fit:contain}
        .report-header-text{color:#fff;border-left:1px solid #708198;padding-left:22px}
        .report-kicker{color:#ff6a78;font-size:10px;font-weight:900;letter-spacing:2.4px}
        .report-header h1{margin:5px 0 3px;font-size:25px;letter-spacing:.8px}
        .report-header p{margin:0;color:#d8e2ef;font-size:11px}
        .report-period{text-align:center;margin:12px 0 9px;padding:9px;border:1px solid var(--line);border-left:6px solid var(--red);background:var(--soft)}
        .report-period strong,.report-period span,.report-period small{display:block}
        .report-period strong{color:var(--red);font-size:9px;letter-spacing:1.5px}
        .report-period span{margin:3px 0;color:var(--navy);font-size:17px;font-weight:900}
        .report-period small{color:#475569;font-size:9px}
        .filter-row{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin:8px 0;font-size:9px}
        .filter-row span{border:1px solid #9dafc2;border-radius:20px;padding:4px 8px}
        .summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0 12px}
        .summary-cards div{min-height:57px;padding:8px;border:1.5px solid var(--blue);border-top:5px solid var(--blue);border-radius:5px;text-align:center}
        .summary-cards span,.summary-cards strong{display:block}
        .summary-cards span{color:#3b5675;font-size:9px;font-weight:700;text-transform:uppercase}
        .summary-cards strong{margin-top:5px;color:var(--navy);font-size:15px}
        .summary-cards .total-card{border-color:var(--red);border-top-color:var(--red);background:#fff7f8}
        .summary-cards .total-card strong{color:#b30d20}
        .chemical-section{margin-bottom:10px;border:1.5px solid var(--blue);border-radius:5px;overflow:hidden}
        .chemical-section h2,.report-section h2{margin:0;padding:8px;background:var(--blue);color:#fff;text-align:center;font-size:11px;text-transform:uppercase}
        .chemical-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
        .chemical-grid div{padding:7px;text-align:center;border-right:1px solid var(--line);border-top:1px solid var(--line)}
        .chemical-grid span,.chemical-grid strong{display:block}
        .chemical-grid span{font-size:8px;color:#425b78;font-weight:700}
        .chemical-grid strong{margin-top:3px;color:var(--navy);font-size:12px}
        .report-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
        .report-section{overflow:hidden;border:1.5px solid var(--blue);border-radius:5px;break-inside:avoid}
        table{width:100%;border-collapse:collapse;font-size:9px}
        th{padding:7px 5px;background:#dfe9f4;color:var(--navy);text-align:center;font-weight:900}
        td{padding:7px 5px;border-top:1px solid #c8d2dd;color:#111827;font-weight:700}
        th:first-child,td:first-child{text-align:left}
        th:not(:first-child),td:not(:first-child){text-align:right;white-space:nowrap}
        tbody tr:nth-child(even){background:#f2f6fa}
        td.meters{color:var(--green);font-weight:900}
        td.empty{text-align:center!important;color:#64748b}
        .details{grid-column:1/-1}
        .signatures{display:flex;justify-content:space-around;gap:30px;margin-top:28px;font-size:9px;text-align:center}
        .signatures div{width:190px;border-top:1px solid #334155;padding-top:5px}
        footer{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:7px;border-top:2px solid var(--red);color:#475569;font-size:8px;font-weight:700}
        @page{size:A4 portrait;margin:7mm}
        @media(max-width:760px){.report-grid{grid-template-columns:1fr}.summary-cards,.chemical-grid{grid-template-columns:1fr 1fr}.report-header{flex-direction:column}.report-header-text{border-left:0;padding-left:0}.sheet{padding:14px}}
        @media print{body{background:#fff}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.report-header{min-height:80px}.report-header img{width:140px;height:60px}.report-grid{gap:7px}.report-section h2,.chemical-section h2{padding:6px}th,td{padding:5px 4px}}
      </style></head><body>
      <main class="sheet">
        <div class="report-header">
          <img src="${logoUrl}" alt="ATLAS PAINEL">
          <div class="report-header-text"><div class="report-kicker">RELATÓRIO DE PRODUÇÃO</div><h1>RESUMO DA INJEÇÃO</h1><p>Atlas Painel • Gestão Industrial</p></div>
        </div>
        <div class="report-period"><strong>PERÍODO ANALISADO</strong><span>${textoSeguro(filtros.label)}</span><small>Gerado em ${new Date().toLocaleString("pt-BR")} por ${textoSeguro(operador)}</small></div>
        ${filtrosAplicados.length ? `<div class="filter-row">${filtrosAplicados.map(filtro => `<span>${textoSeguro(filtro)}</span>`).join("")}</div>` : ""}
        <div class="summary-cards">
          <div><span>Relatórios</span><strong>${total.relatorios}</strong></div>
          <div><span>Turno da manhã</span><strong>${fmt(total.manha, "m")}</strong></div>
          <div><span>Turno da tarde</span><strong>${fmt(total.tarde, "m")}</strong></div>
          <div class="total-card"><span>Produção total</span><strong>${fmt(total.metros, "m")}</strong></div>
        </div>
        <section class="chemical-section"><h2>Consumo total de químicos</h2><div class="chemical-grid">${QUIMICOS.map(([chave, nome]) => `<div><span>${textoSeguro(nome)}</span><strong>${fmt(total.quimicos[chave], "kg")}</strong></div>`).join("")}</div></section>
        <div class="report-grid">
          ${tabelaProducaoRelatorio("Produção por tipo de painel", porTipo, "Painel")}
          ${tabelaProducaoRelatorio("Produção por espessura", porEsp, "Espessura")}
          <section class="report-section details"><h2>Registros do período</h2><table><thead><tr><th>Data</th><th>Painel</th><th>Esp.</th><th>Manhã</th><th>Tarde</th><th>Total</th></tr></thead><tbody>${registros.length ? registros.map(reg => `<tr><td>${textoSeguro(reg.data)}</td><td>${textoSeguro(reg.tipo)}</td><td>${textoSeguro(reg.esp)} mm</td><td>${fmt(reg.manha, "m")}</td><td>${fmt(reg.tarde, "m")}</td><td class="meters">${fmt(reg.total, "m")}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">Sem registros no período.</td></tr>`}</tbody></table></section>
        </div>
        <div class="signatures"><div>Responsável</div><div>Conferência</div></div>
        <footer><span>ATLAS PAINEL</span><span>Resumo da produção da Injeção</span><span>${textoSeguro(filtros.label)}</span></footer>
      </main></body></html>
    `;
  }

  window.atlasInjecaoGerarPDF = function (imprimir) {
    const janela = window.open("", "_blank");
    if (!janela) return alert("Nao foi possivel abrir o relatorio.");
    janela.document.write(htmlRelatorio());
    janela.document.close();
    if (imprimir) setTimeout(() => janela.print(), 500);
  };

  window.atlasInjecaoExportarCSV = function () {
    const filtros = filtrosAtuais();
    const registros = aplicarFiltros(todosRelatorios("injecao"), filtros);
    const cab = ["Data", "Tipo", "Espessura", "Metros manha", "Metros tarde", "Metros total", ...QUIMICOS.map(([, l]) => l)];
    const linhas = registros.map(reg => [reg.data, reg.tipo, `${reg.esp} mm`, reg.manha, reg.tarde, reg.total, ...QUIMICOS.map(([k]) => numero(reg.item[k]))]);
    const csv = [cab, ...linhas].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumo-injecao-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  window.exibirHistoricoModulo = function (modulo) {
    const db = JSON.parse(localStorage.getItem("atlas_db") || "{}");
    const render = document.getElementById("render-modulo");
    if (!render) return;
    const pastasAbertas = Array.from(render.querySelectorAll('[id^="folder-ano-"], [id^="folder-mes-"]'))
      .filter(elemento => getComputedStyle(elemento).display !== "none")
      .map(elemento => elemento.id);
    const modoPublico = document.documentElement.classList.contains("atlas-public-mode")
      || String(window.usuarioLogado?.id || "").toLowerCase() === "visitante";
    const podeGerir = !modoPublico
      && typeof window.atlasAbrirGerirInjecao === "function"
      && typeof window.atlasPodeGerirHistoricoModulo === "function"
      && window.atlasPodeGerirHistoricoModulo(modulo);

    let html = `<div style="padding:15px; color:white;">
      <h2 style="border-bottom:2px solid #3b82f6; padding-bottom:10px;">Historico da Injecao</h2>
      ${controlesHtml()}`;

    Object.keys(db || {}).forEach(ano => {
      html += `<div onclick="toggleElement('folder-ano-${ano}')" style="background:#334155; padding:12px; margin-top:8px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="folder-ano-${ano}" style="display:none; padding:5px 10px;">`;
      Object.keys(db[ano] || {}).forEach(mes => {
        const filtrados = (Array.isArray(db[ano][mes]) ? db[ano][mes] : [])
          .map((rel, indexOriginal) => ({ rel, indexOriginal }))
          .filter(item => item.rel.modulo === modulo);
        if (!filtrados.length) return;
        const mesId = `folder-mes-${ano}-${mes}`;
        html += `<div onclick="toggleElement('${mesId}')" style="color:#3b82f6; padding:10px; cursor:pointer; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; font-weight:700;"><span>${mes}</span><i class="fas fa-caret-down"></i></div><div id="${mesId}" style="display:none; padding-left:10px; border-left:2px solid #3b82f6; margin-bottom:10px;">${resumoMesHtml(filtrados.map(item => item.rel), `Resumo de ${mes} / ${ano}`)}`;
        filtrados.forEach(({ rel, indexOriginal }) => {
          html += `<div style="background:#1e293b; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid #334155; display:flex; justify-content:space-between; gap:8px; align-items:center;"><div><b>${textoSeguro(rel.data)}</b><br><small style="color:#94a3b8;">${textoSeguro(rel.operador || "")}</small></div><div style="display:flex; gap:8px; flex-wrap:wrap;">${podeGerir ? `<button onclick="atlasAbrirGerirInjecao('${textoSeguro(ano)}','${textoSeguro(mes)}',${indexOriginal},'${textoSeguro(modulo)}')" style="background:#f59e0b; color:#111827; border:none; padding:8px 12px; border-radius:6px; font-weight:900;">GERIR</button>` : ""}<button onclick="gerarPDF_Injecao_Final('${encodeURIComponent(JSON.stringify(rel))}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:900;">PDF</button></div></div>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    render.innerHTML = html;
    iniciarPainel();
    atlasInjecaoAlternarFiltros();
    atlasInjecaoAtualizarResumo();
    pastasAbertas.forEach(id => {
      const pasta = document.getElementById(id);
      if (pasta) pasta.style.display = "block";
    });
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  try { exibirHistoricoModulo = window.exibirHistoricoModulo; } catch (erro) {}
})();
