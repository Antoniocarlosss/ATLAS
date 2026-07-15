// Modulo Stock: entradas, baixas, movimentacoes e consultas de stock.

export function openStock() {
    return window.abrirModulo?.("stock");
}

export function renderBobinas(filter = "") {
    return window.renderizarStockBobinasAtlas?.(filter);
}

export function renderFilmes(filter = "") {
    return window.renderizarStockFilmesAtlas?.(filter);
}

export function initStock() {
    window.AtlasStock = {
        open: openStock,
        renderBobinas,
        renderFilmes,
        save: () => window.salvarStockAtlas?.(),
        addBobina: () => window.cadastrarBobinaStockAtlas?.(),
        addFilme: () => window.cadastrarFilmeStockAtlas?.()
    };
}
