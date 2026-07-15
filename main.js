// Ponto de entrada modular do Atlas.
// Importa os modulos por responsabilidade e cria window.AtlasModules.

import { initAuth } from "./auth.js";
import { initSerra } from "./serra.js";
import { initBobines } from "./bobines.js";
import { initInjecao } from "./injecao.js";
import { initStock } from "./stock.js";
import { initPDF } from "./pdf.js";
import { initFirebaseModule } from "./firebase.js";
import { initPermissoes } from "./permissoes.js";
import { initUI, notify } from "./ui.js";

export function initAtlas() {
    initUI();
    initAuth();
    initPermissoes();
    initSerra();
    initBobines();
    initInjecao();
    initStock();
    initPDF();
    initFirebaseModule();

    window.AtlasModules = {
        auth: window.AtlasAuth,
        permissoes: window.AtlasPermissoes,
        serra: window.AtlasSerra,
        bobines: window.AtlasBobines,
        injecao: window.AtlasInjecao,
        stock: window.AtlasStock,
        pdf: window.AtlasPDF,
        firebase: window.AtlasFirebase,
        ui: window.AtlasUI
    };

    window.dispatchEvent(new CustomEvent("atlasModulosProntos", {
        detail: { modules: Object.keys(window.AtlasModules) }
    }));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAtlas, { once: true });
} else {
    initAtlas();
}

window.addEventListener("atlasModulosProntos", () => {
    console.info("Atlas: arquitetura modular carregada.");
});

window.addEventListener("error", event => {
    console.error("Atlas erro global:", event.error || event.message);
    notify("Erro no sistema. Verifique o console ou tente atualizar.", "error");
});
