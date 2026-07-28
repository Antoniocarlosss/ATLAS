(function () {
  "use strict";

  const HISTORICO_KEY = "atlas_serra_hist";
  const MESES = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  const $ = seletor => document.querySelector(seletor);
  const numero = valor => {
    const convertido = Number(String(valor ?? 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  };
  const seguro = valor => String(valor ?? "").replace(/[<>&"]/g, caractere => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"
  }[caractere]));
  const formatarMetros = valor => `${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const normalizar = valor => String(valor ?? "").trim();

  function dataRelatorio(relatorio) {
    const partes = normalizar(relatorio?.data).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const ano = Number(relatorio?.ano || partes?.[3]);
    const mes = Number(relatorio?.mes || partes?.[2]);
    const dia = Number(relatorio?.dia || partes?.[1]);
    if (!ano || !mes || !dia) return null;
    return new Date(ano, mes - 1, dia, 12, 0, 0);
  }

  function relatorios() {
    try {
      const lista = JSON.parse(localStorage.getItem(HISTORICO_KEY) || "[]");
      return Array.isArray(lista) ? lista : [];
    } catch (erro) {
      return [];
    }
  }

  function linhas() {
    return relatorios().flatMap((relatorio, indiceRelatorio) => {
      const data = dataRelatorio(relatorio);
      return (Array.isArray(relatorio?.itens) ? relatorio.itens : []).map((item, indiceItem) => {
        const quantidade = Math.max(1, parseInt(item?.qtd, 10) || 1);
        const descricao = normalizar(item?.desc);
        return {
          idRelatorio: relatorio?.id || `${indiceRelatorio}-${normalizar(relatorio?.data)}`,
          indiceItem,
          data,
          dataTexto: normalizar(relatorio?.data),
          tipo: normalizar(item?.tipo) || "SEM TIPO",
          espessura: normalizar(item?.esp) || "SEM ESPESSURA",
          ralInferior: normalizar(item?.ralI) || "SEM RAL",
          ralSuperior: normalizar(item?.ralS) || "SEM RAL",
          quantidade,
          metrosUnidade: numero(item?.metros),
          metros: numero(item?.metros) * quantidade,
          turno: normalizar(item?.turno).toLowerCase() === "tarde" ? "tarde" : "manha",
          origem: descricao.toUpperCase().includes("PED:") ? "pedido" : "stock",
          descricao
        };
      });
    }).filter(item => item.data && item.metros > 0);
  }

  function valoresUnicos(campo) {
    return [...new Set(linhas().map(item => item[campo]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true }));
  }

  function opcoes(valores, todos) {
    return `<option value="">${seguro(todos)}</option>${valores.map(valor =>
      `<option value="${seguro(valor)}">${seguro(valor)}</option>`
    ).join("")}`;
  }

  function hojeLocal() {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0);
  }

  function valorData(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  }

  function dataInput(valor) {
    if (!valor) return null;
    const partes = valor.split("-").map(Number);
    return partes.length === 3 ? new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0) : null;
  }

  function intervaloAtual() {
    const periodo = $("#atlas-serra-periodo")?.value || "mensal";
    const hoje = hojeLocal();
    let inicio;
    let fim;
    let label;

    if (periodo === "personalizado") {
      inicio = dataInput($("#atlas-serra-data-inicio")?.value);
      fim = dataInput($("#atlas-serra-data-fim")?.value);
      label = inicio && fim
        ? `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`
        : "Escolha as datas";
    } else if (periodo === "mes") {
      const valor = $("#atlas-serra-mes")?.value || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const [ano, mes] = valor.split("-").map(Number);
      inicio = new Date(ano, mes - 1, 1, 12, 0, 0);
      fim = new Date(ano, mes, 0, 12, 0, 0);
      label = `${MESES[mes]} DE ${ano}`;
    } else if (periodo === "trimestral") {
      const primeiroMes = Math.floor(hoje.getMonth() / 3) * 3;
      inicio = new Date(hoje.getFullYear(), primeiroMes, 1, 12, 0, 0);
      fim = new Date(hoje.getFullYear(), primeiroMes + 3, 0, 12, 0, 0);
      label = `${Math.floor(primeiroMes / 3) + 1}º TRIMESTRE DE ${hoje.getFullYear()}`;
    } else if (periodo === "semestral") {
      const primeiroMes = hoje.getMonth() < 6 ? 0 : 6;
      inicio = new Date(hoje.getFullYear(), primeiroMes, 1, 12, 0, 0);
      fim = new Date(hoje.getFullYear(), primeiroMes + 6, 0, 12, 0, 0);
      label = `${primeiroMes === 0 ? "1º" : "2º"} SEMESTRE DE ${hoje.getFullYear()}`;
    } else if (periodo === "anual") {
      inicio = new Date(hoje.getFullYear(), 0, 1, 12, 0, 0);
      fim = new Date(hoje.getFullYear(), 11, 31, 12, 0, 0);
      label = `ANO DE ${hoje.getFullYear()}`;
    } else {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 12, 0, 0);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 12, 0, 0);
      label = `${MESES[hoje.getMonth() + 1]} DE ${hoje.getFullYear()}`;
    }
    return { inicio, fim, label };
  }

  function filtrosAtuais() {
    const intervalo = intervaloAtual();
    return {
      ...intervalo,
      tipo: $("#atlas-serra-tipo")?.value || "",
      espessura: $("#atlas-serra-espessura")?.value || "",
      ralInferior: $("#atlas-serra-ral-inferior")?.value || "",
      ralSuperior: $("#atlas-serra-ral-superior")?.value || "",
      turno: $("#atlas-serra-turno")?.value || "",
      origem: $("#atlas-serra-origem")?.value || ""
    };
  }

  function aplicarFiltros(lista, filtros) {
    return lista.filter(item => {
      if (filtros.inicio && item.data < filtros.inicio) return false;
      if (filtros.fim && item.data > filtros.fim) return false;
      return (!filtros.tipo || item.tipo === filtros.tipo)
        && (!filtros.espessura || item.espessura === filtros.espessura)
        && (!filtros.ralInferior || item.ralInferior === filtros.ralInferior)
        && (!filtros.ralSuperior || item.ralSuperior === filtros.ralSuperior)
        && (!filtros.turno || item.turno === filtros.turno)
        && (!filtros.origem || item.origem === filtros.origem);
    });
  }

  function agrupar(lista, chave) {
    const grupos = {};
    lista.forEach(item => {
      const nome = typeof chave === "function" ? chave(item) : item[chave];
      grupos[nome] ||= { metros: 0, quantidade: 0, linhas: 0 };
      grupos[nome].metros += item.metros;
      grupos[nome].quantidade += item.quantidade;
      grupos[nome].linhas += 1;
    });
    return Object.entries(grupos).sort((a, b) => b[1].metros - a[1].metros);
  }

  function tabelaResumo(titulo, grupos, primeiraColuna) {
    return `
      <section style="background:#0f172a; border:1px solid #334155; border-radius:9px; overflow:hidden;">
        <h3 style="margin:0; padding:11px 12px; color:#93c5fd; font-size:15px; border-bottom:1px solid #334155;">${seguro(titulo)}</h3>
        <div style="overflow:auto;">
          <table style="width:100%; border-collapse:collapse; min-width:390px;">
            <thead><tr style="background:#020617; color:#94a3b8;"><th style="text-align:left; padding:9px;">${seguro(primeiraColuna)}</th><th style="text-align:right; padding:9px;">Qtd.</th><th style="text-align:right; padding:9px;">Metros</th><th style="text-align:right; padding:9px;">%</th></tr></thead>
            <tbody>${grupos.length ? (() => {
              const total = grupos.reduce((soma, [, info]) => soma + info.metros, 0);
              return grupos.map(([nome, info]) => `<tr style="border-top:1px solid #1e293b;"><td style="padding:9px; font-weight:700;">${seguro(nome)}</td><td style="padding:9px; text-align:right;">${info.quantidade}</td><td style="padding:9px; text-align:right; color:#22c55e; font-weight:900;">${formatarMetros(info.metros)}</td><td style="padding:9px; text-align:right;">${total ? (info.metros * 100 / total).toFixed(1) : "0.0"}%</td></tr>`).join("");
            })() : `<tr><td colspan="4" style="padding:18px; text-align:center; color:#94a3b8;">Sem dados neste filtro.</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function resumoHtml(lista, filtros) {
    const metros = lista.reduce((soma, item) => soma + item.metros, 0);
    const relatorios = new Set(lista.map(item => item.idRelatorio)).size;
    const manha = lista.filter(item => item.turno === "manha").reduce((soma, item) => soma + item.metros, 0);
    const tarde = metros - manha;
    const combinacoes = agrupar(lista, item => `${item.tipo} • ${item.espessura} mm • RAL ${item.ralInferior}/${item.ralSuperior}`);
    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:12px;">
        ${[
          ["Período selecionado", filtros.label],
          ["Relatórios encontrados", relatorios],
          ["Turno da manhã", formatarMetros(manha)],
          ["Turno da tarde", formatarMetros(tarde)],
          ["Metros totais", formatarMetros(metros)]
        ].map(([rotulo, valor], indice) => `<div style="background:#020617; border:1px solid #263449; border-radius:8px; padding:10px;"><small style="color:#93c5fd;">${seguro(rotulo)}</small><strong style="display:block; margin-top:3px; color:${indice === 4 ? "#22c55e" : "#fff"}; font-size:17px;">${seguro(valor)}</strong></div>`).join("")}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:10px; margin-top:12px;">
        ${tabelaResumo("Metros por tipo de painel", agrupar(lista, "tipo"), "Painel")}
        ${tabelaResumo("Metros por espessura", agrupar(lista, item => `${item.espessura} mm`), "Espessura")}
        ${tabelaResumo("Metros por combinação de RAL", agrupar(lista, item => `${item.ralInferior} / ${item.ralSuperior}`), "RAL inferior / superior")}
        ${tabelaResumo("Painel + espessura + RAL", combinacoes, "Combinação")}
      </div>
    `;
  }

  function controlesHtml() {
    const hoje = hojeLocal();
    return `
      <div class="atlas-inj-painel atlas-serra-painel" style="background:#111827; border:1px solid #334155; border-radius:10px; margin:10px 0 14px; color:white;">
        <button id="atlas-serra-painel-toggle" class="atlas-inj-painel-toggle" type="button" aria-expanded="false" aria-controls="atlas-serra-painel-conteudo" onclick="atlasSerraAlternarPainel()">
          <span><strong>Filtros e resumo da produção da Serra</strong><small id="atlas-serra-resumo-compacto">A carregar resumo...</small></span>
          <i class="fas fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div id="atlas-serra-painel-conteudo" class="atlas-inj-painel-conteudo">
          <div class="atlas-inj-painel-interior">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px; align-items:end;">
              <label style="color:#94a3b8; font-size:11px;">PERÍODO
                <select id="atlas-serra-periodo" onchange="atlasSerraAlternarPeriodo(); atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                  <option value="mensal">Mês atual</option><option value="trimestral">Trimestre atual</option><option value="semestral">Semestre atual</option><option value="anual">Ano atual</option><option value="mes">Escolher mês</option><option value="personalizado">Escolher datas</option>
                </select>
              </label>
              <label class="atlas-serra-filtro-mes" style="display:none; color:#94a3b8; font-size:11px;">MÊS
                <input id="atlas-serra-mes" type="month" value="${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              </label>
              <label class="atlas-serra-filtro-data" style="display:none; color:#94a3b8; font-size:11px;">DATA INICIAL
                <input id="atlas-serra-data-inicio" type="date" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              </label>
              <label class="atlas-serra-filtro-data" style="display:none; color:#94a3b8; font-size:11px;">DATA FINAL
                <input id="atlas-serra-data-fim" type="date" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              </label>
              <label style="color:#94a3b8; font-size:11px;">TIPO DE PAINEL
                <select id="atlas-serra-tipo" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${opcoes(valoresUnicos("tipo"), "Todos os painéis")}</select>
              </label>
              <label style="color:#94a3b8; font-size:11px;">ESPESSURA
                <select id="atlas-serra-espessura" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${opcoes(valoresUnicos("espessura"), "Todas as espessuras")}</select>
              </label>
              <label style="color:#94a3b8; font-size:11px;">RAL INFERIOR
                <select id="atlas-serra-ral-inferior" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${opcoes(valoresUnicos("ralInferior"), "Todos os RAL inferiores")}</select>
              </label>
              <label style="color:#94a3b8; font-size:11px;">RAL SUPERIOR
                <select id="atlas-serra-ral-superior" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${opcoes(valoresUnicos("ralSuperior"), "Todos os RAL superiores")}</select>
              </label>
              <label style="color:#94a3b8; font-size:11px;">TURNO
                <select id="atlas-serra-turno" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;"><option value="">Todos os turnos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option></select>
              </label>
              <label style="color:#94a3b8; font-size:11px;">ORIGEM
                <select id="atlas-serra-origem" onchange="atlasSerraAtualizarResumo()" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;"><option value="">Pedidos e stock</option><option value="pedido">Somente pedidos</option><option value="stock">Somente stock</option></select>
              </label>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:10px;">
              <button type="button" onclick="atlasSerraImprimirResumo()" style="padding:11px; background:#ef233c; color:white; border:none; border-radius:8px; font-weight:900;">Imprimir / Gerar PDF</button>
              <button type="button" onclick="atlasSerraExportarCSV()" style="padding:11px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:900;">Exportar CSV</button>
              <button type="button" onclick="atlasSerraLimparFiltros()" style="padding:11px; background:#475569; color:white; border:none; border-radius:8px; font-weight:900;">Limpar filtros</button>
            </div>
            <div id="atlas-serra-resumo-render"></div>
          </div>
        </div>
      </div>
    `;
  }

  function historicoHtml() {
    const agrupado = {};
    relatorios().forEach(relatorio => {
      const data = dataRelatorio(relatorio);
      if (!data) return;
      const ano = data.getFullYear();
      const mes = data.getMonth() + 1;
      agrupado[ano] ||= {};
      agrupado[ano][mes] ||= [];
      agrupado[ano][mes].push(relatorio);
    });

    const modoPublico = document.documentElement.classList.contains("atlas-public-mode")
      || normalizar(window.usuarioLogado?.id).toLowerCase() === "visitante";
    const voltar = modoPublico ? "" : `<button type="button" onclick="renderizarMenuSerra()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;" aria-label="Voltar ao menu da Serra"><i class="fas fa-arrow-left"></i></button>`;
    const anos = Object.keys(agrupado).sort((a, b) => b - a);

    return `
      <div style="padding:15px; color:white;">
        <div style="display:flex; align-items:center; margin-bottom:12px;">${voltar}<h2 style="border-bottom:2px solid #E31C24; padding-bottom:10px; margin:0; flex:1; font-size:20px;">Histórico da Serra</h2></div>
        ${controlesHtml()}
        ${anos.length ? anos.map(ano => `
          <div style="margin-bottom:10px;">
            <div onclick="toggleElemento('ano-s-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div>
            <div id="ano-s-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">
              ${Object.keys(agrupado[ano]).sort((a, b) => b - a).map(mes => `
                <div onclick="toggleElemento('mes-s-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">${MESES[mes]}</div>
                <div id="mes-s-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">
                  ${agrupado[ano][mes].sort((a, b) => numero(b.dia) - numero(a.dia)).map(relatorio => `
                    <div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                      <span style="font-size:13px;"><b>DIA ${seguro(relatorio.dia)}/${seguro(relatorio.mes)}</b><br><small style="color:#94a3b8;">Total: ${formatarMetros(relatorio.totalGeral)}</small></span>
                      <button type="button" onclick='gerarPDF_Serra("${encodeURIComponent(JSON.stringify(relatorio))}")' style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;"><i class="fas fa-file-pdf"></i> VER PDF</button>
                    </div>`).join("")}
                </div>`).join("")}
            </div>
          </div>`).join("") : `<div style="text-align:center; padding:35px; color:#94a3b8;">Nenhum relatório encontrado no sistema.</div>`}
      </div>
    `;
  }

  window.atlasSerraAlternarPainel = function () {
    const painel = $(".atlas-serra-painel");
    const botao = $("#atlas-serra-painel-toggle");
    if (!painel || !botao) return;
    const aberto = botao.getAttribute("aria-expanded") !== "true";
    painel.classList.toggle("is-open", aberto);
    botao.setAttribute("aria-expanded", String(aberto));
  };

  window.atlasSerraAlternarPeriodo = function () {
    const periodo = $("#atlas-serra-periodo")?.value || "mensal";
    document.querySelectorAll(".atlas-serra-filtro-mes").forEach(elemento => elemento.style.display = periodo === "mes" ? "block" : "none");
    document.querySelectorAll(".atlas-serra-filtro-data").forEach(elemento => elemento.style.display = periodo === "personalizado" ? "block" : "none");
  };

  window.atlasSerraAtualizarResumo = function () {
    const destino = $("#atlas-serra-resumo-render");
    if (!destino) return;
    const filtros = filtrosAtuais();
    const filtrados = aplicarFiltros(linhas(), filtros);
    destino.innerHTML = resumoHtml(filtrados, filtros);
    const compacto = $("#atlas-serra-resumo-compacto");
    if (compacto) compacto.textContent = `${filtros.label} • ${formatarMetros(filtrados.reduce((soma, item) => soma + item.metros, 0))}`;
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  window.atlasSerraLimparFiltros = function () {
    const periodo = $("#atlas-serra-periodo");
    if (periodo) periodo.value = "mensal";
    ["atlas-serra-tipo", "atlas-serra-espessura", "atlas-serra-ral-inferior", "atlas-serra-ral-superior", "atlas-serra-turno", "atlas-serra-origem"].forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.value = "";
    });
    ["atlas-serra-data-inicio", "atlas-serra-data-fim"].forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.value = "";
    });
    atlasSerraAlternarPeriodo();
    atlasSerraAtualizarResumo();
  };

  window.atlasSerraExportarCSV = function () {
    const filtros = filtrosAtuais();
    const filtrados = aplicarFiltros(linhas(), filtros);
    if (!filtrados.length) return alert("Não existem dados para exportar com estes filtros.");
    const cabecalho = ["Data", "Tipo de painel", "Espessura (mm)", "RAL inferior", "RAL superior", "Turno", "Origem", "Quantidade", "Metros por unidade", "Metros totais", "Descrição"];
    const conteudo = [cabecalho, ...filtrados.map(item => [
      item.dataTexto, item.tipo, item.espessura, item.ralInferior, item.ralSuperior,
      item.turno, item.origem, item.quantidade, item.metrosUnidade, item.metros, item.descricao
    ])].map(linha => linha.map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumo-serra-${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  window.atlasSerraImprimirResumo = function () {
    const filtros = filtrosAtuais();
    const filtrados = aplicarFiltros(linhas(), filtros);
    if (!filtrados.length) return alert("Não existem dados para imprimir com estes filtros.");
    const janela = window.open("", "_blank");
    if (!janela) return alert("Permita pop-ups para imprimir ou gerar o PDF.");
    janela.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resumo da Serra</title><style>body{font-family:Arial,sans-serif;color:#111;padding:20px}h1{border-bottom:4px solid #e31c24;padding-bottom:10px}section{border:1px solid #aaa;margin:12px 0}h3{padding:8px;margin:0;background:#eee}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:7px;text-align:left}th:not(:first-child),td:not(:first-child){text-align:right}.no-print{padding:12px 0}@media print{.no-print{display:none}}</style></head><body><h1>Resumo da Produção da Serra</h1><p><b>Período:</b> ${seguro(filtros.label)} | <b>Gerado em:</b> ${new Date().toLocaleString("pt-BR")}</p>${resumoHtml(filtrados, filtros)}<div class="no-print"><button onclick="window.print()">IMPRIMIR / SALVAR PDF</button></div></body></html>`);
    janela.document.close();
  };

  window.listarHistoricoSerra = function () {
    const render = document.getElementById("render-modulo");
    if (!render) return;
    render.innerHTML = historicoHtml();
    atlasSerraAlternarPeriodo();
    atlasSerraAtualizarResumo();
  };

  try { listarHistoricoSerra = window.listarHistoricoSerra; } catch (erro) {}
})();
