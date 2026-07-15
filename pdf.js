// PDF centraliza chamadas de exportacao/impressao usadas pelos modulos.

export function printCurrentWindow() {
    return window.print();
}

export function generatePlano(payload) {
    return window.gerarPDF_Plano?.(payload);
}

export function generateInjecao(payload) {
    return window.gerarPDF_Injecao_Final?.(payload);
}

export function generateSerra(payload) {
    return window.gerarPDF_Serra?.(payload);
}

export function initPDF() {
    window.AtlasPDF = {
        printCurrentWindow,
        generatePlano,
        generateInjecao,
        generateSerra
    };
}
