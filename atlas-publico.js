(function () {
  const ADMIN_FLAG = "atlas_public_admin";
  const MESES_PUBLICOS = [
    "Janeiro", "Fevereiro", "Mar\u00e7o", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  let originalHomeHTML = "";
  let originalLogout = null;

  const parametrosEntrada = new URLSearchParams(location.search);
  const rotaInternaSolicitada = parametrosEntrada.has("modulo")
    || parametrosEntrada.has("pagina")
    || parametrosEntrada.has("atlas_modulo");
  if (!rotaInternaSolicitada) {
    localStorage.removeItem(ADMIN_FLAG);
    localStorage.removeItem("atlas_sessao_usuario_id");
  }

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
    if (subtitle) subtitle.textContent = "Relat\u00f3rios p\u00fablicos";

    const logout = $(".btn-logout");
    if (logout) {
      logout.textContent = "Entrar";
      logout.onclick = loginAdminPrompt;
    }
  }

  function atlasSaudacaoAtual() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 19) return "Boa tarde";
    return "Boa noite";
  }

  function atlasIconeTempo(codigo, temperatura) {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(Number(codigo))) {
      return { classe: "fas fa-cloud-showers-heavy", texto: "Chuva" };
    }
    if (Number(temperatura) <= 10) return { classe: "fas fa-snowflake", texto: "Frio" };
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 18) return { classe: "fas fa-sun", texto: "Dia" };
    return { classe: "fas fa-moon", texto: "Noite" };
  }

  function atualizarDataHoraPublica() {
    const agora = new Date();
    const hora = agora.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const data = agora.toLocaleDateString("pt-PT");
    const saudacao = atlasSaudacaoAtual();
    const textoHora = document.getElementById("atlas-public-hora");
    const textoData = document.getElementById("atlas-public-data");
    const textoSaudacao = document.getElementById("atlas-public-saudacao");
    const topoHora = document.getElementById("atlas-home-datahora");
    const topoSaudacao = document.getElementById("atlas-home-saudacao");
    const modoPublico = document.documentElement.classList.contains("atlas-public-mode");
    if (textoHora) textoHora.textContent = hora;
    if (textoData) textoData.textContent = data;
    if (textoSaudacao) textoSaudacao.textContent = saudacao;
    if (modoPublico && topoHora) topoHora.textContent = `${data} ${hora}`;
    if (modoPublico && topoSaudacao) topoSaudacao.textContent = saudacao;
  }

  async function atualizarTempoPublico(lat, lon) {
    const temp = document.getElementById("atlas-public-temp");
    const clima = document.getElementById("atlas-public-clima");
    const icone = document.getElementById("atlas-public-clima-icone");
    if (!temp || !clima || !icone) return;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,weather_code&timezone=auto`;
      const resposta = await fetch(url);
      const dados = await resposta.json();
      const temperatura = Math.round(Number(dados.current?.temperature_2m));
      const info = atlasIconeTempo(dados.current?.weather_code, temperatura);
      temp.textContent = Number.isFinite(temperatura) ? `${temperatura}\u00b0C` : "--\u00b0C";
      clima.textContent = info.texto;
      icone.className = info.classe;
    } catch (error) {
      temp.textContent = "--\u00b0C";
      clima.textContent = "Local";
      icone.className = "fas fa-location-dot";
    }
  }

  function iniciarTempoPublico() {
    atualizarDataHoraPublica();
    clearInterval(window.atlasPublicoRelogioTimer);
    window.atlasPublicoRelogioTimer = setInterval(atualizarDataHoraPublica, 1000);

    const temp = document.getElementById("atlas-public-temp");
    const clima = document.getElementById("atlas-public-clima");
    if (temp) temp.textContent = "Buscando...";
    if (clima) clima.textContent = "Local";

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => atualizarTempoPublico(pos.coords.latitude, pos.coords.longitude),
      () => {
        if (temp) temp.textContent = "--\u00b0C";
        if (clima) clima.textContent = "Sem local";
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 20 * 60 * 1000 }
    );
  }

  function numeroProducao(valor) {
    const n = Number(String(valor ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function dataRelatorio(data) {
    const partes = String(data || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!partes) return null;
    return { mes: Number(partes[2]) - 1, ano: Number(partes[3]) };
  }

  function totaisProducaoAtual() {
    const agora = new Date();
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const vistos = new Set();
    const totais = { mesAnterior: 0, mes: 0, ano: 0 };
    const db = JSON.parse(localStorage.getItem("atlas_db") || "{}");

    Object.entries(db || {}).forEach(([ano, meses]) => {
      Object.entries(meses || {}).forEach(([mes, relatorios]) => {
        (Array.isArray(relatorios) ? relatorios : []).forEach((relatorio, indice) => {
          if (!relatorio || relatorio.modulo !== "injecao") return;
          const data = dataRelatorio(relatorio.data);
          const idsItens = (Array.isArray(relatorio.itens) ? relatorio.itens : [])
            .map(item => item?.id)
            .filter(id => id != null)
            .join(",");
          const chave = relatorio.id != null
            ? `id:${relatorio.id}`
            : relatorio._atlasId != null
              ? `atlas:${relatorio._atlasId}`
              : idsItens ? `${relatorio.data}|${idsItens}` : `${ano}/${mes}/${indice}`;
          if (!data || vistos.has(chave)) return;
          vistos.add(chave);
          const metros = (Array.isArray(relatorio.itens) ? relatorio.itens : []).reduce((soma, item) => {
            const manha = numeroProducao(item?.metrosManha);
            const tarde = numeroProducao(item?.metrosTarde);
            return soma + numeroProducao(item?.metros || manha + tarde);
          }, 0);
          if (data.ano === agora.getFullYear()) {
            totais.ano += metros;
            if (data.mes === agora.getMonth()) totais.mes += metros;
          }
          if (data.ano === mesAnterior.getFullYear() && data.mes === mesAnterior.getMonth()) {
            totais.mesAnterior += metros;
          }
        });
      });
    });
    return totais;
  }

  function formatarMetros(valor) {
    return `${numeroProducao(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  }

  function atualizarProducaoPublica() {
    const mesAnterior = document.getElementById("atlas-public-producao-mes-anterior");
    const mes = document.getElementById("atlas-public-producao-mes");
    const ano = document.getElementById("atlas-public-producao-ano");
    if (!mesAnterior || !mes || !ano) return;
    try {
      const totais = totaisProducaoAtual();
      mesAnterior.textContent = formatarMetros(totais.mesAnterior);
      mes.textContent = formatarMetros(totais.mes);
      ano.textContent = formatarMetros(totais.ano);
    } catch (error) {
      console.error("Nao foi possivel calcular a producao publica:", error);
      mesAnterior.textContent = "N\u00e3o dispon\u00edvel";
      mes.textContent = "N\u00e3o dispon\u00edvel";
      ano.textContent = "N\u00e3o dispon\u00edvel";
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
        <section class="atlas-public-weather">
          <div style="background:#1e293b; border:1px solid #334155; border-radius:14px; padding:16px; color:white;">
            <div style="color:#94a3b8; font-size:13px;">Sauda&ccedil;&atilde;o</div>
            <strong id="atlas-public-saudacao" style="display:block; font-size:24px; margin-top:5px;">${atlasSaudacaoAtual()}</strong>
          </div>
          <div style="background:#1e293b; border:1px solid #334155; border-radius:14px; padding:16px; color:white;">
            <div style="color:#94a3b8; font-size:13px;">Hora atual</div>
            <strong id="atlas-public-hora" style="display:block; font-size:24px; margin-top:5px;">--:--:--</strong>
            <span id="atlas-public-data" style="color:#cbd5e1; font-size:13px;">--/--/----</span>
          </div>
          <div style="background:#1e293b; border:1px solid #334155; border-radius:14px; padding:16px; color:white; display:flex; align-items:center; gap:14px;">
            <i id="atlas-public-clima-icone" class="fas fa-location-dot" style="font-size:30px; color:#facc15;"></i>
            <div>
              <div style="color:#94a3b8; font-size:13px;">Temperatura local</div>
              <strong id="atlas-public-temp" style="display:block; font-size:24px; margin-top:5px;">--&deg;C</strong>
              <span id="atlas-public-clima" style="color:#cbd5e1; font-size:13px;">Local</span>
            </div>
          </div>
          <div class="atlas-public-production-card">
            <i class="fas fa-calendar-minus" aria-hidden="true"></i>
            <div>
              <div class="atlas-public-card-label">Produ&ccedil;&atilde;o do m&ecirc;s anterior</div>
              <strong id="atlas-public-producao-mes-anterior">A carregar...</strong>
              <span>${MESES_PUBLICOS[new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth()]} de ${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}</span>
            </div>
          </div>
          <div class="atlas-public-production-card">
            <i class="fas fa-ruler-horizontal" aria-hidden="true"></i>
            <div>
              <div class="atlas-public-card-label">Produ&ccedil;&atilde;o do m&ecirc;s atual</div>
              <strong id="atlas-public-producao-mes">A carregar...</strong>
              <span>${MESES_PUBLICOS[new Date().getMonth()]} de ${new Date().getFullYear()}</span>
            </div>
          </div>
          <div class="atlas-public-production-card">
            <i class="fas fa-industry" aria-hidden="true"></i>
            <div>
              <div class="atlas-public-card-label">Produ&ccedil;&atilde;o do ano</div>
              <strong id="atlas-public-producao-ano">A carregar...</strong>
              <span>Ano de ${new Date().getFullYear()}</span>
            </div>
          </div>
        </section>
        <section class="atlas-public-hero">
          <p class="eyebrow">ATLAS PAINEL</p>
          <h2>Relat&oacute;rios de produ&ccedil;&atilde;o</h2>
          <p>Visualize e imprima os hist&oacute;ricos da Inje&ccedil;&atilde;o, Serra, Bobines e Embalagem. Para lan&ccedil;ar relat&oacute;rios e acessar o sistema completo, toque em Entrar.</p>
        </section>
        <div class="atlas-public-cards">
          <button class="atlas-public-card" type="button" onclick="atlasPublicoAbrirHistoricoInjecao()">
            <i class="fas fa-microchip"></i>
            <strong>Hist&oacute;rico da Inje&ccedil;&atilde;o</strong>
            <span>Ver relat&oacute;rios por ano, m&ecirc;s e dia, com PDF e impress&atilde;o.</span>
          </button>
          <button class="atlas-public-card serra" type="button" onclick="atlasPublicoAbrirHistoricoSerra(true)">
            <i class="fas fa-layer-group"></i>
            <strong>Hist&oacute;rico da Serra</strong>
            <span>Ver relat&oacute;rios de corte por ano, m&ecirc;s e dia, com PDF e impress&atilde;o.</span>
          </button>
          <button class="atlas-public-card bobines" type="button" onclick="atlasPublicoAbrirHistoricoBobines()">
            <i class="fas fa-compact-disc"></i>
            <strong>Hist&oacute;rico das Bobines</strong>
            <span>Ver relat&oacute;rios de bobines e filmes por ano, m&ecirc;s e dia, com PDF.</span>
          </button>
          <button class="atlas-public-card embalagem" type="button" onclick="atlasPublicoAbrirHistoricoEmbalagem()">
            <i class="fas fa-boxes-packing"></i>
            <strong>Hist&oacute;rico da Embalagem</strong>
            <span>Ver relat&oacute;rios de embalagem por ano, m&ecirc;s e dia, com PDF.</span>
          </button>
        </div>
      </div>
    `;
    iniciarTempoPublico();
    atualizarProducaoPublica();
  }

  window.atlasPublicoRenderHome = renderPublicHome;
  window.addEventListener("atlasDadosNuvemAtualizados", evento => {
    if (!evento.detail?.chaves || evento.detail.chaves.includes("atlas_db")) atualizarProducaoPublica();
  });
  window.addEventListener("storage", evento => {
    if (evento.key === "atlas_db") atualizarProducaoPublica();
  });

  function enterPublicMode() {
    localStorage.removeItem("atlas_sessao_usuario_id");
    limparRotaPublica();
    document.documentElement.classList.add("atlas-public-mode");
    setVisitorUser();
    showAppShell();
    setHeaderPublic();
    renderPublicHome();
    window.atlasFinalizarCarregamentoSistema?.();
  }

  window.atlasPublicoEntrarVisitante = enterPublicMode;

  function enterAdminMode(authenticatedUser) {
    document.documentElement.classList.remove("atlas-public-mode");
    if (window.atlasPublicoRelogioTimer) {
      clearInterval(window.atlasPublicoRelogioTimer);
      window.atlasPublicoRelogioTimer = null;
    }
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

    if (!authenticatedUser || authenticatedUser.bloqueado === true) return;
    window.usuarioLogado = authenticatedUser;
    try {
      usuarioLogado = window.usuarioLogado;
    } catch (error) {}

    const user = $("#user-display");
    if (user) user.textContent = String(authenticatedUser.id || authenticatedUser.nome || "USUARIO").toUpperCase();

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
    window.atlasFinalizarCarregamentoSistema?.();
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

    const userId = String(user && user.value || "").trim().toLowerCase();
    const suppliedPassword = String(password && password.value || "");
    const storedUsers = (() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("atlas_usuarios") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        return [];
      }
    })();
    const authenticatedUser = storedUsers.find(candidate =>
      String(candidate?.id || "").trim().toLowerCase() === userId
      && String(candidate?.senha || "") === suppliedPassword
    );

    if (!authenticatedUser || authenticatedUser.bloqueado === true) {
      if (error) error.textContent = "Dados incorretos.";
      if (password) password.focus();
      return;
    }

    closeAdminModal();
    localStorage.setItem("atlas_sessao_usuario_id", authenticatedUser.id);
    enterAdminMode(authenticatedUser);
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
          <button class="atlas-admin-close" type="button" aria-label="Fechar login" onclick="atlasPublicoFecharLogin()">Ã—</button>
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

  const abrirModuloBasePublico = window.abrirModulo;
  if (typeof abrirModuloBasePublico === "function" && !window.atlasAbrirModuloPublicoProtegido) {
    window.atlasAbrirModuloPublicoProtegido = true;
    window.abrirModulo = function (nome) {
      const modoPublico = document.documentElement.classList.contains("atlas-public-mode") || String(window.usuarioLogado?.id || "").toLowerCase() === "visitante";
      if (modoPublico) {
        if (nome === "injecao") return window.atlasPublicoAbrirHistoricoInjecao();
        if (nome === "serra") return window.atlasPublicoAbrirHistoricoSerra();
        if (nome === "bobines") return window.atlasPublicoAbrirHistoricoBobines();
        if (nome === "embalagem") return window.atlasPublicoAbrirHistoricoEmbalagem();
        return window.atlasPublicoVoltar();
      }
      return abrirModuloBasePublico.apply(this, arguments);
    };
  }

  window.atlasPublicoAbrirHistoricoInjecao = function () {
    window.atlasModuloAtual = "injecao";
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    const titulo = $("#titulo-modulo");
    if (titulo) titulo.textContent = "INJE\u00c7\u00c3O";
    window.exibirHistoricoModulo("injecao");
    atlasPublicoCorrigirHistoricoAberto("injecao");
  };

  window.atlasPublicoAbrirHistoricoSerra = function (solicitadoPeloVisitante = false) {
    if (solicitadoPeloVisitante !== true && window.atlasModuloAtual !== "serra") {
      window.atlasModuloAtual = "";
      renderPublicHome();
      return;
    }
    window.atlasModuloAtual = "serra";
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    const titulo = $("#titulo-modulo");
    if (titulo) titulo.textContent = "SERRA";
    window.listarHistoricoSerra();
    atlasPublicoCorrigirHistoricoAberto("serra");
  };

  window.atlasPublicoAbrirHistoricoBobines = function () {
    window.atlasModuloAtual = "bobines";
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    const titulo = $("#titulo-modulo");
    if (titulo) titulo.textContent = "BOBINES";
    renderizarHistoricoPublico("bobines");
  };

  window.atlasPublicoAbrirHistoricoEmbalagem = function () {
    window.atlasModuloAtual = "embalagem";
    showAppShell();
    $("#grid-home").style.display = "none";
    $("#conteudo-modulo").style.display = "block";
    const titulo = $("#titulo-modulo");
    if (titulo) titulo.textContent = "EMBALAGEM";
    renderizarHistoricoPublico("embalagem");
  };

  function textoPublicoSeguro(valor) {
    return String(valor ?? "").replace(/[<>&"]/g, caractere => ({
      "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"
    }[caractere]));
  }

  function dadosHistoricoPublico(tipo) {
    const chave = tipo === "bobines" ? "historicoBobines" : "atlas_emb_hist";
    const lista = JSON.parse(localStorage.getItem(chave) || "[]");
    return (Array.isArray(lista) ? lista : []).map((relatorio, indice) => {
      const partes = String(relatorio.data || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      return {
        relatorio,
        indice,
        dia: Number(relatorio.dia || partes?.[1] || 0),
        mes: Number(relatorio.mes || partes?.[2] || 0),
        ano: Number(relatorio.ano || partes?.[3] || 0)
      };
    }).filter(item => item.ano && item.mes);
  }

  function renderizarHistoricoPublico(tipo) {
    const render = $("#render-modulo");
    if (!render) return;
    const titulo = tipo === "bobines" ? "Hist\u00f3rico das Bobines" : "Hist\u00f3rico da Embalagem";
    const funcaoPDF = tipo === "bobines" ? "gerarPDF_Bobines" : "gerarPDF_Embalagem";
    const agrupado = {};
    dadosHistoricoPublico(tipo).forEach(item => {
      agrupado[item.ano] ||= {};
      agrupado[item.ano][item.mes] ||= [];
      agrupado[item.ano][item.mes].push(item);
    });

    const anos = Object.keys(agrupado).sort((a, b) => b - a);
    render.innerHTML = `
      <div class="atlas-public-history">
        <h2>${titulo}</h2>
        ${anos.length ? anos.map(ano => `
          <details>
            <summary><span>ANO ${ano}</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary>
            <div class="atlas-public-history-group">
              ${Object.keys(agrupado[ano]).sort((a, b) => b - a).map(mes => `
                <details>
                  <summary><span>${MESES_PUBLICOS[Number(mes) - 1] || mes}</span><i class="fas fa-chevron-down" aria-hidden="true"></i></summary>
                  <div class="atlas-public-history-list">
                    ${agrupado[ano][mes].sort((a, b) => b.dia - a.dia).map(item => `
                      <div>
                        <span><strong>${textoPublicoSeguro(item.relatorio.data || `DIA ${item.dia}/${item.mes}/${item.ano}`)}</strong>${tipo === "embalagem" ? `<small>Total: ${textoPublicoSeguro(item.relatorio.totalGeral || 0)} m</small>` : ""}</span>
                        <button type="button" onclick="${funcaoPDF}('${encodeURIComponent(JSON.stringify(item.relatorio))}')">PDF</button>
                      </div>
                    `).join("")}
                  </div>
                </details>
              `).join("")}
            </div>
          </details>
        `).join("") : `<p class="atlas-public-empty">Nenhum relat&oacute;rio encontrado.</p>`}
      </div>
    `;
  }

  window.atlasPublicoVoltar = function () {
    window.atlasModuloAtual = "";
    renderPublicHome();
  };

  function atlasPublicoCorrigirHistoricoAberto(tipo) {
    const render = $("#render-modulo");
    if (!render) return;

    if (tipo === "bobines" && !render.querySelector(".atlas-public-back")) {
      render.firstElementChild?.insertAdjacentHTML("afterbegin", `<button class="atlas-public-back" type="button" onclick="atlasPublicoVoltar()"><i class="fas fa-arrow-left" aria-hidden="true"></i> Voltar</button>`);
    }

    const raiz = tipo === "embalagem" ? $("#container-acao-emb") || render : render;
    raiz.querySelectorAll("button").forEach(botao => {
      const texto = String(botao.textContent || "").trim().toUpperCase();
      const onclick = String(botao.getAttribute("onclick") || "");
      if (texto === "" || texto === "\u2190" || onclick.includes("renderizarMenuSerra") || onclick.includes("renderizarMenu") || onclick.includes("alternarAbaEmbalagem")) {
        botao.onclick = window.atlasPublicoVoltar;
        botao.setAttribute("onclick", "atlasPublicoVoltar()");
      }
    });

    if (tipo === "serra") {
      render.querySelectorAll(".card").forEach(card => {
        const texto = String(card.textContent || "").toLowerCase();
        if (texto.includes("novo relat") || texto.includes("pacotes")) card.remove();
      });
    }
  }

  const EQUIPES_KEY = "atlas_equipes_turno_nomes";

  function atlasEquipesNomes() {
    try {
      const lista = JSON.parse(localStorage.getItem(EQUIPES_KEY)) || [];
      return [...new Set(lista.map(nome => String(nome || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      return [];
    }
  }

  function atlasSalvarEquipesNomes(lista) {
    localStorage.setItem(EQUIPES_KEY, JSON.stringify([...new Set((lista || []).map(nome => String(nome || "").trim()).filter(Boolean))]));
  }

  function atlasOptionsEquipes(selecionados = []) {
    const nomes = atlasEquipesNomes();
    return nomes.map(nome => `<option value="${nome.replace(/"/g, "&quot;")}" ${selecionados.includes(nome) ? "selected" : ""}>${nome}</option>`).join("");
  }

  function atlasEquipeTurnosHTML() {
    return `
      <div id="atlas-equipe-turnos" style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px; margin:0 0 15px;">
        <div style="color:#ef4444; font-weight:900; font-size:13px; margin-bottom:10px;">EQUIPE POR TURNO</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
          <label style="color:#cbd5e1; font-size:12px; font-weight:800;">Turno da manha
            <select id="atlas-equipe-manha" multiple size="4" style="width:100%; margin-top:6px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${atlasOptionsEquipes()}</select>
          </label>
          <label style="color:#cbd5e1; font-size:12px; font-weight:800;">Turno da tarde
            <select id="atlas-equipe-tarde" multiple size="4" style="width:100%; margin-top:6px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">${atlasOptionsEquipes()}</select>
          </label>
        </div>
        <div style="display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; margin-top:10px;">
          <input id="atlas-equipe-novo-nome" type="text" placeholder="Nome de outra pessoa" style="width:100%; padding:11px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
          <button type="button" onclick="atlasAdicionarNomeEquipeTurno()" style="background:#ef2332; color:white; border:none; border-radius:8px; padding:0 16px; font-weight:900;">ADICIONAR</button>
        </div>
        <button type="button" onclick="atlasApagarNomeEquipeTurno()" style="width:100%; margin-top:8px; background:#334155; color:white; border:1px solid #64748b; border-radius:8px; padding:11px 16px; font-weight:900;">APAGAR NOME SELECIONADO</button>
        <small style="display:block; color:#94a3b8; margin-top:8px;">Pode selecionar mais de um nome segurando Ctrl no computador. No celular, toque nos nomes desejados.</small>
      </div>
    `;
  }

  window.atlasAdicionarNomeEquipeTurno = function () {
    const input = document.getElementById("atlas-equipe-novo-nome");
    const nome = String(input?.value || "").trim();
    if (!nome) return;
    const lista = atlasEquipesNomes();
    if (!lista.some(item => item.toLowerCase() === nome.toLowerCase())) {
      lista.push(nome);
      atlasSalvarEquipesNomes(lista);
    }
    const selecaoAtual = window.atlasColetarEquipesTurno();
    const bloco = document.getElementById("atlas-equipe-turnos");
    if (bloco) {
      bloco.outerHTML = atlasEquipeTurnosHTML();
      ["manha", "tarde"].forEach(turno => {
        const select = document.getElementById(`atlas-equipe-${turno}`);
        (selecaoAtual[turno] || []).concat(nome).forEach(valor => {
          Array.from(select?.options || []).forEach(opt => {
            if (opt.value === valor) opt.selected = true;
          });
        });
      });
    }
  };

  window.atlasApagarNomeEquipeTurno = function () {
    const selecionados = [
      ...Array.from(document.getElementById("atlas-equipe-manha")?.selectedOptions || []),
      ...Array.from(document.getElementById("atlas-equipe-tarde")?.selectedOptions || [])
    ].map(opt => opt.value).filter(Boolean);

    if (!selecionados.length) return alert("Selecione o nome que quer apagar.");
    if (!confirm(`Apagar ${selecionados.join(", ")} da lista de equipes?`)) return;

    const apagar = new Set(selecionados.map(nome => nome.toLowerCase()));
    const lista = atlasEquipesNomes().filter(nome => !apagar.has(nome.toLowerCase()));
    atlasSalvarEquipesNomes(lista);

    const bloco = document.getElementById("atlas-equipe-turnos");
    if (bloco) bloco.outerHTML = atlasEquipeTurnosHTML();
  };

  window.atlasColetarEquipesTurno = function () {
    const ler = id => Array.from(document.getElementById(id)?.selectedOptions || []).map(opt => opt.value).filter(Boolean);
    return { manha: ler("atlas-equipe-manha"), tarde: ler("atlas-equipe-tarde") };
  };

  function instalarEquipesTurnoFormulario() {
    if (document.getElementById("atlas-equipe-turnos")) return;
    const dataInjecao = document.getElementById("data-producao");
    if (dataInjecao) {
      dataInjecao.insertAdjacentHTML("afterend", atlasEquipeTurnosHTML());
      return;
    }
    const dataSerra = document.getElementById("h-data-rel-serra") || document.getElementById("data-manual-serra");
    const containerSerra = document.getElementById("container-acao-serra") || document.getElementById("render-modulo");
    if (dataSerra && containerSerra) {
      dataSerra.closest("div")?.insertAdjacentHTML("afterend", atlasEquipeTurnosHTML());
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    waitReady(() => {
      const temSessaoInterna = rotaInternaSolicitada
        && Boolean(localStorage.getItem("atlas_sessao_usuario_id"));
      if (temSessaoInterna) {
        setTimeout(() => window.atlasFinalizarCarregamentoSistema?.(), 700);
        return;
      }
      enterPublicMode();
    });
    setInterval(instalarEquipesTurnoFormulario, 700);
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
      const equipeManha = Array.isArray(rel.equipesTurno?.manha) ? rel.equipesTurno.manha.join(", ") : (rel.equipeManha || "");
      const equipeTarde = Array.isArray(rel.equipesTurno?.tarde) ? rel.equipesTurno.tarde.join(", ") : (rel.equipeTarde || "");
      let ocorrenciasTemporarias = [];
      try {
        const salvas = JSON.parse(localStorage.getItem("atlas_serra_ocorrencias_live") || "[]");
        ocorrenciasTemporarias = Array.isArray(salvas) ? salvas : [];
      } catch (erro) {}
      const ocorrenciasRelatorio = Array.isArray(rel.ocorrencias)
        ? rel.ocorrencias
        : (Array.isArray(rel.observacoesTurno) ? rel.observacoesTurno : []);
      const ocorrencias = (ocorrenciasRelatorio.length ? ocorrenciasRelatorio : ocorrenciasTemporarias)
        .filter(ocorrencia => String(ocorrencia?.mensagem || "").trim());

      janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatorio Serra</title>
          <style>
            *{box-sizing:border-box} body{margin:0;background:#d1d5db;color:#000;font-family:Arial,Helvetica,sans-serif}
            .page{width:297mm;min-height:210mm;margin:0 auto 8mm;background:#fff;padding:10mm;display:flex;flex-direction:column}
            .topo{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;border-bottom:5px solid #e31c24;padding:12px 14px;margin-bottom:7mm}
            .marca{font-size:24px;font-weight:900}.marca span{color:#e31c24}.dados{text-align:right;font-weight:800;line-height:1.45}
            .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-bottom:6mm}.card{border:2px solid #000;padding:8px;text-align:center}.card span{display:block;font-size:11px;text-transform:uppercase;font-weight:800}.card b{font-size:22px}
            .equipes{width:100%;border-collapse:collapse;margin:-2mm 0 5mm;font-size:11px}.equipes th{background:#eee;text-align:left;width:26%}.equipes td{font-weight:700}
            .secao{background:#111;color:#fff;text-align:center;font-weight:900;text-transform:uppercase;border:2px solid #000;padding:7px;margin-top:6mm}
            .subsecao{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;background:#e5e7eb;border:1.5px solid #000;border-top:0;padding:5px 8px;font-weight:900;text-transform:uppercase;font-size:12px}
            .subsecao span{grid-column:2;text-align:center}
            .subsecao b{grid-column:3;text-align:right;font-size:14px}
            table{width:100%;border-collapse:collapse;font-size:10px} th,td{border:1.5px solid #000;padding:4px 5px;text-align:center} th{background:#eee}.vazio{padding:10px;color:#555;font-style:italic}.total td{background:#111;color:#fff;font-weight:900}
            .duas{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:4mm}
            .ocorrencias{margin-top:auto;padding-top:8mm;border:0;page-break-inside:avoid}.ocorrencias-titulo{background:#8a5a00;color:#fff;text-align:center;font-weight:900;text-transform:uppercase;padding:7px;border:2px solid #000;border-bottom:0}
            .ocorrencia{border-left:2px solid #000;border-right:2px solid #000}.ocorrencia:last-child{border-bottom:2px solid #000}
            .ocorrencia{display:grid;grid-template-columns:42mm 1fr;border-top:1.5px solid #000}.ocorrencia b,.ocorrencia span{padding:7px;font-size:11px;text-align:left}.ocorrencia b{background:#fff3cd;border-right:1.5px solid #000;text-transform:uppercase}
            .no-print{position:sticky;bottom:0;padding:12px;background:#0f172a}.no-print button{width:100%;padding:16px;border:3px solid #e31c24;border-radius:10px;background:#000;color:#fff;font-size:18px;font-weight:900}
            @media print{body{background:#fff}.page{width:297mm;min-height:210mm;margin:0;padding:9mm}.no-print{display:none!important}@page{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
          </style>
        </head>
        <body>
          <main class="page">
            <header class="topo"><div><div class="marca"><span>ATLAS</span> PAINEL</div><div>RELATORIO DE SERRA POR TURNO</div></div><div class="dados">DATA: ${seguro(rel.data)}<br>OP: ${seguro(rel.operador)}</div></header>
            <table class="equipes"><tbody><tr><th>Equipe manha</th><td>${seguro(equipeManha || "-")}</td></tr><tr><th>Equipe tarde</th><td>${seguro(equipeTarde || "-")}</td></tr></tbody></table>
            <section class="cards"><div class="card"><span>Turno da manha</span><b>${totalManha.toFixed(2)} m</b></div><div class="card"><span>Turno da tarde</span><b>${totalTarde.toFixed(2)} m</b></div><div class="card"><span>Total do dia</span><b>${totalGeral.toFixed(2)} m</b></div></section>
            ${blocoTurno("Turno da manha", porTurno.manha)}
            ${blocoTurno("Turno da tarde", porTurno.tarde)}
            <div class="secao">Relatorio final de tudo separado por turno</div>
            <div class="duas">
              <table><thead><tr><th>Classe</th><th>Manha</th><th>Tarde</th><th>Total</th></tr></thead><tbody>${linhasResumoQualidadePorTurno(resumo)}<tr class="total"><td>Total</td><td>${totalManha.toFixed(2)} m</td><td>${totalTarde.toFixed(2)} m</td><td>${totalGeral.toFixed(2)} m</td></tr></tbody></table>
              <table><thead><tr><th>RAL</th><th>Manha</th><th>Tarde</th><th>Total</th></tr></thead><tbody>${linhasRalFinal(resumoRal)}</tbody></table>
            </div>
            ${ocorrencias.length ? `
              <section class="ocorrencias">
                <div class="ocorrencias-titulo">Ocorrencias e informacoes dos turnos</div>
                ${ocorrencias.map(ocorrencia => `
                  <div class="ocorrencia">
                    <b>${ocorrencia.turno === "tarde" ? "Turno da tarde" : "Turno da manha"}</b>
                    <span>${seguro(ocorrencia.mensagem)}</span>
                  </div>
                `).join("")}
              </section>
            ` : ""}
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

