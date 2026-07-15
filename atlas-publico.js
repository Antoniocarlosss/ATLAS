(function () {
  const ADMIN_FLAG = "atlas_public_admin";
  let originalHomeHTML = "";
  let originalLogout = null;

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
    document.documentElement.classList.add("atlas-public-mode");
    setVisitorUser();
    showAppShell();
    setHeaderPublic();
    renderPublicHome();
  }

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
      if (error) error.textContent = "Login incorreto.";
      if (user) user.focus();
      return;
    }

    if (String(password && password.value || "").trim() !== "1234") {
      if (error) error.textContent = "Senha incorreta.";
      if (password) password.focus();
      return;
    }

    localStorage.setItem(ADMIN_FLAG, "true");
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
            <input id="atlas-admin-user" name="login" autocomplete="username" placeholder="admin">
            <label for="atlas-admin-password">Senha</label>
            <input id="atlas-admin-password" name="senha" type="password" autocomplete="current-password" placeholder="1234">
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
      if (localStorage.getItem(ADMIN_FLAG) === "true") {
        enterAdminMode();
      } else {
        enterPublicMode();
      }
    });
  });
})();
