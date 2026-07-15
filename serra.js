// Modulo Serra: fachada modular para as rotinas atuais de corte/relatorio.

export function openSerra() {
    return window.abrirModulo?.("serra");
}

export function addLine(mode) {
    return window.addLinhaSerra?.(mode);
}

export function closeDay() {
    return window.fecharDiaSerra?.();
}

export function initSerra() {
    window.AtlasSerra = {
        open: openSerra,
        addLine,
        closeDay,
        setMode: mode => window.setModoCorteSerra?.(mode),
        renderHistory: () => window.renderizarHistoricoSerra?.()
    };
}
