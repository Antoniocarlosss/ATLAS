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

  function numero(valor) {
    const n = parseFloat(String(valor ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(valor, unidade, casas = 2) {
    return `${numero(valor).toFixed(casas)} ${unidade}`;
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
      <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin:10px 0 12px 0; color:white;">
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
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

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

  function tabelaResumo(titulo, grupos) {
    return `
      <h3>${titulo}</h3>
      <table>
        <thead><tr><th>Grupo</th><th>Manha</th><th>Tarde</th><th>Total</th>${QUIMICOS.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead>
        <tbody>
          ${grupos.map(g => `<tr><td>${textoSeguro(g.chave)}</td><td>${fmt(g.total.manha, "m")}</td><td>${fmt(g.total.tarde, "m")}</td><td><b>${fmt(g.total.metros, "m")}</b></td>${QUIMICOS.map(([k]) => `<td>${fmt(g.total.quimicos[k], "kg")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  function htmlRelatorio() {
    const filtros = filtrosAtuais();
    const registros = aplicarFiltros(todosRelatorios("injecao"), filtros);
    const total = totalizar(registros);
    const porTipo = agrupar(registros, reg => reg.tipo);
    const porEsp = agrupar(registros, reg => `${reg.esp} mm`);
    const porTipoEsp = agrupar(registros, reg => `${reg.tipo} ${reg.esp} mm`);
    const operador = document.getElementById("user-display")?.innerText || "VISITANTE";
    const especifico = filtros.conteudo === "painel";
    const logoUrl = new URL("logo.png", location.href).href;

    return `
      <!doctype html><html><head><meta charset="UTF-8"><title>Relatorio de Injecao</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; color:#000; margin:0; }
        .cab { background:#050505; color:white; padding:12px 16px; border-bottom:5px solid #e31c24; display:flex; justify-content:space-between; align-items:center; }
        .cab img { height:42px; object-fit:contain; }
        h1 { font-size:20px; margin:10px 0 4px; }
        h2 { font-size:15px; margin:10px 0; }
        h3 { background:#111; color:white; padding:7px; font-size:13px; margin:12px 0 0; }
        table { width:100%; border-collapse:collapse; page-break-inside:auto; margin-bottom:8px; }
        tr { page-break-inside:avoid; }
        th,td { border:1px solid #000; padding:5px; font-size:10px; text-align:center; }
        th { background:#e5e7eb; }
        .cards { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; margin:10px 0; }
        .card { border:2px solid #111; padding:8px; text-align:center; font-weight:bold; }
        .obs { height:55px; border:1px solid #000; margin-top:8px; padding:6px; }
        .assinatura { margin-top:30px; display:flex; justify-content:space-around; gap:20px; }
        .linha { border-top:1px solid #000; width:260px; text-align:center; padding-top:6px; }
      </style></head><body>
        <div class="cab">
          <div><img src="${logoUrl}" alt="Atlas Painel"><h1>Relatorio de Producao e Consumo da Injecao</h1></div>
          <div style="text-align:right; font-weight:bold;">Periodo: ${textoSeguro(filtros.label)}<br>Emissao: ${new Date().toLocaleString("pt-BR")}<br>Utilizador: ${textoSeguro(operador)}</div>
        </div>
        ${especifico ? `<h2>Filtro: ${textoSeguro(filtros.tipoPainel === "todos" ? "Todos os tipos" : filtros.tipoPainel)} | ${textoSeguro(filtros.espessura === "todas" ? "Todas as espessuras" : filtros.espessura + " mm")}</h2>` : ""}
        <div class="cards">
          <div class="card">Relatorios<br>${total.relatorios}</div>
          <div class="card">Manha<br>${fmt(total.manha, "m")}</div>
          <div class="card">Tarde<br>${fmt(total.tarde, "m")}</div>
          <div class="card">Total<br>${fmt(total.metros, "m")}</div>
          <div class="card">Dias<br>${total.diasProducao}</div>
        </div>
        ${tabelaResumo("Totais gerais de quimicos", [{ chave: "TOTAL GERAL", total }])}
        ${especifico ? tabelaResumo("Consumo medio por metro", [{
          chave: "kg/m",
          total: { manha: total.manha, tarde: total.tarde, metros: total.metros, quimicos: Object.fromEntries(QUIMICOS.map(([k]) => [k, total.metros ? total.quimicos[k] / total.metros : 0])) }
        }]) : ""}
        ${tabelaResumo("Resumo por tipo de painel", porTipo)}
        ${tabelaResumo("Resumo por espessura", porEsp)}
        ${tabelaResumo("Resumo por tipo de painel e espessura", porTipoEsp)}
        <h3>Registos detalhados do periodo</h3>
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Esp.</th><th>Manha</th><th>Tarde</th><th>Total</th>${QUIMICOS.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead>
          <tbody>${registros.map(reg => `<tr><td>${textoSeguro(reg.data)}</td><td>${textoSeguro(reg.tipo)}</td><td>${textoSeguro(reg.esp)} mm</td><td>${fmt(reg.manha, "m")}</td><td>${fmt(reg.tarde, "m")}</td><td><b>${fmt(reg.total, "m")}</b></td>${QUIMICOS.map(([k]) => `<td>${fmt(reg.item[k], "kg")}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
        <div class="obs"><b>Observacoes:</b></div>
        <div class="assinatura"><div class="linha">Responsavel</div><div class="linha">Conferencia</div></div>
      </body></html>
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

    let html = `<div style="padding:15px; color:white;">
      <h2 style="border-bottom:2px solid #3b82f6; padding-bottom:10px;">Historico da Injecao</h2>
      ${controlesHtml()}`;

    Object.keys(db || {}).forEach(ano => {
      html += `<div onclick="toggleElement('folder-ano-${ano}')" style="background:#334155; padding:12px; margin-top:8px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="folder-ano-${ano}" style="display:none; padding:5px 10px;">`;
      Object.keys(db[ano] || {}).forEach(mes => {
        const filtrados = (Array.isArray(db[ano][mes]) ? db[ano][mes] : []).filter(r => r.modulo === modulo);
        if (!filtrados.length) return;
        const mesId = `folder-mes-${ano}-${mes}`;
        html += `<div onclick="toggleElement('${mesId}')" style="color:#3b82f6; padding:10px; cursor:pointer; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; font-weight:700;"><span>${mes}</span><i class="fas fa-caret-down"></i></div><div id="${mesId}" style="display:none; padding-left:10px; border-left:2px solid #3b82f6; margin-bottom:10px;">${resumoMesHtml(filtrados, `Resumo de ${mes} / ${ano}`)}`;
        filtrados.forEach((rel, idx) => {
          html += `<div style="background:#1e293b; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid #334155; display:flex; justify-content:space-between; gap:8px; align-items:center;"><div><b>${textoSeguro(rel.data)}</b><br><small style="color:#94a3b8;">${textoSeguro(rel.operador || "")}</small></div><div style="display:flex; gap:8px;"><button onclick="gerarPDF_Injecao_Final('${encodeURIComponent(JSON.stringify(rel))}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:900;">PDF</button></div></div>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    render.innerHTML = html;
    atlasInjecaoAlternarFiltros();
    atlasInjecaoAtualizarResumo();
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  try { exibirHistoricoModulo = window.exibirHistoricoModulo; } catch (erro) {}
})();
