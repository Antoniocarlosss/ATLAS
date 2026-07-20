(function () {
  function numero(valor) {
    const n = parseFloat(String(valor ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function dataMs(dataPt) {
    const partes = String(dataPt || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!partes) return 0;
    return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]), 12, 0, 0).getTime();
  }

  function dataIsoMs(dataIso, fimDia) {
    if (!dataIso) return 0;
    const partes = String(dataIso).split("-").map(Number);
    if (partes.length !== 3 || partes.some(n => !Number.isFinite(n))) return 0;
    return new Date(partes[0], partes[1] - 1, partes[2], fimDia ? 23 : 0, fimDia ? 59 : 0, fimDia ? 59 : 0).getTime();
  }

  function fmtKg(valor) {
    return `${numero(valor).toFixed(2)} kg`;
  }

  function fmtM(valor) {
    return `${numero(valor).toFixed(2)} m`;
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

  function resumo(relatorios) {
    const r = {
      relatorios: 0,
      itens: 0,
      metrosManha: 0,
      metrosTarde: 0,
      metrosTotal: 0,
      quimicos: { pol: 0, polpir: 0, mdi: 0, pen: 0, cat1: 0, cat2: 0, cat3: 0, cat4: 0 }
    };

    (Array.isArray(relatorios) ? relatorios : []).forEach(rel => {
      r.relatorios += 1;
      (Array.isArray(rel.itens) ? rel.itens : []).forEach(item => {
        const manha = numero(item.metrosManha);
        const tarde = numero(item.metrosTarde);
        r.itens += 1;
        r.metrosManha += manha;
        r.metrosTarde += tarde;
        r.metrosTotal += numero(item.metros || manha + tarde);
        Object.keys(r.quimicos).forEach(chave => {
          r.quimicos[chave] += numero(item[chave]);
        });
      });
    });

    return r;
  }

  function resumoHtml(titulo, relatorios) {
    const r = resumo(relatorios);
    const q = r.quimicos;
    return `
      <div class="atlas-resumo-injecao" style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:14px; margin:12px 0 16px 0; color:white;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; border-bottom:1px solid #334155; padding-bottom:10px; margin-bottom:10px;">
          <div>
            <div style="color:#3b82f6; font-size:12px; font-weight:900; text-transform:uppercase;">${titulo}</div>
            <div style="color:#94a3b8; font-size:12px;">${r.relatorios} relatorio(s) | ${r.itens} item(ns)</div>
          </div>
          <div style="font-weight:900; color:#22c55e;">Total: ${fmtM(r.metrosTotal)}</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:10px;">
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Turno da manha</small><br><b>${fmtM(r.metrosManha)}</b></div>
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Turno da tarde</small><br><b>${fmtM(r.metrosTarde)}</b></div>
          <div style="background:#020617; border:1px solid #1e293b; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Periodo inteiro</small><br><b>${fmtM(r.metrosTotal)}</b></div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px;">
          <div><small>POL</small><br><b>${fmtKg(q.pol)}</b></div>
          <div><small>POL/PIR</small><br><b>${fmtKg(q.polpir)}</b></div>
          <div><small>MDI</small><br><b>${fmtKg(q.mdi)}</b></div>
          <div><small>PEN</small><br><b>${fmtKg(q.pen)}</b></div>
          <div><small>CAT 1</small><br><b>${fmtKg(q.cat1)}</b></div>
          <div><small>CAT 2</small><br><b>${fmtKg(q.cat2)}</b></div>
          <div><small>CAT 3</small><br><b>${fmtKg(q.cat3)}</b></div>
          <div><small>CAT 4</small><br><b>${fmtKg(q.cat4)}</b></div>
        </div>
      </div>
    `;
  }

  function periodoSelecionado() {
    const tipo = document.getElementById("atlas-inj-resumo-periodo")?.value || "mensal";
    const todos = todosRelatorios("injecao");
    if (!todos.length) return [];

    const fimBase = Math.max(...todos.map(rel => rel.dataMs || 0));
    const fim = new Date(fimBase || Date.now());
    let inicio = new Date(fim);

    if (tipo === "mensal") inicio = new Date(fim.getFullYear(), fim.getMonth(), 1, 0, 0, 0);
    if (tipo === "trimestral") inicio = new Date(fim.getFullYear(), fim.getMonth() - 2, 1, 0, 0, 0);
    if (tipo === "seis") inicio = new Date(fim.getFullYear(), fim.getMonth() - 5, 1, 0, 0, 0);
    if (tipo === "anual") inicio = new Date(fim.getFullYear(), 0, 1, 0, 0, 0);

    let inicioMs = inicio.getTime();
    let fimMs = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59).getTime();

    if (tipo === "personalizado") {
      inicioMs = dataIsoMs(document.getElementById("atlas-inj-resumo-inicio")?.value, false) || 0;
      fimMs = dataIsoMs(document.getElementById("atlas-inj-resumo-fim")?.value, true) || Number.MAX_SAFE_INTEGER;
    }

    return todos.filter(rel => rel.dataMs >= inicioMs && rel.dataMs <= fimMs);
  }

  window.atlasInjecaoAtualizarResumoPeriodo = function () {
    const destino = document.getElementById("atlas-inj-resumo-periodo-render");
    if (!destino) return;
    const tipo = document.getElementById("atlas-inj-resumo-periodo")?.value || "mensal";
    const labels = {
      mensal: "Resumo mensal",
      trimestral: "Resumo trimestral",
      seis: "Resumo dos ultimos 6 meses",
      anual: "Resumo anual",
      personalizado: "Resumo por datas"
    };
    destino.innerHTML = resumoHtml(labels[tipo] || "Resumo", periodoSelecionado());
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  function controlesHtml() {
    return `
      <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:14px; margin:12px 0; color:white;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; align-items:end;">
          <div>
            <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:5px;">Resumo</label>
            <select id="atlas-inj-resumo-periodo" onchange="atlasInjecaoAtualizarResumoPeriodo()" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="seis">6 meses</option>
              <option value="anual">Anual</option>
              <option value="personalizado">Escolher datas</option>
            </select>
          </div>
          <div>
            <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:5px;">De</label>
            <input id="atlas-inj-resumo-inicio" type="date" onchange="atlasInjecaoAtualizarResumoPeriodo()" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
          </div>
          <div>
            <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:5px;">Ate</label>
            <input id="atlas-inj-resumo-fim" type="date" onchange="atlasInjecaoAtualizarResumoPeriodo()" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
          </div>
          <button onclick="atlasInjecaoAtualizarResumoPeriodo()" style="padding:13px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:900;">ATUALIZAR RESUMO</button>
        </div>
        <div id="atlas-inj-resumo-periodo-render"></div>
      </div>
    `;
  }

  window.exibirHistoricoModulo = function (modulo) {
    const db = JSON.parse(localStorage.getItem("atlas_db") || "{}");
    const render = document.getElementById("render-modulo");
    if (!render) return;

    let html = `
      <div style="padding:15px; color:white;">
        <h2 style="border-bottom:2px solid #3b82f6; padding-bottom:10px;">Historico da Injecao</h2>
        ${controlesHtml()}
    `;

    Object.keys(db || {}).forEach(ano => {
      html += `
        <div class="folder-year" onclick="toggleElement('folder-ano-${ano}')" style="background:#334155; padding:12px; margin-top:8px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:white;">
          <span>ANO ${ano}</span>
          <i class="fas fa-chevron-down"></i>
        </div>
        <div id="folder-ano-${ano}" style="display:none; padding:5px 10px;">`;

      Object.keys(db[ano] || {}).forEach(mes => {
        const filtrados = (Array.isArray(db[ano][mes]) ? db[ano][mes] : []).filter(r => r.modulo === modulo);
        if (!filtrados.length) return;
        const mesId = `folder-mes-${ano}-${mes}`;
        html += `
          <div class="folder-month" onclick="toggleElement('${mesId}')" style="color:#3b82f6; padding:10px; cursor:pointer; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; font-weight:600;">
            <span>${mes}</span>
            <i class="fas fa-caret-down"></i>
          </div>
          <div id="${mesId}" style="display:none; padding-left:10px; border-left:2px solid #3b82f6; margin-bottom:10px;">
            ${resumoHtml(`Resumo de ${mes} / ${ano}`, filtrados)}
        `;

        filtrados.forEach((rel, idx) => {
          const relId = `detalhe-${ano}-${mes}-${idx}`;
          html += `
            <div style="background:#1e293b; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid #334155;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="color:white; font-size:13px;"><b>${rel.data}</b><br><small style="color:#94a3b8;">${rel.operador || ""}</small></div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button onclick="toggleElement('${relId}')" style="background:#475569; color:white; border:none; padding:8px 12px; border-radius:5px; font-size:11px; cursor:pointer;">VER</button>
                  <button onclick="gerarPDF_Injecao_Final('${encodeURIComponent(JSON.stringify(rel))}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; font-size:11px; cursor:pointer;">PDF</button>
                </div>
              </div>
              <div id="${relId}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #334155; font-size:12px; color:#cbd5e1;">
                ${(Array.isArray(rel.itens) ? rel.itens : []).map(item => `
                  <div style="margin-bottom:8px;">
                    <b style="color:#10b981;">${item.pir ? "PIR - " : ""}${item.nome} (${item.esp}mm)</b>: ${item.metros}m | Vel: ${item.vel}m/min ${item.espuma ? "| Espuma: " + item.espuma : ""} ${item.fita ? "| Fita: " + item.fita : ""}
                    ${typeof textoDensidadesInjecao === "function" && textoDensidadesInjecao(item.densidades) ? `<div style="font-size:10px; color:#38bdf8;">Densidade: ${textoDensidadesInjecao(item.densidades)}</div>` : ""}
                    <div style="font-size:10px; color:#94a3b8;">Manha: ${item.metrosManha || 0} m | Tarde: ${item.metrosTarde || 0} m | POL: ${item.pol || 0} | POL/PIR: ${item.polpir || 0} | MDI: ${item.mdi || 0} | PEN: ${item.pen || 0} | CAT1: ${item.cat1 || 0} | CAT2: ${item.cat2 || 0} | CAT3: ${item.cat3 || 0} | CAT4: ${item.cat4 || 0}</div>
                  </div>
                `).join("")}
              </div>
            </div>`;
        });

        html += "</div>";
      });

      html += "</div>";
    });

    html += "</div>";
    render.innerHTML = html;
    window.atlasInjecaoAtualizarResumoPeriodo();
    if (typeof window.atlasLimparTextoTela === "function") window.atlasLimparTextoTela();
  };

  try {
    exibirHistoricoModulo = window.exibirHistoricoModulo;
  } catch (erro) {}
})();
