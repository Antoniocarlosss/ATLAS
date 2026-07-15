/* ==========================================================
   ATLAS - FACHADA OCULTA / VISIVEL + BUSCA DO PEDIDO NA SERRA
   Carregar depois de script.js e historicos-admin.js
   ========================================================== */

(function() {
    if (window.atlasAjustesFachadas2026Ativo) return;
    window.atlasAjustesFachadas2026Ativo = true;

    const TIPOS_PAINEL_ATLAS_PADRAO = ["5 Ondas", "Fachada Oculta", "Fachada Visível", "Telha Canudo"];
    const ACABAMENTOS_ATLAS = ["Canelada", "Micronervurada", "Lisa"];
    const ESP_CHAPA_ATLAS = ["", ...(window.OPCOES_ESP_CHAPA || ["0.28", "0.30", "0.32", "0.35", "0.38", "0.40", "0.43", "0.45", "0.50", "0.60", "0.68"])];

    function getTiposPainelAtlas() {
        return window.OPCOES_TIPO_PLANO || TIPOS_PAINEL_ATLAS_PADRAO;
    }

    window.OPCOES_TIPO_PLANO = getTiposPainelAtlas();

    function textoSeguroAtlas(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizarTipoPainelAtlas(valor) {
        const texto = String(valor || "").trim().toLowerCase();
        if (texto === "fachada") return "Fachada Oculta";
        if (texto === "fachada oculta") return "Fachada Oculta";
        if (texto === "fachada visivel" || texto === "fachada visível") return "Fachada Visível";
        return valor || "";
    }

    function painelTemDetalhesAtlas(tipo) {
        return !!normalizarTipoPainelAtlas(tipo);
    }

    function painelTemAcabamentoAtlas(tipo) {
        const normalizado = normalizarTipoPainelAtlas(tipo);
        return normalizado === "Fachada Oculta" || normalizado === "Fachada Visível";
    }

    function htmlOpcoes(lista, selecionado) {
        return lista.map(v => `<option value="${v}" ${String(selecionado || "") === String(v) ? "selected" : ""}>${v || "Opcional"}</option>`).join("");
    }

    function htmlCamposDetalhesPainel(prefixo, item) {
        return `
            <div id="${prefixo}-detalhes-painel" style="display:none; background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin:10px 0;">
                <div style="color:#f59e0b; font-size:12px; font-weight:bold; margin-bottom:10px;">DETALHES DA CHAPA</div>

                <div id="${prefixo}-acabamentos-painel" style="display:none; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <label style="color:#94a3b8; font-size:11px; font-weight:bold;">ACAB. INFERIOR</label>
                        <select id="${prefixo}-acab-inf" style="width:100%; margin-top:5px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                            ${htmlOpcoes(ACABAMENTOS_ATLAS, item?.acabamentoInferior || "Canelada")}
                        </select>
                    </div>
                    <div>
                        <label style="color:#94a3b8; font-size:11px; font-weight:bold;">ACAB. SUPERIOR</label>
                        <select id="${prefixo}-acab-sup" style="width:100%; margin-top:5px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                            ${htmlOpcoes(ACABAMENTOS_ATLAS, item?.acabamentoSuperior || "Canelada")}
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                    <div>
                        <label style="color:#94a3b8; font-size:11px; font-weight:bold;">ESP. CHAPA INF.</label>
                        <select id="${prefixo}-esp-chapa-inf" style="width:100%; margin-top:5px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                            ${htmlOpcoes(ESP_CHAPA_ATLAS, item?.espChapaInferior || "")}
                        </select>
                    </div>
                    <div>
                        <label style="color:#94a3b8; font-size:11px; font-weight:bold;">ESP. CHAPA SUP.</label>
                        <select id="${prefixo}-esp-chapa-sup" style="width:100%; margin-top:5px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                            ${htmlOpcoes(ESP_CHAPA_ATLAS, item?.espChapaSuperior || "")}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    function lerDetalhesPainel(prefixo, tipo) {
        if (!painelTemDetalhesAtlas(tipo)) {
            return {
                acabamentoInferior: "",
                acabamentoSuperior: "",
                espChapaInferior: "",
                espChapaSuperior: ""
            };
        }

        const temAcabamento = painelTemAcabamentoAtlas(tipo);
        return {
            acabamentoInferior: temAcabamento ? (document.getElementById(`${prefixo}-acab-inf`)?.value || "Canelada") : "",
            acabamentoSuperior: temAcabamento ? (document.getElementById(`${prefixo}-acab-sup`)?.value || "Canelada") : "",
            espChapaInferior: document.getElementById(`${prefixo}-esp-chapa-inf`)?.value || "",
            espChapaSuperior: document.getElementById(`${prefixo}-esp-chapa-sup`)?.value || ""
        };
    }

    function aplicarDetalhesAoItem(item, prefixo) {
        if (!item) return item;
        item.tipo = normalizarTipoPainelAtlas(item.tipo);
        Object.assign(item, lerDetalhesPainel(prefixo, item.tipo));
        return item;
    }

    function atualizarBoxDetalhes(prefixo, tipo) {
        const box = document.getElementById(`${prefixo}-detalhes-painel`);
        if (box) box.style.display = painelTemDetalhesAtlas(tipo) ? "block" : "none";
        const acabamentos = document.getElementById(`${prefixo}-acabamentos-painel`);
        if (acabamentos) acabamentos.style.display = painelTemAcabamentoAtlas(tipo) ? "grid" : "none";
    }

    function detalhesLinhaPDF(item) {
        if (!painelTemDetalhesAtlas(item.tipo)) return "";
        const temAcabamento = painelTemAcabamentoAtlas(item.tipo);
        const inf = temAcabamento ? (item.acabamentoInferior || "Canelada") : "";
        const sup = temAcabamento ? (item.acabamentoSuperior || "Canelada") : "";
        const espInf = item.espChapaInferior ? ` | Chapa inf: ${item.espChapaInferior}mm` : "";
        const espSup = item.espChapaSuperior ? ` | Chapa sup: ${item.espChapaSuperior}mm` : "";
        if (!temAcabamento && !espInf && !espSup) return "";
        return `<br><small>${temAcabamento ? `INF: ${inf}<br>SUP: ${sup}` : ""}${espInf}${espSup}</small>`;
    }

    function detalhesLinhaTela(item) {
        if (!painelTemDetalhesAtlas(item.tipo)) return "";
        const temAcabamento = painelTemAcabamentoAtlas(item.tipo);
        const inf = temAcabamento ? (item.acabamentoInferior || "Canelada") : "";
        const sup = temAcabamento ? (item.acabamentoSuperior || "Canelada") : "";
        const espInf = item.espChapaInferior ? ` | Chapa inf: ${item.espChapaInferior}mm` : "";
        const espSup = item.espChapaSuperior ? ` | Chapa sup: ${item.espChapaSuperior}mm` : "";
        if (!temAcabamento && !espInf && !espSup) return "";
        return `<br><small style="color:#fbbf24;">${temAcabamento ? `INF: ${inf} | SUP: ${sup}` : ""}${espInf}${espSup}</small>`;
    }

    function buscarPedidoPlanoAtlas(numero) {
        const n = String(numero || "").trim().toLowerCase();
        if (!n) return null;

        const hist = JSON.parse(localStorage.getItem("atlas_plano_hist")) || [];
        const live = JSON.parse(localStorage.getItem("atlas_plano_live")) || null;
        const fontes = [];

        if (live) {
            fontes.push({
                data: live.dataISO || "",
                operador: live.operador || "",
                itens: [...(live.linhasAbertas || []), ...((live.gruposFinalizados || []).flatMap(g => g.itens || []))]
            });
        }

        hist.forEach(rel => fontes.push(rel));

        for (const rel of fontes.reverse()) {
            const itens = (rel.itens || []).filter(item =>
                item.modo === "pedido" &&
                item.encomendaCancelada !== true &&
                String(item.pedidoNumero || "").trim().toLowerCase() === n
            );

            if (itens.length > 0) return { rel, itens };
        }

        return null;
    }

    window.atlasPreencherPedidoSerra = function() {
        const input = document.getElementById("s-ped-serra");
        if (!input) return;

        const achado = buscarPedidoPlanoAtlas(input.value);
        const info = document.getElementById("atlas-info-pedido-serra");

        if (!achado) {
            if (info) info.innerHTML = "";
            return;
        }

        const item = achado.itens[0];
        document.getElementById("h-tipo-serra").value = normalizarTipoPainelAtlas(item.tipo);
        document.getElementById("h-esp-serra").value = item.espessura;

        const titulo = document.getElementById("atlas-titulo-painel-serra");
        if (titulo) titulo.innerText = `${normalizarTipoPainelAtlas(item.tipo)} - ${item.espessura}mm`;

        const ralI = document.getElementById("s-ral-i-serra");
        const ralS = document.getElementById("s-ral-s-serra");
        if (ralI) ralI.value = item.ralInferior;
        if (ralS) ralS.value = item.ralSuperior;

        const totalPedido = achado.itens.reduce((a, b) => a + Number(b.totalMetros || 0), 0);
        const metros = document.getElementById("s-metros-serra");
        if (metros) metros.value = totalPedido ? totalPedido.toFixed(2) : (item.metrosUnidade || "");

        ["acabamentoInferior", "acabamentoSuperior", "espChapaInferior", "espChapaSuperior"].forEach(k => {
            document.getElementById(`atlas-serra-${k}`)?.remove();
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = `atlas-serra-${k}`;
            hidden.value = item[k] || "";
            document.getElementById("campos-serra")?.appendChild(hidden);
        });

        if (info) {
            info.innerHTML = `
                <div style="background:#052e16; color:#86efac; border:1px solid #10b981; border-radius:8px; padding:10px; margin-bottom:10px; font-size:12px;">
                    Pedido encontrado no Plano: <b>${textoSeguroAtlas(item.destino || "-")}</b><br>
                    ${textoSeguroAtlas(normalizarTipoPainelAtlas(item.tipo))} ${textoSeguroAtlas(item.espessura)}mm |
                    RAL ${textoSeguroAtlas(item.ralInferior)}/${textoSeguroAtlas(item.ralSuperior)} |
                    Total pedido: ${totalPedido.toFixed(2)} m
                    ${detalhesLinhaTela(item)}
                </div>
            `;
        }
    };

    /* ---------------- PLANO ---------------- */

    const abrirFormularioPlanoOriginal = window.abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoOriginal(modo);

        const tipo = document.getElementById("plano-tipo");
        if (tipo) {
            tipo.innerHTML = getTiposPainelAtlas().map(v => `<option value="${v}">${v}</option>`).join("");
            tipo.insertAdjacentHTML("afterend", htmlCamposDetalhesPainel("plano", null));
            tipo.addEventListener("change", () => atualizarBoxDetalhes("plano", tipo.value));
            atualizarBoxDetalhes("plano", tipo.value);
        }
    };

    const adicionarLinhaPlanoOriginal = window.adicionarLinhaPlano;
    window.adicionarLinhaPlano = function(modo) {
        const antes = db_plano_live ? db_plano_live.linhasAbertas.length : 0;
        const tipoAtual = document.getElementById("plano-tipo")?.value;
        adicionarLinhaPlanoOriginal(modo);

        if (db_plano_live && db_plano_live.linhasAbertas.length > antes) {
            const item = db_plano_live.linhasAbertas[db_plano_live.linhasAbertas.length - 1];
            item.tipo = normalizarTipoPainelAtlas(item.tipo || tipoAtual);
            aplicarDetalhesAoItem(item, "plano");
            salvarPlanoLive();
            atualizarTelaPlanoAtual();
        }
    };

    const atualizarTelaPlanoAtualOriginal = window.atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarTelaPlanoAtualOriginal();
        document.querySelectorAll("#plano-lista-aberta > div").forEach((el, idx) => {
            const tipoAtual = document.getElementById("plano-tipo")?.value;
            const espAtual = document.getElementById("plano-esp")?.value;
            const modoAtual = db_plano_live?.modoAtual || "pedido";
            const linhas = (db_plano_live?.linhasAbertas || []).filter(item => item.modo === modoAtual && item.tipo === tipoAtual && String(item.espessura) === String(espAtual));
            if (linhas[idx] && painelTemDetalhesAtlas(linhas[idx].tipo) && !el.innerHTML.includes("Chapa inf")) {
                const small = el.querySelector("small");
                if (small) small.insertAdjacentHTML("beforeend", detalhesLinhaTela(linhas[idx]));
            }
        });
    };

    /* ---------------- SERRA ---------------- */

    window.exibirSetupSerra = function() {
        alternarAbaSerra(true);
        const container = document.getElementById("container-acao-serra");
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:15px;">
                <button onclick="alternarAbaSerra(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
                <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">Configurar Produção</h3>
            </div>
            <div style="margin-bottom:15px; padding:10px; background:#1e293b; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #334155;">
                <label style="color:#94a3b8; font-weight:bold; font-size:12px;">DATA DO RELATÓRIO:</label>
                <input type="date" id="data-manual-serra" style="background:#0f172a; color:white; border:1px solid #3b82f6; padding:5px; border-radius:4px; font-weight:bold;">
            </div>
            <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #334155;">
                <label style="color:#94a3b8; font-size:11px;">TIPO DE PAINEL</label>
                <select id="s-tipo-serra" onchange="atualizarBoxDetalhesSerraSetupAtlas()" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:15px; font-weight:bold;">
                    ${getTiposPainelAtlas().map(v => `<option value="${v}">${v}</option>`).join("")}
                </select>
                <label style="color:#94a3b8; font-size:11px;">ESPESSURA (mm)</label>
                <select id="s-esp-serra" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:10px; font-weight:bold;">
                    ${[30,40,50,60,80,100,120].map(e => `<option value="${e}">${e} mm</option>`).join("")}
                </select>
                ${htmlCamposDetalhesPainel("serra-setup", null)}
                <button onclick="iniciarInterfaceCorteSerra()" style="width:100%; background:white; color:black; font-weight:800; border:none; padding:15px; border-radius:6px; cursor:pointer; text-transform:uppercase;">Abrir Lançamento</button>
            </div>
        `;

        document.getElementById("data-manual-serra").valueAsDate = new Date();
        window.atualizarBoxDetalhesSerraSetupAtlas();
    };

    window.atualizarBoxDetalhesSerraSetupAtlas = function() {
        atualizarBoxDetalhes("serra-setup", document.getElementById("s-tipo-serra")?.value);
    };

    const iniciarInterfaceCorteSerraOriginal = window.iniciarInterfaceCorteSerra;
    window.iniciarInterfaceCorteSerra = function() {
        iniciarInterfaceCorteSerraOriginal();
        const titulo = document.querySelector("#container-acao-serra div[style*='border-left'] > div");
        if (titulo) titulo.id = "atlas-titulo-painel-serra";
    };

    window.setModoCorteSerra = function(modo) {
        const container = document.getElementById("campos-serra");
        if (!container) return;
        document.getElementById("btn-s-ped-serra").style.background = modo === "pedido" ? "#3b82f6" : "#1e293b";
        document.getElementById("btn-s-stk-serra").style.background = modo === "stock" ? "#3b82f6" : "#1e293b";

        const rals = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <select id="s-ral-i-serra" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    ${(window.OPCOES_RAL_INF || []).map(v => `<option value="${v}">INF: ${v}</option>`).join("")}
                </select>
                <select id="s-ral-s-serra" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    ${(window.OPCOES_RAL_SUP || []).map(v => `<option value="${v}">SUP: ${v}</option>`).join("")}
                </select>
            </div>
        `;

        if (modo === "pedido") {
            container.innerHTML = `
                <input type="text" id="s-ped-serra" placeholder="Nº Pedido" oninput="atlasPreencherPedidoSerra()" onchange="atlasPreencherPedidoSerra()" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <div id="atlas-info-pedido-serra"></div>
                ${rals}
                <input type="number" id="s-metros-serra" placeholder="Comprimento (m) - pode editar se for parcial" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <button onclick="addLinhaSerra('pedido')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR</button>
            `;
        } else {
            container.innerHTML = `
                <select id="s-qualidade-serra" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    <option value="P1">P1</option><option value="P2">P2</option><option value="PPC">PPC</option><option value="Descarte">Descarte</option>
                </select>
                ${rals}
                ${htmlCamposDetalhesPainel("serra-linha", { acabamentoInferior:"Canelada", acabamentoSuperior:"Canelada" })}
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <input type="number" id="s-qtd-serra" placeholder="Qtd" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    <input type="number" id="s-metros-serra" placeholder="Metros" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                </div>
                <button onclick="addLinhaSerra('stock')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR STOCK</button>
            `;
            atualizarBoxDetalhes("serra-linha", document.getElementById("h-tipo-serra")?.value);
        }
    };

    window.addLinhaSerra = function(modo) {
        const metros = parseFloat(document.getElementById("s-metros-serra")?.value);
        if (!metros || metros <= 0) return alert("Insira a metragem!");

        const tipo = normalizarTipoPainelAtlas(document.getElementById("h-tipo-serra").value);
        const item = {
            tipo,
            esp: document.getElementById("h-esp-serra").value,
            ralS: document.getElementById("s-ral-s-serra").value,
            ralI: document.getElementById("s-ral-i-serra").value,
            metros,
            qtd: modo === "stock" ? (parseInt(document.getElementById("s-qtd-serra")?.value) || 1) : 1,
            desc: modo === "pedido" ? `PED: ${document.getElementById("s-ped-serra")?.value || "S/N"}` : `STOCK: ${document.getElementById("s-qualidade-serra")?.value || "P1"}`
        };

        if (modo === "pedido") {
            item.acabamentoInferior = document.getElementById("atlas-serra-acabamentoInferior")?.value || "";
            item.acabamentoSuperior = document.getElementById("atlas-serra-acabamentoSuperior")?.value || "";
            item.espChapaInferior = document.getElementById("atlas-serra-espChapaInferior")?.value || "";
            item.espChapaSuperior = document.getElementById("atlas-serra-espChapaSuperior")?.value || "";
        } else {
            Object.assign(item, lerDetalhesPainel("serra-linha", tipo));
        }

        db_serra_live.push(item);
        localStorage.setItem("atlas_serra_live", JSON.stringify(db_serra_live));
        atualizarTabelaSerra();
    };

    const atualizarTabelaSerraOriginal = window.atualizarTabelaSerra;
    window.atualizarTabelaSerra = function() {
        atualizarTabelaSerraOriginal();
        const lista = document.getElementById("lista-corte-serra");
        if (!lista) return;
        Array.from(lista.children).forEach((el, idx) => {
            const item = db_serra_live[idx];
            if (item && painelTemDetalhesAtlas(item.tipo) && !el.innerHTML.includes("Chapa inf")) {
                const span = el.querySelector("span");
                if (span) span.insertAdjacentHTML("beforeend", detalhesLinhaTela(item));
            }
        });
    };

    /* ---------------- EMBALAGEM ---------------- */

    window.exibirSetupEmbalagem = function() {
        alternarAbaEmbalagem(true);
        const container = document.getElementById("container-acao-emb");
        container.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:15px;">
                <button onclick="alternarAbaEmbalagem(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
                <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">Configurar Embalagem</h3>
            </div>
            <div style="margin-bottom:15px; padding:10px; background:#1e293b; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #334155;">
                <label style="color:#94a3b8; font-weight:bold; font-size:12px;">DATA:</label>
                <input type="date" id="data-manual-Embalagem" style="background:#0f172a; color:white; border:1px solid #3b82f6; padding:5px; border-radius:4px; font-weight:bold;">
            </div>
            <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #334155;">
                <label style="color:#94a3b8; font-size:11px;">TIPO DE PAINEL</label>
                <select id="s-tipo" onchange="atualizarBoxDetalhesEmbSetupAtlas()" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:15px; font-weight:bold;">
                    ${getTiposPainelAtlas().map(v => `<option value="${v}">${v}</option>`).join("")}
                </select>
                <label style="color:#94a3b8; font-size:11px;">ESPESSURA (mm)</label>
                <select id="s-esp" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:10px; font-weight:bold;">
                    ${[30,40,50,60,80,100,120].map(e => `<option value="${e}">${e} mm</option>`).join("")}
                </select>
                ${htmlCamposDetalhesPainel("emb-setup", null)}
                <button onclick="iniciarInterfaceCorte()" style="width:100%; background:white; color:black; font-weight:800; border:none; padding:15px; border-radius:6px; cursor:pointer; text-transform:uppercase;">Abrir Lançamento</button>
            </div>
        `;
        document.getElementById("data-manual-Embalagem").valueAsDate = new Date();
        window.atualizarBoxDetalhesEmbSetupAtlas();
    };

    window.atualizarBoxDetalhesEmbSetupAtlas = function() {
        atualizarBoxDetalhes("emb-setup", document.getElementById("s-tipo")?.value);
    };

    window.atlasPreencherPedidoEmbalagem = function() {
        const input = document.getElementById("s-ped");
        if (!input) return;

        const achado = buscarPedidoPlanoAtlas(input.value);
        const info = document.getElementById("atlas-info-pedido-emb");

        if (!achado) {
            if (info) info.innerHTML = "";
            return;
        }

        const item = achado.itens[0];
        const totalPedido = achado.itens.reduce((a, b) => a + Number(b.totalMetros || 0), 0);

        document.getElementById("h-tipo").value = normalizarTipoPainelAtlas(item.tipo);
        document.getElementById("h-esp").value = item.espessura;

        const titulo = document.querySelector("#container-acao-emb div[style*='border-left'] > div");
        if (titulo) titulo.innerText = `${normalizarTipoPainelAtlas(item.tipo)} - ${item.espessura}mm`;

        const ralI = document.getElementById("s-ral-i");
        const ralS = document.getElementById("s-ral-s");
        if (ralI) ralI.value = item.ralInferior;
        if (ralS) ralS.value = item.ralSuperior;

        const metros = document.getElementById("s-metros");
        if (metros) metros.value = totalPedido ? totalPedido.toFixed(2) : (item.metrosUnidade || "");

        ["acabamentoInferior", "acabamentoSuperior", "espChapaInferior", "espChapaSuperior"].forEach(k => {
            document.getElementById(`atlas-emb-${k}`)?.remove();
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.id = `atlas-emb-${k}`;
            hidden.value = item[k] || "";
            document.getElementById("campos-Embalagem")?.appendChild(hidden);
        });

        if (info) {
            info.innerHTML = `
                <div style="background:#052e16; color:#86efac; border:1px solid #10b981; border-radius:8px; padding:10px; margin-bottom:10px; font-size:12px;">
                    Pedido encontrado no Plano: <b>${textoSeguroAtlas(item.destino || "-")}</b><br>
                    ${textoSeguroAtlas(normalizarTipoPainelAtlas(item.tipo))} ${textoSeguroAtlas(item.espessura)}mm |
                    RAL ${textoSeguroAtlas(item.ralInferior)}/${textoSeguroAtlas(item.ralSuperior)} |
                    Total pedido: ${totalPedido.toFixed(2)} m
                    ${detalhesLinhaTela(item)}
                </div>
            `;
        }
    };

    window.setModoCorte = function(modo) {
        const container = document.getElementById("campos-Embalagem");
        if (!container) return;
        document.getElementById("btn-s-ped").style.background = modo === "pedido" ? "#3b82f6" : "#1e293b";
        document.getElementById("btn-s-stk").style.background = modo === "stock" ? "#3b82f6" : "#1e293b";

        const rals = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <select id="s-ral-i" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    ${(window.OPCOES_RAL_INF || []).map(v => `<option value="${v}">INF: ${v}</option>`).join("")}
                </select>
                <select id="s-ral-s" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    ${(window.OPCOES_RAL_SUP || []).map(v => `<option value="${v}">SUP: ${v}</option>`).join("")}
                </select>
            </div>
        `;

        if (modo === "pedido") {
            container.innerHTML = `
                <input type="text" id="s-ped" placeholder="Nº Pedido" oninput="atlasPreencherPedidoEmbalagem()" onchange="atlasPreencherPedidoEmbalagem()" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <div id="atlas-info-pedido-emb"></div>
                ${rals}
                <input type="number" id="s-metros" placeholder="Comprimento (m) - pode editar se for parcial" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <button onclick="addLinhaEmbalagem('pedido')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR</button>
            `;
        } else {
            container.innerHTML = `
                <select id="s-qualidade" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    <option value="P1">P1</option><option value="P2">P2</option><option value="PPC">PPC</option><option value="Descarte">Descarte</option>
                </select>
                ${rals}
                ${htmlCamposDetalhesPainel("emb-linha", { acabamentoInferior:"Canelada", acabamentoSuperior:"Canelada" })}
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <input type="number" id="s-qtd" placeholder="Qtd" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                    <input type="number" id="s-metros" placeholder="Metros" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                </div>
                <button onclick="addLinhaEmbalagem('stock')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR STOCK</button>
            `;
            atualizarBoxDetalhes("emb-linha", document.getElementById("h-tipo")?.value);
        }
    };

    const addLinhaEmbalagemOriginal = window.addLinhaEmbalagem;
    window.addLinhaEmbalagem = function(modo) {
        const antes = db_emb_live.length;
        addLinhaEmbalagemOriginal(modo);
        if (db_emb_live.length > antes) {
            const item = db_emb_live[db_emb_live.length - 1];
            item.tipo = normalizarTipoPainelAtlas(item.tipo);
            if (modo === "pedido") {
                item.acabamentoInferior = document.getElementById("atlas-emb-acabamentoInferior")?.value || "";
                item.acabamentoSuperior = document.getElementById("atlas-emb-acabamentoSuperior")?.value || "";
                item.espChapaInferior = document.getElementById("atlas-emb-espChapaInferior")?.value || "";
                item.espChapaSuperior = document.getElementById("atlas-emb-espChapaSuperior")?.value || "";
            } else {
                Object.assign(item, lerDetalhesPainel("emb-linha", item.tipo));
            }
            localStorage.setItem("atlas_emb_live", JSON.stringify(db_emb_live));
            atualizarTabelaEmbalagem();
        }
    };

    const atualizarTabelaEmbalagemOriginal = window.atualizarTabelaEmbalagem;
    window.atualizarTabelaEmbalagem = function() {
        atualizarTabelaEmbalagemOriginal();
        const lista = document.getElementById("lista-corte");
        if (!lista) return;
        Array.from(lista.children).forEach((el, idx) => {
            const item = db_emb_live[idx];
            if (item && painelTemDetalhesAtlas(item.tipo) && !el.innerHTML.includes("Chapa inf")) {
                const span = el.querySelector("span");
                if (span) span.insertAdjacentHTML("beforeend", detalhesLinhaTela(item));
            }
        });
    };

    /* ---------------- PDFS ---------------- */

    function pdfCorteAtlas(rel, titulo) {
        const blocos = {};
        (rel.itens || []).forEach(it => {
            it.tipo = normalizarTipoPainelAtlas(it.tipo);
            const chave = `${it.tipo} ${it.esp}mm`;
            if (!blocos[chave]) blocos[chave] = { pedidos: [], stock: [] };
            if (String(it.desc || "").toUpperCase().includes("PED:")) blocos[chave].pedidos.push(it);
            else blocos[chave].stock.push(it);
        });

        let htmlConteudo = "";
        Object.keys(blocos).forEach(nome => {
            const grupo = blocos[nome];
            htmlConteudo += `<div style="margin-bottom:30px; page-break-inside:avoid;"><div style="background:#000;color:#fff;padding:8px;font-weight:bold;text-align:center;font-size:16px;border:2px solid #000;">${nome.toUpperCase()}</div>`;

            [["LISTA DE PEDIDOS", grupo.pedidos], ["PRODUÇÃO STOCK", grupo.stock]].forEach(([rotulo, itens]) => {
                if (!itens.length) return;
                const linhas = rotulo === "LISTA DE PEDIDOS"
                    ? Object.values(itens.reduce((acc, item) => {
                        const chave = `${item.desc || "PED: S/N"}|||${item.ralI || ""}|||${item.ralS || ""}|||${item.acabamentoInferior || ""}|||${item.acabamentoSuperior || ""}|||${item.espChapaInferior || ""}|||${item.espChapaSuperior || ""}`;
                        if (!acc[chave]) acc[chave] = { ...item, qtd: 0, metros: 0 };
                        acc[chave].qtd += Number(item.qtd || 1);
                        acc[chave].metros += Number(item.metros || 0) * Number(item.qtd || 1);
                        return acc;
                    }, {}))
                    : itens;
                htmlConteudo += `
                    <div style="text-align:center; padding:5px; background:#ddd; font-weight:bold; border:2px solid #000; border-top:none; color:#000;">${rotulo}</div>
                    <table style="width:100%; border-collapse:collapse; font-size:13px; color:#000; margin-bottom:10px;">
                        <thead><tr style="background:#eee;">
                            <th style="border:2px solid #000;">Qtd</th>
                            <th style="border:2px solid #000;">Mts Un.</th>
                            <th style="border:2px solid #000;">Total</th>
                            <th style="border:2px solid #000;">RAL / Detalhes</th>
                            <th style="border:2px solid #000;">Identificação</th>
                        </tr></thead>
                        <tbody>
                            ${linhas.map(i => `
                                <tr>
                                    <td style="border:2px solid #000; text-align:center;">${rotulo === "LISTA DE PEDIDOS" ? "-" : i.qtd}</td>
                                    <td style="border:2px solid #000; text-align:center;">${rotulo === "LISTA DE PEDIDOS" ? "-" : Number(i.metros).toFixed(2) + "m"}</td>
                                    <td style="border:2px solid #000; text-align:center; font-weight:bold;">${(rotulo === "LISTA DE PEDIDOS" ? Number(i.metros || 0) : Number(i.qtd || 1) * Number(i.metros || 0)).toFixed(2)}m</td>
                                    <td style="border:2px solid #000; text-align:center;">${textoSeguroAtlas(i.ralI)}/${textoSeguroAtlas(i.ralS)}${detalhesLinhaPDF(i)}</td>
                                    <td style="border:2px solid #000; text-align:center;">${textoSeguroAtlas(i.desc)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `;
            });

            htmlConteudo += "</div>";
        });

        const janela = window.open("", "_blank");
        janela.document.write(`
            <html><head><title>${titulo}</title><style>
                body{font-family:Arial,sans-serif;padding:20px;color:#000}
                table tr td,table tr th{border:2px solid #000!important;padding:8px}
                @media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
            </style></head><body>
                <div style="display:flex;justify-content:space-between;border-bottom:5px solid #E31C24;background:#000;color:#fff;padding:15px;align-items:center;">
                    <div><b style="font-size:22px;">ATLAS PAINEL</b><br>${titulo}</div>
                    <div style="text-align:right;font-weight:bold;">DATA: ${rel.data}<br>OP: ${rel.operador}</div>
                </div>
                <div style="margin-top:20px;">${htmlConteudo}</div>
                <div style="margin-top:20px;background:#000!important;color:#fff!important;padding:20px;text-align:right;border:3px solid #000;">
                    <span style="font-size:18px;text-transform:uppercase;display:block;margin-bottom:5px;">Total Geral Produzido</span>
                    <b style="font-size:35px;display:block;line-height:1;">${rel.totalGeral} m</b>
                </div>
                <div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:20px;background:#000;color:#fff;border:3px solid #E31C24;width:100%;font-size:18px;font-weight:bold;border-radius:10px;">CONFIRMAR E GERAR PDF</button></div>
            </body></html>
        `);
        janela.document.close();
    }

    window.gerarPDF_Serra = function(dadosEncoded) {
        pdfCorteAtlas(JSON.parse(decodeURIComponent(dadosEncoded)), "RELATÓRIO DE SERRA");
    };

    window.gerarPDF_Embalagem = function(dadosEncoded) {
        pdfCorteAtlas(JSON.parse(decodeURIComponent(dadosEncoded)), "RELATÓRIO DE EMBALAGEM");
    };

    const montarHTMLPlanoOriginalDetalhes = window.montarHTMLPlano;
    window.montarHTMLPlano = function(rel, comBotaoImpressao) {
        const clone = JSON.parse(JSON.stringify(rel));
        (clone.itens || []).forEach(item => item.tipo = normalizarTipoPainelAtlas(item.tipo));
        let html = montarHTMLPlanoOriginalDetalhes(clone, comBotaoImpressao);

        (clone.itens || []).forEach(item => {
            if (!painelTemDetalhesAtlas(item.tipo)) return;
            const ralAntigo = `${item.ralInferior}/${item.ralSuperior}`;
            const ralNovo = `${item.ralInferior}/${item.ralSuperior}${detalhesLinhaPDF(item)}`;
            html = html.replaceAll(ralAntigo, ralNovo);
        });

        return html;
    };

    const gerarResumoPlanoOriginal = window.gerarResumoPlano;
    window.gerarResumoPlano = function(itens) {
        const normalizados = (itens || []).map(item => ({ ...item, tipo: normalizarTipoPainelAtlas(item.tipo) }));
        return gerarResumoPlanoOriginal(normalizados);
    };
})();
