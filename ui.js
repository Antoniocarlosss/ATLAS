// UI central: atalhos seguros para tela, modais e notificacoes.
// Nesta fase, ele preserva as funcoes globais existentes e cria uma API modular.

export function notify(message, type = "info") {
    if (!message) return;
    const colors = {
        info: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444"
    };
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; right:16px; bottom:16px; z-index:60000;
        max-width:min(92vw, 360px); padding:12px 14px; border-radius:8px;
        background:${colors[type] || colors.info}; color:white; font-weight:800;
        box-shadow:0 14px 40px rgba(0,0,0,.35); font-family:Inter,Arial,sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

export function setModuleTitle(title) {
    const el = document.getElementById("titulo-modulo");
    if (el) el.textContent = title || "MODULO";
}

export function renderModule(html) {
    const el = document.getElementById("render-modulo");
    if (el) el.innerHTML = html || "";
}

export function initUI() {
    window.AtlasUI = {
        notify,
        setModuleTitle,
        renderModule,
        openHome: () => window.voltarHome?.(),
        openModule: modulo => window.abrirModulo?.(modulo)
    };
}
