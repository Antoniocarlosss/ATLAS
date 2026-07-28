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
              <button type="button" onclick="atlasSerraImprimirResumo()" style="padding:13px 16px; background:linear-gradient(135deg,#ef233c,#c8102e); color:white; border:1px solid #ff5368; border-radius:9px; font-weight:900; box-shadow:0 5px 16px rgba(239,35,60,.24); cursor:pointer;"><i class="fas fa-file-pdf" aria-hidden="true" style="margin-right:7px;"></i> GERAR RELATÓRIO PDF</button>
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

  function tabelaImpressao(titulo, grupos, primeiraColuna) {
    const total = grupos.reduce((soma, [, info]) => soma + info.metros, 0);
    return `
      <section class="report-section">
        <h2>${seguro(titulo)}</h2>
        <table>
          <thead><tr><th>${seguro(primeiraColuna)}</th><th>Quantidade</th><th>Metros</th><th>Participação</th></tr></thead>
          <tbody>${grupos.length ? grupos.map(([nome, info]) => `
            <tr><td>${seguro(nome)}</td><td>${info.quantidade}</td><td class="meters">${formatarMetros(info.metros)}</td><td>${total ? (info.metros * 100 / total).toFixed(1) : "0.0"}%</td></tr>
          `).join("") : `<tr><td colspan="4" class="empty">Sem dados neste filtro.</td></tr>`}</tbody>
        </table>
      </section>
    `;
  }

  function relatorioImpressaoHtml(lista, filtros) {
    const metros = lista.reduce((soma, item) => soma + item.metros, 0);
    const relatoriosEncontrados = new Set(lista.map(item => item.idRelatorio)).size;
    const manha = lista.filter(item => item.turno === "manha").reduce((soma, item) => soma + item.metros, 0);
    const tarde = metros - manha;
    const filtrosAplicados = [
      filtros.tipo && `Painel: ${filtros.tipo}`,
      filtros.espessura && `Espessura: ${filtros.espessura} mm`,
      filtros.ralInferior && `RAL inferior: ${filtros.ralInferior}`,
      filtros.ralSuperior && `RAL superior: ${filtros.ralSuperior}`,
      filtros.turno && `Turno: ${filtros.turno === "manha" ? "Manhã" : "Tarde"}`,
      filtros.origem && `Origem: ${filtros.origem === "pedido" ? "Pedidos" : "Stock"}`
    ].filter(Boolean);

    return `
      <div class="report-header">
        <img src="${seguro(new URL("logo.png", window.location.href).href)}" alt="ATLAS PAINEL">
        <div class="report-header-text">
          <div class="report-kicker">RELATÓRIO DE PRODUÇÃO</div>
          <h1>RESUMO DA SERRA</h1>
          <p>Atlas Painel • Gestão Industrial</p>
        </div>
      </div>
      <div class="report-period">
        <strong>PERÍODO ANALISADO</strong>
        <span>${seguro(filtros.label)}</span>
        <small>Documento gerado em ${new Date().toLocaleString("pt-BR")}</small>
      </div>
      ${filtrosAplicados.length ? `<div class="filter-row"><b>FILTROS:</b>${filtrosAplicados.map(filtro => `<span>${seguro(filtro)}</span>`).join("")}</div>` : ""}
      <div class="summary-cards">
        <div><span>Relatórios</span><strong>${relatoriosEncontrados}</strong></div>
        <div><span>Turno da manhã</span><strong>${formatarMetros(manha)}</strong></div>
        <div><span>Turno da tarde</span><strong>${formatarMetros(tarde)}</strong></div>
        <div class="total-card"><span>Produção total</span><strong>${formatarMetros(metros)}</strong></div>
      </div>
      <div class="report-grid">
        ${tabelaImpressao("Produção por tipo de painel", agrupar(lista, "tipo"), "Painel")}
        ${tabelaImpressao("Produção por espessura", agrupar(lista, item => `${item.espessura} mm`), "Espessura")}
        ${tabelaImpressao("Produção por combinação de RAL", agrupar(lista, item => `${item.ralInferior} / ${item.ralSuperior}`), "RAL inferior / superior")}
        ${tabelaImpressao("Painel, espessura e RAL", agrupar(lista, item => `${item.tipo} • ${item.espessura} mm • RAL ${item.ralInferior}/${item.ralSuperior}`), "Combinação")}
      </div>
      <footer><span>ATLAS PAINEL</span><span>Resumo da produção da Serra</span><span>${seguro(filtros.label)}</span></footer>
    `;
  }

  window.atlasSerraImprimirResumo = function () {
    const filtros = filtrosAtuais();
    const filtrados = aplicarFiltros(linhas(), filtros);
    if (!filtrados.length) return alert("Não existem dados para imprimir com estes filtros.");
    const janela = window.open("", "_blank");
    if (!janela) return alert("Permita pop-ups para imprimir ou gerar o PDF.");
    janela.document.write(`<!doctype html>
      <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Relatório da Serra - ATLAS</title>
      <style>
        *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        :root{--navy:#071329;--blue:#123d73;--red:#ed1b2f;--green:#087f45;--line:#b8c4d3;--soft:#eef3f8}
        body{margin:0;background:#dfe5ec;color:#101827;font-family:Arial,Helvetica,sans-serif}
        .toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:12px;padding:15px;background:rgba(7,19,41,.96);box-shadow:0 5px 18px rgba(0,0,0,.25)}
        .toolbar button{border:0;border-radius:9px;padding:13px 24px;color:#fff;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2)}
        .print-button{background:linear-gradient(135deg,#ed1b2f,#bd1023)}
        .close-button{background:#34465d}
        .sheet{width:min(210mm,calc(100% - 24px));min-height:297mm;margin:18px auto;padding:10mm;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.22)}
        .report-header{display:flex;align-items:center;justify-content:center;gap:22px;min-height:95px;padding:12px 20px;border:2px solid var(--navy);border-bottom:7px solid var(--red);background:var(--navy);text-align:center}
        .report-header img{width:165px;height:72px;object-fit:contain;flex:0 0 auto}
        .report-header-text{color:#fff;border-left:1px solid #708198;padding-left:22px}
        .report-kicker{color:#ff6a78;font-size:10px;font-weight:900;letter-spacing:2.4px}
        .report-header h1{margin:5px 0 3px;font-size:25px;letter-spacing:.8px}
        .report-header p{margin:0;color:#d8e2ef;font-size:11px}
        .report-period{text-align:center;margin:12px 0 9px;padding:9px;border:1px solid var(--line);border-left:6px solid var(--red);background:var(--soft)}
        .report-period strong,.report-period span,.report-period small{display:block}
        .report-period strong{color:var(--red);font-size:9px;letter-spacing:1.5px}
        .report-period span{margin:3px 0;color:var(--navy);font-size:17px;font-weight:900}
        .report-period small{color:#475569;font-size:9px}
        .filter-row{display:flex;justify-content:center;align-items:center;gap:5px;flex-wrap:wrap;margin:8px 0;font-size:9px}
        .filter-row b{color:var(--navy)}
        .filter-row span{border:1px solid #9dafc2;border-radius:20px;padding:4px 8px;background:#fff}
        .summary-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0 12px}
        .summary-cards div{min-height:57px;padding:8px;border:1.5px solid var(--blue);border-top:5px solid var(--blue);border-radius:5px;text-align:center;background:#fff}
        .summary-cards span,.summary-cards strong{display:block}
        .summary-cards span{color:#3b5675;font-size:9px;font-weight:700;text-transform:uppercase}
        .summary-cards strong{margin-top:5px;color:var(--navy);font-size:15px}
        .summary-cards .total-card{border-color:var(--red);border-top-color:var(--red);background:#fff7f8}
        .summary-cards .total-card strong{color:#b30d20}
        .report-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .report-section{overflow:hidden;border:1.5px solid var(--blue);border-radius:5px;break-inside:avoid;background:#fff}
        .report-section h2{margin:0;padding:8px;background:var(--blue);color:#fff;text-align:center;font-size:11px;letter-spacing:.25px;text-transform:uppercase}
        table{width:100%;border-collapse:collapse;table-layout:auto;font-size:9px}
        th{padding:7px 5px;background:#dfe9f4;color:var(--navy);text-align:center;font-weight:900;border-bottom:1px solid #91a4ba}
        td{padding:7px 5px;border-top:1px solid #c8d2dd;color:#111827;font-weight:700;overflow-wrap:anywhere}
        th:first-child,td:first-child{text-align:left}
        th:not(:first-child),td:not(:first-child){text-align:right;white-space:nowrap}
        tbody tr:nth-child(even){background:#f2f6fa}
        td.meters{color:var(--green);font-weight:900}
        td.empty{text-align:center!important;color:#64748b}
        footer{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:7px;border-top:2px solid var(--red);color:#475569;font-size:8px;font-weight:700}
        @page{size:A4 portrait;margin:7mm}
        @media(max-width:760px){.report-grid{grid-template-columns:1fr}.summary-cards{grid-template-columns:1fr 1fr}.report-header{flex-direction:column}.report-header-text{border-left:0;padding-left:0}.sheet{padding:14px}}
        @media print{body{background:#fff}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.report-header{min-height:80px}.report-header img{width:140px;height:60px}.report-grid{gap:7px}.report-section h2{padding:6px}th,td{padding:5px 4px}}
      </style></head>
      <body>
        <div class="toolbar">
          <button class="print-button" onclick="window.print()">🖨️ IMPRIMIR OU SALVAR EM PDF</button>
          <button class="close-button" onclick="window.close()">✕ FECHAR RELATÓRIO</button>
        </div>
        <main class="sheet">${relatorioImpressaoHtml(filtrados, filtros)}</main>
      </body></html>`);
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
