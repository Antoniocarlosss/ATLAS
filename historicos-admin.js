/* ==========================================================
   ATLAS - GERIR HISTORICOS EXCETO PLANO
   Injeção, Bobines, Serra e Embalagem
   ========================================================== */

function atlasPodeGerirHistoricos() {
    const modulosHistorico = ['injecao', 'bobines', 'serra', 'embalagem', 'plano'];
    return usuarioLogado && (
        usuarioLogado.cargo === 'admin' ||
        usuarioLogado.cargo === 'supervisor' ||
        modulosHistorico.some(modulo => usuarioPodeEditarModulo(modulo) || usuarioPodeExcluirModulo(modulo))
    );
}

function atlasPodeGerirHistoricoModulo(modulo) {
    return usuarioPodeEditarModulo(modulo) || usuarioPodeExcluirModulo(modulo);
}

function atlasPodeEditarHistoricoModulo(modulo) {
    return usuarioPodeEditarModulo(modulo);
}

function atlasPodeExcluirHistoricoModulo(modulo) {
    return usuarioPodeExcluirModulo(modulo);
}

function atlasEditorNome() {
    return document.getElementById('user-display')?.innerText || usuarioLogado?.id || 'SEM USUARIO';
}

function atlasAgora() {
    return new Date().toLocaleString('pt-BR');
}

function atlasHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function atlasJS(v) {
    return String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function atlasPDFPayload(obj) {
    return encodeURIComponent(JSON.stringify(obj)).replace(/'/g, '%27');
}

function atlasRegistrarEdicao(rel, acao) {
    const registro = {
        usuario: atlasEditorNome(),
        dataHora: atlasAgora(),
        acao: acao || 'Alteracao no historico'
    };

    if (!Array.isArray(rel.historicoEdicoes)) rel.historicoEdicoes = [];
    rel.historicoEdicoes.push(registro);
    rel.editadoPor = registro.usuario;
    rel.editadoEm = registro.dataHora;
    if (typeof window.atlasRegistrarAuditoria === 'function') {
        window.atlasRegistrarAuditoria('Editou historico', 'historicos', registro.acao);
    }
}

function atlasInfoEdicao(rel) {
    if (!rel?.editadoPor || !rel?.editadoEm) return '';
    return `
        <div style="margin-top:8px; background:#1e293b; border:1px solid #334155; color:#facc15; padding:8px; border-radius:8px; font-size:12px;">
            Ultima edicao: <b>${atlasHtml(rel.editadoPor)}</b> em <b>${atlasHtml(rel.editadoEm)}</b>
        </div>
    `;
}

function atlasGarantirModal(id) {
    let modal = document.getElementById(id);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = id;
    modal.style = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:10000; padding:12px; overflow:auto;';
    document.body.appendChild(modal);
    return modal;
}

function atlasFecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function atlasRecalcularTotalItens(rel) {
    rel.totalGeral = (rel.itens || []).reduce((acc, item) => {
        return acc + ((Number(item.metros) || 0) * (Number(item.qtd) || 1));
    }, 0).toFixed(2);
}

/* ===================== INJECAO ===================== */

function atlasSalvarHistoricoInjecao(ano, mes, index, rel, acao) {
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    atlasRegistrarEdicao(rel, acao);
    db[ano][mes][index] = rel;
    localStorage.setItem('atlas_db', JSON.stringify(db));
}

function atlasAbrirGerirInjecao(ano, mes, index, modulo) {
    if (!atlasPodeGerirHistoricoModulo(modulo)) return alert('Sem permissao para gerir este historico.');
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const rel = db?.[ano]?.[mes]?.[index];
    if (!rel) return alert('Relatorio nao encontrado.');
    atlasRenderGerirInjecao(ano, mes, index, modulo, rel);
}

function atlasRenderGerirInjecao(ano, mes, index, modulo, rel) {
    const modal = atlasGarantirModal('modal-gerir-injecao');
    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                    <div>
                        <h2 style="color:white; margin:0; font-size:18px;">Gerir Injecao</h2>
                        <div style="color:#94a3b8; font-size:12px;">${atlasHtml(rel.data)} | ${atlasHtml(rel.operador)}</div>
                    </div>
                    <button onclick="atlasFecharModal('modal-gerir-injecao')" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">FECHAR</button>
                </div>
                ${atlasInfoEdicao(rel)}
                ${atlasPodeEditarHistoricoModulo(modulo) ? `<button onclick="atlasNovoItemInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},'${atlasJS(modulo)}')" style="margin-top:10px; width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">ADICIONAR ITEM</button>` : ''}
            </div>
            <div style="padding-top:14px;">
                ${(rel.itens || []).map((item, i) => `
                    <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                        <div style="color:white; font-weight:bold;">${item.pir ? 'PIR - ' : ''}${atlasHtml(item.nome)} ${atlasHtml(item.esp)}mm</div>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${atlasHtml(item.metros)} m | Vel: ${atlasHtml(item.vel)}<br>
                            ${item.espuma ? `Espuma: ${atlasHtml(item.espuma)}<br>` : ''}
                            POL ${atlasHtml(item.pol)} | MDI ${atlasHtml(item.mdi)} | PEN ${atlasHtml(item.pen)}
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
                            ${atlasPodeEditarHistoricoModulo(modulo) ? `<button onclick="atlasEditarItemInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},${i},'${atlasJS(modulo)}')" style="background:#f59e0b; color:black; border:none; padding:10px; border-radius:8px; font-weight:bold;">EDITAR</button>` : ''}
                            ${atlasPodeExcluirHistoricoModulo(modulo) ? `<button onclick="atlasRemoverItemInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},${i},'${atlasJS(modulo)}')" style="background:#7f1d1d; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">REMOVER</button>` : ''}
                        </div>
                    </div>
                `).join('') || `<div style="color:#94a3b8; text-align:center; padding:20px;">Sem itens.</div>`}
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

function atlasFormItemInjecao(item, titulo, salvarJS, voltarJS) {
    const paineis = window.OPCOES_TIPO_PLANO || ["5 Ondas", "Telha Canudo", "Fachada oculta", "Fachada visivel", "Fachada ondulada", "Polipainel"];
    const esp = [30,40,50,60,80,100,120];
    const vels = ["5 m/min","6 m/min","8 m/min","9 m/min","10 m/min","11 m/min","12 m/min"];
    return `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; border-bottom:1px solid #334155; padding-bottom:12px;">
                <h2 style="color:white; margin:0; font-size:18px;">${titulo}</h2>
                <button onclick="${voltarJS}" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">VOLTAR</button>
            </div>
            <div style="padding-top:15px;">
                <label style="color:#94a3b8; font-size:12px;">TIPO</label>
                <select id="inj-edit-nome" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${paineis.map(v => `<option value="${v}" ${item?.nome === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <label style="color:#94a3b8; font-size:12px;">ESPESSURA</label>
                <select id="inj-edit-esp" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${esp.map(v => `<option value="${v}" ${String(item?.esp) === String(v) ? 'selected' : ''}>${v} mm</option>`).join('')}
                </select>
                <label style="display:flex; align-items:center; gap:10px; background:#1e293b; border:2px solid #3b82f6; color:white; border-radius:8px; padding:12px; margin:6px 0 12px; font-weight:900;">
                    <input id="inj-edit-pir" type="checkbox" ${item?.pir ? 'checked' : ''} style="width:20px; height:20px;">
                    PIR
                </label>
                <label style="color:#94a3b8; font-size:12px;">ESPUMA</label>
                <select id="inj-edit-espuma" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="">Opcional</option>
                    ${(window.OPCOES_ESPUMA_INJECAO || ["30 mm","35 mm","40 mm","50 mm","65 mm ADH"]).map(v => `<option value="${v}" ${String(item?.espuma || '') === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <label style="color:#94a3b8; font-size:12px;">METROS</label>
                <input id="inj-edit-metros" type="number" step="0.01" value="${atlasHtml(item?.metros || '')}" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <label style="color:#94a3b8; font-size:12px;">VELOCIDADE</label>
                <select id="inj-edit-vel" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${vels.map(v => `<option value="${v}" ${item?.vel === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                    ${['pol','mdi','pen','cat1','cat2','cat3','cat4'].map(k => `
                        <input id="inj-edit-${k}" type="number" placeholder="${k.toUpperCase()}" value="${atlasHtml(item?.[k] || 0)}" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    `).join('')}
                </div>
                <button onclick="${salvarJS}" style="margin-top:14px; width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">SALVAR</button>
            </div>
        </div>
    `;
}

function atlasColetarItemInjecao() {
    const metros = document.getElementById('inj-edit-metros').value;
    if (!metros || Number(metros) <= 0) {
        alert('Informe os metros.');
        return null;
    }
    return {
        id: Date.now(),
        nome: document.getElementById('inj-edit-nome').value,
        esp: document.getElementById('inj-edit-esp').value,
        pir: !!document.getElementById('inj-edit-pir')?.checked,
        espuma: document.getElementById('inj-edit-espuma')?.value || '',
        metros,
        vel: document.getElementById('inj-edit-vel').value,
        pol: document.getElementById('inj-edit-pol').value || 0,
        mdi: document.getElementById('inj-edit-mdi').value || 0,
        pen: document.getElementById('inj-edit-pen').value || 0,
        cat1: document.getElementById('inj-edit-cat1').value || 0,
        cat2: document.getElementById('inj-edit-cat2').value || 0,
        cat3: document.getElementById('inj-edit-cat3').value || 0,
        cat4: document.getElementById('inj-edit-cat4').value || 0,
        paragens: []
    };
}

function atlasEditarItemInjecao(ano, mes, index, itemIndex, modulo) {
    if (!atlasPodeEditarHistoricoModulo(modulo)) return alert('Sem permissao para editar este historico.');
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const rel = db[ano][mes][index];
    const modal = atlasGarantirModal('modal-gerir-injecao');
    modal.innerHTML = atlasFormItemInjecao(
        rel.itens[itemIndex],
        'Editar Item',
        `atlasSalvarItemInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},${itemIndex},'${atlasJS(modulo)}')`,
        `atlasRenderGerirInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},'${atlasJS(modulo)}', JSON.parse(localStorage.getItem('atlas_db'))['${atlasJS(ano)}']['${atlasJS(mes)}'][${index}])`
    );
}

function atlasNovoItemInjecao(ano, mes, index, modulo) {
    if (!atlasPodeEditarHistoricoModulo(modulo)) return alert('Sem permissao para editar este historico.');
    const modal = atlasGarantirModal('modal-gerir-injecao');
    modal.innerHTML = atlasFormItemInjecao(
        null,
        'Novo Item',
        `atlasSalvarNovoItemInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},'${atlasJS(modulo)}')`,
        `atlasRenderGerirInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${index},'${atlasJS(modulo)}', JSON.parse(localStorage.getItem('atlas_db'))['${atlasJS(ano)}']['${atlasJS(mes)}'][${index}])`
    );
}

function atlasSalvarItemInjecao(ano, mes, index, itemIndex, modulo) {
    if (!atlasPodeEditarHistoricoModulo(modulo)) return alert('Sem permissao para editar este historico.');
    const item = atlasColetarItemInjecao();
    if (!item) return;
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const rel = db[ano][mes][index];
    item.id = rel.itens[itemIndex]?.id || Date.now();
    item.paragens = rel.itens[itemIndex]?.paragens || [];
    rel.itens[itemIndex] = item;
    atlasSalvarHistoricoInjecao(ano, mes, index, rel, `Editou item de injecao ${item.nome}`);
    exibirHistoricoModulo(modulo);
    atlasRenderGerirInjecao(ano, mes, index, modulo, rel);
}

function atlasSalvarNovoItemInjecao(ano, mes, index, modulo) {
    if (!atlasPodeEditarHistoricoModulo(modulo)) return alert('Sem permissao para editar este historico.');
    const item = atlasColetarItemInjecao();
    if (!item) return;
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const rel = db[ano][mes][index];
    rel.itens ||= [];
    rel.itens.push(item);
    atlasSalvarHistoricoInjecao(ano, mes, index, rel, `Adicionou item de injecao ${item.nome}`);
    exibirHistoricoModulo(modulo);
    atlasRenderGerirInjecao(ano, mes, index, modulo, rel);
}

function atlasRemoverItemInjecao(ano, mes, index, itemIndex, modulo) {
    if (!atlasPodeExcluirHistoricoModulo(modulo)) return alert('Sem permissao para excluir este historico.');
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const rel = db[ano][mes][index];
    if (!confirm('Remover este item?')) return;
    rel.itens.splice(itemIndex, 1);
    atlasSalvarHistoricoInjecao(ano, mes, index, rel, 'Removeu item de injecao');
    exibirHistoricoModulo(modulo);
    atlasRenderGerirInjecao(ano, mes, index, modulo, rel);
}

exibirHistoricoModulo = function(modulo) {
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const render = document.getElementById('render-modulo');
    let html = `<div style="padding:15px; color:white;"><h2 style="border-bottom:2px solid #3b82f6; padding-bottom:10px;">Historico da Injecao</h2>`;
    let encontrou = false;

    for (let ano in db) {
        html += `<div onclick="toggleElement('folder-ano-${ano}')" style="background:#334155; padding:12px; margin-top:8px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="folder-ano-${ano}" style="display:none; padding:5px 10px;">`;
        for (let mes in db[ano]) {
            const registros = db[ano][mes] || [];
            if (!registros.some(r => r.modulo === modulo)) continue;
            encontrou = true;
            const mesId = `folder-mes-${ano}-${mes}`;
            html += `<div onclick="toggleElement('${mesId}')" style="color:#3b82f6; padding:10px; cursor:pointer; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; font-weight:600;"><span>${mes}</span><i class="fas fa-caret-down"></i></div><div id="${mesId}" style="display:none; padding-left:10px; border-left:2px solid #3b82f6; margin-bottom:10px;">`;
            registros.forEach((rel, idx) => {
                if (rel.modulo !== modulo) return;
                const relId = `detalhe-${ano}-${mes}-${idx}`;
                html += `
                    <div style="background:#1e293b; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid #334155;">
                        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                            <div style="font-size:13px;"><b>${atlasHtml(rel.data)}</b><br><small style="color:#94a3b8;">${atlasHtml(rel.operador)}</small>${atlasInfoEdicao(rel)}</div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button onclick="toggleElement('${relId}')" style="background:#475569; color:white; border:none; padding:7px 10px; border-radius:5px; font-size:11px;">VER</button>
                                ${atlasPodeGerirHistoricoModulo(modulo) ? `<button onclick="atlasAbrirGerirInjecao('${atlasJS(ano)}','${atlasJS(mes)}',${idx},'${atlasJS(modulo)}')" style="background:#f59e0b; color:black; border:none; padding:7px 10px; border-radius:5px; font-size:11px; font-weight:bold;">GERIR</button>` : ''}
                                <button onclick="gerarPDF_Injecao_Final('${atlasPDFPayload(rel)}')" style="background:#10b981; color:white; border:none; padding:7px 10px; border-radius:5px; font-size:11px;">PDF</button>
                            </div>
                        </div>
                        <div id="${relId}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #334155; font-size:12px; color:#cbd5e1;">
                            ${(rel.itens || []).map(item => `<div style="margin-bottom:8px;"><b style="color:#10b981;">${item.pir ? 'PIR - ' : ''}${atlasHtml(item.nome)} (${atlasHtml(item.esp)}mm)</b>: ${atlasHtml(item.metros)}m | Vel: ${atlasHtml(item.vel)} ${item.espuma ? '| Espuma: ' + atlasHtml(item.espuma) : ''}</div>`).join('')}
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }
        html += `</div>`;
    }
    render.innerHTML = encontrou ? html + `</div>` : `<p style="text-align:center; padding:20px; color:gray;">Nenhum historico encontrado.</p>`;
};

/* ===================== BOBINES ===================== */

function atlasSalvarBobines(index, rel, acao) {
    atlasRegistrarEdicao(rel, acao);
    historicoBobines[index] = rel;
    localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));
}

function atlasAbrirGerirBobines(index) {
    if (!atlasPodeGerirHistoricoModulo('bobines')) return alert('Sem permissao para gerir este historico.');
    const rel = historicoBobines[index];
    if (!rel) return alert('Relatorio nao encontrado.');
    atlasRenderGerirBobines(index, rel);
}

function atlasRenderGerirBobines(index, rel) {
    const modal = atlasGarantirModal('modal-gerir-bobines');
    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                    <div><h2 style="color:white; margin:0; font-size:18px;">Gerir Bobines</h2><div style="color:#94a3b8; font-size:12px;">${atlasHtml(rel.data)} | ${atlasHtml(rel.operador)}</div></div>
                    <button onclick="atlasFecharModal('modal-gerir-bobines')" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">FECHAR</button>
                </div>
                ${atlasInfoEdicao(rel)}
                ${atlasPodeEditarHistoricoModulo('bobines') ? `<button onclick="atlasNovoItemBobines(${index})" style="margin-top:10px; width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">ADICIONAR LANCAMENTO</button>` : ''}
            </div>
            <div style="padding-top:14px;">
                ${(rel.itens || []).map((item, i) => `
                    <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                        <div style="color:white; font-weight:bold;">${atlasHtml(item.tipo)} ${atlasHtml(item.lado)} - Producao ${atlasHtml(item.producao)}</div>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${item.tipo === 'filme' ? `Filme: ${atlasHtml(item.subtipo)} | Qtd: ${atlasHtml(item.qtd)}` : `Bobine: ${atlasHtml(item.numBobine)} | RAL: ${atlasHtml(item.ral)} | Status: ${atlasHtml(item.status)}`}
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
                            ${atlasPodeEditarHistoricoModulo('bobines') ? `<button onclick="atlasEditarItemBobines(${index},${i})" style="background:#f59e0b; color:black; border:none; padding:10px; border-radius:8px; font-weight:bold;">EDITAR</button>` : ''}
                            ${atlasPodeExcluirHistoricoModulo('bobines') ? `<button onclick="atlasRemoverItemBobines(${index},${i})" style="background:#7f1d1d; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">REMOVER</button>` : ''}
                        </div>
                    </div>
                `).join('') || `<div style="color:#94a3b8; text-align:center; padding:20px;">Sem lancamentos.</div>`}
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

function atlasFormBobines(item, titulo, salvarJS, voltarJS) {
    return `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; border-bottom:1px solid #334155; padding-bottom:12px;">
                <h2 style="color:white; margin:0; font-size:18px;">${titulo}</h2>
                <button onclick="${voltarJS}" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">VOLTAR</button>
            </div>
            <div style="padding-top:15px;">
                <label style="color:#94a3b8; font-size:12px;">TIPO</label>
                <select id="bob-edit-tipo" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="filme" ${item?.tipo === 'filme' ? 'selected' : ''}>Filme</option>
                    <option value="chapa" ${item?.tipo === 'chapa' ? 'selected' : ''}>Bobina Chapa</option>
                </select>
                <label style="color:#94a3b8; font-size:12px;">POSICAO</label>
                <select id="bob-edit-lado" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="superior" ${item?.lado === 'superior' ? 'selected' : ''}>Superior</option>
                    <option value="inferior" ${item?.lado === 'inferior' ? 'selected' : ''}>Inferior</option>
                </select>
                <input id="bob-edit-subtipo" placeholder="Tipo filme" value="${atlasHtml(item?.subtipo || '')}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="bob-edit-qtd" type="number" placeholder="Quantidade filme" value="${atlasHtml(item?.qtd || 1)}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="bob-edit-num" placeholder="Numero bobine" value="${atlasHtml(item?.numBobine || '')}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="bob-edit-ral" placeholder="RAL" value="${atlasHtml(item?.ral || '')}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <select id="bob-edit-status" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${['SIM','NÃO','ANDAMENTO'].map(v => `<option value="${v}" ${item?.status === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <input id="bob-edit-producao" type="number" placeholder="Producao" value="${atlasHtml(item?.producao || 1)}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <button onclick="${salvarJS}" style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">SALVAR</button>
            </div>
        </div>
    `;
}

function atlasColetarBobines() {
    const tipo = document.getElementById('bob-edit-tipo').value;
    return {
        tipo,
        lado: document.getElementById('bob-edit-lado').value,
        subtipo: document.getElementById('bob-edit-subtipo').value || (tipo === 'filme' ? '1060' : ''),
        qtd: Number(document.getElementById('bob-edit-qtd').value) || 1,
        numBobine: document.getElementById('bob-edit-num').value,
        ral: document.getElementById('bob-edit-ral').value,
        status: document.getElementById('bob-edit-status').value,
        producao: Number(document.getElementById('bob-edit-producao').value) || 1
    };
}

function atlasEditarItemBobines(index, itemIndex) {
    if (!atlasPodeEditarHistoricoModulo('bobines')) return alert('Sem permissao para editar este historico.');
    const rel = historicoBobines[index];
    const modal = atlasGarantirModal('modal-gerir-bobines');
    modal.innerHTML = atlasFormBobines(rel.itens[itemIndex], 'Editar Lancamento', `atlasSalvarItemBobines(${index},${itemIndex})`, `atlasRenderGerirBobines(${index}, historicoBobines[${index}])`);
}

function atlasNovoItemBobines(index) {
    if (!atlasPodeEditarHistoricoModulo('bobines')) return alert('Sem permissao para editar este historico.');
    const modal = atlasGarantirModal('modal-gerir-bobines');
    modal.innerHTML = atlasFormBobines(null, 'Novo Lancamento', `atlasSalvarNovoItemBobines(${index})`, `atlasRenderGerirBobines(${index}, historicoBobines[${index}])`);
}

function atlasSalvarItemBobines(index, itemIndex) {
    if (!atlasPodeEditarHistoricoModulo('bobines')) return alert('Sem permissao para editar este historico.');
    const rel = historicoBobines[index];
    rel.itens[itemIndex] = atlasColetarBobines();
    atlasSalvarBobines(index, rel, 'Editou lancamento de bobines');
    renderizarHistoricoBobines();
    atlasRenderGerirBobines(index, rel);
}

function atlasSalvarNovoItemBobines(index) {
    if (!atlasPodeEditarHistoricoModulo('bobines')) return alert('Sem permissao para editar este historico.');
    const rel = historicoBobines[index];
    rel.itens ||= [];
    rel.itens.push(atlasColetarBobines());
    atlasSalvarBobines(index, rel, 'Adicionou lancamento de bobines');
    renderizarHistoricoBobines();
    atlasRenderGerirBobines(index, rel);
}

function atlasRemoverItemBobines(index, itemIndex) {
    if (!atlasPodeExcluirHistoricoModulo('bobines')) return alert('Sem permissao para excluir este historico.');
    const rel = historicoBobines[index];
    if (!confirm('Remover este lancamento?')) return;
    rel.itens.splice(itemIndex, 1);
    atlasSalvarBobines(index, rel, 'Removeu lancamento de bobines');
    renderizarHistoricoBobines();
    atlasRenderGerirBobines(index, rel);
}

renderizarHistoricoBobines = function() {
    const container = document.getElementById('render-modulo');
    const mesesNome = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const agrupado = {};
    historicoBobines.forEach((rel, index) => {
        const ano = rel.ano || new Date().getFullYear();
        const mes = rel.mes || 1;
        agrupado[ano] ||= {};
        agrupado[ano][mes] ||= [];
        agrupado[ano][mes].push({ rel, index });
    });
    let html = `<div style="padding:20px; color:white;"><h3 style="margin-bottom:20px; font-size:18px;">HISTORICO DE BOBINES</h3>`;
    if (historicoBobines.length === 0) html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum relatorio encontrado.</div>`;
    Object.keys(agrupado).sort((a,b)=>b-a).forEach(ano => {
        html += `<div onclick="toggleElemento('bob-ano-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="bob-ano-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">`;
        Object.keys(agrupado[ano]).sort((a,b)=>b-a).forEach(mes => {
            html += `<div onclick="toggleElemento('bob-mes-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">${mesesNome[mes] || mes}</div><div id="bob-mes-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">`;
            agrupado[ano][mes].forEach(({ rel, index }) => {
                html += `<div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; gap:8px; align-items:center;"><span style="font-size:13px;"><b style="color:white;">${atlasHtml(rel.data)}</b><br><small style="color:#94a3b8;">Op: ${atlasHtml(rel.operador)}</small>${atlasInfoEdicao(rel)}</span><div style="display:flex; gap:8px; flex-wrap:wrap;">${atlasPodeGerirHistoricoModulo('bobines') ? `<button onclick="atlasAbrirGerirBobines(${index})" style="background:#f59e0b; color:black; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; font-size:11px;">GERIR</button>` : ''}<button onclick="gerarPDF_Bobines('${atlasPDFPayload(rel)}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; font-size:11px;">PDF</button></div></div>`;
            });
            html += `</div>`;
        });
        html += `</div>`;
    });
    container.innerHTML = html + `</div>`;
};

/* ===================== SERRA / EMBALAGEM GENERICO ===================== */

function atlasGetStoreCorte(tipo) {
    if (tipo === 'serra') {
        db_serra_hist = JSON.parse(localStorage.getItem('atlas_serra_hist')) || [];
        return {
            hist: db_serra_hist,
            key: 'atlas_serra_hist',
            listar: listarHistoricoSerra,
            pdf: 'gerarPDF_Serra',
            modal: 'modal-gerir-serra',
            titulo: 'Serra'
        };
    }
    db_emb_hist = JSON.parse(localStorage.getItem('atlas_emb_hist')) || [];
    return {
        hist: db_emb_hist,
        key: 'atlas_emb_hist',
        listar: listarHistoricoEmbalagem,
        pdf: 'gerarPDF_Embalagem',
        modal: 'modal-gerir-embalagem',
        titulo: 'Embalagem'
    };
}

function atlasSalvarCorte(tipo, index, rel, acao) {
    const cfg = atlasGetStoreCorte(tipo);
    atlasRegistrarEdicao(rel, acao);
    atlasRecalcularTotalItens(rel);
    cfg.hist[index] = rel;
    localStorage.setItem(cfg.key, JSON.stringify(cfg.hist));
}

function atlasAbrirGerirCorte(tipo, index) {
    if (!atlasPodeGerirHistoricoModulo(tipo)) return alert('Sem permissao para gerir este historico.');
    const cfg = atlasGetStoreCorte(tipo);
    const rel = cfg.hist[index];
    if (!rel) return alert('Relatorio nao encontrado.');
    atlasRenderGerirCorte(tipo, index, rel);
}

function atlasRenderGerirCorte(tipo, index, rel) {
    const cfg = atlasGetStoreCorte(tipo);
    const modal = atlasGarantirModal(cfg.modal);
    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                    <div><h2 style="color:white; margin:0; font-size:18px;">Gerir ${cfg.titulo}</h2><div style="color:#94a3b8; font-size:12px;">${atlasHtml(rel.data)} | Total ${atlasHtml(rel.totalGeral)} m</div></div>
                    <button onclick="atlasFecharModal('${cfg.modal}')" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">FECHAR</button>
                </div>
                ${atlasInfoEdicao(rel)}
                ${atlasPodeEditarHistoricoModulo(tipo) ? `<button onclick="atlasNovoItemCorte('${tipo}',${index})" style="margin-top:10px; width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">ADICIONAR ITEM</button>` : ''}
            </div>
            <div style="padding-top:14px;">
                ${(rel.itens || []).map((item, i) => `
                    <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                        <div style="color:white; font-weight:bold;">${atlasHtml(item.tipo)} ${atlasHtml(item.esp)}mm</div>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${atlasHtml(item.desc)}<br>
                            ${atlasHtml(item.qtd || 1)} x ${atlasHtml(item.metros)} m = ${((Number(item.qtd || 1)) * (Number(item.metros) || 0)).toFixed(2)} m<br>
                            RAL ${atlasHtml(item.ralI)}/${atlasHtml(item.ralS)}
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
                            ${atlasPodeEditarHistoricoModulo(tipo) ? `<button onclick="atlasEditarItemCorte('${tipo}',${index},${i})" style="background:#f59e0b; color:black; border:none; padding:10px; border-radius:8px; font-weight:bold;">EDITAR</button>` : ''}
                            ${atlasPodeExcluirHistoricoModulo(tipo) ? `<button onclick="atlasRemoverItemCorte('${tipo}',${index},${i})" style="background:#7f1d1d; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">REMOVER</button>` : ''}
                        </div>
                    </div>
                `).join('') || `<div style="color:#94a3b8; text-align:center; padding:20px;">Sem itens.</div>`}
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

function atlasFormCorte(tipo, index, item, titulo, salvarJS) {
    const cfg = atlasGetStoreCorte(tipo);
    const tipos = window.OPCOES_TIPO_PLANO || ["5 Ondas", "Fachada", "Telha Canudo"];
    const esp = [30,40,50,60,80,100,120];
    return `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; border-bottom:1px solid #334155; padding-bottom:12px;">
                <h2 style="color:white; margin:0; font-size:18px;">${titulo}</h2>
                <button onclick="atlasRenderGerirCorte('${tipo}',${index}, atlasGetStoreCorte('${tipo}').hist[${index}])" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">VOLTAR</button>
            </div>
            <div style="padding-top:15px;">
                <label style="color:#94a3b8; font-size:12px;">TIPO</label>
                <select id="corte-edit-tipo" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">${tipos.map(v => `<option value="${v}" ${item?.tipo === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
                <label style="color:#94a3b8; font-size:12px;">ESPESSURA</label>
                <select id="corte-edit-esp" style="width:100%; margin:6px 0 12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">${esp.map(v => `<option value="${v}" ${String(item?.esp) === String(v) ? 'selected' : ''}>${v} mm</option>`).join('')}</select>
                <input id="corte-edit-desc" placeholder="PED: numero ou STOCK: qualidade" value="${atlasHtml(item?.desc || 'PED: ')}" style="width:100%; margin-bottom:12px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <input id="corte-edit-qtd" type="number" placeholder="Qtd" value="${atlasHtml(item?.qtd || 1)}" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    <input id="corte-edit-metros" type="number" step="0.01" placeholder="Metros" value="${atlasHtml(item?.metros || '')}" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">
                    <input id="corte-edit-rali" placeholder="RAL INF" value="${atlasHtml(item?.ralI || '')}" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    <input id="corte-edit-rals" placeholder="RAL SUP" value="${atlasHtml(item?.ralS || '')}" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                </div>
                <button onclick="${salvarJS}" style="margin-top:14px; width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">SALVAR</button>
            </div>
        </div>
    `;
}

function atlasColetarCorte() {
    const metros = Number(document.getElementById('corte-edit-metros').value);
    if (!metros || metros <= 0) {
        alert('Informe os metros.');
        return null;
    }
    return {
        tipo: document.getElementById('corte-edit-tipo').value,
        esp: document.getElementById('corte-edit-esp').value,
        desc: document.getElementById('corte-edit-desc').value || 'PED: S/N',
        qtd: Number(document.getElementById('corte-edit-qtd').value) || 1,
        metros,
        ralI: document.getElementById('corte-edit-rali').value,
        ralS: document.getElementById('corte-edit-rals').value
    };
}

function atlasEditarItemCorte(tipo, index, itemIndex) {
    if (!atlasPodeEditarHistoricoModulo(tipo)) return alert('Sem permissao para editar este historico.');
    const cfg = atlasGetStoreCorte(tipo);
    const modal = atlasGarantirModal(cfg.modal);
    modal.innerHTML = atlasFormCorte(tipo, index, cfg.hist[index].itens[itemIndex], 'Editar Item', `atlasSalvarItemCorte('${tipo}',${index},${itemIndex})`);
}

function atlasNovoItemCorte(tipo, index) {
    if (!atlasPodeEditarHistoricoModulo(tipo)) return alert('Sem permissao para editar este historico.');
    const cfg = atlasGetStoreCorte(tipo);
    const modal = atlasGarantirModal(cfg.modal);
    modal.innerHTML = atlasFormCorte(tipo, index, null, 'Novo Item', `atlasSalvarNovoItemCorte('${tipo}',${index})`);
}

function atlasSalvarItemCorte(tipo, index, itemIndex) {
    if (!atlasPodeEditarHistoricoModulo(tipo)) return alert('Sem permissao para editar este historico.');
    const item = atlasColetarCorte();
    if (!item) return;
    const cfg = atlasGetStoreCorte(tipo);
    const rel = cfg.hist[index];
    rel.itens[itemIndex] = item;
    atlasSalvarCorte(tipo, index, rel, `Editou item de ${cfg.titulo}`);
    cfg.listar();
    atlasRenderGerirCorte(tipo, index, rel);
}

function atlasSalvarNovoItemCorte(tipo, index) {
    if (!atlasPodeEditarHistoricoModulo(tipo)) return alert('Sem permissao para editar este historico.');
    const item = atlasColetarCorte();
    if (!item) return;
    const cfg = atlasGetStoreCorte(tipo);
    const rel = cfg.hist[index];
    rel.itens ||= [];
    rel.itens.push(item);
    atlasSalvarCorte(tipo, index, rel, `Adicionou item de ${cfg.titulo}`);
    cfg.listar();
    atlasRenderGerirCorte(tipo, index, rel);
}

function atlasRemoverItemCorte(tipo, index, itemIndex) {
    if (!atlasPodeExcluirHistoricoModulo(tipo)) return alert('Sem permissao para excluir este historico.');
    const cfg = atlasGetStoreCorte(tipo);
    const rel = cfg.hist[index];
    if (!confirm('Remover este item?')) return;
    rel.itens.splice(itemIndex, 1);
    atlasSalvarCorte(tipo, index, rel, `Removeu item de ${cfg.titulo}`);
    cfg.listar();
    atlasRenderGerirCorte(tipo, index, rel);
}

function atlasRenderHistoricoCorte(tipo) {
    const cfg = atlasGetStoreCorte(tipo);
    const container = tipo === 'serra' ? document.getElementById('render-modulo') : document.getElementById('container-acao-emb');
    const mesesNome = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const agrupado = {};
    cfg.hist.forEach((rel, index) => {
        agrupado[rel.ano] ||= {};
        agrupado[rel.ano][rel.mes] ||= [];
        agrupado[rel.ano][rel.mes].push({ rel, index });
    });
    let html = `<div style="${tipo === 'serra' ? 'padding:15px;' : ''} color:white;"><div style="display:flex; align-items:center; margin-bottom:20px;"><button onclick="${tipo === 'serra' ? 'renderizarMenuSerra()' : 'alternarAbaEmbalagem(false)'}" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button><h2 style="border-bottom:2px solid #E31C24; padding-bottom:10px; margin:0; flex:1; font-size:18px;">Historico ${cfg.titulo}</h2></div>`;
    if (cfg.hist.length === 0) html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum relatorio encontrado.</div>`;
    Object.keys(agrupado).sort((a,b)=>b-a).forEach(ano => {
        html += `<div style="margin-bottom:10px;"><div onclick="toggleElemento('${tipo}-ano-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;"><span>ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="${tipo}-ano-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">`;
        Object.keys(agrupado[ano]).sort((a,b)=>b-a).forEach(mes => {
            html += `<div onclick="toggleElemento('${tipo}-mes-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">${mesesNome[mes] || mes}</div><div id="${tipo}-mes-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">`;
            agrupado[ano][mes].forEach(({ rel, index }) => {
                html += `<div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; gap:8px; align-items:center;"><span style="font-size:13px;"><b style="color:white;">DIA ${atlasHtml(rel.dia)}/${atlasHtml(rel.mes)}</b><br><small style="color:#94a3b8;">Total: ${atlasHtml(rel.totalGeral)} m</small>${atlasInfoEdicao(rel)}</span><div style="display:flex; gap:8px; flex-wrap:wrap;">${atlasPodeGerirHistoricoModulo(tipo) ? `<button onclick="atlasAbrirGerirCorte('${tipo}',${index})" style="background:#f59e0b; color:black; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; font-size:11px;">GERIR</button>` : ''}<button onclick='${cfg.pdf}("${atlasPDFPayload(rel)}")' style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; font-size:11px;">PDF</button></div></div>`;
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html + `</div>`;
}

listarHistoricoSerra = function() {
    atlasRenderHistoricoCorte('serra');
};

listarHistoricoEmbalagem = function() {
    alternarAbaEmbalagem(true);
    atlasRenderHistoricoCorte('embalagem');
};

/* ===================== PDF EDICAO ===================== */

function atlasInserirEdicaoNoHTML(html, rel) {
    if (!rel?.editadoPor || !rel?.editadoEm) return html;
    const bloco = `
        <div style="margin:12px 20px; background:#fff7ed; color:#000; padding:10px; border:2px solid #f59e0b; font-size:12px; font-weight:bold;">
            EDITADO POR: ${atlasHtml(rel.editadoPor)} | DATA/HORA: ${atlasHtml(rel.editadoEm)}
        </div>
    `;
    return html.replace('<div style="margin-top:20px;">', bloco + '<div style="margin-top:20px;">');
}

if (typeof gerarPDF_Serra === 'function' && !window.atlasPDFSerraOriginal) {
    window.atlasPDFSerraOriginal = gerarPDF_Serra;
}

if (typeof gerarPDF_Embalagem === 'function' && !window.atlasPDFEmbOriginal) {
    window.atlasPDFEmbOriginal = gerarPDF_Embalagem;
}
/* ==========================================================
   APAGAR RELATÓRIO INTEIRO - HISTÓRICOS
   Cole no FINAL do historicos-admin.js
   ========================================================== */

function atlasApagarRelatorioInjecao(ano, mes, index, modulo) {
    if (!atlasPodeExcluirHistoricoModulo(modulo)) return alert('Sem permissao para excluir este historico.');
    if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');

    const confirmar = confirm('Tem certeza que deseja apagar este relatório inteiro?');
    if (!confirmar) return;

    const confirmar2 = confirm('Esta ação não pode ser desfeita. Deseja continuar?');
    if (!confirmar2) return;

    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};

    if (!db?.[ano]?.[mes]?.[index]) {
        alert('Relatório não encontrado.');
        return;
    }

    db[ano][mes].splice(index, 1);

    if (db[ano][mes].length === 0) delete db[ano][mes];
    if (Object.keys(db[ano]).length === 0) delete db[ano];

    localStorage.setItem('atlas_db', JSON.stringify(db));

    atlasFecharModal('modal-gerir-injecao');
    exibirHistoricoModulo(modulo);
    alert('Relatório apagado.');
}

function atlasApagarRelatorioBobines(index) {
    if (!atlasPodeExcluirHistoricoModulo('bobines')) return alert('Sem permissao para excluir este historico.');
    if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');

    const confirmar = confirm('Tem certeza que deseja apagar este relatório inteiro?');
    if (!confirmar) return;

    const confirmar2 = confirm('Esta ação não pode ser desfeita. Deseja continuar?');
    if (!confirmar2) return;

    if (!historicoBobines[index]) {
        alert('Relatório não encontrado.');
        return;
    }

    historicoBobines.splice(index, 1);
    localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));

    atlasFecharModal('modal-gerir-bobines');
    renderizarHistoricoBobines();
    alert('Relatório apagado.');
}

function atlasApagarRelatorioCorte(tipo, index) {
    if (!atlasPodeExcluirHistoricoModulo(tipo)) return alert('Sem permissao para excluir este historico.');
    if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');

    const confirmar = confirm('Tem certeza que deseja apagar este relatório inteiro?');
    if (!confirmar) return;

    const confirmar2 = confirm('Esta ação não pode ser desfeita. Deseja continuar?');
    if (!confirmar2) return;

    const cfg = atlasGetStoreCorte(tipo);

    if (!cfg.hist[index]) {
        alert('Relatório não encontrado.');
        return;
    }

    cfg.hist.splice(index, 1);
    localStorage.setItem(cfg.key, JSON.stringify(cfg.hist));

    atlasFecharModal(cfg.modal);
    cfg.listar();
    alert('Relatório apagado.');
}

/* Reabre os GERIR adicionando botão APAGAR no topo */

const atlasRenderGerirInjecaoComApagar = atlasRenderGerirInjecao;
atlasRenderGerirInjecao = function(ano, mes, index, modulo, rel) {
    atlasRenderGerirInjecaoComApagar(ano, mes, index, modulo, rel);

    const modal = document.getElementById('modal-gerir-injecao');
    const topo = modal?.querySelector('div[style*="position:sticky"]');
    if (!topo || topo.querySelector('#btn-apagar-injecao')) return;
    if (!atlasPodeExcluirHistoricoModulo(modulo)) return;

    const btn = document.createElement('button');
    btn.id = 'btn-apagar-injecao';
    btn.innerText = 'APAGAR RELATÓRIO';
    btn.onclick = function() {
        atlasApagarRelatorioInjecao(ano, mes, index, modulo);
    };
    btn.style = 'margin-top:8px; width:100%; background:#7f1d1d; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;';
    topo.appendChild(btn);
};

const atlasRenderGerirBobinesComApagar = atlasRenderGerirBobines;
atlasRenderGerirBobines = function(index, rel) {
    atlasRenderGerirBobinesComApagar(index, rel);

    const modal = document.getElementById('modal-gerir-bobines');
    const topo = modal?.querySelector('div[style*="position:sticky"]');
    if (!topo || topo.querySelector('#btn-apagar-bobines')) return;
    if (!atlasPodeExcluirHistoricoModulo('bobines')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-apagar-bobines';
    btn.innerText = 'APAGAR RELATÓRIO';
    btn.onclick = function() {
        atlasApagarRelatorioBobines(index);
    };
    btn.style = 'margin-top:8px; width:100%; background:#7f1d1d; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;';
    topo.appendChild(btn);
};

const atlasRenderGerirCorteComApagar = atlasRenderGerirCorte;
atlasRenderGerirCorte = function(tipo, index, rel) {
    atlasRenderGerirCorteComApagar(tipo, index, rel);

    const cfg = atlasGetStoreCorte(tipo);
    const modal = document.getElementById(cfg.modal);
    const topo = modal?.querySelector('div[style*="position:sticky"]');
    if (!topo || topo.querySelector('#btn-apagar-corte')) return;
    if (!atlasPodeExcluirHistoricoModulo(tipo)) return;

    const btn = document.createElement('button');
    btn.id = 'btn-apagar-corte';
    btn.innerText = 'APAGAR RELATÓRIO';
    btn.onclick = function() {
        atlasApagarRelatorioCorte(tipo, index);
    };
    btn.style = 'margin-top:8px; width:100%; background:#7f1d1d; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;';
    topo.appendChild(btn);
};
