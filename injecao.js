// Modulo Injecao: producao, metros, quimicos, paragens e historico.

export function openInjecao() {
    return window.abrirModulo?.("injecao");
}

export function initInjecao() {
    window.AtlasInjecao = {
        open: openInjecao,
        startProduction: () => window.iniciarProducaoInjecao?.(),
        closeProduction: () => window.fecharDiaInjecao?.(),
        renderHistory: () => window.renderizarHistoricoInjecao?.()
    };
}
