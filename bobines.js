// Modulo Bobines: relatorios de bobinas/filmes e calculadoras.

export function openBobines() {
    return window.abrirModulo?.("bobines");
}

export function addEntry() {
    return window.adicionarAoLancamento?.();
}

export function closeDay() {
    return window.fecharDia?.();
}

export function initBobines() {
    window.AtlasBobines = {
        open: openBobines,
        addEntry,
        closeDay,
        setType: tipo => window.setTipoLancamento?.(tipo),
        setSide: lado => window.setLado?.(lado),
        renderNewReport: () => window.renderizarNovoRelatorio?.(),
        renderHistory: () => window.renderizarHistoricoBobines?.()
    };
}
