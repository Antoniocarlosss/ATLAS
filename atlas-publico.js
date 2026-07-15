(function () {
  const ADMIN_FLAG = "atlas_public_admin";
  let originalHomeHTML = "";
  let originalLogout = null;

  localStorage.removeItem(ADMIN_FLAG);
  localStorage.removeItem("atlas_sessao_usuario_id");

  function $(selector) {
    return document.querySelector(selector);
  }

  function appReady() {
    return $("#grid-home") && $("#conteudo-modulo") && $("#render-modulo") && typeof window.exibirHistoricoModulo === "function";
  }

  function waitReady(callback, tries = 0) {
    if (appReady()) {
      callback();
      return;
    }
    if (tries > 80) return;
    setTimeout(() => waitReady(callback, tries + 1), 100);
  }

  function setVisitorUser() {
    window.usuarioLogado = {
      id: "visitante",
      nome: "VISITANTE",
      cargo: "visitante"
    };
    try {
      usuarioLogado = window.usuarioLogado;
    } catch (error) {}
  }

  function showAppShell() {
    const login = $("#tela-login");
    const app = $("#app-principal");
    if (login) login.style.display = "none";
    if (app) app.style.display = "block";
  }

  function limparRotaPublica() {
    try {
      const url = new URL(location.href);
      url.searchParams.delete("modulo");
      url.searchParams.delete("pagina");
      url.searchParams.delete("atlas_modulo");
      url.searchParams.delete("atlas_nocache");
      history.replaceState({}, "", url);
    } catch (error) {}
  }

  function setHeaderPublic() {
    const user = $("#user-display");
    if (user) user.textContent = "VISITANTE";

    const subtitle = $(".atlas-system-title span");
    if (subtitle) subtitle.textContent = "Relatórios públicos";

    const logout = $(".btn-logout");
    if (logout) {
      logout.textContent = "Entrar";
      logout.onclick = loginAdminPrompt;
    }
  }

  function renderPublicHome() {
    const grid = $("#grid-home");
    const content = $("#conteudo-modulo");
    if (!grid || !content) return;
    if (!originalHomeHTML) originalHomeHTML = grid.innerHTML;

    content.style.display = "none";
    grid.style.display = "grid";
    grid.innerHTML = `
      <div class="atlas-public-home">
        <section class="atlas-public-hero">
          <p class="eyebrow">ATLAS PAINEL</p>
          <h2>Relatórios de produção</h2>
          <p>Visualize e imprima os históricos da Injeção e da Serra. Para lançar relatórios e acessar o sistema completo, toque em Entrar.</p>
        </section>
        <div class="atlas-public-cards">
          <button class="atlas-public-card" type="button" onclick="atlasPublicoAbrirHistoricoInjecao()">
            <i class="fas fa-microchip"></i>
            <strong>Histórico da Injeção</strong>
            <span>Ver relatórios por ano, mês e dia, com PDF e impressão.</span>
          </button>
          <button class="atlas-public-card serra" type="button" onclick="atlasPublicoAbrirHistoricoSerra()">
            <i class="fas fa-layer-group"></i>
            <strong>Histórico da Serra</strong>
            <span>Ver relatórios de corte por ano, mês e dia, com PDF e impressão.</span>
          </button>
        </div>
      </div>
    `;
  }

  function enterPublicMode() {
    localStorage.removeItem("atlas_sessao_usuario_id");
    limparRotaPublica();
    document.documentElement.classList.add("atlas-public-mode");
    setVisitorUser();
    showAppShell();
    setHeaderPublic();
    renderPublicHome();
  }

  window.atlasPublicoEntrarVisitante = enterPublicMode;

  function enterAdminMode() {
    document.documentElement.classList.remove("atlas-public-mode");
    if (!originalLogout && typeof window.atlasSairSistema === "function") {
      originalLogout = window.atlasSairSistema;
    }
    const grid = $("#grid-home");
    if (grid && originalHomeHTML) {
      grid.innerHTML = originalHomeHTML;
      grid.style.display = "grid";
    }
    const login = $("#tela-login");
    const app = $("#app-principal");
    if (login) login.style.display = "none";
    if (app) app.style.display = "block";

    if (typeof window.garantirAdminSistemaAtlas === "function") {
      window.usuarioLogado = window.garantirAdminSistemaAtlas();
    } else {
      window.usuarioLogado = { id: "admin", nome: "ADMIN", senha: "1234", cargo: "admin" };
    }
    try {
      usuarioLogado = window.usuarioLogado;
    } catch (error) {}

    const user = $("#user-display");
    if (user) user.textContent = "ADMIN";

    const subtitle = $(".atlas-system-title span");
    if (subtitle) subtitle.textContent = "Gestao industrial";

    window.atlasSairSistema = function () {
      localStorage.removeItem(ADMIN_FLAG);
      localStorage.removeItem("atlas_sessao_usuario_id");
      location.reload();
    };

    const logout = $(".btn-logout");
    if (logout) {
      logout.textContent = "Sair";
      logout.onclick = window.atlasSairSistema;
    }

    try {
      if (typeof window.aplicarPermissoesUsuario === "function") window.aplicarPermissoesUsuario();
      if (typeof window.aplicarPreferenciasVisuaisUsuario === "function") window.aplicarPreferenciasVisuaisUsuario();
      if (typeof window.atlasInicializarDashboardHome === "function") window.atlasInicializarDashboardHome();
      if (typeof window.voltarHome === "function") window.voltarHome();
    } catch (error) {
      console.warn("Falha ao abrir modo admin:", error);
    }
  }

  function closeAdminModal() {
    const modal = $("#atlas-admin-modal");
    if (modal) modal.remove();
  }

  function submitAdminLogin(event) {
    event.preventDefault();
    const user = $("#atlas-admin-user");
    const password = $("#atlas-admin-password");
    const error = $("#atlas-admin-error");

    if (String(user && user.value || "").trim().toLowerCase() !== "admin") {
      if (error) error.textContent = "Dados incorretos.";
      if (user) user.focus();
      return;
    }

    if (String(password && password.value || "").trim() !== "1234") {
      if (error) error.textContent = "Dados incorretos.";
      if (password) password.focus();
      return;
    }

    closeAdminModal();
    enterAdminMode();
  }

  function loginAdminPrompt() {
    if ($("#atlas-admin-modal")) {
      const input = $("#atlas-admin-user");
      if (input) input.focus();
      return;
    }

    document.body.insertAdjacentHTML("beforeend", `
      <div id="atlas-admin-modal" class="atlas-admin-modal" role="dialog" aria-modal="true" aria-labelledby="atlas-admin-title">
        <div class="atlas-admin-panel">
          <button class="atlas-admin-close" type="button" aria-label="Fechar login" onclick="atlasPublicoFecharLogin()">×</button>
          <img class="atlas-admin-logo" src="atlas-painel-icon.png" alt="Atlas Painel">
          <p class="atlas-admin-kicker">ACESSO PREMIUM</p>
          <h2 id="atlas-admin-title">Entrar no sistema completo</h2>
          <form id="atlas-admin-form">
            <label for="atlas-admin-user">Login</label>
            <input id="atlas-admin-user" name="login" autocomplete="username">
            <label for="atlas-admin-password">Senha</label>
            <input id="atlas-admin-password" name="senha" type="password" autocomplete="current-password">
            <p id="atlas-admin-error" class="atlas-admin-error" aria-live="polite"></p>
            <button class="atlas-admin-submit" type="submit">Entrar</button>
          </form>
        </div>
      </div>
    `);

    const form = $("#atlas-admin-form");
    if (form) form.addEventListener("submit", submitAdminLogin);
    const input = $("#atlas-admin-user");
    if (input) input.focus();
  }

  window.atlasPublicoFecharLogin = closeAdminModal;

  window.atlasPublicoAbrirHistoricoInjecao = function () {
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    $("#render-modulo").innerHTML = `<button class="atlas-public-back" onclick="atlasPublicoVoltar()">← VOLTAR</button>`;
    window.exibirHistoricoModulo("injecao");
    const render = $("#render-modulo");
    if (render) {
      render.insertAdjacentHTML("afterbegin", `<button class="atlas-public-back" onclick="atlasPublicoVoltar()">← VOLTAR</button>`);
    }
  };

  window.atlasPublicoAbrirHistoricoSerra = function () {
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    window.listarHistoricoSerra();
    const render = $("#render-modulo");
    if (render) {
      render.insertAdjacentHTML("afterbegin", `<button class="atlas-public-back" onclick="atlasPublicoVoltar()">← VOLTAR</button>`);
    }
  };

  window.atlasPublicoVoltar = function () {
    renderPublicHome();
  };

  document.addEventListener("DOMContentLoaded", () => {
    waitReady(() => {
      enterPublicMode();
    });
  });

  function instalarPDFSerraCompleto() {
    const seguro = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
    const numero = valor => {
      const n = Number(String(valor ?? "").replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    const totalItem = item => numero(item && item.metros) * (parseInt(item && item.qtd, 10) || 1);
    const turnoItem = item => {
      const texto = String(item && (item.turno || item.turnoSerra || item.equipe || item.periodo) || "").toLowerCase();
      return texto.includes("tarde") || texto === "2" || texto.includes("pm") ? "tarde" : "manha";
    };
    const qualidadeItem = item => {
      const desc = String(item && item.desc || "").toUpperCase();
      if (desc.includes("PPC")) return "PPC";
      if (desc.includes("P2")) return "P2";
      if (desc.includes("LIXO") || desc.includes("DESCARTE")) return "LIXO";
      if (desc.includes("P1")) return "P1";
      if (desc.includes("PED:")) return "PEDIDO";
      return "OUTROS";
    };
    const ralItem = item => `${item && item.ralI || "-"} / ${item && item.ralS || "-"}`;
    const add = (obj, chave, valor) => {
      obj[chave] = (obj[chave] || 0) + valor;
    };
    const itemEhPedido = item => String(item && item.desc || "").toUpperCase().includes("PED:");

    function linhasItens(lista) {
      if (!lista.length) return `<tr><td colspan="8" class="vazio">Sem itens nesta parte</td></tr>`;
      return lista.map(item => {
        const qtd = parseInt(item.qtd, 10) || 1;
        const metros = numero(item.metros);
        return `
          <tr>
            <td>${seguro(item.tipo || "")}</td>
            <td>${seguro(item.esp || "")} mm</td>
            <td>${seguro(ralItem(item))}</td>
            <td>${qtd}</td>
            <td>${metros.toFixed(2)} m</td>
            <td><b>${(qtd * metros).toFixed(2)} m</b></td>
            <td>${seguro(qualidadeItem(item))}</td>
            <td>${seguro(item.desc || "")}</td>
          </tr>
        `;
      }).join("");
    }

    function tabelaItens(titulo, lista) {
      const total = lista.reduce((s, item) => s + totalItem(item), 0);
      return `
        <div class="subsecao"><span>${seguro(titulo)}</span><b>${total.toFixed(2)} m</b></div>
        <table>
          <thead>
            <tr><th>Tipo</th><th>Esp.</th><th>RAL inf/sup</th><th>Qtd</th><th>Metro un.</th><th>Total</th><th>Classe</th><th>Pedido/stock</th></tr>
          </thead>
          <tbody>${linhasItens(lista)}</tbody>
        </table>
      `;
    }

    function blocoTurno(titulo, lista) {
      const pedidos = lista.filter(itemEhPedido);
      const stock = lista.filter(item => !itemEhPedido(item));
      return `
        <div class="secao">${seguro(titulo)}</div>
        ${tabelaItens("Pedidos", pedidos)}
        ${tabelaItens("Stock", stock)}
      `;
    }

    function linhasResumoQualidadePorTurno(resumo) {
      return ["P1", "P2", "PPC", "LIXO"].map(q => {
        const manha = resumo.manha[q] || 0;
        const tarde = resumo.tarde[q] || 0;
        return `<tr><td>${q}</td><td>${manha.toFixed(2)} m</td><td>${tarde.toFixed(2)} m</td><td><b>${(manha + tarde).toFixed(2)} m</b></td></tr>`;
      }).join("");
    }

    function linhasRalFinal(resumoRal) {
      const rals = Object.keys(resumoRal).sort();
      if (!rals.length) return `<tr><td colspan="4" class="vazio">Sem dados por RAL</td></tr>`;
      return rals.map(ral => {
        const info = resumoRal[ral] || {};
        const manha = info.manha || 0;
        const tarde = info.tarde || 0;
        return `<tr><td>${seguro(ral)}</td><td>${manha.toFixed(2)} m</td><td>${tarde.toFixed(2)} m</td><td><b>${(manha + tarde).toFixed(2)} m</b></td></tr>`;
      }).join("");
    }

    window.gerarPDF_Serra = function(dadosEncoded) {
      const rel = JSON.parse(decodeURIComponent(dadosEncoded));
      const janela = window.open("", "_blank");
      if (!janela) return alert("O navegador bloqueou a abertura do PDF.");

      const itens = Array.isArray(rel.itens) ? rel.itens : [];
      const porTurno = { manha: [], tarde: [] };
      const resumo = {
        manha: { P1: 0, P2: 0, PPC: 0, LIXO: 0 },
        tarde: { P1: 0, P2: 0, PPC: 0, LIXO: 0 }
      };
      const resumoRal = {};

      itens.forEach(item => {
        const turno = turnoItem(item);
        const qualidade = qualidadeItem(item);
        const total = totalItem(item);
        const ral = ralItem(item);
        porTurno[turno].push(item);
        if (resumo[turno][qualidade] !== undefined) add(resumo[turno], qualidade, total);
        resumoRal[ral] ||= { manha: 0, tarde: 0 };
        resumoRal[ral][turno] += total;
      });

      const totalManha = porTurno.manha.reduce((s, i) => s + totalItem(i), 0);
      const totalTarde = porTurno.tarde.reduce((s, i) => s + totalItem(i), 0);
      const totalGeral = totalManha + totalTarde;

      janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatorio Serra</title>
          <style>
            *{box-sizing:border-box} body{margin:0;background:#d1d5db;color:#000;font-family:Arial,Helvetica,sans-serif}
            .page{width:297mm;min-height:210mm;margin:0 auto 8mm;background:#fff;padding:10mm}
            .topo{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;border-bottom:5px solid #e31c24;padding:12px 14px;margin-bottom:7mm}
            .marca{font-size:24px;font-weight:900}.marca span{color:#e31c24}.dados{text-align:right;font-weight:800;line-height:1.45}
            .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-bottom:6mm}.card{border:2px solid #000;padding:8px;text-align:center}.card span{display:block;font-size:11px;text-transform:uppercase;font-weight:800}.card b{font-size:22px}
            .secao{background:#111;color:#fff;text-align:center;font-weight:900;text-transform:uppercase;border:2px solid #000;padding:7px;margin-top:6mm}
            .subsecao{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;background:#e5e7eb;border:1.5px solid #000;border-top:0;padding:5px 8px;font-weight:900;text-transform:uppercase;font-size:12px}
            .subsecao span{grid-column:2;text-align:center}
            .subsecao b{grid-column:3;text-align:right;font-size:14px}
            table{width:100%;border-collapse:collapse;font-size:10px} th,td{border:1.5px solid #000;padding:4px 5px;text-align:center} th{background:#eee}.vazio{padding:10px;color:#555;font-style:italic}.total td{background:#111;color:#fff;font-weight:900}
            .duas{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:4mm}
            .no-print{position:sticky;bottom:0;padding:12px;background:#0f172a}.no-print button{width:100%;padding:16px;border:3px solid #e31c24;border-radius:10px;background:#000;color:#fff;font-size:18px;font-weight:900}
            @media print{body{background:#fff}.page{width:297mm;min-height:210mm;margin:0;padding:9mm}.no-print{display:none!important}@page{size:A4 landscape;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
          </style>
        </head>
        <body>
          <main class="page">
            <header class="topo"><div><div class="marca"><span>ATLAS</span> PAINEL</div><div>RELATORIO DE SERRA POR TURNO</div></div><div class="dados">DATA: ${seguro(rel.data)}<br>OP: ${seguro(rel.operador)}</div></header>
            <section class="cards"><div class="card"><span>Turno da manha</span><b>${totalManha.toFixed(2)} m</b></div><div class="card"><span>Turno da tarde</span><b>${totalTarde.toFixed(2)} m</b></div><div class="card"><span>Total do dia</span><b>${totalGeral.toFixed(2)} m</b></div></section>
            ${blocoTurno("Turno da manha", porTurno.manha)}
            ${blocoTurno("Turno da tarde", porTurno.tarde)}
            <div class="secao">Relatorio final de tudo separado por turno</div>
            <div class="duas">
              <table><thead><tr><th>Classe</th><th>Manha</th><th>Tarde</th><th>Total</th></tr></thead><tbody>${linhasResumoQualidadePorTurno(resumo)}<tr class="total"><td>Total</td><td>${totalManha.toFixed(2)} m</td><td>${totalTarde.toFixed(2)} m</td><td>${totalGeral.toFixed(2)} m</td></tr></tbody></table>
              <table><thead><tr><th>RAL</th><th>Manha</th><th>Tarde</th><th>Total</th></tr></thead><tbody>${linhasRalFinal(resumoRal)}</tbody></table>
            </div>
          </main>
          <div class="no-print"><button onclick="window.print()">CONFIRMAR E GERAR PDF</button></div>
        </body>
        </html>
      `);
      janela.document.close();
      setTimeout(() => janela.focus(), 300);
    };
  }

  instalarPDFSerraCompleto();

  function instalarCorrecaoTurnoSerra() {
    if (window.atlasCorrecaoTurnoSerraAtiva) return;
    window.atlasCorrecaoTurnoSerraAtiva = true;

    const turnoSelecionado = () => {
      const select = document.getElementById("s-turno-serra");
      const valor = String(select && select.value || "").toLowerCase();
      return valor.includes("tarde") ? "tarde" : "manha";
    };

    const salvarTurnoUltimoItem = () => {
      try {
        const turno = turnoSelecionado();
        window.atlasSerraTurnoAtual = turno;
        const hidden = document.getElementById("h-turno-serra");
        if (hidden) hidden.value = turno;

        if (typeof db_serra_live !== "undefined" && Array.isArray(db_serra_live) && db_serra_live.length) {
          const ultimo = db_serra_live[db_serra_live.length - 1];
          ultimo.turno = turno;
          ultimo.turnoSerra = turno;
          ultimo.equipe = turno;
          localStorage.setItem("atlas_serra_live", JSON.stringify(db_serra_live));
        }
      } catch (erro) {
        console.warn("Nao foi possivel marcar turno da Serra:", erro);
      }
    };

    const addOriginal = window.addLinhaSerra;
    if (typeof addOriginal === "function") {
      window.addLinhaSerra = function(modo) {
        const retorno = addOriginal.apply(this, arguments);
        salvarTurnoUltimoItem();
        if (typeof window.atualizarTabelaSerra === "function") window.atualizarTabelaSerra();
        return retorno;
      };
      try { addLinhaSerra = window.addLinhaSerra; } catch (erro) {}
    }

    const tabelaOriginal = window.atualizarTabelaSerra;
    if (typeof tabelaOriginal === "function") {
      window.atualizarTabelaSerra = function() {
        const retorno = tabelaOriginal.apply(this, arguments);
        const lista = document.getElementById("lista-corte-serra");
        try {
          if (lista && typeof db_serra_live !== "undefined" && Array.isArray(db_serra_live)) {
            Array.from(lista.children).forEach((linha, index) => {
              const item = db_serra_live[index];
              if (!item) return;
              const turno = String(item.turno || item.turnoSerra || item.equipe || "").toLowerCase().includes("tarde") ? "TARDE" : "MANHA";
              linha.innerHTML = linha.innerHTML.replace(/MARCADO:\s*TURNO DA (MANHA|TARDE)/g, `MARCADO: TURNO DA ${turno}`);
            });
          }
        } catch (erro) {}
        return retorno;
      };
      try { atualizarTabelaSerra = window.atualizarTabelaSerra; } catch (erro) {}
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(instalarCorrecaoTurnoSerra, 300);
    setTimeout(instalarCorrecaoTurnoSerra, 1200);
  });
})();
