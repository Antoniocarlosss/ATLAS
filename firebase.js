// Firebase modular: importa a integracao existente uma unica vez e expoe fachada.
// A implementacao pesada permanece em firebase-atlas.js para evitar quebrar a sync atual.

import "./firebase-atlas.js";

export function syncNow() {
    return window.atlasFirebaseSincronizarAgora?.();
}

export function forceRefresh() {
    return window.atlasFirebaseForcarAtualizacao?.();
}

export function diagnostics() {
    return window.atlasFirebaseDiagnosticarRecuperacao?.();
}

export function initFirebaseModule() {
    window.AtlasFirebase = {
        syncNow,
        forceRefresh,
        diagnostics,
        restoreFromCloud: () => window.atlasFirebaseRestaurarRelatoriosDaNuvem?.(),
        restoreLocalSnapshot: () => window.atlasFirebaseRestaurarUltimoSnapshotLocal?.()
    };
}
