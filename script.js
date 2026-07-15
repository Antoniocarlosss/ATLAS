// --- BANCO DE USUARIOS ---
let usuariosSistema = atlasArrayLocal('atlas_usuarios', [
    { id: "admin", senha: "123", cargo: "admin" }
]);

let usuarioLogado = null;
const MODULOS_SISTEMA = [
    { chave: 'injecao', nome: 'Injeção' },
    { chave: 'bobines', nome: 'Bobines' },
    { chave: 'serra', nome: 'Serra' },
    { chave: 'embalagem', nome: 'Embalagem' },
    { chave: 'plano', nome: 'Plano' },
    { chave: 'stock', nome: 'Stock' },
    { chave: 'gestao', nome: 'Gestão' },
    { chave: 'config', nome: 'Ajustes' },
    { chave: 'lixeira', nome: 'Lixeira' },
    { chave: 'permissoes', nome: 'PermissÃµes' }
];

function obterChavePreferenciasUsuario(idUsuario) {
    return `atlas_pref_${String(idUsuario || '').toLowerCase()}`;
}

function obterChavePreferenciasGrupo(cargo) {
    return `atlas_pref_grupo_${normalizarCargoUsuario(cargo)}`;
}

function normalizarCargoUsuario(cargo) {
    return String(cargo || 'operario').trim().toLowerCase();
}

function obterCargoUsuarioPorId(idUsuario) {
    const usuario = usuariosSistema.find(u => String(u.id).toLowerCase() === String(idUsuario || '').toLowerCase());
    const cargo = usuario?.cargo || (usuarioLogado && String(usuarioLogado.id).toLowerCase() === String(idUsuario || '').toLowerCase() ? usuarioLogado.cargo : 'operario');
    return normalizarCargoUsuario(cargo);
}

function obterModulosPermissoesAtlas() {
    const extras = [
        { chave: 'conferencia', nome: 'Conferencia' },
        { chave: 'pesquisa_encomenda', nome: 'Pesquisar' },
        { chave: 'lembretes', nome: 'Lembretes' },
        { chave: 'auditoria', nome: 'Registros' }
    ];
    return [...MODULOS_SISTEMA, ...extras].filter((mod, index, self) => self.findIndex(item => item.chave === mod.chave) === index);
}

function obterPreferenciasBaseCargo(cargoInformado) {
    const cargo = normalizarCargoUsuario(cargoInformado);
    const basicos = ['injecao', 'bobines', 'serra', 'embalagem', 'plano', 'config'];
    const restritos = ['gestao', 'conferencia', 'stock', 'lixeira', 'pesquisa_encomenda', 'lembretes', 'auditoria'];
    const supervisorTotal = [...basicos, ...restritos];
    const modulosVisiveis = cargo === 'admin'
        ? [...basicos, ...restritos, 'permissoes']
        : (cargo === 'supervisor' ? supervisorTotal : [...basicos, 'lixeira']);
    const modulosEditaveis = cargo === 'admin'
        ? [...basicos, ...restritos, 'permissoes']
        : (cargo === 'supervisor' ? supervisorTotal.filter(chave => chave !== 'auditoria') : []);
    const modulosExcluiveis = cargo === 'admin'
        ? [...basicos, ...restritos, 'permissoes']
        : (cargo === 'supervisor' ? supervisorTotal.filter(chave => chave !== 'auditoria') : []);
    return {
        tema: 'escuro',
        modulosVisiveis,
        modulosEditaveis,
        modulosExcluiveis
    };
}

function obterPreferenciasGrupoCargo(cargoInformado) {
    const cargo = normalizarCargoUsuario(cargoInformado);
    const base = obterPreferenciasBaseCargo(cargo);
    if (cargo === 'admin') return base;

    try {
        const salvas = atlasJSONLocal(obterChavePreferenciasGrupo(cargo), {});
        return {
            tema: salvas.tema || base.tema,
            modulosVisiveis: Array.isArray(salvas.modulosVisiveis) ? salvas.modulosVisiveis : base.modulosVisiveis,
            modulosEditaveis: Array.isArray(salvas.modulosEditaveis) ? salvas.modulosEditaveis : base.modulosEditaveis,
            modulosExcluiveis: Array.isArray(salvas.modulosExcluiveis) ? salvas.modulosExcluiveis : base.modulosExcluiveis
        };
    } catch (erro) {
        return base;
    }
}

function obterPreferenciasPadraoUsuario(idUsuario) {
    return obterPreferenciasGrupoCargo(obterCargoUsuarioPorId(idUsuario));
}

function usuarioEhAdminSupervisor() {
    const cargo = normalizarCargoUsuario(usuarioLogado?.cargo);
    return usuarioLogado && (cargo === 'admin' || cargo === 'supervisor');
}

function usuarioEhAdmin() {
    return usuarioLogado && normalizarCargoUsuario(usuarioLogado.cargo) === 'admin';
}

function atlasJSONLocal(chave, fallback) {
    try {
        const valor = JSON.parse(localStorage.getItem(chave));
        return valor === null || valor === undefined ? fallback : valor;
    } catch (erro) {
        return fallback;
    }
}

function atlasArrayLocal(chave, fallback = []) {
    const valor = atlasJSONLocal(chave, fallback);
    return Array.isArray(valor) ? valor : fallback;
}

function atlasRecarregarDadosLocaisDaNuvem() {
    try {
        usuariosSistema = atlasArrayLocal('atlas_usuarios', usuariosSistema || []);
        if (typeof historicoBobines !== 'undefined') historicoBobines = atlasArrayLocal('historicoBobines', historicoBobines || []);
        if (typeof db_serra_live !== 'undefined') db_serra_live = atlasArrayLocal('atlas_serra_live', db_serra_live || []);
        if (typeof db_serra_hist !== 'undefined') db_serra_hist = atlasArrayLocal('atlas_serra_hist', db_serra_hist || []);
        if (typeof db_emb_live !== 'undefined') db_emb_live = atlasArrayLocal('atlas_emb_live', db_emb_live || []);
        if (typeof db_emb_hist !== 'undefined') db_emb_hist = atlasArrayLocal('atlas_emb_hist', db_emb_hist || []);
        if (typeof db_plano_live !== 'undefined') db_plano_live = atlasJSONLocal('atlas_plano_live', db_plano_live || null);
        if (typeof db_plano_hist !== 'undefined') db_plano_hist = atlasArrayLocal('atlas_plano_hist', db_plano_hist || []);
        if (typeof destinosPlano !== 'undefined') destinosPlano = atlasArrayLocal('atlas_plano_destinos', destinosPlano || []);
        if (typeof db_conferencia_serra !== 'undefined') db_conferencia_serra = atlasArrayLocal('atlas_conferencia_serra', db_conferencia_serra || []);
        if (typeof atlasStockBobinas !== 'undefined') atlasStockBobinas = atlasArrayLocal('atlas_stock_bobinas', atlasStockBobinas || []);
        if (typeof atlasStockFilmes !== 'undefined') atlasStockFilmes = atlasArrayLocal('atlas_stock_filmes', atlasStockFilmes || []);
    } catch (erro) {
        console.warn('Nao foi possivel recarregar dados locais da nuvem:', erro);
    }
}

window.addEventListener('atlasDadosNuvemAtualizados', atlasRecarregarDadosLocaisDaNuvem);

function atlasFormatarDataHoraSistema(valor) {
    const data = valor ? new Date(valor) : null;
    if (!data || Number.isNaN(data.getTime())) return '-';
    return data.toLocaleString('pt-BR');
}

function atlasDispositivoIdAtual(usuarioId = '') {
    let base = localStorage.getItem('atlas_dispositivo_base_id');
    if (!base) {
        base = `disp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem('atlas_dispositivo_base_id', base);
    }
    const usuario = atlasIdUsuarioNormalizado(usuarioId || usuarioLogado?.id || '');
    const id = usuario ? `${base}_${usuario}` : base;
    localStorage.setItem('atlas_dispositivo_id', id);
    return id;
}

function atlasTelaAtual() {
    const largura = window.screen?.width || window.innerWidth || 0;
    const altura = window.screen?.height || window.innerHeight || 0;
    return largura && altura ? ` ${largura}x${altura}` : '';
}

function atlasVersaoIOS(ua) {
    const match = String(ua || '').match(/OS ([\d_]+)/i);
    return match ? ` iOS ${match[1].replace(/_/g, '.')}` : '';
}

function atlasModeloProvavelApple() {
    const largura = window.screen?.width || window.innerWidth || 0;
    const altura = window.screen?.height || window.innerHeight || 0;
    const menor = Math.min(largura, altura);
    const maior = Math.max(largura, altura);
    const pontos = `${menor}x${maior}`;
    const modelos = {
        '320x568': 'iPhone SE/5/5s provavel',
        '375x667': 'iPhone SE 2/3 ou 6/7/8 provavel',
        '375x812': 'iPhone X/XS/11 Pro/12 mini/13 mini provavel',
        '390x844': 'iPhone 12/13/14/15/16 provavel',
        '393x852': 'iPhone 14/15/16 Pro provavel',
        '414x736': 'iPhone Plus antigo provavel',
        '414x896': 'iPhone XR/11/XS Max/11 Pro Max provavel',
        '428x926': 'iPhone 12/13/14 Plus ou Pro Max provavel',
        '430x932': 'iPhone 14/15/16 Plus ou Pro Max provavel',
        '440x956': 'iPhone 16 Pro Max provavel'
    };
    return modelos[pontos] || `iPhone modelo nao identificado ${pontos}`;
}

function atlasMarcaModeloAndroidPorUA(ua) {
    const texto = String(ua || '');
    const padroes = [
        { marca: 'Samsung', regex: /\b(SM-[A-Z0-9]+|GT-[A-Z0-9]+)\b/i },
        { marca: 'Motorola', regex: /\b(moto [^);]+|XT\d{4,5}[^); ]*)/i },
        { marca: 'Xiaomi', regex: /\b(Redmi [^);]+|Mi [^);]+|M\d{4}[A-Z]?|POCO [^);]+)\b/i },
        { marca: 'Huawei', regex: /\b(Huawei [^);]+|HUAWEI [^);]+|ANE-[A-Z0-9]+|ELE-[A-Z0-9]+)\b/i },
        { marca: 'Honor', regex: /\b(Honor [^);]+)\b/i },
        { marca: 'OPPO', regex: /\b(OPPO [^);]+|CPH\d{4})\b/i },
        { marca: 'Realme', regex: /\b(RMX\d{4}|realme [^);]+)\b/i },
        { marca: 'OnePlus', regex: /\b(OnePlus [^);]+|IN\d{4}|GM\d{4})\b/i },
        { marca: 'Vivo', regex: /\b(vivo [^);]+|V\d{4}[A-Z]?)\b/i },
        { marca: 'Nokia', regex: /\b(Nokia [^);]+)\b/i },
        { marca: 'LG', regex: /\b(LG-[A-Z0-9]+|LM-[A-Z0-9]+)\b/i }
    ];

    for (const padrao of padroes) {
        const match = texto.match(padrao.regex);
        if (match?.[1]) {
            const modelo = match[1].trim().replace(/\s+/g, ' ');
            return { marca: padrao.marca, modelo, nome: `${padrao.marca} ${modelo}` };
        }
    }

    return { marca: 'Android', modelo: '', nome: `Android${atlasTelaAtual()}` };
}

function atlasModeloProvavelAndroidPorTela(tela) {
    const normalizada = String(tela || '').replace(/\s+/g, '').replace(/[^\dx]/gi, '').toLowerCase();
    const modelos = {
        '384x857': 'possivel Samsung Galaxy A14/A15',
        '360x800': 'possivel Samsung Galaxy A12/A13/A14',
        '412x915': 'possivel Samsung Galaxy A52/A53/A54',
        '393x873': 'possivel Samsung Galaxy A32/A33/A34',
        '412x892': 'possivel Xiaomi/Redmi Android',
        '393x851': 'possivel Xiaomi/Redmi Android'
    };
    return modelos[normalizada] || '';
}

function atlasDetalhesAparelhoBasico() {
    const ua = navigator.userAgent || '';
    const tela = atlasTelaAtual().trim();
    if (/Samsung|SM-/i.test(ua)) {
        const android = atlasMarcaModeloAndroidPorUA(ua);
        return { tipo: 'Telemovel Android', marca: android.marca, modelo: android.modelo, sistema: 'Android', nome: android.nome, tela };
    }
    if (/Android/i.test(ua)) {
        const android = atlasMarcaModeloAndroidPorUA(ua);
        return { tipo: 'Telemovel Android', marca: android.marca, modelo: android.modelo, sistema: 'Android', nome: android.nome, tela };
    }
    if (/iPhone/i.test(ua)) {
        return { tipo: 'iPhone', marca: 'Apple', modelo: atlasModeloProvavelApple(), sistema: `iOS${atlasVersaoIOS(ua).replace(' iOS', ' ')}`, nome: `${atlasModeloProvavelApple()}${atlasVersaoIOS(ua)}`, tela };
    }
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
        return { tipo: 'iPad', marca: 'Apple', modelo: 'iPad', sistema: `iPadOS${atlasVersaoIOS(ua).replace(' iOS', ' ')}`, nome: `iPad${atlasVersaoIOS(ua)}${atlasTelaAtual()}`, tela };
    }
    if (/Windows/i.test(ua)) return { tipo: 'Computador', marca: 'PC', modelo: 'Windows', sistema: 'Windows', nome: 'Windows', tela };
    if (/Mac/i.test(ua)) return { tipo: 'Computador', marca: 'Apple', modelo: 'Mac', sistema: 'macOS', nome: 'Mac', tela };
    return { tipo: 'Aparelho', marca: '', modelo: navigator.platform || '', sistema: navigator.platform || '', nome: navigator.platform || 'Aparelho', tela };
}

function atlasNomeAparelhoAtual() {
    return atlasDetalhesAparelhoBasico().nome;
}

async function atlasDetalhesAparelhoAtual() {
    const base = atlasDetalhesAparelhoBasico();
    const uaData = navigator.userAgentData;
    if (!uaData?.getHighEntropyValues) return base;

    try {
        const dados = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        const modelo = String(dados.model || '').trim();
        const plataforma = String(dados.platform || base.sistema || '').trim();
        const versao = String(dados.platformVersion || '').trim();
        if (!modelo) {
            return {
                ...base,
                modelo: base.modelo || 'modelo protegido pelo navegador',
                sistema: versao ? `${plataforma || base.sistema} ${versao}`.trim() : base.sistema
            };
        }

        const android = atlasMarcaModeloAndroidPorUA(modelo);
        const marca = android.marca && android.marca !== 'Android' ? android.marca : base.marca;
        const sistema = versao ? `${plataforma || base.sistema} ${versao}`.trim() : (plataforma || base.sistema);
        return {
            ...base,
            marca,
            modelo,
            sistema,
            nome: `${marca && !modelo.toLowerCase().includes(String(marca).toLowerCase()) ? `${marca} ` : ''}${modelo}`.trim()
        };
    } catch (erro) {
        return base;
    }
}

function atlasRegistrarUltimoAcessoUsuario(agora, versao, aparelho, idDispositivo) {
    if (!usuarioLogado) return;
    const idLogado = atlasIdUsuarioNormalizado(usuarioLogado.id);
    const indice = (usuariosSistema || []).findIndex(usuario => atlasIdUsuarioNormalizado(usuario.id) === idLogado);
    if (indice < 0) return;

    const ultimoSalvo = Number(usuariosSistema[indice]._atlasUltimoAcessoMs || 0);
    const mesmaVersao = String(usuariosSistema[indice]._atlasUltimoAcessoVersao || '') === String(versao || '');
    const mesmoDispositivo = String(usuariosSistema[indice]._atlasUltimoAcessoDispositivoId || '') === String(idDispositivo || '');
    if (mesmaVersao && mesmoDispositivo && agora - ultimoSalvo < 60000) return;

    usuariosSistema[indice]._atlasUltimoAcessoMs = agora;
    usuariosSistema[indice]._atlasUltimoAcesso = atlasFormatarDataHoraSistema(agora);
    usuariosSistema[indice]._atlasUltimoAcessoVersao = versao;
    usuariosSistema[indice]._atlasUltimoAcessoAparelho = aparelho;
    usuariosSistema[indice]._atlasUltimoAcessoDispositivoId = idDispositivo;
    usuarioLogado = usuariosSistema[indice];
    window.usuarioLogado = usuarioLogado;
    localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
}

function atlasRegistrarDispositivoAtual() {
    if (!usuarioLogado) return;
    const dispositivos = atlasJSONLocal('atlas_dispositivos_online', {});
    const id = atlasDispositivoIdAtual(usuarioLogado.id);
    const agora = Date.now();
    const versao = window.ATLAS_SISTEMA_VERSAO || 'sem-versao';
    const usuarioCadastro = (usuariosSistema || []).find(usuario => atlasIdUsuarioNormalizado(usuario.id) === atlasIdUsuarioNormalizado(usuarioLogado.id)) || usuarioLogado;
    const usuarioId = usuarioCadastro.id || usuarioLogado.id;
    const usuarioNome = usuarioCadastro.nome || usuarioLogado.nome || usuarioId;
    const detalhesAparelho = atlasDetalhesAparelhoBasico();
    const aparelho = detalhesAparelho.nome;
    const usuarioAliases = Array.from(new Set([
        usuarioId,
        usuarioNome,
        usuarioLogado.id,
        usuarioLogado.nome
    ].filter(Boolean)));

    Object.keys(dispositivos).forEach(chave => {
        if (agora - Number(dispositivos[chave]?.ultimoAcessoMs || 0) > 1000 * 60 * 60 * 24 * 45) {
            delete dispositivos[chave];
        }
    });

    dispositivos[id] = {
        id,
        usuario: usuarioId,
        nome: usuarioNome,
        usuarioAliases,
        cargo: usuarioCadastro.cargo || usuarioLogado.cargo || '',
        aparelho,
        tipoAparelho: detalhesAparelho.tipo,
        marcaAparelho: detalhesAparelho.marca,
        modeloAparelho: detalhesAparelho.modelo,
        sistemaAparelho: detalhesAparelho.sistema,
        versao,
        plataforma: navigator.platform || '',
        userAgent: navigator.userAgent || '',
        largura: window.screen?.width || window.innerWidth || 0,
        altura: window.screen?.height || window.innerHeight || 0,
        online: true,
        saiuEmMs: 0,
        saiuEm: '',
        ultimoAcessoMs: agora,
        ultimoAcesso: atlasFormatarDataHoraSistema(agora)
    };

    localStorage.setItem('atlas_dispositivos_online', JSON.stringify(dispositivos));
    window.dispatchEvent(new CustomEvent('atlasDispositivoLocalAtualizado', {
        detail: dispositivos[id]
    }));
    atlasAtualizarDetalhesAparelhoAssincrono(id);
    if (typeof window.atlasFirebaseRegistrarDispositivo === 'function') {
        window.atlasFirebaseRegistrarDispositivo(dispositivos[id]);
    }
    if (typeof window.atlasFirebaseAtualizarUltimoAcessoUsuario === 'function') {
        window.atlasFirebaseAtualizarUltimoAcessoUsuario({
            id: usuarioId,
            nome: usuarioNome,
            cargo: usuarioCadastro.cargo || usuarioLogado.cargo || '',
            aparelho,
            versao,
            dispositivoId: id,
            ultimoAcessoMs: agora,
            ultimoAcesso: atlasFormatarDataHoraSistema(agora)
        });
    }
    if (typeof window.atlasFirebaseChecarAtualizacaoPendente === 'function') {
        window.atlasFirebaseChecarAtualizacaoPendente(id, usuarioId);
    }
    atlasConfirmarAtualizacaoAplicadaLocal(id, usuarioId, versao);
    atlasRegistrarUltimoAcessoUsuario(agora, versao, aparelho, id);
    const ultimoSync = Number(localStorage.getItem('atlas_dispositivo_ultimo_sync_ms') || 0);
    if (typeof window.atlasFirebaseSincronizarAgora === 'function' && agora - ultimoSync > 300000) {
        localStorage.setItem('atlas_dispositivo_ultimo_sync_ms', String(agora));
        window.atlasFirebaseSincronizarAgora();
    }
}

function atlasAtualizarDetalhesAparelhoAssincrono(idDispositivo) {
    if (window.atlasDetalheAparelhoPendente) return;
    window.atlasDetalheAparelhoPendente = true;
    atlasDetalhesAparelhoAtual()
        .then(detalhes => {
            const dispositivos = atlasJSONLocal('atlas_dispositivos_online', {});
            const atual = dispositivos[idDispositivo];
            if (!atual) return;

            atual.aparelho = detalhes.nome || atual.aparelho;
            atual.tipoAparelho = detalhes.tipo || atual.tipoAparelho || '';
            atual.marcaAparelho = detalhes.marca || atual.marcaAparelho || '';
            atual.modeloAparelho = detalhes.modelo || atual.modeloAparelho || '';
            atual.sistemaAparelho = detalhes.sistema || atual.sistemaAparelho || '';
            atual.telaAparelho = detalhes.tela || atual.telaAparelho || '';
            dispositivos[idDispositivo] = atual;
            localStorage.setItem('atlas_dispositivos_online', JSON.stringify(dispositivos));
            if (typeof window.atlasFirebaseRegistrarDispositivo === 'function') {
                window.atlasFirebaseRegistrarDispositivo(atual);
            }
        })
        .finally(() => {
            setTimeout(() => { window.atlasDetalheAparelhoPendente = false; }, 30000);
        });
}

function atlasDadosDispositivoOfflineAtual() {
    const dispositivos = atlasJSONLocal('atlas_dispositivos_online', {});
    const id = atlasDispositivoIdAtual(usuarioLogado?.id || atual.usuario || '');
    const atual = dispositivos[id] || {};
    const agora = Date.now();
    const dados = {
        ...atual,
        id,
        usuario: atual.usuario || usuarioLogado?.id || '',
        nome: atual.nome || usuarioLogado?.nome || usuarioLogado?.id || '',
        cargo: atual.cargo || usuarioLogado?.cargo || '',
        aparelho: atual.aparelho || atlasNomeAparelhoAtual(),
        tipoAparelho: atual.tipoAparelho || atlasDetalhesAparelhoBasico().tipo || '',
        marcaAparelho: atual.marcaAparelho || atlasDetalhesAparelhoBasico().marca || '',
        modeloAparelho: atual.modeloAparelho || atlasDetalhesAparelhoBasico().modelo || '',
        sistemaAparelho: atual.sistemaAparelho || atlasDetalhesAparelhoBasico().sistema || '',
        versao: atual.versao || window.ATLAS_SISTEMA_VERSAO || 'sem-versao',
        plataforma: atual.plataforma || navigator.platform || '',
        userAgent: atual.userAgent || navigator.userAgent || '',
        largura: window.screen?.width || window.innerWidth || atual.largura || 0,
        altura: window.screen?.height || window.innerHeight || atual.altura || 0,
        online: false,
        saiuEmMs: agora,
        saiuEm: atlasFormatarDataHoraSistema(agora),
        ultimoAcessoMs: Number(atual.ultimoAcessoMs || agora),
        ultimoAcesso: atual.ultimoAcesso || atlasFormatarDataHoraSistema(agora)
    };
    dispositivos[id] = dados;
    localStorage.setItem('atlas_dispositivos_online', JSON.stringify(dispositivos));
    return dados;
}

function atlasMarcarDispositivoOffline() {
    if (!usuarioLogado) return Promise.resolve();
    const dados = atlasDadosDispositivoOfflineAtual();
    if (typeof window.atlasFirebaseMarcarDispositivoOffline === 'function') {
        return window.atlasFirebaseMarcarDispositivoOffline(dados);
    }
    if (typeof window.atlasFirebaseRegistrarDispositivo === 'function') {
        return window.atlasFirebaseRegistrarDispositivo(dados);
    }
    return Promise.resolve();
}

async function atlasSairSistema() {
    if (window.atlasSaindoSistema) return;
    window.atlasSaindoSistema = true;
    const botaoSair = document.querySelector('.btn-logout');
    if (botaoSair) {
        botaoSair.disabled = true;
        botaoSair.textContent = 'Saindo...';
    }
    if (window.atlasTimerDispositivoAtual) {
        clearInterval(window.atlasTimerDispositivoAtual);
        window.atlasTimerDispositivoAtual = null;
    }
    localStorage.removeItem('atlas_sessao_usuario_id');
    atlasMarcarDispositivoOffline().catch(erro => {
        console.warn('Nao foi possivel marcar offline antes de sair:', erro);
    });
    setTimeout(() => location.reload(), 180);
}

window.addEventListener('pagehide', () => {
    if (window.atlasSaindoSistema) return;
    atlasMarcarDispositivoOffline();
});

window.addEventListener('beforeunload', () => {
    if (window.atlasSaindoSistema) return;
    atlasMarcarDispositivoOffline();
});

window.addEventListener('atlasFirebasePronto', () => {
    atlasRegistrarDispositivoAtual();
});

window.addEventListener('atlasAtualizacaoSolicitada', (evento) => {
    const info = evento?.detail || atlasJSONLocal('atlas_atualizacao_pendente_info', null);
    if (typeof window.atlasMostrarAvisoAtualizacaoDisponivel === 'function') {
        window.atlasMostrarAvisoAtualizacaoDisponivel(info || { versao: window.ATLAS_SISTEMA_VERSAO || 'nova versao' });
        return;
    }
    alert('Existe uma atualizacao do sistema. Atualize esta pagina.');
});

function atlasDocIdLocalSaude(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120);
}

function atlasChavesAtualizacaoSaude(alvo = {}) {
    const chaves = [];
    if (alvo.dispositivoId) chaves.push(`device_${alvo.dispositivoId}`);
    if (alvo.usuario) chaves.push(`user_${String(alvo.usuario).toLowerCase()}`);
    return Array.from(new Set(chaves.filter(Boolean).map(atlasDocIdLocalSaude).filter(Boolean)));
}

function atlasChavesUsuarioAtualizacaoSaude(usuario, dispositivos = []) {
    const idsUsuario = [
        usuario?.id,
        usuario?.nome,
        ...(Array.isArray(usuario?.usuarioAliases) ? usuario.usuarioAliases : [])
    ].filter(Boolean);

    return Array.from(new Set([
        ...idsUsuario.flatMap(id => atlasChavesAtualizacaoSaude({ usuario: id })),
        ...(dispositivos || []).flatMap(dispositivo => [
            ...atlasChavesAtualizacaoSaude({ dispositivoId: dispositivo.id }),
            ...atlasChavesAtualizacaoSaude({ usuario: dispositivo.usuario }),
            ...atlasChavesAtualizacaoSaude({ usuario: dispositivo.nome }),
            ...(Array.isArray(dispositivo.usuarioAliases)
                ? dispositivo.usuarioAliases.flatMap(alias => atlasChavesAtualizacaoSaude({ usuario: alias }))
                : [])
        ])
    ].filter(Boolean)));
}

function atlasConfirmarAtualizacaoAplicadaLocal(dispositivoId, usuarioId, versao) {
    if (typeof window.atlasFirebaseConfirmarAtualizacaoAparelho !== 'function') return;
    const buildAtual = Number(window.ATLAS_SISTEMA_BUILD || 0);
    const pedidos = [
        atlasJSONLocal('atlas_atualizacao_pendente_info', null),
        atlasJSONLocal('atlas_atualizacao_global_info', null),
        atlasJSONLocal('atlas_versao_publicada_info', null),
        ...Object.values(atlasJSONLocal('atlas_forcar_atualizacao_usuarios', {}))
    ].filter(Boolean);

    const pedidoAplicado = pedidos.find(pedido => {
        const buildPedido = Number(pedido.build || 0);
        if (!buildPedido || buildAtual < buildPedido) return false;
        const idsPedido = [
            pedido.usuario,
            pedido.nome,
            pedido.dispositivoId
        ].map(atlasIdUsuarioNormalizado).filter(Boolean);
        const idsLocais = [
            usuarioId,
            usuarioLogado?.id,
            usuarioLogado?.nome,
            dispositivoId
        ].map(atlasIdUsuarioNormalizado).filter(Boolean);
        return !idsPedido.length || idsPedido.some(id => idsLocais.includes(id));
    });

    if (!pedidoAplicado) return;

    const chaveConfirmacao = `atlas_update_confirmado_${buildAtual}_${pedidoAplicado.solicitadoEmMs || ''}_${dispositivoId || ''}`;
    if (sessionStorage.getItem(chaveConfirmacao) === '1') return;
    sessionStorage.setItem(chaveConfirmacao, '1');

    window.atlasFirebaseConfirmarAtualizacaoAparelho({
        usuario: usuarioId,
        dispositivoId,
        versao,
        build: buildAtual,
        pedidoSolicitadoEmMs: pedidoAplicado.solicitadoEmMs
    }).then(confirmacao => {
        if (!confirmacao) return;
        const locais = atlasJSONLocal('atlas_atualizacoes_confirmadas', {});
        atlasChavesAtualizacaoSaude({ dispositivoId }).concat(atlasChavesAtualizacaoSaude({ usuario: usuarioId })).forEach(chave => {
            locais[chave] = { ...confirmacao, chave };
        });
        localStorage.setItem('atlas_atualizacoes_confirmadas', JSON.stringify(locais));
        localStorage.removeItem('atlas_atualizacao_pendente_info');
    });
}

function atlasChecarAtualizacaoForcadaLocal() {
    if (!usuarioLogado) return;
    const pedidos = atlasJSONLocal('atlas_forcar_atualizacao_usuarios', {});
    const ids = [
        usuarioLogado.id,
        usuarioLogado.nome,
        ...(Array.isArray(usuarioLogado.usuarioAliases) ? usuarioLogado.usuarioAliases : [])
    ].map(atlasIdUsuarioNormalizado).filter(Boolean);
    const pedido = ids.map(id => pedidos[id]).find(Boolean) || null;
    if (!pedido) return;
    const buildPedido = Number(pedido.build || 0);
    const buildAtual = Number(window.ATLAS_SISTEMA_BUILD || 0);
    if (buildPedido && buildAtual >= buildPedido) {
        atlasConfirmarAtualizacaoAplicadaLocal(localStorage.getItem('atlas_dispositivo_id') || '', usuarioLogado.id, window.ATLAS_SISTEMA_VERSAO || '');
        return;
    }
    const chave = `atlas_forcar_update_executado_${buildPedido}_${pedido.solicitadoEmMs || ''}`;
    if (sessionStorage.getItem(chave) === '1') return;
    sessionStorage.setItem(chave, '1');
    if (typeof window.atlasMostrarAvisoAtualizacaoDisponivel === 'function') {
        window.atlasMostrarAvisoAtualizacaoDisponivel(pedido);
    }
}

function atlasChecarAtualizacaoGlobalLocal() {
    const info = atlasJSONLocal('atlas_atualizacao_global_info', null) || atlasJSONLocal('atlas_versao_publicada_info', null);
    if (!info) return;
    const buildPublicado = Number(info.build || 0);
    const buildAtual = Number(window.ATLAS_SISTEMA_BUILD || 0);
    if (!buildPublicado || buildPublicado <= buildAtual) {
        atlasConfirmarAtualizacaoAplicadaLocal(localStorage.getItem('atlas_dispositivo_id') || '', usuarioLogado?.id || '', window.ATLAS_SISTEMA_VERSAO || '');
        return;
    }
    if (typeof window.atlasMostrarAvisoAtualizacaoDisponivel === 'function') {
        window.atlasMostrarAvisoAtualizacaoDisponivel(info);
    }
}

window.addEventListener('focus', atlasChecarAtualizacaoForcadaLocal);
window.addEventListener('online', atlasChecarAtualizacaoForcadaLocal);
window.addEventListener('atlasDadosNuvemAtualizados', atlasChecarAtualizacaoForcadaLocal);
window.addEventListener('focus', atlasChecarAtualizacaoGlobalLocal);
window.addEventListener('online', atlasChecarAtualizacaoGlobalLocal);
window.addEventListener('atlasAtualizacaoGlobalAtualizada', atlasChecarAtualizacaoGlobalLocal);
window.addEventListener('atlasVersaoPublicadaAtualizada', atlasChecarAtualizacaoGlobalLocal);
setInterval(atlasChecarAtualizacaoForcadaLocal, 5000);
setInterval(atlasChecarAtualizacaoGlobalLocal, 7000);

function usuarioPodeVerModulo(chave) {
    if (!usuarioLogado) return false;
    if (chave === 'permissoes') return usuarioEhAdmin();
    if (usuarioEhAdmin()) return true;
    const prefs = obterPreferenciasUsuario(usuarioLogado.id);
    const permitido = prefs.modulosVisiveis.includes(chave);
    const oculto = (prefs.modulosOcultosUsuario || []).includes(chave);
    return permitido && !oculto;
}

function usuarioPodeEditarModulo(chave) {
    if (!usuarioLogado) return false;
    if (chave === 'permissoes') return usuarioEhAdmin();
    const cargo = normalizarCargoUsuario(usuarioLogado.cargo);
    if (cargo === 'admin') return true;
    return obterPreferenciasUsuario(usuarioLogado.id).modulosEditaveis.includes(chave);
}

function usuarioPodeExcluirModulo(chave) {
    if (!usuarioLogado) return false;
    if (chave === 'permissoes' || chave === 'auditoria') return usuarioEhAdmin();
    const cargo = normalizarCargoUsuario(usuarioLogado.cargo);
    if (cargo === 'admin') return true;
    return obterPreferenciasUsuario(usuarioLogado.id).modulosExcluiveis.includes(chave);
}

function obterPreferenciasUsuario(idUsuario) {
    const chave = obterChavePreferenciasUsuario(idUsuario);
    const salvas = atlasJSONLocal(chave, null);
    const cargo = obterCargoUsuarioPorId(idUsuario);
    const padrao = obterPreferenciasPadraoUsuario(idUsuario);

    if (!salvas) {
        return padrao;
    }

    if (cargo !== 'admin' && !salvas.permissoesAdminDefinidas) {
        const ocultosUsuario = Array.isArray(salvas.modulosOcultosUsuario) ? salvas.modulosOcultosUsuario : [];
        return {
            ...padrao,
            tema: salvas.tema || padrao.tema,
            modulosOcultosUsuario: ocultosUsuario
        };
    }
    const modulosSalvos = Array.isArray(salvas.modulosVisiveis) ? salvas.modulosVisiveis : padrao.modulosVisiveis;
    const editaveisSalvos = Array.isArray(salvas.modulosEditaveis) ? salvas.modulosEditaveis : padrao.modulosEditaveis;
    const excluiveisSalvos = Array.isArray(salvas.modulosExcluiveis) ? salvas.modulosExcluiveis : (Array.isArray(salvas.modulosEditaveis) ? [] : padrao.modulosExcluiveis);
    const ocultosUsuario = Array.isArray(salvas.modulosOcultosUsuario) ? salvas.modulosOcultosUsuario : [];

    const todosModulos = obterModulosPermissoesAtlas().map(m => m.chave);
    const modulosVisiveisCargo = cargo === 'admin' ? [...modulosSalvos, ...todosModulos] : modulosSalvos;

    return {
        tema: salvas.tema || 'escuro',
        modulosVisiveis: [...new Set(modulosVisiveisCargo)],
        modulosEditaveis: [...new Set(cargo === 'admin'
            ? [...editaveisSalvos, ...todosModulos]
            : editaveisSalvos)],
        modulosExcluiveis: [...new Set(cargo === 'admin'
            ? [...excluiveisSalvos, ...todosModulos]
            : excluiveisSalvos)],
        modulosOcultosUsuario: ocultosUsuario,
        permissoesAdminDefinidas: salvas.permissoesAdminDefinidas === true
    };
}

function salvarPreferenciasUsuario(idUsuario, preferencias) {
    const chave = obterChavePreferenciasUsuario(idUsuario);
    localStorage.setItem(chave, JSON.stringify(preferencias));
}

function aplicarTemaUsuario(tema) {
    document.body.classList.toggle('tema-claro', tema === 'claro');
}

function garantirCardPermissoesAdmin() {
    const gridHome = document.getElementById('grid-home');
    if (!gridHome || document.getElementById('card-permissoes')) return;

    const card = document.createElement('div');
    card.id = 'card-permissoes';
    card.className = 'card';
    card.setAttribute('onclick', "abrirModulo('permissoes')");
    card.innerHTML = `<i class="fas fa-user-shield"></i><span>PermissÃµes</span>`;
    gridHome.appendChild(card);
}

function aplicarPreferenciasVisuaisUsuario() {
    if (!usuarioLogado) return;

    const preferencias = obterPreferenciasUsuario(usuarioLogado.id);
    aplicarTemaUsuario(preferencias.tema);
    garantirCardPermissoesAdmin();

    const gridHome = document.getElementById('grid-home');
    if (!gridHome) return;

    const cards = gridHome.querySelectorAll('.card');
    cards.forEach(card => {
        const onclick = card.getAttribute('onclick') || '';
        const match = onclick.match(/abrirModulo\('([^']+)'\)/);
        if (!match) return;

        const nomeModulo = match[1];

        if (nomeModulo === 'permissoes') {
            card.style.display = usuarioEhAdmin() ? '' : 'none';
            return;
        }

        card.style.display = usuarioPodeVerModulo(nomeModulo) ? '' : 'none';
    });
}

function inicializarUsuarios() {
    if (!Array.isArray(usuariosSistema)) {
        usuariosSistema = [];
    }
    garantirAdminSistemaAtlas();
}

function garantirAdminSistemaAtlas() {
    if (!Array.isArray(usuariosSistema)) usuariosSistema = [];
    usuariosSistema = usuariosSistema.filter(usuario => atlasIdUsuarioNormalizado(usuario?.id) !== 'admin');
    usuariosSistema.unshift({
        id: 'admin',
        nome: 'ADMIN',
        senha: '123',
        cargo: 'admin',
        bloqueado: false,
        _atlasUsuarioAtualizadoEm: Date.now()
    });
    try {
        const excluidos = JSON.parse(localStorage.getItem('atlas_usuarios_excluidos') || '{}');
        delete excluidos.admin;
        localStorage.setItem('atlas_usuarios_excluidos', JSON.stringify(excluidos));
        localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
    } catch (erro) {}
    return usuariosSistema[0];
}

inicializarUsuarios();

function chaveAniversarioUsuarioAtlas(usuario) {
    const ano = new Date().getFullYear();
    return `atlas_aniversario_${String(usuario?.id || '').toLowerCase()}_${ano}`;
}

function statusAniversarioUsuarioAtlas(usuario) {
    const dataNascimento = usuario?.nascimento || usuario?.aniversario;
    if (!dataNascimento) return null;

    const hoje = new Date();
    const partes = String(dataNascimento).split('-');
    if (partes.length < 3) return null;

    const mes = Number(partes[1]);
    const dia = Number(partes[2]);
    if (!mes || !dia) return null;

    const aniversarioAno = new Date(hoje.getFullYear(), mes - 1, dia, 12, 0, 0);
    const hojeMeioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0);
    const diffDias = Math.floor((hojeMeioDia - aniversarioAno) / 86400000);

    if (diffDias === 0) return 'hoje';
    if (diffDias > 0) return 'atrasado';
    return null;
}

function mensagemAniversarioUsuarioAtlas(usuario, status) {
    const nome = usuario?.nome || usuario?.id || 'amigo';
    const ano = new Date().getFullYear();
    const mensagens = [
        `Feliz aniversario, ${nome}! Que seu dia seja leve, bom e cheio de coisas positivas.`,
        `Parabens, ${nome}! Que este novo ciclo venha com saude, paz e muitas conquistas.`,
        `Feliz aniversario, ${nome}! A Atlas Painel deseja um dia especial e um ano ainda melhor.`,
        `Parabens pelo seu dia, ${nome}! Que nao falte energia boa hoje e nos proximos passos.`,
        `Feliz aniversario, ${nome}! Que seja um ano de crescimento, alegria e boas novidades.`
    ];
    const texto = mensagens[ano % mensagens.length];
    return status === 'atrasado'
        ? `Feliz aniversario atrasado, ${nome}! Nao apareceu no dia, mas a mensagem chegou: ${texto}`
        : texto;
}

function tocarToqueAniversarioAtlas() {
    try {
        const AudioContextAtlas = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextAtlas) return;
        const ctx = new AudioContextAtlas();
        const notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 880, 1046.5];
        const agora = ctx.currentTime;

        notas.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const ganho = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            ganho.gain.setValueAtTime(0.0001, agora + i * 0.18);
            ganho.gain.exponentialRampToValueAtTime(0.12, agora + i * 0.18 + 0.03);
            ganho.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.18 + 0.16);
            osc.connect(ganho);
            ganho.connect(ctx.destination);
            osc.start(agora + i * 0.18);
            osc.stop(agora + i * 0.18 + 0.17);
        });
    } catch (erro) {
        console.warn('Nao foi possivel tocar o aviso de aniversario.', erro);
    }
}

function mostrarMensagemAniversarioAtlas(usuario, status) {
    const mensagem = mensagemAniversarioUsuarioAtlas(usuario, status);
    const existente = document.getElementById('modal-aniversario-atlas');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-aniversario-atlas';
    modal.style = 'position:fixed; inset:0; background:rgba(0,0,0,.82); z-index:10000; display:flex; align-items:center; justify-content:center; padding:18px;';
    modal.innerHTML = `
        <div style="width:100%; max-width:460px; background:#1e293b; border:1px solid #334155; border-radius:14px; padding:22px; color:white; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.45);">
            <div style="font-size:42px; line-height:1; color:#fbbf24; margin-bottom:8px;"><i class="fas fa-cake-candles"></i></div>
            <h2 style="margin:0 0 10px; font-size:22px;">${status === 'atrasado' ? 'Feliz aniversario atrasado!' : 'Feliz aniversario!'}</h2>
            <p style="color:#cbd5e1; font-size:16px; line-height:1.45; margin:0 0 18px;">${textoSeguroPermissoes(mensagem)}</p>
            <button onclick="document.getElementById('modal-aniversario-atlas')?.remove()" style="width:100%; background:#10b981; color:white; border:none; padding:13px; border-radius:9px; font-weight:bold;">OBRIGADO</button>
        </div>
    `;
    document.body.appendChild(modal);
    tocarToqueAniversarioAtlas();
}

function verificarAniversarioNoLoginAtlas(usuario) {
    const status = statusAniversarioUsuarioAtlas(usuario);
    if (!status) return;

    const chave = chaveAniversarioUsuarioAtlas(usuario);
    if (localStorage.getItem(chave)) return;

    localStorage.setItem(chave, new Date().toISOString());
    mostrarMensagemAniversarioAtlas(usuario, status);
}

async function fazerLogin() {
    const usuarioInput = document.getElementById('login-email').value.trim();
    const senhaInput = document.getElementById('login-senha').value.trim();
    const idLogin = String(usuarioInput || '').toLowerCase();

    if (idLogin === 'admin' && senhaInput === '123') {
        usuarioLogado = garantirAdminSistemaAtlas();
        window.usuarioLogado = usuarioLogado;
        localStorage.setItem('atlas_sessao_usuario_id', usuarioLogado.id || 'admin');
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('app-principal').style.display = 'block';
        document.getElementById('user-display').innerText = 'ADMIN';
        aplicarPermissoesUsuario();
        aplicarPreferenciasVisuaisUsuario();
        atlasInicializarDashboardHome();
        atlasRegistrarDispositivoAtual();
        setTimeout(atlasRegistrarDispositivoAtual, 1500);
        setTimeout(atlasRegistrarDispositivoAtual, 5000);
        if (!window.atlasTimerDispositivoAtual) {
            window.atlasTimerDispositivoAtual = setInterval(atlasRegistrarDispositivoAtual, 10000);
        }
        if (typeof window.atlasFirebaseSincronizarAgora === 'function') {
            window.atlasFirebaseSincronizarAgora();
        }
        return;
    }

    if (typeof atlasNormalizarUsuariosSistema === 'function') {
        atlasNormalizarUsuariosSistema();
    }

    if (typeof window.atlasFirebaseForcarAtualizacao === 'function') {
        try {
            await Promise.race([
                window.atlasFirebaseForcarAtualizacao(),
                new Promise(resolve => setTimeout(resolve, 2500))
            ]);
            usuariosSistema = atlasArrayLocal('atlas_usuarios', usuariosSistema);
            if (typeof atlasNormalizarUsuariosSistema === 'function') {
                atlasNormalizarUsuariosSistema();
            }
        } catch (erro) {
            console.warn('Nao foi possivel atualizar usuarios antes do login:', erro);
        }
    }

    const excluidosLogin = typeof atlasUsuariosExcluidosSistema === 'function' ? atlasUsuariosExcluidosSistema() : {};
    if (excluidosLogin[idLogin]) {
        alert("Acesso Negado!");
        return;
    }

    let usuarioEncontrado = usuariosSistema.find(
        u => String(u.id).toLowerCase() === idLogin && String(u.senha) === senhaInput
    );

    if (usuarioEncontrado) {
        if (usuarioEncontrado.bloqueado) {
            alert("Usuário bloqueado. Fale com o administrador.");
            return;
        }

        usuarioLogado = usuarioEncontrado;
        window.usuarioLogado = usuarioLogado;
        localStorage.setItem('atlas_sessao_usuario_id', usuarioLogado.id || usuarioEncontrado.id);
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('app-principal').style.display = 'block';
        document.getElementById('user-display').innerText = usuarioEncontrado.id.toUpperCase();

aplicarPermissoesUsuario();
aplicarPreferenciasVisuaisUsuario();
atlasInicializarDashboardHome();
verificarAniversarioNoLoginAtlas(usuarioEncontrado);
atlasRegistrarDispositivoAtual();
setTimeout(atlasRegistrarDispositivoAtual, 1500);
setTimeout(atlasRegistrarDispositivoAtual, 5000);
setTimeout(atlasChecarAtualizacaoForcadaLocal, 1800);
setTimeout(atlasChecarAtualizacaoForcadaLocal, 6000);
if (!window.atlasTimerDispositivoAtual) {
    window.atlasTimerDispositivoAtual = setInterval(atlasRegistrarDispositivoAtual, 10000);
}
if (!window.atlasEventosDispositivoOnline) {
    window.atlasEventosDispositivoOnline = true;
    window.addEventListener('focus', atlasRegistrarDispositivoAtual);
    window.addEventListener('online', atlasRegistrarDispositivoAtual);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) atlasRegistrarDispositivoAtual();
    });
}
if (typeof window.atlasMostrarLembretesPrimeiroAcessoDia === 'function') {
    setTimeout(() => window.atlasMostrarLembretesPrimeiroAcessoDia(), 700);
}

if (typeof producoesDoDia !== "undefined") {

            producoesDoDia = [];
        }
    } else {
        alert("Acesso Negado!");
    }
}

function voltarHome() {
    window.atlasModuloAtual = '';
    document.getElementById('grid-home').style.display = 'grid';
    document.getElementById('conteudo-modulo').style.display = 'none';
    aplicarPermissoesUsuario();
    aplicarPreferenciasVisuaisUsuario();
    atlasInicializarDashboardHome();
}

function atlasHomeJSON(chave, fallback) {
    try {
        const bruto = localStorage.getItem(chave);
        if (!bruto) return fallback;
        return JSON.parse(bruto);
    } catch (erro) {
        return fallback;
    }
}

function atlasHomeDataISOHoje() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

function atlasHomeDataBRParaISO(data) {
    const texto = String(data || '');
    const partes = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (partes) return `${partes[3]}-${String(partes[2]).padStart(2, '0')}-${String(partes[1]).padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
    return '';
}

function atlasHomeDefinirTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.innerText = valor;
}

function atlasHomeContarLista(chave) {
    const valor = atlasHomeJSON(chave, []);
    return Array.isArray(valor) ? valor.length : 0;
}

function atlasHomeContarInjecaoHoje(dataISO) {
    const db = atlasHomeJSON('atlas_db', {});
    let total = 0;
    Object.values(db || {}).forEach(meses => {
        Object.values(meses || {}).forEach(lista => {
            (Array.isArray(lista) ? lista : []).forEach(rel => {
                if (rel?.modulo === 'injecao' && atlasHomeDataBRParaISO(rel.data) === dataISO) total++;
            });
        });
    });
    return total;
}

function atlasHomeContarHistoricoHoje(chave, dataISO) {
    return (atlasHomeJSON(chave, []) || []).filter(rel => atlasHomeDataBRParaISO(rel?.data) === dataISO).length;
}

function atlasHomeContarUsuariosAtivos() {
    const dispositivos = atlasHomeJSON('atlas_dispositivos_online', {});
    const agora = Date.now();
    const ativos = Object.values(dispositivos || {}).filter(item => {
        const visto = Date.parse(item?.ultimaAtividadeISO || item?.dataHora || '') || Number(item?.ultimaAtividade || 0) || 0;
        return !visto || (agora - visto) < 120000;
    });
    return Math.max(ativos.length, usuarioLogado ? 1 : 0);
}

function atlasHomeContarPlanoAberto() {
    const plano = atlasHomeJSON('atlas_plano_live', null);
    if (!plano) return 0;
    return (plano.linhasAbertas || []).length + (plano.gruposFinalizados || []).reduce((acc, grupo) => acc + (grupo.itens || []).length, 0);
}

function atlasHomeSecoesPendentes() {
    const secoes = [
        {
            chave: 'injecao',
            nome: 'Injecao',
            icone: 'fas fa-microchip',
            qtd: typeof producoesDoDia !== 'undefined' && Array.isArray(producoesDoDia) ? producoesDoDia.length : 0
        },
        {
            chave: 'bobines',
            nome: 'Bobines',
            icone: 'fas fa-compact-disc',
            qtd: typeof lancamentosTemporarios !== 'undefined' && Array.isArray(lancamentosTemporarios) ? lancamentosTemporarios.length : 0
        },
        { chave: 'serra', nome: 'Serra', icone: 'fas fa-layer-group', qtd: atlasHomeContarLista('atlas_serra_live') },
        { chave: 'embalagem', nome: 'Embalagem', icone: 'fas fa-boxes-packing', qtd: atlasHomeContarLista('atlas_emb_live') },
        { chave: 'plano', nome: 'Plano', icone: 'fas fa-clipboard-list', qtd: atlasHomeContarPlanoAberto() }
    ];

    return secoes.filter(secao => secao.qtd > 0 && usuarioPodeVerModulo(secao.chave));
}

function atlasAtualizarRelogioHome() {
    const agora = new Date();
    const hora = agora.getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const nome = usuarioLogado?.nome || usuarioLogado?.id || 'Operador';
    const identificacao = usuarioLogado?.id || document.getElementById('user-display')?.innerText || 'OPERADOR';

    atlasHomeDefinirTexto('atlas-home-saudacao', `${saudacao}, ${nome}`);
    atlasHomeDefinirTexto('atlas-home-datahora', agora.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }));
    atlasHomeDefinirTexto('atlas-home-relogio', agora.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }));
    atlasHomeDefinirTexto('atlas-home-data-curta', agora.toLocaleDateString('pt-PT'));

    const userDisplay = document.getElementById('user-display');
    if (userDisplay && identificacao) userDisplay.innerText = String(identificacao).toUpperCase();
}

function atlasAtualizarDashboardHome() {
    const pendentes = atlasHomeSecoesPendentes().reduce((acc, secao) => acc + secao.qtd, 0);
    atlasHomeDefinirTexto('atlas-home-relatorios-pendentes', String(pendentes));
}

function atlasMelhorarCardsHome() {
    const descricoes = {
        injecao: ['Injecao', 'Producao, metros, quimicos e paragens.', 'Operacional'],
        bobines: ['Bobines', 'Bobines, filmes, historico e calculos.', 'Operacional'],
        serra: ['Serra', 'Pedidos, stock, metros e fecho do dia.', 'Producao'],
        embalagem: ['Embalagem', 'Separacao, PPC e controlo de expedicao.', 'Producao'],
        gestao: ['Usuarios', 'Cadastrar novos usuarios e consultar equipe.', 'Cadastros'],
        config: ['Ajustes', 'Preferencias, sincronizacao e sistema.', 'Sistema'],
        plano: ['Plano', 'Planeamento, prioridades e acompanhamento.', 'Planeamento'],
        stock: ['Stock', 'Entradas, saidas, bobines e movimentacoes.', 'Controlo'],
        permissoes: ['Permissoes', 'Controlar acessos por modulo e cargo.', 'Admin'],
        conferencia: ['Conferencia', 'Validacao e controlo dos processos.', 'Qualidade'],
        lixeira: ['Lixeira', 'Recuperacao de registos removidos.', 'Admin'],
        pesquisa_encomenda: ['Pesquisa', 'Pesquisa rapida de encomenda e pedido.', 'Consulta'],
        lembretes: ['Lembretes', 'Alertas de stock e relatorios pendentes.', 'Controlo'],
        auditoria: ['Registros', 'Registos de alteracoes e atividade.', 'Admin']
    };

    document.querySelectorAll('#grid-home > .card').forEach(card => {
        const onclick = card.getAttribute('onclick') || '';
        const chave = (onclick.match(/abrirModulo\('([^']+)'\)/) || [])[1];
        const dados = descricoes[chave];
        if (!dados) return;

        card.classList.add('atlas-module-card');
        const icone = card.querySelector('i')?.outerHTML || '';
        card.innerHTML = `${icone}<span>${dados[0]}</span><small>${dados[1]}</small><em>${dados[2]}</em>`;
    });
}

function atlasInicializarDashboardHome() {
    atlasAplicarVisualHome();
    atlasMelhorarCardsHome();
    setTimeout(atlasMelhorarCardsHome, 500);
    atlasAtivarPolimentoModulos();
    atlasAtualizarRelogioHome();
    atlasAtualizarDashboardHome();

    if (!window.atlasHomeDashboardTimer) {
        window.atlasHomeDashboardTimer = setInterval(() => {
            atlasAtualizarRelogioHome();
            atlasAtualizarDashboardHome();
        }, 1000);
    }
}

function atlasPolirMenusModulos() {
    const render = document.getElementById('render-modulo');
    if (!render) return;
    const moduloAtual = String(window.atlasModuloAtual || document.getElementById('titulo-modulo')?.innerText || '').toLowerCase();
    const descricoes = {
        injecao: {
            'novo relat': 'Abrir apontamento de producao',
            'histor': 'Consultar dias finalizados',
            'guias': 'Guias, ferros e fotos tecnicas'
        },
        bobines: {
            'criar': 'Lancamentos de bobines e filmes',
            'histor': 'Relatorios fechados',
            'calc. bobina': 'Metros e tempo de bobina',
            'calc. agro': 'Calculo Agropainel'
        },
        serra: {
            'novo relat': 'Corte, pedidos e metros',
            'histor': 'Historico da serra',
            'pacotes': 'Montagem por encomenda'
        },
        embalagem: {
            'novo relat': 'Separacao, PPC e paletes',
            'histor': 'Historico da embalagem'
        },
        plano: {
            'novo': 'Criar ou retomar planeamento',
            'histor': 'Planos fechados',
            'stock': 'Planeamento por stock',
            'pedido': 'Planeamento por encomenda'
        },
        gestao: {
            'criar': 'Cadastrar novo usuario',
            'lista': 'Ver usuarios cadastrados'
        }
    };

    render.querySelectorAll(':scope > div').forEach(bloco => {
        const cards = bloco.querySelectorAll(':scope > .card');
        if (!cards.length) return;

        bloco.classList.add('atlas-menu-modulo');
        cards.forEach(card => {
            card.classList.add('atlas-menu-modulo-card');
            card.querySelectorAll('[style]').forEach(el => {
                if (el.tagName === 'I' || el.tagName === 'SPAN' || el.tagName === 'SMALL') {
                    el.removeAttribute('style');
                }
            });

            if (!card.querySelector('small')) {
                const texto = String(card.querySelector('span')?.innerText || card.innerText || '').toLowerCase();
                const grupo = descricoes[moduloAtual] || {};
                const chave = Object.keys(grupo).find(k => texto.includes(k));
                if (chave) {
                    const small = document.createElement('small');
                    small.innerText = grupo[chave];
                    card.appendChild(small);
                }
            }
        });
    });
}

function atlasAtivarPolimentoModulos() {
    const render = document.getElementById('render-modulo');
    if (!render || window.atlasObserverPolimentoModulos) return;

    window.atlasObserverPolimentoModulos = new MutationObserver(() => {
        clearTimeout(window.atlasTimerPolimentoModulos);
        window.atlasTimerPolimentoModulos = setTimeout(atlasPolirMenusModulos, 30);
    });
    window.atlasObserverPolimentoModulos.observe(render, { childList: true, subtree: false });
    atlasPolirMenusModulos();
}

function atlasAplicarVisualHome() {
    const visual = localStorage.getItem('atlas_home_visual') || 'novo';
    document.body.classList.toggle('atlas-home-classico', visual === 'classico');
}

function atlasAlternarVisualHome() {
    const atual = localStorage.getItem('atlas_home_visual') || 'novo';
    const proximo = atual === 'novo' ? 'classico' : 'novo';
    localStorage.setItem('atlas_home_visual', proximo);
    atlasAplicarVisualHome();
}

function atlasFecharModalHome() {
    document.getElementById('atlas-modal-home')?.remove();
}

function atlasModalHome(titulo, subtitulo, botoes) {
    atlasFecharModalHome();
    const modal = document.createElement('div');
    modal.id = 'atlas-modal-home';
    modal.className = 'atlas-modal-home';
    modal.innerHTML = `
        <div class="atlas-modal-home-box">
            <div class="atlas-modal-home-top">
                <div>
                    <h2>${titulo}</h2>
                    <p>${subtitulo || ''}</p>
                </div>
                <button onclick="atlasFecharModalHome()" title="Fechar"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="atlas-modal-home-grid">
                ${botoes.map(botao => `
                    <button onclick="atlasFecharModalHome(); ${botao.acao};">
                        <i class="${botao.icone}"></i>
                        <span>${botao.nome}${botao.info ? `<small>${botao.info}</small>` : ''}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function atlasAbrirPendenciasHome() {
    const pendentes = atlasHomeSecoesPendentes();
    if (!pendentes.length) {
        atlasModalHome('Relatorios pendentes', 'Nao existe secao aberta neste momento.', [
            { nome: 'Criar relatorio', icone: 'fas fa-plus', acao: "atlasAbrirEscolhaHome('criar')" }
        ]);
        return;
    }

    atlasModalHome('Relatorios pendentes', 'Escolha a secao aberta para continuar de onde parou.', pendentes.map(secao => ({
        nome: secao.nome,
        icone: secao.icone,
        info: `${secao.qtd} item(ns) em aberto`,
        acao: `atlasAbrirSecaoPendente('${secao.chave}')`
    })));
}

function atlasAbrirSecaoPendente(chave) {
    abrirModulo(chave);
    if (window.atlasModuloAbriuNovaAbaAgora) return;
    setTimeout(() => {
        if (chave === 'injecao' && typeof exibirFormulario === 'function') exibirFormulario('injecao');
        if (chave === 'bobines' && typeof moduloBobine === 'function') moduloBobine('novo');
        if (chave === 'plano' && typeof retomarPlanoEmAndamento === 'function') retomarPlanoEmAndamento();
    }, 150);
}

function atlasAbrirEscolhaHome(tipo) {
    const opcoes = {
        criar: {
            titulo: 'Criar relatorio',
            subtitulo: 'Escolha a secao onde o relatorio sera entregue.',
            botoes: [
                { nome: 'Injecao', icone: 'fas fa-microchip', acao: "atlasExecutarEscolhaHome('criar','injecao')" },
                { nome: 'Bobines', icone: 'fas fa-compact-disc', acao: "atlasExecutarEscolhaHome('criar','bobines')" },
                { nome: 'Serra', icone: 'fas fa-layer-group', acao: "atlasExecutarEscolhaHome('criar','serra')" },
                { nome: 'Embalagem', icone: 'fas fa-boxes-packing', acao: "atlasExecutarEscolhaHome('criar','embalagem')" },
                { nome: 'Plano', icone: 'fas fa-clipboard-list', acao: "atlasExecutarEscolhaHome('criar','plano')" }
            ]
        },
        historico: {
            titulo: 'Ver historico',
            subtitulo: 'Escolha a secao que deseja consultar.',
            botoes: [
                { nome: 'Injecao', icone: 'fas fa-microchip', acao: "atlasExecutarEscolhaHome('historico','injecao')" },
                { nome: 'Bobines', icone: 'fas fa-compact-disc', acao: "atlasExecutarEscolhaHome('historico','bobines')" },
                { nome: 'Serra', icone: 'fas fa-layer-group', acao: "atlasExecutarEscolhaHome('historico','serra')" },
                { nome: 'Embalagem', icone: 'fas fa-boxes-packing', acao: "atlasExecutarEscolhaHome('historico','embalagem')" },
                { nome: 'Plano', icone: 'fas fa-clipboard-list', acao: "atlasExecutarEscolhaHome('historico','plano')" }
            ]
        },
        calculadora: {
            titulo: 'Calculadora',
            subtitulo: 'Escolha qual calculadora deseja usar.',
            botoes: [
                { nome: 'Bobina', icone: 'fas fa-calculator', acao: "atlasExecutarEscolhaHome('calculadora','bobina')" },
                { nome: 'Agro', icone: 'fas fa-seedling', acao: "atlasExecutarEscolhaHome('calculadora','agro')" }
            ]
        }
    };

    const grupo = opcoes[tipo];
    if (!grupo) return;
    atlasModalHome(grupo.titulo, grupo.subtitulo, grupo.botoes.filter(botao => {
        const chave = (botao.acao.match(/,'([^']+)'\)/) || [])[1];
        if (!chave || chave === 'bobina' || chave === 'agro') return true;
        return usuarioPodeVerModulo(chave);
    }));
}

function atlasExecutarEscolhaHome(tipo, chave) {
    if (tipo === 'criar') {
        abrirModulo(chave);
        if (window.atlasModuloAbriuNovaAbaAgora) return;
        setTimeout(() => {
            if (chave === 'injecao' && typeof exibirFormulario === 'function') exibirFormulario('injecao');
            if (chave === 'bobines' && typeof moduloBobine === 'function') moduloBobine('novo');
            if (chave === 'plano' && typeof abrirFormularioPlano === 'function') abrirFormularioPlano('pedido');
        }, 150);
        return;
    }

    if (tipo === 'historico') {
        abrirModulo(chave === 'injecao' ? 'injecao' : chave);
        if (window.atlasModuloAbriuNovaAbaAgora) return;
        setTimeout(() => {
            if (chave === 'injecao' && typeof exibirHistoricoModulo === 'function') exibirHistoricoModulo('injecao');
            if (chave === 'bobines' && typeof moduloBobine === 'function') moduloBobine('historico');
            if (chave === 'serra' && typeof listarHistoricoSerra === 'function') listarHistoricoSerra();
            if (chave === 'embalagem' && typeof listarHistoricoEmbalagem === 'function') listarHistoricoEmbalagem();
            if (chave === 'plano' && typeof listarHistoricoPlano === 'function') listarHistoricoPlano();
        }, 150);
        return;
    }

    if (tipo === 'calculadora') {
        abrirModulo('bobines');
        if (window.atlasModuloAbriuNovaAbaAgora) return;
        setTimeout(() => {
            if (typeof moduloBobine === 'function') moduloBobine(chave === 'agro' ? 'calculadora_agro' : 'calculadora');
        }, 150);
    }
}

function fecharModal() {
    document.getElementById('modal-edicao').style.display = 'none';
}


function abrirModulo(nome) {
    if (nome === 'permissoes' && !usuarioEhAdmin()) {
        alert("Apenas ADMIN ou SUPERVISOR podem acessar esta área.");
        return;
    }
    if (!usuarioPodeVerModulo(nome)) {
        alert("Sem permissao para acessar esta area.");
        return;
    }

    document.getElementById('grid-home').style.display = 'none';
    document.getElementById('conteudo-modulo').style.display = 'block';
    window.atlasModuloAtual = nome;

    const titulos = {
        injecao: "INJEÇÃO",
        bobines: "BOBINES",
        serra: "SERRA",
        embalagem: "EMBALAGEM",
        plano: "PLANO",
        stock: "STOCK",
        gestao: "GESTÃO",
        config: "AJUSTES",
        lixeira: "LIXEIRA",
        permissoes: "PERMISSOES"
    };

    document.getElementById('titulo-modulo').innerText = titulos[nome];
    const render = document.getElementById('render-modulo');

    if (nome === 'injecao') {
        render.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; padding:15px;">
                <div class="card" onclick="exibirFormulario('injecao')"><i class="fas fa-plus"></i><span>Novo Relatório</span></div>
                <div class="card" onclick="exibirHistoricoModulo('injecao')"><i class="fas fa-history"></i><span>Histórico</span></div>
            </div>`;
    } 
    else if (nome === 'bobines') {
        renderizarMenuBobines();
    } 
    else if (nome === 'serra') {
        renderizarMenuSerra();
    }
    else if (nome === 'embalagem') {
        renderizarMenuEmbalagem();
    }
    else if (nome === 'plano') {
        renderizarMenuPlanoNovo();
    }
    else if (nome === 'stock') {
        renderizarMenuStockAtlas();
    }
    else if (nome === 'permissoes') {
        renderizarPermissoesAdmin();
    }
    else if (nome === 'gestao') {
        renderizarMenuGestao();
    }
   else if (nome === 'config') {
    renderizarMenuAjustes();
}
   else if (nome === 'lixeira') {
    renderizarLixeiraAtlas();
}

}

function atlasUsuarioDigitandoOuEditando() {
    const ativo = document.activeElement;
    const tag = String(ativo?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    const ajustes = document.getElementById('conteudo-ajustes');
    if (ajustes && ajustes.style.display === 'block') return true;
    const modal = document.getElementById('modal-edicao');
    return modal && modal.style.display && modal.style.display !== 'none';
}

function atlasAtualizarTelaAposSyncNuvem(evento) {
    if (!usuarioLogado) return;
    if (window.atlasGuiasInjecaoEmUso === true) return;

    const chavesAtualizadas = evento?.detail?.chaves || [];
    if (chavesAtualizadas.length === 1 && chavesAtualizadas[0] === 'atlas_guias_injecao') return;

    if (typeof aplicarPermissoesUsuario === 'function') aplicarPermissoesUsuario();
    if (typeof aplicarPreferenciasVisuaisUsuario === 'function') aplicarPreferenciasVisuaisUsuario();

    if (!window.atlasModuloAtual || atlasUsuarioDigitandoOuEditando()) return;

    clearTimeout(window.atlasTimerAtualizacaoTelaNuvem);
    window.atlasTimerAtualizacaoTelaNuvem = setTimeout(() => {
        const modulo = window.atlasModuloAtual;
        if (!modulo || atlasUsuarioDigitandoOuEditando()) return;
        abrirModulo(modulo);
    }, 350);
}

window.addEventListener('atlasDadosNuvemAtualizados', atlasAtualizarTelaAposSyncNuvem);


function atlasSelecionarOpcaoPorTexto(selectId, texto) {
    const select = document.getElementById(selectId);
    if (!select || !texto) return;
    const alvo = String(texto).toLowerCase();
    const opcao = Array.from(select.options).find(opt => {
        const valor = String(opt.value || opt.textContent || '').toLowerCase();
        return valor.includes(alvo) || alvo.includes(valor);
    });
    if (opcao) select.value = opcao.value;
}

function atlasInjecaoRelatorioAtual(modulo) {
    const dataInput = document.getElementById('data-producao').value;
    const d = new Date(dataInput + "T12:00:00");
    return {
        modulo,
        data: d.toLocaleDateString('pt-br'),
        operador: document.getElementById('user-display').innerText,
        itens: [...producoesDoDia]
    };
}

function atlasInjecaoPreviewFinalizar(modulo) {
    if (!producoesDoDia.length) return alert('Adicione itens antes de finalizar.');
    const rel = atlasInjecaoRelatorioAtual(modulo);
    const janela = window.open('', '_blank');
    janela.document.write(`
        <html><head><title>Previa Relatorio Injecao</title>
        <style>
            body{font-family:Arial,sans-serif;padding:22px;color:#111}
            .topo{border-bottom:4px solid #111;padding-bottom:12px;margin-bottom:16px}
            table{width:100%;border-collapse:collapse} th,td{border:1px solid #111;padding:7px;font-size:12px} th{background:#eee}
            .no-print{margin-top:18px;display:flex;gap:10px} button{padding:12px 16px;font-weight:bold}
            @media print{.no-print{display:none}}
        </style></head><body>
            <div class="topo"><h1>Previa - Relatorio Injecao</h1><div>Data: ${atlasTextoSeguroSaude(rel.data)} | Operador: ${atlasTextoSeguroSaude(rel.operador)}</div></div>
            <table><thead><tr><th>Painel</th><th>Esp.</th><th>RAL</th><th>Metros</th><th>Vel.</th><th>Quimicos</th></tr></thead>
            <tbody>${rel.itens.map(item => `<tr><td>${atlasTextoSeguroSaude(item.pir ? 'PIR - ' : '')}${atlasTextoSeguroSaude(item.nome)}</td><td>${atlasTextoSeguroSaude(item.esp)} mm</td><td>${atlasTextoSeguroSaude(item.ral || '')}</td><td>${atlasTextoSeguroSaude(item.metros)}</td><td>${atlasTextoSeguroSaude(item.vel || '')}</td><td>POL ${atlasTextoSeguroSaude(item.pol || 0)} | MDI ${atlasTextoSeguroSaude(item.mdi || 0)} | PEN ${atlasTextoSeguroSaude(item.pen || 0)}</td></tr>`).join('')}</tbody></table>
            <div class="no-print">
                <button onclick="window.print()">IMPRIMIR / PDF</button>
                <button onclick="window.opener.finalizarTurno('${modulo}'); try { window.opener.focus(); } catch(e) {}">CONFIRMAR E SALVAR</button>
            </div>
        </body></html>
    `);
    janela.document.close();
}

/* ==========================================================================
   SEÇÃO: INJEÇÃO (ORIGINAL)
   ========================================================================== */
let producoesDoDia = []; // Deve ficar no topo do script
   function exibirFormulario(modulo) {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('render-modulo').innerHTML = `
        <div style="padding: 15px;">
            <label style="font-size:12px; color:#94a3b8;">DATA DA PRODUÇÃO</label>
            <input type="date" id="data-producao" value="${hoje}" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
<label style="font-size:12px; color:#94a3b8;">TIPO DE PAINEL</label>
            <select id="inj-painel" onchange="atualizarEspumaInjecaoPadrao()" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesTipoPainelHTML()}
            </select>

            <label style="font-size:12px; color:#94a3b8;">RAL DO PAINEL</label>
            <select id="inj-ral" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                <option value="">Sem RAL</option>
                ${OPCOES_RAL_INF.concat(OPCOES_RAL_SUP).filter((v,i,a)=>a.indexOf(v)===i).map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>

            <label style="display:flex; align-items:center; gap:12px; background:#1e293b; border:2px solid #3b82f6; color:white; border-radius:8px; padding:13px; margin-bottom:15px; font-weight:900;">
                <input type="checkbox" id="inj-pir" style="width:20px; height:20px;">
                <span>PIR</span>
            </label>
            
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <div style="flex:1;">
                    <label style="font-size:12px; color:#94a3b8;">ESPESSURA</label>
                    <select id="inj-esp">
                        <option value="30">30 mm</option>
                        <option value="40">40 mm</option>
                        <option value="50">50 mm</option>
                        <option value="60">60 mm</option>
                        <option value="80">80 mm</option>
                        <option value="100">100 mm</option>
                         <option value="120">120 mm</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px; color:#94a3b8;">METROS</label>
                    <input type="number" id="prod-metros" placeholder="Qtd" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                </div>
            </div>

            <label style="font-size:12px; color:#94a3b8;">ESPESSURA DA ESPUMA (OPCIONAL)</label>
            <select id="inj-espuma" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesEspumaInjecaoHTML()}
            </select>

            <label style="font-size:11px; color:#3b82f6; font-weight:bold;">PARÂMETROS DA MÁQUINA</label>
            <label style="font-size:12px; color:#94a3b8;">FITA (OPCIONAL)</label>
            <select id="inj-fita" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesFitaInjecaoHTML()}
            </select>

            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                    <label style="font-size:12px; color:#94a3b8;">DENSIDADE (OPCIONAL)</label>
                    <button type="button" onclick="adicionarLinhaDensidadeInjecao()" style="background:#3b82f6; color:white; border:none; border-radius:6px; padding:7px 12px; font-weight:bold;">+</button>
                </div>
                <div id="container-densidade-injecao"></div>
            </div>

            <div class="grid-quimicos">
                <input type="number" id="q-pol" placeholder="POL kg">
                <input type="number" id="q-polpir" placeholder="POL/PIR kg">
                <input type="number" id="q-mdi" placeholder="MDI kg">
                <input type="number" id="q-pen" placeholder="PEN kg">
                <input type="number" id="q-cat1" placeholder="Cat 1 kg">
                <input type="number" id="q-cat2" placeholder="Cat 2 kg">
                <input type="number" id="q-cat3" placeholder="Cat 3 kg">
                <input type="number" id="q-cat4" placeholder="Cat 4 kg">
                <select id="q-vel">
                    ${opcoesVelocidadeInjecaoHTML()}
                </select>
            </div>

            <button onclick="salvarNaLista()" class="btn-primary btn-add-lista">ADICIONAR À LISTA</button>
            <div id="lista-temp" style="margin-top:15px;"></div>
            <button id="btn-finalizar" onclick="atlasFinalizarDiaInjecao('${modulo}')" class="btn-primary btn-finish-dia" style="display:none;">FINALIZAR DIA</button>
        </div>`;
    atualizarEspumaInjecaoPadrao();
    adicionarLinhaDensidadeInjecao();
}

function atualizarEspumaInjecaoPadrao() {
    const painel = document.getElementById('inj-painel')?.value || '';
    const espuma = document.getElementById('inj-espuma');
    if (espuma && !espuma.value) espuma.value = espumaPadraoInjecao(painel);
}

function adicionarLinhaDensidadeInjecao(ponta1 = '', meio = '', ponta2 = '', horario = '', containerId = 'container-densidade-injecao') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'linha-densidade-injecao';
    div.style = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(88px, 1fr)); gap:8px; margin-bottom:8px;';
    div.innerHTML = `
        <input class="densidade-ponta1" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="Ponta 1" value="${ponta1 || ''}" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
        <input class="densidade-meio" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="Meio" value="${meio || ''}" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
        <input class="densidade-ponta2" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="Ponta 2" value="${ponta2 || ''}" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
        <input class="densidade-horario" type="time" value="${horario || ''}" style="width:100%; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#ef4444; color:white; border:none; border-radius:8px; font-weight:bold;">X</button>
    `;
    container.appendChild(div);
}

function coletarDensidadesInjecao(containerId = 'container-densidade-injecao') {
    const container = document.getElementById(containerId);
    if (!container) return [];

    return Array.from(container.querySelectorAll('.linha-densidade-injecao'))
        .map(linha => ({
            ponta1: linha.querySelector('.densidade-ponta1')?.value || '',
            meio: linha.querySelector('.densidade-meio')?.value || '',
            ponta2: linha.querySelector('.densidade-ponta2')?.value || '',
            horario: linha.querySelector('.densidade-horario')?.value || ''
        }))
        .filter(item => item.ponta1 || item.meio || item.ponta2 || item.horario);
}

function textoDensidadesInjecao(densidades) {
    const lista = Array.isArray(densidades) ? densidades : [];
    return lista
        .filter(item => item && (item.ponta1 || item.meio || item.ponta2 || item.valor || item.horario))
        .map(item => {
            const leitura = item.valor || `${item.ponta1 || '-'}/${item.meio || '-'}/${item.ponta2 || '-'}`;
            return `${leitura}${item.horario ? ` - ${item.horario}` : ''}`;
        })
        .join(' | ');
}

function salvarNaLista() {
    const painel = document.getElementById('inj-painel').value;
    const esp = document.getElementById('inj-esp').value;
    const espuma = document.getElementById('inj-espuma')?.value || espumaPadraoInjecao(painel);
    const fita = document.getElementById('inj-fita')?.value || '';
    const densidades = coletarDensidadesInjecao();
    const metros = document.getElementById('prod-metros').value;

    if(!metros) return alert("Por favor, insira a quantidade de metros!");

    const item = {
        id: Date.now(),
        nome: painel,
        esp: esp,
        ral: document.getElementById('inj-ral')?.value || '',
        pir: !!document.getElementById('inj-pir')?.checked,
        espuma,
        fita,
        densidades,
        metros: metros,
        pol: document.getElementById('q-pol').value || 0,
        polpir: document.getElementById('q-polpir')?.value || 0,
        mdi: document.getElementById('q-mdi').value || 0,
        pen: document.getElementById('q-pen').value || 0,
        cat1: document.getElementById('q-cat1').value || 0,
        cat2: document.getElementById('q-cat2').value || 0,
        cat3: document.getElementById('q-cat3').value || 0,
        cat4: document.getElementById('q-cat4').value || 0,
        vel: document.getElementById('q-vel').value || 0,
        paragens: []
    };

    producoesDoDia.push(item);
    document.getElementById('btn-finalizar').style.display = "block";
    atualizarListaVisual();
    document.getElementById('prod-metros').value = "";
}

function atualizarListaVisual() {
    const listaTemp = document.getElementById('lista-temp');
    listaTemp.innerHTML = ""; 
    producoesDoDia.forEach(item => {
        listaTemp.innerHTML += `
        
            <div style="padding:10px; border-bottom:1px solid #334155; background:#1e293b; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:12px; color:white;">
                    <b>${item.pir ? 'PIR - ' : ''}${item.nome} (${item.esp}mm)</b>${item.espuma ? ` <small style="color:#fbbf24;">| Espuma: ${item.espuma}</small>` : ''}${item.fita ? ` <small style="color:#22c55e;">| Fita: ${item.fita}</small>` : ''}<br>
                    ${textoDensidadesInjecao(item.densidades) ? `<small style="color:#38bdf8;">Densidade: ${textoDensidadesInjecao(item.densidades)}</small><br>` : ''}
                    <span>Mts: ${item.metros} | Vel: ${item.vel}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="editarTudo(${item.id})" style="background:#eab308; color:black; border:none; padding:5px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">EDITAR</button>
                    <button onclick="removerItem(${item.id})" style="background:#ef4444; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:10px;">X</button>
                </div>
            </div>`;
    });
}

/* ==========================================================================
   SISTEMA DE EDIÇÃO (MODAL)
   ========================================================================== */
function editarTudo(id) {
    const item = producoesDoDia.find(p => p.id === id);
    if(!item) return;

    const container = document.getElementById('conteudo-modal');
    container.innerHTML = `
        <input type="hidden" id="edit-id" value="${item.id}">
        <div style="display:flex; flex-direction:column; gap:10px;">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label style="color:white; font-size:11px;">DATA</label>
                    <input type="date" id="edit-data" value="${item.data || ''}" style="width:100%; padding:8px; border-radius:5px; background:#020617; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="font-size:12px; color:#94a3b8;">ESPESSURA</label>
                    <select id="inj-esp">
                        <option value="30">30 mm</option>
                        <option value="40">40 mm</option>
                        <option value="50">50 mm</option>
                        <option value="60">60 mm</option>
                        <option value="80">80 mm</option>
                        <option value="100">100 mm</option>
                         <option value="120">120 mm</option>
                    </select>
                </div>
            </div>

            <label style="font-size:12px; color:#94a3b8;">TIPO DE PAINEL</label>
            <select id="inj-painel-edit" onchange="if(!document.getElementById('inj-espuma-edit').value) document.getElementById('inj-espuma-edit').value = espumaPadraoInjecao(this.value)" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesTipoPainelHTML(item.nome)}
            </select>

            <label style="font-size:12px; color:#94a3b8;">ESPESSURA DA ESPUMA (OPCIONAL)</label>
            <select id="inj-espuma-edit" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesEspumaInjecaoHTML(item.espuma || espumaPadraoInjecao(item.nome))}
            </select>

            <label style="font-size:12px; color:#94a3b8;">FITA (OPCIONAL)</label>
            <select id="inj-fita-edit" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px;">
                ${opcoesFitaInjecaoHTML(item.fita || '')}
            </select>

            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                    <label style="font-size:12px; color:#94a3b8;">DENSIDADE (OPCIONAL)</label>
                    <button type="button" onclick="adicionarLinhaDensidadeInjecao('', '', '', '', 'container-densidade-injecao-edit')" style="background:#3b82f6; color:white; border:none; border-radius:6px; padding:7px 12px; font-weight:bold;">+</button>
                </div>
                <div id="container-densidade-injecao-edit"></div>
            </div>

             <label style="font-size:12px; color:#94a3b8; font-weight:bold;">Velocidade Da Linha</label>
            <select id="q-vel">
                    <option value="" disabled selected>Vel (m/min)</option>
                    <option value="5 m/min">5 m/min</option>
                    <option value="6 m/min">6 m/min</option>
                    <option value="8 m/min">8 m/min</option>
                    <option value="9 m/min">9 m/min</option>
                    <option value="10 m/min">10 m/min</option>
                    <option value="11 m/min">11 m/min</option>
                    <option value="12 m/min">12 m/min</option>
                </select>


            <label style="color:white; font-size:11px;">METROS</label>
            <input type="number" id="edit-metros" value="${item.metros}" style="padding:8px; border-radius:5px; background:#020617; color:white; border:1px solid #334155;">

            <label style="color:#3b82f6; font-size:12px; font-weight:bold; margin-top:10px;">QUÍMICOS / CATALISADORES</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                <div>
                    <label style="color:white; font-size:10px;">POL</label>
                    <input type="number" id="edit-pol" value="${item.pol || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="color:white; font-size:10px;">MDI</label>
                    <input type="number" id="edit-mdi" value="${item.mdi || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="color:white; font-size:10px;">PEN</label>
                    <input type="number" id="edit-pen" value="${item.pen || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="color:white; font-size:10px;">CAT 1</label>
                    <input type="number" id="edit-cat1" value="${item.cat1 || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="color:white; font-size:10px;">CAT 2</label>
                    <input type="number" id="edit-cat2" value="${item.cat2 || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
                <div>
                    <label style="color:white; font-size:10px;">CAT 3</label>
                    <input type="number" id="edit-cat3" value="${item.cat3 || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
            </div>
            <label style="color:white; font-size:10px;">CAT 4</label>
                    <input type="number" id="edit-cat4" value="${item.cat4 || 0}" style="width:100%; padding:5px; background:#1e293b; color:white; border:1px solid #334155;">
                </div>
            </div>
            <div id="container-paragens" style="margin-top:10px;"></div>
            <button type="button" onclick="adicionarLinhaParagem()" style="background:#3b82f6; color:white; border:none; padding:5px; border-radius:4px; font-size:10px;">+ PARAGEM</button>
        </div>`;

    if (item.paragens && item.paragens.length > 0) {
        item.paragens.forEach(p => adicionarLinhaParagem(p.motivo, p.tempo));
    }
    if (Array.isArray(item.densidades) && item.densidades.length > 0) {
        item.densidades.forEach(d => {
            if (d.valor && !d.ponta1 && !d.meio && !d.ponta2) {
                adicionarLinhaDensidadeInjecao(d.valor, '', '', d.horario, 'container-densidade-injecao-edit');
            } else {
                adicionarLinhaDensidadeInjecao(d.ponta1, d.meio, d.ponta2, d.horario, 'container-densidade-injecao-edit');
            }
        });
    }
    document.getElementById('modal-edicao').style.display = 'flex';
}

function editarTudo(id) {
    const item = producoesDoDia.find(p => p.id === id);
    if (!item) return;

    const container = document.getElementById('conteudo-modal');
    container.innerHTML = `
        <input type="hidden" id="edit-id" value="${item.id}">
        <div style="display:grid; gap:12px;">
            <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                <h4 style="margin:0 0 10px; color:white; font-size:14px;">Produto</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
                    <label style="color:#94a3b8; font-size:11px;">TIPO
                        <select id="inj-painel-edit" onchange="if(!document.getElementById('inj-espuma-edit').value) document.getElementById('inj-espuma-edit').value = espumaPadraoInjecao(this.value)" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            ${opcoesTipoPainelHTML(item.nome)}
                        </select>
                    </label>
                    <label style="color:#94a3b8; font-size:11px;">ESPESSURA
                        <select id="edit-esp" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            ${[30, 40, 50, 60, 80, 100, 120].map(v => `<option value="${v}" ${String(item.esp) === String(v) ? 'selected' : ''}>${v} mm</option>`).join('')}
                        </select>
                    </label>
                    <label style="color:#94a3b8; font-size:11px;">RAL
                        <select id="inj-ral-edit" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            <option value="">Sem RAL</option>
                            ${OPCOES_RAL_INF.concat(OPCOES_RAL_SUP).filter((v,i,a)=>a.indexOf(v)===i).map(v => `<option value="${v}" ${String(item.ral || '') === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </label>
                    <label style="color:white; font-size:14px; font-weight:900; display:flex; align-items:center; gap:10px; background:#1e293b; border:2px solid #3b82f6; border-radius:8px; padding:10px; margin-top:4px;">
                        <input type="checkbox" id="inj-pir-edit" ${item.pir ? 'checked' : ''} style="width:20px; height:20px;">
                        PIR
                    </label>
                    <label style="color:#94a3b8; font-size:11px;">METROS
                        <input type="number" id="edit-metros" value="${item.metros}" style="width:100%; margin-top:4px; padding:10px; border-radius:8px; background:#020617; color:white; border:1px solid #334155;">
                    </label>
                    <label style="color:#94a3b8; font-size:11px;">VELOCIDADE
                        <select id="edit-vel" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            ${opcoesVelocidadeInjecaoHTML(item.vel || '')}
                        </select>
                    </label>
                </div>
            </div>

            <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                <h4 style="margin:0 0 10px; color:white; font-size:14px;">Opcionais</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
                    <label style="color:#94a3b8; font-size:11px;">ESPUMA
                        <select id="inj-espuma-edit" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            ${opcoesEspumaInjecaoHTML(item.espuma || espumaPadraoInjecao(item.nome))}
                        </select>
                    </label>
                    <label style="color:#94a3b8; font-size:11px;">FITA
                        <select id="inj-fita-edit" style="width:100%; margin-top:4px; padding:10px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                            ${opcoesFitaInjecaoHTML(item.fita || '')}
                        </select>
                    </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin:12px 0 8px;">
                    <span style="font-size:12px; color:#94a3b8;">DENSIDADE</span>
                    <button type="button" onclick="adicionarLinhaDensidadeInjecao('', '', '', '', 'container-densidade-injecao-edit')" style="background:#3b82f6; color:white; border:none; border-radius:7px; padding:8px 13px; font-weight:bold;">+</button>
                </div>
                <div id="container-densidade-injecao-edit"></div>
            </div>

            <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                <h4 style="margin:0 0 10px; color:white; font-size:14px;">Quimicos / catalisadores</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(95px, 1fr)); gap:8px;">
                    ${[
                        ['edit-pol', 'POL', item.pol],
                        ['edit-polpir', 'POL/PIR', item.polpir],
                        ['edit-mdi', 'MDI', item.mdi],
                        ['edit-pen', 'PEN', item.pen],
                        ['edit-cat1', 'CAT 1', item.cat1],
                        ['edit-cat2', 'CAT 2', item.cat2],
                        ['edit-cat3', 'CAT 3', item.cat3],
                        ['edit-cat4', 'CAT 4', item.cat4]
                    ].map(campo => `
                        <label style="color:#94a3b8; font-size:10px;">${campo[1]}
                            <input type="number" id="${campo[0]}" value="${campo[2] || 0}" style="width:100%; margin-top:4px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:8px;">
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                    <h4 style="margin:0; color:white; font-size:14px;">Paragens</h4>
                    <button type="button" onclick="adicionarLinhaParagem()" style="background:#3b82f6; color:white; border:none; padding:8px 10px; border-radius:7px; font-size:12px; font-weight:bold;">+ PARAGEM</button>
                </div>
                <div id="container-paragens"></div>
            </div>
        </div>
    `;

    if (Array.isArray(item.densidades) && item.densidades.length > 0) {
        item.densidades.forEach(d => {
            if (d.valor && !d.ponta1 && !d.meio && !d.ponta2) {
                adicionarLinhaDensidadeInjecao(d.valor, '', '', d.horario, 'container-densidade-injecao-edit');
            } else {
                adicionarLinhaDensidadeInjecao(d.ponta1, d.meio, d.ponta2, d.horario, 'container-densidade-injecao-edit');
            }
        });
    } else {
        adicionarLinhaDensidadeInjecao('', '', '', '', 'container-densidade-injecao-edit');
    }

    if (Array.isArray(item.paragens) && item.paragens.length > 0) {
        item.paragens.forEach(p => adicionarLinhaParagem(p.motivo, p.tempo));
    }

    document.getElementById('modal-edicao').style.display = 'flex';
}

function salvarEdicaoModal() {
    const id = parseInt(document.getElementById('edit-id').value);
    const item = producoesDoDia.find(p => p.id === id);
    
    if (item) {
        item.metros = document.getElementById('edit-metros').value;
        item.nome = document.getElementById('inj-painel-edit')?.value || item.nome;
        item.esp = document.getElementById('edit-esp')?.value || item.esp;
        item.ral = document.getElementById('inj-ral-edit')?.value || '';
        item.pir = !!document.getElementById('inj-pir-edit')?.checked;
        item.vel = document.getElementById('edit-vel')?.value || item.vel;
        item.espuma = document.getElementById('inj-espuma-edit')?.value || '';
        item.fita = document.getElementById('inj-fita-edit')?.value || '';
        item.densidades = coletarDensidadesInjecao('container-densidade-injecao-edit');
        item.pol = document.getElementById('edit-pol')?.value || 0;
        item.polpir = document.getElementById('edit-polpir')?.value || 0;
        item.mdi = document.getElementById('edit-mdi')?.value || 0;
        item.pen = document.getElementById('edit-pen')?.value || 0;
        item.cat1 = document.getElementById('edit-cat1')?.value || 0;
        item.cat2 = document.getElementById('edit-cat2')?.value || 0;
        item.cat3 = document.getElementById('edit-cat3')?.value || 0;
        item.cat4 = document.getElementById('edit-cat4')?.value || 0;
        const motivos = document.querySelectorAll('.paragem-motivo');
        const tempos = document.querySelectorAll('.paragem-tempo');
        item.paragens = [];
        motivos.forEach((el, index) => {
            if (el.value.trim() !== "") {
                item.paragens.push({ motivo: el.value, tempo: tempos[index].value });
            }
        });
        fecharModal();
        atualizarListaVisual();
    }
}

function adicionarLinhaParagem(motivo = '', tempo = '') {
    const container = document.getElementById('container-paragens');
    const div = document.createElement('div');
    // Aumentei um pouco a largura da coluna do tempo (de 60px para 80px) para caber o relógio digital
    div.style = "display:grid; grid-template-columns: 1fr 80px 30px; gap:5px; margin-bottom:5px;"; 
    div.innerHTML = `
        <input type="text" placeholder="Motivo" value="${motivo}" class="paragem-motivo" style="padding:5px; border-radius:4px; background:#0f172a; color:white; border:1px solid #334155; font-size:11px;">
        
        <input type="time" value="${tempo}" class="paragem-tempo" style="padding:5px; border-radius:4px; background:#0f172a; color:white; border:1px solid #334155; font-size:11px;">
        
        <button type="button" onclick="this.parentElement.remove()" style="background:#ef4444; color:white; border:none; border-radius:4px;">X</button>`;
    container.appendChild(div);
}

function fecharModal() {
    document.getElementById('modal-edicao').style.display = 'none';
}

function removerItem(id) {
    if (!usuarioPodeExcluirModulo('injecao')) return alert('Sem permissao para excluir na Injecao.');
    producoesDoDia = producoesDoDia.filter(p => p.id !== id);
    atualizarListaVisual();
    if(producoesDoDia.length === 0) document.getElementById('btn-finalizar').style.display = "none";
}

/* ==========================================================================
   GERAÇÃO DE PDF E HISTÓRICO
   ========================================================================== */
function finalizarTurno(modulo) {
    const dataInput = document.getElementById('data-producao').value;
    const d = new Date(dataInput + "T12:00:00");
    const ano = d.getFullYear();
    const mes = d.toLocaleString('pt-br', { month: 'long' }).toUpperCase();
    
    let db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    if(!db[ano]) db[ano] = {};
    if(!db[ano][mes]) db[ano][mes] = [];

    db[ano][mes].push({
        modulo,
        data: d.toLocaleDateString('pt-br'),
        operador: document.getElementById('user-display').innerText,
        itens: [...producoesDoDia]
    });

    localStorage.setItem('atlas_db', JSON.stringify(db));
    alert("Relatório salvo!");
    voltarHome();
}

function exibirHistoricoModulo(modulo) {
    const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
    const render = document.getElementById('render-modulo');
    let html = `
        <div style="padding:15px; color:white;">
            <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">📂 Histórico da injeççao</h2>
    `;

    for(let ano in db) {
        html += `
            <div class="folder-year" onclick="toggleElement('folder-ano-${ano}')" style="background:#334155; padding:12px; margin-top:8px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:white;">
                <span>📂 ANO ${ano}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div id="folder-ano-${ano}" style="display:none; padding:5px 10px;">`;
        
        for(let mes in db[ano]) {
            const filtrados = db[ano][mes].filter(r => r.modulo === modulo);
            if(filtrados.length > 0) {
                const mesId = `folder-mes-${ano}-${mes}`;
                html += `
                    <div class="folder-month" onclick="toggleElement('${mesId}')" style="color:#3b82f6; padding:10px; cursor:pointer; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; font-weight:600;">
                        <span>📅 ${mes}</span>
                        <i class="fas fa-caret-down"></i>
                    </div>
                    <div id="${mesId}" style="display:none; padding-left:10px; border-left:2px solid #3b82f6; margin-bottom:10px;">`;
                
                filtrados.forEach((rel, idx) => {
                    const relId = `detalhe-${ano}-${mes}-${idx}`;
                    html += `
                        <div style="background:#1e293b; padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid #334155;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="color:white; font-size:13px;"><b>${rel.data}</b> <br><small style="color:#94a3b8;">${rel.operador}</small></div>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="toggleElement('${relId}')" style="background:#475569; color:white; border:none; padding:6px 10px; border-radius:5px; font-size:11px; cursor:pointer;">VER</button>
                                    <button onclick="gerarPDF_Injecao_Final('${encodeURIComponent(JSON.stringify(rel))}')" style="background:#10b981; color:white; border:none; padding:6px 10px; border-radius:5px; font-size:11px; cursor:pointer;"><i class="fas fa-file-pdf"></i> PDF</button>
                                </div>
                            </div>
                            <div id="${relId}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #334155; font-size:12px; color:#cbd5e1;">
                                ${rel.itens.map(item => `
                                    <div style="margin-bottom:8px;">
                                        <b style="color:#10b981;">${item.pir ? 'PIR - ' : ''}${item.nome} (${item.esp}mm)</b>: ${item.metros}m | Vel: ${item.vel}m/min ${item.espuma ? '| Espuma: ' + item.espuma : ''} ${item.fita ? '| Fita: ' + item.fita : ''}
                                        ${textoDensidadesInjecao(item.densidades) ? `<div style="font-size:10px; color:#38bdf8;">Densidade: ${textoDensidadesInjecao(item.densidades)}</div>` : ''}
                                        <div style="font-size:10px; color:#94a3b8;">P:${item.pol} M:${item.mdi} Pen:${item.pen} | C1:${item.cat1} C2:${item.cat2}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>`;
                });
                html += `</div>`;
            }
        }
        html += `</div>`;
    }
    render.innerHTML = html || "<p style='text-align:center; padding:20px; color:gray;'>Nenhum histórico encontrado.</p>";
}

// Função auxiliar para abrir e fechar (Toggle)
function toggleElement(id) {
    const el = document.getElementById(id);
    if (el.style.display === "none") {
        el.style.display = "block";
    } else {
        el.style.display = "none";
    }
}
function gerarPDF_Injecao_Final(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');

    let tabelaItens = "";
    let totalMetrosDia = 0;

    rel.itens.forEach(item => {
        const metrosNum = parseFloat(item.metros) || 0;
        totalMetrosDia += metrosNum;

        tabelaItens += `
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-size: 14px;">${item.nome}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.esp}mm</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.espuma || '-'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.fita || '-'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 12px;">${textoDensidadesInjecao(item.densidades) || '-'}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px; font-weight:bold;">${metrosNum.toFixed(2)}m</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.vel}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.pol}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.mdi}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.pen}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.cat1}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.cat2}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.cat3}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align:center; font-size: 14px;">${item.cat4}</td>
            </tr>`;
        
        if(item.paragens && item.paragens.length > 0) {
            let pTexto = item.paragens.map(p => `• ${p.motivo} (${p.tempo}min)`).join("  |  ");
            tabelaItens += `
                <tr>
                    <td colspan="14" style="border: 1px solid #000; padding: 8px; font-size: 12px; background: #f2f2f2;">
                        <b>PARAGENS:</b> ${pTexto}
                    </td>
                </tr>`;
        }
    });

    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; }
                body { 
                    padding: 0; 
                    margin: 0; 
                    font-family: Arial, sans-serif; 
                    width: 100vw; 
                }

                /* CABEÇALHO OCUPANDO 100% DA LARGURA */
                .header-container { 
                    background: #000; 
                    color: #fff; 
                    width: 100%; 
                    padding: 15px; 
                    border-bottom: 5px solid #E31C24;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .logo-wrapper { display: flex; align-items: center; }
                .logo-bar { width: 30px; height: 8px; background: #E31C24; margin-bottom: 4px; }
                .text-atlas { font-family: 'Arial Black', sans-serif; font-size: 24px; line-height: 1; color: #fff; }
                .text-painel { font-size: 9px; letter-spacing: 4px; color: #fff; text-transform: uppercase; }

                /* TABELA QUE OCUPA A TELA TODA E PERMITE SCROLL SE PRECISAR */
                .main-content { padding: 10px; width: 100%; }
                .table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                table { width: 100%; border-collapse: collapse; min-width: 1100px; } 
                
                th { background: #e2e8f0; border: 1px solid #000; padding: 10px; font-size: 14px; color: #000; }
                td { border: 1px solid #000; padding: 8px; color: #000; }

                .resumo-final { 
                    margin-top: 20px; 
                    padding: 20px; 
                    background: #f8f9fa; 
                    border: 2px solid #000; 
                    text-align: center;
                    width: 100%;
                }

                .assinatura { margin-top: 40px; text-align: center; padding-bottom: 40px; }
                .linha-assinatura { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 5px; }

                @media print { 
                    .no-print { display: none !important; } 
                    @page { size: landscape; margin: 0; }
                    body { width: 100%; }
                    .header-container { background: #000 !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="logo-wrapper">
                    <div style="margin-right:10px;">
                        <div class="logo-bar"></div><div class="logo-bar"></div>
                    </div>
                    <div>
                        <span class="text-atlas">ATLAS</span><br>
                        <span class="text-painel">P A I N E L</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <h2 style="margin:0; font-size: 16px;">RELATÓRIO DE INJEÇÃO</h2>
                </div>
            </div>

            <div class="main-content">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>PRODUTO</th><th>ESP.</th><th>ESPUMA</th><th>FITA</th><th>DENSIDADE / HORA</th><th>METROS</th><th>VEL.</th><th>POL</th><th>MDI</th><th>PEN</th><th>C1</th><th>C2</th><th>C3</th><th>C4</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tabelaItens}
                        </tbody>
                    </table>
                </div>

                <div class="resumo-final">
                    <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
                        TOTAL: <span style="color: #E31C24;">${totalMetrosDia.toFixed(2)} metros</span>
                    </div>
                    <div style="font-size: 14px;">
                        Finalizado por: <b>${rel.operador}</b> em <b>${rel.data}</b>
                    </div>
                </div>

                <div class="assinatura">
                    <div class="linha-assinatura">Assinatura: ${rel.operador}</div>
                </div>

                <div class="no-print" style="text-align: center;">
                    <button onclick="window.print()" style="padding: 20px; background: #000; color: #fff; border: 3px solid #E31C24; width: 100%; font-size: 18px; font-weight: bold; border-radius: 10px;">
                        🖨️ CONFIRMAR E GERAR PDF
                    </button>
                </div>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
}
//final da injeççao

/* ==========================================================================
   MÓDULO: BOBINES
   ========================================================================== */
function gerarPDF_Injecao_Final(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    if (!janela) {
        alert('O navegador bloqueou a abertura do PDF.');
        return;
    }

    const seguro = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const itens = Array.isArray(rel.itens) ? rel.itens : [];
    const primeiro = itens[0] || {};
    let totalMetrosDia = 0;
    const produtos = itens.slice(0, 2);
    while (produtos.length < 2) produtos.push({});

    const quimicos = [
        { nome: 'MDI', chave: 'mdi', cor: '#9b2c2c', texto: '#fff' },
        { nome: 'POL PUR', chave: 'pol', cor: '#d9ead3', texto: '#000' },
        { nome: 'POL PIR', chave: 'polpir', cor: '#d9ead3', texto: '#000' },
        { nome: 'CAT 1', chave: 'cat1', cor: '#f4cccc', texto: '#000' },
        { nome: 'CAT 2', chave: 'cat2', cor: '#f4cccc', texto: '#000' },
        { nome: 'CAT 3', chave: 'cat3', cor: '#f4cccc', texto: '#000' },
        { nome: 'CAT 4', chave: 'cat4', cor: '#f4cccc', texto: '#000' },
        { nome: 'PENT', chave: 'pen', cor: '#fff200', texto: '#000' }
    ];
    const cabecalhoProdutos = produtos.map(() => `<th>Tipo de Painel / Ral</th><th>Espessura</th>`).join('');
    const dadosProdutos = produtos.map(item => `<td>${seguro(item.nome || '')}</td><td>${seguro(item.esp ? item.esp + ' mm' : '')}</td>`).join('');
    const linhasConsumo = quimicos.map(q => {
        const valores = produtos.map(item => q.chave === 'polpir' ? '' : (item[q.chave] || ''));
        return `<tr><td class="quimico" style="background:${q.cor}; color:${q.texto};">${q.nome}</td><td>${seguro(valores[0] || '')}</td><td></td><td>${seguro(valores[1] || '')}</td><td></td></tr>`;
    }).join('');

    const linhasObservacoes = [];
    itens.forEach(item => {
        totalMetrosDia += parseFloat(item.metros) || 0;
        (item.paragens || []).forEach(p => linhasObservacoes.push({ hora: p.tempo || '', texto: `${item.nome || ''} ${item.esp || ''} mm - ${p.motivo || ''}` }));
        (item.densidades || []).forEach(d => {
            if (d.horario) linhasObservacoes.push({ hora: d.horario, texto: `Densidade: ${textoDensidadesInjecao([d])}` });
        });
    });
    while (linhasObservacoes.length < 10) linhasObservacoes.push({ hora: '', texto: '' });
    const htmlObservacoes = linhasObservacoes.slice(0, 12).map(obs => `<tr><td class="hora">${seguro(obs.hora)}</td><td>${seguro(obs.texto)}</td></tr>`).join('');
    const densidadePrimeira = textoDensidadesInjecao(primeiro.densidades) || '';

    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Gestao de Producao Diaria - Injecao</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; background: #ddd; font-family: Arial, Helvetica, sans-serif; color: #000; }
                .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 22mm 24mm 16mm; position: relative; }
                .topo { display: flex; align-items: flex-end; gap: 22mm; margin-bottom: 12mm; }
                .logo { width: 62mm; height: auto; object-fit: contain; }
                .titulo { font-size: 22px; font-weight: 800; text-align: center; flex: 1; margin-bottom: 5mm; }
                .campos-duplos { display: grid; grid-template-columns: 1fr 1fr; gap: 24mm; margin-bottom: 8mm; }
                .campo { display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 4px; margin-bottom: 3mm; font-size: 14px; font-weight: 700; }
                .linha { border-bottom: 2px solid #111; min-height: 18px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th, td { border: 2px solid #111; padding: 4px 6px; height: 24px; }
                th { font-weight: 800; text-align: center; }
                .consumos { width: 78%; margin: 5mm auto 10mm; }
                .consumos caption { caption-side: top; border: 2px solid #111; border-bottom: 0; padding: 7px; font-weight: 800; }
                .quimico { width: 30mm; text-align: center; font-weight: 800; }
                .dados { width: 56%; margin: 0 auto 6mm; }
                .dados th { background: #f5f5f5; }
                .observacoes { margin-top: 4mm; }
                .observacoes .hora { width: 28mm; }
                .no-print { text-align: center; padding: 15px; background: #111827; }
                .no-print button { padding: 14px 20px; background: #111; color: #fff; border: 3px solid #E31C24; border-radius: 10px; font-weight: 800; cursor: pointer; }
                @media print {
                    body { background: #fff; }
                    .page { margin: 0; width: auto; min-height: auto; padding: 18mm 20mm 12mm; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="topo">
                    <img src="logo.png" class="logo" alt="Atlas Painel">
                    <div class="titulo">Gestão de Produção Diária - Injeção</div>
                </div>
                <div class="campos-duplos">
                    <div>
                        <div class="campo"><span>Data:</span><span class="linha">${seguro(rel.data || '')}</span></div>
                        <div style="height:7mm;"></div>
                        <div class="campo"><span>Fita Atlas:</span><span class="linha">${seguro(primeiro.fita || '')}</span></div>
                        <div class="campo"><span>Esponja:</span><span class="linha">${seguro(primeiro.espuma || '')}</span></div>
                        <div class="campo"><span>Velocidade:</span><span class="linha">${seguro(primeiro.vel || '')}</span></div>
                        <div style="height:8mm;"></div>
                        <div class="campo"><span>Densidade:</span><span class="linha">${seguro(densidadePrimeira)}</span></div>
                        <div class="campo"><span>Densidade Real:</span><span class="linha"></span></div>
                    </div>
                    <div>
                        <div class="campo"><span>Funcionario:</span><span class="linha">${seguro(rel.operador || '')}</span></div>
                        <div style="height:7mm;"></div>
                        <div class="campo"><span>Fita Atlas:</span><span class="linha"></span></div>
                        <div class="campo"><span>Esponja:</span><span class="linha"></span></div>
                        <div class="campo"><span>Velocidade:</span><span class="linha"></span></div>
                        <div style="height:8mm;"></div>
                        <div class="campo"><span>Densidade:</span><span class="linha"></span></div>
                        <div class="campo"><span>Densidade Real:</span><span class="linha"></span></div>
                    </div>
                </div>
                <table class="consumos">
                    <caption>Consumos Parciais</caption>
                    <thead><tr><th></th>${cabecalhoProdutos}</tr><tr><th></th>${dadosProdutos}</tr></thead>
                    <tbody>${linhasConsumo}</tbody>
                </table>
                <table class="dados">
                    <thead><tr><th colspan="3">Dados Injeção Parciais</th></tr></thead>
                    <tbody><tr><th>Comprimento</th><td>${totalMetrosDia.toFixed(2)} m</td><td></td></tr></tbody>
                </table>
                <table class="observacoes">
                    <thead><tr><th class="hora">Hora</th><th>Observações: (arranque, paragem união rebentou, valor incorreto, etc)</th></tr></thead>
                    <tbody>${htmlObservacoes}</tbody>
                </table>
            </div>
            <div class="no-print"><button onclick="window.print()">CONFIRMAR E GERAR PDF</button></div>
        </body>
        </html>
    `);
    janela.document.close();
    setTimeout(() => janela.focus(), 300);
}

function gerarPDF_Injecao_Final(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    if (!janela) return alert('O navegador bloqueou a abertura do PDF.');

    const seguro = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const itens = Array.isArray(rel.itens) ? rel.itens : [];
    const produtos = itens.slice(0, 2);
    while (produtos.length < 2) produtos.push({});
    const prodA = produtos[0] || {};
    const prodB = produtos[1] || {};
    let totalMetrosDia = 0;

    const quimicos = [
        ['MDI', 'mdi', '#9b2c2c', '#fff'],
        ['POL PUR', 'pol', '#d9ead3', '#000'],
        ['POL PIR', 'polpir', '#d9ead3', '#000'],
        ['CAT 1', 'cat1', '#f4cccc', '#000'],
        ['CAT 2', 'cat2', '#f4cccc', '#000'],
        ['CAT 3', 'cat3', '#f4cccc', '#000'],
        ['CAT 4', 'cat4', '#f4cccc', '#000'],
        ['PENT', 'pen', '#fff200', '#000']
    ];
    const cabecalhoProdutos = produtos.map(() => `<th>Tipo de Painel / Ral</th><th>Espessura</th>`).join('');
    const dadosProdutos = produtos.map(item => `<td>${seguro(item.nome || '')}</td><td>${seguro(item.esp ? item.esp + ' mm' : '')}</td>`).join('');
    const linhasConsumo = quimicos.map(([nome, chave, cor, texto]) => {
        const v1 = chave === 'polpir' ? '' : (prodA[chave] || '');
        const v2 = chave === 'polpir' ? '' : (prodB[chave] || '');
        return `<tr><td class="quimico" style="background:${cor}; color:${texto};">${nome}</td><td>${seguro(v1)}</td><td></td><td>${seguro(v2)}</td><td></td></tr>`;
    }).join('');

    const linhasObservacoes = [];
    itens.forEach(item => {
        totalMetrosDia += parseFloat(item.metros) || 0;
        (item.paragens || []).forEach(p => linhasObservacoes.push({ hora: p.tempo || '', texto: `${item.nome || ''} ${item.esp || ''} mm - ${p.motivo || ''}` }));
        (item.densidades || []).forEach(d => {
            if (d.horario) linhasObservacoes.push({ hora: d.horario, texto: `Densidade: ${textoDensidadesInjecao([d])}` });
        });
    });
    while (linhasObservacoes.length < 10) linhasObservacoes.push({ hora: '', texto: '' });

    const htmlObservacoes = linhasObservacoes.slice(0, 10).map(obs => `<tr><td class="hora">${seguro(obs.hora)}</td><td>${seguro(obs.texto)}</td></tr>`).join('');
    const densA = textoDensidadesInjecao(prodA.densidades) || '';
    const densB = textoDensidadesInjecao(prodB.densidades) || '';

    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Gestao de Producao Diaria - Injecao</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; background: #ddd; font-family: Arial, Helvetica, sans-serif; color: #000; }
                .page { width: 210mm; height: 297mm; overflow: hidden; margin: 0 auto; background: #fff; padding: 14mm 20mm 8mm; }
                .topo { display: flex; align-items: flex-end; gap: 17mm; margin-bottom: 8mm; }
                .logo-css { width: 56mm; display:flex; align-items:center; gap:2mm; }
                .logo-bars { width:14mm; display:grid; gap:2mm; transform:skewX(-14deg); }
                .logo-bars span { display:block; height:4.1mm; background:#e31c24; }
                .atlas-word { font-family: Arial Black, Arial, sans-serif; font-size: 31px; line-height:.78; letter-spacing:-1px; color:#111; }
                .painel-word { font-size: 10px; letter-spacing: 7px; font-weight: 800; margin-left: 4px; margin-top: 4px; }
                .titulo { font-size: 20px; font-weight: 800; text-align: center; flex: 1; margin-bottom: 3mm; }
                .campos-duplos { display: grid; grid-template-columns: 1fr 1fr; gap: 22mm; margin-bottom: 6mm; }
                .campo { display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 4px; margin-bottom: 2mm; font-size: 12px; font-weight: 700; }
                .linha { border-bottom: 2px solid #111; min-height: 15px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 2px solid #111; padding: 2px 5px; height: 19px; }
                th { font-weight: 800; text-align: center; }
                .consumos { width: 78%; margin: 4mm auto 7mm; }
                .consumos caption { caption-side: top; border: 2px solid #111; border-bottom: 0; padding: 5px; font-weight: 800; }
                .quimico { width: 28mm; text-align: center; font-weight: 800; }
                .dados { width: 56%; margin: 0 auto 4mm; }
                .dados th { background: #f5f5f5; }
                .observacoes { margin-top: 3mm; font-size: 11px; }
                .observacoes th, .observacoes td { height: 17px; }
                .observacoes .hora { width: 26mm; }
                .no-print { text-align: center; padding: 15px; background: #111827; }
                .no-print button { padding: 14px 20px; background: #111; color: #fff; border: 3px solid #E31C24; border-radius: 10px; font-weight: 800; cursor: pointer; }
                @media print {
                    body { background: #fff; }
                    .page { margin: 0; width: 210mm; height: 297mm; padding: 14mm 20mm 8mm; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="topo">
                    <div class="logo-css">
                        <div class="logo-bars"><span></span><span></span></div>
                        <div><div class="atlas-word">ATLAS</div><div class="painel-word">PAINEL</div></div>
                    </div>
                    <div class="titulo">Gest&atilde;o de Produ&ccedil;&atilde;o Di&aacute;ria - Inje&ccedil;&atilde;o</div>
                </div>
                <div class="campos-duplos">
                    <div>
                        <div class="campo"><span>Data:</span><span class="linha">${seguro(rel.data || '')}</span></div>
                        <div style="height:6mm;"></div>
                        <div class="campo"><span>Fita Atlas:</span><span class="linha">${seguro(prodA.fita || '')}</span></div>
                        <div class="campo"><span>Esponja:</span><span class="linha">${seguro(prodA.espuma || '')}</span></div>
                        <div class="campo"><span>Velocidade:</span><span class="linha">${seguro(prodA.vel || '')}</span></div>
                        <div style="height:7mm;"></div>
                        <div class="campo"><span>Densidade:</span><span class="linha">${seguro(densA)}</span></div>
                        <div class="campo"><span>Densidade Real:</span><span class="linha"></span></div>
                    </div>
                    <div>
                        <div class="campo"><span>Funcionario:</span><span class="linha">${seguro(rel.operador || '')}</span></div>
                        <div style="height:6mm;"></div>
                        <div class="campo"><span>Fita Atlas:</span><span class="linha">${seguro(prodB.fita || '')}</span></div>
                        <div class="campo"><span>Esponja:</span><span class="linha">${seguro(prodB.espuma || '')}</span></div>
                        <div class="campo"><span>Velocidade:</span><span class="linha">${seguro(prodB.vel || '')}</span></div>
                        <div style="height:7mm;"></div>
                        <div class="campo"><span>Densidade:</span><span class="linha">${seguro(densB)}</span></div>
                        <div class="campo"><span>Densidade Real:</span><span class="linha"></span></div>
                    </div>
                </div>
                <table class="consumos">
                    <caption>Consumos Parciais</caption>
                    <thead><tr><th></th>${cabecalhoProdutos}</tr><tr><th></th>${dadosProdutos}</tr></thead>
                    <tbody>${linhasConsumo}</tbody>
                </table>
                <table class="dados">
                    <thead><tr><th colspan="3">Dados Inje&ccedil;&atilde;o Parciais</th></tr></thead>
                    <tbody><tr><th>Comprimento</th><td>${totalMetrosDia.toFixed(2)} m</td><td></td></tr></tbody>
                </table>
                <table class="observacoes">
                    <thead><tr><th class="hora">Hora</th><th>Observa&ccedil;&otilde;es: (arranque, paragem uni&atilde;o rebentou, valor incorreto, etc)</th></tr></thead>
                    <tbody>${htmlObservacoes}</tbody>
                </table>
            </div>
            <div class="no-print"><button onclick="window.print()">CONFIRMAR E GERAR PDF</button></div>
        </body>
        </html>
    `);
    janela.document.close();
    setTimeout(() => janela.focus(), 300);
}

function renderizarMenuBobines() {
    const render = document.getElementById('render-modulo');
    
    render.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; padding:15px;">
            <div class="card" onclick="moduloBobine('novo')">
                <i class="fas fa-file-circle-plus"></i>
                <span style="font-size:11px;">CRIAR RELATÓRIO</span>
            </div>
            <div class="card" onclick="moduloBobine('historico')">
                <i class="fas fa-clock-rotate-left"></i>
                <span style="font-size:11px;">HISTÓRICO</span>
            </div>
            <div class="card" onclick="moduloBobine('calculadora')">
                <i class="fas fa-calculator"></i>
                <span style="font-size:11px;">CALC. BOBINA</span>
            </div>
            <div class="card" onclick="moduloBobine('calculadora_agro')">
                <i class="fas fa-wheat-awn"></i>
                <span style="font-size:11px;">CALC. AGROPAINEL</span>
            </div>
        </div>
    `;
}

// Direcionamento das funções de Bobines
/* ==========================================================================
   MÓDULO: BOBINES (VERSÃO SEM EDITAR - APENAS STATUS E EXCLUIR)
   ========================================================================== */

let lancamentosTemporarios = [];
let historicoBobines = atlasArrayLocal('historicoBobines'); // Salva no navegador
let producaoAtiva = 1; 
let lancamentoAtual = { tipo: '', lado: '', subtipo: '', qtd: 1, numBobine: '', ral: '', status: '', producao: 1 };

function moduloBobine(tipo) {
    const render = document.getElementById('render-modulo');
    
    switch(tipo) {
        case 'novo':
            renderizarNovoRelatorio();
            break;
        case 'historico':
            renderizarHistoricoBobines();
            break;
        case 'calculadora':
            renderizarCalculadoraBobina();
            break;
        case 'calculadora_agro':
            renderizarCalculadoraAgro();
            break;
    }
}
function renderizarNovoRelatorio() {
    const render = document.getElementById('render-modulo');
    // Mantém a data de hoje como padrão se for o primeiro acesso
    const dataHojeIso = new Date().toISOString().split('T')[0]; 

    render.innerHTML = `
        <div style="padding: 15px; color: white; max-width: 600px; margin: auto;">
            <div style="background: #1e293b; padding: 20px; border-radius: 15px; border: 1px solid #334155;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#0f172a; padding:10px; border-radius:10px; border:1px solid #3b82f6;">
                    <div style="font-size:11px; color:#3b82f6; font-weight:bold;">DATA DE TRABALHO:</div>
                    <input type="date" id="data-retroativa" value="${dataHojeIso}" 
                        style="background:transparent; color:white; border:none; font-family:Arial; font-weight:bold; cursor:pointer; outline:none;">
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="color:#E31C24; margin:0;">NOVO LANÇAMENTO</h3>
                </div>

                <label style="color:#94a3b8; font-size:12px;">O QUE DESEJA LANÇAR?</label>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin:10px 0 20px 0;">
                    <button onclick="setTipoLancamento('filme')" id="btn-filme" class="btn-opt">FILME</button>
                    <button onclick="setTipoLancamento('chapa')" id="btn-chapa" class="btn-opt">BOBINA CHAPA</button>
                </div>

                <div id="area-configuracao"></div>

                <button onclick="adicionarAoLancamento()" id="btn-add" style="display:none; width:100%; padding:15px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold; margin-top:15px; cursor:pointer;">
                    ADICIONAR AO LANÇAMENTO
                </button>
            </div>

            <div id="lista-lancamentos" style="margin-top:20px;"></div>

            <div id="acoes-finais" style="display:none; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
                <button onclick="encerrarProducao()" style="padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">FIM PRODUÇÃO</button>
                <button onclick="fecharDia()" style="padding:15px; background:#E31C24; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">FECHAR DIA</button>
            </div>
        </div>

        <style>
            .btn-opt { padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; cursor:pointer; font-weight:bold; }
            .btn-opt.active { border-color: #E31C24 !important; background: #2d1315 !important; }
            .input-style { width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:15px; }
            .item-lancado { background:#1e293b; padding:10px; border-radius:8px; margin-bottom:8px; border-left:4px solid #E31C24; display:flex; justify-content:space-between; align-items:center; }
            .badge-status { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; margin-top: 5px; display: inline-block; }
        </style>
    `;
    if(lancamentosTemporarios.length > 0) atualizarLista();
}

function setTipoLancamento(tipo) {
    lancamentoAtual.tipo = tipo;
    document.getElementById('btn-filme').classList.toggle('active', tipo === 'filme');
    document.getElementById('btn-chapa').classList.toggle('active', tipo === 'chapa');
    
    const area = document.getElementById('area-configuracao');
    document.getElementById('btn-add').style.display = 'block';

    area.innerHTML = `
        <label style="color:#94a3b8; font-size:12px; display:block; margin-top:10px;">POSIÇÃO</label>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin:5px 0 15px 0;">
            <button onclick="setLado('superior')" class="btn-opt btn-lado">SUPERIOR</button>
            <button onclick="setLado('inferior')" class="btn-opt btn-lado">INFERIOR</button>
        </div>
        <div id="detalhes-especificos"></div>
    `;
}

function setLado(lado) {
    lancamentoAtual.lado = lado;
    document.querySelectorAll('.btn-lado').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase() === lado));
    
    const areaDet = document.getElementById('detalhes-especificos');
    
    if(lancamentoAtual.tipo === 'filme') {
        const filmesConfigurados = OPCOES_FILMES_STOCK || ['Telha (1180mm)', 'Ondulado (1055mm)', '5 Ondas (1175mm)', 'Fachada (1010)'];
        const opcoesComuns = filmesConfigurados.filter(v => {
            const normalizado = normalizarStockAtlas(v);
            return !normalizado.includes('5 ondas') && !normalizado.includes('telha');
        });
        const opcoesFilme = lado === 'inferior'
            ? [...filmesConfigurados.filter(v => {
                const normalizado = normalizarStockAtlas(v);
                return normalizado.includes('5 ondas') || normalizado.includes('telha');
            }), ...opcoesComuns]
            : filmesConfigurados.filter(v => normalizarStockAtlas(v).includes('fachada') || normalizarStockAtlas(v).includes('1010'));
        let html = `
            <select id="subtipo_filme" class="input-style">
                ${opcoesFilme.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>`;
        
        html += `
            <label style="display:block; margin-bottom:10px; font-size:12px; color:#94a3b8;">QUANTIDADE</label>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:15px;">
                ${[1,2,3,4].map(n => `<button type="button" onclick="setQtd(${n})" class="btn-opt btn-qtd">${n}</button>`).join('')}
            </div>
        `;
        areaDet.innerHTML = html;
        setQtd(1);
    } else {
        areaDet.innerHTML = `
            <input type="text" id="num_bobine" list="lista-bobinas-stock" placeholder="Nº DA BOBINA" class="input-style" autocomplete="off">
            <datalist id="lista-bobinas-stock">${opcoesBobinasStockDatalist()}</datalist>
            <div id="info-bobine-stock"></div>
            <select id="ral_chapa" class="input-style">
                <option value="">SELECIONE O RAL</option>
                ${OPCOES_RAL_INF.concat(OPCOES_RAL_SUP).filter((v,i,a)=>a.indexOf(v)===i).map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
            <label style="color:#94a3b8; font-size:12px;">ACABOU?</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; margin-top:5px;">
                <button onclick="setStatusForm('SIM')" class="btn-opt btn-status">SIM</button>
                <button onclick="setStatusForm('NÃO')" class="btn-opt btn-status">NÃO</button>
                <button onclick="setStatusForm('ANDAMENTO')" class="btn-opt btn-status">ANDAMENTO</button>
            </div>
        `;
        const inputBobine = document.getElementById('num_bobine');
        if (inputBobine) {
            inputBobine.addEventListener('input', preencherInfoBobinaLancamento);
            inputBobine.addEventListener('change', preencherInfoBobinaLancamento);
        }
    }
}

function setQtd(n) {
    lancamentoAtual.qtd = n;
    document.querySelectorAll('.btn-qtd').forEach(b => b.classList.toggle('active', parseInt(b.innerText) === n));
}

function setStatusForm(status) {
    lancamentoAtual.status = status;
    document.querySelectorAll('.btn-status').forEach(b => b.classList.toggle('active', b.innerText === status));
}

function buscarBobinaStockPorNumero(numero) {
    const alvo = normalizarStockAtlas(numero);
    if (!alvo) return null;
    const bobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
    return bobinas.find(b => b.status !== 'acabada_mes' && normalizarStockAtlas(b.numero) === alvo) || null;
}

function buscarBobinasStockPorNumeroParcial(numero) {
    const alvo = normalizarStockAtlas(numero);
    if (!alvo) return [];
    const bobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
    const disponiveis = bobinas.filter(b => b.status !== 'acabada_mes');
    const exatas = disponiveis.filter(b => normalizarStockAtlas(b.numero) === alvo);
    if (exatas.length) return exatas;
    const comeca = disponiveis.filter(b => normalizarStockAtlas(b.numero).startsWith(alvo));
    if (comeca.length) return comeca;
    return disponiveis.filter(b => normalizarStockAtlas(b.numero).includes(alvo));
}

function opcoesBobinasStockDatalist() {
    const bobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
    return [...new Set(bobinas.filter(b => b.status !== 'acabada_mes').map(b => String(b.numero || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
        .map(numero => `<option value="${textoSeguroConferencia(numero)}"></option>`)
        .join('');
}

function preencherInfoBobinaLancamento() {
    const numero = document.getElementById('num_bobine')?.value;
    const info = document.getElementById('info-bobine-stock');
    const ralSelect = document.getElementById('ral_chapa');
    const candidatas = buscarBobinasStockPorNumeroParcial(numero);
    const bobina = candidatas.length === 1 ? candidatas[0] : buscarBobinaStockPorNumero(numero);

    if (!info) return;
    if (!bobina) {
        info.innerHTML = numero ? `
            <div style="background:#451a03; color:#fed7aa; border:1px solid #f97316; border-radius:8px; padding:10px; margin-bottom:12px; font-size:12px;">
                ${candidatas.length > 1
                    ? `Encontradas ${candidatas.length} bobinas. Continue digitando ou escolha uma sugestao: ${candidatas.slice(0, 5).map(b => textoSeguroConferencia(b.numero)).join(', ')}`
                    : 'Bobina nao encontrada no Stock. Confira o numero ou cadastre antes.'}
            </div>
        ` : '';
        return;
    }

    const inputBobine = document.getElementById('num_bobine');
    if (inputBobine && normalizarStockAtlas(inputBobine.value) !== normalizarStockAtlas(bobina.numero)) {
        inputBobine.value = bobina.numero || inputBobine.value;
    }
    if (ralSelect) ralSelect.value = bobina.ral || '';
    lancamentoAtual.ral = bobina.ral || '';
    lancamentoAtual.medida = bobina.medida || '';
    lancamentoAtual.espessura = bobina.espessura || '';
    lancamentoAtual.fornecedor = bobina.fornecedor || '';

    info.innerHTML = `
        <div style="background:#052e16; color:#bbf7d0; border:1px solid #10b981; border-radius:8px; padding:10px; margin-bottom:12px; font-size:12px;">
            <b>Bobina encontrada no Stock</b><br>
            Fornecedor: ${textoSeguroConferencia(bobina.fornecedor || '-')} |
            Medida: ${textoSeguroConferencia(bobina.medida || '-')} |
            RAL: ${textoSeguroConferencia(bobina.ral || '-')} |
            Esp.: ${textoSeguroConferencia(bobina.espessura || '-')}
        </div>
    `;
}

function adicionarAoLancamento() {
    if(!lancamentoAtual.lado) { alert('Selecione a posição!'); return; }

    if(lancamentoAtual.tipo === 'filme') {
        lancamentoAtual.subtipo = document.getElementById('subtipo_filme')?.value || 'Filme 1060';
    } else {
        lancamentoAtual.numBobine = document.getElementById('num_bobine').value;
        lancamentoAtual.ral = document.getElementById('ral_chapa').value;
        const candidatas = buscarBobinasStockPorNumeroParcial(lancamentoAtual.numBobine);
        const bobinaStock = candidatas.length === 1 ? candidatas[0] : buscarBobinaStockPorNumero(lancamentoAtual.numBobine);
        if (bobinaStock) {
            lancamentoAtual.numBobine = bobinaStock.numero || lancamentoAtual.numBobine;
            lancamentoAtual.ral = bobinaStock.ral || lancamentoAtual.ral;
            lancamentoAtual.medida = bobinaStock.medida || '';
            lancamentoAtual.espessura = bobinaStock.espessura || '';
            lancamentoAtual.fornecedor = bobinaStock.fornecedor || '';
            const ralSelect = document.getElementById('ral_chapa');
            if (ralSelect) ralSelect.value = lancamentoAtual.ral;
        }
        if (!bobinaStock) {
            alert('Bobina nao encontrada no Stock. Cadastre a bobina antes de inserir no relatorio.');
            return;
        }
        if(!lancamentoAtual.numBobine || !lancamentoAtual.ral || !lancamentoAtual.status) {
            alert('Preencha todos os campos!'); return;
        }
    }

    lancamentoAtual.producao = producaoAtiva;
    lancamentosTemporarios.push({...lancamentoAtual});
    
    // Reset
    lancamentoAtual = { tipo: '', lado: '', subtipo: '', qtd: 1, numBobine: '', ral: '', status: '', producao: producaoAtiva };
    renderizarNovoRelatorio();
}

function atualizarLista() {
    const lista = document.getElementById('lista-lancamentos');
    lista.innerHTML = '';
    let ultimaProd = 0;
    
    lancamentosTemporarios.forEach((item, index) => {
        if(item.producao !== ultimaProd) {
            lista.innerHTML += `<div style="color:#E31C24; font-weight:bold; margin: 15px 0 5px 0; font-size:12px; border-bottom:1px solid #334155;">PRODUÇÃO ${item.producao}</div>`;
            ultimaProd = item.producao;
        }

        const corStatus = item.status === 'SIM' ? '#10b981' : (item.status === 'ANDAMENTO' ? '#f59e0b' : '#ef4444');

        lista.innerHTML += `
            <div class="item-lancado">
                <div style="font-size:11px;">
                    <b>${item.tipo.toUpperCase()} ${item.lado.toUpperCase()}</b><br>
                    ${item.tipo === 'filme' ? 'Tipo: '+item.subtipo+' | Qtd: '+item.qtd : 'Bob: '+item.numBobine+' | RAL: '+item.ral + (item.medida ? ' | Medida: '+item.medida : '') + (item.espessura ? ' | Esp.: '+item.espessura : '')}<br>
                    ${item.tipo === 'chapa' ? `<span onclick="alternarStatus(${index})" class="badge-status" style="background:${corStatus}">${item.status}</span>` : ''}
                </div>
                <button onclick="removerLancamento(${index})" style="background:transparent; border:none; color:#ff4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>`;
    });
    document.getElementById('acoes-finais').style.display = 'grid';
}

function alternarStatus(index) {
    const statusCiclo = ['ANDAMENTO', 'SIM', 'NÃO'];
    let atual = lancamentosTemporarios[index].status;
    let novoIndex = (statusCiclo.indexOf(atual) + 1) % statusCiclo.length;
    lancamentosTemporarios[index].status = statusCiclo[novoIndex];
    atualizarLista();
}

function removerLancamento(index) {
    lancamentosTemporarios.splice(index, 1);
    atualizarLista();
}

function encerrarProducao() {
    producaoAtiva++;
    alert("Próxima Produção: " + producaoAtiva);
    atualizarLista();
}

// --- FUNÇÃO PARA SALVAR E GERAR PDF ---
function normalizarStockAtlas(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function filmeStockCombinaLancamento(itemStock, itemLancamento) {
    const tipoStock = normalizarStockAtlas(`${itemStock.tipo || ''} ${itemStock.medida || ''}`);
    const subtipo = normalizarStockAtlas(itemLancamento.subtipo);
    if (!tipoStock || !subtipo) return false;

    if (subtipo.includes('telha')) return tipoStock.includes('telha') || tipoStock.includes('1180');
    if (subtipo.includes('ondulado')) return tipoStock.includes('ondulado') || tipoStock.includes('1055');
    if (subtipo.includes('5 ondas')) return tipoStock.includes('5 ondas') || tipoStock.includes('1175') || tipoStock.includes('1265');
    if (subtipo.includes('fachada')) return tipoStock.includes('fachada') || tipoStock.includes('1010') || tipoStock.includes('1060') || tipoStock.includes('1065') || tipoStock.includes('1163');
    return tipoStock.includes(subtipo);
}

function baixarStockPorLancamentosBobines(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    atlasStockBobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
    atlasStockFilmes = JSON.parse(localStorage.getItem('atlas_stock_filmes')) || [];

    let alterou = false;
    const agora = new Date().toLocaleString('pt-BR');
    const usuario = atlasUsuarioAtualNome();

    itens.forEach(item => {
        if (item.tipo === 'chapa') {
            const numero = normalizarStockAtlas(item.numBobine);
            const ral = normalizarStockAtlas(item.ral);
            const bobina = atlasStockBobinas.find(b => b.status !== 'acabada_mes' && normalizarStockAtlas(b.numero) === numero)
                || atlasStockBobinas.find(b => b.status !== 'acabada_mes' && normalizarStockAtlas(b.ral) === ral);
            if (!bobina) return;

            if (item.status === 'SIM') {
                bobina.qtd = Math.max(0, Number(bobina.qtd || 0) - 1);
                bobina.status = 'acabada_mes';
                bobina.acabadaPor = usuario;
                bobina.acabadaEm = agora;
                bobina.acabadaMesISO = new Date().toISOString().slice(0, 7);
                registrarHistoricoBobinaStock(bobina, `Finalizada no relatorio de Bobines (${item.status})`, usuario, agora);
            } else {
                bobina.qtd = Math.max(1, Number(bobina.qtd || 0));
                bobina.status = 'andamento';
                bobina.origemAndamento = 'relatorio_bobines';
                registrarHistoricoBobinaStock(bobina, `Usada no relatorio de Bobines e nao finalizada (${item.status})`, usuario, agora);
            }
            bobina.ultimaBaixaPor = usuario;
            bobina.ultimaBaixaEm = agora;
            alterou = true;
            return;
        }

        if (item.tipo === 'filme') {
            const filme = atlasStockFilmes.find(f => filmeStockCombinaLancamento(f, item));
            if (!filme) return;

            filme.qtd = Math.max(0, Number(filme.qtd || 0) - Number(item.qtd || 1));
            filme.ultimaBaixaPor = usuario;
            filme.ultimaBaixaEm = agora;
            registrarHistoricoFilmeStock(filme, `Baixa pelo relatorio de Bobines: ${Number(item.qtd || 1)} un.`, usuario, agora);
            alterou = true;
        }
    });

    if (alterou) salvarStockAtlas();
}

function fecharDia() {
    const pendente = lancamentosTemporarios.find(i => i.tipo === 'chapa' && i.status === 'ANDAMENTO');
    if(pendente) { alert("Erro: Existe uma bobina em ANDAMENTO."); return; }
    if(lancamentosTemporarios.length === 0) { alert("Erro: Sem dados para fechar o dia."); return; }

    // PEGA A DATA DO INPUT
    const dataInput = document.getElementById('data-retroativa').value;
    let dataRef = new Date();

    if(dataInput) {
        const partes = dataInput.split('-');
        dataRef = new Date(partes[0], partes[1] - 1, partes[2]);
    }

    // --- CORREÇÃO AQUI: BUSCA O NOME DA TELA OU DA VARIÁVEL ---
    const elementoNome = document.getElementById('user-display');
    const operadorSistema = elementoNome ? elementoNome.innerText : (window.usuarioLogado || "OPERADOR");

    const relFinal = {
        id: Date.now(),
        data: dataRef.toLocaleDateString('pt-BR'),
        ano: dataRef.getFullYear(),
        mes: dataRef.getMonth() + 1,
        dia: dataRef.getDate(),
        hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        operador: operadorSistema.toUpperCase().replace("OPERADOR: ", ""), // Limpa o prefixo se existir
        itens: [...lancamentosTemporarios]
    };

    // Salva no histórico
    baixarStockPorLancamentosBobines(relFinal.itens);
    historicoBobines.unshift(relFinal);
    localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));

    // Gera PDF
    gerarPDF_Bobines(encodeURIComponent(JSON.stringify(relFinal)));

    // Limpa tudo
    lancamentosTemporarios = [];
    producaoAtiva = 1;
    renderizarMenuBobines();
    alert("Relatório fechado com sucesso!");
}
//FUNÇÃO PARA RENDERIZAR O HISTÓRICO NA TELA ---
function renderizarHistoricoBobines() {
    const container = document.getElementById('render-modulo');
    
    // Simulação de estrutura organizada (Ano > Mês > Registros)
    // No seu sistema real, essa estrutura vem do seu Banco de Dados/Firebase
    let htmlHistorico = `
        <div style="padding: 20px; color: white;">
            <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 18px;">
                <span style="color: #E31C24;">📁</span> HISTÓRICO DE BOBINES
            </h3>
    `;

    // --- PASTA ANO (Exemplo: 2026) ---
    htmlHistorico += `
        <div class="pasta-ano" style="margin-bottom: 10px;">
            <div style="background: #1e293b; padding: 10px; cursor: pointer; border-radius: 4px; font-weight: bold; display: flex; align-items: center; gap: 10px;" 
                 onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                <span>📁</span> ANO 2026
            </div>
            
            <div class="meses-container" style="display: none; padding-left: 20px; margin-top: 5px;">
                
                <div class="pasta-mes">
                    <div style="background: #334155; padding: 8px; cursor: pointer; border-radius: 4px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px; margin-bottom: 2px;"
                         onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                        <span>📅</span> ABRIL
                    </div>

                    <div class="dias-container" style="display: none; background: rgba(15, 23, 42, 0.5); border-radius: 0 0 4px 4px;">
    `;

    // AQUI entram os registros do dia com o visual novo (AMARELO da sua marcação)
    historicoBobines.forEach(rel => {
        htmlHistorico += `
    <div style="
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        padding: 12px 15px; 
        background: #1e293b; 
        border: 1px solid rgba(255, 255, 255, 0.05); 
        border-radius: 8px; 
        margin-bottom: 8px;
        -webkit-print-color-adjust: exact;
    ">
        
        <div>
            <div style="font-weight: bold; font-size: 14px; color: #fff;">
                ${rel.data}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px; text-transform: uppercase;">
                Op: ${rel.operador}
            </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
            <button onclick="gerarPDF_Bobines('${encodeURIComponent(JSON.stringify(rel))}')" 
                style="
                    background: #10b981; 
                    color: white; 
                    border: none; 
                    padding: 8px 15px; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    font-size: 11px; 
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                <span style="font-size: 14px;">📄</span> PDF
            </button>
        </div>
    </div>
`;
    });

    // Fechamento das tags
    htmlHistorico += `
                    </div> </div> </div> </div> </div>`;

    container.innerHTML = htmlHistorico;
}
// Função genérica para abrir/fechar as pastas
function toggleElemento(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    }
}
function agruparPorRal(itens) {
    let grupos = {};

    itens.forEach(item => {
        if(item.tipo !== 'chapa') return;

        if(!grupos[item.ral]) {
            grupos[item.ral] = { superior: [], inferior: [] };
        }

        grupos[item.ral][item.lado].push(item);
    });

    return grupos;
}

function calcularTotais(itens) {
    let totalFilmeSup = 0;
    let totalFilmeInf = 0;
    let totalBobSup = 0;
    let totalBobInf = 0;

    itens.forEach(i => {
        if(i.tipo === 'filme') {
            if(i.lado === 'superior') totalFilmeSup += i.qtd;
            else totalFilmeInf += i.qtd;
        }

        if(i.tipo === 'chapa') {
            if(i.lado === 'superior') totalBobSup++;
            else totalBobInf++;
        }
    });

    return { totalFilmeSup, totalFilmeInf, totalBobSup, totalBobInf };
}
function deletarHistoricoBobine(index) {
    if (!usuarioPodeExcluirModulo('bobines')) return alert('Sem permissao para excluir em Bobines.');
    if(confirm("Excluir este relatório permanentemente?")) {
        historicoBobines.splice(index, 1);
        localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));
        renderizarHistoricoBobines();
    }
}

// Mantenha suas funções de renderizarNovoRelatorio, atualizarLista, adicionarAoLancamento e as calculadoras EXATAMENTE como você já tem.
// Apenas certifique-se de que a função fecharDia e a gerarPDF_Bobines estejam como abaixo:

function gerarPDF_Bobines(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');

    let conteudoGeral = "";
    
    // Agrupamento por produção
    const producoes = {};
    rel.itens.forEach(item => {
        if (!producoes[item.producao]) producoes[item.producao] = [];
        producoes[item.producao].push(item);
    });

    // Gera o conteúdo para cada produção
    Object.keys(producoes).sort((a,b) => a-b).forEach(numProd => {
        let itensFilme = producoes[numProd].filter(i => i.tipo === 'filme');
        let itensChapa = producoes[numProd].filter(i => i.tipo === 'chapa');

        // Cálculo das somas de filmes (Superior e Inferior)
        const somaSuperior = itensFilme
            .filter(f => f.lado.toLowerCase() === 'superior')
            .reduce((acc, curr) => acc + Number(curr.qtd), 0);
            
        const somaInferior = itensFilme
            .filter(f => f.lado.toLowerCase() === 'inferior')
            .reduce((acc, curr) => acc + Number(curr.qtd), 0);

        conteudoGeral += `
            <div style="margin-bottom: 30px; border: 2px solid #000; padding: 10px; border-radius: 5px; -webkit-print-color-adjust: exact;">
                <div style="background: #000; color: #fff; padding: 8px; text-align: center; font-weight: bold; margin-bottom: 15px; -webkit-print-color-adjust: exact;">
                    PRODUÇÃO ${numProd}
                </div>`;

        // Tabela de Filmes
        if (itensFilme.length > 0) {
            conteudoGeral += `
                <div style="text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 5px;">▶ LANÇAMENTO DE FILMES</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
                    <thead>
                        <tr style="background: #e2e8f0; -webkit-print-color-adjust: exact;">
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">POSIÇÃO</th>
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">TIPO DE FILME</th>
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">QUANTIDADE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensFilme.map(f => `
                            <tr style="font-weight: bold;">
                                <td style="border: 2px solid #000; padding: 6px; text-align: center;">${f.lado.toUpperCase()}</td>
                                <td style="border: 2px solid #000; padding: 6px; text-align: center;">${f.subtipo}</td>
                                <td style="border: 2px solid #000; padding: 6px; text-align: center; font-size: 14px;">${f.qtd}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="display: flex; justify-content: space-around; background: #000; color: #fff; padding: 5px; margin-bottom: 20px; border: 2px solid #000; -webkit-print-color-adjust: exact;">
                    <span style="font-size: 11px; font-weight: bold;">TOTAL SUPERIOR: <span style="font-size: 14px;">${somaSuperior}</span></span>
                    <span style="font-size: 11px; font-weight: bold;">TOTAL INFERIOR: <span style="font-size: 14px;">${somaInferior}</span></span>
                </div>`;
        }

        // Tabela de Bobinas (Chapa)
        if (itensChapa.length > 0) {
            conteudoGeral += `
                <div style="text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 5px;">▶ LANÇAMENTO DE BOBINAS (CHAPA)</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                    <thead>
                        <tr style="background: #e2e8f0; -webkit-print-color-adjust: exact;">
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">POSIÇÃO</th>
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">Nº BOBINA</th>
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">RAL</th>
                            <th style="border: 2px solid #000; padding: 6px; font-size: 11px;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensChapa.map(c => `
                            <tr style="font-weight: bold;">
                                <td style="border: 2px solid #000; padding: 6px; text-align: center;">${c.lado.toUpperCase()}</td>
                                <td style="border: 2px solid #000; padding: 6px; text-align: center;">${c.numBobine}</td>
                                <td style="border: 2px solid #000; padding: 6px; text-align: center;">${c.ral}</td>
                                <td style="border: 2px solid #000; padding: 6px; text-align: center; color: ${c.status === 'SIM' ? '#059669' : '#dc2626'};">${c.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        }
        conteudoGeral += `</div>`;
    });    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                .header-black {
                    background: #000; color: #fff; padding: 15px;
                    display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 5px solid #E31C24; -webkit-print-color-adjust: exact;
                }
                .main-content { padding: 20px; }
                .resumo-final {
                    background: #000; color: #fff; padding: 15px; margin-top: 20px;
                    text-align: center; border-radius: 5px; -webkit-print-color-adjust: exact;
                }
                .assinatura-area { margin-top: 50px; text-align: center; }
                .linha { border-top: 2px solid #000; width: 60%; margin: 0 auto 5px auto; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header-black">
                <div>
                    <b style="font-size: 22px;">ATLAS PAINEL</b><br>
                    <span style="font-size: 11px; text-transform: uppercase;">Relatório de Bobines / Filme</span>
                </div>
                <div style="text-align: right; font-size: 12px; font-weight: bold;">
                    DATA: ${rel.data}<br>
                    OPERADOR: ${rel.operador.toUpperCase()}
                </div>
            </div>

            <div class="main-content">
                ${conteudoGeral}

                <div class="resumo-final">
                    <b style="font-size: 16px;">TOTAL GERAL DE PRODUÇÕES: ${Object.keys(producoes).length}</b>
                </div>

                <div class="assinatura-area">
                    <div class="linha"></div>
                    <b style="font-size: 13px;">${rel.operador.toUpperCase()}</b><br>
                    <span style="font-size: 11px;">Responsável pela Produção</span>
                </div>

                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <div class="no-print" style="text-align: center;">
                    <button onclick="window.print()" style="padding: 20px; background: #000; color: #fff; border: 3px solid #E31C24; width: 100%; font-size: 18px; font-weight: bold; border-radius: 10px;">
                        🖨️ CONFIRMAR E GERAR PDF
                    </button>
                </div>
                </div>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
}

gerarPDF_Bobines = function(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    const itens = Array.isArray(rel.itens) ? rel.itens : [];
    const chapas = itens.filter(i => i.tipo === 'chapa');
    const filmes = itens.filter(i => i.tipo === 'filme');
    const porLado = lado => chapas.filter(i => normalizarStockAtlas(i.lado) === lado)
        .sort((a, b) => String(a.ral || '').localeCompare(String(b.ral || '')) || String(a.numBobine || '').localeCompare(String(b.numBobine || '')));
    const filmesPorLado = lado => filmes.filter(i => normalizarStockAtlas(i.lado) === lado);
    const totalFilme = (tipo, lado) => filmesPorLado(lado).filter(f => normalizarStockAtlas(f.subtipo) === normalizarStockAtlas(tipo)).reduce((s, f) => s + Number(f.qtd || 0), 0);
    const linhasVazias = qtd => Array.from({ length: qtd }).map(() => '<tr><td>&nbsp;</td><td></td></tr>').join('');
    const renderBobine = (titulo, medida, lista) => {
        const maxLinhas = 8;
        const linhas = lista.slice(0, maxLinhas).map(i => `<tr><td>${textoSeguroConferencia(i.numBobine || '-')} ${i.ral ? ' / RAL ' + textoSeguroConferencia(i.ral) : ''}${i.espessura ? ' / ' + textoSeguroConferencia(i.espessura) : ''}</td><td>${i.status === 'SIM' ? 'SIM' : (i.status || '-')}</td></tr>`).join('');
        return `
            <table class="box-tabela">
                <tr><th colspan="2">${titulo}</th></tr>
                <tr><th colspan="2">Registo Bobine ${medida}</th></tr>
                <tr><th>Lote</th><th>Terminada</th></tr>
                ${linhas}${linhasVazias(Math.max(0, maxLinhas - lista.slice(0, maxLinhas).length))}
            </table>
        `;
    };
    const tiposFilmePdf = ['Telha (1180mm)', 'Ondulado (1055mm)', '5 Ondas (1175mm)', 'Fachada (1010)'];
    const renderFilmes = lado => {
        const tipos = lado === 'superior' ? ['Fachada (1010)'] : tiposFilmePdf;
        return `
        <table class="filme-tabela">
            <tr><th>Registo Filme</th><th>Quantidade</th></tr>
            ${tipos.map(tipo => `<tr><td>${tipo}</td><td>${totalFilme(tipo, lado) || ''}</td></tr>`).join('')}
        </table>
    `;
    };
    const totaisSerraPorRal = (() => {
        const historicoSerra = JSON.parse(localStorage.getItem('atlas_serra_hist')) || [];
        const superior = {};
        const inferior = {};
        historicoSerra.filter(r => r.data === rel.data).forEach(r => {
            (r.itens || []).forEach(i => {
                const total = Number(i.qtd || 0) * Number(i.metros || 0);
                if (i.ralS) superior[i.ralS] = (superior[i.ralS] || 0) + total;
                if (i.ralI) inferior[i.ralI] = (inferior[i.ralI] || 0) + total;
            });
        });
        return {
            superior: Object.entries(superior).sort((a, b) => a[1] - b[1]),
            inferior: Object.entries(inferior).sort((a, b) => a[1] - b[1])
        };
    })();
    const linhasUnioes = lista => lista.map(([ral, metros]) => `<tr><td>RAL ${textoSeguroConferencia(ral)}</td><td>${Number(metros || 0).toFixed(2)} m</td></tr>`).join('');
    const linhasUnioesSuperior = linhasUnioes(totaisSerraPorRal.superior);
    const linhasUnioesInferior = linhasUnioes(totaisSerraPorRal.inferior);

    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Gestao de Producao Diaria - Bobines / Filmes</title>
            <style>
                @page { size:A4; margin:5mm; }
                * { box-sizing:border-box; }
                body { font-family:Arial, sans-serif; color:#111; margin:0; background:#fff; }
                .folha { width:200mm; min-height:287mm; margin:auto; padding:11mm 8mm 7mm; page-break-after:avoid; page-break-inside:avoid; display:flex; flex-direction:column; }
                .topo { display:flex; align-items:center; gap:22mm; margin-bottom:14mm; }
                .logo-css { display:flex; align-items:center; gap:9px; }
                .logo-barras { display:grid; gap:5px; }
                .logo-barras span { display:block; width:38px; height:10px; background:#e31c24; transform:skew(-18deg); }
                .logo-texto { font-weight:900; font-size:39px; line-height:.78; letter-spacing:-1px; }
                .logo-painel { font-size:10px; letter-spacing:11px; margin-left:56px; margin-top:5px; display:block; }
                h1 { font-size:20px; margin:0; flex:1; text-align:center; }
                .linha-info { display:grid; grid-template-columns:1fr 1.2fr; gap:23mm; margin-bottom:7mm; font-size:12px; }
                .campo-linha { border-bottom:2px solid #111; min-height:17px; display:inline-block; min-width:42mm; padding-left:5px; font-weight:bold; }
                .quadros { display:grid; grid-template-columns:1fr 1fr; gap:8mm; align-items:start; margin-top:5mm; }
                table { border-collapse:collapse; width:100%; }
                th, td { border:2px solid #111; padding:3px 6px; text-align:center; font-size:12px; height:23px; }
                th { font-weight:800; background:#f4f4f4; }
                .box-tabela th:first-child { font-size:15px; }
                .box-tabela tr:nth-child(2) th { font-size:14px; }
                .filme-tabela { margin-top:7mm; }
                .unioes-wrap { display:grid; grid-template-columns:1fr 1fr; gap:9mm; margin:13mm auto 0; width:145mm; }
                .unioes th { font-size:15px; }
                .unioes .subtitulo { font-size:11px; line-height:1.15; }
                .rodape { display:flex; justify-content:flex-end; margin-top:auto; padding-top:15mm; font-size:13px; }
                .assinatura { display:inline-block; width:66mm; border-bottom:2px solid #111; height:17px; }
                .no-print { position:fixed; z-index:9999; }
                .print-topo { top:12px; right:12px; display:flex; gap:8px; }
                .print-topo button { padding:12px 18px; border:0; border-radius:8px; color:#fff; font-weight:900; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25); }
                .btn-imprimir { background:#111827; border:3px solid #e31c24 !important; }
                .btn-fechar { background:#e31c24; }
                @media print { html, body { width:210mm; min-height:297mm; } .no-print { display:none !important; } .folha { margin:0 auto; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
            </style>
        </head>
        <body>
            <div class="folha">
                <div class="topo">
                    <div>
                        <div class="logo-css"><div class="logo-barras"><span></span><span></span></div><div class="logo-texto">ATLAS</div></div>
                        <span class="logo-painel">PAINEL</span>
                    </div>
                    <h1>Gestao de Producao Diaria - Bobines / Filmes</h1>
                </div>
                <div class="linha-info">
                    <div>Data: <span class="campo-linha">${textoSeguroConferencia(rel.data || '')}</span></div>
                    <div>Nome: <span class="campo-linha">${textoSeguroConferencia(rel.operador || '')}</span></div>
                </div>
                <div class="quadros">
                    <div>${renderBobine('Registo Perfiladora Superior', '1060mm', porLado('superior'))}${renderFilmes('superior')}</div>
                    <div>${renderBobine('Registo Perfiladora Inferior', '1250mm', porLado('inferior'))}${renderFilmes('inferior')}</div>
                </div>
                <div class="unioes-wrap">
                    <table class="unioes">
                        <tr><th colspan="2">Unioes Superior</th></tr>
                        <tr><th class="subtitulo">RAL usado na serra</th><th>Metros</th></tr>
                        ${linhasUnioesSuperior || linhasVazias(1)}
                        ${linhasVazias(Math.max(0, 4 - totaisSerraPorRal.superior.length))}
                    </table>
                    <table class="unioes">
                        <tr><th colspan="2">Unioes Inferior</th></tr>
                        <tr><th class="subtitulo">RAL usado na serra</th><th>Metros</th></tr>
                        ${linhasUnioesInferior || linhasVazias(1)}
                        ${linhasVazias(Math.max(0, 4 - totaisSerraPorRal.inferior.length))}
                    </table>
                </div>
                <div class="rodape"><div>Ass: <span class="assinatura"></span></div></div>
                <div class="no-print print-topo">
                    <button class="btn-imprimir" onclick="window.print()">IMPRIMIR / PDF</button>
                    <button class="btn-fechar" onclick="try { localStorage.setItem('atlas_pdf_retorno_historico', JSON.stringify({modulo:'bobines',historico:true,em:Date.now()})); if (window.opener && !window.opener.closed && window.opener.atlasVoltarDoPDFParaTelaAnterior) { window.opener.atlasVoltarDoPDFParaTelaAnterior({modulo:'bobines',historico:true}); window.opener.focus(); setTimeout(function(){ try { window.close(); } catch(e) {} }, 120); } this.textContent='VOLTANDO...'; this.style.background='#10b981'; } catch(e) {}">FECHAR</button>
                </div>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
};

function renderizarCalculadoraBobina() {
    const render = document.getElementById('render-modulo');
    
    // HTML da Calculadora adaptado ao seu tema escuro
    render.innerHTML = `
        <div style="padding: 15px; color: white;">
            <div style="background: #1e293b; padding: 20px; border-radius: 15px; border: 1px solid #334155;">
                
                <label style="display:block; margin-bottom:10px; font-weight:bold; color:#94a3b8;">LARGURA DA ABA (cm)</label>
                <select id="calc_largura" onchange="calcularLogicaBobina()" style="width:100%; padding:15px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:18px; margin-bottom:20px;">
                    </select>

                <label style="display:block; margin-bottom:10px; font-weight:bold; color:#94a3b8;">ESPESSURA (mm)</label>
                <div id="calc_espessuras" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:20px;">
                    </div>

                <label style="display:block; margin-bottom:10px; font-weight:bold; color:#94a3b8;">VELOCIDADE (m/min)</label>
                <div id="calc_velocidades" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:20px;">
                    </div>

                <div style="background:#0f172a; padding:15px; border-radius:10px; border-left:5px solid #E31C24;">
                    <div id="res_metros" style="font-size:18px; margin-bottom:5px;">Metros: <b>0</b></div>
                    <div id="res_tempo" style="font-size:18px; margin-bottom:5px;">Tempo: <b>0</b></div>
                    <div id="res_hora" style="font-size:18px; color:#E31C24; font-weight:bold;">Finaliza às: <b>--:--</b></div>
                </div>
            </div>
        </div>
    `;
   
//a soma da calculadora

    // 1. Popular Larguras (1 a 50cm)
    const selLargura = document.getElementById("calc_largura");
    for(let i=1; i<=50; i+=0.5){
        let o = document.createElement("option");
        o.value = i;
        o.text = (i % 1 === 0) ? i + " cm" : i.toFixed(1) + " cm";
        if(i === 20) o.selected = true; // Valor padrão
        selLargura.appendChild(o);
    }

    // 2. Popular Espessuras
    let espSel = 0.32;
    const espessuras = [0.28, 0.30, 0.32, 0.35, 0.38, 0.40, 0.43, 0.45, 0.68];
    const divEsp = document.getElementById("calc_espessuras");
    
    espessuras.forEach(e => {
        let b = document.createElement("button");
        b.innerText = e;
        b.style = "padding:12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-weight:bold; cursor:pointer;";
        if(e === espSel) b.style.borderColor = "#E31C24";

        b.onclick = () => {
            espSel = e;
            Array.from(divEsp.children).forEach(btn => btn.style.borderColor = "#334155");
            b.style.borderColor = "#E31C24";
            calcularLogicaBobina(parseFloat(selLargura.value), espSel, velSel);
        };
        divEsp.appendChild(b);
    });

    // 3. Popular Velocidades
    let velSel = 10;
    const velocidades = [5, 6, 7, 8, 9, 10, 11, 12];
    const divVel = document.getElementById("calc_velocidades");

    velocidades.forEach(v => {
        let b = document.createElement("button");
        b.innerText = v;
        b.style = "padding:12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-weight:bold; cursor:pointer;";
        if(v === velSel) b.style.borderColor = "#E31C24";

        b.onclick = () => {
            velSel = v;
            Array.from(divVel.children).forEach(btn => btn.style.borderColor = "#334155");
            b.style.borderColor = "#E31C24";
            calcularLogicaBobina(parseFloat(selLargura.value), espSel, velSel);
        };
        divVel.appendChild(b);
    });

    // 4. Lógica de Cálculo (Sua fórmula antiga)
    window.calcularLogicaBobina = function() {
        const L = parseFloat(document.getElementById("calc_largura").value);
        const interno = 500;
        const pi = 3.14;
        
        const largura_mm = L * 10;
        const p1 = largura_mm / espSel;
        const p2 = p1 * pi;
        const soma = interno + largura_mm;
        
        const metros = Math.round((p2 * soma) / 1000);
        const tempoTotalMin = Math.round(metros / velSel);
        
        const fim = new Date();
        fim.setMinutes(fim.getMinutes() + tempoTotalMin);
        
        const horas = Math.floor(tempoTotalMin / 60);
        const minutos = tempoTotalMin % 60;
        let textoTempo = (horas > 0) ? `${horas}h ${minutos}min` : `${minutos} min`;

        document.getElementById("res_metros").innerHTML = `Metros: <b>${metros} m</b>`;
        document.getElementById("res_tempo").innerHTML = `Tempo: <b>${textoTempo}</b>`;
        document.getElementById("res_hora").innerHTML = `Finaliza às: <b>${fim.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b>`;
    };

    // Rodar cálculo inicial
    calcularLogicaBobina();
}
function renderizarCalculadoraAgro() {
    const render = document.getElementById('render-modulo');
    
    render.innerHTML = `
        <div style="padding: 15px; color: white;">
            <div style="background: #1e293b; padding: 20px; border-radius: 15px; border: 1px solid #334155;">
                <h3 style="color:#E31C24; margin-top:0; text-align:center;">CALCULADORA AGROPAINEL</h3>
                <p style="text-align:center; font-size:12px; color:#94a3b8;">Espessura Fixa: 0.60mm | Interno: 200</p>

                <label style="display:block; margin-bottom:10px; font-weight:bold; color:#94a3b8;">LARGURA DA ABA (cm)</label>
                <select id="agro_largura" onchange="calcularLogicaAgro()" style="width:100%; padding:15px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:18px; margin-bottom:20px;">
                </select>

                <label style="display:block; margin-bottom:10px; font-weight:bold; color:#94a3b8;">VELOCIDADE (m/min)</label>
                <div id="agro_velocidades" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:20px;">
                </div>

                <div style="background:#0f172a; padding:15px; border-radius:10px; border-left:5px solid #E31C24;">
                    <div id="agro_res_metros" style="font-size:18px; margin-bottom:5px;">Metros: <b>0</b></div>
                    <div id="agro_res_tempo" style="font-size:18px; margin-bottom:5px;">Tempo: <b>0</b></div>
                    <div id="agro_res_hora" style="font-size:18px; color:#E31C24; font-weight:bold;">Finaliza às: <b>--:--</b></div>
                </div>
            </div>
        </div>
    `;

    // 1. Popular Larguras (1 a 50cm)
    const selLargura = document.getElementById("agro_largura");
    for(let i=1; i<=50; i+=0.5){
        let o = document.createElement("option");
        o.value = i;
        o.text = (i % 1 === 0) ? i + " cm" : i.toFixed(1) + " cm";
        if(i === 15) o.selected = true; 
        selLargura.appendChild(o);
    }

    // 2. Popular Velocidades
    let velSelAgro = 10;
    const velocidades = [5, 6, 7, 8, 9, 10, 11, 12];
    const divVel = document.getElementById("agro_velocidades");

    velocidades.forEach(v => {
        let b = document.createElement("button");
        b.innerText = v;
        b.style = "padding:12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:white; font-weight:bold; cursor:pointer;";
        if(v === velSelAgro) b.style.borderColor = "#E31C24";

        b.onclick = () => {
            velSelAgro = v;
            Array.from(divVel.children).forEach(btn => btn.style.borderColor = "#334155");
            b.style.borderColor = "#E31C24";
            calcularLogicaAgro();
        };
        divVel.appendChild(b);
    });

    // 3. Lógica Específica Agropainel
    window.calcularLogicaAgro = function() {
        const L = parseFloat(document.getElementById("agro_largura").value);
        const espAgro = 0.60; // Fixo conforme pedido
        const internoAgro = 200; // Fixo conforme pedido
        const pi = 3.14;
        
        const largura_mm = L * 10;
        const p1 = largura_mm / espAgro;
        const p2 = p1 * pi;
        const soma = internoAgro + largura_mm;
        
        const metros = Math.round((p2 * soma) / 1000);
        const tempoTotalMin = Math.round(metros / velSelAgro);
        
        const fim = new Date();
        fim.setMinutes(fim.getMinutes() + tempoTotalMin);
        
        const horas = Math.floor(tempoTotalMin / 60);
        const minutos = tempoTotalMin % 60;
        let textoTempo = (horas > 0) ? `${horas}h ${minutos}min` : `${minutos} min`;

        document.getElementById("agro_res_metros").innerHTML = `Metros: <b>${metros} m</b>`;
        document.getElementById("agro_res_tempo").innerHTML = `Tempo: <b>${textoTempo}</b>`;
        document.getElementById("agro_res_hora").innerHTML = `Finaliza às: <b>${fim.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b>`;
    };

    calcularLogicaAgro();
}
//aqui termina as bobines

/* ==========================================================================
   MÓDULO: SERRA
   ========================================================================== */

// --- VARIÁVEIS DE CONTROLE ---
// --- BANCO DE DADOS ---
let db_serra_live = atlasArrayLocal('atlas_serra_live');
let db_serra_hist = atlasArrayLocal('atlas_serra_hist');

// --- 1. MENU PRINCIPAL ---
function renderizarMenuSerra() {
    const render = document.getElementById('render-modulo');
    render.innerHTML = `
        <div id="menu-inicial-serra" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:15px; padding:15px;">
            <div class="card" onclick="exibirSetupSerra()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-plus" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Novo Relatório</span>
            </div>
            <div class="card" onclick="listarHistoricoSerra()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-history" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Histórico Serra</span>
            </div>
            <div class="card" onclick="abrirPacotesSerraPlano()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-box-open" style="color:#10b981; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Pacotes do Plano</span>
                <small style="color:#94a3b8;">Montar por encomenda</small>
            </div>
        </div>
        <div id="container-acao-serra" style="display:none; padding:15px;"></div>
    `;
}

// --- 2. GERENCIAMENTO DE INTERFACE ---
function alternarAbaSerra(mostrarAcao) {
    const menu = document.getElementById('menu-inicial-serra');
    const acao = document.getElementById('container-acao-serra');

    if (mostrarAcao) {
        if (menu) menu.style.display = 'none';
        if (acao) acao.style.display = 'block';
    } else {
        if (menu) menu.style.display = 'grid';
        if (acao) {
            acao.style.display = 'none';
            acao.innerHTML = '';
        }
    }
}

// --- 3. CONFIGURAÇÃO INICIAL ---
function obterLimitePacoteSerra(tipo, espessura) {
    const regra = (OPCOES_PACOTES_SERRA || []).find(r =>
        normalizarStockAtlas(r.tipo) === normalizarStockAtlas(tipo) &&
        String(r.espessura) === String(espessura)
    );
    return Math.max(1, Number(regra?.maximo || 16));
}

function obterItensPlanoParaPacotesSerra(numeroPedido) {
    const numero = String(numeroPedido || '').trim();
    const fontes = [];
    if (db_plano_live) {
        fontes.push({ origem: 'Plano em andamento', data: formatarDataPlanoBR(db_plano_live.dataISO), itens: [
            ...(db_plano_live.linhasAbertas || []),
            ...((db_plano_live.gruposFinalizados || []).flatMap(g => g.itens || []))
        ] });
    }
    (JSON.parse(localStorage.getItem('atlas_plano_hist')) || []).forEach(rel => {
        fontes.push({ origem: 'Historico do plano', data: rel.data || '', itens: rel.itens || [] });
    });
    return fontes.flatMap(fonte => (fonte.itens || [])
        .filter(item => item.modo === 'pedido' && String(item.pedidoNumero || '').trim() === numero)
        .map(item => ({ ...item, origemPlano: fonte.origem, dataPlano: fonte.data })));
}

function montarPacotesSerraPorPedido(itensPlano) {
    const grupos = {};
    itensPlano.forEach(item => {
        const chave = `${item.tipo || ''}|||${item.espessura || ''}|||${item.ralInferior || ''}|||${item.ralSuperior || ''}`;
        grupos[chave] ||= { tipo: item.tipo || '', espessura: item.espessura || '', ralInferior: item.ralInferior || '', ralSuperior: item.ralSuperior || '', unidades: [] };
        const qtd = Math.max(0, Number(item.quantidadeChapas || 0));
        for (let i = 0; i < qtd; i++) grupos[chave].unidades.push({ metros: Number(item.metrosUnidade || 0), destino: item.destino || '' });
    });
    return Object.values(grupos).map(grupo => {
        grupo.unidades.sort((a, b) => Number(b.metros || 0) - Number(a.metros || 0));
        const limite = obterLimitePacoteSerra(grupo.tipo, grupo.espessura);
        const pacotes = [];
        const porMedida = {};
        grupo.unidades.forEach(unidade => {
            const chaveMedida = Number(unidade.metros || 0).toFixed(2);
            porMedida[chaveMedida] ||= [];
            porMedida[chaveMedida].push(unidade);
        });

        const sobras = [];
        Object.keys(porMedida).sort((a, b) => Number(b) - Number(a)).forEach(medida => {
            const unidadesDaMedida = porMedida[medida];
            while (unidadesDaMedida.length >= limite) {
                pacotes.push(unidadesDaMedida.splice(0, limite));
            }
            sobras.push(...unidadesDaMedida);
        });

        sobras.sort((a, b) => Number(b.metros || 0) - Number(a.metros || 0));
        for (let i = 0; i < sobras.length; i += limite) pacotes.push(sobras.slice(i, i + limite));
        return { ...grupo, limite, pacotes };
    });
}

function abrirPacotesSerraPlano() {
    alternarAbaSerra(true);
    const c = document.getElementById('container-acao-serra');
    if (!c) return;
    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <button onclick="alternarAbaSerra(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
            <h3 style="color:#10b981; font-size:14px; margin:0; text-transform:uppercase;">Pacotes por encomenda</h3>
        </div>
        <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px;">
            <input id="serra-pacote-pedido" inputmode="numeric" placeholder="Numero da encomenda" style="width:100%; padding:14px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:18px; margin-bottom:10px;">
            <button onclick="buscarPacotesSerraPlano()" style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">MONTAR PACOTES</button>
        </div>
        <div id="resultado-pacotes-serra" style="margin-top:15px;"></div>
    `;
}

function buscarPacotesSerraPlano() {
    const numero = document.getElementById('serra-pacote-pedido')?.value.trim();
    const destino = document.getElementById('resultado-pacotes-serra');
    if (!numero) return alert('Informe o numero da encomenda.');
    if (!destino) return;
    const itens = obterItensPlanoParaPacotesSerra(numero);
    if (!itens.length) {
        destino.innerHTML = `<div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:15px; color:#fbbf24;">Encomenda ${textoSeguroConferencia(numero)} nao encontrada no plano.</div>`;
        return;
    }
    const grupos = montarPacotesSerraPorPedido(itens);
    const totalUnidades = grupos.reduce((acc, g) => acc + g.unidades.length, 0);
    destino.innerHTML = `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:12px; color:white;">
            <b>Encomenda ${textoSeguroConferencia(numero)}</b><br>
            <small style="color:#94a3b8;">${totalUnidades} chapa(s), do maior metro para o menor.</small>
        </div>
        ${grupos.map(grupo => `
            <div style="background:#111827; border:1px solid #334155; border-radius:12px; margin-bottom:14px; overflow:hidden;">
                <div style="background:#0f172a; padding:12px; color:white; font-weight:bold;">
                    ${textoSeguroConferencia(grupo.tipo)} ${textoSeguroConferencia(grupo.espessura)} mm
                    <span style="color:#94a3b8;"> | INF ${textoSeguroConferencia(grupo.ralInferior)} / SUP ${textoSeguroConferencia(grupo.ralSuperior)} | Max. ${grupo.limite} un.</span>
                </div>
                ${grupo.pacotes.map((pacote, idx) => {
                    const resumo = pacote.reduce((acc, unidade) => {
                        const chave = Number(unidade.metros || 0).toFixed(2);
                        acc[chave] = (acc[chave] || 0) + 1;
                        return acc;
                    }, {});
                    return `<div style="padding:12px; border-top:1px solid #334155; color:white;">
                        <b style="color:#10b981;">Pacote ${idx + 1}: ${pacote.length} un.</b>
                        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;">
                            ${Object.keys(resumo).sort((a, b) => Number(b) - Number(a)).map(metros => `<span style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:8px 10px;">${resumo[metros]}x ${metros} m</span>`).join('')}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `).join('')}
    `;
}

function exibirSetupSerra() {
    alternarAbaSerra(true);

    const container = document.getElementById('container-acao-serra');
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <button onclick="alternarAbaSerra(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">Configurar Produção</h3>
        </div>

        <div style="margin-bottom:15px; padding:10px; background:#1e293b; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid #334155;">
            <label style="color:#94a3b8; font-weight:bold; font-size:12px;">DATA DO RELATÓRIO:</label>
            <input type="date" id="data-manual-serra" style="background:#0f172a; color:white; border:1px solid #3b82f6; padding:5px; border-radius:4px; font-weight:bold; outline:none; cursor:pointer;">
        </div>

        <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #334155;">
            <label style="color:#94a3b8; font-size:11px;">TIPO DE PAINEL</label>
            <select id="s-tipo-serra" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:15px; font-weight:bold;">
                ${opcoesTipoPainelHTML()}
            </select>

            <label style="color:#94a3b8; font-size:11px;">ESPESSURA (mm)</label>
            <select id="s-esp-serra" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:20px; font-weight:bold;">
                ${[30, 40, 50, 60, 80, 100, 120].map(e => `<option value="${e}">${e} mm</option>`).join('')}
            </select>

            <button onclick="iniciarInterfaceCorteSerra()" style="width:100%; background:white; color:black; font-weight:800; border:none; padding:15px; border-radius:6px; cursor:pointer; text-transform:uppercase;">
                Abrir Lançamento
            </button>
        </div>
    `;

    const inputData = document.getElementById('data-manual-serra');
    if (inputData) inputData.valueAsDate = new Date();
}

// --- 4. INTERFACE DE LANÇAMENTO ---
function iniciarInterfaceCorteSerra() {
    alternarAbaSerra(true);

    const tipo = document.getElementById('s-tipo-serra')?.value || "5 Ondas";
    const esp = document.getElementById('s-esp-serra')?.value || "30";
    const dataEscolhida = document.getElementById('data-manual-serra')?.value || "";

    const container = document.getElementById('container-acao-serra');
    if (!container) return;

    container.innerHTML = `
        <div style="background:#1e293b; padding:12px; border-radius:8px; margin-bottom:15px; border-left:4px solid #E31C24; display:flex; justify-content:space-between; align-items:center;">
            <div style="color:white; font-weight:bold; font-size:13px;">${tipo} - ${esp}mm</div>
            <div id="resumo-soma-serra" style="color:#10b981; font-weight:bold; font-size:14px;">Neste Painel: 0.00m</div>
            <input type="hidden" id="h-tipo-serra" value="${tipo}">
            <input type="hidden" id="h-esp-serra" value="${esp}">
            <input type="hidden" id="h-data-rel-serra" value="${dataEscolhida}">
        </div>
<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
            <button id="btn-s-ped-serra" onclick="setModoCorteSerra('pedido')" style="background:#3b82f6; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">PEDIDO</button>
            <button id="btn-s-stk-serra" onclick="setModoCorteSerra('stock')" style="background:#1e293b; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">STOCK</button>
        </div>

        <div id="campos-serra" style="background:#111827; padding:15px; border-radius:10px; border:1px solid #334155;"></div>
        <div id="lista-corte-serra" style="margin-top:15px; max-height:250px; overflow-y:auto;"></div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">
            <button onclick="exibirSetupSerra()" style="background:#3b82f6; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">MUDAR PAINEL</button>
            <button onclick="atlasFinalizarDiaSerra()" style="background:#E31C24; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">FINALIZAR DIA</button>
        </div>
    `;

    setModoCorteSerra('pedido');
    atualizarTabelaSerra();
}

function setModoCorteSerra(modo) {
    const container = document.getElementById('campos-serra');
    if (!container) return;

    const btnPed = document.getElementById('btn-s-ped-serra');
    const btnStk = document.getElementById('btn-s-stk-serra');

    if (btnPed) btnPed.style.background = modo === 'pedido' ? '#3b82f6' : '#1e293b';
    if (btnStk) btnStk.style.background = modo === 'stock' ? '#3b82f6' : '#1e293b';

    const rals = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <select id="s-ral-s-serra" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="9010">SUP: 9010</option>
                <option value="9006">SUP: 9006</option>
            </select>
            <select id="s-ral-i-serra" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="3009">INF: 3009</option>
                <option value="7016">INF: 7016</option>
            </select>
        </div>
    `;

    if (modo === 'pedido') {
        container.innerHTML = `
            <input type="text" id="s-ped-serra" placeholder="Nº Pedido" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            ${rals}
            <input type="number" id="s-metros-serra" placeholder="Comprimento (m)" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            <button onclick="addLinhaSerra('pedido')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR</button>
        `;
    } else {
        container.innerHTML = `
            <select id="s-qualidade-serra" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="PPC">PPC</option>
                <option value="Descarte">Descarte</option>
            </select>
            ${rals}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <input type="number" id="s-qtd-serra" placeholder="Qtd" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <input type="number" id="s-metros-serra" placeholder="Metros" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            </div>
            <button onclick="addLinhaSerra('stock')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR STOCK</button>
        `;
    }
}

// --- 5. LÓGICA DE DADOS ---
function addLinhaSerra(modo) {
    const metrosInput = document.getElementById('s-metros-serra');
    if (!metrosInput) return;

    const metros = parseFloat(metrosInput.value);
    if (!metros || metros <= 0) return alert("Insira a metragem!");

    const item = {
        tipo: document.getElementById('h-tipo-serra').value,
        esp: document.getElementById('h-esp-serra').value,
        ralS: document.getElementById('s-ral-s-serra').value,
        ralI: document.getElementById('s-ral-i-serra').value,
        metros: metros,
        qtd: modo === 'stock' ? (parseInt(document.getElementById('s-qtd-serra')?.value) || 1) : 1,
        desc: modo === 'pedido'
            ? `PED: ${document.getElementById('s-ped-serra')?.value || "S/N"}`
            : `STOCK: ${document.getElementById('s-qualidade-serra')?.value || "P1"}`
    };

    db_serra_live.push(item);
    localStorage.setItem('atlas_serra_live', JSON.stringify(db_serra_live));
    atualizarTabelaSerra();

    metrosInput.value = "";
    const ped = document.getElementById('s-ped-serra');
    if (ped) ped.value = "";
}


function atlasSerraRelatorioAtual() {
    const seletorData = document.getElementById('h-data-rel-serra')?.value || '';
    let dataFinal, dia, mes, ano;

    if (seletorData) {
        const partes = seletorData.split('-');
        ano = partes[0];
        mes = partes[1];
        dia = partes[2];
        dataFinal = `${dia}/${mes}/${ano}`;
    } else {
        const hoje = new Date();
        dataFinal = hoje.toLocaleDateString('pt-BR');
        dia = String(hoje.getDate()).padStart(2, '0');
        mes = String(hoje.getMonth() + 1).padStart(2, '0');
        ano = hoje.getFullYear();
    }

    return {
        data: dataFinal,
        dia,
        mes: parseInt(mes, 10),
        ano,
        operador: document.getElementById('user-display')?.innerText || 'OP. SERRA',
        itens: [...db_serra_live],
        totalGeral: db_serra_live.reduce((acc, cur) => acc + ((parseFloat(cur.metros) || 0) * (parseInt(cur.qtd, 10) || 1)), 0).toFixed(2)
    };
}

function atlasSerraPreviewFecharDia() {
    if (db_serra_live.length === 0) return alert('Adicione itens antes de fechar!');
    const rel = atlasSerraRelatorioAtual();
    const janela = window.open('', '_blank');
    if (!janela) return alert('O navegador bloqueou a previa. Permita pop-ups para ver o PDF antes de salvar.');

    janela.document.write(`
        <html><head><title>Previa Relatorio Serra</title>
        <style>
            body{font-family:Arial,sans-serif;padding:22px;color:#111}
            .topo{border-bottom:4px solid #111;padding-bottom:12px;margin-bottom:16px}
            .resumo{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
            .resumo div{border:1px solid #111;padding:10px}
            table{width:100%;border-collapse:collapse} th,td{border:1px solid #111;padding:7px;font-size:12px} th{background:#eee}
            .no-print{margin-top:18px;display:flex;gap:10px} button{padding:12px 16px;font-weight:bold}
            @media print{.no-print{display:none}}
        </style></head><body>
            <div class="topo"><h1>Previa - Relatorio Serra</h1><div>Data: ${atlasTextoSeguroSaude(rel.data)} | Operador: ${atlasTextoSeguroSaude(rel.operador)}</div></div>
            <div class="resumo"><div><b>Total</b><br>${atlasTextoSeguroSaude(rel.totalGeral)} m</div><div><b>Linhas</b><br>${rel.itens.length}</div><div><b>Status</b><br>Aguardando confirmacao</div></div>
            <table><thead><tr><th>Tipo</th><th>Esp.</th><th>RAL sup.</th><th>RAL inf.</th><th>Qtd</th><th>Medida</th><th>Total</th><th>Pedido/Stock</th></tr></thead>
            <tbody>${rel.itens.map(item => {
                const qtd = parseInt(item.qtd, 10) || 1;
                const metros = parseFloat(item.metros) || 0;
                return `<tr><td>${atlasTextoSeguroSaude(item.tipo || '')}</td><td>${atlasTextoSeguroSaude(item.esp || '')} mm</td><td>${atlasTextoSeguroSaude(item.ralS || '')}</td><td>${atlasTextoSeguroSaude(item.ralI || '')}</td><td>${qtd}</td><td>${metros.toFixed(2)} m</td><td>${(qtd * metros).toFixed(2)} m</td><td>${atlasTextoSeguroSaude(item.desc || '')}</td></tr>`;
            }).join('')}</tbody></table>
            <div class="no-print">
                <button onclick="window.print()">IMPRIMIR / PDF</button>
                <button onclick="window.opener.fecharDiaSerra(); try { window.opener.focus(); } catch(e) {}">CONFIRMAR E SALVAR</button>
            </div>
        </body></html>
    `);
    janela.document.close();
}

function atualizarTabelaSerra() {
    const lista = document.getElementById('lista-corte-serra');
    const totalDisplay = document.getElementById('resumo-soma-serra');
    if (!lista) return;

    const tipoAtual = document.getElementById('h-tipo-serra')?.value;
    const espAtual = document.getElementById('h-esp-serra')?.value;
    let totalDestePainel = 0;

    lista.innerHTML = db_serra_live.map((it, idx) => {
        const metrosLinha = it.metros * it.qtd;
        if (it.tipo === tipoAtual && it.esp === espAtual) totalDestePainel += metrosLinha;

        return `
            <div style="background:#1e293b; padding:8px; border-radius:5px; margin-bottom:5px; border-left:4px solid #3b82f6; display:flex; justify-content:space-between; align-items:center; color:white; font-size:11px;">
                <span>
                    <b style="color:#10b981;">${metrosLinha.toFixed(2)}m</b>
                    <small>(${it.qtd}x ${it.metros}m)</small> - ${it.desc}
                    <br><small style="color:#94a3b8;">INF: ${it.ralI} / SUP: ${it.ralS}</small>
                </span>
                <i class="fas fa-trash" onclick="removerCorteSerra(${idx})" style="color:#ef4444; cursor:pointer; padding:5px;"></i>
            </div>
        `;
    }).join('');

    if (totalDisplay) totalDisplay.innerText = `Neste Painel: ${totalDestePainel.toFixed(2)}m`;
}

function removerCorteSerra(i) {
    if (!usuarioPodeExcluirModulo('serra')) return alert('Sem permissao para excluir na Serra.');
    db_serra_live.splice(i, 1);
    localStorage.setItem('atlas_serra_live', JSON.stringify(db_serra_live));
    atualizarTabelaSerra();
}

// --- 6. FECHAR DIA ---
function fecharDiaSerra() {
    if (db_serra_live.length === 0) return alert("Adicione itens antes de fechar!");

    const seletorData = document.getElementById('h-data-rel-serra').value;
    let dataFinal, dia, mes, ano;

    if (seletorData) {
        const partes = seletorData.split('-');
        ano = partes[0];
        mes = partes[1];
        dia = partes[2];
        dataFinal = `${dia}/${mes}/${ano}`;
    } else {
        const hoje = new Date();
        dataFinal = hoje.toLocaleDateString('pt-BR');
        dia = String(hoje.getDate()).padStart(2, '0');
        mes = String(hoje.getMonth() + 1).padStart(2, '0');
        ano = hoje.getFullYear();
    }

    const novoRelatorio = {
        id: Date.now(),
        data: dataFinal,
        dia: dia,
        mes: parseInt(mes),
        ano: ano,
       operador: document.getElementById('user-display')?.innerText || "OP. SERRA",
        itens: [...db_serra_live],
        totalGeral: db_serra_live.reduce((acc, cur) => acc + (cur.metros * cur.qtd), 0).toFixed(2)
    };

    db_serra_hist.push(novoRelatorio);
    localStorage.setItem('atlas_serra_hist', JSON.stringify(db_serra_hist));

    db_serra_live = [];
    localStorage.removeItem('atlas_serra_live');

    alert(`Relatório salvo com sucesso para o dia ${dataFinal}!`);
    renderizarMenuSerra();
}

// --- 7. HISTÓRICO ---
function listarHistoricoSerra() {
    const render = document.getElementById('render-modulo');
    let agrupado = {};

    db_serra_hist.forEach(rel => {
        if (!agrupado[rel.ano]) agrupado[rel.ano] = {};
        if (!agrupado[rel.ano][rel.mes]) agrupado[rel.ano][rel.mes] = [];
        agrupado[rel.ano][rel.mes].push(rel);
    });

    const mesesNome = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

    let html = `
        <div style="padding:15px; color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="renderizarMenuSerra()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
                <h2 style="border-bottom:2px solid #E31C24; padding-bottom:10px; margin:0; flex:1; font-size:18px;">📂 Histórico da Serra</h2>
            </div>
    `;

    if (db_serra_hist.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum relatório encontrado no sistema.</div>`;
    }

    Object.keys(agrupado).sort((a, b) => b - a).forEach(ano => {
        html += `
            <div style="margin-bottom:10px;">
                <div onclick="toggleElemento('ano-s-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;">
                    <span>📁 ANO ${ano}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="ano-s-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">`;

        Object.keys(agrupado[ano]).sort((a, b) => b - a).forEach(mes => {
            html += `
                <div onclick="toggleElemento('mes-s-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">
                   📅 ${mesesNome[mes]}
                </div>
                <div id="mes-s-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">`;

            agrupado[ano][mes].forEach(rel => {
                html += `
                    <div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px;">
                            <b style="color:white;">DIA ${rel.dia}/${rel.mes}</b><br>
                            <small style="color:#94a3b8;">Total: ${rel.totalGeral} m</small>
                        </span>
                        <button onclick='gerarPDF_Serra("${encodeURIComponent(JSON.stringify(rel))}")' style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                            <i class="fas fa-file-pdf"></i> VER PDF
                        </button>
                    </div>`;
            });

            html += `</div>`;
        });

        html += `</div></div>`;
    });

    html += `</div>`;
    render.innerHTML = html;
}

// --- 8. AUXILIAR ---
function toggleElemento(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    }
}
function gerarPDF_Serra(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');

    let blocos = {};
    rel.itens.forEach(it => {
        let chave = `${it.tipo} ${it.esp}mm`;
        if (!blocos[chave]) blocos[chave] = { pedidos: [], stock: [] };

        if (it.desc.toUpperCase().includes('PED:')) {
            blocos[chave].pedidos.push(it);
        } else {
            blocos[chave].stock.push(it);
        }
    });

    let htmlConteudo = "";

    for (let nome in blocos) {
        htmlConteudo += `
            <div style="margin-bottom:30px; page-break-inside: avoid;">
                <div style="background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; font-size:16px; border:2px solid #000;">
                    ${nome.toUpperCase()}
                </div>`;

        if (blocos[nome].pedidos.length > 0) {
            htmlConteudo += `
                <div style="text-align:center; padding:5px; background:#ddd; font-weight:bold; border:2px solid #000; border-top:none; color:#000;">
                    LISTA DE PEDIDOS
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:10px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000; width:50px;">Qtd</th>
                            <th style="border:2px solid #000; width:90px;">Mts Un.</th>
                            <th style="border:2px solid #000; width:100px;">Total</th>
                            <th style="border:2px solid #000;">RAL (INF/SUP)</th>
                            <th style="border:2px solid #000;">Identificação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocos[nome].pedidos.map(i => `
                            <tr>
                                <td style="border:2px solid #000; text-align:center;">${i.qtd}</td>
                                <td style="border:2px solid #000; text-align:center;">${Number(i.metros).toFixed(2)}m</td>
                                <td style="border:2px solid #000; text-align:center; font-weight:bold;">${(i.qtd * i.metros).toFixed(2)}m</td>
                                <td style="border:2px solid #000; text-align:center;">${i.ralI}/${i.ralS}</td>
                                <td style="border:2px solid #000; text-align:center;">${i.desc}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        }

        if (blocos[nome].stock.length > 0) {
            htmlConteudo += `
                <div style="text-align:center; padding:5px; background:#ddd; font-weight:bold; border:2px solid #000; border-top:none; color:#000;">
                    PRODUÇÃO STOCK
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:14px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000; width:50px;">Qtd</th>
                            <th style="border:2px solid #000; width:90px;">Mts Un.</th>
                            <th style="border:2px solid #000; width:100px;">Total</th>
                            <th style="border:2px solid #000;">RAL (INF/SUP)</th>
                            <th style="border:2px solid #000;">Qualidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocos[nome].stock.map(i => `
                            <tr>
                                <td style="border:2px solid #000; text-align:center;">${i.qtd}</td>
                                <td style="border:2px solid #000; text-align:center;">${Number(i.metros).toFixed(2)}m</td>
                                <td style="border:2px solid #000; text-align:center; font-weight:bold;">${(i.qtd * i.metros).toFixed(2)}m</td>
                                <td style="border:2px solid #000; text-align:center;">${i.ralI}/${i.ralS}</td>
                                <td style="border:2px solid #000; text-align:center;">${i.desc}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        }

        htmlConteudo += `</div>`;
    }

    janela.document.write(`
        <html>
        <head>
            <title>Relatório Serra</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                table tr td, table tr th { border: 2px solid #000 !important; padding: 8px; }
                @media print {
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; border-bottom:5px solid #E31C24; background:#000; color:#fff; padding:15px; align-items:center;">
                <div><b style="font-size:22px;">ATLAS PAINEL</b><br>RELATÓRIO DE SERRA</div>
                <div style="text-align:right; font-weight:bold;">DATA: ${rel.data}<br>OP: ${rel.operador}</div>
            </div>

            <div style="margin-top:20px;">${htmlConteudo}</div>

            <div style="margin-top:20px; background:#000 !important; color:#fff !important; padding:20px; text-align:right; border:3px solid #000;">
                <span style="font-size:18px; font-weight:normal; text-transform:uppercase; display:block; margin-bottom:5px;">Total Geral Produzido</span>
                <b style="font-size:35px; display:block; line-height:1;">${rel.totalGeral} m</b>
            </div>

            <div style="margin-top:80px; text-align:center; width:100%;">
                <div style="display:inline-block; width:350px; border-top:2px solid #000; padding-top:5px;">
                    <b style="text-transform:uppercase; font-size:14px;">${rel.operador}</b><br>
                    <span>Responsável pela Produção</span>
                </div>
            </div>

            <div class="no-print" style="text-align:center;">
                <button onclick="window.print()" style="padding:20px; background:#000; color:#fff; border:3px solid #E31C24; width:100%; font-size:18px; font-weight:bold; border-radius:10px;">
                    🖨️ CONFIRMAR E GERAR PDF
                </button>
            </div>
        </body>
        </html>
    `);

    janela.document.close();
}


// finalizou a serra aqui 

//embalagem
// --- 1. BANCO DE DATOS EMBALAGEM ---
let db_emb_live = atlasArrayLocal('atlas_emb_live');
let db_emb_hist = atlasArrayLocal('atlas_emb_hist');

function renderizarMenuEmbalagem() {
    const render = document.getElementById('render-modulo');
    db_emb_live = JSON.parse(localStorage.getItem('atlas_emb_live')) || [];
    render.innerHTML = `
        <div id="container-menu-emb" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; padding:15px;">
            <div class="card" onclick="exibirSetupEmbalagem()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border: 1px solid #334155;">
                <i class="fas fa-plus" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Novo Relatório</span>
            </div>
            <div class="card" onclick="listarHistoricoEmbalagem()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border: 1px solid #334155;">
                <i class="fas fa-history" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Histórico Embalagem</span>
            </div>
        </div>
        <div id="container-acao-emb" style="display:none; padding:15px;"></div>
    `;

    alternarAbaEmbalagem(false);
}

// --- 2. GERENCIAMENTO DE INTERFACE ---
function alternarAbaEmbalagem(mostrarAcao) {
    const menu = document.getElementById('container-menu-emb');
    const acao = document.getElementById('container-acao-emb');
    if(mostrarAcao) {
        if(menu) menu.style.display = 'none';
        if(acao) acao.style.display = 'block';
    } else {
        if(menu) menu.style.display = 'grid';
        if(acao) {
            acao.style.display = 'none';
            acao.innerHTML = '';
        }
    }
}

function exibirSetupEmbalagem() {
    alternarAbaEmbalagem(true);
    const container = document.getElementById('container-acao-emb');
    container.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <button onclick="alternarAbaEmbalagem(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">Configurar Embalagem</h3>
        </div>
        <div style="margin-bottom: 15px; padding: 10px; background: #1e293b; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid #334155;">
            <label style="color: #94a3b8; font-weight: bold; font-size: 12px;">DATA:</label>
            <input type="date" id="data-manual-Embalagem" style="background: #0f172a; color: white; border: 1px solid #3b82f6; padding: 5px; border-radius: 4px; font-weight: bold; outline: none;">
        </div>
        <div style="background:#111827; padding:20px; border-radius:12px; border: 1px solid #334155;">
            <label style="color:#94a3b8; font-size:11px;">TIPO DE PAINEL</label>
            <select id="s-tipo" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:15px; font-weight:bold;">
                ${opcoesTipoPainelHTML()}
            </select>
            <label style="color:#94a3b8; font-size:11px;">ESPESSURA (mm)</label>
            <select id="s-esp" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-bottom:20px; font-weight:bold;">
                ${[30,40,50,60,80,100,120].map(e => `<option value="${e}">${e} mm</option>`).join('')}
            </select>
            <button onclick="iniciarInterfaceCorte()" style="width:100%; background:white; color:black; font-weight:800; border:none; padding:15px; border-radius:6px; cursor:pointer; text-transform:uppercase;">Abrir Lançamento</button>
        </div>
    `;
    document.getElementById('data-manual-Embalagem').valueAsDate = new Date();
}

// --- 3. INTERFACE DE LANÇAMENTO ---
function iniciarInterfaceCorte() {
    alternarAbaEmbalagem(true);
    const tipo = document.getElementById('s-tipo')?.value || db_emb_live[0]?.tipo || "5 Ondas";
    const esp = document.getElementById('s-esp')?.value || db_emb_live[0]?.esp || "30";
    const dataEscolhida = document.getElementById('data-manual-Embalagem')?.value || "";

    const container = document.getElementById('container-acao-emb');
    container.innerHTML = `
        <div style="background:#1e293b; padding:12px; border-radius:8px; margin-bottom:15px; border-left:4px solid #E31C24; display:flex; justify-content:space-between; align-items:center;">
            <div style="color:white; font-weight:bold; font-size:13px;">${tipo} - ${esp}mm</div>
            <div id="resumo-soma" style="color:#10b981; font-weight:bold; font-size:14px;">Total: 0.00 m</div>
            <input type="hidden" id="h-tipo" value="${tipo}">
            <input type="hidden" id="h-esp" value="${esp}">
            <input type="hidden" id="h-data-rel" value="${dataEscolhida}">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
            <button id="btn-s-ped" onclick="setModoCorte('pedido')" style="background:#3b82f6; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">PEDIDO</button>
            <button id="btn-s-stk" onclick="setModoCorte('stock')" style="background:#1e293b; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">STOCK</button>
        </div>
        <div id="campos-Embalagem" style="background:#111827; padding:15px; border-radius:10px; border:1px solid #334155;"></div>
        <div id="lista-corte" style="margin-top:15px; max-height: 250px; overflow-y: auto;"></div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
            <button onclick="exibirSetupEmbalagem()" style="background:#3b82f6; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">MUDAR PAINEL</button>
            <button onclick="fecharDiaEmbalagem()" style="background:#E31C24; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">FECHAR DIA</button>
        </div>
    `;
    setModoCorte('pedido');
    atualizarTabelaEmbalagem();
}

function setModoCorte(modo) {
    const container = document.getElementById('campos-Embalagem');
    if(!container) return;

    document.getElementById('btn-s-ped').style.background = modo === 'pedido' ? '#3b82f6' : '#1e293b';
    document.getElementById('btn-s-stk').style.background = modo === 'stock' ? '#3b82f6' : '#1e293b';

    const rals = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
            <select id="s-ral-s" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="9010">SUP: 9010</option>
                <option value="9006">SUP: 9006</option>
                <option value="MAD.NATURAL">SUP: MAD.NATURAL</option>
            </select>
            <select id="s-ral-i" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="3009">INF: 3009</option>
                <option value="9010">INF: 9010</option>
                <option value="7016">INF: 7016</option>
                <option value="9006">INF: 9006</option>
            </select>
        </div>
    `;

    if(modo === 'pedido') {
        container.innerHTML = `
            <input type="text" id="s-ped" placeholder="Nº Pedido" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            ${rals}
            <input type="number" id="s-metros" placeholder="Comprimento (m)" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            <button onclick="addLinhaEmbalagem('pedido')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR</button>
        `;
    } else {
        container.innerHTML = `
            <select id="s-qualidade" style="width:100%; margin-bottom:10px; padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="P1">P1</option><option value="P2">P2</option><option value="PPC">PPC</option><option value="Descarte">Descarte</option>
            </select>
            ${rals}
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                <input type="number" id="s-qtd" placeholder="Qtd" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <input type="number" id="s-metros" placeholder="Metros" style="padding:10px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            </div>
            <button onclick="addLinhaEmbalagem('stock')" style="width:100%; background:#E31C24; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold;">ADICIONAR STOCK</button>
        `;
    }
}

// --- 4. LÓGICA DE DADOS ---
function addLinhaEmbalagem(modo) {
    const metrosInput = document.getElementById('s-metros');
    const metros = parseFloat(metrosInput.value);
    if(!metros || metros <= 0) return alert("Insira a metragem!");

    const item = {
        tipo: document.getElementById('h-tipo').value,
        esp: document.getElementById('h-esp').value,
        ralS: document.getElementById('s-ral-s').value,
        ralI: document.getElementById('s-ral-i').value,
        metros: metros,
        qtd: modo === 'stock' ? (parseInt(document.getElementById('s-qtd').value) || 1) : 1,
        desc: modo === 'pedido' ? `PED: ${document.getElementById('s-ped').value || "S/N"}` : `STOCK: ${document.getElementById('s-qualidade').value}`
    };

    db_emb_live.push(item);
    localStorage.setItem('atlas_emb_live', JSON.stringify(db_emb_live));
    atualizarTabelaEmbalagem();
    
    metrosInput.value = "";
    if(document.getElementById('s-ped')) document.getElementById('s-ped').value = "";
}

function atualizarTabelaEmbalagem() {
    const lista = document.getElementById('lista-corte');
    const totalDisplay = document.getElementById('resumo-soma');
    if(!lista) return;

    const tipoAtual = document.getElementById('h-tipo')?.value;
    const espAtual = document.getElementById('h-esp')?.value;
    let totalDestePainel = 0;

    lista.innerHTML = db_emb_live.map((it, idx) => {
        let metrosLinha = it.metros * it.qtd;
        if(it.tipo === tipoAtual && it.esp === espAtual) totalDestePainel += metrosLinha;

        return `
            <div style="background:#1e293b; padding:8px; border-radius:5px; margin-bottom:5px; border-left:4px solid #3b82f6; display:flex; justify-content:space-between; align-items:center; color:white; font-size:11px;">
                <span>
                    <b style="color:#10b981;">${metrosLinha.toFixed(2)}m</b> 
                    <small>(${it.qtd}x ${it.metros}m)</small> — ${it.desc} 
                    <br><small style="color:#94a3b8;">INF: ${it.ralI} / SUP: ${it.ralS}</small>
                </span>
                <i class="fas fa-trash" onclick="removerCorteEmbalagem(${idx})" style="color:#ef4444; cursor:pointer; padding:5px;"></i>
            </div>
        `;
    }).join('');

    if(totalDisplay) totalDisplay.innerText = `Neste Painel: ${totalDestePainel.toFixed(2)}m`;
}

function removerCorteEmbalagem(i) {
    if (!usuarioPodeExcluirModulo('embalagem')) return alert('Sem permissao para excluir na Embalagem.');
    db_emb_live.splice(i, 1);
    localStorage.setItem('atlas_emb_live', JSON.stringify(db_emb_live));
    atualizarTabelaEmbalagem();
}

function fecharDiaEmbalagem() {
    if (db_emb_live.length === 0) return alert("Adicione itens antes de fechar!");

    const seletorData = document.getElementById('h-data-rel').value;
    let dataFinal, dia, mes, ano;

    if (seletorData) {
        const partes = seletorData.split('-'); 
        ano = partes[0];
        mes = partes[1];
        dia = partes[2];
        dataFinal = `${dia}/${mes}/${ano}`;
    } else {
        const hoje = new Date();
        dataFinal = hoje.toLocaleDateString('pt-BR');
        dia = String(hoje.getDate()).padStart(2, '0');
        mes = String(hoje.getMonth() + 1).padStart(2, '0');
        ano = hoje.getFullYear();
    }

    const novoRelatorio = {
        id: Date.now(),
        data: dataFinal,
        dia: dia,
        mes: parseInt(mes),
        ano: ano,
        operador: document.getElementById('user-display')?.innerText || "OP. EMBALAGEM",
        itens: [...db_emb_live],
        totalGeral: db_emb_live.reduce((acc, cur) => acc + (cur.metros * cur.qtd), 0).toFixed(2)
    };

    db_emb_hist.push(novoRelatorio);
    localStorage.setItem('atlas_emb_hist', JSON.stringify(db_emb_hist));
    
    db_emb_live = [];
    localStorage.removeItem('atlas_emb_live');
    
    alert(`Relatório salvo com sucesso!`);
    renderizarMenuEmbalagem();
}

// --- 5. HISTÓRICO ---
function listarHistoricoEmbalagem() {
    alternarAbaEmbalagem(true);
    const container = document.getElementById('container-acao-emb');
    db_emb_hist = JSON.parse(localStorage.getItem('atlas_emb_hist')) || [];
    let agrupado = {};

    db_emb_hist.forEach(rel => {
        if (!agrupado[rel.ano]) agrupado[rel.ano] = {};
        if (!agrupado[rel.ano][rel.mes]) agrupado[rel.ano][rel.mes] = [];
        agrupado[rel.ano][rel.mes].push(rel);
    });

    const mesesNome = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

    let html = `
        <div style="color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="alternarAbaEmbalagem(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
                <h2 style="border-bottom: 2px solid #E31C24; padding-bottom: 10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">📂 Histórico Embalagem</h2>
            </div>
    `;

    if (db_emb_hist.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum relatório encontrado.</div>`;
    }

    Object.keys(agrupado).sort((a,b) => b-a).forEach(ano => {
        html += `
            <div style="margin-bottom:10px;">
                <div onclick="toggleElemento('ano-emb-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border: 1px solid #334155; display:flex; justify-content:space-between;">
                    <span>📁 ANO ${ano}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="ano-emb-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left: 2px solid #E31C24;">`;
            
        Object.keys(agrupado[ano]).sort((a,b) => b-a).forEach(mes => {
            html += `
                <div onclick="toggleElemento('mes-emb-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background: #0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">
                    📅 ${mesesNome[mes]}
                </div>
                <div id="mes-emb-${ano}-${mes}" style="display:none; padding-left:10px; background: #1a202c;">`;
                
            agrupado[ano][mes].forEach((rel) => {
                html += `
                    <div style="padding:12px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px;">
                            <b style="color:white;">DIA ${rel.dia}/${rel.mes}</b><br>
                            <small style="color:#94a3b8;">Total: ${rel.totalGeral} m</small>
                        </span>
                        <button onclick='gerarPDF_Embalagem("${encodeURIComponent(JSON.stringify(rel))}")' 
                                style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                    </div>`;
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// --- 6. FUNÇÕES AUXILIARES ---
function toggleElemento(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

function gerarPDF_Embalagem(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    
    let blocos = {};
    rel.itens.forEach(it => {
        let chave = `${it.tipo} ${it.esp}mm`;
        if(!blocos[chave]) blocos[chave] = { pedidos: [], stock: [] };
        if(it.desc.toUpperCase().includes('PED:')) blocos[chave].pedidos.push(it);
        else blocos[chave].stock.push(it);
    });

    let htmlConteudo = "";
    for(let nome in blocos) {
        htmlConteudo += `
            <div style="margin-bottom:30px; page-break-inside: avoid;">
                <div style="background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; font-size:16px; border:2px solid #000;">${nome.toUpperCase()}</div>`;
        
        if(blocos[nome].pedidos.length > 0) {
            htmlConteudo += `<div style="text-align: center; padding:5px; background:#ddd; font-weight:bold; border:2px solid #000; border-top:none; color:#000;"> LISTA DE PEDIDOS</div>
                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:10px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000; width:50px;">Qtd</th>
                            <th style="border:2px solid #000; width:90px;">Mts Un.</th>
                            <th style="border:2px solid #000; width:100px;">Total</th>
                            <th style="border:2px solid #000;">RAL (INF/SUP)</th>
                            <th style="border:2px solid #000;">Identificação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocos[nome].pedidos.map(i => `<tr>
                            <td style="border:2px solid #000; text-align:center;">${i.qtd}</td>
                            <td style="border:2px solid #000; text-align:center;">${Number(i.metros).toFixed(2)}m</td>
                            <td style="border:2px solid #000; text-align:center; font-weight:bold;">${(i.qtd * i.metros).toFixed(2)}m</td>
                            <td style="border:2px solid #000; text-align:center;">${i.ralI}/${i.ralS}</td>
                            <td style="border:2px solid #000; text-align:center;">${i.desc}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }
        
        if(blocos[nome].stock.length > 0) {
            htmlConteudo += `<div style="text-align: center; padding:5px; background:#ddd; font-weight:bold; border:2px solid #000; border-top:none; color:#000;"> PRODUÇÃO STOCK</div>
                <table style="width:100%; border-collapse:collapse; font-size:14px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000; width:50px;">Qtd</th>
                            <th style="border:2px solid #000; width:90px;">Mts Un.</th>
                            <th style="border:2px solid #000; width:100px;">Total</th>
                            <th style="border:2px solid #000;">RAL (INF/SUP)</th>
                            <th style="border:2px solid #000;">Qualidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blocos[nome].stock.map(i => `<tr>
                            <td style="border:2px solid #000; text-align:center;">${i.qtd}</td>
                            <td style="border:2px solid #000; text-align:center;">${Number(i.metros).toFixed(2)}m</td>
                            <td style="border:2px solid #000; text-align:center; font-weight:bold;">${(i.qtd * i.metros).toFixed(2)}m</td>
                            <td style="border:2px solid #000; text-align:center;">${i.ralI}/${i.ralS}</td>
                            <td style="border:2px solid #000; text-align:center;">${i.desc}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }
        htmlConteudo += `</div>`;
    }

    janela.document.write(`
        <html>
        <head>
            <title>Relatório Embalagem</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                table tr td, table tr th { border: 2px solid #000 !important; padding: 8px; }
                @media print { 
                    .no-print { display: none !important; } 
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; border-bottom:5px solid #E31C24; background:#000; color:#fff; padding:15px; align-items:center;">
                <div><b style="font-size:22px;">ATLAS PAINEL</b><br>RELATÓRIO DE EMBALAGEM</div>
                <div style="text-align:right; font-weight:bold;">DATA: ${rel.data}<br>OP: ${rel.operador}</div>
            </div>

            <div style="margin-top:20px;">${htmlConteudo}</div>

            <div style="margin-top:20px; background:#000 !important; color:#fff !important; padding:20px; text-align:right; border: 3px solid #000;">
                <span style="font-size:18px; font-weight:normal; text-transform:uppercase; display:block; margin-bottom:5px;">Total Geral Produzido</span>
                <b style="font-size:35px; display:block; line-height:1;">${rel.totalGeral} m</b>
            </div>

            <div style="margin-top:80px; text-align:center; width:100%;">
                <div style="display:inline-block; width:350px; border-top:2px solid #000; padding-top:5px;">
                    <b style="text-transform:uppercase; font-size:14px;">${rel.operador}</b><br>
                    <span>Responsável pela Produção</span>
                </div>
            </div>

            <div class="no-print" style="text-align: center;">
                    <button onclick="window.print()" style="padding: 20px; background: #000; color: #fff; border: 3px solid #E31C24; width: 100%; font-size: 18px; font-weight: bold; border-radius: 10px;">
                        🖨️ CONFIRMAR E GERAR PDF
                    </button>
                </div>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
}

//  Modulo Da Gestao
function renderizarMenuGestao() {
    const render = document.getElementById('render-modulo');
    render.innerHTML = `
        <div id="menu-gestao" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; padding:15px;">
            <div class="card" onclick="exibirCriarUsuario()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-user-plus" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Criar ID</span>
            </div>
            <div class="card" onclick="listarUsuariosSistema()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-users" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Lista de Usuários</span>
            </div>
        </div>
        <div id="gestao-conteudo" style="padding:15px;"></div>
    `;
}

function exibirCriarUsuario() {
    const container = document.getElementById('gestao-conteudo');
    if (!container) return;

    container.innerHTML = `
        <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #334155;">
            <h3 style="color:white; margin-top:0; margin-bottom:15px;">Criar Usuário</h3>

            <input type="text" id="novo-id-usuario" placeholder="ID do funcionário" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">

            <input type="password" id="nova-senha-usuario" placeholder="Senha" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">

            <select id="novo-cargo-usuario" style="width:100%; margin-bottom:15px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
                <option value="operario">Operário</option>
                <option value="supervisor">Supervisor</option>
            </select>

            <button onclick="criarUsuarioSistema()" style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">
                CRIAR USUÁRIO
            </button>
        </div>
    `;
}

function criarUsuarioSistema() {
    const id = document.getElementById('novo-id-usuario')?.value.trim();
    const senha = document.getElementById('nova-senha-usuario')?.value.trim();
    const cargo = document.getElementById('novo-cargo-usuario')?.value;

    if (!id || !senha) {
        alert("Preencha o ID e a senha.");
        return;
    }

    const jaExiste = usuariosSistema.some(u => u.id.toLowerCase() === id.toLowerCase());
    if (jaExiste) {
        alert("Este ID já existe.");
        return;
    }

    usuariosSistema.push({
        id,
        senha,
        cargo,
        bloqueado: false
    });

    localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
    alert("Usuário criado com sucesso!");
    exibirCriarUsuario();
}

function exibirCriarUsuario() {
    const container = document.getElementById('gestao-conteudo');
    if (!container) return;

    container.innerHTML = `
        <form autocomplete="off" onsubmit="return false;" style="background:#111827; padding:20px; border-radius:12px; border:1px solid #334155;">
            <h3 style="color:white; margin-top:0; margin-bottom:15px;">Criar usuario</h3>
            <input type="text" id="novo-nome-usuario" name="atlas-novo-nome-${Date.now()}" autocomplete="off" readonly onfocus="this.removeAttribute('readonly')" placeholder="Nome do usuario" value="" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
            <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:6px;">Data de nascimento</label>
            <input type="date" id="novo-aniversario-usuario" name="atlas-novo-nascimento-${Date.now()}" autocomplete="off" title="Coloque a data completa de nascimento, com dia, mes e ano" value="" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
            <input type="search" id="novo-id-usuario" name="atlas-novo-login-${Date.now()}" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly'); if(this.value.toLowerCase()==='admin') this.value='';" placeholder="ID de entrada / login" value="" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
            <input type="text" id="nova-senha-usuario" name="atlas-nova-senha-${Date.now()}" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly'); if((document.getElementById('novo-id-usuario')?.value || '').toLowerCase()==='admin') this.value='';" placeholder="Senha" value="" style="-webkit-text-security:disc; text-security:disc; width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
            <select id="novo-cargo-usuario" style="width:100%; margin-bottom:15px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
                <option value="operario">Operario</option>
                <option value="supervisor">Supervisor</option>
            </select>
            <button onclick="criarUsuarioSistema()" style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">CRIAR USUARIO</button>
        </form>
    `;

    const limparCamposCriarId = () => {
        const idCampo = document.getElementById('novo-id-usuario');
        const senhaCampo = document.getElementById('nova-senha-usuario');
        const nomeCampo = document.getElementById('novo-nome-usuario');
        const dataCampo = document.getElementById('novo-aniversario-usuario');
        const idAtual = String(idCampo?.value || '').trim().toLowerCase();
        const pareceAutofillAdmin = idAtual === 'admin' || idAtual === String(usuarioLogado?.id || '').trim().toLowerCase();

        if (nomeCampo && !nomeCampo.matches(':focus')) nomeCampo.value = '';
        if (dataCampo && !dataCampo.matches(':focus')) dataCampo.value = '';
        if (idCampo && pareceAutofillAdmin && !idCampo.matches(':focus')) idCampo.value = '';
        if (senhaCampo && pareceAutofillAdmin && !senhaCampo.matches(':focus')) senhaCampo.value = '';
    };

    setTimeout(() => {
        ['novo-nome-usuario', 'novo-aniversario-usuario', 'novo-id-usuario', 'nova-senha-usuario'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '';
        });
    }, 250);

    let tentativasLimpezaCriarId = 0;
    const timerLimpezaCriarId = setInterval(() => {
        limparCamposCriarId();
        tentativasLimpezaCriarId += 1;
        if (tentativasLimpezaCriarId >= 25) clearInterval(timerLimpezaCriarId);
    }, 200);
}

function criarUsuarioSistema() {
    const nome = document.getElementById('novo-nome-usuario')?.value.trim();
    const aniversario = document.getElementById('novo-aniversario-usuario')?.value;
    const id = document.getElementById('novo-id-usuario')?.value.trim();
    const senha = document.getElementById('nova-senha-usuario')?.value.trim();
    const cargo = document.getElementById('novo-cargo-usuario')?.value;

    if (!nome || !id || !senha) {
        alert("Preencha nome, ID de entrada e senha. A data de nascimento pode ficar em branco e ser colocada depois.");
        return;
    }

    const idNormalizado = atlasIdUsuarioNormalizado(id);
    atlasNormalizarUsuariosSistema();

    const excluidos = atlasUsuariosExcluidosSistema();
    const jaExiste = usuariosSistema.some(u => atlasIdUsuarioNormalizado(u.id) === idNormalizado && !excluidos[idNormalizado]);
    if (jaExiste) {
        alert("Este ID ja existe.");
        return;
    }

    usuariosSistema = usuariosSistema.filter(u => atlasIdUsuarioNormalizado(u.id) !== idNormalizado);
    atlasLimparUsuarioExcluidoSistema(idNormalizado);
    if (typeof window.atlasFirebaseLimparUsuarioExcluido === 'function') {
        window.atlasFirebaseLimparUsuarioExcluido(idNormalizado);
    }
    usuariosSistema.push(marcarUsuarioAlteradoAtlas({
        nome,
        nascimento: aniversario || '',
        aniversario: aniversario || '',
        id,
        senha,
        cargo,
        bloqueado: false
    }));
    salvarUsuariosSistemaAtlas();
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();
    alert("Usuario criado com sucesso!");
    exibirCriarUsuario();
}

function usuarioProtegidoAdminAtlas(usuario) {
    return String(usuario?.id || '').trim().toLowerCase() === 'admin'
        || normalizarCargoUsuario(usuario?.cargo) === 'admin';
}

function marcarUsuarioAlteradoAtlas(usuario) {
    if (!usuario) return usuario;
    usuario._atlasUsuarioAtualizadoEm = Date.now();
    return usuario;
}

function atlasIdUsuarioNormalizado(idUsuario) {
    return String(idUsuario || '').trim().toLowerCase();
}

function atlasUsuariosExcluidosSistema() {
    try {
        const excluidos = JSON.parse(localStorage.getItem('atlas_usuarios_excluidos')) || {};
        if (excluidos.admin) {
            delete excluidos.admin;
            localStorage.setItem('atlas_usuarios_excluidos', JSON.stringify(excluidos));
        }
        return excluidos;
    } catch (erro) {
        return {};
    }
}

function atlasSalvarUsuariosExcluidosSistema(excluidos) {
    if (excluidos && typeof excluidos === 'object') {
        delete excluidos.admin;
    }
    localStorage.setItem('atlas_usuarios_excluidos', JSON.stringify(excluidos || {}));
}

function atlasLimparUsuarioExcluidoSistema(idUsuario) {
    const id = atlasIdUsuarioNormalizado(idUsuario);
    if (!id) return;
    const excluidos = atlasUsuariosExcluidosSistema();
    delete excluidos[id];
    atlasSalvarUsuariosExcluidosSistema(excluidos);
}

function atlasRegistrarUsuarioExcluidoSistema(usuario) {
    const id = atlasIdUsuarioNormalizado(usuario?.id);
    if (!id) return;
    if (id === 'admin' || usuarioProtegidoAdminAtlas(usuario)) return;
    const excluidos = atlasUsuariosExcluidosSistema();
    excluidos[id] = {
        id: usuario.id,
        nome: usuario.nome || usuario.id,
        cargo: usuario.cargo || '',
        excluidoPor: typeof atlasUsuarioAtualNome === 'function' ? atlasUsuarioAtualNome() : (usuarioLogado?.id || 'SISTEMA'),
        excluidoEm: new Date().toLocaleString('pt-BR'),
        atualizadoEm: Date.now()
    };
    atlasSalvarUsuariosExcluidosSistema(excluidos);
}

function atlasNormalizarUsuariosSistema() {
    const excluidos = atlasUsuariosExcluidosSistema();
    const mapa = new Map();

    (usuariosSistema || []).forEach(usuario => {
        const id = atlasIdUsuarioNormalizado(usuario?.id);
        if (!id) return;
        if (excluidos[id] && !usuarioProtegidoAdminAtlas(usuario)) return;

        const atual = mapa.get(id);
        const usuarioAtualizado = Number(usuario?._atlasUsuarioAtualizadoEm || 0);
        const atualAtualizado = Number(atual?._atlasUsuarioAtualizadoEm || 0);
        if (!atual || usuarioAtualizado >= atualAtualizado) {
            mapa.set(id, usuario);
        }
    });

    mapa.set('admin', { id: 'admin', nome: 'ADMIN', senha: '123', cargo: 'admin', bloqueado: false, _atlasUsuarioAtualizadoEm: Date.now() });

    usuariosSistema = Array.from(mapa.values()).sort((a, b) => {
        const adminA = atlasIdUsuarioNormalizado(a.id) === 'admin' ? -1 : 0;
        const adminB = atlasIdUsuarioNormalizado(b.id) === 'admin' ? -1 : 0;
        if (adminA !== adminB) return adminA - adminB;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });

    window.usuariosSistema = usuariosSistema;
    return usuariosSistema;
}

function salvarUsuariosSistemaAtlas() {
    atlasNormalizarUsuariosSistema();
    localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
    return usuariosSistema;
}

function listarUsuariosSistema() {
    const container = document.getElementById('gestao-conteudo');
    if (!container) return;
    atlasNormalizarUsuariosSistema();

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            ${usuariosSistema.map((u, index) => `
                <div style="background:#1e293b; padding:15px; border-radius:10px; border:1px solid #334155;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <div style="color:white; font-weight:bold;">${u.id.toUpperCase()}</div>
                            <div style="color:#94a3b8; font-size:12px;">Nome: ${textoSeguroPermissoes(u.nome || u.id)}</div>
                            <div style="color:#94a3b8; font-size:12px;">Nascimento: ${(u.nascimento || u.aniversario) ? formatarDataPlanoBR(u.nascimento || u.aniversario) : '-'}</div>
                            <div style="color:#94a3b8; font-size:12px;">Cargo atual: ${u.cargo.toUpperCase()}</div>
                        </div>
                        <div style="color:#94a3b8; font-size:12px;">
    Cargo atual: ${u.cargo.toUpperCase()} | Status: ${u.bloqueado ? 'BLOQUEADO' : 'ATIVO'}
</div>

                    </div>

                        ${usuarioProtegidoAdminAtlas(u) ? `
                            <button disabled style="background:#475569; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">
                                ADMIN FIXO
                            </button>
                        ` : `
                            <select onchange="alterarCargoUsuario(${index}, this.value)" style="padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:6px; font-weight:bold;">
                                <option value="operario" ${u.cargo === 'operario' ? 'selected' : ''}>Operário</option>
                                <option value="supervisor" ${u.cargo === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                            </select>
                        `}
                    </div>

                    ${usuarioProtegidoAdminAtlas(u) ? `
                        <div style="background:#0f172a; color:#fbbf24; border:1px solid #334155; padding:10px; border-radius:8px; font-weight:bold; text-align:center;">
                            ADMIN protegido: nao pode bloquear nem excluir
                        </div>
                    ` : `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-bottom:10px;">
    <button onclick="editarAniversarioUsuario(${index})" style="background:#3b82f6; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">
        ANIVERSARIO
    </button>

    <button onclick="alternarBloqueioUsuario(${index})" style="background:${u.bloqueado ? '#10b981' : '#f59e0b'}; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">
        ${u.bloqueado ? 'DESBLOQUEAR' : 'BLOQUEAR'}
    </button>

    <button onclick="excluirUsuario(${index})" style="background:#ef4444; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold;">
        EXCLUIR
    </button>
</div>`}

                </div>
            `).join('')}
        </div>
    `;
}

function alterarCargoUsuario(index, novoCargo) {
    if (!usuariosSistema[index]) return;
    if (usuarioProtegidoAdminAtlas(usuariosSistema[index])) {
        alert("O cargo ADMIN não pode ser alterado.");
        listarUsuariosSistema();
        return;
    }

    marcarUsuarioAlteradoAtlas(usuariosSistema[index]);
    usuariosSistema[index].cargo = novoCargo;
    salvarUsuariosSistemaAtlas();
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();
    alert("Cargo atualizado com sucesso.");
    listarUsuariosSistema();
}
function editarAniversarioUsuario(index) {
    const usuario = usuariosSistema[index];
    if (!usuario) return;
    if (usuarioProtegidoAdminAtlas(usuario)) {
        alert("O usuario ADMIN nao pode ser alterado.");
        listarUsuariosSistema();
        return;
    }

    const atual = usuario.nascimento || usuario.aniversario || '';
    const antigo = document.getElementById('modal-aniversario-usuario');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-aniversario-usuario';
    modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(2,6,23,.82); display:flex; align-items:center; justify-content:center; padding:14px;';
    modal.innerHTML = `
        <div style="width:min(92vw,420px); background:#111827; border:1px solid #334155; border-radius:12px; padding:18px; color:white; box-shadow:0 20px 60px rgba(0,0,0,.45);">
            <h3 style="margin:0 0 6px;">Aniversario</h3>
            <div style="color:#94a3b8; margin-bottom:14px;">${textoSeguroPermissoes(usuario.nome || usuario.id)}</div>
            <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:6px;">Data de nascimento</label>
            <input id="campo-aniversario-usuario" type="date" value="${textoSeguroPermissoes(atual)}" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:14px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <button onclick="salvarAniversarioUsuario(${index})" style="background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">SALVAR</button>
                <button onclick="document.getElementById('campo-aniversario-usuario').value=''; salvarAniversarioUsuario(${index})" style="background:#7f1d1d; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">REMOVER</button>
            </div>
            <button onclick="document.getElementById('modal-aniversario-usuario')?.remove()" style="width:100%; background:#334155; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">CANCELAR</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function salvarAniversarioUsuario(index) {
    const usuario = usuariosSistema[index];
    if (!usuario) return;
    const limpa = String(document.getElementById('campo-aniversario-usuario')?.value || '').trim();
    const anterior = usuario.nascimento || usuario.aniversario || '';

    marcarUsuarioAlteradoAtlas(usuario);
    usuario.nascimento = limpa;
    usuario.aniversario = limpa;
    salvarUsuariosSistemaAtlas();
    if (typeof window.atlasRegistrarAuditoria === 'function') {
        window.atlasRegistrarAuditoria('Alterou aniversario de usuario', 'gestao', `Usuario: ${usuario.id} | Antes: ${anterior || '-'} | Depois: ${limpa || '-'}`);
    }
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();
    document.getElementById('modal-aniversario-usuario')?.remove();
    listarUsuariosSistema();
}

function aplicarPermissoesUsuario() {
    const cardGestao = document.getElementById('card-gestao');
    if (!cardGestao || !usuarioLogado) return;

    if (usuarioPodeVerModulo('gestao')) {
        cardGestao.style.display = '';
    } else {
        cardGestao.style.display = 'none';
    }
}

function alternarBloqueioUsuario(index) {
    if (!usuariosSistema[index]) return;

    if (usuarioProtegidoAdminAtlas(usuariosSistema[index])) {
        alert("O usuário ADMIN não pode ser bloqueado.");
        return;
    }

    marcarUsuarioAlteradoAtlas(usuariosSistema[index]);
    usuariosSistema[index].bloqueado = !usuariosSistema[index].bloqueado;
    salvarUsuariosSistemaAtlas();
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();

    alert(usuariosSistema[index].bloqueado ? "Usuário bloqueado." : "Usuário desbloqueado.");
    listarUsuariosSistema();
}
function excluirUsuario(index) {
    if (!usuariosSistema[index]) return;

    if (usuarioProtegidoAdminAtlas(usuariosSistema[index])) {
        alert("O usuário ADMIN não pode ser excluído.");
        return;
    }

    const confirmar = confirm(`Deseja excluir o usuário ${usuariosSistema[index].id}?`);
    if (!confirmar) return;

    const usuarioExcluido = usuariosSistema[index];
    atlasRegistrarUsuarioExcluidoSistema(usuarioExcluido);
    if (typeof window.atlasFirebaseRemoverUsuarioExcluido === 'function') {
        window.atlasFirebaseRemoverUsuarioExcluido(usuarioExcluido.id);
    }
    const idExcluido = atlasIdUsuarioNormalizado(usuarioExcluido.id);
    usuariosSistema = usuariosSistema.filter(usuario => atlasIdUsuarioNormalizado(usuario.id) !== idExcluido);
    salvarUsuariosSistemaAtlas();
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();

    alert("Usuário excluído com sucesso.");
    listarUsuariosSistema();
}
 
// --- MÓDULO PLANO ---
var db_plano_live = atlasJSONLocal('atlas_plano_live', null);
var db_plano_hist = atlasArrayLocal('atlas_plano_hist');
var destinosPlano = atlasArrayLocal('atlas_plano_destinos', ["Ansião", "Leiria", "Algarve", "Sobreda", "Abrantes"]);

function atlasListaConfig(chave, padrao) {
    try {
        const lista = JSON.parse(localStorage.getItem(chave));
        return Array.isArray(lista) && lista.length ? lista : padrao;
    } catch (erro) {
        return padrao;
    }
}

function atlasSalvarListaConfig(chave, lista) {
    const limpa = [...new Set((lista || []).map(v => String(v || '').trim()).filter(Boolean))];
    localStorage.setItem(chave, JSON.stringify(limpa));
    return limpa;
}

function atlasObterConfigMinimoStock() {
    try {
        const salvo = JSON.parse(localStorage.getItem('atlas_config_minimo_stock')) || {};
        return {
            bobinas: Math.max(1, Number(salvo.bobinas || 10)),
            filmes: Math.max(1, Number(salvo.filmes || 10))
        };
    } catch (erro) {
        return { bobinas: 10, filmes: 10 };
    }
}

function atlasSalvarConfigMinimoStock() {
    if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
    const bobinas = Math.max(1, Number(document.getElementById('min-stock-bobinas')?.value || 10));
    const filmes = Math.max(1, Number(document.getElementById('min-stock-filmes')?.value || 10));
    localStorage.setItem('atlas_config_minimo_stock', JSON.stringify({ bobinas, filmes }));
    if (typeof window.atlasRegistrarAuditoria === 'function') {
        window.atlasRegistrarAuditoria('Alterou minimo de stock', 'config', `Bobinas: ${bobinas} | Filmes: ${filmes}`);
    }
    alert('Minimo de stock salvo.');
    abrirAjustesSistema();
}

window.atlasObterConfigMinimoStock = atlasObterConfigMinimoStock;
window.atlasSalvarConfigMinimoStock = atlasSalvarConfigMinimoStock;

function atlasListaObjetosConfig(chave, padrao) {
    try {
        const lista = JSON.parse(localStorage.getItem(chave));
        return Array.isArray(lista) && lista.length ? lista : padrao;
    } catch (erro) {
        return padrao;
    }
}

var OPCOES_TIPO_PLANO = atlasListaConfig('atlas_config_tipos_painel', ["5 Ondas", "Fachada Oculta", "Fachada Visível", "Telha Canudo"]);
var OPCOES_ESPESSURA_PLANO = [30, 40, 50, 60, 80, 100, 120];
var OPCOES_RAL_SUP = atlasListaConfig('atlas_config_ral_superior', ["9010", "9006", "7016"]);
var OPCOES_RAL_INF = atlasListaConfig('atlas_config_ral_inferior', ["3009", "9010", "6009", "9006", "9005", "8004 T", "8004 L", "7016"]);
var OPCOES_ESP_CHAPA = atlasListaConfig('atlas_config_esp_chapa', ["0,28", "0,30", "0,32", "0,35", "0,38", "0,40", "0,43", "0,45", "0,50", "0,60", "0,68"])
    .map(v => String(v).replace('.', ','));
atlasSalvarListaConfig('atlas_config_esp_chapa', OPCOES_ESP_CHAPA);
var OPCOES_ESPUMA_INJECAO = atlasListaConfig('atlas_config_espuma_injecao', ["30 mm", "35 mm", "40 mm", "50 mm", "65 mm ADH"]);
var OPCOES_FITA_INJECAO = atlasListaConfig('atlas_config_fita_injecao', ["30 mm", "35 mm", "40 mm", "50 mm", "65 mm ADH"]);
var OPCOES_VELOCIDADE_INJECAO = atlasListaConfig('atlas_config_velocidade_injecao', ["5 m/min", "6 m/min", "8 m/min", "9 m/min", "10 m/min", "11 m/min", "12 m/min"]);
var OPCOES_MEDIDAS_CHAPA_STOCK = atlasListaConfig('atlas_config_medidas_chapa_stock', ["1265", "1060", "1163", "1065"]);
var OPCOES_FORNECEDORES_STOCK = atlasListaConfig('atlas_config_fornecedores_stock', ["Fornecedor X", "Fornecedor Y"]);
var OPCOES_FILMES_STOCK = atlasListaConfig('atlas_config_filmes_stock', ["Telha (1180mm)", "Ondulado (1055mm)", "5 Ondas (1175mm)", "Fachada (1010)"]);
const FILMES_PADRAO_BOBINES_ATLAS = ["Telha (1180mm)", "Ondulado (1055mm)", "5 Ondas (1175mm)", "Fachada (1010)"];
if ((OPCOES_FILMES_STOCK || []).some(v => ['filme 1060', 'filme 1065', 'filme 1163', 'filme telha canudo', '5 ondas - 1265'].includes(normalizarStockAtlas(v)))) {
    OPCOES_FILMES_STOCK = FILMES_PADRAO_BOBINES_ATLAS;
    atlasSalvarListaConfig('atlas_config_filmes_stock', OPCOES_FILMES_STOCK);
}
var OPCOES_PACOTES_SERRA = atlasListaObjetosConfig('atlas_config_pacotes_serra', [
    { tipo: "5 Ondas", espessura: "30", maximo: 16 },
    { tipo: "5 Ondas", espessura: "40", maximo: 12 },
    { tipo: "Fachada Oculta", espessura: "30", maximo: 24 }
]);
window.OPCOES_TIPO_PLANO = OPCOES_TIPO_PLANO;
window.OPCOES_RAL_SUP = OPCOES_RAL_SUP;
window.OPCOES_RAL_INF = OPCOES_RAL_INF;
window.OPCOES_ESP_CHAPA = OPCOES_ESP_CHAPA;
window.OPCOES_ESPUMA_INJECAO = OPCOES_ESPUMA_INJECAO;
window.OPCOES_FITA_INJECAO = OPCOES_FITA_INJECAO;
window.OPCOES_VELOCIDADE_INJECAO = OPCOES_VELOCIDADE_INJECAO;
window.OPCOES_MEDIDAS_CHAPA_STOCK = OPCOES_MEDIDAS_CHAPA_STOCK;
window.OPCOES_FORNECEDORES_STOCK = OPCOES_FORNECEDORES_STOCK;
window.OPCOES_FILMES_STOCK = OPCOES_FILMES_STOCK;
window.OPCOES_PACOTES_SERRA = OPCOES_PACOTES_SERRA;
var OPCOES_QUALIDADE = ["P1", "P2", "PPC", "Descarte"];
var MESES_PT = ["", "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

if (!OPCOES_TIPO_PLANO.some(v => String(v).toLowerCase() === 'pir')) {
    OPCOES_TIPO_PLANO.push('PIR');
    atlasSalvarListaConfig('atlas_config_tipos_painel', OPCOES_TIPO_PLANO);
    window.OPCOES_TIPO_PLANO = OPCOES_TIPO_PLANO;
}

function opcoesTipoPainelHTML(selecionado = '') {
    return (OPCOES_TIPO_PLANO || []).map(v => `<option value="${v}" ${String(selecionado) === String(v) ? 'selected' : ''}>${v}</option>`).join('');
}

function opcoesEspumaInjecaoHTML(selecionado = '') {
    return [`<option value="">Espuma opcional</option>`]
        .concat((OPCOES_ESPUMA_INJECAO || []).map(v => `<option value="${v}" ${String(selecionado) === String(v) ? 'selected' : ''}>${v}</option>`))
        .join('');
}

function opcoesFitaInjecaoHTML(selecionado = '') {
    return [`<option value="">Fita opcional</option>`]
        .concat((OPCOES_FITA_INJECAO || []).map(v => `<option value="${v}" ${String(selecionado) === String(v) ? 'selected' : ''}>${v}</option>`))
        .join('');
}

function opcoesVelocidadeInjecaoHTML(selecionado = '') {
    const lista = (OPCOES_VELOCIDADE_INJECAO || []).slice().sort((a, b) => {
        const na = Number(String(a).replace(/[^\d,.]/g, '').replace(',', '.'));
        const nb = Number(String(b).replace(/[^\d,.]/g, '').replace(',', '.'));
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
    });
    return [`<option value="" disabled ${selecionado ? '' : 'selected'}>Vel (m/min)</option>`]
        .concat(lista.map(v => `<option value="${v}" ${String(selecionado) === String(v) ? 'selected' : ''}>${v}</option>`))
        .join('');
}

function opcoesEspChapaHTML(selecionado = '') {
    return (OPCOES_ESP_CHAPA || []).map(v => {
        const valor = String(v).replace('.', ',');
        return `<option value="${valor}" ${String(selecionado).replace('.', ',') === valor ? 'selected' : ''}>${valor}</option>`;
    }).join('');
}

function espumaPadraoInjecao(tipoPainel) {
    return String(tipoPainel || '').toLowerCase().includes('telha canudo') ? '65 mm ADH' : '';
}

function usuarioPodeCriarPlano() {
    if (!usuarioLogado) return false;
    return usuarioPodeEditarModulo('plano');
}
function usuarioPodeVerAnalisePlano() {
    if (!usuarioLogado) return false;
    return usuarioLogado.cargo === 'admin' || usuarioLogado.cargo === 'supervisor';
}
function salvarPlanoLive() {
    localStorage.setItem('atlas_plano_live', JSON.stringify(db_plano_live));
}
function salvarDestinosPlano() {
    localStorage.setItem('atlas_plano_destinos', JSON.stringify(destinosPlano));
}
function formatarDataPlanoBR(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}
function togglePlanoElemento(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}
function alternarAbaPlano(mostrarAcao) {
    const menu = document.getElementById('container-menu-plano');
    const acao = document.getElementById('container-acao-plano');
    if (!menu || !acao) return false;
    menu.style.display = mostrarAcao ? 'none' : 'grid';
    acao.style.display = mostrarAcao ? 'block' : 'none';
    if (!mostrarAcao) acao.innerHTML = '';
    return true;
}
function criarEstruturaPlanoSeNecessario() {
    if (!db_plano_live) {
        db_plano_live = {
            id: Date.now(),
            dataISO: document.getElementById('plano-data')?.value || new Date().toISOString().slice(0, 10),
            operador: document.getElementById('user-display')?.innerText || 'SEM USUARIO',
            linhasAbertas: [],
            gruposFinalizados: [],
            modoAtual: 'pedido',
            pedidoAtual: null
        };
        salvarPlanoLive();
    }
}
function criarNovoPlanoLimpo(modo) {
    const totalExistente = calcularTotalPlano(db_plano_live);
    if (db_plano_live && totalExistente > 0) {
        const confirmar = confirm('Existe um plano em andamento salvo. Deseja iniciar um plano novo e limpar o anterior?');
        if (!confirmar) return;
    }

    db_plano_live = {
        id: Date.now(),
        dataISO: document.getElementById('plano-data')?.value || new Date().toISOString().slice(0, 10),
        operador: document.getElementById('user-display')?.innerText || 'SEM USUARIO',
        linhasAbertas: [],
        gruposFinalizados: [],
        modoAtual: modo || 'pedido',
        pedidoAtual: null
    };
    salvarPlanoLive();
    abrirFormularioPlano(modo || 'pedido');
}
function retomarPlanoEmAndamento() {
    if (!db_plano_live) return alert('Nao existe plano em andamento.');
    abrirFormularioPlano(db_plano_live.modoAtual || 'pedido');
}
function exibirMenuCriacaoPlano() {
    if (!usuarioPodeCriarPlano()) return alert('Sem permissao para criar plano.');
    if (!alternarAbaPlano(true)) return;
    const c = document.getElementById('container-acao-plano');
    const dataAtual = db_plano_live?.dataISO || new Date().toISOString().slice(0, 10);
    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <button onclick="alternarAbaPlano(false)" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
            <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">Criar Plano</h3>
        </div>
        <div style="margin-bottom:15px; padding:10px; background:#1e293b; border-radius:8px; border:1px solid #334155;">
            <label style="color:#94a3b8; font-size:12px;">DATA DO PLANO</label>
            <input type="date" id="plano-data" value="${dataAtual}" style="background:#0f172a; color:white; border:1px solid #3b82f6; padding:10px; border-radius:4px; width:100%; margin-top:8px;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div class="card" onclick="criarNovoPlanoLimpo('pedido')" style="cursor:pointer; background:#111827; border-radius:10px; padding:25px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-file-signature" style="color:#10b981; font-size:2.2rem; margin-bottom:12px;"></i><span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Pedidos</span>
            </div>
            <div class="card" onclick="criarNovoPlanoLimpo('stock')" style="cursor:pointer; background:#111827; border-radius:10px; padding:25px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-boxes-stacked" style="color:#f59e0b; font-size:2.2rem; margin-bottom:12px;"></i><span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Stock</span>
            </div>
        </div>
        ${db_plano_live ? `<div style="margin-top:15px;"><button onclick="retomarPlanoEmAndamento()" style="width:100%; background:#3b82f6; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">RETOMAR PLANO EM ANDAMENTO</button></div>` : ''}
    `;
}
function abrirFormularioPlano(modo) {
    if (!usuarioPodeCriarPlano()) return alert('Sem permissao para criar plano.');
    criarEstruturaPlanoSeNecessario();
    db_plano_live.modoAtual = modo;
    db_plano_live.dataISO = document.getElementById('plano-data')?.value || db_plano_live.dataISO;
    if (modo === 'pedido' && db_plano_live.pedidoAtual && (!db_plano_live.pedidoAtual.tipo || !db_plano_live.pedidoAtual.espessura)) {
        const primeiraLinhaPedido = (db_plano_live.linhasAbertas || []).find(item =>
            item.modo === 'pedido' && String(item.pedidoNumero || '') === String(db_plano_live.pedidoAtual.numero || '')
        );
        if (primeiraLinhaPedido) {
            db_plano_live.pedidoAtual.tipo = primeiraLinhaPedido.tipo;
            db_plano_live.pedidoAtual.espessura = primeiraLinhaPedido.espessura;
        }
    }
    salvarPlanoLive();
    if (!alternarAbaPlano(true)) return;
    const c = document.getElementById('container-acao-plano');
    const pedidoAtual = db_plano_live.pedidoAtual;
    const tipoSelecionado = pedidoAtual?.tipo || OPCOES_TIPO_PLANO[0] || '';
    const espessuraSelecionada = pedidoAtual?.espessura || OPCOES_ESPESSURA_PLANO[0] || '';
    const pedidoTravado = modo === 'pedido' && !!pedidoAtual;
    const campoTipoPlano = pedidoTravado
        ? `<input id="plano-tipo" value="${textoSeguroConferencia(tipoSelecionado)}" readonly style="background:#111827; color:#10b981; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px; font-weight:bold;">`
        : `<select id="plano-tipo" onchange="atualizarTelaPlanoAtual()" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">${OPCOES_TIPO_PLANO.map(v=>`<option value="${v}" ${String(v) === String(tipoSelecionado) ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
    const campoEspessuraPlano = pedidoTravado
        ? `<input id="plano-esp" value="${textoSeguroConferencia(espessuraSelecionada)}" readonly style="background:#111827; color:#10b981; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px; font-weight:bold;">`
        : `<select id="plano-esp" onchange="atualizarTelaPlanoAtual()" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">${OPCOES_ESPESSURA_PLANO.map(v=>`<option value="${v}" ${String(v) === String(espessuraSelecionada) ? 'selected' : ''}>${v} mm</option>`).join('')}</select>`;
    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:15px;">
            <button onclick="exibirMenuCriacaoPlano()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button>
            <h3 style="color:#E31C24; font-size:14px; margin:0; text-transform:uppercase;">${modo === 'pedido' ? 'Plano de Pedidos' : 'Plano de Stock'}</h3>
        </div>
        <div style="background:#1e293b; padding:12px; border-radius:8px; margin-bottom:15px; border-left:4px solid ${modo === 'pedido' ? '#10b981' : '#f59e0b'};">
            <div style="color:white; font-weight:bold; font-size:13px;">Plano em andamento</div>
            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">Data: ${formatarDataPlanoBR(db_plano_live.dataISO)} | Operador: ${db_plano_live.operador}</div>
            ${pedidoTravado ? `<div style="color:#10b981; font-size:12px; margin-top:6px;"><b>Pedido travado:</b> ${pedidoAtual.numero} | ${pedidoAtual.destino} | ${textoSeguroConferencia(tipoSelecionado)} ${textoSeguroConferencia(espessuraSelecionada)} mm</div>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div><label style="color:#94a3b8; font-size:11px;">TIPO DE CHAPA</label>${campoTipoPlano}</div>
            <div><label style="color:#94a3b8; font-size:11px;">ESPESSURA</label>${campoEspessuraPlano}</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div><label style="color:#94a3b8; font-size:11px;">RAL INFERIOR</label><select id="plano-ral-inf" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">${OPCOES_RAL_INF.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
            <div><label style="color:#94a3b8; font-size:11px;">RAL SUPERIOR</label><select id="plano-ral-sup" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">${OPCOES_RAL_SUP.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
        </div>
        ${modo === 'pedido' ? `
        <div style="background:#111827; padding:15px; border-radius:10px; border:1px solid #334155;">
            <input type="text" id="plano-pedido-numero" placeholder="Numero do pedido" value="${pedidoAtual?.numero || ''}" ${pedidoAtual ? 'disabled' : ''} style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            <select id="plano-destino-fixo" ${pedidoAtual ? 'disabled' : ''} onchange="sincronizarDestinoPlano()" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <option value="">Selecione o comprador fixo</option>
                ${destinosPlano.map(v=>`<option value="${v}" ${pedidoAtual?.destino===v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <input type="text" id="plano-destino-manual" placeholder="Ou digite novo comprador" value="${pedidoAtual && !destinosPlano.includes(pedidoAtual.destino) ? pedidoAtual.destino : ''}" ${pedidoAtual ? 'disabled' : ''} style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <input type="number" id="plano-pedido-qtd" placeholder="Quantidade de chapas" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <input type="number" id="plano-pedido-metros" placeholder="Metros por chapa" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            </div>
            <button onclick="adicionarLinhaPlano('pedido')" style="width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold; margin-top:10px;">ADICIONAR PEDIDO</button>
        </div>` : `
        <div style="background:#111827; padding:15px; border-radius:10px; border:1px solid #334155;">
            <input type="date" id="plano-stock-data" value="${db_plano_live.dataISO}" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            <select id="plano-stock-qualidade" style="width:100%; margin-bottom:10px; padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">${OPCOES_QUALIDADE.map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <input type="number" id="plano-stock-qtd" placeholder="Quantidade de chapas" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
                <input type="number" id="plano-stock-metros" placeholder="Metros por chapa" style="padding:12px; background:#1e293b; color:white; border:1px solid #334155; border-radius:5px;">
            </div>
            <button onclick="adicionarLinhaPlano('stock')" style="width:100%; background:#f59e0b; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold; margin-top:10px;">ADICIONAR STOCK</button>
        </div>`}
        <div id="plano-resumo-atual" style="margin-top:15px;"></div>
        <div id="plano-lista-aberta" style="margin-top:15px;"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:15px;">
            <button onclick="finalizarPedidoPlano()" style="background:#3b82f6; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">FINALIZAR ${modo === 'pedido' ? 'PEDIDO' : 'STOCK'}</button>
            <button onclick="finalizarEspessuraPlano()" style="background:#7c3aed; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">FINALIZAR ESPESSURA</button>
            <button onclick="finalizarPlanoCompleto()" style="background:#E31C24; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold;">FINALIZAR PLANO</button>
        </div>
        <div id="plano-grupos-finalizados" style="margin-top:15px;"></div>
    `;
    atualizarTelaPlanoAtual();
}
function sincronizarDestinoPlano() {
    const fixo = document.getElementById('plano-destino-fixo');
    const manual = document.getElementById('plano-destino-manual');
    if (fixo && manual && fixo.value) manual.value = '';
}
function adicionarLinhaPlano(modo) {
    criarEstruturaPlanoSeNecessario();
    const pedidoTravado = modo === 'pedido' && !!db_plano_live.pedidoAtual;
    const tipo = pedidoTravado ? db_plano_live.pedidoAtual.tipo : document.getElementById('plano-tipo')?.value;
    const espessura = pedidoTravado ? db_plano_live.pedidoAtual.espessura : document.getElementById('plano-esp')?.value;
    const ralSuperior = document.getElementById('plano-ral-sup')?.value;
    const ralInferior = document.getElementById('plano-ral-inf')?.value;
    let item = null;
    if (modo === 'pedido') {
        const numero = db_plano_live.pedidoAtual?.numero || document.getElementById('plano-pedido-numero')?.value.trim();
        const destino = db_plano_live.pedidoAtual?.destino || document.getElementById('plano-destino-manual')?.value.trim() || document.getElementById('plano-destino-fixo')?.value;
        const quantidade = parseInt(document.getElementById('plano-pedido-qtd')?.value, 10);
        const metros = parseFloat(document.getElementById('plano-pedido-metros')?.value);
        if (!numero) return alert('Informe o numero do pedido.');
        if (!destino) return alert('Informe para onde vai o pedido.');
        if (!quantidade || quantidade <= 0) return alert('Informe a quantidade de chapas.');
        if (!metros || metros <= 0) return alert('Informe os metros por chapa.');
        if (!db_plano_live.pedidoAtual) {
            db_plano_live.pedidoAtual = { numero, destino, tipo, espessura };
            if (!destinosPlano.includes(destino)) {
                destinosPlano.push(destino);
                destinosPlano.sort();
                salvarDestinosPlano();
            }
        }
        item = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            modo, tipo, espessura, ralSuperior, ralInferior,
            quantidadeChapas: quantidade, metrosUnidade: metros,
            totalMetros: Number((quantidade * metros).toFixed(2)),
            pedidoNumero: numero, destino: destino,
            descricao: `PEDIDO ${numero}`
        };
    } else {
        const quantidade = parseInt(document.getElementById('plano-stock-qtd')?.value, 10);
        const metros = parseFloat(document.getElementById('plano-stock-metros')?.value);
        const qualidade = document.getElementById('plano-stock-qualidade')?.value || 'P1';
        if (!quantidade || quantidade <= 0) return alert('Informe a quantidade de chapas.');
        if (!metros || metros <= 0) return alert('Informe os metros por chapa.');
        item = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            modo, tipo, espessura, ralSuperior, ralInferior,
            quantidadeChapas: quantidade, metrosUnidade: metros,
            totalMetros: Number((quantidade * metros).toFixed(2)),
            qualidade, destino: '', pedidoNumero: '',
            descricao: `STOCK ${qualidade}`
        };
    }
    db_plano_live.linhasAbertas.push(item);
    salvarPlanoLive();
    if (modo === 'pedido') {
        document.getElementById('plano-pedido-qtd').value = '';
        document.getElementById('plano-pedido-metros').value = '';
    } else {
        document.getElementById('plano-stock-qtd').value = '';
        document.getElementById('plano-stock-metros').value = '';
    }
    atualizarTelaPlanoAtual();
    if (modo === 'pedido') abrirFormularioPlano('pedido');
}
function editarLinhaPlano(idLinha) {
    const item = db_plano_live?.linhasAbertas.find(x => x.id === idLinha);
    if (!item) return;
    const qtd = prompt('Quantidade de chapas:', item.quantidadeChapas);
    if (qtd === null) return;
    const mts = prompt('Metros por chapa:', item.metrosUnidade);
    if (mts === null) return;
    item.quantidadeChapas = Number(qtd);
    item.metrosUnidade = Number(mts);
    item.totalMetros = Number((item.quantidadeChapas * item.metrosUnidade).toFixed(2));
    salvarPlanoLive();
    atualizarTelaPlanoAtual();
}
function removerLinhaPlano(idLinha) {
    if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
    if (!db_plano_live) return;
    db_plano_live.linhasAbertas = db_plano_live.linhasAbertas.filter(item => item.id !== idLinha);
    if (db_plano_live.modoAtual === 'pedido') {
        const aindaTemPedido = db_plano_live.linhasAbertas.some(x => x.modo === 'pedido' && x.pedidoNumero === db_plano_live.pedidoAtual?.numero);
        if (!aindaTemPedido) db_plano_live.pedidoAtual = null;
    }
    salvarPlanoLive();
    atualizarTelaPlanoAtual();
    if (db_plano_live.modoAtual === 'pedido') abrirFormularioPlano('pedido');
}
function atualizarTelaPlanoAtual() {
    if (!db_plano_live) return;
    const modoAtual = db_plano_live.modoAtual || 'pedido';
    const pedidoTravado = modoAtual === 'pedido' && !!db_plano_live.pedidoAtual;
    const tipoAtual = pedidoTravado ? db_plano_live.pedidoAtual.tipo : document.getElementById('plano-tipo')?.value;
    const espAtual = pedidoTravado ? db_plano_live.pedidoAtual.espessura : document.getElementById('plano-esp')?.value;
    const linhasDoBloco = db_plano_live.linhasAbertas.filter(item => item.modo === modoAtual && item.tipo === tipoAtual && String(item.espessura) === String(espAtual));
    const totalBloco = linhasDoBloco.reduce((a, b) => a + b.totalMetros, 0);
    const totalPlano = calcularTotalPlano(db_plano_live);
    document.getElementById('plano-resumo-atual').innerHTML = `<div style="background:#1e293b; padding:12px; border-radius:8px; border:1px solid #334155; color:white; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;"><span><b>Bloco atual:</b> ${tipoAtual} ${espAtual} mm</span><span style="color:#10b981;"><b>Total do bloco:</b> ${totalBloco.toFixed(2)} m</span><span style="color:#3b82f6;"><b>Total do plano:</b> ${totalPlano.toFixed(2)} m</span></div>`;
    document.getElementById('plano-lista-aberta').innerHTML = linhasDoBloco.length === 0 ? `<div style="background:#111827; color:#94a3b8; padding:15px; border-radius:8px; border:1px dashed #334155;">Nenhuma linha adicionada neste bloco ainda.</div>` : linhasDoBloco.map(item => `
        <div style="background:#1e293b; padding:10px; border-radius:6px; margin-bottom:8px; border-left:4px solid ${item.modo === 'pedido' ? '#10b981' : '#f59e0b'}; display:flex; justify-content:space-between; gap:12px; align-items:center; color:white; font-size:12px;">
            <span><b>${item.descricao}${item.destino ? ' | ' + item.destino : ''}</b><br><small>${item.ralInferior}/${item.ralSuperior} | ${item.quantidadeChapas} x ${item.metrosUnidade} m = ${item.totalMetros.toFixed(2)} m</small></span>
            <span style="display:flex; gap:8px;">
                <i class="fas fa-pen" onclick="editarLinhaPlano(${item.id})" style="color:#f59e0b; cursor:pointer; padding:5px;"></i>
                <i class="fas fa-trash" onclick="removerLinhaPlano(${item.id})" style="color:#ef4444; cursor:pointer; padding:5px;"></i>
            </span>
        </div>`).join('');
    document.getElementById('plano-grupos-finalizados').innerHTML = db_plano_live.gruposFinalizados.length === 0 ? '' : `<div style="margin-bottom:8px; color:white; font-weight:bold;">Blocos ja finalizados</div>${db_plano_live.gruposFinalizados.map((g,i)=>`<div style="background:#111827; padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid #334155; color:white;"><div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;"><span><b>${g.tipo}</b> ${g.espessura} mm</span><span>${g.modo.toUpperCase()}</span><span style="color:#10b981;">${g.totalMetros.toFixed(2)} m</span></div><small style="color:#94a3b8;">${g.itens.length} linha(s)</small><button onclick="removerGrupoFinalizadoPlano(${i})" style="margin-top:8px; background:#334155; color:white; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">REMOVER BLOCO</button></div>`).join('')}`;
}
function finalizarPedidoPlano() {
    if (!db_plano_live) return alert('Nenhum plano em andamento.');
    if (db_plano_live.modoAtual === 'pedido') {
        if (!db_plano_live.pedidoAtual) return alert('Nenhum pedido aberto.');
        const num = db_plano_live.pedidoAtual.numero;
        const tem = db_plano_live.linhasAbertas.some(x => x.modo === 'pedido' && x.pedidoNumero === num);
        if (!tem) return alert('Adicione itens antes de finalizar o pedido.');
        db_plano_live.pedidoAtual = null;
        salvarPlanoLive();
        abrirFormularioPlano('pedido');
        alert('Pedido finalizado. Agora pode abrir outro pedido.');
        return;
    }
    moverBlocoAtualParaFinalizados(false);
}
function finalizarEspessuraPlano() {
    moverBlocoAtualParaFinalizados(true);
}
function moverBlocoAtualParaFinalizados(mensagemEspessura) {
    if (!db_plano_live) return alert('Nenhum plano em andamento.');
    const modoAtual = db_plano_live.modoAtual || 'pedido';
    const pedidoTravado = modoAtual === 'pedido' && !!db_plano_live.pedidoAtual;
    const tipoAtual = pedidoTravado ? db_plano_live.pedidoAtual.tipo : document.getElementById('plano-tipo')?.value;
    const espAtual = pedidoTravado ? db_plano_live.pedidoAtual.espessura : document.getElementById('plano-esp')?.value;
    const linhasDoBloco = db_plano_live.linhasAbertas.filter(item => item.modo === modoAtual && item.tipo === tipoAtual && String(item.espessura) === String(espAtual));
    if (linhasDoBloco.length === 0) return alert('Nao ha linhas para finalizar neste bloco.');
    const ids = new Set(linhasDoBloco.map(item => item.id));
    db_plano_live.linhasAbertas = db_plano_live.linhasAbertas.filter(item => !ids.has(item.id));
    db_plano_live.gruposFinalizados.push({ id: Date.now(), modo: modoAtual, tipo: tipoAtual, espessura: espAtual, itens: linhasDoBloco, totalMetros: Number(linhasDoBloco.reduce((a,b)=>a+b.totalMetros,0).toFixed(2)), finalizadoEm: new Date().toLocaleString('pt-BR') });
    salvarPlanoLive();
    atualizarTelaPlanoAtual();
    alert(mensagemEspessura ? 'Espessura finalizada.' : 'Bloco finalizado.');
}
function removerGrupoFinalizadoPlano(indice) {
    if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
    if (!db_plano_live) return;
    db_plano_live.gruposFinalizados.splice(indice, 1);
    salvarPlanoLive();
    atualizarTelaPlanoAtual();
}
function finalizarPlanoCompleto() {
    if (!db_plano_live) return alert('Nenhum plano em andamento.');
    if (db_plano_live.linhasAbertas.length > 0 && !confirm('Ainda existem linhas abertas. Deseja finalizar o plano mesmo assim?')) return;
    const todosOsItens = [...db_plano_live.gruposFinalizados.flatMap(g=>g.itens), ...db_plano_live.linhasAbertas];
    if (todosOsItens.length === 0) return alert('Adicione algum item antes de finalizar o plano.');
    const [ano, mes, dia] = db_plano_live.dataISO.split('-');
    const planoFinal = {
        id: Date.now(), dataISO: db_plano_live.dataISO, data: `${dia}/${mes}/${ano}`, dia, mes: parseInt(mes,10), ano,
        operador: db_plano_live.operador, itens: todosOsItens,
        tiposLancamento: Array.from(new Set(todosOsItens.map(x=>x.modo))),
        totalGeral: Number(todosOsItens.reduce((a,b)=>a+b.totalMetros,0).toFixed(2)),
        resumo: gerarResumoPlano(todosOsItens)
    };
    db_plano_hist.push(planoFinal);
    localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
    db_plano_live = null;
    localStorage.removeItem('atlas_plano_live');
    alert('Plano finalizado e enviado para o historico.');
    renderizarMenuPlanoNovo();
}
function gerarResumoPlano(itens) {
    const porEspessura = {}, porCor = {};
    itens.forEach(item => {
        const e = `${item.tipo} ${item.espessura} mm`;
        const c = `${item.tipo} ${item.espessura} mm|${item.ralInferior}/${item.ralSuperior}`;
        porEspessura[e] = (porEspessura[e] || 0) + item.totalMetros;
        porCor[c] = (porCor[c] || 0) + item.totalMetros;
    });
    return {
        porEspessura: Object.entries(porEspessura).map(([nome,total]) => ({ nome, total:Number(total.toFixed(2)) })),
        porCor: Object.entries(porCor).map(([chave,total]) => { const [painel, cores] = chave.split('|'); return { painel, cores, total:Number(total.toFixed(2)) }; })
    };
}
function calcularTotalPlano(plano) {
    if (!plano) return 0;
    return Number((plano.gruposFinalizados.reduce((a,b)=>a+b.totalMetros,0) + plano.linhasAbertas.reduce((a,b)=>a+b.totalMetros,0)).toFixed(2));
}
function listarHistoricoPlano() {
    if (!alternarAbaPlano(true)) return;
    const c = document.getElementById('container-acao-plano');
    const agrupado = {};
    db_plano_hist.forEach(rel => {
        agrupado[rel.ano] ||= {};
        agrupado[rel.ano][rel.mes] ||= {};
        agrupado[rel.ano][rel.mes][rel.dia] ||= [];
        agrupado[rel.ano][rel.mes][rel.dia].push(rel);
    });
    let html = `<div style="color:white;"><div style="display:flex; align-items:center; margin-bottom:20px;"><button onclick="alternarAbaPlano(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;"><i class="fas fa-arrow-left"></i></button><h2 style="border-bottom:2px solid #E31C24; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">📂 Historico de Planos</h2></div>`;
    if (db_plano_hist.length === 0) html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum plano encontrado.</div>`;
    Object.keys(agrupado).sort((a,b)=>b-a).forEach(ano => {
        html += `<div style="margin-bottom:10px;"><div onclick="togglePlanoElemento('ano-plano-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;"><span>📁 ANO ${ano}</span><i class="fas fa-chevron-down"></i></div><div id="ano-plano-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">`;
        Object.keys(agrupado[ano]).sort((a,b)=>b-a).forEach(mes => {
            html += `<div onclick="togglePlanoElemento('mes-plano-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;"> 📅${MESES_PT[mes]}</div><div id="mes-plano-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">`;
            Object.keys(agrupado[ano][mes]).sort((a,b)=>b-a).forEach(dia => {
                html += `<div onclick="togglePlanoElemento('dia-plano-${ano}-${mes}-${dia}')" style="cursor:pointer; padding:10px; color:white; border-bottom:1px solid #334155;">DIA ${dia}/${String(mes).padStart(2,'0')}</div><div id="dia-plano-${ano}-${mes}-${dia}" style="display:none; padding:8px 0 8px 10px;">`;
                agrupado[ano][mes][dia].forEach(rel => {
                    html += `<div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><span style="font-size:13px;"><b style="color:white;">${rel.data}</b><br><small style="color:#94a3b8;">${Number(rel.totalGeral || 0).toFixed(2)} m</small></span><button onclick='gerarPDF_Plano("${encodeURIComponent(JSON.stringify(rel))}")' style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">PDF</button></div>`;
                });
                html += `</div>`;
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    });
    c.innerHTML = html + `</div>`;
}
function renderizarMenuPlanoNovo() {
    const render = document.getElementById('render-modulo');
    if (!render) return;

    render.innerHTML = `
        <div id="container-menu-plano" style="display:grid; grid-template-columns:repeat(2, minmax(260px, 420px)); gap:18px; padding:15px; align-items:stretch; justify-content:center;">
            ${usuarioPodeCriarPlano() ? `
            <div class="card" onclick="exibirMenuCriacaoPlano()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155; min-height:150px;">
                <i class="fas fa-plus" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Criar Plano</span>
                <small style="color:#94a3b8;">Pedidos e stock</small>
            </div>` : ''}

            <div class="card" onclick="listarHistoricoPlano()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155; min-height:150px;">
                <i class="fas fa-history" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Historico</span>
                <small style="color:#94a3b8;">Planos finalizados</small>
            </div>

            ${usuarioPodeVerAnalisePlano() ? `
            <div class="card plano-card-comprador" onclick="abrirMenuHistoricoComprador()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155; min-height:150px; grid-column:1 / -1; width:min(420px, 100%); justify-self:center;">
                <i class="fas fa-chart-pie" style="color:#10b981; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Historico por Comprador</span>
                <small style="color:#94a3b8;">Resumo mensal e anual da empresa</small>
            </div>` : ''}
        </div>

        <div id="container-acao-plano" style="display:none; padding:15px;"></div>
    `;
}

function normalizarIdPlano(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

function abrirMenuHistoricoComprador() {
    if (!usuarioPodeVerAnalisePlano()) return alert('Sem permissao.');
    if (!alternarAbaPlano(true)) return;

    const c = document.getElementById('container-acao-plano');
    if (!c) return;

    c.innerHTML = `
        <div style="color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="alternarAbaPlano(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2 style="border-bottom:2px solid #10b981; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                    Historico por Comprador
                </h2>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="card" onclick="listarAnaliseMensalComprador()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                    <i class="fas fa-calendar-alt" style="color:#3b82f6; font-size:2.2rem; margin-bottom:12px;"></i>
                    <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Historico Mensal</span>
                    <small style="color:#94a3b8;">Clientes e compras do mes</small>
                </div>

                <div class="card" onclick="listarAnaliseAnualComprador()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                    <i class="fas fa-trophy" style="color:#10b981; font-size:2.2rem; margin-bottom:12px;"></i>
                    <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Historico Anual</span>
                    <small style="color:#94a3b8;">Ranking anual dos compradores</small>
                </div>
            </div>
        </div>
    `;
}

function gerarBaseResumoCompradores() {
    const mensal = {};
    const anual = {};

    db_plano_hist.forEach(rel => {
        const chaveMes = `${rel.ano}-${String(rel.mes).padStart(2, '0')}`;
        const chaveAno = String(rel.ano);

        if (!mensal[chaveMes]) mensal[chaveMes] = {};
        if (!anual[chaveAno]) anual[chaveAno] = {};

        rel.itens
            .filter(item => item.modo === 'pedido' && item.destino)
            .forEach(item => {
                const destino = item.destino;
                const tipo = item.tipo;
                const ral = `${item.ralInferior}/${item.ralSuperior}`;

                if (!mensal[chaveMes][destino]) {
                    mensal[chaveMes][destino] = { total: 0, tipos: {}, rals: {}, itens: [] };
                }
                if (!anual[chaveAno][destino]) {
                    anual[chaveAno][destino] = { total: 0, tipos: {}, rals: {}, itens: [] };
                }

                mensal[chaveMes][destino].total += item.totalMetros;
                anual[chaveAno][destino].total += item.totalMetros;

                if (!mensal[chaveMes][destino].tipos[tipo]) mensal[chaveMes][destino].tipos[tipo] = 0;
                if (!anual[chaveAno][destino].tipos[tipo]) anual[chaveAno][destino].tipos[tipo] = 0;

                mensal[chaveMes][destino].tipos[tipo] += item.totalMetros;
                anual[chaveAno][destino].tipos[tipo] += item.totalMetros;

                const chaveRalMensal = `${tipo}|${ral}`;
                const chaveRalAnual = `${tipo}|${ral}`;

                if (!mensal[chaveMes][destino].rals[chaveRalMensal]) mensal[chaveMes][destino].rals[chaveRalMensal] = 0;
                if (!anual[chaveAno][destino].rals[chaveRalAnual]) anual[chaveAno][destino].rals[chaveRalAnual] = 0;

                mensal[chaveMes][destino].rals[chaveRalMensal] += item.totalMetros;
                anual[chaveAno][destino].rals[chaveRalAnual] += item.totalMetros;

                mensal[chaveMes][destino].itens.push(item);
                anual[chaveAno][destino].itens.push(item);
            });
    });

    return { mensal, anual };
}

function listarAnaliseMensalComprador() {
    if (!usuarioPodeVerAnalisePlano()) return alert('Sem permissao.');
    if (!alternarAbaPlano(true)) return;

    const c = document.getElementById('container-acao-plano');
    if (!c) return;

    const { mensal } = gerarBaseResumoCompradores();

    let html = `
        <div style="color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="abrirMenuHistoricoComprador()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2 style="border-bottom:2px solid #10b981; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                    Historico Mensal por Comprador
                </h2>
            </div>
    `;

    const mesesOrdenados = Object.keys(mensal).sort().reverse();

    if (mesesOrdenados.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum dado mensal encontrado.</div>`;
    }

    mesesOrdenados.forEach(chaveMes => {
        const [ano, mes] = chaveMes.split('-');
        const clientes = mensal[chaveMes];

        html += `
            <div style="margin-bottom:10px;">
                <div onclick="togglePlanoElemento('mensal-${chaveMes}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                    <span>${MESES_PT[parseInt(mes, 10)]} / ${ano}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="mensal-${chaveMes}" style="display:none; margin-top:8px;">
        `;

        Object.keys(clientes)
            .sort((a, b) => clientes[b].total - clientes[a].total)
            .forEach((destino, index) => {
                const dados = clientes[destino];
                const idCliente = `mensal-${chaveMes}-${normalizarIdPlano(destino)}`;
                const payload = encodeURIComponent(JSON.stringify({
                    periodoTipo: 'mensal',
                    periodoLabel: `${MESES_PT[parseInt(mes, 10)]} / ${ano}`,
                    comprador: destino,
                    total: dados.total,
                    tipos: dados.tipos,
                    rals: dados.rals,
                    ranking: index + 1
                }));

                html += `
                    <div style="background:#111827; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">
                        <div onclick="togglePlanoElemento('${idCliente}')" style="padding:12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                            <span><b>#${index + 1} ${destino}</b></span>
                            <span style="color:#10b981; font-weight:bold;">${dados.total.toFixed(2)} m</span>
                        </div>

                        <div id="${idCliente}" style="display:none; padding:12px; border-top:1px solid #334155;">
                            <div style="margin-bottom:10px; color:#94a3b8; font-size:12px;">
                                ${Object.entries(dados.tipos)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([tipo, total]) => `${tipo}: ${total.toFixed(2)} m`)
                                    .join(' | ')}
                            </div>

                            <div style="margin-bottom:10px; color:white; font-size:12px;">
                                ${Object.entries(dados.rals)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([chaveRal, total]) => {
                                        const [tipo, ral] = chaveRal.split('|');
                                        return `<div>${tipo} - ${ral}: <b>${total.toFixed(2)} m</b></div>`;
                                    }).join('')}
                            </div>

                            <button onclick="gerarPDFResumoComprador('${payload}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                                PDF
                            </button>
                        </div>
                    </div>
                `;
            });

        html += `</div></div>`;
    });

    c.innerHTML = html + `</div>`;
}
function listarAnaliseAnualComprador() {
    if (!usuarioPodeVerAnalisePlano()) return alert('Sem permissao.');
    if (!alternarAbaPlano(true)) return;

    const c = document.getElementById('container-acao-plano');
    if (!c) return;

    const { anual } = gerarBaseResumoCompradores();

    let html = `
        <div style="color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="abrirMenuHistoricoComprador()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2 style="border-bottom:2px solid #10b981; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                    Historico Anual por Comprador
                </h2>
            </div>
    `;

    const anosOrdenados = Object.keys(anual).sort().reverse();

    if (anosOrdenados.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum dado anual encontrado.</div>`;
    }

    anosOrdenados.forEach(ano => {
        const clientes = anual[ano];

        html += `
            <div style="margin-bottom:10px;">
                <div onclick="togglePlanoElemento('anual-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                    <span>ANO ${ano}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="anual-${ano}" style="display:none; margin-top:8px;">
        `;

        Object.keys(clientes)
            .sort((a, b) => clientes[b].total - clientes[a].total)
            .forEach((destino, index) => {
                const dados = clientes[destino];
                const idCliente = `anual-${ano}-${normalizarIdPlano(destino)}`;
                const payload = encodeURIComponent(JSON.stringify({
                    periodoTipo: 'anual',
                    periodoLabel: `ANO ${ano}`,
                    comprador: destino,
                    total: dados.total,
                    tipos: dados.tipos,
                    rals: dados.rals,
                    ranking: index + 1
                }));

                html += `
                    <div style="background:#111827; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">
                        <div onclick="togglePlanoElemento('${idCliente}')" style="padding:12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                            <span><b>#${index + 1} ${destino}</b></span>
                            <span style="color:#10b981; font-weight:bold;">${dados.total.toFixed(2)} m</span>
                        </div>

                        <div id="${idCliente}" style="display:none; padding:12px; border-top:1px solid #334155;">
                            <div style="margin-bottom:10px; color:#94a3b8; font-size:12px;">
                                ${Object.entries(dados.tipos)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([tipo, total]) => `${tipo}: ${total.toFixed(2)} m`)
                                    .join(' | ')}
                            </div>

                            <div style="margin-bottom:10px; color:white; font-size:12px;">
                                ${Object.entries(dados.rals)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([chaveRal, total]) => {
                                        const [tipo, ral] = chaveRal.split('|');
                                        return `<div>${tipo} - ${ral}: <b>${total.toFixed(2)} m</b></div>`;
                                    }).join('')}
                            </div>

                            <button onclick="gerarPDFResumoComprador('${payload}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                                PDF
                            </button>
                        </div>
                    </div>
                `;
            });

        html += `</div></div>`;
    });

    c.innerHTML = html + `</div>`;
}


function gerarPDFResumoComprador(dadosEncoded) {
    const dados = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');

    if (!janela) {
        alert('O navegador bloqueou a abertura do PDF.');
        return;
    }

    const htmlTipos = Object.entries(dados.tipos || {})
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, total]) => `
            <tr>
                <td style="border:2px solid #000; text-align:center;">${tipo}</td>
                <td style="border:2px solid #000; text-align:center; font-weight:bold;">${Number(total).toFixed(2)} m</td>
            </tr>
        `).join('');

    const htmlRals = Object.entries(dados.rals || {})
        .sort((a, b) => b[1] - a[1])
        .map(([chaveRal, total]) => {
            const [tipo, ral] = chaveRal.split('|');
            return `
                <tr>
                    <td style="border:2px solid #000; text-align:center;">${tipo}</td>
                    <td style="border:2px solid #000; text-align:center;">${ral}</td>
                    <td style="border:2px solid #000; text-align:center; font-weight:bold;">${Number(total).toFixed(2)} m</td>
                </tr>
            `;
        }).join('');

    janela.document.write(`
        <html>
        <head>
            <title>Resumo Comprador</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                table { width:100%; border-collapse:collapse; margin-top:15px; }
                th, td { padding:8px; }
                @media print {
                    .no-print { display:none !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; border-bottom:5px solid #E31C24; background:#000; color:#fff; padding:15px; align-items:center;">
                <div><b style="font-size:22px;">ATLAS PAINEL</b><br>RESUMO POR COMPRADOR</div>
                <div style="text-align:right; font-weight:bold;">${dados.periodoLabel}<br>${dados.comprador}</div>
            </div>

            <div style="margin-top:20px; background:#f1f5f9; padding:12px; border:2px solid #000; text-align:center; font-weight:bold;">
                ${dados.periodoTipo === 'anual' ? `RANKING #${dados.ranking} - ` : ''}${dados.comprador} - TOTAL ${Number(dados.total).toFixed(2)} m
            </div>

            <div style="margin-top:20px;">
                <div style="background:#000; color:#fff; padding:8px; text-align:center; font-weight:bold; border:2px solid #000;">TOTAIS POR TIPO DE CHAPA</div>
                <table>
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">Tipo</th>
                            <th style="border:2px solid #000;">Metros</th>
                        </tr>
                    </thead>
                    <tbody>${htmlTipos}</tbody>
                </table>
            </div>

            <div style="margin-top:20px;">
                <div style="background:#000; color:#fff; padding:8px; text-align:center; font-weight:bold; border:2px solid #000;">DETALHES POR RAL</div>
                <table>
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">Tipo</th>
                            <th style="border:2px solid #000;">RAL</th>
                            <th style="border:2px solid #000;">Metros</th>
                        </tr>
                    </thead>
                    <tbody>${htmlRals}</tbody>
                </table>
            </div>

            <div class="no-print" style="margin-top:20px; text-align:center;">
                <button onclick="window.print()" style="padding:20px; background:#000; color:#fff; border:3px solid #E31C24; width:100%; font-size:18px; font-weight:bold; border-radius:10px;">
                    CONFIRMAR E GERAR PDF
                </button>
            </div>
        </body>
        </html>
    `);

    janela.document.close();
}

function visualizarPlanoDigital(dadosEncoded) {
    gerarPDF_Plano(dadosEncoded);
}
function gerarPDF_Plano(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    janela.document.write(montarHTMLPlano(rel, true));
    janela.document.close();
}
function montarHTMLPlano(rel, comBotaoImpressao) {
    const gruposPorPainel = {};

    rel.itens.forEach(item => {
        const painel = `${item.tipo} ${item.espessura} mm`;
        if (!gruposPorPainel[painel]) gruposPorPainel[painel] = [];

        gruposPorPainel[painel].push(item);
    });

    let htmlGrupos = '';

    Object.keys(gruposPorPainel).forEach(nomePainel => {
        const itensPainel = gruposPorPainel[nomePainel];

        const pedidosAgrupados = {};
        const stockAgrupado = [];

        itensPainel.forEach(item => {
            if (item.modo === 'pedido') {
                const chavePedido = `${item.pedidoNumero}|||${item.destino}`;
                if (!pedidosAgrupados[chavePedido]) pedidosAgrupados[chavePedido] = [];
                pedidosAgrupados[chavePedido].push(item);
            } else {
                stockAgrupado.push(item);
            }
        });

        htmlGrupos += `
            <div style="margin-bottom:24px; page-break-inside:avoid;">
                <div style="background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; font-size:16px; border:2px solid #000;">
                    ${nomePainel.toUpperCase()}
                </div>
        `;

        Object.keys(pedidosAgrupados).forEach(chavePedido => {
            const itensPedido = pedidosAgrupados[chavePedido];

            itensPedido.sort((a, b) => Number(b.metrosUnidade) - Number(a.metrosUnidade));

            const pedidoNumero = itensPedido[0].pedidoNumero || 'S/N';
const destino = itensPedido[0].destino || '';
const totalPedido = itensPedido.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);

htmlGrupos += `
    <div style="margin-top:12px; background:#f1f5f9; color:#000; padding:8px; text-align:center; font-weight:bold; border:2px solid #000; border-bottom:none;">
        PEDIDO ${pedidoNumero}${destino ? ' - ' + destino : ''} - TOTAL ${totalPedido.toFixed(2)} m
    </div>

                <table style="width:100%; border-collapse:collapse; font-size:13px; color:#000; margin-bottom:12px;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">RAL</th>
                            <th style="border:2px solid #000;">Qtd</th>
                            <th style="border:2px solid #000;">Mts Un.</th>
                            <th style="border:2px solid #000;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensPedido.map(item => `
    <tr>
        <td style="border:2px solid #000; text-align:center;">${item.ralInferior}/${item.ralSuperior}</td>
        <td style="border:2px solid #000; text-align:center;">${item.quantidadeChapas} un.</td>
        <td style="border:2px solid #000; text-align:center; font-weight:bold;">${formatarMedidaRelatorio(item.metrosUnidade)}</td>
        <td style="border:2px solid #000; text-align:center; font-weight:bold;">${formatarTotalRelatorio(item.totalMetros)}</td>
  </tr>
`).join('')}

                    </tbody>
                </table>
            `;
        });

        if (stockAgrupado.length > 0) {
            stockAgrupado.sort((a, b) => Number(b.metrosUnidade) - Number(a.metrosUnidade));

            htmlGrupos += `
                <div style="margin-top:12px; background:#f1f5f9; color:#000; padding:8px; text-align:center; font-weight:bold; border:2px solid #000; border-bottom:none;">
                    STOCK
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:13px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">Qualidade</th>
                            <th style="border:2px solid #000;">RAL</th>
                            <th style="border:2px solid #000;">Qtd</th>
                            <th style="border:2px solid #000;">Mts Un.</th>
                            <th style="border:2px solid #000;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stockAgrupado.map(item => `
                            <tr>
                                <td style="border:2px solid #000; text-align:center;">${item.qualidade || '-'}</td>
                                <td style="border:2px solid #000; text-align:center;">${item.ralInferior}/${item.ralSuperior}</td>
                                <td style="border:2px solid #000; text-align:center;">${item.quantidadeChapas} un.</td>
                                <td style="border:2px solid #000; text-align:center; font-weight:bold;">${formatarMedidaRelatorio(item.metrosUnidade)}</td>
                               <td style="border:2px solid #000; text-align:center; font-weight:bold;">${formatarTotalRelatorio(item.totalMetros)}</td>

                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        htmlGrupos += `</div>`;
    });

    const resumoCores = (rel.resumo?.porCor || []).map(item => `
        <tr>
            <td style="border:2px solid #000; text-align:center;">${item.painel}</td>
            <td style="border:2px solid #000; text-align:center;">${item.cores}</td>
            <td style="border:2px solid #000; text-align:center; font-weight:bold;">${item.total.toFixed(2)} m</td>
        </tr>
    `).join('');

    const resumoEsp = (rel.resumo?.porEspessura || []).map(item => `
        <tr>
            <td style="border:2px solid #000; text-align:center;">${item.nome}</td>
            <td style="border:2px solid #000; text-align:center; font-weight:bold;">${item.total.toFixed(2)} m</td>
        </tr>
    `).join('');

    return `
        <html>
        <head>
            <title>Plano de Relatorio</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                table { width: 100%; border-collapse: collapse; }
                table tr td, table tr th { padding: 8px; }
                @media print {
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; border-bottom:5px solid #E31C24; background:#000; color:#fff; padding:15px; align-items:center;">
                <div><b style="font-size:22px;">ATLAS PAINEL</b><br>PLANO DE RELATORIO</div>
                <div style="text-align:right; font-weight:bold;">DATA: ${rel.data}<br>OP: ${rel.operador}</div>
            </div>

            <div style="margin-top:20px;">${htmlGrupos}</div>

            <div style="margin-top:30px;">
                <div style="background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; font-size:16px; border:2px solid #000;">RESUMO POR COR</div>
                <table style="font-size:13px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">Painel</th>
                            <th style="border:2px solid #000;">RAL INF / SUP</th>
                            <th style="border:2px solid #000;">Metros</th>
                        </tr>
                    </thead>
                    <tbody>${resumoCores}</tbody>
                </table>
            </div>

            <div style="margin-top:30px;">
                <div style="background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; font-size:16px; border:2px solid #000;">TOTAIS DO PLANO</div>
                <table style="font-size:13px; color:#000;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="border:2px solid #000;">Grupo</th>
                            <th style="border:2px solid #000;">Metros Totais</th>
                        </tr>
                    </thead>
                    <tbody>${resumoEsp}</tbody>
                </table>
            </div>

            <div style="margin-top:20px; background:#000; color:#fff; padding:20px; text-align:right; border:3px solid #000;">
                <span style="font-size:18px; font-weight:normal; text-transform:uppercase; display:block; margin-bottom:5px;">Total Geral do Plano</span>
                <b style="font-size:35px; display:block; line-height:1;">${Number(rel.totalGeral).toFixed(2)} m</b>
            </div>

            ${comBotaoImpressao ? `
                <div class="no-print" style="text-align:center; margin-top:20px;">
                    <button onclick="window.print()" style="padding:20px; background:#000; color:#fff; border:3px solid #E31C24; width:100%; font-size:18px; font-weight:bold; border-radius:10px;">
                        CONFIRMAR E GERAR PDF
                    </button>
                </div>
            ` : ''}
        </body>
        </html>
    `;
}
function formatarMedidaRelatorio(metros) {
    const valor = Number(metros || 0);
    const mm = Math.round(valor * 1000);

    return `${mm}`;
}
function formatarTotalRelatorio(metros) {
    const valor = Number(metros || 0);
    const mm = Math.round(valor * 1000);

    let metrosTexto = valor.toFixed(2).replace('.', ',');
    metrosTexto = metrosTexto.replace(/,00$/, '');
    metrosTexto = metrosTexto.replace(/(\,\d*[1-9])0$/, '$1');

    return `${mm} (${metrosTexto} metros)`;
}
// final do modulo plano 

// incio dos ajustes
function renderizarMenuAjustes() {
    const render = document.getElementById('render-modulo');
    if (!render || !usuarioLogado) return;

    render.innerHTML = `
        <div id="menu-ajustes" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; padding:15px;">
            <div class="card" onclick="abrirAjustesUsuario()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-user-cog" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Usuário</span>
                <small style="color:#94a3b8;">Senha, tema e módulos</small>
            </div>

            <div class="card" onclick="abrirAjustesBackup()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-database" style="color:#10b981; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Backup</span>
                <small style="color:#94a3b8;">Exportar e importar dados</small>
            </div>

            <div class="card" onclick="abrirAtualizacaoUsuarioAtlas()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                <i class="fas fa-rotate" style="color:#f59e0b; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Atualizacao</span>
                <small style="color:#94a3b8;">Versao e aparelho</small>
            </div>

            ${usuarioEhAdminSupervisor() ? `<div class="card" onclick="abrirAjustesSistema()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155; grid-column:1 / -1;">
                <i class="fas fa-sliders-h" style="color:#f59e0b; font-size:2.5rem; margin-bottom:15px;"></i>
                <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Sistema</span>
                <small style="color:#94a3b8;">Ferramentas e ajustes gerais</small>
            </div>` : ''}
        </div>

        <div id="conteudo-ajustes" style="display:none; padding:15px;"></div>
    `;
}

function alternarAbaAjustes(mostrarConteudo) {
    const menu = document.getElementById('menu-ajustes');
    const conteudo = document.getElementById('conteudo-ajustes');
    if (!menu || !conteudo) return false;

    menu.style.display = mostrarConteudo ? 'none' : 'grid';
    conteudo.style.display = mostrarConteudo ? 'block' : 'none';

    if (!mostrarConteudo) conteudo.innerHTML = '';
    return true;
}

function abrirAjustesUsuario() {
    if (!usuarioLogado) return;
    if (!alternarAbaAjustes(true)) return;

    const preferencias = obterPreferenciasUsuario(usuarioLogado.id);
    const podeGerirGestao = usuarioLogado.cargo === 'admin' || usuarioLogado.cargo === 'supervisor';
    const c = document.getElementById('conteudo-ajustes');
    if (!c) return;

    const modulosPermitidosUsuario = (preferencias.modulosVisiveis || [])
        .filter(chave => chave !== 'config')
        .filter(chave => chave !== 'permissoes');
    const modulosOcultosUsuario = preferencias.modulosOcultosUsuario || [];

    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button onclick="alternarAbaAjustes(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="border-bottom:2px solid #3b82f6; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                Ajustes do Usuário
            </h2>
        </div>

        <div style="display:flex; flex-direction:column; gap:15px; max-width:900px; margin:0 auto;">
            ${atlasHTMLStatusAtualizacaoUsuario()}

            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:15px;">Conta</h3>
                <div style="font-size:13px; color:#94a3b8; margin-bottom:15px;">
                    ID: <b style="color:white;">${usuarioLogado.id.toUpperCase()}</b><br>
                    Cargo: <b style="color:white;">${usuarioLogado.cargo.toUpperCase()}</b>
                </div>

                <input type="password" id="senha-atual-ajustes" placeholder="Senha atual" style="width:100%; margin-bottom:10px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <input type="password" id="nova-senha-ajustes" placeholder="Nova senha" style="width:100%; margin-bottom:10px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <input type="password" id="confirmar-senha-ajustes" placeholder="Confirmar nova senha" style="width:100%; margin-bottom:10px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">

                <button onclick="alterarMinhaSenha()" style="width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                    ALTERAR SENHA
                </button>
            </div>

            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:15px;">Aparência</h3>

                <select id="seletor-tema-ajustes" style="width:100%; margin-bottom:12px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="escuro" ${preferencias.tema === 'escuro' ? 'selected' : ''}>Modo escuro</option>
                    <option value="claro" ${preferencias.tema === 'claro' ? 'selected' : ''}>Modo claro</option>
                </select>

                <button onclick="salvarTemaUsuario()" style="width:100%; background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                    CONFIRMAR TEMA
                </button>
            </div>

            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:15px;">Meus módulos</h3>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">
                    ${MODULOS_SISTEMA
                        .filter(mod => modulosPermitidosUsuario.includes(mod.chave))
                        .filter(mod => mod.chave !== 'gestao' || podeGerirGestao)
                        .map(mod => `
                            <label style="display:flex; align-items:center; gap:10px; background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155; cursor:pointer;">
                                <input class="check-modulo-ajustes" type="checkbox" value="${mod.chave}" ${!modulosOcultosUsuario.includes(mod.chave) ? 'checked' : ''} style="width:auto;">
                                <span>${mod.nome}</span>
                            </label>
                        `).join('') || '<div style="color:#94a3b8;">Nenhum modulo liberado pelo admin.</div>'}
                </div>

                <button onclick="salvarModulosVisiveis()" style="width:100%; background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                    CONFIRMAR MÓDULOS
                </button>
            </div>
        </div>
    `;
}

function atlasInfoAtualizacaoUsuario() {
    const local = {
        versao: window.ATLAS_SISTEMA_VERSAO || 'sem-versao',
        build: Number(window.ATLAS_SISTEMA_BUILD || 0)
    };
    const publicada = atlasJSONLocal('atlas_atualizacao_global_info', null)
        || atlasJSONLocal('atlas_versao_publicada_info', null)
        || local;
    const buildPublicado = Number(publicada.build || 0);
    const pendente = buildPublicado > local.build;
    return {
        local,
        publicada,
        pendente,
        texto: pendente ? 'ATUALIZACAO PENDENTE' : 'SISTEMA ATUALIZADO',
        cor: pendente ? '#f59e0b' : '#22c55e'
    };
}

function atlasHTMLStatusAtualizacaoUsuario() {
    const info = atlasInfoAtualizacaoUsuario();
    return `
        <div style="background:#1e293b; border:1px solid ${info.pendente ? '#f59e0b' : '#22c55e'}; border-left:5px solid ${info.cor}; border-radius:12px; padding:20px;">
            <h3 style="margin-top:0; margin-bottom:10px;">Atualizacao do sistema</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; color:#bfdbfe; margin-bottom:12px;">
                <div>Status: <b style="color:${info.cor};">${info.texto}</b></div>
                <div>Sua versao: <b>${atlasTextoSeguroSaude(info.local.versao)}</b></div>
                <div>Versao publicada: <b>${atlasTextoSeguroSaude(info.publicada.versao || '-')}</b></div>
                <div>Publicada em: <b>${atlasTextoSeguroSaude(info.publicada.solicitadoEm || info.publicada.publicadaEm || '-')}</b></div>
            </div>
            ${info.pendente ? `
                <button onclick="window.atlasExecutarAtualizacaoAparelho && window.atlasExecutarAtualizacaoAparelho()" style="width:100%; background:#10b981; color:white; border:none; padding:13px; border-radius:8px; font-weight:900; cursor:pointer;">
                    ATUALIZAR AGORA
                </button>
            ` : `
                <button onclick="atlasChecarAtualizacaoGlobalLocal(); alert('Sistema verificado. Voce esta na versao atual.')" style="width:100%; background:#2563eb; color:white; border:none; padding:13px; border-radius:8px; font-weight:900; cursor:pointer;">
                    VERIFICAR ATUALIZACAO
                </button>
            `}
        </div>
    `;
}

async function abrirAtualizacaoUsuarioAtlas() {
    if (!usuarioLogado) return;
    if (!alternarAbaAjustes(true)) return;
    atlasRegistrarDispositivoAtual();
    atlasChecarAtualizacaoGlobalLocal();

    const c = document.getElementById('conteudo-ajustes');
    if (!c) return;

    let htmlAdmin = '';
    if (usuarioEhAdmin()) {
        const dispositivos = await atlasObterDispositivosSaudeSistema();
        const pedidos = atlasJSONLocal('atlas_atualizacoes_solicitadas_local', {});
        const antigos = dispositivos.filter(dispositivo => {
            const usuario = (usuariosSistema || []).find(item => atlasDispositivoPertenceAoUsuario(dispositivo, item))
                || { id: dispositivo.usuario, nome: dispositivo.nome };
            const status = atlasStatusDispositivoSaude(dispositivo);
            const info = atlasInfoAtualizacaoPessoaSaude(usuario, [dispositivo], pedidos[atlasIdUsuarioNormalizado(usuario.id)], status);
            return info.chave === 'pendente';
        });
        htmlAdmin = `
            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:12px;">Aparelhos pendentes</h3>
                ${antigos.length ? `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${antigos.map(dispositivo => {
                            const desc = atlasDescricaoAparelhoSaude(dispositivo);
                            return `
                                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; align-items:center; background:#0f172a; border:1px solid #334155; border-left:5px solid #ef4444; border-radius:10px; padding:12px;">
                                    <div><b>${atlasTextoSeguroSaude(dispositivo.usuario || '-')}</b><div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(dispositivo.nome || '')}</div></div>
                                    <div><b>${atlasTextoSeguroSaude(desc.titulo)}</b><div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(desc.subtitulo)}</div></div>
                                    <div><b style="color:#ef4444;">ANTIGO</b><div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(dispositivo.versao || '-')}</div></div>
                                    <button onclick="atlasSolicitarAtualizacaoDispositivo('${atlasJSStringSaude(dispositivo.id || '')}', '${atlasJSStringSaude(dispositivo.usuario || '')}')" style="padding:10px; border:none; border-radius:8px; background:#2563eb; color:white; font-weight:900; cursor:pointer;">AVISAR</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `<div style="color:#22c55e; font-weight:900;">Todos os aparelhos registrados estao na versao atual.</div>`}
            </div>
        `;
    }

    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button onclick="alternarAbaAjustes(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="border-bottom:2px solid #f59e0b; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                Atualizacao
            </h2>
        </div>
        <div style="display:flex; flex-direction:column; gap:15px; max-width:980px; margin:0 auto;">
            ${atlasHTMLStatusAtualizacaoUsuario()}
            ${htmlAdmin}
        </div>
    `;
}

function alterarMinhaSenha() {
    if (!usuarioLogado) return alert('Usuario nao encontrado.');

    const senhaAtual = document.getElementById('senha-atual-ajustes')?.value.trim();
    const novaSenha = document.getElementById('nova-senha-ajustes')?.value.trim();
    const confirmarSenha = document.getElementById('confirmar-senha-ajustes')?.value.trim();

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        alert('Preencha a senha atual, a nova senha e a confirmacao.');
        return;
    }

    const indice = usuariosSistema.findIndex(u => String(u.id).toLowerCase() === String(usuarioLogado.id).toLowerCase());
    if (indice < 0) {
        alert('Usuario nao encontrado na lista.');
        return;
    }

    if (String(usuariosSistema[indice].senha) !== String(senhaAtual)) {
        alert('Senha atual incorreta.');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        alert('A nova senha e a confirmacao nao conferem.');
        return;
    }

    marcarUsuarioAlteradoAtlas(usuariosSistema[indice]);
    usuariosSistema[indice].senha = novaSenha;
    usuarioLogado = usuariosSistema[indice];
    window.usuarioLogado = usuarioLogado;
    localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();

    document.getElementById('senha-atual-ajustes').value = '';
    document.getElementById('nova-senha-ajustes').value = '';
    document.getElementById('confirmar-senha-ajustes').value = '';
    alert('Senha alterada com sucesso.');
}

function abrirAjustesBackup() {
    if (!alternarAbaAjustes(true)) return;

    const c = document.getElementById('conteudo-ajustes');
    if (!c) return;

    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button onclick="alternarAbaAjustes(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="border-bottom:2px solid #10b981; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                Backup do Sistema
            </h2>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:10px;">Exportar</h3>
                <p style="color:#94a3b8; font-size:13px; margin-bottom:15px;">Baixa um arquivo com todos os dados salvos no navegador.</p>
                <button onclick="exportarBackupSistema()" style="width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                    EXPORTAR BACKUP
                </button>
            </div>

            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
                <h3 style="margin-top:0; margin-bottom:10px;">Importar</h3>
                <p style="color:#94a3b8; font-size:13px; margin-bottom:15px;">Restaura um backup salvo anteriormente.</p>
                <input type="file" id="arquivo-backup" accept=".json" style="width:100%; margin-bottom:10px; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <button onclick="importarBackupSistema()" style="width:100%; background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                    IMPORTAR BACKUP
                </button>
            </div>
        </div>

        <div style="background:#3b1d1d; border:1px solid #ef4444; border-radius:12px; padding:20px; margin-top:15px;">
            <h3 style="margin-top:0; margin-bottom:10px; color:#fecaca;">Recuperacao de emergencia</h3>
            <p style="color:#fecaca; font-size:13px; margin-bottom:15px;">Tenta recuperar relatorios e stock salvos nas colecoes do Firebase quando o backup principal ficou vazio.</p>
            <button onclick="atlasExecutarBackupFirebase('atlasFirebaseRestaurarRelatoriosDaNuvem')" style="width:100%; background:#dc2626; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                RESTAURAR RELATORIOS DA NUVEM
            </button>
            <button onclick="atlasExecutarBackupFirebase('atlasFirebaseDiagnosticarRecuperacao')" style="width:100%; background:#7f1d1d; color:white; border:1px solid #fca5a5; padding:12px; border-radius:8px; font-weight:bold; margin-top:10px;">
                VER DIAGNOSTICO DE DADOS
            </button>
            <button onclick="atlasExecutarBackupFirebase('atlasFirebaseRestaurarUltimoSnapshotLocal')" style="width:100%; background:#991b1b; color:white; border:1px solid #fecaca; padding:12px; border-radius:8px; font-weight:bold; margin-top:10px;">
                RESTAURAR SNAPSHOT LOCAL
            </button>
        </div>
    `;
}

function atlasAguardarFirebaseBackup(nomeFuncao, limiteMs = 15000) {
    if (typeof window[nomeFuncao] === 'function') return Promise.resolve(true);

    return new Promise(resolve => {
        const inicio = Date.now();
        let timer = null;

        const limpar = resultado => {
            window.removeEventListener('atlasFirebasePronto', aoPronto);
            clearInterval(timer);
            resolve(resultado);
        };

        const verificar = () => {
            if (typeof window[nomeFuncao] === 'function') {
                limpar(true);
                return;
            }
            if (Date.now() - inicio >= limiteMs) limpar(false);
        };

        const aoPronto = () => verificar();
        window.addEventListener('atlasFirebasePronto', aoPronto);
        timer = setInterval(verificar, 300);
        verificar();
    });
}

async function atlasExecutarBackupFirebase(nomeFuncao) {
    const pronto = await atlasAguardarFirebaseBackup(nomeFuncao);
    if (!pronto) {
        alert('Firebase nao carregou. Atualize a pagina e confirme se o aparelho esta com internet.');
        return;
    }
    return window[nomeFuncao]();
}

function abrirAjustesSistema() {
    if (!usuarioEhAdminSupervisor()) return alert('Apenas ADMIN ou SUPERVISOR podem acessar os ajustes do sistema.');
    if (!alternarAbaAjustes(true)) return;

    const c = document.getElementById('conteudo-ajustes');
    if (!c) return;

    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button onclick="alternarAbaAjustes(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="border-bottom:2px solid #f59e0b; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                Ajustes do Sistema
            </h2>
        </div>

        ${usuarioEhAdmin() ? `
            <button onclick="abrirSaudeSistemaAtlas()" style="width:100%; display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:15px; padding:18px; background:#0f172a; color:white; border:1px solid #3b82f6; border-radius:12px; font-weight:900; text-transform:uppercase; cursor:pointer;">
                <i class="fas fa-heartbeat" style="color:#22c55e; font-size:24px;"></i>
                Saude do Sistema
            </button>
        ` : ''}

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            ${htmlEditorListaSistema('Clientes / destinos', 'atlas_plano_destinos', destinosPlano, 'destinosPlano')}
            ${htmlEditorListaSistema('Tipos de chapa / painel', 'atlas_config_tipos_painel', OPCOES_TIPO_PLANO, 'OPCOES_TIPO_PLANO')}
            ${htmlEditorListaSistema('RAL inferior', 'atlas_config_ral_inferior', OPCOES_RAL_INF, 'OPCOES_RAL_INF')}
            ${htmlEditorListaSistema('RAL superior', 'atlas_config_ral_superior', OPCOES_RAL_SUP, 'OPCOES_RAL_SUP')}
            ${htmlEditorListaSistema('Espessura de chapa opcional', 'atlas_config_esp_chapa', OPCOES_ESP_CHAPA, 'OPCOES_ESP_CHAPA')}
            ${htmlEditorListaSistema('Espessura da espuma - Injeção', 'atlas_config_espuma_injecao', OPCOES_ESPUMA_INJECAO, 'OPCOES_ESPUMA_INJECAO')}
            ${htmlEditorListaSistema('Fita - InjeÃ§Ã£o', 'atlas_config_fita_injecao', OPCOES_FITA_INJECAO, 'OPCOES_FITA_INJECAO')}
            ${htmlEditorListaSistema('Medidas de chapa - Stock', 'atlas_config_medidas_chapa_stock', OPCOES_MEDIDAS_CHAPA_STOCK, 'OPCOES_MEDIDAS_CHAPA_STOCK')}
            ${htmlEditorListaSistema('Fornecedores - Stock', 'atlas_config_fornecedores_stock', OPCOES_FORNECEDORES_STOCK, 'OPCOES_FORNECEDORES_STOCK')}
            ${htmlEditorListaSistema('Filmes - Stock / Bobines', 'atlas_config_filmes_stock', OPCOES_FILMES_STOCK, 'OPCOES_FILMES_STOCK')}
            ${htmlEditorMinimoStockSistema()}
            ${htmlEditorPacotesSerraSistema()}
        </div>
    `;
}

function atlasTextoSeguroSaude(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function atlasJSStringSaude(valor) {
    return String(valor ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

function atlasStatusDispositivoSaude(dispositivo) {
    const versaoAtual = window.ATLAS_SISTEMA_VERSAO || '';
    const ultimo = Number(dispositivo?.ultimoAcessoMs || 0);
    const segundos = ultimo ? ((Date.now() - ultimo) / 1000) : 999999;
    const online = segundos <= 600 && Number(dispositivo?.saiuEmMs || 0) < ultimo;
    const atualizado = String(dispositivo?.versao || '') === String(versaoAtual);
    return {
        online,
        atualizado,
        textoOnline: online ? 'ONLINE' : 'OFFLINE',
        textoVisto: ultimo ? atlasTempoRelativoSaude(ultimo) : 'nunca',
        textoVersao: atualizado ? 'ATUALIZADO' : 'ANTIGO',
        corOnline: online ? '#22c55e' : '#94a3b8',
        corVersao: atualizado ? '#22c55e' : '#ef4444'
    };
}

function atlasInfoAtualizacaoPessoaSaude(usuario, dispositivos = [], pedido = null, statusPrincipal = null) {
    const confirmacao = atlasConfirmacaoAtualizacaoUsuarioSaude(usuario, dispositivos, pedido);
    const infoGlobal = atlasJSONLocal('atlas_atualizacao_global_info', null) || atlasJSONLocal('atlas_versao_publicada_info', null);
    const temPedido = Boolean(pedido);
    const temAparelho = (dispositivos || []).some(dispositivo => dispositivo && dispositivo.id);
    const temDesatualizado = (dispositivos || []).some(dispositivo => dispositivo && dispositivo.id && !atlasStatusDispositivoSaude(dispositivo).atualizado);

    if (confirmacao || statusPrincipal?.atualizado) {
        return {
            chave: 'atualizado',
            texto: 'ATUALIZADO',
            cor: '#22c55e',
            detalhe: confirmacao ? `Atualizado: ${confirmacao.confirmadoEm || atlasFormatarDataHoraSistema(confirmacao.confirmadoEmMs)}` : ''
        };
    }

    if (temAparelho && (temDesatualizado || temPedido)) {
        return {
            chave: 'pendente',
            texto: 'NAO ATUALIZOU',
            cor: '#ef4444',
            detalhe: pedido ? `Pedido: ${pedido.solicitadoEm} por ${pedido.solicitadoPor}` : `Precisa abrir/atualizar para ${infoGlobal?.versao || window.ATLAS_SISTEMA_VERSAO || '-'}`
        };
    }

    return {
        chave: 'sem_aparelho',
        texto: 'SEM APARELHO',
        cor: '#94a3b8',
        detalhe: 'Usuario ainda nao registrou aparelho nesta lista'
    };
}

function atlasConfirmacaoAtualizacaoUsuarioSaude(usuario, dispositivos = [], pedido = null) {
    const confirmacoes = atlasJSONLocal('atlas_atualizacoes_confirmadas', {});
    const chaves = atlasChavesUsuarioAtualizacaoSaude(usuario, dispositivos);
    const buildPedido = Number(pedido?.build || 0);
    const solicitadoEmMs = Number(pedido?.solicitadoEmMs || 0);

    return chaves
        .map(chave => confirmacoes[chave])
        .filter(Boolean)
        .filter(confirmacao => !buildPedido || Number(confirmacao.build || 0) >= buildPedido)
        .filter(confirmacao => !solicitadoEmMs || Number(confirmacao.confirmadoEmMs || 0) >= solicitadoEmMs)
        .sort((a, b) => Number(b.confirmadoEmMs || 0) - Number(a.confirmadoEmMs || 0))[0] || null;
}

function atlasTempoRelativoSaude(ms) {
    const diff = Math.max(0, Date.now() - Number(ms || 0));
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `ha ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `ha ${horas} h`;
    return `ha ${Math.floor(horas / 24)} dia(s)`;
}

async function atlasObterDispositivosSaudeSistema() {
    const locais = atlasJSONLocal('atlas_dispositivos_online', {});
    const mapa = new Map(Object.values(locais).filter(item => item && item.id).map(item => [item.id, item]));
    const idAtual = localStorage.getItem('atlas_dispositivo_id');

    if (typeof window.atlasFirebaseListarDispositivos === 'function') {
        const nuvem = await window.atlasFirebaseListarDispositivos();
        (nuvem || []).forEach(item => {
            const atual = mapa.get(item.id);
            if (item.id === idAtual && atual) return;
            if (!atual || Number(item.ultimoAcessoMs || 0) > Number(atual.ultimoAcessoMs || 0)) {
                mapa.set(item.id, item);
            }
        });
    }

    const lista = Array.from(mapa.values()).sort((a, b) => Number(b.ultimoAcessoMs || 0) - Number(a.ultimoAcessoMs || 0));
    const objeto = {};
    lista.forEach(item => { if (item.id) objeto[item.id] = item; });
    localStorage.setItem('atlas_dispositivos_online', JSON.stringify(objeto));
    return lista;
}

function atlasHTMLResumoSaudeSistema(lista) {
    const versaoAtual = window.ATLAS_SISTEMA_VERSAO || 'sem-versao';
    const versaoLocal = localStorage.getItem('atlas_sistema_versao') || '-';
    const usuariosAtivos = (usuariosSistema || []).filter(u => !u.bloqueado).length;
    const usuariosBloqueados = (usuariosSistema || []).filter(u => u.bloqueado).length;
    const usuariosExcluidos = Object.keys(atlasJSONLocal('atlas_usuarios_excluidos', {})).length;
    const pedidos = atlasJSONLocal('atlas_atualizacoes_solicitadas_local', {});
    const pendentes = (usuariosSistema || []).filter(usuario => {
        const aparelhos = (lista || []).filter(dispositivo => atlasDispositivoPertenceAoUsuario(dispositivo, usuario));
        const principal = aparelhos.slice().sort((a, b) => Number(b.ultimoAcessoMs || 0) - Number(a.ultimoAcessoMs || 0))[0] || null;
        const status = principal ? atlasStatusDispositivoSaude(principal) : null;
        const info = atlasInfoAtualizacaoPessoaSaude(usuario, aparelhos, pedidos[atlasIdUsuarioNormalizado(usuario.id)], status);
        return info.chave === 'pendente';
    }).length;
    const online = (lista || []).filter(dispositivo => atlasStatusDispositivoSaude(dispositivo).online).length;

    return `
        ${atlasCardSaudeSistema('Versao atual', versaoAtual, '#22c55e')}
        ${atlasCardSaudeSistema('Versao neste aparelho', versaoLocal, versaoLocal === versaoAtual ? '#22c55e' : '#ef4444')}
        ${atlasCardSaudeSistema('Aparelhos registrados', (lista || []).length, '#3b82f6')}
        ${atlasCardSaudeSistema('Online agora', online, online ? '#22c55e' : '#94a3b8')}
        ${atlasCardSaudeSistema('Atualizacao pendente', pendentes, pendentes ? '#ef4444' : '#22c55e')}
        ${atlasCardSaudeSistema('Usuarios ativos', usuariosAtivos, '#22c55e')}
        ${atlasCardSaudeSistema('Bloqueados / excluidos', `${usuariosBloqueados} / ${usuariosExcluidos}`, '#f59e0b')}
    `;
}

async function abrirSaudeSistemaAtlas() {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode ver a saude do sistema.');
    if (!alternarAbaAjustes(true)) return;

    atlasRegistrarDispositivoAtual();

    const c = document.getElementById('conteudo-ajustes');
    if (!c) return;

    const lista = await atlasObterDispositivosSaudeSistema();
    const ultimaSync = localStorage.getItem('atlas_sync_local_updated_ms');
    const htmlUsuarios = atlasHTMLUsuariosSaudeSistema(lista);

    c.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button onclick="abrirAjustesSistema()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 style="border-bottom:2px solid #22c55e; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                Saude do Sistema
            </h2>
        </div>

        <div id="atlas-saude-resumo" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:14px;">
            ${atlasHTMLResumoSaudeSistema(lista)}
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:14px;">
            <button onclick="atlasForcarAtualizacaoAparelhoAtlas()" style="padding:15px; border:none; border-radius:10px; background:#2563eb; color:white; font-weight:900; cursor:pointer;">FORCAR ATUALIZACAO NESTE APARELHO</button>
            <button onclick="atlasForcarAtualizacaoTodosUsuarios()" style="padding:15px; border:none; border-radius:10px; background:#7c3aed; color:white; font-weight:900; cursor:pointer;">AVISAR ATUALIZACAO PARA TODOS</button>
            <button onclick="atlasSincronizarSaudeSistema()" style="padding:15px; border:none; border-radius:10px; background:#10b981; color:white; font-weight:900; cursor:pointer;">SINCRONIZAR AGORA</button>
            <button onclick="atlasLimparCacheSaudeSistema()" style="padding:15px; border:none; border-radius:10px; background:#991b1b; color:white; font-weight:900; cursor:pointer;">LIMPAR CACHE DESTE APARELHO</button>
        </div>

        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:16px; margin-bottom:14px;">
            <h3 style="margin:0 0 10px;">Status tecnico</h3>
            <div id="atlas-saude-tecnica" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; color:#bfdbfe;">
                <div>Ultima alteracao local: <b>${atlasTextoSeguroSaude(atlasFormatarDataHoraSistema(Number(ultimaSync || 0)))}</b></div>
                <div>Service Worker: <b>${navigator.serviceWorker?.controller ? 'Ativo' : 'Carregando'}</b></div>
                <div>Firebase: <b>${window.atlasFirebaseStatus?.db ? 'Conectado' : 'Aguardando'}</b></div>
                <div id="atlas-saude-cache">Caches: <b>calculando...</b></div>
            </div>
        </div>

        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:16px;">
            <h3 style="margin:0 0 12px;">Usuarios do sistema</h3>
            <div id="atlas-saude-usuarios-lista" style="display:flex; flex-direction:column; gap:10px;">
                ${htmlUsuarios || '<div style="color:#94a3b8;">Nenhum usuario cadastrado ainda.</div>'}
            </div>
        </div>
    `;

    atlasAtualizarCacheSaudeSistema();
    atlasIniciarAtualizacaoSaudeSistema();
}

async function atlasAtualizarSaudeSistemaAberta() {
    const resumo = document.getElementById('atlas-saude-resumo');
    const listaUsuarios = document.getElementById('atlas-saude-usuarios-lista');
    if (!resumo || !listaUsuarios || !usuarioEhAdmin()) return;
    if (window.atlasAtualizandoSaudeSistema) return;
    window.atlasAtualizandoSaudeSistema = true;

    try {
        atlasRegistrarDispositivoAtual();
        if (typeof window.atlasFirebaseAtualizarUsuariosSistema === 'function') {
            await window.atlasFirebaseAtualizarUsuariosSistema();
        }
        const lista = await atlasObterDispositivosSaudeSistema();
        resumo.innerHTML = atlasHTMLResumoSaudeSistema(lista);
        listaUsuarios.innerHTML = atlasHTMLUsuariosSaudeSistema(lista) || '<div style="color:#94a3b8;">Nenhum usuario cadastrado ainda.</div>';
    } finally {
        window.atlasAtualizandoSaudeSistema = false;
    }
}

function atlasIniciarAtualizacaoSaudeSistema() {
    if (window.atlasSaudeSistemaTimer) clearInterval(window.atlasSaudeSistemaTimer);
    window.atlasSaudeSistemaTimer = setInterval(() => {
        if (!document.getElementById('atlas-saude-usuarios-lista')) {
            clearInterval(window.atlasSaudeSistemaTimer);
            window.atlasSaudeSistemaTimer = null;
            return;
        }
        atlasAtualizarSaudeSistemaAberta();
    }, 2000);
}

window.addEventListener('atlasDispositivosNuvemAtualizados', () => {
    if (document.getElementById('atlas-saude-usuarios-lista')) {
        atlasAtualizarSaudeSistemaAberta();
    }
});

window.addEventListener('atlasDadosNuvemAtualizados', () => {
    if (document.getElementById('atlas-saude-usuarios-lista')) {
        atlasAtualizarSaudeSistemaAberta();
    }
});

window.addEventListener('atlasAtualizacoesConfirmadasAtualizadas', () => {
    if (document.getElementById('atlas-saude-usuarios-lista')) {
        atlasAtualizarSaudeSistemaAberta();
    }
});

window.addEventListener('atlasDispositivoLocalAtualizado', () => {
    if (document.getElementById('atlas-saude-usuarios-lista')) {
        atlasAtualizarSaudeSistemaAberta();
    }
});

function atlasCardSaudeSistema(titulo, valor, cor) {
    return `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px;">
            <div style="color:#93c5fd; font-size:13px; margin-bottom:5px;">${atlasTextoSeguroSaude(titulo)}</div>
            <div style="color:${cor}; font-size:22px; font-weight:900; overflow-wrap:anywhere;">${atlasTextoSeguroSaude(valor)}</div>
        </div>
    `;
}

async function atlasSolicitarAtualizacaoDispositivo(dispositivoId, usuarioId) {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode pedir atualizacao.');
    if (typeof window.atlasFirebaseSolicitarAtualizacaoAparelho !== 'function') {
        return alert('Firebase ainda esta carregando. Clique em sincronizar e tente novamente.');
    }

    const alvo = {
        dispositivoId: dispositivoId || '',
        usuario: usuarioId || ''
    };

    const confirmacoes = atlasJSONLocal('atlas_atualizacoes_confirmadas', {});
    atlasChavesAtualizacaoSaude({ dispositivoId }).concat(atlasChavesAtualizacaoSaude({ usuario: usuarioId })).forEach(chave => delete confirmacoes[chave]);
    localStorage.setItem('atlas_atualizacoes_confirmadas', JSON.stringify(confirmacoes));

    await window.atlasFirebaseSolicitarAtualizacaoAparelho(alvo);
    alert('Pedido de atualizacao enviado. Quando esse aparelho sincronizar, o usuario vai receber o aviso para atualizar.');
}

async function atlasSolicitarAtualizacaoUsuarioSaude(usuarioId, nomeUsuario) {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode pedir atualizacao.');
    if (typeof window.atlasFirebaseSolicitarAtualizacaoAparelho !== 'function') {
        return alert('Firebase ainda esta carregando. Clique em sincronizar e tente novamente.');
    }

    const usuario = (usuariosSistema || []).find(u => atlasIdUsuarioNormalizado(u.id) === atlasIdUsuarioNormalizado(usuarioId))
        || { id: usuarioId, nome: nomeUsuario };
    const dispositivos = Object.values(atlasJSONLocal('atlas_dispositivos_online', {}))
        .filter(dispositivo => atlasDispositivoPertenceAoUsuario(dispositivo, usuario));
    const pedidos = [];
    const usuariosAlvo = Array.from(new Set([
        usuarioId,
        nomeUsuario,
        usuario?.id,
        usuario?.nome,
        ...dispositivos.flatMap(dispositivo => [
            dispositivo.usuario,
            dispositivo.nome,
            ...(Array.isArray(dispositivo.usuarioAliases) ? dispositivo.usuarioAliases : [])
        ])
    ].filter(Boolean).map(valor => String(valor).trim())));

    usuariosAlvo.forEach(usuarioAlvo => {
        pedidos.push(window.atlasFirebaseSolicitarAtualizacaoAparelho({ usuario: usuarioAlvo }));
    });
    dispositivos.forEach(dispositivo => {
        pedidos.push(window.atlasFirebaseSolicitarAtualizacaoAparelho({
            dispositivoId: dispositivo.id,
            usuario: dispositivo.usuario || usuarioId
        }));
    });

    const confirmacoes = atlasJSONLocal('atlas_atualizacoes_confirmadas', {});
    atlasChavesUsuarioAtualizacaoSaude(usuario, dispositivos).forEach(chave => delete confirmacoes[chave]);
    localStorage.setItem('atlas_atualizacoes_confirmadas', JSON.stringify(confirmacoes));

    const pedidosForcados = atlasJSONLocal('atlas_forcar_atualizacao_usuarios', {});
    const pedidoForcado = {
        usuario: usuarioId,
        nome: nomeUsuario || usuarioId,
        solicitadoPor: usuarioLogado?.id || 'admin',
        solicitadoEmMs: Date.now(),
        solicitadoEm: new Date().toLocaleString('pt-BR'),
        versao: window.ATLAS_SISTEMA_VERSAO || '',
        build: Number(window.ATLAS_SISTEMA_BUILD || 0)
    };
    usuariosAlvo.forEach(usuarioAlvo => {
        pedidosForcados[atlasIdUsuarioNormalizado(usuarioAlvo)] = pedidoForcado;
    });
    localStorage.setItem('atlas_forcar_atualizacao_usuarios', JSON.stringify(pedidosForcados));

    await Promise.all(pedidos);
    const solicitacoes = atlasJSONLocal('atlas_atualizacoes_solicitadas_local', {});
    solicitacoes[atlasIdUsuarioNormalizado(usuarioId)] = {
        usuario: usuarioId,
        nome: nomeUsuario || usuarioId,
        solicitadoPor: usuarioLogado?.id || 'admin',
        solicitadoEm: new Date().toLocaleString('pt-BR'),
        solicitadoEmMs: Date.now(),
        versao: window.ATLAS_SISTEMA_VERSAO || '',
        build: window.ATLAS_SISTEMA_BUILD || 0
    };
    localStorage.setItem('atlas_atualizacoes_solicitadas_local', JSON.stringify(solicitacoes));
    atlasAtualizarSaudeSistemaAberta();
    alert(`Pedido de atualizacao enviado para ${usuariosAlvo.length} identificador(es) e ${dispositivos.length} aparelho(s) deste usuario.`);
}

async function atlasLimparAparelhosUsuarioSaude(usuarioId, nomeUsuario) {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode limpar aparelhos.');
    const confirmar = confirm(`Limpar registros antigos de aparelho de ${nomeUsuario || usuarioId}? O usuario vai reaparecer quando abrir o sistema de novo.`);
    if (!confirmar) return;

    const usuario = (usuariosSistema || []).find(u => atlasIdUsuarioNormalizado(u.id) === atlasIdUsuarioNormalizado(usuarioId))
        || { id: usuarioId, nome: nomeUsuario };
    const dispositivos = atlasJSONLocal('atlas_dispositivos_online', {});
    const ids = Object.values(dispositivos)
        .filter(dispositivo => atlasDispositivoPertenceAoUsuario(dispositivo, usuario))
        .map(dispositivo => dispositivo.id)
        .filter(Boolean);

    ids.forEach(id => delete dispositivos[id]);
    localStorage.setItem('atlas_dispositivos_online', JSON.stringify(dispositivos));

    const idx = (usuariosSistema || []).findIndex(u => atlasIdUsuarioNormalizado(u.id) === atlasIdUsuarioNormalizado(usuarioId));
    if (idx >= 0) {
        delete usuariosSistema[idx]._atlasUltimoAcessoMs;
        delete usuariosSistema[idx]._atlasUltimoAcesso;
        delete usuariosSistema[idx]._atlasUltimoAcessoVersao;
        delete usuariosSistema[idx]._atlasUltimoAcessoAparelho;
        delete usuariosSistema[idx]._atlasUltimoAcessoDispositivoId;
        localStorage.setItem('atlas_usuarios', JSON.stringify(usuariosSistema));
    }

    if (typeof window.atlasFirebaseRemoverDispositivo === 'function') {
        await Promise.all(ids.map(id => window.atlasFirebaseRemoverDispositivo(id)));
    }
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') {
        await window.atlasFirebaseSincronizarAgora();
    }
    await atlasAtualizarSaudeSistemaAberta();
}

function atlasLinkAtualizacaoLimpa() {
    const url = new URL(location.href);
    url.searchParams.set('atlas_reset', Date.now());
    url.searchParams.delete('atlas_nocache');
    return url.toString();
}

async function atlasMostrarLinkAtualizacaoUsuario(usuarioId, nomeUsuario) {
    const link = atlasLinkAtualizacaoLimpa();
    try {
        await navigator.clipboard.writeText(link);
        alert(`Link de atualizacao limpa copiado. Envie para ${nomeUsuario || usuarioId} abrir no aparelho:\n\n${link}`);
    } catch (erro) {
        prompt(`Copie e envie este link para ${nomeUsuario || usuarioId} abrir no aparelho:`, link);
    }
}

function atlasHTMLDispositivoSaude(dispositivo) {
    const status = atlasStatusDispositivoSaude(dispositivo);
    const dispositivoId = atlasJSStringSaude(dispositivo.id || '');
    const usuarioId = atlasJSStringSaude(dispositivo.usuario || '');
    const descricaoAparelho = atlasDescricaoAparelhoSaude(dispositivo);
    const textoAcesso = status.online
        ? (dispositivo.ultimoAcesso || '-')
        : `Saiu: ${dispositivo.saiuEm || dispositivo.ultimoAcesso || '-'}`;
    return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; align-items:center; background:#0f172a; border:1px solid #334155; border-left:5px solid ${status.corVersao}; border-radius:10px; padding:12px;">
            <div>
                <b>${atlasTextoSeguroSaude(dispositivo.usuario || '-')}</b>
                <div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(dispositivo.nome || '')} - ${atlasTextoSeguroSaude(dispositivo.cargo || '')}</div>
            </div>
            <div>
                <b>${atlasTextoSeguroSaude(descricaoAparelho.titulo)}</b>
                <div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(descricaoAparelho.subtitulo)}</div>
            </div>
            <div>
                <b style="color:${status.corVersao};">Atualizacao: ${status.textoVersao}</b>
                <div style="color:#94a3b8; font-size:12px; overflow-wrap:anywhere;">Versao: ${atlasTextoSeguroSaude(dispositivo.versao || '-')}</div>
            </div>
            <div>
                <b style="color:${status.corOnline};">${status.textoOnline}</b>
                <div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(textoAcesso)}</div>
            </div>
            <button onclick="atlasSolicitarAtualizacaoDispositivo('${dispositivoId}', '${usuarioId}')"
                style="padding:12px; border:none; border-radius:8px; background:#2563eb; color:white; font-weight:900; cursor:pointer;">
                ATUALIZAR
            </button>
        </div>
    `;
}

function atlasDescricaoAparelhoSaude(dispositivo) {
    const tipo = dispositivo?.tipoAparelho || '';
    const marca = dispositivo?.marcaAparelho || '';
    const modelo = dispositivo?.modeloAparelho || '';
    const sistema = dispositivo?.sistemaAparelho || '';
    const aparelho = dispositivo?.aparelho || '';
    const tela = dispositivo?.telaAparelho || `${dispositivo?.largura || '-'}x${dispositivo?.altura || '-'}`;
    const androidSemModelo = /android/i.test(`${tipo} ${marca} ${modelo} ${aparelho}`) && !modelo;
    const telaParaModelo = /\d+x\d+/i.test(tela) ? tela : aparelho;
    const modeloProvavel = androidSemModelo ? atlasModeloProvavelAndroidPorTela(telaParaModelo) : '';
    const tituloPartes = [tipo || (/android/i.test(aparelho) ? 'Telemovel Android' : ''), marca, modelo || modeloProvavel].filter(Boolean);
    const titulo = tituloPartes.length ? tituloPartes.join(' - ') : (aparelho || 'Aparelho');
    const subtitulo = [sistema, tela].filter(Boolean).join(' | ') || '-';
    return { titulo, subtitulo };
}

function atlasChavePessoaSaude(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]+/g, '')
        .toLowerCase();
}

function atlasDistanciaTextoSaude(a, b) {
    const textoA = atlasChavePessoaSaude(a);
    const textoB = atlasChavePessoaSaude(b);
    if (!textoA || !textoB) return 99;
    const linhas = Array.from({ length: textoA.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= textoB.length; j++) linhas[0][j] = j;
    for (let i = 1; i <= textoA.length; i++) {
        for (let j = 1; j <= textoB.length; j++) {
            const custo = textoA[i - 1] === textoB[j - 1] ? 0 : 1;
            linhas[i][j] = Math.min(
                linhas[i - 1][j] + 1,
                linhas[i][j - 1] + 1,
                linhas[i - 1][j - 1] + custo
            );
        }
    }
    return linhas[textoA.length][textoB.length];
}

function atlasDispositivoPertenceAoUsuario(dispositivo, usuario) {
    const idsUsuario = [
        usuario?.id,
        usuario?.nome
    ].map(atlasChavePessoaSaude).filter(Boolean);

    const idsDispositivo = [
        dispositivo?.usuario,
        dispositivo?.nome,
        ...(Array.isArray(dispositivo?.usuarioAliases) ? dispositivo.usuarioAliases : [])
    ].map(atlasChavePessoaSaude).filter(Boolean);

    return idsUsuario.some(idUsuario => idsDispositivo.some(idDispositivo => (
        idUsuario === idDispositivo
        || (idUsuario.length >= 4 && idDispositivo.includes(idUsuario))
        || (idDispositivo.length >= 4 && idUsuario.includes(idDispositivo))
        || (idUsuario.length >= 5 && idDispositivo.length >= 5 && atlasDistanciaTextoSaude(idUsuario, idDispositivo) <= 2)
    )));
}

function atlasDispositivoVirtualUsuarioSaude(usuario) {
    if (!usuario?._atlasUltimoAcessoMs) return null;
    return {
        id: `usuario_${usuario.id}`,
        usuario: usuario.id,
        nome: usuario.nome || usuario.id,
        cargo: usuario.cargo || '',
        aparelho: usuario._atlasUltimoAcessoAparelho || 'Aparelho',
        versao: usuario._atlasUltimoAcessoVersao || '-',
        largura: '-',
        altura: '-',
        ultimoAcessoMs: Number(usuario._atlasUltimoAcessoMs || 0),
        ultimoAcesso: usuario._atlasUltimoAcesso || atlasFormatarDataHoraSistema(Number(usuario._atlasUltimoAcessoMs || 0))
    };
}

function atlasHTMLUsuariosSaudeSistema(dispositivos) {
    const usuarios = (usuariosSistema || [])
        .filter(usuario => usuario && usuario.id)
        .slice()
        .sort((a, b) => {
            const adminA = String(a.id).toLowerCase() === 'admin' ? -1 : 0;
            const adminB = String(b.id).toLowerCase() === 'admin' ? -1 : 0;
            if (adminA !== adminB) return adminA - adminB;
            return String(a.id).localeCompare(String(b.id));
        });

    const dispositivosUsados = new Set();
    return usuarios.map(usuario => {
        const aparelhos = (dispositivos || [])
            .filter(dispositivo => atlasDispositivoPertenceAoUsuario(dispositivo, usuario))
            .sort((a, b) => {
                const statusA = atlasStatusDispositivoSaude(a);
                const statusB = atlasStatusDispositivoSaude(b);
                if (statusA.online !== statusB.online) return statusA.online ? -1 : 1;
                return Number(b.ultimoAcessoMs || 0) - Number(a.ultimoAcessoMs || 0);
            });
        aparelhos.forEach(dispositivo => dispositivosUsados.add(dispositivo.id));
        const acessoUsuario = aparelhos.length ? null : atlasDispositivoVirtualUsuarioSaude(usuario);
        const aparelhosVisiveis = [...aparelhos, acessoUsuario]
            .filter(Boolean)
            .sort((a, b) => {
                const statusA = atlasStatusDispositivoSaude(a);
                const statusB = atlasStatusDispositivoSaude(b);
                if (statusA.online !== statusB.online) return statusA.online ? -1 : 1;
                return Number(b.ultimoAcessoMs || 0) - Number(a.ultimoAcessoMs || 0);
            });
        const principal = aparelhosVisiveis[0] || null;
        const descricaoPrincipal = principal ? atlasDescricaoAparelhoSaude(principal) : null;
        const status = principal ? atlasStatusDispositivoSaude(principal) : null;
        const pedidoAtualizacao = atlasJSONLocal('atlas_atualizacoes_solicitadas_local', {})[atlasIdUsuarioNormalizado(usuario.id)];
        const infoAtualizacao = atlasInfoAtualizacaoPessoaSaude(usuario, aparelhosVisiveis, pedidoAtualizacao, status);
        const bloqueado = usuario.bloqueado === true;

        return `
            <div style="background:#0f172a; border:1px solid #334155; border-left:5px solid ${bloqueado ? '#f59e0b' : (status?.corOnline || '#64748b')}; border-radius:12px; padding:12px;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; align-items:center;">
                    <div>
                        <b style="font-size:18px;">${atlasTextoSeguroSaude(usuario.id || '-')}</b>
                        <div style="color:#94a3b8; font-size:12px;">${atlasTextoSeguroSaude(usuario.nome || usuario.id || '')}</div>
                    </div>
                    <div>
                        <b>${atlasTextoSeguroSaude(normalizarCargoUsuario(usuario.cargo).toUpperCase())}</b>
                        <div style="color:${bloqueado ? '#f59e0b' : '#22c55e'}; font-size:12px; font-weight:900;">${bloqueado ? 'BLOQUEADO' : 'ATIVO'}</div>
                    </div>
                    <div>
                        <b style="color:${status?.corOnline || '#94a3b8'};">${status?.textoOnline || 'SEM ACESSO'}</b>
                        <div style="color:#94a3b8; font-size:12px;">${principal ? atlasTextoSeguroSaude(principal.ultimoAcesso || '-') : 'Nenhum aparelho registrado'}</div>
                        ${principal ? `<div style="color:#bfdbfe; font-size:12px;">Visto: ${atlasTextoSeguroSaude(status.textoVisto)}</div>` : ''}
                    </div>
                    <div>
                        <b>${descricaoPrincipal ? atlasTextoSeguroSaude(descricaoPrincipal.titulo) : 'Aparelho: -'}</b>
                        <div style="color:#94a3b8; font-size:12px;">${descricaoPrincipal ? atlasTextoSeguroSaude(descricaoPrincipal.subtitulo) : '-'}</div>
                    </div>
                    <div>
                        <b style="color:${infoAtualizacao.cor};">Atualizacao: ${infoAtualizacao.texto}</b>
                        <div style="color:#94a3b8; font-size:12px; overflow-wrap:anywhere;">${principal ? atlasTextoSeguroSaude(principal.versao || '-') : '-'}</div>
                        ${infoAtualizacao.detalhe ? `<div style="color:${infoAtualizacao.chave === 'pendente' ? '#fbbf24' : infoAtualizacao.cor}; font-size:12px;">${atlasTextoSeguroSaude(infoAtualizacao.detalhe)}</div>` : ''}
                    </div>
                    <div>
                        ${principal ? `
                            <button onclick="atlasSolicitarAtualizacaoUsuarioSaude('${atlasJSStringSaude(usuario.id || '')}', '${atlasJSStringSaude(usuario.nome || '')}')"
                                style="width:100%; padding:10px; border:none; border-radius:8px; background:#2563eb; color:white; font-weight:900; cursor:pointer; margin-bottom:8px;">
                                FORCAR ATUALIZACAO
                            </button>
                            <button onclick="atlasLimparAparelhosUsuarioSaude('${atlasJSStringSaude(usuario.id || '')}', '${atlasJSStringSaude(usuario.nome || '')}')"
                                style="width:100%; padding:10px; border:1px solid #475569; border-radius:8px; background:#1e293b; color:#bfdbfe; font-weight:900; cursor:pointer; margin-bottom:8px;">
                                LIMPAR REGISTRO
                            </button>
                            <button onclick="atlasMostrarLinkAtualizacaoUsuario('${atlasJSStringSaude(usuario.id || '')}', '${atlasJSStringSaude(usuario.nome || '')}')"
                                style="width:100%; padding:10px; border:1px solid #2563eb; border-radius:8px; background:#0f172a; color:#93c5fd; font-weight:900; cursor:pointer;">
                                COPIAR LINK LIMPO
                            </button>
                        ` : `
                            <button disabled
                                style="width:100%; padding:12px; border:none; border-radius:8px; background:#334155; color:#94a3b8; font-weight:900; cursor:not-allowed;">
                                SEM APARELHO
                            </button>
                        `}
                    </div>
                </div>

            </div>
        `;
    }).join('') + atlasHTMLDispositivosSemUsuarioSaude(dispositivos, dispositivosUsados);
}

function atlasHTMLDispositivosSemUsuarioSaude(dispositivos, dispositivosUsados) {
    const semUsuario = (dispositivos || [])
        .filter(dispositivo => dispositivo && dispositivo.id && !dispositivosUsados.has(dispositivo.id))
        .sort((a, b) => Number(b.ultimoAcessoMs || 0) - Number(a.ultimoAcessoMs || 0));

    if (!semUsuario.length) return '';

    return `
        <div style="background:#1f2937; border:1px solid #f59e0b; border-left:5px solid #f59e0b; border-radius:12px; padding:12px;">
            <b style="color:#fbbf24;">Aparelhos sem usuario encontrado</b>
            <div style="color:#bfdbfe; font-size:13px; margin:4px 0 10px;">
                Estes aparelhos estao online, mas vieram com nome diferente do cadastro.
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${semUsuario.map(dispositivo => atlasHTMLDispositivoSaude(dispositivo)).join('')}
            </div>
        </div>
    `;
}

async function atlasAtualizarCacheSaudeSistema() {
    const alvo = document.getElementById('atlas-saude-cache');
    if (!alvo) return;
    if (!('caches' in window)) {
        alvo.innerHTML = 'Caches: <b>indisponivel</b>';
        return;
    }
    const chaves = await caches.keys().catch(() => []);
    alvo.innerHTML = `Caches: <b>${chaves.filter(chave => chave.startsWith('atlas-')).length}</b>`;
}

async function atlasForcarAtualizacaoAparelhoAtlas() {
    if (window.atlasMostrarTelaAtualizacao) window.atlasMostrarTelaAtualizacao();
    await atlasLimparCachesAtlas();
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all(regs.map(reg => reg.update().catch(() => null)));
    }
    setTimeout(() => location.reload(), 900);
}

async function atlasForcarAtualizacaoTodosUsuarios() {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode avisar todos os usuarios.');
    if (typeof window.atlasFirebasePublicarAtualizacaoGlobal !== 'function') {
        return alert('Firebase ainda esta carregando. Clique em sincronizar e tente novamente.');
    }

    await window.atlasFirebasePublicarAtualizacaoGlobal({
        versao: window.ATLAS_SISTEMA_VERSAO || 'sem-versao',
        build: Number(window.ATLAS_SISTEMA_BUILD || 0)
    });

    alert('Atualizacao enviada para todos. Cada usuario vai ver o aviso ao abrir ou sincronizar o sistema.');
    atlasAtualizarSaudeSistemaAberta();
}

async function atlasLimparCachesAtlas() {
    if (!('caches' in window)) return;
    const chaves = await caches.keys().catch(() => []);
    await Promise.all(chaves.filter(chave => chave.startsWith('atlas-')).map(chave => caches.delete(chave)));
}

async function atlasLimparCacheSaudeSistema() {
    await atlasLimparCachesAtlas();
    localStorage.removeItem('atlas_sistema_versao');
    alert('Cache limpo. O sistema vai recarregar atualizado.');
    location.reload();
}

async function atlasSincronizarSaudeSistema() {
    atlasRegistrarDispositivoAtual();
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') {
        await window.atlasFirebaseSincronizarAgora();
    }
    if (typeof window.atlasFirebaseForcarAtualizacao === 'function') {
        await window.atlasFirebaseForcarAtualizacao();
    }
    alert('Sincronizacao concluida.');
    abrirSaudeSistemaAtlas();
}

function htmlEditorMinimoStockSistema() {
    const minimo = atlasObterConfigMinimoStock();
    return `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
            <h3 style="margin-top:0; margin-bottom:10px;">Minimo para lembrete de stock</h3>
            <p style="color:#94a3b8; font-size:13px; margin:0 0 12px;">
                Quando a quantidade ficar abaixo deste numero, o sistema mostra lembrete para ADMIN e SUPERVISOR.
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                <label style="display:flex; flex-direction:column; gap:6px; color:#bfdbfe; font-weight:bold;">
                    Bobinas
                    <input id="min-stock-bobinas" type="number" min="1" inputmode="numeric" value="${minimo.bobinas}" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                </label>
                <label style="display:flex; flex-direction:column; gap:6px; color:#bfdbfe; font-weight:bold;">
                    Filmes
                    <input id="min-stock-filmes" type="number" min="1" inputmode="numeric" value="${minimo.filmes}" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                </label>
            </div>
            <button onclick="atlasSalvarConfigMinimoStock()" style="width:100%; background:#10b981; color:white; border:none; border-radius:8px; padding:12px; font-weight:bold;">SALVAR MINIMO</button>
        </div>
    `;
}

function htmlEditorPacotesSerraSistema() {
    return `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
            <h3 style="margin-top:0; margin-bottom:10px;">Pacotes da Serra</h3>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                ${(OPCOES_PACOTES_SERRA || []).map((regra, index) => `
                    <div style="display:flex; gap:8px; align-items:center; background:#0f172a; border:1px solid #334155; border-radius:8px; padding:8px; flex-wrap:wrap;">
                        <span style="flex:1; min-width:180px;">${textoSeguroConferencia(regra.tipo)} ${textoSeguroConferencia(regra.espessura)} mm - max. ${textoSeguroConferencia(regra.maximo)} un.</span>
                        <button onclick="editarPacoteSerraSistema(${index})" style="background:#f59e0b; color:white; border:none; border-radius:6px; padding:8px 10px; font-weight:bold;">EDITAR</button>
                        <button onclick="removerPacoteSerraSistema(${index})" style="background:#7f1d1d; color:white; border:none; border-radius:6px; padding:8px 10px; font-weight:bold;">X</button>
                    </div>
                `).join('') || `<div style="color:#94a3b8;">Nenhuma regra.</div>`}
            </div>
            <div style="display:grid; grid-template-columns:1fr 90px 90px auto; gap:8px;">
                <input id="pacote-serra-tipo" placeholder="Tipo de chapa" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="pacote-serra-esp" inputmode="numeric" placeholder="mm" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="pacote-serra-max" inputmode="numeric" placeholder="un." style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <button onclick="adicionarPacoteSerraSistema()" style="background:#10b981; color:white; border:none; border-radius:8px; padding:12px; font-weight:bold;">ADICIONAR</button>
            </div>
        </div>
    `;
}

function htmlEditorListaSistema(titulo, chave, lista, variavel) {
    const id = chave.replace(/[^a-z0-9_]/gi, '_');
    return `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:20px;">
            <h3 style="margin-top:0; margin-bottom:10px;">${titulo}</h3>
            <div id="${id}-lista" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                ${(lista || []).map((valor, index) => `
                    <div style="display:flex; gap:8px; align-items:center; background:#0f172a; border:1px solid #334155; border-radius:8px; padding:8px;">
                        <span style="flex:1;">${textoSeguroConferencia(valor)}</span>
                        <button onclick="editarItemListaSistema('${chave}','${variavel}',${index})" style="background:#f59e0b; color:white; border:none; border-radius:6px; padding:8px 10px; font-weight:bold;">EDITAR</button>
                        <button onclick="removerItemListaSistema('${chave}','${variavel}',${index})" style="background:#7f1d1d; color:white; border:none; border-radius:6px; padding:8px 10px; font-weight:bold;">X</button>
                    </div>
                `).join('') || `<div style="color:#94a3b8;">Nenhum item.</div>`}
            </div>
            <div style="display:flex; gap:8px;">
                <input id="${id}-novo" placeholder="Novo item" style="flex:1; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <button onclick="adicionarItemListaSistema('${chave}','${variavel}','${id}-novo')" style="background:#10b981; color:white; border:none; border-radius:8px; padding:12px; font-weight:bold;">ADICIONAR</button>
            </div>
        </div>
    `;
}

function atualizarVariavelListaSistema(variavel, lista) {
    if (variavel === 'destinosPlano') destinosPlano = lista;
    if (variavel === 'OPCOES_TIPO_PLANO') {
        OPCOES_TIPO_PLANO = lista;
        window.OPCOES_TIPO_PLANO = lista;
    }
    if (variavel === 'OPCOES_RAL_INF') {
        OPCOES_RAL_INF = lista;
        window.OPCOES_RAL_INF = lista;
    }
    if (variavel === 'OPCOES_RAL_SUP') {
        OPCOES_RAL_SUP = lista;
        window.OPCOES_RAL_SUP = lista;
    }
    if (variavel === 'OPCOES_ESP_CHAPA') {
        OPCOES_ESP_CHAPA = lista;
        window.OPCOES_ESP_CHAPA = lista;
    }
    if (variavel === 'OPCOES_ESPUMA_INJECAO') {
        OPCOES_ESPUMA_INJECAO = lista;
        window.OPCOES_ESPUMA_INJECAO = lista;
    }
    if (variavel === 'OPCOES_FITA_INJECAO') {
        OPCOES_FITA_INJECAO = lista;
        window.OPCOES_FITA_INJECAO = lista;
    }
    if (variavel === 'OPCOES_MEDIDAS_CHAPA_STOCK') {
        OPCOES_MEDIDAS_CHAPA_STOCK = lista;
        window.OPCOES_MEDIDAS_CHAPA_STOCK = lista;
    }
    if (variavel === 'OPCOES_FORNECEDORES_STOCK') {
        OPCOES_FORNECEDORES_STOCK = lista;
        window.OPCOES_FORNECEDORES_STOCK = lista;
    }
    if (variavel === 'OPCOES_FILMES_STOCK') {
        OPCOES_FILMES_STOCK = lista;
        window.OPCOES_FILMES_STOCK = lista;
    }
}

function obterVariavelListaSistema(variavel) {
    if (variavel === 'destinosPlano') return destinosPlano;
    if (variavel === 'OPCOES_TIPO_PLANO') return OPCOES_TIPO_PLANO;
    if (variavel === 'OPCOES_RAL_INF') return OPCOES_RAL_INF;
    if (variavel === 'OPCOES_RAL_SUP') return OPCOES_RAL_SUP;
    if (variavel === 'OPCOES_ESP_CHAPA') return OPCOES_ESP_CHAPA;
    if (variavel === 'OPCOES_ESPUMA_INJECAO') return OPCOES_ESPUMA_INJECAO;
    if (variavel === 'OPCOES_FITA_INJECAO') return OPCOES_FITA_INJECAO;
    if (variavel === 'OPCOES_MEDIDAS_CHAPA_STOCK') return OPCOES_MEDIDAS_CHAPA_STOCK;
    if (variavel === 'OPCOES_FORNECEDORES_STOCK') return OPCOES_FORNECEDORES_STOCK;
    if (variavel === 'OPCOES_FILMES_STOCK') return OPCOES_FILMES_STOCK;
    return [];
}

function adicionarItemListaSistema(chave, variavel, idInput) {
    const input = document.getElementById(idInput);
    const valor = input?.value.trim();
    if (!valor) return alert('Informe um valor.');

    const atual = obterVariavelListaSistema(variavel);
    const lista = atlasSalvarListaConfig(chave, [...atual, valor]);
    atualizarVariavelListaSistema(variavel, lista);
    abrirAjustesSistema();
}

function removerItemListaSistema(chave, variavel, index) {
    if (!usuarioPodeExcluirModulo('config')) return alert('Sem permissao para excluir nos Ajustes.');
    const atual = obterVariavelListaSistema(variavel);
    const lista = atlasSalvarListaConfig(chave, atual.filter((_, i) => i !== index));
    atualizarVariavelListaSistema(variavel, lista);
    abrirAjustesSistema();
}

function renomearFilmeSistemaAtlas(antigo, novo) {
    const igual = valor => normalizarStockAtlas(valor) === normalizarStockAtlas(antigo);
    let alterouStock = false;

    atlasStockFilmes = JSON.parse(localStorage.getItem('atlas_stock_filmes')) || [];
    atlasStockFilmes.forEach(item => {
        if (igual(item.tipo)) {
            item.tipo = novo;
            registrarHistoricoFilmeStock(item, `Tipo renomeado de ${antigo} para ${novo}`, atlasUsuarioAtualNome(), new Date().toLocaleString('pt-BR'));
            alterouStock = true;
        }
    });
    if (alterouStock) salvarStockAtlas();

    let alterouHistorico = false;
    const historico = JSON.parse(localStorage.getItem('historicoBobines')) || [];
    historico.forEach(rel => (rel.itens || []).forEach(item => {
        if (item.tipo === 'filme' && igual(item.subtipo)) {
            item.subtipo = novo;
            alterouHistorico = true;
        }
    }));
    if (alterouHistorico) localStorage.setItem('historicoBobines', JSON.stringify(historico));
}

function editarItemListaSistema(chave, variavel, index) {
    if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
    const atual = obterVariavelListaSistema(variavel);
    const antigo = atual[index];
    if (typeof antigo === 'undefined') return;

    const novo = prompt('Novo nome:', antigo);
    if (novo === null) return;
    const valor = novo.trim();
    if (!valor) return alert('Informe um valor.');

    const lista = atlasSalvarListaConfig(chave, atual.map((item, i) => i === index ? valor : item));
    atualizarVariavelListaSistema(variavel, lista);
    if (variavel === 'OPCOES_FILMES_STOCK') renomearFilmeSistemaAtlas(antigo, valor);
    abrirAjustesSistema();
}

function salvarPacotesSerraSistema() {
    OPCOES_PACOTES_SERRA = (OPCOES_PACOTES_SERRA || []).map(regra => ({
        tipo: String(regra.tipo || '').trim(),
        espessura: String(regra.espessura || '').replace('mm', '').trim(),
        maximo: Math.max(1, Number(regra.maximo || 1))
    })).filter(regra => regra.tipo && regra.espessura);
    window.OPCOES_PACOTES_SERRA = OPCOES_PACOTES_SERRA;
    localStorage.setItem('atlas_config_pacotes_serra', JSON.stringify(OPCOES_PACOTES_SERRA));
}

function adicionarPacoteSerraSistema() {
    if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
    const tipo = document.getElementById('pacote-serra-tipo')?.value.trim();
    const espessura = document.getElementById('pacote-serra-esp')?.value.trim();
    const maximo = Number(document.getElementById('pacote-serra-max')?.value || 0);
    if (!tipo || !espessura || !maximo) return alert('Informe tipo, espessura e quantidade por pacote.');
    OPCOES_PACOTES_SERRA.push({ tipo, espessura, maximo });
    salvarPacotesSerraSistema();
    abrirAjustesSistema();
}

function editarPacoteSerraSistema(index) {
    if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
    const regra = OPCOES_PACOTES_SERRA[index];
    if (!regra) return;
    const tipo = prompt('Tipo de chapa:', regra.tipo);
    if (tipo === null) return;
    const espessura = prompt('Espessura em mm:', regra.espessura);
    if (espessura === null) return;
    const maximo = prompt('Maximo de unidades por pacote:', regra.maximo);
    if (maximo === null) return;
    OPCOES_PACOTES_SERRA[index] = { tipo: tipo.trim(), espessura: espessura.replace('mm', '').trim(), maximo: Math.max(1, Number(maximo || 1)) };
    salvarPacotesSerraSistema();
    abrirAjustesSistema();
}

function removerPacoteSerraSistema(index) {
    if (!usuarioPodeExcluirModulo('config')) return alert('Sem permissao para excluir nos Ajustes.');
    OPCOES_PACOTES_SERRA.splice(index, 1);
    salvarPacotesSerraSistema();
    abrirAjustesSistema();
}

function exportarBackupSistema() {
    const backup = {};

    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        backup[chave] = localStorage.getItem(chave);
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

function importarBackupSistema() {
    const input = document.getElementById('arquivo-backup');
    const arquivo = input?.files?.[0];

    if (!arquivo) {
        alert('Selecione um arquivo de backup.');
        return;
    }

    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);

            Object.keys(dados).forEach(chave => {
                localStorage.setItem(chave, dados[chave]);
            });

            alert('Backup importado com sucesso. A página será recarregada.');
            location.reload();
        } catch (erro) {
            alert('Arquivo de backup inválido.');
        }
    };

    leitor.readAsText(arquivo);
}
function salvarTemaUsuario() {
    if (!usuarioLogado) return;

    const seletor = document.getElementById('seletor-tema-ajustes');
    const tema = seletor?.value || 'escuro';

    const preferencias = obterPreferenciasUsuario(usuarioLogado.id);
    preferencias.tema = tema;

    salvarPreferenciasUsuario(usuarioLogado.id, preferencias);
    aplicarTemaUsuario(tema);

    alert('Tema atualizado com sucesso.');
}

function salvarModulosVisiveis() {
    if (!usuarioLogado) return;
    {
        const preferencias = obterPreferenciasUsuario(usuarioLogado.id);
        const modulosPermitidosUsuario = (preferencias.modulosVisiveis || [])
            .filter(chave => chave !== 'config')
            .filter(chave => chave !== 'permissoes');
        const checksUsuario = document.querySelectorAll('.check-modulo-ajustes:checked');
        const modulosSelecionadosUsuario = Array.from(checksUsuario)
            .map(el => el.value)
            .filter(chave => modulosPermitidosUsuario.includes(chave));

        if (modulosSelecionadosUsuario.length === 0) {
            alert('Selecione pelo menos um modulo.');
            return;
        }

        preferencias.modulosOcultosUsuario = modulosPermitidosUsuario
            .filter(chave => !modulosSelecionadosUsuario.includes(chave));

        salvarPreferenciasUsuario(usuarioLogado.id, preferencias);
        aplicarPermissoesUsuario();
        aplicarPreferenciasVisuaisUsuario();

        alert('Meus modulos atualizados com sucesso.');
        return;
    }
    if (!usuarioEhAdmin()) return alert('Somente ADMIN pode alterar permissões de módulos. Use o módulo Permissões.');

    const checks = document.querySelectorAll('.check-modulo-ajustes:checked');
    const modulosSelecionados = Array.from(checks).map(el => el.value);

    if (modulosSelecionados.length === 0) {
        alert('Selecione pelo menos um módulo.');
        return;
    }

    const preferencias = obterPreferenciasUsuario(usuarioLogado.id);
    preferencias.modulosVisiveis = modulosSelecionados;

    salvarPreferenciasUsuario(usuarioLogado.id, preferencias);
    aplicarPermissoesUsuario();
    aplicarPreferenciasVisuaisUsuario();

    alert('Módulos atualizados com sucesso.');
}

function textoSeguroPermissoes(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function removerBlocoUsuariosSenhasAntigo() {
    document.querySelectorAll('#render-modulo h3').forEach(titulo => {
        if (String(titulo.textContent || '').trim().toLowerCase() === 'usuarios e senhas') {
            const bloco = titulo.closest('div[style*="background"]');
            if (bloco) bloco.remove();
        }
    });
}

function obterAlvoPermissoesAdmin(alvoSelecionado = '') {
    const valor = String(alvoSelecionado || 'grupo:operario');
    if (valor === 'grupo:supervisor' || valor === 'grupo:operario') {
        const cargo = valor.split(':')[1];
        return {
            tipo: 'grupo',
            chave: valor,
            cargo,
            titulo: cargo === 'supervisor' ? 'PADRAO DOS SUPERVISORES' : 'PADRAO DOS OPERARIOS',
            prefs: obterPreferenciasGrupoCargo(cargo)
        };
    }

    const idUsuario = valor.startsWith('usuario:') ? valor.slice(8) : valor;
    const usuario = usuariosSistema.find(u => String(u.id).toLowerCase() === String(idUsuario).toLowerCase())
        || usuariosSistema.find(u => normalizarCargoUsuario(u.cargo) !== 'admin')
        || usuariosSistema[0];
    return {
        tipo: 'usuario',
        chave: `usuario:${usuario?.id || ''}`,
        usuario,
        titulo: usuario ? `USUARIO ${String(usuario.id).toUpperCase()}` : 'USUARIO',
        prefs: usuario ? obterPreferenciasUsuario(usuario.id) : obterPreferenciasGrupoCargo('operario')
    };
}

function renderizarPermissoesAdmin(alvoSelecionado = 'grupo:operario') {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode acessar permissoes.');
    const render = document.getElementById('render-modulo');
    if (!render) return;

    const alvo = obterAlvoPermissoesAdmin(alvoSelecionado);
    if (!alvo.usuario && alvo.tipo === 'usuario') {
        render.innerHTML = `<div style="padding:20px; color:white;">Nenhum usuario cadastrado.</div>`;
        return;
    }

    const prefs = alvo.prefs;
    const usuarioAlvo = alvo.usuario;
    const modulos = obterModulosPermissoesAtlas()
        .filter(mod => mod.chave !== 'permissoes');
    const opcoesUsuarios = usuariosSistema
        .filter(u => normalizarCargoUsuario(u.cargo) !== 'admin')
        .map(u => `<option value="usuario:${textoSeguroPermissoes(u.id)}" ${alvo.chave === `usuario:${u.id}` ? 'selected' : ''}>INDIVIDUAL - ${textoSeguroPermissoes(u.id).toUpperCase()} - ${textoSeguroPermissoes(normalizarCargoUsuario(u.cargo)).toUpperCase()} - Senha: ${textoSeguroPermissoes(u.senha || '')}</option>`)
        .join('');
    const detalheAlvo = alvo.tipo === 'grupo'
        ? `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px;">
                <div style="color:#94a3b8; font-size:12px;">Grupo selecionado</div>
                <strong>${textoSeguroPermissoes(alvo.titulo)}</strong>
            </div>
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px;">
                <div style="color:#94a3b8; font-size:12px;">Como funciona</div>
                <strong>Vale para todos deste cargo sem permissao individual.</strong>
            </div>`
        : `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px;">
                <div style="color:#94a3b8; font-size:12px;">Usuario selecionado</div>
                <strong>${textoSeguroPermissoes(usuarioAlvo.id).toUpperCase()}</strong>
            </div>
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px;">
                <div style="color:#94a3b8; font-size:12px;">Cargo</div>
                <strong>${textoSeguroPermissoes(normalizarCargoUsuario(usuarioAlvo.cargo)).toUpperCase()}</strong>
            </div>
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px;">
                <div style="color:#94a3b8; font-size:12px;">Senha</div>
                <strong style="color:#fbbf24;">${textoSeguroPermissoes(usuarioAlvo.senha || '')}</strong>
            </div>`;

    render.innerHTML = `
        <div style="padding:15px; color:white;">
            <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px; margin-bottom:15px;">
                <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:8px;">ALVO DA PERMISSAO</label>
                <select id="perm-usuario" onchange="renderizarPermissoesAdmin(this.value)" style="width:100%; padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="grupo:operario" ${alvo.chave === 'grupo:operario' ? 'selected' : ''}>PADRAO - TODOS OPERARIOS</option>
                    <option value="grupo:supervisor" ${alvo.chave === 'grupo:supervisor' ? 'selected' : ''}>PADRAO - TODOS SUPERVISORES</option>
                    ${opcoesUsuarios}
                </select>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:8px; margin-top:10px;">
                    ${detalheAlvo}
                </div>
            </div>
            <div class="permissoes-lista" style="background:#1e293b; border:1px solid #334155; border-radius:12px; overflow:hidden;">
                <div class="permissoes-cabecalho" style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:8px; padding:12px; background:#0f172a; font-weight:bold;">
                    <span>Modulo</span><span style="text-align:center;">Pode ver</span><span style="text-align:center;">Pode editar</span><span style="text-align:center;">Pode excluir</span>
                </div>
                ${modulos.map(mod => `
                    <div class="permissao-modulo-card" style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:8px; align-items:center; padding:12px; border-top:1px solid #334155;">
                        <span class="permissao-modulo-nome">${mod.nome}</span>
                        <label class="permissao-check" style="text-align:center;"><span>Pode ver</span><input class="perm-ver" type="checkbox" value="${mod.chave}" ${prefs.modulosVisiveis.includes(mod.chave) ? 'checked' : ''}></label>
                        <label class="permissao-check" style="text-align:center;"><span>Pode editar</span><input class="perm-editar" type="checkbox" value="${mod.chave}" ${prefs.modulosEditaveis.includes(mod.chave) ? 'checked' : ''}></label>
                        <label class="permissao-check" style="text-align:center;"><span>Pode excluir</span><input class="perm-excluir" type="checkbox" value="${mod.chave}" ${(prefs.modulosExcluiveis || []).includes(mod.chave) ? 'checked' : ''}></label>
                    </div>
                `).join('')}
            </div>
            <button onclick="salvarPermissoesAdmin('${textoSeguroPermissoes(alvo.chave)}')" style="width:100%; margin-top:15px; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold;">${alvo.tipo === 'grupo' ? 'SALVAR PADRAO DO GRUPO' : 'SALVAR PERMISSOES INDIVIDUAIS'}</button>
        </div>
    `;
    removerBlocoUsuariosSenhasAntigo();
}

function salvarPermissoesAdmin(alvoPermissao) {
    if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode salvar permissoes.');
    const alvo = String(alvoPermissao || 'grupo:operario');

    const visiveis = Array.from(document.querySelectorAll('.perm-ver:checked')).map(el => el.value);
    const editaveis = Array.from(document.querySelectorAll('.perm-editar:checked')).map(el => el.value).filter(chave => visiveis.includes(chave));
    const excluiveis = Array.from(document.querySelectorAll('.perm-excluir:checked')).map(el => el.value).filter(chave => visiveis.includes(chave));
    if (!visiveis.includes('config')) visiveis.push('config');

    if (alvo.startsWith('grupo:')) {
        const cargo = normalizarCargoUsuario(alvo.slice(6));
        if (!['operario', 'supervisor'].includes(cargo)) return alert('Grupo nao encontrado.');
        const prefsGrupo = {
            ...obterPreferenciasGrupoCargo(cargo),
            modulosVisiveis: [...new Set(visiveis)],
            modulosEditaveis: [...new Set(editaveis)],
            modulosExcluiveis: [...new Set(excluiveis)],
            permissoesAdminDefinidas: true
        };
        localStorage.setItem(obterChavePreferenciasGrupo(cargo), JSON.stringify(prefsGrupo));
        if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();
        alert(`Padrao dos ${cargo === 'supervisor' ? 'supervisores' : 'operarios'} atualizado com sucesso.`);
        renderizarPermissoesAdmin(`grupo:${cargo}`);
        return;
    }

    const idUsuario = alvo.startsWith('usuario:') ? alvo.slice(8) : alvo;
    const usuarioAlvo = usuariosSistema.find(u => String(u.id).toLowerCase() === String(idUsuario).toLowerCase());
    if (!usuarioAlvo) return alert('Usuario nao encontrado.');
    if (normalizarCargoUsuario(usuarioAlvo.cargo) === 'admin') return alert('O ADMIN sempre tem acesso total.');

    const prefs = obterPreferenciasUsuario(usuarioAlvo.id);
    const prefsNovas = {
        ...prefs,
        modulosVisiveis: [...new Set(visiveis)],
        modulosEditaveis: [...new Set(editaveis)],
        modulosExcluiveis: [...new Set(excluiveis)],
        permissoesAdminDefinidas: true
    };
    salvarPreferenciasUsuario(usuarioAlvo.id, prefsNovas);
    if (typeof window.atlasFirebaseSincronizarAgora === 'function') window.atlasFirebaseSincronizarAgora();
    alert('Permissoes individuais atualizadas com sucesso.');
    renderizarPermissoesAdmin(`usuario:${usuarioAlvo.id}`);
}

function aplicarTemaUsuario(tema) {
    document.body.classList.toggle('tema-claro', tema === 'claro');

    const header = document.querySelector('header');
    if (header) {
        header.style.background = tema === 'claro' ? '#ffffff' : '';
        header.style.color = tema === 'claro' ? '#0f172a' : '';
    }

    const app = document.getElementById('app-principal');
    if (app) {
        app.style.background = tema === 'claro' ? '#f3f6fb' : '';
        app.style.color = tema === 'claro' ? '#0f172a' : '';
    }

    const grid = document.getElementById('grid-home');
    if (grid) {
        grid.style.background = tema === 'claro' ? '#f3f6fb' : '';
    }
}
/* ==========================================================
   PLANO - REMOVER PEDIDO/CLIENTE CANCELADO DO HISTÓRICO
   Cole no FINAL do script.js
   ========================================================== */

function usuarioPodeEditarPlanoHistorico() {
    return usuarioPodeEditarModulo('plano');
}

function recalcularPlanoHistorico(rel) {
    rel.totalGeral = Number((rel.itens || []).reduce((acc, item) => acc + Number(item.totalMetros || 0), 0).toFixed(2));
    rel.resumo = gerarResumoPlano(rel.itens || []);
    rel.tiposLancamento = Array.from(new Set((rel.itens || []).map(x => x.modo)));
    return rel;
}

function salvarPlanoHistoricoEditado(index, rel) {
    db_plano_hist[index] = recalcularPlanoHistorico(rel);
    localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
}

function abrirGestaoPlanoHistorico(index) {
    if (!usuarioPodeEditarPlanoHistorico()) {
        alert('Apenas ADMIN ou SUPERVISOR podem gerir planos do histórico.');
        return;
    }

    const rel = db_plano_hist[index];
    if (!rel) return alert('Plano não encontrado.');

    if (!document.getElementById('modal-plano-historico')) {
        const modal = document.createElement('div');
        modal.id = 'modal-plano-historico';
        modal.style = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:10000; padding:12px; overflow:auto;';
        document.body.appendChild(modal);
    }

    renderizarGestaoPlanoHistorico(index);
}

function fecharGestaoPlanoHistorico() {
    const modal = document.getElementById('modal-plano-historico');
    if (modal) modal.style.display = 'none';
}

function removerItemPlanoHistorico(indexPlano, idItem) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const item = rel.itens.find(i => String(i.id) === String(idItem));
    if (!item) return;

    const confirmar = confirm(`Remover este item?\n\n${item.descricao || item.pedidoNumero || 'ITEM'}\n${item.destino || ''}\n${item.totalMetros || 0} m`);
    if (!confirmar) return;

    rel.itens = rel.itens.filter(i => String(i.id) !== String(idItem));

    if (rel.itens.length === 0) {
        const apagarPlano = confirm('Este era o último item do plano. Deseja apagar o plano inteiro do histórico?');
        if (apagarPlano) {
            db_plano_hist.splice(indexPlano, 1);
            localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
            fecharGestaoPlanoHistorico();
            listarHistoricoPlano();
            return;
        }
    }

    salvarPlanoHistoricoEditado(indexPlano, rel);
    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

function removerPedidoPlanoHistorico(indexPlano, pedidoNumero, destino) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const confirmar = confirm(`Remover o pedido inteiro?\n\nPedido: ${pedidoNumero}\nCliente: ${destino}`);
    if (!confirmar) return;

    rel.itens = rel.itens.filter(item => {
        return !(item.modo === 'pedido' && String(item.pedidoNumero) === String(pedidoNumero) && String(item.destino) === String(destino));
    });

    if (rel.itens.length === 0) {
        const apagarPlano = confirm('Este era o último pedido do plano. Deseja apagar o plano inteiro do histórico?');
        if (apagarPlano) {
            db_plano_hist.splice(indexPlano, 1);
            localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
            fecharGestaoPlanoHistorico();
            listarHistoricoPlano();
            return;
        }
    }

    salvarPlanoHistoricoEditado(indexPlano, rel);
    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

function renderizarGestaoPlanoHistorico(indexPlano) {
    const rel = db_plano_hist[indexPlano];
    const modal = document.getElementById('modal-plano-historico');
    if (!rel || !modal) return;

    const pedidos = {};
    const stock = [];

    (rel.itens || []).forEach(item => {
        if (item.modo === 'pedido') {
            const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || 'SEM CLIENTE'}`;
            if (!pedidos[chave]) pedidos[chave] = [];
            pedidos[chave].push(item);
        } else {
            stock.push(item);
        }
    });

    let htmlPedidos = '';

    Object.keys(pedidos).forEach(chave => {
        const [pedidoNumero, destino] = chave.split('|||');
        const itens = pedidos[chave];
        const totalPedido = itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);

        htmlPedidos += `
            <div style="background:#111827; border:1px solid #334155; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="padding:12px; background:#1e293b; border-bottom:1px solid #334155;">
                    <div style="color:white; font-weight:bold; font-size:14px;">PEDIDO ${pedidoNumero}</div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:3px;">Cliente: ${destino}</div>
                    <div style="color:#10b981; font-size:12px; margin-top:3px; font-weight:bold;">Total: ${totalPedido.toFixed(2)} m</div>

                    <button onclick="removerPedidoPlanoHistorico(${indexPlano}, '${String(pedidoNumero).replace(/'/g, "\\'")}', '${String(destino).replace(/'/g, "\\'")}')" 
                        style="margin-top:10px; width:100%; background:#ef4444; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                        REMOVER PEDIDO INTEIRO
                    </button>
                </div>

                <div style="padding:10px;">
                    ${itens.map(item => `
                        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                            <div style="color:white; font-size:13px; font-weight:bold;">
                                ${item.tipo} ${item.espessura} mm
                            </div>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                                RAL ${item.ralInferior}/${item.ralSuperior}<br>
                                ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m = <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                            </div>
                            <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                                style="margin-top:8px; width:100%; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                                REMOVER SÓ ESTE ITEM
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    let htmlStock = '';

    if (stock.length > 0) {
        htmlStock = `
            <h3 style="color:white; font-size:14px; margin:18px 0 10px 0;">STOCK</h3>
            ${stock.map(item => `
                <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="color:white; font-weight:bold; font-size:13px;">
                        ${item.tipo} ${item.espessura} mm - ${item.qualidade || 'STOCK'}
                    </div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        RAL ${item.ralInferior}/${item.ralSuperior}<br>
                        ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m = <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                    </div>
                    <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                        style="margin-top:8px; width:100%; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                        REMOVER ITEM
                    </button>
                </div>
            `).join('')}
        `;
    }

    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                        <h2 style="color:white; margin:0; font-size:18px;">Gerir Plano</h2>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${rel.data} | Total atual: <b style="color:#10b981;">${Number(rel.totalGeral || 0).toFixed(2)} m</b>
                        </div>
                    </div>
                    <button onclick="fecharGestaoPlanoHistorico()" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                        FECHAR
                    </button>
                </div>
            </div>

            <div style="padding-top:14px;">
                ${htmlPedidos || `<div style="text-align:center; color:#94a3b8; padding:20px;">Nenhum pedido neste plano.</div>`}
                ${htmlStock}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

function listarHistoricoPlano() {
    if (!alternarAbaPlano(true)) return;

    const c = document.getElementById('container-acao-plano');
    const agrupado = {};

    db_plano_hist.forEach((rel, index) => {
        agrupado[rel.ano] ||= {};
        agrupado[rel.ano][rel.mes] ||= {};
        agrupado[rel.ano][rel.mes][rel.dia] ||= [];
        agrupado[rel.ano][rel.mes][rel.dia].push({ rel, index });
    });

    let html = `
        <div style="color:white;">
            <div style="display:flex; align-items:center; margin-bottom:20px;">
                <button onclick="alternarAbaPlano(false)" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer; margin-right:15px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2 style="border-bottom:2px solid #E31C24; padding-bottom:10px; margin:0; flex:1; font-size:18px; text-transform:uppercase;">
                    Histórico de Planos
                </h2>
            </div>
    `;

    if (db_plano_hist.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:gray;">Nenhum plano encontrado.</div>`;
    }

    Object.keys(agrupado).sort((a,b)=>b-a).forEach(ano => {
        html += `
            <div style="margin-bottom:10px;">
                <div onclick="togglePlanoElemento('ano-plano-${ano}')" style="background:#1e293b; padding:12px; border-radius:5px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;">
                    <span>ANO ${ano}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="ano-plano-${ano}" style="display:none; padding-left:10px; margin-top:5px; border-left:2px solid #E31C24;">
        `;

        Object.keys(agrupado[ano]).sort((a,b)=>b-a).forEach(mes => {
            html += `
                <div onclick="togglePlanoElemento('mes-plano-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#3b82f6; background:#0f172a; margin-top:5px; border-radius:4px; font-weight:bold;">
                    ${MESES_PT[mes] || mes}
                </div>
                <div id="mes-plano-${ano}-${mes}" style="display:none; padding-left:10px; background:#1a202c;">
            `;

            Object.keys(agrupado[ano][mes]).sort((a,b)=>b-a).forEach(dia => {
                html += `
                    <div onclick="togglePlanoElemento('dia-plano-${ano}-${mes}-${dia}')" style="cursor:pointer; padding:10px; color:white; border-bottom:1px solid #334155;">
                        DIA ${dia}/${String(mes).padStart(2,'0')}
                    </div>
                    <div id="dia-plano-${ano}-${mes}-${dia}" style="display:none; padding:8px 0 8px 10px;">
                `;

                agrupado[ano][mes][dia].forEach(({ rel, index }) => {
                    html += `
                        <div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                                <span style="font-size:13px;">
                                    <b style="color:white;">${rel.data}</b><br>
                                    <small style="color:#94a3b8;">${Number(rel.totalGeral || 0).toFixed(2)} m</small>
                                </span>

                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    ${usuarioPodeEditarPlanoHistorico() ? `
                                        <button onclick="abrirGestaoPlanoHistorico(${index})" style="background:#f59e0b; color:black; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                                            GERIR
                                        </button>
                                    ` : ''}

                                    <button onclick='gerarPDF_Plano("${encodeURIComponent(JSON.stringify(rel)).replace(/'/g, '%27')}")' style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">
                                        PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            });

            html += `</div>`;
        });

        html += `</div></div>`;
    });

    c.innerHTML = html + `</div>`;
}
/* ==========================================================
   PLANO - EDITAR ITEM + REGISTRO DE QUEM EDITOU
   Cole DEPOIS do bloco anterior do Plano
   ========================================================== */

function obterNomeEditorPlano() {
    return document.getElementById('user-display')?.innerText || usuarioLogado?.id || 'SEM USUARIO';
}

function registrarEdicaoPlanoHistorico(rel, acao) {
    const registro = {
        usuario: obterNomeEditorPlano(),
        dataHora: new Date().toLocaleString('pt-BR'),
        acao: acao
    };

    if (!Array.isArray(rel.historicoEdicoes)) {
        rel.historicoEdicoes = [];
    }

    rel.historicoEdicoes.push(registro);
    rel.editadoPor = registro.usuario;
    rel.editadoEm = registro.dataHora;
}

function salvarPlanoHistoricoEditado(index, rel, acao) {
    registrarEdicaoPlanoHistorico(rel, acao || 'Alteracao no plano');
    db_plano_hist[index] = recalcularPlanoHistorico(rel);
    localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
}

function abrirEdicaoItemPlanoHistorico(indexPlano, idItem) {
    if (!usuarioPodeEditarPlanoHistorico()) {
        alert('Apenas ADMIN ou SUPERVISOR podem editar planos do histórico.');
        return;
    }

    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const item = rel.itens.find(i => String(i.id) === String(idItem));
    if (!item) return alert('Item não encontrado.');

    const modal = document.getElementById('modal-plano-historico');
    if (!modal) return;

    modal.innerHTML = `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid #334155; padding-bottom:12px;">
                <div>
                    <h2 style="color:white; margin:0; font-size:18px;">Editar Item</h2>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        ${item.pedidoNumero ? 'Pedido ' + item.pedidoNumero : 'Stock'} ${item.destino ? '| ' + item.destino : ''}
                    </div>
                </div>
                <button onclick="renderizarGestaoPlanoHistorico(${indexPlano})" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                    VOLTAR
                </button>
            </div>

            <div style="padding-top:15px;">
                <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:15px;">
                    <div style="color:white; font-weight:bold; font-size:14px;">
                        ${item.tipo} ${item.espessura} mm
                    </div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        RAL ${item.ralInferior}/${item.ralSuperior}
                    </div>
                </div>

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">QUANTIDADE DE CHAPAS</label>
                <input type="number" id="edit-plano-qtd" value="${item.quantidadeChapas || 1}"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">METROS POR CHAPA</label>
                <input type="number" step="0.01" id="edit-plano-metros" value="${item.metrosUnidade || 0}"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <button onclick="salvarEdicaoItemPlanoHistorico(${indexPlano}, '${String(idItem).replace(/'/g, "\\'")}')"
                    style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold; font-size:14px;">
                    SALVAR ALTERAÇÃO
                </button>
            </div>
        </div>
    `;
}

function salvarEdicaoItemPlanoHistorico(indexPlano, idItem) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const item = rel.itens.find(i => String(i.id) === String(idItem));
    if (!item) return;

    const qtd = Number(document.getElementById('edit-plano-qtd')?.value);
    const metros = Number(document.getElementById('edit-plano-metros')?.value);

    if (!qtd || qtd <= 0) return alert('Informe uma quantidade válida.');
    if (!metros || metros <= 0) return alert('Informe os metros válidos.');

    item.quantidadeChapas = qtd;
    item.metrosUnidade = metros;
    item.totalMetros = Number((qtd * metros).toFixed(2));

    salvarPlanoHistoricoEditado(
        indexPlano,
        rel,
        `Editou item ${item.pedidoNumero ? 'do pedido ' + item.pedidoNumero : 'de stock'}: ${qtd} chapas x ${metros} m`
    );

    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

function removerItemPlanoHistorico(indexPlano, idItem) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const item = rel.itens.find(i => String(i.id) === String(idItem));
    if (!item) return;

    const confirmar = confirm(`Remover este item?\n\n${item.descricao || item.pedidoNumero || 'ITEM'}\n${item.destino || ''}\n${item.totalMetros || 0} m`);
    if (!confirmar) return;

    rel.itens = rel.itens.filter(i => String(i.id) !== String(idItem));

    if (rel.itens.length === 0) {
        const apagarPlano = confirm('Este era o último item do plano. Deseja apagar o plano inteiro do histórico?');
        if (apagarPlano) {
            db_plano_hist.splice(indexPlano, 1);
            localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
            fecharGestaoPlanoHistorico();
            listarHistoricoPlano();
            return;
        }
    }

    salvarPlanoHistoricoEditado(indexPlano, rel, `Removeu item ${item.pedidoNumero ? 'do pedido ' + item.pedidoNumero : 'de stock'}`);
    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

function removerPedidoPlanoHistorico(indexPlano, pedidoNumero, destino) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const confirmar = confirm(`Remover o pedido inteiro?\n\nPedido: ${pedidoNumero}\nCliente: ${destino}`);
    if (!confirmar) return;

    rel.itens = rel.itens.filter(item => {
        return !(item.modo === 'pedido' && String(item.pedidoNumero) === String(pedidoNumero) && String(item.destino) === String(destino));
    });

    if (rel.itens.length === 0) {
        const apagarPlano = confirm('Este era o último pedido do plano. Deseja apagar o plano inteiro do histórico?');
        if (apagarPlano) {
            db_plano_hist.splice(indexPlano, 1);
            localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
            fecharGestaoPlanoHistorico();
            listarHistoricoPlano();
            return;
        }
    }

    salvarPlanoHistoricoEditado(indexPlano, rel, `Removeu pedido ${pedidoNumero} - ${destino}`);
    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

function renderizarGestaoPlanoHistorico(indexPlano) {
    const rel = db_plano_hist[indexPlano];
    const modal = document.getElementById('modal-plano-historico');
    if (!rel || !modal) return;

    const pedidos = {};
    const stock = [];

    (rel.itens || []).forEach(item => {
        if (item.modo === 'pedido') {
            const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || 'SEM CLIENTE'}`;
            if (!pedidos[chave]) pedidos[chave] = [];
            pedidos[chave].push(item);
        } else {
            stock.push(item);
        }
    });

    let infoEdicao = '';
    if (rel.editadoPor && rel.editadoEm) {
        infoEdicao = `
            <div style="margin-top:8px; background:#1e293b; border:1px solid #334155; color:#facc15; padding:8px; border-radius:8px; font-size:12px;">
                Última edição: <b>${rel.editadoPor}</b> em <b>${rel.editadoEm}</b>
            </div>
        `;
    }

    let htmlPedidos = '';

    Object.keys(pedidos).forEach(chave => {
        const [pedidoNumero, destino] = chave.split('|||');
        const itens = pedidos[chave];
        const totalPedido = itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);

        htmlPedidos += `
            <div style="background:#111827; border:1px solid #334155; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="padding:12px; background:#1e293b; border-bottom:1px solid #334155;">
                    <div style="color:white; font-weight:bold; font-size:14px;">PEDIDO ${pedidoNumero}</div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:3px;">Cliente: ${destino}</div>
                    <div style="color:#10b981; font-size:12px; margin-top:3px; font-weight:bold;">Total: ${totalPedido.toFixed(2)} m</div>

                    <button onclick="removerPedidoPlanoHistorico(${indexPlano}, '${String(pedidoNumero).replace(/'/g, "\\'")}', '${String(destino).replace(/'/g, "\\'")}')" 
                        style="margin-top:10px; width:100%; background:#ef4444; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                        REMOVER PEDIDO INTEIRO
                    </button>
                </div>

                <div style="padding:10px;">
                    ${itens.map(item => `
                        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                            <div style="color:white; font-size:13px; font-weight:bold;">
                                ${item.tipo} ${item.espessura} mm
                            </div>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                                RAL ${item.ralInferior}/${item.ralSuperior}<br>
                                ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m =
                                <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                                <button onclick="abrirEdicaoItemPlanoHistorico(${indexPlano}, '${item.id}')"
                                    style="background:#f59e0b; color:black; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                                    EDITAR ITEM
                                </button>

                                <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                                    style="background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                                    REMOVER
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    let htmlStock = '';

    if (stock.length > 0) {
        htmlStock = `
            <h3 style="color:white; font-size:14px; margin:18px 0 10px 0;">STOCK</h3>
            ${stock.map(item => `
                <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="color:white; font-weight:bold; font-size:13px;">
                        ${item.tipo} ${item.espessura} mm - ${item.qualidade || 'STOCK'}
                    </div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        RAL ${item.ralInferior}/${item.ralSuperior}<br>
                        ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m =
                        <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                        <button onclick="abrirEdicaoItemPlanoHistorico(${indexPlano}, '${item.id}')"
                            style="background:#f59e0b; color:black; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                            EDITAR ITEM
                        </button>

                        <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                            style="background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                            REMOVER
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                        <h2 style="color:white; margin:0; font-size:18px;">Gerir Plano</h2>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${rel.data} | Total atual:
                            <b style="color:#10b981;">${Number(rel.totalGeral || 0).toFixed(2)} m</b>
                        </div>
                    </div>
                    <button onclick="fecharGestaoPlanoHistorico()" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                        FECHAR
                    </button>
                </div>
                ${infoEdicao}
            </div>

            <div style="padding-top:14px;">
                ${htmlPedidos || `<div style="text-align:center; color:#94a3b8; padding:20px;">Nenhum pedido neste plano.</div>`}
                ${htmlStock}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

/* Mostra última edição no PDF do Plano */
if (typeof montarHTMLPlano === 'function' && !window.montarHTMLPlanoOriginalComEdicao) {
    window.montarHTMLPlanoOriginalComEdicao = montarHTMLPlano;

    montarHTMLPlano = function(rel, comBotaoImpressao) {
        return window.montarHTMLPlanoOriginalComEdicao(rel, comBotaoImpressao);
    };
}
/* ==========================================================
   PLANO - ADICIONAR MAIS ITENS AO PEDIDO NO HISTÓRICO
   Cole no FINAL do script.js
   ========================================================== */

function abrirAdicionarItemPedidoPlanoHistorico(indexPlano, pedidoNumero, destino) {
    if (!usuarioPodeEditarPlanoHistorico()) {
        alert('Apenas ADMIN ou SUPERVISOR podem editar planos do histórico.');
        return;
    }

    const rel = db_plano_hist[indexPlano];
    if (!rel) return alert('Plano não encontrado.');

    const modal = document.getElementById('modal-plano-historico');
    if (!modal) return;

    modal.innerHTML = `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid #334155; padding-bottom:12px;">
                <div>
                    <h2 style="color:white; margin:0; font-size:18px;">Adicionar Item</h2>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        Pedido ${pedidoNumero} | ${destino}
                    </div>
                </div>
                <button onclick="renderizarGestaoPlanoHistorico(${indexPlano})" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                    VOLTAR
                </button>
            </div>

            <div style="padding-top:15px;">
                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">TIPO DE CHAPA</label>
                <select id="add-plano-tipo" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${OPCOES_TIPO_PLANO.map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">ESPESSURA</label>
                <select id="add-plano-esp" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${OPCOES_ESPESSURA_PLANO.map(v => `<option value="${v}">${v} mm</option>`).join('')}
                </select>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <label style="color:#94a3b8; font-size:12px; font-weight:bold;">RAL INFERIOR</label>
                        <select id="add-plano-ral-inf" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                            ${OPCOES_RAL_INF.map(v => `<option value="${v}">${v}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="color:#94a3b8; font-size:12px; font-weight:bold;">RAL SUPERIOR</label>
                        <select id="add-plano-ral-sup" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                            ${OPCOES_RAL_SUP.map(v => `<option value="${v}">${v}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">QUANTIDADE DE CHAPAS</label>
                <input type="number" id="add-plano-qtd" value="1"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">METROS POR CHAPA</label>
                <input type="number" step="0.01" id="add-plano-metros" placeholder="Ex: 6.50"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <button onclick="salvarNovoItemPedidoPlanoHistorico(${indexPlano}, '${String(pedidoNumero).replace(/'/g, "\\'")}', '${String(destino).replace(/'/g, "\\'")}')"
                    style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold; font-size:14px;">
                    ADICIONAR AO PEDIDO
                </button>
            </div>
        </div>
    `;
}

function salvarNovoItemPedidoPlanoHistorico(indexPlano, pedidoNumero, destino) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const tipo = document.getElementById('add-plano-tipo')?.value;
    const espessura = document.getElementById('add-plano-esp')?.value;
    const ralInferior = document.getElementById('add-plano-ral-inf')?.value;
    const ralSuperior = document.getElementById('add-plano-ral-sup')?.value;
    const qtd = Number(document.getElementById('add-plano-qtd')?.value);
    const metros = Number(document.getElementById('add-plano-metros')?.value);

    if (!tipo) return alert('Selecione o tipo de chapa.');
    if (!espessura) return alert('Selecione a espessura.');
    if (!qtd || qtd <= 0) return alert('Informe uma quantidade válida.');
    if (!metros || metros <= 0) return alert('Informe os metros por chapa.');

    const novoItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        modo: 'pedido',
        tipo: tipo,
        espessura: espessura,
        ralSuperior: ralSuperior,
        ralInferior: ralInferior,
        quantidadeChapas: qtd,
        metrosUnidade: metros,
        totalMetros: Number((qtd * metros).toFixed(2)),
        pedidoNumero: pedidoNumero,
        destino: destino,
        descricao: `PEDIDO ${pedidoNumero}`
    };

    if (!Array.isArray(rel.itens)) {
        rel.itens = [];
    }

    rel.itens.push(novoItem);

    salvarPlanoHistoricoEditado(
        indexPlano,
        rel,
        `Adicionou item ao pedido ${pedidoNumero}: ${qtd} chapas x ${metros} m`
    );

    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

/* Substitui novamente a tela GERIR para mostrar o botão ADICIONAR ITEM AO PEDIDO */
const renderizarGestaoPlanoHistoricoComEditar = renderizarGestaoPlanoHistorico;

renderizarGestaoPlanoHistorico = function(indexPlano) {
    const rel = db_plano_hist[indexPlano];
    const modal = document.getElementById('modal-plano-historico');
    if (!rel || !modal) return;

    const pedidos = {};
    const stock = [];

    (rel.itens || []).forEach(item => {
        if (item.modo === 'pedido') {
            const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || 'SEM CLIENTE'}`;
            if (!pedidos[chave]) pedidos[chave] = [];
            pedidos[chave].push(item);
        } else {
            stock.push(item);
        }
    });

    let infoEdicao = '';
    if (rel.editadoPor && rel.editadoEm) {
        infoEdicao = `
            <div style="margin-top:8px; background:#1e293b; border:1px solid #334155; color:#facc15; padding:8px; border-radius:8px; font-size:12px;">
                Última edição: <b>${rel.editadoPor}</b> em <b>${rel.editadoEm}</b>
            </div>
        `;
    }

    let htmlPedidos = '';

    Object.keys(pedidos).forEach(chave => {
        const [pedidoNumero, destino] = chave.split('|||');
        const itens = pedidos[chave];
        const totalPedido = itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);

        htmlPedidos += `
            <div style="background:#111827; border:1px solid #334155; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="padding:12px; background:#1e293b; border-bottom:1px solid #334155;">
                    <div style="color:white; font-weight:bold; font-size:14px;">PEDIDO ${pedidoNumero}</div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:3px;">Cliente: ${destino}</div>
                    <div style="color:#10b981; font-size:12px; margin-top:3px; font-weight:bold;">Total: ${totalPedido.toFixed(2)} m</div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
                        <button onclick="abrirAdicionarItemPedidoPlanoHistorico(${indexPlano}, '${String(pedidoNumero).replace(/'/g, "\\'")}', '${String(destino).replace(/'/g, "\\'")}')" 
                            style="background:#10b981; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                            ADICIONAR ITEM
                        </button>

                        <button onclick="removerPedidoPlanoHistorico(${indexPlano}, '${String(pedidoNumero).replace(/'/g, "\\'")}', '${String(destino).replace(/'/g, "\\'")}')" 
                            style="background:#ef4444; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                            REMOVER PEDIDO
                        </button>
                    </div>
                </div>

                <div style="padding:10px;">
                    ${itens.map(item => `
                        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                            <div style="color:white; font-size:13px; font-weight:bold;">
                                ${item.tipo} ${item.espessura} mm
                            </div>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                                RAL ${item.ralInferior}/${item.ralSuperior}<br>
                                ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m =
                                <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                                <button onclick="abrirEdicaoItemPlanoHistorico(${indexPlano}, '${item.id}')"
                                    style="background:#f59e0b; color:black; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                                    EDITAR ITEM
                                </button>

                                <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                                    style="background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                                    REMOVER
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    let htmlStock = '';

    if (stock.length > 0) {
        htmlStock = `
            <h3 style="color:white; font-size:14px; margin:18px 0 10px 0;">STOCK</h3>
            ${stock.map(item => `
                <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="color:white; font-weight:bold; font-size:13px;">
                        ${item.tipo} ${item.espessura} mm - ${item.qualidade || 'STOCK'}
                    </div>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        RAL ${item.ralInferior}/${item.ralSuperior}<br>
                        ${item.quantidadeChapas} chapas x ${item.metrosUnidade} m =
                        <b style="color:#10b981;">${Number(item.totalMetros || 0).toFixed(2)} m</b>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                        <button onclick="abrirEdicaoItemPlanoHistorico(${indexPlano}, '${item.id}')"
                            style="background:#f59e0b; color:black; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                            EDITAR ITEM
                        </button>

                        <button onclick="removerItemPlanoHistorico(${indexPlano}, '${item.id}')"
                            style="background:#7f1d1d; color:white; border:none; padding:9px; border-radius:7px; font-weight:bold;">
                            REMOVER
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    modal.innerHTML = `
        <div style="max-width:720px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="position:sticky; top:0; background:#020617; padding-bottom:12px; border-bottom:1px solid #334155; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                        <h2 style="color:white; margin:0; font-size:18px;">Gerir Plano</h2>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            ${rel.data} | Total atual:
                            <b style="color:#10b981;">${Number(rel.totalGeral || 0).toFixed(2)} m</b>
                        </div>
                    </div>
                    <button onclick="fecharGestaoPlanoHistorico()" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                        FECHAR
                    </button>
                </div>
                ${infoEdicao}
            </div>

            <div style="padding-top:14px;">
                ${htmlPedidos || `<div style="text-align:center; color:#94a3b8; padding:20px;">Nenhum pedido neste plano.</div>`}
                ${htmlStock}
            </div>
        </div>
    `;

    modal.style.display = 'block';
};
/* ==========================================================
   PLANO - ADICIONAR NOVO PEDIDO AO PLANO JÁ FECHADO
   Cole no FINAL do script.js
   ========================================================== */

function abrirAdicionarNovoPedidoPlanoHistorico(indexPlano) {
    if (!usuarioPodeEditarPlanoHistorico()) {
        alert('Apenas ADMIN ou SUPERVISOR podem editar planos do histórico.');
        return;
    }

    const rel = db_plano_hist[indexPlano];
    if (!rel) return alert('Plano não encontrado.');

    const modal = document.getElementById('modal-plano-historico');
    if (!modal) return;

    modal.innerHTML = `
        <div style="max-width:520px; margin:0 auto; background:#020617; min-height:100%; border-radius:14px; border:1px solid #334155; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid #334155; padding-bottom:12px;">
                <div>
                    <h2 style="color:white; margin:0; font-size:18px;">Novo Pedido</h2>
                    <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                        Adicionar pedido ao plano de ${rel.data}
                    </div>
                </div>
                <button onclick="renderizarGestaoPlanoHistorico(${indexPlano})" style="background:#475569; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold;">
                    VOLTAR
                </button>
            </div>

            <div style="padding-top:15px;">
                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">NÚMERO DO PEDIDO</label>
                <input type="text" id="novo-pedido-numero" placeholder="Ex: 12345"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">CLIENTE / DESTINO</label>
                <input type="text" id="novo-pedido-destino" placeholder="Nome do cliente"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">TIPO DE CHAPA</label>
                <select id="novo-pedido-tipo" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${OPCOES_TIPO_PLANO.map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">ESPESSURA</label>
                <select id="novo-pedido-esp" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                    ${OPCOES_ESPESSURA_PLANO.map(v => `<option value="${v}">${v} mm</option>`).join('')}
                </select>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <label style="color:#94a3b8; font-size:12px; font-weight:bold;">RAL INFERIOR</label>
                        <select id="novo-pedido-ral-inf" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                            ${OPCOES_RAL_INF.map(v => `<option value="${v}">${v}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="color:#94a3b8; font-size:12px; font-weight:bold;">RAL SUPERIOR</label>
                        <select id="novo-pedido-ral-sup" style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px;">
                            ${OPCOES_RAL_SUP.map(v => `<option value="${v}">${v}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">QUANTIDADE DE CHAPAS</label>
                <input type="number" id="novo-pedido-qtd" value="1"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <label style="color:#94a3b8; font-size:12px; font-weight:bold;">METROS POR CHAPA</label>
                <input type="number" step="0.01" id="novo-pedido-metros" placeholder="Ex: 6.50"
                    style="width:100%; margin:6px 0 14px 0; padding:14px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">

                <button onclick="salvarNovoPedidoPlanoHistorico(${indexPlano})"
                    style="width:100%; background:#10b981; color:white; border:none; padding:14px; border-radius:8px; font-weight:bold; font-size:14px;">
                    ADICIONAR NOVO PEDIDO
                </button>
            </div>
        </div>
    `;
}

function salvarNovoPedidoPlanoHistorico(indexPlano) {
    const rel = db_plano_hist[indexPlano];
    if (!rel) return;

    const pedidoNumero = document.getElementById('novo-pedido-numero')?.value.trim();
    const destino = document.getElementById('novo-pedido-destino')?.value.trim();
    const tipo = document.getElementById('novo-pedido-tipo')?.value;
    const espessura = document.getElementById('novo-pedido-esp')?.value;
    const ralInferior = document.getElementById('novo-pedido-ral-inf')?.value;
    const ralSuperior = document.getElementById('novo-pedido-ral-sup')?.value;
    const qtd = Number(document.getElementById('novo-pedido-qtd')?.value);
    const metros = Number(document.getElementById('novo-pedido-metros')?.value);

    if (!pedidoNumero) return alert('Informe o número do pedido.');
    if (!destino) return alert('Informe o cliente/destino.');
    if (!qtd || qtd <= 0) return alert('Informe uma quantidade válida.');
    if (!metros || metros <= 0) return alert('Informe os metros por chapa.');

    const novoItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        modo: 'pedido',
        tipo: tipo,
        espessura: espessura,
        ralSuperior: ralSuperior,
        ralInferior: ralInferior,
        quantidadeChapas: qtd,
        metrosUnidade: metros,
        totalMetros: Number((qtd * metros).toFixed(2)),
        pedidoNumero: pedidoNumero,
        destino: destino,
        descricao: `PEDIDO ${pedidoNumero}`
    };

    if (!Array.isArray(rel.itens)) {
        rel.itens = [];
    }

    rel.itens.push(novoItem);

    if (!destinosPlano.includes(destino)) {
        destinosPlano.push(destino);
        destinosPlano.sort();
        salvarDestinosPlano();
    }

    salvarPlanoHistoricoEditado(
        indexPlano,
        rel,
        `Adicionou novo pedido ${pedidoNumero} - ${destino}: ${qtd} chapas x ${metros} m`
    );

    renderizarGestaoPlanoHistorico(indexPlano);
    listarHistoricoPlano();
}

/* Coloca o botão NOVO PEDIDO no topo do GERIR PLANO */
const renderizarGestaoPlanoHistoricoComNovoPedido = renderizarGestaoPlanoHistorico;

renderizarGestaoPlanoHistorico = function(indexPlano) {
    renderizarGestaoPlanoHistoricoComNovoPedido(indexPlano);

    const modal = document.getElementById('modal-plano-historico');
    if (!modal) return;

    const topo = modal.querySelector('div[style*="position:sticky"]');
    if (!topo) return;

    if (topo.querySelector('#btn-novo-pedido-historico')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-novo-pedido-historico';
    btn.innerText = 'NOVO PEDIDO';
    btn.onclick = function() {
        abrirAdicionarNovoPedidoPlanoHistorico(indexPlano);
    };
    btn.style = 'margin-top:10px; width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;';

    topo.appendChild(btn);
};
/* ==========================================================
   MÓDULO CONFERÊNCIA - PEDIDOS DA SERRA
   ========================================================== */

let db_conferencia_serra = atlasArrayLocal('atlas_conferencia_serra');

if (typeof MODULOS_SISTEMA !== 'undefined' && !MODULOS_SISTEMA.some(m => m.chave === 'conferencia')) {
    MODULOS_SISTEMA.push({ chave: 'conferencia', nome: 'Conferência' });
}

const abrirModuloOriginalConferencia = abrirModulo;
abrirModulo = function(nome) {
    if (nome === 'conferencia') {
        if (!usuarioPodeVerModulo('conferencia')) return alert('Sem permissao para acessar esta area.');
        document.getElementById('grid-home').style.display = 'none';
        document.getElementById('conteudo-modulo').style.display = 'block';
        document.getElementById('titulo-modulo').innerText = 'CONFERÊNCIA';
        renderizarMenuConferenciaSerra();
        return;
    }

    abrirModuloOriginalConferencia(nome);
};

const aplicarPreferenciasOriginalConferencia = aplicarPreferenciasVisuaisUsuario;
aplicarPreferenciasVisuaisUsuario = function() {
    aplicarPreferenciasOriginalConferencia();

    const card = document.getElementById('card-conferencia');
    if (card) card.style.display = usuarioPodeVerModulo('conferencia') ? '' : 'none';
};

function salvarConferenciaSerra() {
    localStorage.setItem('atlas_conferencia_serra', JSON.stringify(db_conferencia_serra));
}

function textoSeguroConferencia(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function obterNomeConferenteSerra() {
    return document.getElementById('user-display')?.innerText || usuarioLogado?.nome || usuarioLogado?.id || 'SEM USUARIO';
}

function motivosUnidadeConferenciaSerra(unidade) {
    if (Array.isArray(unidade.motivos)) return unidade.motivos.filter(Boolean);
    return unidade.observacao ? [unidade.observacao] : [];
}

function atualizarStatusPedidoConferenciaSerra(pedido) {
    if (!pedido || pedido.status === 'finalizado') return;

    const temNaoOk = (pedido.unidades || []).some(u => u.status === 'nao');
    pedido.status = temNaoOk ? 'stand_by' : 'aberto';
}

function textoStatusPedidoConferenciaSerra(status) {
    if (status === 'finalizado') return 'OK';
    if (status === 'stand_by') return 'STAND BY';
    return 'ABERTO';
}

function corStatusPedidoConferenciaSerra(status) {
    if (status === 'finalizado') return '#10b981';
    if (status === 'stand_by') return '#ef4444';
    return '#f59e0b';
}

function extrairNumeroPedidoSerra(desc) {
    const texto = String(desc || '');
    const match = texto.match(/PED:\s*(.+)/i);
    return match ? match[1].trim() : '';
}

function registrarPedidosSerraParaConferencia(itens, meta) {
    const pedidos = itens.filter(item => extrairNumeroPedidoSerra(item.desc));

    pedidos.forEach((item, index) => {
        const pedidoNumero = extrairNumeroPedidoSerra(item.desc);
        const qtd = Number(item.qtd || 1);
        const chavePedido = `${meta.data}|${pedidoNumero}`;
        let pedido = db_conferencia_serra.find(p => p.chavePedido === chavePedido);

        if (!pedido) {
            pedido = {
                id: Date.now() + Math.floor(Math.random() * 1000) + index,
                chavePedido,
                pedidoNumero,
                data: meta.data,
                dia: meta.dia,
                mes: meta.mes,
                ano: meta.ano,
                operadorSerra: meta.operador,
                status: 'aberto',
                finalizadoPor: '',
                finalizadoEm: '',
                unidades: []
            };
            db_conferencia_serra.push(pedido);
        }

        for (let i = 1; i <= qtd; i++) {
            pedido.unidades.push({
                id: Date.now() + Math.floor(Math.random() * 100000) + i,
                status: 'pendente',
                conferidoPor: '',
                conferidoEm: '',
                observacao: '',
                motivos: [],
                tipo: item.tipo,
                esp: item.esp,
                ralI: item.ralI,
                ralS: item.ralS,
                metros: Number(item.metros || 0),
                qtdOriginal: qtd,
                unidade: i
            });
        }

        pedido.status = 'aberto';
    });

    salvarConferenciaSerra();
}

const fecharDiaSerraOriginalConferencia = fecharDiaSerra;
fecharDiaSerra = function() {
    if (db_serra_live.length === 0) {
        fecharDiaSerraOriginalConferencia();
        return;
    }

    const itensAntesDeFechar = [...db_serra_live];
    const seletorData = document.getElementById('h-data-rel-serra')?.value;
    let dataFinal, dia, mes, ano;

    if (seletorData) {
        const partes = seletorData.split('-');
        ano = partes[0];
        mes = partes[1];
        dia = partes[2];
        dataFinal = `${dia}/${mes}/${ano}`;
    } else {
        const hoje = new Date();
        dataFinal = hoje.toLocaleDateString('pt-BR');
        dia = String(hoje.getDate()).padStart(2, '0');
        mes = String(hoje.getMonth() + 1).padStart(2, '0');
        ano = hoje.getFullYear();
    }

    const operador = document.getElementById('user-display')?.innerText || 'OP. SERRA';

    fecharDiaSerraOriginalConferencia();

    registrarPedidosSerraParaConferencia(itensAntesDeFechar, {
        data: dataFinal,
        dia,
        mes: parseInt(mes, 10),
        ano,
        operador
    });
};

function renderizarMenuConferenciaSerra() {
    const render = document.getElementById('render-modulo');
    const mesesNome = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const agrupado = {};

    db_conferencia_serra.forEach(pedido => {
        agrupado[pedido.ano] ||= {};
        agrupado[pedido.ano][pedido.mes] ||= {};
        agrupado[pedido.ano][pedido.mes][pedido.dia] ||= [];
        agrupado[pedido.ano][pedido.mes][pedido.dia].push(pedido);
    });

    let html = `
        <div style="padding:15px; color:white;">
            <h2 style="border-bottom:2px solid #10b981; padding-bottom:10px; margin-top:0;">Conferência de Pedidos</h2>
    `;

    if (db_conferencia_serra.length === 0) {
        html += `<div style="text-align:center; padding:50px; color:#94a3b8;">Nenhum pedido da Serra enviado para conferência.</div>`;
    }

    Object.keys(agrupado).sort((a,b) => b-a).forEach(ano => {
        html += `
            <div onclick="toggleElemento('conf-ano-${ano}')" style="background:#1e293b; padding:12px; border-radius:8px; margin-bottom:8px; cursor:pointer; font-weight:bold; border:1px solid #334155; display:flex; justify-content:space-between;">
                <span>ANO ${ano}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div id="conf-ano-${ano}" style="display:none; padding-left:10px; border-left:2px solid #10b981;">
        `;

        Object.keys(agrupado[ano]).sort((a,b) => b-a).forEach(mes => {
            html += `
                <div onclick="toggleElemento('conf-mes-${ano}-${mes}')" style="background:#0f172a; color:#3b82f6; padding:10px; border-radius:6px; margin:6px 0; cursor:pointer; font-weight:bold;">
                    ${mesesNome[mes] || mes}
                </div>
                <div id="conf-mes-${ano}-${mes}" style="display:none; padding-left:10px;">
            `;

            Object.keys(agrupado[ano][mes]).sort((a,b) => b-a).forEach(dia => {
                const pedidosDia = agrupado[ano][mes][dia];
                const diaFinalizado = pedidosDia.every(p => p.status === 'finalizado');
                const diaStandBy = pedidosDia.some(p => p.status === 'stand_by');
                const corDia = diaFinalizado ? '#10b981' : (diaStandBy ? '#ef4444' : '#f59e0b');
                const textoDia = diaFinalizado ? 'FINALIZADO' : (diaStandBy ? 'STAND BY' : 'EM ABERTO');

                html += `
                    <div style="background:#111827; border:1px solid #334155; border-left:5px solid ${corDia}; border-radius:8px; margin-bottom:10px; overflow:hidden;">
                        <div onclick="toggleElemento('conf-dia-${ano}-${mes}-${dia}')" style="padding:12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                            <b>DIA ${dia}/${String(mes).padStart(2, '0')}</b>
                            <span style="background:${corDia}; color:white; font-size:11px; padding:5px 8px; border-radius:6px; font-weight:bold;">${textoDia}</span>
                        </div>
                        <div id="conf-dia-${ano}-${mes}-${dia}" style="display:none; padding:10px; border-top:1px solid #334155;">
                            ${pedidosDia.map(pedido => `
                                <button onclick="abrirPedidoConferenciaSerra(${pedido.id})" style="width:100%; background:#1e293b; color:white; border:1px solid #334155; padding:12px; border-radius:8px; margin-bottom:8px; text-align:left; display:flex; justify-content:space-between; align-items:center;">
                                    <span>
                                        <b>PEDIDO ${textoSeguroConferencia(pedido.pedidoNumero)}</b><br>
                                        <small style="color:#94a3b8;">${pedido.unidades.length} unidade(s)</small>
                                    </span>
                                    <span style="color:${corStatusPedidoConferenciaSerra(pedido.status)}; font-weight:bold; font-size:11px;">
                                        ${textoStatusPedidoConferenciaSerra(pedido.status)}
                                    </span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `</div>`;
    });

    render.innerHTML = html + `</div>`;
}

function abrirPedidoConferenciaSerra(idPedido) {
    const pedido = db_conferencia_serra.find(p => String(p.id) === String(idPedido));
    if (!pedido) return alert('Pedido não encontrado.');

    const render = document.getElementById('render-modulo');

    const totalOk = pedido.unidades.filter(u => u.status === 'ok').length;
    const totalNao = pedido.unidades.filter(u => u.status === 'nao').length;
    const totalPendente = pedido.unidades.filter(u => u.status === 'pendente').length;

    render.innerHTML = `
        <div style="padding:15px; color:white;">
            <button onclick="renderizarMenuConferenciaSerra()" style="background:none; border:none; color:#94a3b8; font-size:18px; margin-bottom:15px; cursor:pointer;">
                <i class="fas fa-arrow-left"></i> VOLTAR
            </button>

            <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                    <h2 style="margin:0 0 8px 0; font-size:18px;">PEDIDO ${textoSeguroConferencia(pedido.pedidoNumero)}</h2>
                    <span style="background:${corStatusPedidoConferenciaSerra(pedido.status)}; color:white; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:bold;">
                        ${textoStatusPedidoConferenciaSerra(pedido.status)}
                    </span>
                </div>
                <div style="color:#94a3b8; font-size:12px;">
                    Data Serra: ${pedido.data}<br>
                    Operador Serra: ${textoSeguroConferencia(pedido.operadorSerra)}
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:12px;">
                    <div style="background:#0f172a; padding:10px; border-radius:8px; text-align:center; color:#10b981; font-weight:bold;">OK<br>${totalOk}</div>
                    <div style="background:#0f172a; padding:10px; border-radius:8px; text-align:center; color:#ef4444; font-weight:bold;">NÃO<br>${totalNao}</div>
                    <div style="background:#0f172a; padding:10px; border-radius:8px; text-align:center; color:#f59e0b; font-weight:bold;">PENDENTE<br>${totalPendente}</div>
                </div>

                ${pedido.status === 'finalizado' ? `
                    <div style="margin-top:10px; background:#052e16; color:#86efac; padding:10px; border-radius:8px; font-size:12px;">
                        Finalizado por ${textoSeguroConferencia(pedido.finalizadoPor)} em ${textoSeguroConferencia(pedido.finalizadoEm)}
                    </div>
                ` : ''}
                ${pedido.status === 'stand_by' ? `
                    <div style="margin-top:10px; background:#450a0a; color:#fca5a5; padding:10px; border-radius:8px; font-size:12px;">
                        Pedido em stand by: existe pelo menos uma unidade marcada como NAO OK. Corrija os problemas e marque todas as unidades como OK para finalizar.
                    </div>
                ` : ''}
            </div>

            ${pedido.unidades.map((unidade, idx) => {
                const cor = unidade.status === 'ok' ? '#10b981' : unidade.status === 'nao' ? '#ef4444' : '#f59e0b';
                const textoStatus = unidade.status === 'ok' ? 'OK' : unidade.status === 'nao' ? 'NÃO OK' : 'PENDENTE';
                const motivos = motivosUnidadeConferenciaSerra(unidade);

                return `
                    <div style="background:#111827; border:1px solid #334155; border-left:5px solid ${cor}; border-radius:10px; padding:12px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                            <div>
                                <b>Unidade ${idx + 1}</b><br>
                                <small style="color:#94a3b8;">
                                    ${textoSeguroConferencia(unidade.tipo)} ${textoSeguroConferencia(unidade.esp)} mm<br>
                                    ${Number(unidade.metros || 0).toFixed(2)} m | RAL ${textoSeguroConferencia(unidade.ralI)}/${textoSeguroConferencia(unidade.ralS)}
                                </small>
                            </div>
                            <span style="background:${cor}; color:white; padding:5px 8px; border-radius:6px; font-size:11px; font-weight:bold;">
                                ${textoStatus}
                            </span>
                        </div>

                        ${unidade.conferidoPor ? `
                            <div style="color:#94a3b8; font-size:12px; margin-top:8px;">
                                Conferido por: <b style="color:white;">${textoSeguroConferencia(unidade.conferidoPor)}</b> em ${textoSeguroConferencia(unidade.conferidoEm || '-')}
                            </div>
                        ` : ''}

                        ${motivos.length ? `
                            <div style="color:#fca5a5; font-size:12px; margin-top:8px;">
                                <b>Motivos:</b>
                                <ol style="margin:6px 0 0 18px; padding:0;">
                                    ${motivos.map(motivo => `<li>${textoSeguroConferencia(motivo)}</li>`).join('')}
                                </ol>
                            </div>
                        ` : ''}

                        ${pedido.status !== 'finalizado' ? `
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
                                <button onclick="marcarUnidadeConferenciaSerra(${pedido.id}, ${unidade.id}, 'ok')" style="background:#10b981; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                                    OK
                                </button>
                                <button onclick="marcarUnidadeConferenciaSerra(${pedido.id}, ${unidade.id}, 'nao')" style="background:#ef4444; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                                    NÃO OK
                                </button>
                            </div>
                            ${unidade.status === 'nao' ? `
                                <button onclick="adicionarMotivoConferenciaSerra(${pedido.id}, ${unidade.id})" style="width:100%; background:#334155; color:white; border:1px solid #475569; padding:10px; border-radius:8px; font-weight:bold; margin-top:8px;">
                                    + ADICIONAR MOTIVO
                                </button>
                            ` : ''}
                        ` : ''}
                    </div>
                `;
            }).join('')}

            ${pedido.status === 'stand_by' ? `
                <button disabled style="width:100%; background:#450a0a; color:#fca5a5; border:1px solid #ef4444; padding:15px; border-radius:10px; font-weight:bold; margin-top:10px; opacity:0.9;">
                    PEDIDO EM STAND BY
                </button>
            ` : pedido.status !== 'finalizado' ? `
                <button onclick="finalizarPedidoConferenciaSerra(${pedido.id})" style="width:100%; background:#10b981; color:white; border:none; padding:15px; border-radius:10px; font-weight:bold; margin-top:10px;">
                    FINALIZAR PEDIDO
                </button>
            ` : ''}

            <button onclick="excluirPedidoConferenciaSerra(${pedido.id})" style="width:100%; background:#7f1d1d; color:white; border:none; padding:15px; border-radius:10px; font-weight:bold; margin-top:10px;">
                EXCLUIR PEDIDO DA CONFERÊNCIA
            </button>
        </div>
    `;
}

function marcarUnidadeConferenciaSerra(idPedido, idUnidade, status) {
    if (!usuarioPodeEditarModulo('conferencia')) return alert('Sem permissao para editar Conferencia.');
    const pedido = db_conferencia_serra.find(p => String(p.id) === String(idPedido));
    if (!pedido || pedido.status === 'finalizado') return;

    const unidade = pedido.unidades.find(u => String(u.id) === String(idUnidade));
    if (!unidade) return;

    if (status === 'nao') {
        const motivo = prompt('Motivo / observacao:', motivosUnidadeConferenciaSerra(unidade)[0] || '');

        if (!motivo || !motivo.trim()) {
            alert('Informe o motivo para marcar como NAO OK.');
            return;
        }

        unidade.motivos = [motivo.trim()];
        unidade.observacao = motivo.trim();
    } else {
        unidade.motivos = [];
        unidade.observacao = '';
    }

    unidade.status = status;
    unidade.conferidoPor = obterNomeConferenteSerra();
    unidade.conferidoEm = new Date().toLocaleString('pt-BR');
    atualizarStatusPedidoConferenciaSerra(pedido);

    salvarConferenciaSerra();
    abrirPedidoConferenciaSerra(idPedido);
}

function adicionarMotivoConferenciaSerra(idPedido, idUnidade) {
    if (!usuarioPodeEditarModulo('conferencia')) return alert('Sem permissao para editar Conferencia.');
    const pedido = db_conferencia_serra.find(p => String(p.id) === String(idPedido));
    if (!pedido || pedido.status === 'finalizado') return;

    const unidade = pedido.unidades.find(u => String(u.id) === String(idUnidade));
    if (!unidade || unidade.status !== 'nao') return;

    const motivo = prompt('Mais um motivo / problema:');

    if (!motivo || !motivo.trim()) {
        alert('Informe o motivo para adicionar.');
        return;
    }

    unidade.motivos = motivosUnidadeConferenciaSerra(unidade);
    unidade.motivos.push(motivo.trim());
    unidade.observacao = unidade.motivos.join(' | ');
    unidade.conferidoPor = obterNomeConferenteSerra();
    unidade.conferidoEm = new Date().toLocaleString('pt-BR');
    atualizarStatusPedidoConferenciaSerra(pedido);

    salvarConferenciaSerra();
    abrirPedidoConferenciaSerra(idPedido);
}

function finalizarPedidoConferenciaSerra(idPedido) {
    if (!usuarioPodeEditarModulo('conferencia')) return alert('Sem permissao para editar Conferencia.');
    const pedido = db_conferencia_serra.find(p => String(p.id) === String(idPedido));
    if (!pedido) return;

    const pendentes = pedido.unidades.filter(u => u.status === 'pendente').length;
    const naoOk = pedido.unidades.filter(u => u.status === 'nao').length;

    if (pendentes > 0) {
        alert(`Ainda existem ${pendentes} unidade(s) pendente(s). Marque OK ou NÃO OK antes de finalizar.`);
        return;
    }

    if (naoOk > 0) {
        pedido.status = 'stand_by';
        salvarConferenciaSerra();
        alert(`Este pedido tem ${naoOk} unidade(s) NAO OK e ficara em stand by. Corrija os problemas antes de finalizar.`);
        abrirPedidoConferenciaSerra(idPedido);
        return;
    }

    const confirmar = confirm(`Finalizar conferência do pedido ${pedido.pedidoNumero}?`);
    if (!confirmar) return;

    pedido.status = 'finalizado';
    pedido.finalizadoPor = obterNomeConferenteSerra();
    pedido.finalizadoEm = new Date().toLocaleString('pt-BR');

    salvarConferenciaSerra();
    abrirPedidoConferenciaSerra(idPedido);
}

function excluirPedidoConferenciaSerra(idPedido) {
    if (!usuarioPodeExcluirModulo('conferencia')) return alert('Sem permissao para excluir Conferencia.');
    const index = db_conferencia_serra.findIndex(p => String(p.id) === String(idPedido));
    if (index < 0) return alert('Pedido não encontrado.');

    const pedido = db_conferencia_serra[index];
    if (!confirm(`Excluir da conferência o pedido ${pedido.pedidoNumero}?`)) return;

    if (typeof atlasLixeiraEnviar === 'function') {
        atlasLixeiraEnviar('Conferência', `Pedido ${pedido.pedidoNumero} - ${pedido.data || 'sem data'}`, 'atlas_conferencia_serra', pedido);
    }

    db_conferencia_serra.splice(index, 1);
    salvarConferenciaSerra();
    renderizarMenuConferenciaSerra();
    alert('Pedido movido para a lixeira.');
}
/* ==========================================================
   BOTÃO VOLTAR INTELIGENTE - VOLTA PARA O ÚLTIMO CLIQUE
   Cole no FINAL do script.js
   ========================================================== */

let historicoTelasAtlas = [];
let telaAtualAtlas = null;
let bloqueiaHistoricoAtlas = false;

function capturarTelaAtualAtlas() {
    const titulo = document.getElementById('titulo-modulo');
    const render = document.getElementById('render-modulo');
    const grid = document.getElementById('grid-home');
    const conteudo = document.getElementById('conteudo-modulo');

    if (!titulo || !render || !grid || !conteudo) return null;
    if (conteudo.style.display === 'none') return null;

    return {
        titulo: titulo.innerText,
        html: render.innerHTML
    };
}

function telasIguaisAtlas(a, b) {
    if (!a || !b) return false;
    return a.titulo === b.titulo && a.html === b.html;
}

function salvarTelaAnteriorAtlas() {
    if (bloqueiaHistoricoAtlas) return;

    const tela = capturarTelaAtualAtlas();
    if (!tela || !tela.html.trim()) return;

    const ultima = historicoTelasAtlas[historicoTelasAtlas.length - 1];
    if (!telasIguaisAtlas(tela, ultima)) {
        historicoTelasAtlas.push(tela);
    }

    if (historicoTelasAtlas.length > 30) {
        historicoTelasAtlas.shift();
    }
}

function restaurarTelaAtlas(tela) {
    const titulo = document.getElementById('titulo-modulo');
    const render = document.getElementById('render-modulo');
    const grid = document.getElementById('grid-home');
    const conteudo = document.getElementById('conteudo-modulo');

    if (!titulo || !render || !grid || !conteudo) return;

    bloqueiaHistoricoAtlas = true;

    grid.style.display = 'none';
    conteudo.style.display = 'block';
    titulo.innerText = tela.titulo;
    render.innerHTML = tela.html;

    setTimeout(() => {
        bloqueiaHistoricoAtlas = false;
        telaAtualAtlas = capturarTelaAtualAtlas();
    }, 50);
}

const voltarHomeOriginalAtlas = voltarHome;

voltarHome = function() {
    if (historicoTelasAtlas.length > 0) {
        const telaAnterior = historicoTelasAtlas.pop();
        restaurarTelaAtlas(telaAnterior);
        return;
    }

    voltarHomeOriginalAtlas();
};

const abrirModuloOriginalAtlas = abrirModulo;

abrirModulo = function(nome) {
    historicoTelasAtlas = [];
    abrirModuloOriginalAtlas(nome);

    setTimeout(() => {
        telaAtualAtlas = capturarTelaAtualAtlas();
    }, 50);
};

document.addEventListener('click', function(evento) {
    const alvo = evento.target.closest('[onclick]');
    if (!alvo) return;

    const render = document.getElementById('render-modulo');
    if (!render || !render.contains(alvo)) return;

    const acao = alvo.getAttribute('onclick') || '';

    const acoesQueMudamTela = [
        'exibir',
        'renderizar',
        'listar',
        'abrir',
        'iniciar',
        'moduloBobine',
        'setModoCorte',
        'setModoCorteSerra',
        'alternarAba',
        'retomarPlano',
        'visualizarPlanoDigital'
    ];

    const acoesIgnoradas = [
        'toggle',
        'gerarPDF',
        'window.print',
        'remover',
        'deletar',
        'excluir',
        'marcarUnidade',
        'finalizarPedidoConferenciaSerra',
        'fechar',
        'salvar',
        'adicionar',
        'setQtd',
        'setLado',
        'setTipo',
        'setStatus'
    ];

    const deveIgnorar = acoesIgnoradas.some(txt => acao.includes(txt));
    const mudaTela = acoesQueMudamTela.some(txt => acao.includes(txt));

    if (mudaTela && !deveIgnorar) {
        salvarTelaAnteriorAtlas();
    }
}, true);
/* ==========================================================
   BOTÃO VOLTAR / FECHAR NOS PDFS - VERSÃO MOBILE
   Cole no FINAL do script.js ou historicos-admin.js
   ========================================================== */

(function() {
    if (window.atlasPDFVoltarMobileAtivado) return;
    window.atlasPDFVoltarMobileAtivado = true;

    const windowOpenOriginalAtlas = window.open;

    window.atlasVoltarDoPDFParaTelaAnterior = function(contexto = {}) {
        const modulo = contexto.modulo || window.atlasModuloAtual || 'plano';

        if (modulo === 'injecao') {
            abrirModulo('injecao');
            setTimeout(() => exibirHistoricoModulo('injecao'), 50);
            return;
        }

        if (modulo === 'bobines') {
            abrirModulo('bobines');
            setTimeout(() => {
                if (typeof renderizarHistoricoBobines === 'function') renderizarHistoricoBobines();
            }, 50);
            return;
        }

        if (modulo === 'serra') {
            abrirModulo('serra');
            setTimeout(() => {
                if (typeof listarHistoricoSerra === 'function') listarHistoricoSerra();
            }, 50);
            return;
        }

        if (modulo === 'embalagem') {
            abrirModulo('embalagem');
            setTimeout(() => {
                if (typeof listarHistoricoEmbalagem === 'function') listarHistoricoEmbalagem();
            }, 50);
            return;
        }

        if (modulo === 'plano') {
            abrirModulo('plano');
            setTimeout(() => {
                if (typeof listarHistoricoPlano === 'function') listarHistoricoPlano();
            }, 50);
            return;
        }

        if (modulo && typeof abrirModulo === 'function') abrirModulo(modulo);
    };

    window.atlasProcessarRetornoPDF = function() {
        let contexto = null;

        try {
            contexto = JSON.parse(localStorage.getItem('atlas_pdf_retorno_historico') || 'null');
            if (contexto) localStorage.removeItem('atlas_pdf_retorno_historico');
        } catch(e) {
            contexto = null;
        }

        if (contexto) window.atlasVoltarDoPDFParaTelaAnterior(contexto);
    };

    window.addEventListener('storage', function(evento) {
        if (evento.key === 'atlas_pdf_retorno_historico') window.atlasProcessarRetornoPDF();
    });

    window.addEventListener('focus', window.atlasProcessarRetornoPDF);
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) window.atlasProcessarRetornoPDF();
    });
    setInterval(window.atlasProcessarRetornoPDF, 1000);

    function atlasContextoRetornoPDF() {
        const textoTela = String(document.getElementById('render-modulo')?.innerText || '').toLowerCase();
        return {
            modulo: window.atlasModuloAtual || '',
            historico: textoTela.includes('historico') || textoTela.includes('histórico')
        };
    }

    window.open = function() {
        const contextoRetorno = atlasContextoRetornoPDF();
        const janela = windowOpenOriginalAtlas.apply(window, arguments);

        if (!janela) return janela;

        const tentarAdicionarBotao = function() {
            try {
                if (!janela.document || !janela.document.body) return;
                if (janela.document.getElementById('atlas-botao-voltar-pdf')) return;

                const style = janela.document.createElement('style');
                style.innerHTML = `
                    #atlas-botao-voltar-pdf {
                        position: fixed !important;
                        left: 10px !important;
                        right: 10px !important;
                        bottom: 10px !important;
                        bottom: calc(10px + env(safe-area-inset-bottom)) !important;
                        z-index: 2147483647 !important;
                        display: block !important;
                        pointer-events: auto !important;
                    }

                    #atlas-botao-voltar-pdf button {
                        width: 100% !important;
                        padding: 16px !important;
                        background: #E31C24 !important;
                        color: #fff !important;
                        border: 3px solid #000 !important;
                        border-radius: 10px !important;
                        font-size: 16px !important;
                        font-weight: bold !important;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.35) !important;
                    }

                    body {
                        padding-bottom: 90px !important;
                    }

                    @media print {
                        #atlas-botao-voltar-pdf {
                            display: none !important;
                        }

                        body {
                            padding-bottom: 0 !important;
                        }
                    }
                `;

                janela.document.head.appendChild(style);

                const div = janela.document.createElement('div');
                div.id = 'atlas-botao-voltar-pdf';
                div.className = 'no-print';
                janela.atlasContextoRetornoPDF = contextoRetorno;
                janela.atlasVoltarFecharPDF = function() {
                    const contexto = janela.atlasContextoRetornoPDF || contextoRetorno || {};

                    try {
                        localStorage.setItem('atlas_pdf_retorno_historico', JSON.stringify({
                            ...contexto,
                            em: Date.now()
                        }));
                    } catch(e) {}

                    try {
                        if (janela.opener && !janela.opener.closed && janela.opener.atlasVoltarDoPDFParaTelaAnterior) {
                            janela.opener.atlasVoltarDoPDFParaTelaAnterior(contexto);
                            janela.opener.focus();
                            setTimeout(function() {
                                try { janela.close(); } catch(e) {}
                            }, 120);
                        }
                    } catch(e) {}

                    try {
                        janela.document.getElementById('atlas-botao-voltar-pdf')?.remove();
                        const aviso = janela.document.createElement('div');
                        aviso.className = 'no-print';
                        aviso.style.cssText = 'position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;background:#10b981;color:white;border:3px solid #064e3b;border-radius:10px;padding:16px;text-align:center;font-family:Arial;font-weight:bold;';
                        aviso.textContent = 'Voltando para o historico... se esta aba nao fechar sozinha, toque na aba do sistema.';
                        janela.document.body.appendChild(aviso);
                    } catch(e) {}
                };
                const botao = janela.document.createElement('button');
                botao.type = 'button';
                botao.textContent = 'VOLTAR / FECHAR';
                botao.onclick = janela.atlasVoltarFecharPDF;
                botao.addEventListener('click', janela.atlasVoltarFecharPDF);
                botao.addEventListener('touchstart', janela.atlasVoltarFecharPDF, { passive: true });
                div.appendChild(botao);

                janela.document.body.appendChild(div);
            } catch (erro) {}
        };

        const documentCloseOriginal = janela.document.close;

        janela.document.close = function() {
            const resultado = documentCloseOriginal.apply(janela.document, arguments);

            setTimeout(tentarAdicionarBotao, 100);
            setTimeout(tentarAdicionarBotao, 500);
            setTimeout(tentarAdicionarBotao, 1200);

            return resultado;
        };

        return janela;
    };
})();

/* ==========================================================
   ROTAS INTERNAS POR PAGINA (?modulo=...&pagina=...)
   ========================================================== */
(function() {
    if (window.atlasRotasInternasAtivas) return;
    window.atlasRotasInternasAtivas = true;

    const ROTAS_PAGINAS = {
        gestao: {
            'criar-id': () => { renderizarMenuGestao(); exibirCriarUsuario(); atlasOcultarMenusInternos(['menu-gestao']); },
            usuarios: () => { renderizarMenuGestao(); listarUsuariosSistema(); atlasOcultarMenusInternos(['menu-gestao']); }
        },
        bobines: {
            'criar-relatorio': () => moduloBobine('novo'),
            historico: () => moduloBobine('historico'),
            calculadora: () => moduloBobine('calculadora'),
            'calculadora-agro': () => moduloBobine('calculadora_agro')
        },
        injecao: {
            'criar-relatorio': () => exibirFormulario('injecao'),
            historico: () => exibirHistoricoModulo('injecao'),
            'guias-ferros': () => typeof atlasAbrirGuiasInjecao === 'function' ? atlasAbrirGuiasInjecao() : null
        },
        serra: {
            'criar-relatorio': () => exibirSetupSerra(),
            historico: () => listarHistoricoSerra(),
            pacotes: () => typeof abrirPacotesSerraPlano === 'function' ? abrirPacotesSerraPlano() : null
        },
        embalagem: {
            'criar-relatorio': () => exibirSetupEmbalagem(),
            historico: () => listarHistoricoEmbalagem()
        },
        plano: {
            criar: () => exibirMenuCriacaoPlano(),
            historico: () => listarHistoricoPlano(),
            comprador: () => typeof abrirMenuHistoricoComprador === 'function' ? abrirMenuHistoricoComprador() : null
        },
        stock: {
            bobinas: () => renderizarStockBobinasAtlas(),
            filmes: () => renderizarStockFilmesAtlas()
        },
        config: {
            usuario: () => abrirAjustesUsuario(),
            backup: () => abrirAjustesBackup(),
            atualizacao: () => abrirAtualizacaoUsuarioAtlas(),
            sistema: () => abrirAjustesSistema()
        }
    };

    const ACOES_PARA_ROTAS = [
        [/exibirCriarUsuario\(/, 'gestao', 'criar-id'],
        [/listarUsuariosSistema\(/, 'gestao', 'usuarios'],
        [/moduloBobine\('novo'\)/, 'bobines', 'criar-relatorio'],
        [/moduloBobine\('historico'\)/, 'bobines', 'historico'],
        [/moduloBobine\('calculadora'\)/, 'bobines', 'calculadora'],
        [/moduloBobine\('calculadora_agro'\)/, 'bobines', 'calculadora-agro'],
        [/exibirFormulario\('injecao'\)/, 'injecao', 'criar-relatorio'],
        [/exibirHistoricoModulo\('injecao'\)/, 'injecao', 'historico'],
        [/atlasAbrirGuiasInjecao\(/, 'injecao', 'guias-ferros'],
        [/exibirSetupSerra\(/, 'serra', 'criar-relatorio'],
        [/listarHistoricoSerra\(/, 'serra', 'historico'],
        [/abrirPacotesSerraPlano\(/, 'serra', 'pacotes'],
        [/exibirSetupEmbalagem\(/, 'embalagem', 'criar-relatorio'],
        [/listarHistoricoEmbalagem\(/, 'embalagem', 'historico'],
        [/exibirMenuCriacaoPlano\(/, 'plano', 'criar'],
        [/listarHistoricoPlano\(/, 'plano', 'historico'],
        [/abrirMenuHistoricoComprador\(/, 'plano', 'comprador'],
        [/renderizarStockBobinasAtlas\(/, 'stock', 'bobinas'],
        [/renderizarStockFilmesAtlas\(/, 'stock', 'filmes'],
        [/abrirAjustesUsuario\(/, 'config', 'usuario'],
        [/abrirAjustesBackup\(/, 'config', 'backup'],
        [/abrirAtualizacaoUsuarioAtlas\(/, 'config', 'atualizacao'],
        [/abrirAjustesSistema\(/, 'config', 'sistema']
    ];

    function atlasOcultarMenusInternos(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.add('atlas-rota-menu-oculto');
            }
        });
    }

    function atlasOcultarMenuModuloAtual(modulo) {
        const ids = {
            gestao: ['menu-gestao'],
            serra: ['menu-inicial-serra'],
            embalagem: ['container-menu-emb'],
            plano: ['container-menu-plano'],
            stock: ['stock-menu-atlas']
        };
        atlasOcultarMenusInternos(ids[modulo] || []);
    }

    function atlasParametrosRota() {
        const params = new URLSearchParams(location.search);
        const modulo = params.get('modulo') || params.get('atlas_modulo') || '';
        const pagina = params.get('pagina') || '';
        return { modulo, pagina };
    }

    function atlasAtualizarUrlRota(modulo, pagina = '', substituir = false) {
        const url = new URL(location.href);
        url.searchParams.delete('atlas_modulo');
        url.searchParams.delete('atlas_nocache');
        if (modulo) url.searchParams.set('modulo', modulo);
        else url.searchParams.delete('modulo');
        if (pagina) url.searchParams.set('pagina', pagina);
        else url.searchParams.delete('pagina');
        const metodo = substituir ? 'replaceState' : 'pushState';
        history[metodo]({}, '', url);
    }

    function atlasRestaurarSessaoParaRota() {
        if (usuarioLogado) return true;
        const idSessao = localStorage.getItem('atlas_sessao_usuario_id');
        if (!idSessao) {
            document.documentElement.classList.remove('atlas-route-loading');
            return false;
        }
        const usuarioSessao = String(idSessao).toLowerCase() === 'admin'
            ? garantirAdminSistemaAtlas()
            : (usuariosSistema || []).find(usuario => String(usuario.id).toLowerCase() === String(idSessao).toLowerCase());
        if (!usuarioSessao) {
            document.documentElement.classList.remove('atlas-route-loading');
            return false;
        }

        usuarioLogado = usuarioSessao;
        window.usuarioLogado = usuarioLogado;
        document.documentElement.classList.remove('atlas-route-loading');
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('app-principal').style.display = 'block';
        document.getElementById('user-display').innerText = String(usuarioLogado.id || 'OPERADOR').toUpperCase();
        aplicarPermissoesUsuario();
        aplicarPreferenciasVisuaisUsuario();
        if (typeof atlasInicializarDashboardHome === 'function') atlasInicializarDashboardHome();
        return true;
    }

    function atlasAbrirModuloNaMesmaPagina(modulo) {
        const antes = window.atlasModuloEmAbaExterna;
        window.atlasModuloEmAbaExterna = true;
        try {
            const retorno = window.atlasAbrirModuloBaseRota(modulo);
            if (modulo === 'injecao') {
                setTimeout(atlasGarantirCardGuiasInjecaoRota, 80);
                setTimeout(atlasGarantirCardGuiasInjecaoRota, 350);
            }
            return retorno;
        } finally {
            window.atlasModuloEmAbaExterna = antes;
        }
    }

    function atlasGarantirCardGuiasInjecaoRota() {
        if (window.atlasModuloAtual !== 'injecao') return;
        if (typeof window.atlasAbrirGuiasInjecao !== 'function') return;
        const render = document.getElementById('render-modulo');
        if (render?.querySelector('input, select, textarea')) return;
        const grid = render?.querySelector('div[style*="grid-template-columns"], .atlas-menu-modulo');
        if (!grid || document.getElementById('atlas-card-guias-injecao')) return;

        grid.insertAdjacentHTML('beforeend', `
            <div id="atlas-card-guias-injecao" class="card atlas-menu-modulo-card" onclick="atlasAbrirGuiasInjecao()">
                <i class="fas fa-grip-lines"></i>
                <span>Guias / Ferros</span>
                <small>Guias, ferros e fotos tecnicas</small>
            </div>
        `);
        if (typeof atlasPolirMenusModulos === 'function') atlasPolirMenusModulos();
    }

    function atlasAplicarRotaAtual(substituir = true) {
        const { modulo, pagina } = atlasParametrosRota();
        if (!modulo) return;
        if (!atlasRestaurarSessaoParaRota()) return;

        window.atlasModuloEmAbaExterna = true;
        atlasAtualizarUrlRota(modulo, pagina, substituir);
        atlasAbrirModuloNaMesmaPagina(modulo);

        const renderPagina = ROTAS_PAGINAS[modulo]?.[pagina];
        if (pagina && typeof renderPagina === 'function') {
            setTimeout(() => {
                renderPagina();
                atlasOcultarMenuModuloAtual(modulo);
                if (typeof atlasPolirMenusModulos === 'function') atlasPolirMenusModulos();
            }, 60);
        }
    }

    function atlasNavegarPaginaModulo(modulo, pagina) {
        if (!modulo) return;
        atlasAtualizarUrlRota(modulo, pagina, false);
        atlasAplicarRotaAtual(true);
    }

    function atlasAbrirPaginaModuloNovaAba(modulo, pagina) {
        if (usuarioLogado?.id) localStorage.setItem('atlas_sessao_usuario_id', usuarioLogado.id);
        const url = new URL(location.href);
        url.searchParams.delete('atlas_modulo');
        url.searchParams.delete('atlas_nocache');
        url.searchParams.set('modulo', modulo);
        url.searchParams.set('pagina', pagina);
        const nova = window.open(url.toString(), '_blank');
        if (!nova) {
            alert('O navegador bloqueou a nova aba. Autorize pop-ups para o Atlas e tente novamente.');
            return;
        }
        try { nova.focus(); } catch (erro) {}
    }

    function atlasRotaPorOnclick(onclick) {
        const texto = String(onclick || '');
        const achou = ACOES_PARA_ROTAS.find(([regex]) => regex.test(texto));
        return achou ? { modulo: achou[1], pagina: achou[2] } : null;
    }

    document.addEventListener('click', function(evento) {
        const alvo = evento.target.closest('#render-modulo [onclick]');
        if (!alvo) return;
        const rota = atlasRotaPorOnclick(alvo.getAttribute('onclick'));
        if (!rota) return;

        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();

        atlasNavegarPaginaModulo(rota.modulo, rota.pagina);
    }, true);

    const abrirModuloAnterior = window.abrirModulo;
    window.atlasAbrirModuloBaseRota = function(modulo) {
        const antes = window.atlasModuloEmAbaExterna;
        window.atlasModuloEmAbaExterna = true;
        try {
            return abrirModuloAnterior.apply(this, arguments);
        } finally {
            window.atlasModuloEmAbaExterna = antes;
        }
    };

    window.abrirModulo = function(modulo) {
        const { modulo: moduloAtual } = atlasParametrosRota();
        const naHome = document.getElementById('grid-home')?.style.display !== 'none';
        if (!moduloAtual && naHome && !window.atlasModuloEmAbaExterna) {
            if (usuarioLogado?.id) localStorage.setItem('atlas_sessao_usuario_id', usuarioLogado.id);
            atlasAtualizarUrlRota(modulo, '', false);
            return atlasAbrirModuloNaMesmaPagina(modulo);
        }
        atlasAtualizarUrlRota(modulo, '', false);
        return atlasAbrirModuloNaMesmaPagina(modulo);
    };
    abrirModulo = window.abrirModulo;

    const voltarOriginal = window.voltarHome || voltarHome;
    window.voltarHome = function() {
        const { modulo, pagina } = atlasParametrosRota();
        if (modulo && pagina) {
            atlasAtualizarUrlRota(modulo, '', false);
            atlasAplicarRotaAtual(true);
            return;
        }
        if (modulo) {
            atlasAtualizarUrlRota('', '', false);
        }
        return voltarOriginal.apply(this, arguments);
    };
    voltarHome = window.voltarHome;

    window.addEventListener('popstate', () => atlasAplicarRotaAtual(true));
    window.addEventListener('load', () => setTimeout(() => atlasAplicarRotaAtual(true), 260));
})();

/* ==========================================================
   NAVEGACAO: MODULOS DA HOME EM NOVA ABA
   ========================================================== */
(function() {
    if (window.atlasModulosNovaAbaAtivo || window.atlasRotasInternasAtivas) return;
    window.atlasModulosNovaAbaAtivo = true;

    function atlasModuloUrl(nome) {
        const url = new URL(window.location.href);
        url.searchParams.set('atlas_modulo', nome);
        url.searchParams.set('atlas_nocache', Date.now());
        return url.toString();
    }

    function atlasEstaNaHome() {
        const grid = document.getElementById('grid-home');
        const conteudo = document.getElementById('conteudo-modulo');
        return Boolean(grid && grid.style.display !== 'none' && (!conteudo || conteudo.style.display === 'none'));
    }

    function atlasDeveAbrirModuloNovaAba(nome) {
        if (!nome || window.atlasModuloEmAbaExterna) return false;
        if (new URLSearchParams(location.search).has('atlas_modulo')) return false;
        return atlasEstaNaHome();
    }

    function atlasAbrirModuloNovaAba(nome) {
        window.atlasModuloAbriuNovaAbaAgora = true;
        setTimeout(() => { window.atlasModuloAbriuNovaAbaAgora = false; }, 500);
        if (usuarioLogado?.id) localStorage.setItem('atlas_sessao_usuario_id', usuarioLogado.id);
        const nova = window.open(atlasModuloUrl(nome), '_blank');
        if (!nova) {
            alert('O navegador bloqueou a nova aba. Autorize pop-ups para o Atlas e tente novamente.');
            return;
        }
        try { nova.focus(); } catch (erro) {}
    }

    function atlasRestaurarUsuarioSessao() {
        const idSessao = localStorage.getItem('atlas_sessao_usuario_id');
        if (!idSessao) return null;
        if (String(idSessao).toLowerCase() === 'admin') return garantirAdminSistemaAtlas();
        return (usuariosSistema || []).find(usuario => String(usuario.id).toLowerCase() === String(idSessao).toLowerCase()) || null;
    }

    function atlasEntrarDiretoModuloUrl() {
        const params = new URLSearchParams(location.search);
        const modulo = params.get('atlas_modulo');
        if (!modulo) return;

        const usuarioSessao = atlasRestaurarUsuarioSessao();
        if (!usuarioSessao) return;

        window.atlasModuloEmAbaExterna = true;
        usuarioLogado = usuarioSessao;
        window.usuarioLogado = usuarioLogado;

        const login = document.getElementById('tela-login');
        const app = document.getElementById('app-principal');
        const display = document.getElementById('user-display');
        if (login) login.style.display = 'none';
        if (app) app.style.display = 'block';
        if (display) display.innerText = String(usuarioLogado.id || 'OPERADOR').toUpperCase();

        if (typeof aplicarPermissoesUsuario === 'function') aplicarPermissoesUsuario();
        if (typeof aplicarPreferenciasVisuaisUsuario === 'function') aplicarPreferenciasVisuaisUsuario();
        if (typeof atlasInicializarDashboardHome === 'function') atlasInicializarDashboardHome();

        setTimeout(() => {
            if (typeof window.atlasAbrirModuloMesmaAba === 'function') window.atlasAbrirModuloMesmaAba(modulo);
        }, 80);
    }

    const original = window.abrirModulo || abrirModulo;
    window.atlasAbrirModuloMesmaAba = function(nome) {
        return original.apply(this, arguments);
    };
    window.abrirModulo = function(nome) {
        if (atlasDeveAbrirModuloNovaAba(nome)) {
            atlasAbrirModuloNovaAba(nome);
            return;
        }
        return original.apply(this, arguments);
    };
    abrirModulo = window.abrirModulo;

    window.addEventListener('load', () => setTimeout(atlasEntrarDiretoModuloUrl, 150));
})();

/* ==========================================================
   INJECAO - GUIAS / FERROS POR TIPO DE CHAPA
   ========================================================== */
(function() {
    if (window.atlasGuiasInjecaoAtivo) return;
    window.atlasGuiasInjecaoAtivo = true;

    const CHAVE_GUIAS_INJECAO = 'atlas_guias_injecao';
    const TIPOS_GUIAS_PADRAO = ['5 Ondas', 'Telha Canudo', 'Fachada Oculta', 'Fachada Visivel'];

    function escGuia(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
    }

    function jsGuia(valor) {
        return String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function podeEditarGuiasInjecao() {
        return typeof usuarioEhAdminSupervisor === 'function' && usuarioEhAdminSupervisor();
    }

    function tiposGuiasInjecao() {
        const doSistema = Array.isArray(window.OPCOES_TIPO_PLANO) ? window.OPCOES_TIPO_PLANO : (typeof OPCOES_TIPO_PLANO !== 'undefined' ? OPCOES_TIPO_PLANO : []);
        const todos = [...TIPOS_GUIAS_PADRAO, ...doSistema]
            .map(v => String(v || '').trim())
            .filter(v => v && normalizarStockAtlas(v) !== 'pir');
        return [...new Set(todos)];
    }

    function limparGuiasInjecaoLegado(dados) {
        Object.keys(dados || {}).forEach(tipo => {
            if (tipo === '_atlasMeta') return;
            ['esquerdo', 'direito'].forEach(lado => {
                if (!Array.isArray(dados[tipo]?.[lado])) return;
                dados[tipo][lado] = dados[tipo][lado].map(item => {
                    const limpo = { ...item };
                    delete limpo.video;
                    if (limpo.fotoThumb === limpo.foto) limpo.fotoThumb = '';
                    if (String(limpo.foto || '').startsWith('atlasfsvideo:')) limpo.foto = '';
                    return limpo;
                });
            });
        });
        return dados;
    }

    function dadosGuiasInjecao() {
        const dados = limparGuiasInjecaoLegado(atlasJSONLocal(CHAVE_GUIAS_INJECAO, {}));
        tiposGuiasInjecao().forEach(tipo => {
            dados[tipo] ||= {};
            dados[tipo].esquerdo ||= [];
            dados[tipo].direito ||= [];
        });
        return dados;
    }

    function salvarGuiasInjecao(dados) {
        dados._atlasMeta = {
            atualizadoEmMs: Date.now(),
            atualizadoPor: document.getElementById('user-display')?.innerText || usuarioLogado?.id || 'SISTEMA'
        };
        localStorage.setItem('atlas_guias_editando_ate', String(Date.now() + 20000));
        localStorage.setItem(CHAVE_GUIAS_INJECAO, JSON.stringify(limparGuiasInjecaoLegado(dados || {})));
    }

    function nomeLadoGuia(lado) {
        return lado === 'direito' ? 'Lado direito' : 'Lado esquerdo';
    }

    function usuarioAtualGuia() {
        return document.getElementById('user-display')?.innerText || usuarioLogado?.id || 'SISTEMA';
    }

    function resumirFotoGuia(valor) {
        if (!valor) return 'sem foto';
        return String(valor).startsWith('data:image/') ? 'foto salva no sistema' : 'foto por link';
    }

    function registrarAuditoriaGuia(acao, detalhes) {
        if (typeof window.atlasRegistrarAuditoria === 'function') {
            window.atlasRegistrarAuditoria(acao, 'guias_injecao', detalhes);
        }
    }

    function detalhesAlteracoesGuia(antes, depois) {
        const alteracoes = [];
        const campos = [
            ['nome', 'Ferro'],
            ['posicao', 'Posicao'],
            ['nota', 'Detalhes']
        ];
        campos.forEach(([chave, rotulo]) => {
            const anterior = String(antes?.[chave] || '').trim();
            const atual = String(depois?.[chave] || '').trim();
            if (anterior !== atual) alteracoes.push(`${rotulo}: "${anterior || '-'}" -> "${atual || '-'}"`);
        });

        const fotoAntes = !!antes?.foto;
        const fotoDepois = !!depois?.foto;
        if (!fotoAntes && fotoDepois) alteracoes.push('Foto incluida');
        else if (fotoAntes && !fotoDepois) alteracoes.push('Foto removida');
        else if (fotoAntes && fotoDepois && antes.foto !== depois.foto) alteracoes.push('Foto trocada');

        return alteracoes;
    }

    function registrarSalvarGuia(tipo, lado, antes, depois) {
        const local = `${tipo} | ${nomeLadoGuia(lado)} | ${depois.nome || 'Ferro'}`;
        const usuario = usuarioAtualGuia();
        if (!antes) {
            registrarAuditoriaGuia('Incluiu guia/ferro', `${local} | Usuario: ${usuario} | Foto: ${resumirFotoGuia(depois.foto)} | Posicao: ${depois.posicao || '-'} | Detalhes: ${depois.nota || '-'}`);
            return;
        }

        const alteracoes = detalhesAlteracoesGuia(antes, depois);
        if (!alteracoes.length) return;
        registrarAuditoriaGuia('Alterou guia/ferro', `${local} | Usuario: ${usuario} | ${alteracoes.join(' | ')}`);
    }

    function registrarApagarGuia(tipo, lado, item) {
        const local = `${tipo} | ${nomeLadoGuia(lado)} | ${item?.nome || 'Ferro'}`;
        registrarAuditoriaGuia('Apagou guia/ferro', `${local} | Usuario: ${usuarioAtualGuia()} | Foto: ${resumirFotoGuia(item?.foto)} | Posicao: ${item?.posicao || '-'} | Detalhes: ${item?.nota || '-'}`);
    }

    function comprimirImagemGuia(arquivo, max = 1100, qualidade = 0.72) {
        return new Promise(resolve => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = () => {
                img.onload = () => {
                    const escala = Math.min(1, max / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(img.width * escala));
                    canvas.height = Math.max(1, Math.round(img.height * escala));
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', qualidade));
                };
                img.onerror = () => resolve(String(reader.result || ''));
                img.src = String(reader.result || '');
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(arquivo);
        });
    }

    function comprimirDataUrlGuia(src, max = 520, qualidade = 0.4) {
        return new Promise(resolve => {
            if (!String(src || '').startsWith('data:image/')) return resolve(src || '');
            const img = new Image();
            img.onload = () => {
                const escala = Math.min(1, max / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * escala));
                canvas.height = Math.max(1, Math.round(img.height * escala));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', qualidade));
            };
            img.onerror = () => resolve(src || '');
            img.src = src;
        });
    }

    async function compactarGuiasAntesDeSincronizar(dados) {
        const tarefas = [];
        Object.keys(dados || {}).forEach(tipo => {
            if (tipo === '_atlasMeta') return;
            ['esquerdo', 'direito'].forEach(lado => {
                (dados[tipo]?.[lado] || []).forEach(item => {
                    if (String(item.foto || '').startsWith('data:image/') && String(item.foto).length > 120000) {
                        tarefas.push(comprimirDataUrlGuia(item.foto).then(foto => {
                            item.foto = foto;
                            item.fotoThumb = '';
                        }));
                    }
                });
            });
        });
        await Promise.all(tarefas);
        return dados;
    }

    async function prepararArquivoGuia(input) {
        const arquivo = input?.files?.[0];
        if (!arquivo) return { url: '', thumb: '' };

        if (arquivo.type.startsWith('image/')) {
            const fotoLeve = await comprimirImagemGuia(arquivo, 520, 0.4);
            return { url: fotoLeve, thumb: '' };
        }

        return { url: '', thumb: '' };
    }

    function htmlMidiaGuia(item) {
        const botoes = [];
        if (item.foto) {
            const thumb = item.fotoThumb || (String(item.foto).startsWith('data:image/') && String(item.foto).length > 350000 ? '' : item.foto);
            botoes.push(`
                <button onclick="atlasAbrirMidiaGuia('${jsGuia(item.foto)}')" style="position:relative; min-height:120px; border:none; border-radius:10px; overflow:hidden; background:#020617; color:white; padding:0; cursor:pointer; border:1px solid #334155;">
                    ${thumb ? `<img loading="lazy" src="${thumb}" alt="Foto" style="width:100%; height:120px; object-fit:cover; display:block;">` : `<div style="height:120px; display:grid; place-items:center; color:#93c5fd;"><i class="fas fa-image" style="font-size:30px;"></i></div>`}
                    <span style="position:absolute; left:8px; bottom:8px; background:rgba(2,6,23,.82); border-radius:999px; padding:5px 9px; font-size:11px; font-weight:bold;">FOTO</span>
                </button>
            `);
        }
        if (!botoes.length) return `<div style="margin-top:10px; color:#94a3b8; border:1px dashed #475569; border-radius:8px; padding:18px; text-align:center;">Sem foto ainda</div>`;
        return `<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:8px; margin-top:10px;">${botoes.join('')}</div>`;
    }

    function htmlFormGuia(tipo, lado, item = null) {
        if (!podeEditarGuiasInjecao()) return '';
        const editando = !!item;
        return `
            <div class="atlas-guia-form" style="background:#111827; border:1px solid #3b82f6; border-radius:10px; padding:14px; margin-bottom:15px;">
                <h3 style="margin:0 0 12px; color:white; font-size:16px;">${editando ? 'Editar ferro' : 'Adicionar ferro'}</h3>
                <input id="guia-ferro-id" type="hidden" value="${escGuia(item?.id || '')}">
                <input id="guia-ferro-nome" value="${escGuia(item?.nome || '')}" placeholder="Ex: Ferro 1" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">
                <input id="guia-ferro-posicao" value="${escGuia(item?.posicao || '')}" placeholder="Posicao da guia / observacao curta" style="width:100%; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">
                <textarea id="guia-ferro-nota" placeholder="Detalhes de montagem" style="width:100%; min-height:75px; padding:12px; background:#020617; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:10px;">${escGuia(item?.nota || '')}</textarea>
                <label class="atlas-guia-file-label" style="display:block; color:#94a3b8; font-size:12px; margin-bottom:10px;">Foto
                    <input id="guia-ferro-foto" type="file" accept="image/*" onchange="atlasPreviewArquivoGuia(this)" style="width:100%; margin-top:5px; color:white;">
                </label>
                <div id="guia-preview-midia" style="display:none; margin-bottom:10px; background:#020617; border:1px solid #334155; border-radius:8px; padding:10px; color:#bfdbfe; font-size:13px;"></div>
                ${editando ? `<label style="display:flex; gap:8px; align-items:center; color:#cbd5e1; font-size:13px; margin-bottom:10px;"><input id="guia-remover-midia" type="checkbox"> remover foto atual</label>` : ''}
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="guia-btn-salvar" onclick="atlasSalvarFerroGuiaInjecao('${jsGuia(tipo)}','${lado}')" style="background:#10b981; color:white; border:none; padding:12px 16px; border-radius:8px; font-weight:bold;">SALVAR FOTO</button>
                    ${editando ? `<button onclick="atlasAbrirLadoGuiaInjecao('${jsGuia(tipo)}','${lado}')" style="background:#475569; color:white; border:none; padding:12px 16px; border-radius:8px; font-weight:bold;">CANCELAR</button>` : ''}
                </div>
            </div>
        `;
    }

    function inserirCardGuiasInjecao() {
        if (window.atlasModuloAtual !== 'injecao') return;
        const render = document.getElementById('render-modulo');
        if (render?.querySelector('input, select, textarea')) return;
        const grid = render?.querySelector('div[style*="grid-template-columns"]');
        if (!grid || document.getElementById('atlas-card-guias-injecao')) return;
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
        grid.insertAdjacentHTML('beforeend', `
            <div id="atlas-card-guias-injecao" class="card" onclick="atlasAbrirGuiasInjecao()">
                <i class="fas fa-grip-lines"></i><span>Guias / Ferros</span>
            </div>
        `);
    }

    const abrirModuloOriginalGuias = window.abrirModulo || abrirModulo;
    window.abrirModulo = function(nome) {
        window.atlasGuiasInjecaoEmUso = false;
        const retorno = abrirModuloOriginalGuias.apply(this, arguments);
        if (nome === 'injecao') inserirCardGuiasInjecao();
        return retorno;
    };
    abrirModulo = window.abrirModulo;

    window.atlasAbrirGuiasInjecao = function() {
        window.atlasGuiasInjecaoEmUso = true;
        window.atlasGuiasInjecaoTelaAtual = { nivel: 'inicio' };
        const render = document.getElementById('render-modulo');
        if (!render) return;
        const dados = dadosGuiasInjecao();
        const podeEditar = podeEditarGuiasInjecao();
        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
                    <button onclick="abrirModulo('injecao')" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                    <div style="flex:1;">
                        <h2 style="margin:0; color:white;">Guias / Ferros da Injecao</h2>
                        <small style="color:#94a3b8;">Selecione o tipo de chapa para ver lado esquerdo e lado direito.</small>
                    </div>
                    <button onclick="atlasAtualizarGuiasInjecaoManual()" style="background:#334155; color:white; border:none; border-radius:8px; padding:10px 12px; font-weight:bold;">ATUALIZAR</button>
                </div>
                ${podeEditar ? `<div style="background:#052e16; color:#bbf7d0; border:1px solid #10b981; border-radius:8px; padding:10px; margin-bottom:15px;">Modo edicao ativo: pode incluir, alterar e apagar fotos.</div>` : ''}
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px;">
                    ${tiposGuiasInjecao().map(tipo => {
                        const total = (dados[tipo]?.esquerdo?.length || 0) + (dados[tipo]?.direito?.length || 0);
                        return `
                            <div onclick="atlasAbrirTipoGuiaInjecao('${jsGuia(tipo)}')" style="cursor:pointer; background:#1e293b; border:1px solid #334155; border-radius:10px; padding:24px; min-height:145px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                                <i class="fas fa-layer-group" style="font-size:34px; color:#3b82f6; margin-bottom:12px;"></i>
                                <b style="font-size:16px;">${escGuia(tipo)}</b>
                                <small style="color:#94a3b8; margin-top:6px;">${total} ferro(s) cadastrado(s)</small>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    window.atlasAbrirTipoGuiaInjecao = function(tipo) {
        window.atlasGuiasInjecaoEmUso = true;
        window.atlasGuiasInjecaoTelaAtual = { nivel: 'tipo', tipo };
        const render = document.getElementById('render-modulo');
        const dados = dadosGuiasInjecao();
        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
                    <button onclick="atlasAbrirGuiasInjecao()" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                    <div style="flex:1;">
                        <h2 style="margin:0; color:white;">${escGuia(tipo)}</h2>
                        <small style="color:#94a3b8;">Escolha o lado onde a guia fica posicionada.</small>
                    </div>
                    <button onclick="atlasAtualizarGuiasInjecaoManual()" style="background:#334155; color:white; border:none; border-radius:8px; padding:10px 12px; font-weight:bold;">ATUALIZAR</button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:15px;">
                    ${['esquerdo','direito'].map(lado => `
                        <div onclick="atlasAbrirLadoGuiaInjecao('${jsGuia(tipo)}','${lado}')" style="cursor:pointer; background:#1e293b; border:1px solid #334155; border-radius:10px; padding:32px; text-align:center;">
                            <i class="fas fa-arrow-${lado === 'direito' ? 'right' : 'left'}" style="font-size:36px; color:#3b82f6; margin-bottom:12px;"></i>
                            <b style="display:block; font-size:17px;">${nomeLadoGuia(lado)}</b>
                            <small style="color:#94a3b8;">${dados[tipo]?.[lado]?.length || 0} ferro(s)</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.atlasAbrirLadoGuiaInjecao = function(tipo, lado, editarId = '') {
        window.atlasGuiasInjecaoEmUso = true;
        window.atlasGuiasInjecaoTelaAtual = { nivel: 'lado', tipo, lado, editarId };
        const render = document.getElementById('render-modulo');
        const dados = dadosGuiasInjecao();
        const lista = dados[tipo]?.[lado] || [];
        const itemEditando = lista.find(item => String(item.id) === String(editarId));
        const podeEditar = podeEditarGuiasInjecao();

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
                    <button onclick="atlasAbrirTipoGuiaInjecao('${jsGuia(tipo)}')" style="background:none; border:none; color:#94a3b8; font-size:22px; cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                    <div style="flex:1;">
                        <h2 style="margin:0; color:white;">${escGuia(tipo)} - ${nomeLadoGuia(lado)}</h2>
                        <small style="color:#94a3b8;">Posicao da guia e ferros para montagem.</small>
                    </div>
                    <button onclick="atlasAtualizarGuiasInjecaoManual()" style="background:#334155; color:white; border:none; border-radius:8px; padding:10px 12px; font-weight:bold;">ATUALIZAR</button>
                </div>
                ${htmlFormGuia(tipo, lado, itemEditando)}
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px;">
                    ${lista.length ? lista.map(item => `
                        <div class="atlas-guia-ferro-card" style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:14px;">
                            <div class="atlas-guia-ferro-topo" style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                                <div>
                                    <b style="font-size:16px;">${escGuia(item.nome || 'Ferro')}</b><br>
                                    <small style="color:#60a5fa;">${escGuia(item.posicao || 'Sem posicao informada')}</small>
                                </div>
                                ${podeEditar ? `<div class="atlas-guia-acoes" style="display:flex; gap:6px;">
                                    <button class="atlas-guia-btn-editar" onclick="atlasAbrirLadoGuiaInjecao('${jsGuia(tipo)}','${lado}','${jsGuia(item.id)}')" style="background:#f59e0b; color:black; border:none; border-radius:6px; padding:8px; font-weight:bold;">EDITAR</button>
                                    <button class="atlas-guia-btn-apagar" onclick="atlasApagarFerroGuiaInjecao('${jsGuia(tipo)}','${lado}','${jsGuia(item.id)}')" style="background:#ef4444; color:white; border:none; border-radius:6px; padding:8px; font-weight:bold;">X</button>
                                </div>` : ''}
                            </div>
                            ${item.nota ? `<div style="color:#cbd5e1; font-size:13px; margin-top:10px; line-height:1.45;">${escGuia(item.nota)}</div>` : ''}
                            ${htmlMidiaGuia(item)}
                        </div>
                    `).join('') : `<div style="grid-column:1/-1; color:#94a3b8; border:1px dashed #475569; border-radius:10px; padding:30px; text-align:center;">Ainda nao existem ferros cadastrados para este lado.</div>`}
                </div>
            </div>
        `;
    };

    window.atlasPreviewArquivoGuia = function(input) {
        const preview = document.getElementById('guia-preview-midia');
        const arquivo = input?.files?.[0];
        if (!preview || !arquivo) return;
        const mb = (arquivo.size / 1024 / 1024).toFixed(1);
        if (!arquivo.type.startsWith('image/')) {
            alert('Escolha apenas foto nesta parte.');
            input.value = '';
            preview.style.display = 'none';
            return;
        }
        preview.style.display = 'block';
        const url = URL.createObjectURL(arquivo);
        preview.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #334155;">
                <div><b>Foto selecionada</b><br><small>${escGuia(arquivo.name)} | ${mb} MB</small></div>
            </div>
        `;
    };

    window.atlasAbrirMidiaGuia = function(src) {
        if (!src) return;
        const antigo = document.getElementById('atlas-modal-midia-guia');
        if (antigo) antigo.remove();
        const modal = document.createElement('div');
        modal.id = 'atlas-modal-midia-guia';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(2,6,23,.94); display:flex; align-items:center; justify-content:center; padding:14px;';
        modal.innerHTML = `
            <div style="width:min(96vw,900px); max-height:94vh; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:flex-end;">
                    <button onclick="document.getElementById('atlas-modal-midia-guia')?.remove()" style="background:#ef4444; color:white; border:none; border-radius:10px; padding:12px 18px; font-weight:bold;">FECHAR</button>
                </div>
                <div style="background:#020617; border:1px solid #334155; border-radius:12px; padding:8px; overflow:auto; text-align:center;">
                    <img src="${escGuia(src)}" alt="Foto da guia" style="max-width:100%; max-height:78vh; object-fit:contain; border-radius:8px;">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.atlasSalvarFerroGuiaInjecao = async function(tipo, lado) {
        if (!podeEditarGuiasInjecao()) return alert('Apenas ADMIN ou SUPERVISOR podem alterar guias.');
        const dados = dadosGuiasInjecao();
        dados[tipo] ||= { esquerdo: [], direito: [] };
        dados[tipo][lado] ||= [];

        const id = document.getElementById('guia-ferro-id')?.value || '';
        const nome = document.getElementById('guia-ferro-nome')?.value.trim();
        if (!nome) return alert('Informe o nome do ferro.');
        window.atlasGuiasInjecaoSalvandoLocal = true;

        const lista = dados[tipo][lado];
        const atual = lista.find(item => String(item.id) === String(id));
        const antesAuditoria = atual ? { ...atual } : null;
        const itemId = atual?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const removerMidia = !!document.getElementById('guia-remover-midia')?.checked;
        localStorage.setItem('atlas_guias_editando_ate', String(Date.now() + 120000));
        const botaoSalvar = document.getElementById('guia-btn-salvar');
        if (botaoSalvar) {
            botaoSalvar.disabled = true;
            botaoSalvar.textContent = 'SALVANDO...';
            botaoSalvar.style.opacity = '.75';
        }

        let fotoNova = { url: '', thumb: '' };
        try {
            fotoNova = await prepararArquivoGuia(document.getElementById('guia-ferro-foto'), `${tipo}/${lado}/${itemId}/foto`);
        } catch (erro) {
            console.error('Erro ao publicar foto da guia:', erro);
            const detalhe = String(erro?.message || erro?.code || erro || '');
            alert(`Nao foi possivel publicar a foto agora. Detalhe: ${detalhe || 'erro desconhecido'}`);
            if (botaoSalvar) {
                botaoSalvar.disabled = false;
                botaoSalvar.textContent = 'SALVAR FOTO';
                botaoSalvar.style.opacity = '1';
            }
            window.atlasGuiasInjecaoSalvandoLocal = false;
            return;
        }

        const item = {
            id: itemId,
            nome,
            posicao: document.getElementById('guia-ferro-posicao')?.value.trim() || '',
            nota: document.getElementById('guia-ferro-nota')?.value.trim() || '',
            foto: removerMidia ? '' : (fotoNova.url || atual?.foto || ''),
            fotoThumb: removerMidia ? '' : (fotoNova.thumb || atual?.fotoThumb || ''),
            atualizadoEm: new Date().toLocaleString('pt-BR'),
            atualizadoPor: document.getElementById('user-display')?.innerText || usuarioLogado?.id || 'SISTEMA'
        };

        if (atual) Object.assign(atual, item);
        else lista.push(item);
        try {
            await compactarGuiasAntesDeSincronizar(dados);
            const depoisAuditoria = lista.find(guia => String(guia.id) === String(itemId)) || item;
            registrarSalvarGuia(tipo, lado, antesAuditoria, depoisAuditoria);
            salvarGuiasInjecao(dados);
            localStorage.setItem('atlas_guias_editando_ate', String(Date.now() + 8000));
            atlasAbrirLadoGuiaInjecao(tipo, lado);
            setTimeout(() => { window.atlasGuiasInjecaoSalvandoLocal = false; }, 500);
        } catch (erroSalvar) {
            console.error('Erro ao salvar guia:', erroSalvar);
            alert('Nao foi possivel salvar. Apague fotos antigas desta guia e tente novamente.');
            if (botaoSalvar) {
                botaoSalvar.disabled = false;
                botaoSalvar.textContent = 'SALVAR FOTO';
                botaoSalvar.style.opacity = '1';
            }
            window.atlasGuiasInjecaoSalvandoLocal = false;
        }
    };

    window.atlasApagarFerroGuiaInjecao = async function(tipo, lado, id) {
        if (!podeEditarGuiasInjecao()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar guias.');
        if (!confirm('Apagar este ferro da guia?')) return;
        const dados = dadosGuiasInjecao();
        const itemApagado = (dados[tipo]?.[lado] || []).find(item => String(item.id) === String(id));
        dados[tipo][lado] = (dados[tipo]?.[lado] || []).filter(item => String(item.id) !== String(id));
        localStorage.setItem('atlas_guias_editando_ate', String(Date.now() + 15000));
        await compactarGuiasAntesDeSincronizar(dados);
        registrarApagarGuia(tipo, lado, itemApagado);
        salvarGuiasInjecao(dados);
        atlasAbrirLadoGuiaInjecao(tipo, lado);
    };

    function formularioGuiaEstaEmUso() {
        const form = document.getElementById('guia-btn-salvar')?.closest('div[style*="border:1px solid #3b82f6"]');
        if (!form) return false;
        const nome = document.getElementById('guia-ferro-nome')?.value.trim() || '';
        const posicao = document.getElementById('guia-ferro-posicao')?.value.trim() || '';
        const nota = document.getElementById('guia-ferro-nota')?.value.trim() || '';
        const arquivo = document.getElementById('guia-ferro-foto')?.files?.length || 0;
        const editando = !!document.getElementById('guia-ferro-id')?.value;
        const focoDentro = form.contains(document.activeElement);
        return Boolean(focoDentro || nome || posicao || nota || arquivo || editando || window.atlasGuiasInjecaoSalvandoLocal);
    }

    function atualizarTelaGuiasDaNuvem() {
        if (!window.atlasGuiasInjecaoEmUso) return;
        const tela = window.atlasGuiasInjecaoTelaAtual || { nivel: 'inicio' };
        if (formularioGuiaEstaEmUso()) {
            window.atlasGuiasInjecaoAtualizacaoPendente = true;
            return;
        }
        if (tela.nivel === 'lado') return window.atlasAbrirLadoGuiaInjecao(tela.tipo, tela.lado, '');
        if (tela.nivel === 'tipo') return window.atlasAbrirTipoGuiaInjecao(tela.tipo);
        window.atlasAbrirGuiasInjecao();
    }

    function mostrarAvisoGuias(texto, cor = '#10b981') {
        let aviso = document.getElementById('atlas-guias-aviso-sync');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'atlas-guias-aviso-sync';
            aviso.style.cssText = 'position:fixed;left:14px;right:14px;top:12px;z-index:99999;color:white;padding:12px 14px;border-radius:10px;text-align:center;font-weight:bold;box-shadow:0 8px 22px rgba(0,0,0,.35);';
            document.body.appendChild(aviso);
        }
        aviso.style.background = cor;
        aviso.textContent = texto;
        clearTimeout(window.atlasGuiasAvisoTimer);
        window.atlasGuiasAvisoTimer = setTimeout(() => aviso.remove(), 1600);
    }

    window.atlasAtualizarGuiasInjecaoManual = async function() {
        if (!window.atlasGuiasInjecaoEmUso || window.atlasGuiasInjecaoAtualizandoManual) return;
        window.atlasGuiasInjecaoAtualizandoManual = true;
        mostrarAvisoGuias('Atualizando sistema...');
        try {
            const atualizou = typeof window.atlasFirebaseSincronizarAgora === 'function'
                ? await window.atlasFirebaseSincronizarAgora()
                : (typeof window.atlasFirebaseAtualizarGuiasInjecao === 'function'
                    ? await window.atlasFirebaseAtualizarGuiasInjecao()
                    : false);
            if (typeof window.atlasFirebaseAtualizarGuiasInjecao === 'function') {
                await window.atlasFirebaseAtualizarGuiasInjecao();
            }
            if (typeof atlasRecarregarDadosLocaisDaNuvem === 'function') {
                atlasRecarregarDadosLocaisDaNuvem();
            }
            if (typeof aplicarPermissoesUsuario === 'function') aplicarPermissoesUsuario();
            if (typeof aplicarPreferenciasVisuaisUsuario === 'function') aplicarPreferenciasVisuaisUsuario();
            atualizarTelaGuiasDaNuvem();
            mostrarAvisoGuias(atualizou === false ? 'Sistema ja estava atualizado' : 'Sistema atualizado');
        } catch (erro) {
            console.error('Erro ao atualizar sistema manualmente:', erro);
            const atualizouGuias = typeof window.atlasFirebaseAtualizarGuiasInjecao === 'function'
                ? await window.atlasFirebaseAtualizarGuiasInjecao().catch(() => false)
                : false;
            atualizarTelaGuiasDaNuvem();
            mostrarAvisoGuias(atualizouGuias ? 'Guias atualizadas' : 'Nao foi possivel atualizar agora', atualizouGuias ? '#10b981' : '#ef4444');
        } finally {
            setTimeout(() => { window.atlasGuiasInjecaoAtualizandoManual = false; }, 600);
        }
    };

    function instalarPuxarAtualizarGuias() {
        if (window.atlasPullGuiasInstalado) return;
        window.atlasPullGuiasInstalado = true;
        let inicioY = 0;
        let puxando = false;

        document.addEventListener('touchstart', function(evento) {
            if (!window.atlasGuiasInjecaoEmUso) return;
            if (window.scrollY > 8) return;
            inicioY = evento.touches?.[0]?.clientY || 0;
            puxando = inicioY > 0;
        }, { passive: true });

        document.addEventListener('touchend', function(evento) {
            if (!puxando || !window.atlasGuiasInjecaoEmUso) return;
            const fimY = evento.changedTouches?.[0]?.clientY || 0;
            const distancia = fimY - inicioY;
            puxando = false;
            if (window.scrollY <= 8 && distancia > 75) {
                window.atlasAtualizarGuiasInjecaoManual();
            }
        }, { passive: true });
    }

    window.addEventListener('atlasDadosNuvemAtualizados', function(evento) {
        const chaves = evento?.detail?.chaves || [];
        if (!chaves.includes(CHAVE_GUIAS_INJECAO)) return;
        clearTimeout(window.atlasGuiasInjecaoTimerNuvem);
        window.atlasGuiasInjecaoTimerNuvem = setTimeout(atualizarTelaGuiasDaNuvem, 250);
    });

    document.addEventListener('focusout', function() {
        if (!window.atlasGuiasInjecaoAtualizacaoPendente) return;
        clearTimeout(window.atlasGuiasInjecaoTimerPendente);
        window.atlasGuiasInjecaoTimerPendente = setTimeout(function() {
            if (formularioGuiaEstaEmUso()) return;
            window.atlasGuiasInjecaoAtualizacaoPendente = false;
            atualizarTelaGuiasDaNuvem();
        }, 600);
    });

    window.atlasCompactarFotosGuiasInjecao = async function() {
        return false;
    };

    instalarPuxarAtualizarGuias();

    if (window.atlasModuloAtual === 'injecao') setTimeout(inserirCardGuiasInjecao, 0);
})();

/* ==========================================================
   FINALIZAR DIA DIRETO COM RELATORIO NA TELA
   ========================================================== */
(function() {
    function atlasFinalDiaHtml(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function atlasPayloadFinalDia(rel) {
        return encodeURIComponent(JSON.stringify(rel));
    }

    function atlasAcaoAuditoriaFinalDia(modulo, detalhe) {
        if (typeof atlasRegistrarAuditoria === 'function') {
            atlasRegistrarAuditoria('Finalizou relatorio', modulo, detalhe);
        }
    }

    window.atlasRenderRelatorioInjecaoFinalizado = function(rel, modulo = 'injecao') {
        const render = document.getElementById('render-modulo');
        if (!render) return;

        const itens = Array.isArray(rel.itens) ? rel.itens : [];
        const totalMetros = itens.reduce((total, item) => total + (parseFloat(item.metros) || 0), 0);

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                    <div>
                        <h2 style="margin:0; color:#10b981; font-size:20px;">Relatorio finalizado</h2>
                        <div style="color:#94a3b8; font-size:13px; margin-top:4px;">Injecao | ${atlasFinalDiaHtml(rel.data)} | ${atlasFinalDiaHtml(rel.operador)}</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button onclick="gerarPDF_Injecao_Final('${atlasPayloadFinalDia(rel)}')" style="background:#10b981; color:white; border:none; padding:11px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">PDF / IMPRIMIR</button>
                        <button onclick="abrirModulo('${atlasFinalDiaHtml(modulo)}')" style="background:#334155; color:white; border:none; padding:11px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">FECHAR</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:15px;">
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:12px;"><b>Total</b><br><span style="color:#10b981; font-size:20px; font-weight:bold;">${totalMetros.toFixed(2)} m</span></div>
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:12px;"><b>Linhas</b><br><span style="color:#38bdf8; font-size:20px; font-weight:bold;">${itens.length}</span></div>
                </div>

                <div style="overflow:auto; background:#0f172a; border:1px solid #334155; border-radius:10px;">
                    <table style="width:100%; border-collapse:collapse; min-width:760px;">
                        <thead>
                            <tr style="background:#1e293b; color:#cbd5e1;">
                                <th style="padding:10px; text-align:left;">Painel</th>
                                <th style="padding:10px; text-align:left;">Esp.</th>
                                <th style="padding:10px; text-align:left;">RAL</th>
                                <th style="padding:10px; text-align:left;">Metros</th>
                                <th style="padding:10px; text-align:left;">Vel.</th>
                                <th style="padding:10px; text-align:left;">Quimicos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itens.map(item => `
                                <tr style="border-top:1px solid #334155;">
                                    <td style="padding:10px;">${item.pir ? '<b style="color:#facc15;">PIR</b> - ' : ''}${atlasFinalDiaHtml(item.nome)}</td>
                                    <td style="padding:10px;">${atlasFinalDiaHtml(item.esp)} mm</td>
                                    <td style="padding:10px;">${atlasFinalDiaHtml(item.ral || '')}</td>
                                    <td style="padding:10px;">${atlasFinalDiaHtml(item.metros)} m</td>
                                    <td style="padding:10px;">${atlasFinalDiaHtml(item.vel || '')}</td>
                                    <td style="padding:10px;">POL ${atlasFinalDiaHtml(item.pol || 0)} | MDI ${atlasFinalDiaHtml(item.mdi || 0)} | PEN ${atlasFinalDiaHtml(item.pen || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    window.atlasFinalizarDiaInjecao = function(modulo) {
        if (!producoesDoDia.length) return alert('Adicione itens antes de finalizar.');

        const dataInput = document.getElementById('data-producao')?.value;
        const d = new Date((dataInput || new Date().toISOString().split('T')[0]) + 'T12:00:00');
        const ano = d.getFullYear();
        const mes = d.toLocaleString('pt-br', { month: 'long' }).toUpperCase();
        const rel = {
            modulo,
            data: d.toLocaleDateString('pt-br'),
            operador: document.getElementById('user-display')?.innerText || 'OPERADOR',
            itens: [...producoesDoDia]
        };

        const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
        db[ano] ||= {};
        db[ano][mes] ||= [];
        db[ano][mes].push(rel);
        localStorage.setItem('atlas_db', JSON.stringify(db));

        atlasAcaoAuditoriaFinalDia('injecao', `Modulo: ${modulo}`);
        producoesDoDia = [];
        atlasRenderRelatorioInjecaoFinalizado(rel, modulo);
    };

    window.atlasRenderRelatorioSerraFinalizado = function(rel) {
        const render = document.getElementById('render-modulo');
        if (!render) return;

        const itens = Array.isArray(rel.itens) ? rel.itens : [];
        const totalGeral = Number(rel.totalGeral || itens.reduce((total, item) => total + ((parseFloat(item.metros) || 0) * (parseInt(item.qtd, 10) || 1)), 0));

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                    <div>
                        <h2 style="margin:0; color:#10b981; font-size:20px;">Relatorio finalizado</h2>
                        <div style="color:#94a3b8; font-size:13px; margin-top:4px;">Serra | ${atlasFinalDiaHtml(rel.data)} | ${atlasFinalDiaHtml(rel.operador)}</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button onclick="gerarPDF_Serra('${atlasPayloadFinalDia(rel)}')" style="background:#10b981; color:white; border:none; padding:11px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">PDF / IMPRIMIR</button>
                        <button onclick="renderizarMenuSerra()" style="background:#334155; color:white; border:none; padding:11px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">FECHAR</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:15px;">
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:12px;"><b>Total</b><br><span style="color:#10b981; font-size:20px; font-weight:bold;">${totalGeral.toFixed(2)} m</span></div>
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:12px;"><b>Linhas</b><br><span style="color:#38bdf8; font-size:20px; font-weight:bold;">${itens.length}</span></div>
                </div>

                <div style="overflow:auto; background:#0f172a; border:1px solid #334155; border-radius:10px;">
                    <table style="width:100%; border-collapse:collapse; min-width:820px;">
                        <thead>
                            <tr style="background:#1e293b; color:#cbd5e1;">
                                <th style="padding:10px; text-align:left;">Tipo</th>
                                <th style="padding:10px; text-align:left;">Esp.</th>
                                <th style="padding:10px; text-align:left;">RAL sup.</th>
                                <th style="padding:10px; text-align:left;">RAL inf.</th>
                                <th style="padding:10px; text-align:left;">Qtd</th>
                                <th style="padding:10px; text-align:left;">Medida</th>
                                <th style="padding:10px; text-align:left;">Total</th>
                                <th style="padding:10px; text-align:left;">Pedido/Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itens.map(item => {
                                const qtd = parseInt(item.qtd, 10) || 1;
                                const metros = parseFloat(item.metros) || 0;
                                return `
                                    <tr style="border-top:1px solid #334155;">
                                        <td style="padding:10px;">${atlasFinalDiaHtml(item.tipo || '')}</td>
                                        <td style="padding:10px;">${atlasFinalDiaHtml(item.esp || '')} mm</td>
                                        <td style="padding:10px;">${atlasFinalDiaHtml(item.ralS || '')}</td>
                                        <td style="padding:10px;">${atlasFinalDiaHtml(item.ralI || '')}</td>
                                        <td style="padding:10px;">${qtd}</td>
                                        <td style="padding:10px;">${metros.toFixed(2)} m</td>
                                        <td style="padding:10px;">${(qtd * metros).toFixed(2)} m</td>
                                        <td style="padding:10px;">${atlasFinalDiaHtml(item.desc || '')}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    window.atlasFinalizarDiaSerra = function() {
        if (db_serra_live.length === 0) return alert('Adicione itens antes de finalizar.');

        const seletorData = document.getElementById('h-data-rel-serra')?.value || '';
        let dataFinal, dia, mes, ano;

        if (seletorData) {
            const partes = seletorData.split('-');
            ano = partes[0];
            mes = partes[1];
            dia = partes[2];
            dataFinal = `${dia}/${mes}/${ano}`;
        } else {
            const hoje = new Date();
            dataFinal = hoje.toLocaleDateString('pt-BR');
            dia = String(hoje.getDate()).padStart(2, '0');
            mes = String(hoje.getMonth() + 1).padStart(2, '0');
            ano = hoje.getFullYear();
        }

        const rel = {
            id: Date.now(),
            data: dataFinal,
            dia,
            mes: parseInt(mes, 10),
            ano,
            operador: document.getElementById('user-display')?.innerText || 'OP. SERRA',
            itens: [...db_serra_live],
            totalGeral: db_serra_live.reduce((acc, cur) => acc + ((parseFloat(cur.metros) || 0) * (parseInt(cur.qtd, 10) || 1)), 0).toFixed(2)
        };

        db_serra_hist.push(rel);
        localStorage.setItem('atlas_serra_hist', JSON.stringify(db_serra_hist));

        if (typeof registrarPedidosSerraParaConferencia === 'function') {
            registrarPedidosSerraParaConferencia(rel.itens, rel);
        }

        atlasAcaoAuditoriaFinalDia('serra', 'Fechou dia da serra');
        db_serra_live = [];
        localStorage.removeItem('atlas_serra_live');
        atlasRenderRelatorioSerraFinalizado(rel);
    };
})();

/* ==========================================================
   PLANO HISTORICO - GERIR IGUAL A PLANILHA GERAL
   ========================================================== */

(function() {
    if (window.atlasHistoricoGerirIgualPlanilhaAtivo) return;
    window.atlasHistoricoGerirIgualPlanilhaAtivo = true;

    const escHistExcel = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const numHistExcel = valor => {
        const n = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };
    const keyHistExcel = valor => String(valor ?? '').replace(/[^a-z0-9]/gi, '_');
    const jsHistExcel = valor => String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const opcoesHistExcel = (lista, selecionado, sufixo = '') => (lista || []).map(v => {
        const limpo = String(v ?? '');
        const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
        return `<option value="${escHistExcel(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${escHistExcel(texto)}</option>`;
    }).join('');

    function linhasHistoricoExcel(rel) {
        return (rel?.itens || [])
            .map((item, idx) => ({ item, idx }))
            .filter(reg => reg.item.modo === 'pedido');
    }

    function gruposHistoricoExcel(linhas) {
        const mapa = {};
        const ordem = [];
        linhas.forEach(reg => {
            const item = reg.item;
            const chave = [
                item.pedidoNumero || 'S/N',
                item.destino || '',
                item.tipo || '',
                item.espessura || '',
                item.ralInferior || '',
                item.ralSuperior || ''
            ].join('|||');
            if (!mapa[chave]) {
                mapa[chave] = { chave, linhas: [] };
                ordem.push(mapa[chave]);
            }
            mapa[chave].linhas.push(reg);
        });
        return ordem;
    }

    function recalcularHistoricoExcel(rel) {
        rel.totalGeral = Number((rel.itens || []).reduce((acc, item) => acc + numHistExcel(item.totalMetros), 0).toFixed(2));
        if (typeof gerarResumoPlano === 'function') rel.resumo = gerarResumoPlano(rel.itens || []);
    }

    function grupoCellsHistoricoExcel(grupo) {
        const base = grupo.linhas[0]?.item || {};
        const id = `histgrp-${keyHistExcel(grupo.chave)}`;
        const span = grupo.linhas.length;
        return `
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${id}-pedido" value="${escHistExcel(base.pedidoNumero || '')}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${id}-destino" value="${escHistExcel(base.destino || '')}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-tipo">${opcoesHistExcel(OPCOES_TIPO_PLANO, base.tipo)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-esp">${opcoesHistExcel(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-inf">${opcoesHistExcel(OPCOES_RAL_INF, base.ralInferior)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-sup">${opcoesHistExcel(OPCOES_RAL_SUP, base.ralSuperior)}</select></td>
        `;
    }

    function aplicarGrupoHistoricoExcel(chave, item) {
        const id = `histgrp-${keyHistExcel(chave)}`;
        item.pedidoNumero = document.getElementById(`${id}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${id}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${id}-ral-sup`)?.value || item.ralSuperior;
        item.perfilInferior = tipoPlanoAceitaPerfil(item.tipo) ? (item.perfilInferior || item.acabamentoInferior || 'Canelada') : '';
        item.perfilSuperior = tipoPlanoAceitaPerfil(item.tipo) ? (item.perfilSuperior || item.acabamentoSuperior || 'Canelada') : '';
        item.acabamentoInferior = item.perfilInferior;
        item.acabamentoSuperior = item.perfilSuperior;
    }

    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const modal = document.getElementById('modal-plano-historico');
        if (!rel || !modal) return;

        const linhas = linhasHistoricoExcel(rel);
        const total = linhas.reduce((acc, reg) => acc + numHistExcel(reg.item.totalMetros), 0);
        const grupos = gruposHistoricoExcel(linhas);
        const base = linhas[0]?.item || {};

        const htmlGrupos = grupos.map(grupo => grupo.linhas.map((reg, index) => {
            const item = reg.item;
            return `
                <tr>
                    ${index === 0 ? grupoCellsHistoricoExcel(grupo) : ''}
                    <td><input id="histxl-${reg.idx}-qtd" type="number" value="${escHistExcel(item.quantidadeChapas || 0)}"></td>
                    <td><input id="histxl-${reg.idx}-metros" type="number" step="0.01" value="${escHistExcel(item.metrosUnidade || 0)}"></td>
                    <td><input id="histxl-${reg.idx}-info" value="${escHistExcel(item.infoManual || item.descricaoManual || '')}"></td>
                    <td><input id="histxl-${reg.idx}-urgente" type="checkbox" ${item.urgente ? 'checked' : ''}></td>
                    <td><b>${numHistExcel(item.totalMetros).toFixed(2)} m</b></td>
                    <td>
                        <button onclick="atlasSalvarLinhaGestaoHistoricoExcel(${indexPlano}, ${reg.idx}, '${jsHistExcel(grupo.chave)}')">SALVAR</button>
                        <button onclick="atlasExcluirLinhaGestaoHistoricoExcel(${indexPlano}, ${reg.idx})" class="perigo">EXCLUIR</button>
                    </td>
                </tr>
            `;
        }).join('')).join('');

        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div>
                        <h2>Planilha geral dos pedidos</h2>
                        <small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small>
                    </div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralHistorico(${indexPlano})" class="pdf">PDF GERAL</button>
                        <button onclick="fecharGestaoPlanoHistorico()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="histxl-add-pedido" placeholder="Pedido">
                    <input id="histxl-add-destino" placeholder="Cliente">
                    <input id="histxl-add-qtd" type="number" placeholder="Qtd">
                    <input id="histxl-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="histxl-add-tipo">${opcoesHistExcel(OPCOES_TIPO_PLANO, base.tipo)}</select>
                    <select id="histxl-add-esp">${opcoesHistExcel(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select>
                    <select id="histxl-add-ral-inf">${opcoesHistExcel(OPCOES_RAL_INF, base.ralInferior)}</select>
                    <select id="histxl-add-ral-sup">${opcoesHistExcel(OPCOES_RAL_SUP, base.ralSuperior)}</select>
                    <button onclick="atlasAdicionarLinhaGestaoHistoricoExcel(${indexPlano})">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Cliente</th>
                                <th>Tipo</th>
                                <th>Esp.</th>
                                <th>RAL Inf.</th>
                                <th>RAL Sup.</th>
                                <th>Qtd</th>
                                <th>Metros</th>
                                <th>Obs.</th>
                                <th>Urg.</th>
                                <th>Total</th>
                                <th>Acoes</th>
                            </tr>
                        </thead>
                        <tbody>${htmlGrupos || '<tr><td colspan="12">Nenhum pedido neste plano.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    };

    window.atlasSalvarLinhaGestaoHistoricoExcel = function(indexPlano, idx, chave) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!rel || !item) return;
        const qtd = numHistExcel(document.getElementById(`histxl-${idx}-qtd`)?.value);
        const metros = numHistExcel(document.getElementById(`histxl-${idx}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');

        aplicarGrupoHistoricoExcel(chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetrosAntesCancelamento = Number((qtd * metros).toFixed(2));
        item.totalMetros = item.encomendaCancelada ? 0 : item.totalMetrosAntesCancelamento;
        item.infoManual = document.getElementById(`histxl-${idx}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`histxl-${idx}-urgente`)?.checked;
        item.descricao = `${item.tipo} ${item.espessura} mm`;

        recalcularHistoricoExcel(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha ${item.pedidoNumero || 'S/N'} na planilha geral`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.atlasExcluirLinhaGestaoHistoricoExcel = function(indexPlano, idx) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!rel || !item) return;
        if (!confirm('Excluir esta linha do historico?')) return;
        rel.itens.splice(idx, 1);
        recalcularHistoricoExcel(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, 'Excluiu linha na planilha geral');
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.atlasAdicionarLinhaGestaoHistoricoExcel = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;
        const qtd = numHistExcel(document.getElementById('histxl-add-qtd')?.value);
        const metros = numHistExcel(document.getElementById('histxl-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos para inserir.');

        const tipo = document.getElementById('histxl-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('histxl-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';
        const aceitaPerfil = tipoPlanoAceitaPerfil(tipo);
        const novo = {
            id: Date.now() + '-' + Math.random().toString(16).slice(2),
            modo: 'pedido',
            pedidoNumero: document.getElementById('histxl-add-pedido')?.value.trim() || 'S/N',
            destino: document.getElementById('histxl-add-destino')?.value.trim() || '',
            tipo,
            espessura,
            ralInferior: document.getElementById('histxl-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('histxl-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            totalMetrosAntesCancelamento: Number((qtd * metros).toFixed(2)),
            infoManual: '',
            descricaoManual: '',
            descricao: `${tipo} ${espessura} mm`,
            perfilInferior: aceitaPerfil ? 'Canelada' : '',
            perfilSuperior: aceitaPerfil ? 'Canelada' : '',
            acabamentoInferior: aceitaPerfil ? 'Canelada' : '',
            acabamentoSuperior: aceitaPerfil ? 'Canelada' : '',
            urgente: false
        };
        rel.itens ||= [];
        rel.itens.push(novo);
        recalcularHistoricoExcel(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Inseriu linha ${novo.pedidoNumero} na planilha geral`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };
})();

/* ==========================================================
   PLANO - LIMPAR BOTOES DUPLICADOS E CENTRALIZAR BOTAO GERAL
   ========================================================== */

(function() {
    if (window.atlasPlanoBotaoGeralUnicoAtivo) return;
    window.atlasPlanoBotaoGeralUnicoAtivo = true;

    function temPedidos() {
        return (db_plano_live?.linhasAbertas || []).some(item => item.modo === 'pedido');
    }

    function limparBotoesGerais() {
        document.querySelectorAll(
            '#atlas-plano-geral-persistente, #atlas-plano-geral-fallback, #atlas-plano-geral-persistente-final, #atlas-plano-geral-final-absoluto, .atlas-plano-geral-barra'
        ).forEach(el => el.remove());
    }

    function inserirBotaoUnico() {
        limparBotoesGerais();
        if (!temPedidos()) return;
        const container = document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
        if (!container) return;
        const titulos = Array.from(container.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const ref = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!ref) return;
        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-unico';
        barra.className = 'atlas-plano-geral-barra destaque unico';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;
        ref.insertAdjacentElement('afterend', barra);
    }

    function agendar() {
        setTimeout(inserirBotaoUnico, 0);
        setTimeout(inserirBotaoUnico, 200);
        setTimeout(inserirBotaoUnico, 700);
    }

    const atualizar = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizar();
        agendar();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrir = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrir(modo);
        agendar();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizar = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizar();
        agendar();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;
})();

/* ==========================================================
   PLANO - CORRECAO FINAL: PLANILHA GERAL MESCLADA E BOTAO FIXO
   ========================================================== */

(function() {
    if (window.atlasPlanoMesclaFinalDefinitivaAtivo) return;
    window.atlasPlanoMesclaFinalDefinitivaAtivo = true;

    const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const num = valor => {
        const n = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };
    const js = valor => String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const opts = (lista, selecionado, sufixo = '') => (lista || []).map(v => {
        const limpo = String(v ?? '');
        const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
        return `<option value="${esc(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${esc(texto)}</option>`;
    }).join('');
    const keyId = chave => String(chave || '').replace(/[^a-z0-9]/gi, '_');

    function modalFinal() {
        let modal = document.getElementById('atlas-plano-geral-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'atlas-plano-geral-modal';
            modal.className = 'atlas-plano-live-modal';
            document.body.appendChild(modal);
        }
        return modal;
    }

    function linhasLiveFinal() {
        return (db_plano_live?.linhasAbertas || []).filter(item => item.modo === 'pedido');
    }

    function gruposFinal(linhas) {
        const mapa = {};
        const ordem = [];
        linhas.forEach(item => {
            const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || ''}`;
            if (!mapa[chave]) {
                mapa[chave] = { chave, pedido: item.pedidoNumero || 'S/N', destino: item.destino || '', linhas: [] };
                ordem.push(mapa[chave]);
            }
            mapa[chave].linhas.push(item);
        });
        return ordem;
    }

    function grupoCells(grupo) {
        const base = grupo.linhas[0] || {};
        const id = `final-${keyId(grupo.chave)}`;
        const span = grupo.linhas.length;
        return `
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${id}-pedido" value="${esc(grupo.pedido)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${id}-destino" value="${esc(grupo.destino)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-tipo">${opts(OPCOES_TIPO_PLANO, base.tipo)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-esp">${opts(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-inf">${opts(OPCOES_RAL_INF, base.ralInferior)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-sup">${opts(OPCOES_RAL_SUP, base.ralSuperior)}</select></td>
        `;
    }

    function aplicarGrupo(chave, item) {
        const id = `final-${keyId(chave)}`;
        item.pedidoNumero = document.getElementById(`${id}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${id}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${id}-ral-sup`)?.value || item.ralSuperior;
    }

    window.atlasAbrirPlanilhaGeralLive = function() {
        const linhas = linhasLiveFinal();
        if (!linhas.length) return alert('Nao existem pedidos inseridos no plano.');
        const grupos = gruposFinal(linhas);
        const total = linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const modal = modalFinal();
        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div><h2>Planilha geral dos pedidos</h2><small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small></div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="geral-add-pedido" placeholder="Pedido">
                    <input id="geral-add-destino" placeholder="Cliente">
                    <input id="geral-add-qtd" type="number" placeholder="Qtd">
                    <input id="geral-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="geral-add-tipo">${opts(OPCOES_TIPO_PLANO, linhas[0]?.tipo)}</select>
                    <select id="geral-add-esp">${opts(OPCOES_ESPESSURA_PLANO, linhas[0]?.espessura, ' mm')}</select>
                    <select id="geral-add-ral-inf">${opts(OPCOES_RAL_INF, linhas[0]?.ralInferior)}</select>
                    <select id="geral-add-ral-sup">${opts(OPCOES_RAL_SUP, linhas[0]?.ralSuperior)}</select>
                    <button onclick="atlasAdicionarLinhaGeralLive()">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${grupos.map(grupo => grupo.linhas.map((item, i) => `
                                <tr>
                                    ${i === 0 ? grupoCells(grupo) : ''}
                                    <td><input id="geral-${item.id}-qtd" type="number" value="${esc(item.quantidadeChapas || 0)}"></td>
                                    <td><input id="geral-${item.id}-metros" type="number" step="0.01" value="${esc(item.metrosUnidade || 0)}"></td>
                                    <td><input id="geral-${item.id}-info" value="${esc(item.infoManual || item.descricaoManual || '')}"></td>
                                    <td><input id="geral-${item.id}-urgente" type="checkbox" ${item.urgente ? 'checked' : ''}></td>
                                    <td><b>${Number(item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaGeralLive('${item.id}', '${js(grupo.chave)}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaGeralLive('${item.id}')" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.atlasSalvarLinhaGeralLive = function(id, chave = '') {
        const item = linhasLiveFinal().find(linha => String(linha.id) === String(id));
        if (!item) return;
        const qtd = num(document.getElementById(`geral-${id}-qtd`)?.value);
        const metros = num(document.getElementById(`geral-${id}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        if (chave) aplicarGrupo(chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`geral-${id}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`geral-${id}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero || 'S/N'}`;
        if (item.destino && !destinosPlano.includes(item.destino)) {
            destinosPlano.push(item.destino);
            destinosPlano.sort();
            salvarDestinosPlano();
        }
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaGeralLive();
    };

    function garantirBotaoFinal() {
        if (!linhasLiveFinal().length) return;
        if (document.getElementById('atlas-plano-geral-persistente-final')) return;
        const container = document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
        if (!container) return;
        const titulos = Array.from(container.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const ref = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!ref) return;
        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-persistente-final';
        barra.className = 'atlas-plano-geral-barra destaque persistente';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;
        ref.insertAdjacentElement('afterend', barra);
    }

    function agendarBotaoFinal() {
        setTimeout(garantirBotaoFinal, 0);
        setTimeout(garantirBotaoFinal, 150);
        setTimeout(garantirBotaoFinal, 500);
    }

    const atualizarFinal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarFinal();
        document.getElementById('atlas-plano-geral-persistente-final')?.remove();
        agendarBotaoFinal();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrirFinal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFinal(modo);
        document.getElementById('atlas-plano-geral-persistente-final')?.remove();
        agendarBotaoFinal();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizarFinal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizarFinal();
        document.getElementById('atlas-plano-geral-persistente-final')?.remove();
        agendarBotaoFinal();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;
})();

/* ==========================================================
   PLANO - GARANTIR BOTAO PLANILHA GERAL APOS FINALIZAR PEDIDO
   ========================================================== */

(function() {
    if (window.atlasPlanoBotaoGeralPersistenteAtivo) return;
    window.atlasPlanoBotaoGeralPersistenteAtivo = true;

    function atlasTemPedidosNoPlanoLive() {
        return (db_plano_live?.linhasAbertas || []).some(item => item.modo === 'pedido');
    }

    function atlasGarantirBotaoGeralPlano() {
        if (!atlasTemPedidosNoPlanoLive()) return;

        document.querySelectorAll('#atlas-plano-geral-persistente').forEach((el, index) => {
            if (index > 0) el.remove();
        });
        if (document.getElementById('atlas-plano-geral-persistente')) return;

        const container = document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
        if (!container) return;

        const titulos = Array.from(container.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const titulo = titulos[titulos.length - 1];
        const listaAberta = document.getElementById('plano-lista-aberta');
        const referencia = titulo || listaAberta || container.lastElementChild;
        if (!referencia) return;

        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-persistente';
        barra.className = 'atlas-plano-geral-barra destaque persistente';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;

        referencia.insertAdjacentElement(titulo ? 'afterend' : 'afterend', barra);
    }

    function atlasAgendarBotaoGeralPlano() {
        setTimeout(atlasGarantirBotaoGeralPlano, 0);
        setTimeout(atlasGarantirBotaoGeralPlano, 120);
        setTimeout(atlasGarantirBotaoGeralPlano, 450);
    }

    const atualizarTelaPlanoPersistenteOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarTelaPlanoPersistenteOriginal();
        atlasAgendarBotaoGeralPlano();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrirFormularioPlanoPersistenteOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoPersistenteOriginal(modo);
        atlasAgendarBotaoGeralPlano();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizarPedidoPlanoPersistenteOriginal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizarPedidoPlanoPersistenteOriginal();
        atlasAgendarBotaoGeralPlano();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;

    document.addEventListener('click', function(evento) {
        const texto = String(evento.target?.textContent || '').toLowerCase();
        if (texto.includes('finalizar pedido') || texto.includes('adicionar pedido')) atlasAgendarBotaoGeralPlano();
    });
})();

/* ==========================================================
   PLANO - PLANILHA GERAL MESCLADA POR PEDIDO
   ========================================================== */

(function() {
    if (window.atlasPlanoPlanilhaGeralMescladaAtivo) return;
    window.atlasPlanoPlanilhaGeralMescladaAtivo = true;

    function segMescla(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function numMescla(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function jsMescla(valor) {
        return String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    function opcoesMescla(lista, selecionado, sufixo = '') {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${segMescla(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${segMescla(texto)}</option>`;
        }).join('');
    }

    function gruposMescla(linhas) {
        const mapa = {};
        const ordem = [];
        linhas.forEach((item, idx) => {
            const pedido = item.pedidoNumero || 'S/N';
            const destino = item.destino || '';
            const chave = `${pedido}|||${destino}`;
            if (!mapa[chave]) {
                mapa[chave] = { chave, pedido, destino, linhas: [] };
                ordem.push(mapa[chave]);
            }
            mapa[chave].linhas.push({ item, idx });
        });
        return ordem;
    }

    function modalMescla() {
        let modal = document.getElementById('atlas-plano-geral-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'atlas-plano-geral-modal';
            modal.className = 'atlas-plano-live-modal';
            document.body.appendChild(modal);
        }
        return modal;
    }

    function renderCelulasGrupoLive(grupo) {
        const base = grupo.linhas[0]?.item || {};
        const gid = `mescla-live-${String(grupo.chave).replace(/[^a-z0-9]/gi, '_')}`;
        const span = grupo.linhas.length;
        return `
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${gid}-pedido" value="${segMescla(grupo.pedido)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${gid}-destino" value="${segMescla(grupo.destino)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-tipo">${opcoesMescla(OPCOES_TIPO_PLANO, base.tipo)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-esp">${opcoesMescla(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-ral-inf">${opcoesMescla(OPCOES_RAL_INF, base.ralInferior)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-ral-sup">${opcoesMescla(OPCOES_RAL_SUP, base.ralSuperior)}</select></td>
        `;
    }

    function aplicarGrupoLive(chave, item) {
        const gid = `mescla-live-${String(chave).replace(/[^a-z0-9]/gi, '_')}`;
        item.pedidoNumero = document.getElementById(`${gid}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${gid}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${gid}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${gid}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${gid}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${gid}-ral-sup`)?.value || item.ralSuperior;
    }

    window.atlasAbrirPlanilhaGeralLive = function() {
        const linhas = (db_plano_live?.linhasAbertas || []).filter(item => item.modo === 'pedido');
        if (!linhas.length) return alert('Nao existem pedidos inseridos no plano.');
        const grupos = gruposMescla(linhas);
        const modal = modalMescla();
        const total = linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div>
                        <h2>Planilha geral dos pedidos</h2>
                        <small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small>
                    </div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="geral-add-pedido" placeholder="Pedido">
                    <input id="geral-add-destino" placeholder="Cliente">
                    <input id="geral-add-qtd" type="number" placeholder="Qtd">
                    <input id="geral-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="geral-add-tipo">${opcoesMescla(OPCOES_TIPO_PLANO, linhas[0]?.tipo)}</select>
                    <select id="geral-add-esp">${opcoesMescla(OPCOES_ESPESSURA_PLANO, linhas[0]?.espessura, ' mm')}</select>
                    <select id="geral-add-ral-inf">${opcoesMescla(OPCOES_RAL_INF, linhas[0]?.ralInferior)}</select>
                    <select id="geral-add-ral-sup">${opcoesMescla(OPCOES_RAL_SUP, linhas[0]?.ralSuperior)}</select>
                    <button onclick="atlasAdicionarLinhaGeralLive()">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${grupos.map(grupo => grupo.linhas.map((reg, indice) => `
                                <tr>
                                    ${indice === 0 ? renderCelulasGrupoLive(grupo) : ''}
                                    <td><input id="geral-${reg.item.id}-qtd" type="number" value="${segMescla(reg.item.quantidadeChapas || 0)}"></td>
                                    <td><input id="geral-${reg.item.id}-metros" type="number" step="0.01" value="${segMescla(reg.item.metrosUnidade || 0)}"></td>
                                    <td><input id="geral-${reg.item.id}-info" value="${segMescla(reg.item.infoManual || reg.item.descricaoManual || '')}"></td>
                                    <td><input id="geral-${reg.item.id}-urgente" type="checkbox" ${reg.item.urgente ? 'checked' : ''}></td>
                                    <td><b>${Number(reg.item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaGeralLiveMesclada('${reg.item.id}', '${jsMescla(grupo.chave)}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaGeralLive('${reg.item.id}')" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.atlasSalvarLinhaGeralLiveMesclada = function(id, chave) {
        const item = (db_plano_live?.linhasAbertas || []).find(linha => String(linha.id) === String(id));
        if (!item) return;
        const qtd = numMescla(document.getElementById(`geral-${id}-qtd`)?.value);
        const metros = numMescla(document.getElementById(`geral-${id}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        aplicarGrupoLive(chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`geral-${id}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`geral-${id}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero}`;
        if (item.destino && !destinosPlano.includes(item.destino)) {
            destinosPlano.push(item.destino);
            destinosPlano.sort();
            salvarDestinosPlano();
        }
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaGeralLive();
    };

    function renderCelulasGrupoHist(indexPlano, grupo) {
        const base = grupo.linhas[0]?.item || {};
        const gid = `mescla-hist-${indexPlano}-${String(groupKeySafe(grupo.chave))}`;
        const span = grupo.linhas.length;
        return `
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${gid}-pedido" value="${segMescla(grupo.pedido)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${gid}-destino" value="${segMescla(grupo.destino)}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-tipo">${opcoesMescla(OPCOES_TIPO_PLANO, base.tipo)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-esp">${opcoesMescla(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-ral-inf">${opcoesMescla(OPCOES_RAL_INF, base.ralInferior)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${gid}-ral-sup">${opcoesMescla(OPCOES_RAL_SUP, base.ralSuperior)}</select></td>
        `;
    }

    function groupKeySafe(chave) {
        return String(chave).replace(/[^a-z0-9]/gi, '_');
    }

    function aplicarGrupoHist(indexPlano, chave, item) {
        const gid = `mescla-hist-${indexPlano}-${groupKeySafe(chave)}`;
        item.pedidoNumero = document.getElementById(`${gid}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${gid}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${gid}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${gid}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${gid}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${gid}-ral-sup`)?.value || item.ralSuperior;
    }

    window.atlasAbrirPlanilhaGeralHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const linhas = (rel?.itens || []).map((item, idx) => ({ item, idx })).filter(reg => reg.item.modo === 'pedido');
        if (!rel || !linhas.length) return alert('Nao existem pedidos neste historico.');
        const grupos = gruposMescla(linhas.map(reg => ({ ...reg.item, __idx: reg.idx }))).map(grupo => ({
            ...grupo,
            linhas: grupo.linhas.map(reg => ({ item: reg.item, idx: reg.item.__idx }))
        }));
        const modal = modalMescla();
        const total = linhas.reduce((acc, reg) => acc + Number(reg.item.totalMetros || 0), 0);
        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div><h2>Historico - planilha geral</h2><small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small></div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralHistorico(${indexPlano})" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${grupos.map(grupo => grupo.linhas.map((reg, indice) => `
                                <tr>
                                    ${indice === 0 ? renderCelulasGrupoHist(indexPlano, grupo) : ''}
                                    <td><input id="histgeral-${reg.idx}-qtd" type="number" value="${segMescla(reg.item.quantidadeChapas || 0)}"></td>
                                    <td><input id="histgeral-${reg.idx}-metros" type="number" step="0.01" value="${segMescla(reg.item.metrosUnidade || 0)}"></td>
                                    <td><input id="histgeral-${reg.idx}-info" value="${segMescla(reg.item.infoManual || reg.item.descricaoManual || '')}"></td>
                                    <td><input id="histgeral-${reg.idx}-urgente" type="checkbox" ${reg.item.urgente ? 'checked' : ''}></td>
                                    <td><b>${Number(reg.item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaGeralHistoricoMesclada(${indexPlano}, ${reg.idx}, '${jsMescla(grupo.chave)}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaGeralHistorico(${indexPlano}, ${reg.idx})" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.atlasSalvarLinhaGeralHistoricoMesclada = function(indexPlano, idx, chave) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!item) return;
        const qtd = numMescla(document.getElementById(`histgeral-${idx}-qtd`)?.value);
        const metros = numMescla(document.getElementById(`histgeral-${idx}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        aplicarGrupoHist(indexPlano, chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`histgeral-${idx}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`histgeral-${idx}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero}`;
        rel.totalGeral = Number((rel.itens || []).reduce((acc, linha) => acc + Number(linha.totalMetros || 0), 0).toFixed(2));
        if (typeof gerarResumoPlano === 'function') rel.resumo = gerarResumoPlano(rel.itens || []);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha ${item.pedidoNumero} na planilha geral mesclada`);
        renderizarGestaoPlanoHistorico(indexPlano);
        atlasAbrirPlanilhaGeralHistorico(indexPlano);
    };
})();

/* ==========================================================
   PLANO - REAPLICAR DESTAQUE URGENTE FINAL
   ========================================================== */

(function() {
    if (window.atlasPlanoUrgenteFinalRealAtivo) return;
    window.atlasPlanoUrgenteFinalRealAtivo = true;

    const abrirFormularioPlanoUrgenteDepois = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoUrgenteDepois(modo);
        if (typeof window.atlasPlanoLiveAtualizarUrgente === 'function') window.atlasPlanoLiveAtualizarUrgente();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;
})();

/* ==========================================================
   PLANO - MANTER ULTIMA SELECAO E PLANILHA NO HISTORICO
   ========================================================== */

(function() {
    if (window.atlasPlanoUltimaSelecaoHistoricoAtivo) return;
    window.atlasPlanoUltimaSelecaoHistoricoAtivo = true;

    function atlasPlanoFinalSeguro(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasPlanoFinalNum(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function atlasPlanoFinalOpcoes(lista, selecionado, sufixo = '') {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${atlasPlanoFinalSeguro(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${atlasPlanoFinalSeguro(texto)}</option>`;
        }).join('');
    }

    function atlasPlanoLerSelecaoAtual() {
        return {
            tipo: document.getElementById('plano-tipo')?.value || db_plano_live?.pedidoAtual?.tipo || '',
            espessura: document.getElementById('plano-esp')?.value || db_plano_live?.pedidoAtual?.espessura || '',
            ralInferior: document.getElementById('plano-ral-inf')?.value || db_plano_live?.pedidoAtual?.ralInferior || '',
            ralSuperior: document.getElementById('plano-ral-sup')?.value || db_plano_live?.pedidoAtual?.ralSuperior || '',
            perfilInferior: document.getElementById('plano-perfil-inf')?.value || '',
            perfilSuperior: document.getElementById('plano-perfil-sup')?.value || ''
        };
    }

    function atlasPlanoSalvarUltimaSelecao(selecao) {
        if (!db_plano_live || !selecao) return;
        db_plano_live.ultimaSelecao = {
            ...(db_plano_live.ultimaSelecao || {}),
            ...Object.fromEntries(Object.entries(selecao).filter(([, valor]) => valor !== undefined && valor !== null && valor !== ''))
        };
        if (typeof salvarPlanoLive === 'function') salvarPlanoLive();
    }

    function atlasPlanoAplicarUltimaSelecao() {
        if (!db_plano_live || db_plano_live.pedidoAtual) return;
        const ultima = db_plano_live.ultimaSelecao || {};
        const set = (id, valor) => {
            const campo = document.getElementById(id);
            if (campo && valor && Array.from(campo.options || []).some(op => String(op.value) === String(valor))) campo.value = valor;
        };
        set('plano-tipo', ultima.tipo);
        set('plano-esp', ultima.espessura);
        set('plano-ral-inf', ultima.ralInferior);
        set('plano-ral-sup', ultima.ralSuperior);
        set('plano-perfil-inf', ultima.perfilInferior);
        set('plano-perfil-sup', ultima.perfilSuperior);
        if (typeof window.atlasPlanoLiveAtualizarUrgente === 'function') window.atlasPlanoLiveAtualizarUrgente();
    }

    const abrirFormularioPlanoUltimaOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoUltimaOriginal(modo);
        atlasPlanoAplicarUltimaSelecao();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const adicionarLinhaPlanoUltimaOriginal = window.adicionarLinhaPlano || adicionarLinhaPlano;
    window.adicionarLinhaPlano = function(modo) {
        const selecaoAntes = atlasPlanoLerSelecaoAtual();
        adicionarLinhaPlanoUltimaOriginal(modo);
        if (modo === 'pedido' && db_plano_live) {
            const linhas = db_plano_live.linhasAbertas || [];
            const ultimaLinha = linhas[linhas.length - 1];
            atlasPlanoSalvarUltimaSelecao({
                tipo: ultimaLinha?.tipo || selecaoAntes.tipo,
                espessura: ultimaLinha?.espessura || selecaoAntes.espessura,
                ralInferior: ultimaLinha?.ralInferior || selecaoAntes.ralInferior,
                ralSuperior: ultimaLinha?.ralSuperior || selecaoAntes.ralSuperior,
                perfilInferior: selecaoAntes.perfilInferior,
                perfilSuperior: selecaoAntes.perfilSuperior
            });
        }
    };
    adicionarLinhaPlano = window.adicionarLinhaPlano;

    const finalizarPedidoPlanoUltimaOriginal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        const selecaoAntes = atlasPlanoLerSelecaoAtual();
        if (db_plano_live?.pedidoAtual) {
            selecaoAntes.tipo = db_plano_live.pedidoAtual.tipo || selecaoAntes.tipo;
            selecaoAntes.espessura = db_plano_live.pedidoAtual.espessura || selecaoAntes.espessura;
            selecaoAntes.ralInferior = db_plano_live.pedidoAtual.ralInferior || selecaoAntes.ralInferior;
            selecaoAntes.ralSuperior = db_plano_live.pedidoAtual.ralSuperior || selecaoAntes.ralSuperior;
        }
        atlasPlanoSalvarUltimaSelecao(selecaoAntes);
        finalizarPedidoPlanoUltimaOriginal();
        atlasPlanoAplicarUltimaSelecao();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;

    function atlasHistoricoGruposPedido(rel) {
        const grupos = {};
        (rel?.itens || []).forEach((item, idx) => {
            if (item.modo !== 'pedido') return;
            const pedido = item.pedidoNumero || 'S/N';
            const destino = item.destino || '';
            const chave = `${pedido}|||${destino}`;
            grupos[chave] ||= { pedido, destino, indices: [] };
            grupos[chave].indices.push(idx);
        });
        return Object.values(grupos);
    }

    function atlasHistoricoKey(pedido, destino) {
        return `${String(pedido || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}','${String(destino || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}`;
    }

    function atlasHistoricoInserirPainel(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const modal = document.getElementById('modal-plano-historico');
        if (!rel || !modal || modal.querySelector('#atlas-historico-planilha-pedidos')) return;
        const grupos = atlasHistoricoGruposPedido(rel);
        if (!grupos.length) return;
        const painel = document.createElement('div');
        painel.id = 'atlas-historico-planilha-pedidos';
        painel.className = 'atlas-historico-planilha-pedidos';
        painel.innerHTML = `
            <div class="atlas-plano-live-titulo">
                <span>Pedidos do historico</span>
                <small>editar cada pedido como planilha</small>
            </div>
            ${grupos.map(grupo => {
                const itens = grupo.indices.map(idx => rel.itens[idx]).filter(Boolean);
                const total = itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
                const urgente = itens.some(item => item.urgente === true || item.urgente === 'sim');
                return `
                    <div class="atlas-plano-live-card ${urgente ? 'urgente' : ''}">
                        <div>
                            <b>Pedido ${atlasPlanoFinalSeguro(grupo.pedido)} - ${atlasPlanoFinalSeguro(grupo.destino)}</b>
                            <small>${itens.length} linha(s) | ${total.toFixed(2)} m</small>
                        </div>
                        <div class="atlas-plano-live-acoes">
                            ${urgente ? '<span class="atlas-plano-live-urgente">URGENTE</span>' : ''}
                            <button onclick="atlasAbrirPlanilhaPedidoHistorico(${indexPlano}, '${atlasHistoricoKey(grupo.pedido, grupo.destino)}')">GERIR PLANILHA</button>
                            <button onclick="atlasGerarPDFPedidoHistorico(${indexPlano}, '${atlasHistoricoKey(grupo.pedido, grupo.destino)}')" class="pdf">PDF</button>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        const janela = modal.querySelector('.plano-modal') || modal.firstElementChild || modal;
        janela.insertBefore(painel, janela.children[1] || null);
    }

    window.atlasAbrirPlanilhaPedidoHistorico = function(indexPlano, pedido, destino) {
        const rel = db_plano_hist[indexPlano];
        const grupo = atlasHistoricoGruposPedido(rel).find(g => String(g.pedido) === String(pedido) && String(g.destino) === String(destino));
        if (!rel || !grupo) return alert('Pedido nao encontrado no historico.');
        const modal = typeof atlasPlanoLiveModal === 'function' ? atlasPlanoLiveModal() : (document.getElementById('atlas-plano-live-modal') || document.body.appendChild(document.createElement('div')));
        modal.id = 'atlas-plano-live-modal';
        modal.className = 'atlas-plano-live-modal';
        const itens = grupo.indices.map(idx => ({ idx, item: rel.itens[idx] })).filter(reg => reg.item);
        const total = itens.reduce((acc, reg) => acc + Number(reg.item.totalMetros || 0), 0);
        const urgente = itens.some(reg => reg.item.urgente === true || reg.item.urgente === 'sim');
        const base = itens[0]?.item || {};

        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div>
                        <h2>Historico - Pedido ${atlasPlanoFinalSeguro(pedido)} - ${atlasPlanoFinalSeguro(destino)}</h2>
                        <small>Total atual: <b>${total.toFixed(2)} m</b></small>
                    </div>
                    <div class="atlas-plano-live-topo-acoes">
                        <label class="atlas-urgente-card pequeno">
                            <input id="atlas-hist-urgente" type="checkbox" ${urgente ? 'checked' : ''}>
                            <span><b>URGENTE</b><small>PDF vermelho</small></span>
                        </label>
                        <button onclick="atlasGerarPDFPedidoHistorico(${indexPlano}, '${atlasHistoricoKey(pedido, destino)}')" class="pdf">PDF</button>
                        <button onclick="atlasFecharPlanilhaPedidoLive()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="atlas-hist-add-qtd" type="number" placeholder="Qtd">
                    <input id="atlas-hist-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="atlas-hist-add-tipo">${atlasPlanoFinalOpcoes(OPCOES_TIPO_PLANO, base.tipo)}</select>
                    <select id="atlas-hist-add-esp">${atlasPlanoFinalOpcoes(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select>
                    <select id="atlas-hist-add-ral-inf">${atlasPlanoFinalOpcoes(OPCOES_RAL_INF, base.ralInferior)}</select>
                    <select id="atlas-hist-add-ral-sup">${atlasPlanoFinalOpcoes(OPCOES_RAL_SUP, base.ralSuperior)}</select>
                    <input id="atlas-hist-add-info" placeholder="Descricao / observacao">
                    <button onclick="atlasAdicionarLinhaPedidoHistorico(${indexPlano}, '${atlasHistoricoKey(pedido, destino)}')">INSERIR LINHA</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela">
                        <thead><tr><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Descricao</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${itens.map(reg => `
                                <tr>
                                    <td><select id="hist-${reg.idx}-tipo">${atlasPlanoFinalOpcoes(OPCOES_TIPO_PLANO, reg.item.tipo)}</select></td>
                                    <td><select id="hist-${reg.idx}-esp">${atlasPlanoFinalOpcoes(OPCOES_ESPESSURA_PLANO, reg.item.espessura, ' mm')}</select></td>
                                    <td><select id="hist-${reg.idx}-ral-inf">${atlasPlanoFinalOpcoes(OPCOES_RAL_INF, reg.item.ralInferior)}</select></td>
                                    <td><select id="hist-${reg.idx}-ral-sup">${atlasPlanoFinalOpcoes(OPCOES_RAL_SUP, reg.item.ralSuperior)}</select></td>
                                    <td><input id="hist-${reg.idx}-qtd" type="number" value="${atlasPlanoFinalSeguro(reg.item.quantidadeChapas || 0)}"></td>
                                    <td><input id="hist-${reg.idx}-metros" type="number" step="0.01" value="${atlasPlanoFinalSeguro(reg.item.metrosUnidade || 0)}"></td>
                                    <td><input id="hist-${reg.idx}-info" value="${atlasPlanoFinalSeguro(reg.item.infoManual || reg.item.descricaoManual || '')}"></td>
                                    <td><b>${Number(reg.item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaPedidoHistorico(${indexPlano}, ${reg.idx}, '${atlasHistoricoKey(pedido, destino)}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaPedidoHistorico(${indexPlano}, ${reg.idx}, '${atlasHistoricoKey(pedido, destino)}')" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    function atlasHistoricoRecalcular(rel) {
        rel.totalGeral = Number((rel.itens || []).reduce((acc, item) => acc + Number(item.totalMetros || 0), 0).toFixed(2));
        if (typeof gerarResumoPlano === 'function') rel.resumo = gerarResumoPlano(rel.itens || []);
    }

    window.atlasSalvarLinhaPedidoHistorico = function(indexPlano, idx, pedido, destino) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!rel || !item) return;
        const qtd = atlasPlanoFinalNum(document.getElementById(`hist-${idx}-qtd`)?.value);
        const metros = atlasPlanoFinalNum(document.getElementById(`hist-${idx}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        item.tipo = document.getElementById(`hist-${idx}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`hist-${idx}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`hist-${idx}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`hist-${idx}-ral-sup`)?.value || item.ralSuperior;
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`hist-${idx}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        const urgente = !!document.getElementById('atlas-hist-urgente')?.checked;
        (rel.itens || []).forEach(linha => {
            if (String(linha.pedidoNumero) === String(pedido) && String(linha.destino) === String(destino)) linha.urgente = urgente;
        });
        atlasHistoricoRecalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou pedido ${pedido} no historico`);
        renderizarGestaoPlanoHistorico(indexPlano);
        atlasAbrirPlanilhaPedidoHistorico(indexPlano, pedido, destino);
    };

    window.atlasAdicionarLinhaPedidoHistorico = function(indexPlano, pedido, destino) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;
        const qtd = atlasPlanoFinalNum(document.getElementById('atlas-hist-add-qtd')?.value);
        const metros = atlasPlanoFinalNum(document.getElementById('atlas-hist-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        const tipo = document.getElementById('atlas-hist-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('atlas-hist-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';
        rel.itens ||= [];
        rel.itens.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            modo: 'pedido',
            pedidoNumero: pedido,
            destino,
            tipo,
            espessura,
            ralInferior: document.getElementById('atlas-hist-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('atlas-hist-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            infoManual: document.getElementById('atlas-hist-add-info')?.value.trim() || '',
            descricaoManual: document.getElementById('atlas-hist-add-info')?.value.trim() || '',
            descricao: `PEDIDO ${pedido}`,
            urgente: !!document.getElementById('atlas-hist-urgente')?.checked
        });
        atlasHistoricoRecalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Inseriu linha no pedido ${pedido}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        atlasAbrirPlanilhaPedidoHistorico(indexPlano, pedido, destino);
    };

    window.atlasExcluirLinhaPedidoHistorico = function(indexPlano, idx, pedido, destino) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const rel = db_plano_hist[indexPlano];
        if (!rel?.itens?.[idx]) return;
        if (!confirm('Excluir esta linha do historico?')) return;
        rel.itens.splice(idx, 1);
        atlasHistoricoRecalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Excluiu linha do pedido ${pedido}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        const aindaTem = atlasHistoricoGruposPedido(rel).some(g => String(g.pedido) === String(pedido) && String(g.destino) === String(destino));
        if (aindaTem) atlasAbrirPlanilhaPedidoHistorico(indexPlano, pedido, destino);
        else if (typeof atlasFecharPlanilhaPedidoLive === 'function') atlasFecharPlanilhaPedidoLive();
    };

    window.atlasGerarPDFPedidoHistorico = function(indexPlano, pedido, destino) {
        const rel = db_plano_hist[indexPlano];
        const grupo = atlasHistoricoGruposPedido(rel).find(g => String(g.pedido) === String(pedido) && String(g.destino) === String(destino));
        if (!grupo) return alert('Pedido nao encontrado.');
        const itens = grupo.indices.map(idx => rel.itens[idx]).filter(Boolean);
        const relPedido = { ...rel, itens, totalGeral: itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0) };
        if (typeof gerarPDF_Plano === 'function') gerarPDF_Plano(encodeURIComponent(JSON.stringify(relPedido)));
    };

    const renderizarGestaoPlanoHistoricoFinalOriginal = window.renderizarGestaoPlanoHistorico || renderizarGestaoPlanoHistorico;
    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        renderizarGestaoPlanoHistoricoFinalOriginal(indexPlano);
        atlasHistoricoInserirPainel(indexPlano);
    };
    renderizarGestaoPlanoHistorico = window.renderizarGestaoPlanoHistorico;
})();

/* ==========================================================
   PLANO - REAPLICAR DESTAQUE URGENTE APOS TODAS AS CAMADAS
   ========================================================== */

(function() {
    if (window.atlasPlanoUrgenteFinalAtivo) return;
    window.atlasPlanoUrgenteFinalAtivo = true;

    const abrirFormularioPlanoUrgenteFinal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoUrgenteFinal(modo);
        if (typeof window.atlasPlanoLiveAtualizarUrgente === 'function') window.atlasPlanoLiveAtualizarUrgente();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;
})();

/* ==========================================================
   PLANO - VER/EDITAR PEDIDO EM PLANILHA ANTES DE FINALIZAR
   ========================================================== */

(function() {
    if (window.atlasPlanoPlanilhaPedidoLiveAtivo) return;
    window.atlasPlanoPlanilhaPedidoLiveAtivo = true;

    function atlasPlanoLiveSeguro(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasPlanoLiveNum(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function atlasPlanoLiveOpcoes(lista, selecionado, sufixo = '') {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${atlasPlanoLiveSeguro(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${atlasPlanoLiveSeguro(texto)}</option>`;
        }).join('');
    }

    function atlasPlanoLivePedidos() {
        const grupos = {};
        (db_plano_live?.linhasAbertas || [])
            .filter(item => item.modo === 'pedido')
            .forEach(item => {
                const pedido = item.pedidoNumero || 'S/N';
                const destino = item.destino || '';
                const chave = `${pedido}|||${destino}`;
                grupos[chave] ||= { pedido, destino, itens: [] };
                grupos[chave].itens.push(item);
            });
        return Object.values(grupos);
    }

    function atlasPlanoLiveModal() {
        let modal = document.getElementById('atlas-plano-live-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'atlas-plano-live-modal';
            modal.className = 'atlas-plano-live-modal';
            document.body.appendChild(modal);
        }
        return modal;
    }

    function atlasPlanoLiveKey(pedido, destino) {
        return `${String(pedido || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}','${String(destino || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}`;
    }

    function atlasPlanoLiveAtualizarUrgente() {
        const urgente = document.getElementById('plano-urgente');
        if (!urgente || urgente.closest('.atlas-urgente-card')) return;
        const label = urgente.closest('label');
        if (!label) return;
        label.classList.add('atlas-urgente-card');
        label.innerHTML = `
            <input id="plano-urgente" type="checkbox" ${urgente.checked ? 'checked' : ''}>
            <span><b>URGENTE</b><small>aparece em vermelho no PDF</small></span>
        `;
    }
    window.atlasPlanoLiveAtualizarUrgente = atlasPlanoLiveAtualizarUrgente;

    function atlasPlanoLiveRenderCards() {
        const lista = document.getElementById('plano-lista-aberta');
        if (!lista || !db_plano_live) return;
        document.getElementById('atlas-plano-live-pedidos')?.remove();

        const grupos = atlasPlanoLivePedidos();
        if (!grupos.length) return;

        const html = `
            <div id="atlas-plano-live-pedidos" class="atlas-plano-live-pedidos">
                <div class="atlas-plano-live-titulo">
                    <span>Pedidos inseridos</span>
                    <small>ver em PDF, editar como planilha, excluir ou inserir mais linhas</small>
                </div>
                ${grupos.map(grupo => {
                    const total = grupo.itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
                    const urgente = grupo.itens.some(item => item.urgente === true || item.urgente === 'sim');
                    const base = grupo.itens[0] || {};
                    return `
                        <div class="atlas-plano-live-card ${urgente ? 'urgente' : ''}">
                            <div>
                                <b>Pedido ${atlasPlanoLiveSeguro(grupo.pedido)} - ${atlasPlanoLiveSeguro(grupo.destino)}</b>
                                <small>
                                    ${atlasPlanoLiveSeguro(base.tipo)} ${atlasPlanoLiveSeguro(base.espessura)} mm |
                                    RAL ${atlasPlanoLiveSeguro(base.ralInferior || '-')}/${atlasPlanoLiveSeguro(base.ralSuperior || '-')} |
                                    ${grupo.itens.length} linha(s) | ${total.toFixed(2)} m
                                </small>
                            </div>
                            <div class="atlas-plano-live-acoes">
                                ${urgente ? '<span class="atlas-plano-live-urgente">URGENTE</span>' : ''}
                                <button onclick="atlasAbrirPlanilhaPedidoLive('${atlasPlanoLiveKey(grupo.pedido, grupo.destino)}')">VER / EDITAR</button>
                                <button onclick="atlasGerarPDFPedidoLive('${atlasPlanoLiveKey(grupo.pedido, grupo.destino)}')" class="pdf">PDF</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        lista.insertAdjacentHTML('afterend', html);
    }

    window.atlasAbrirPlanilhaPedidoLive = function(pedido, destino) {
        const grupo = atlasPlanoLivePedidos().find(g => String(g.pedido) === String(pedido) && String(g.destino) === String(destino));
        if (!grupo) return alert('Pedido nao encontrado no plano em andamento.');
        const modal = atlasPlanoLiveModal();
        const total = grupo.itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const urgente = grupo.itens.some(item => item.urgente === true || item.urgente === 'sim');
        const base = grupo.itens[0] || {};

        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div>
                        <h2>Pedido ${atlasPlanoLiveSeguro(pedido)} - ${atlasPlanoLiveSeguro(destino)}</h2>
                        <small>Total atual: <b>${total.toFixed(2)} m</b></small>
                    </div>
                    <div class="atlas-plano-live-topo-acoes">
                        <label class="atlas-urgente-card pequeno">
                            <input id="atlas-live-urgente" type="checkbox" ${urgente ? 'checked' : ''}>
                            <span><b>URGENTE</b><small>PDF vermelho</small></span>
                        </label>
                        <button onclick="atlasGerarPDFPedidoLive('${atlasPlanoLiveKey(pedido, destino)}')" class="pdf">PDF</button>
                        <button onclick="atlasFecharPlanilhaPedidoLive()">FECHAR</button>
                    </div>
                </div>

                <div class="atlas-plano-live-add">
                    <input id="atlas-live-add-qtd" type="number" inputmode="numeric" placeholder="Qtd">
                    <input id="atlas-live-add-metros" type="number" inputmode="decimal" step="0.01" placeholder="Metros">
                    <select id="atlas-live-add-tipo">${atlasPlanoLiveOpcoes(OPCOES_TIPO_PLANO, base.tipo)}</select>
                    <select id="atlas-live-add-esp">${atlasPlanoLiveOpcoes(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select>
                    <select id="atlas-live-add-ral-inf">${atlasPlanoLiveOpcoes(OPCOES_RAL_INF, base.ralInferior)}</select>
                    <select id="atlas-live-add-ral-sup">${atlasPlanoLiveOpcoes(OPCOES_RAL_SUP, base.ralSuperior)}</select>
                    <input id="atlas-live-add-info" placeholder="Descricao / observacao">
                    <button onclick="atlasAdicionarLinhaPedidoLive('${atlasPlanoLiveKey(pedido, destino)}')">INSERIR LINHA</button>
                </div>

                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Esp.</th>
                                <th>RAL Inf.</th>
                                <th>RAL Sup.</th>
                                <th>Qtd</th>
                                <th>Metros</th>
                                <th>Descricao</th>
                                <th>Total</th>
                                <th>Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grupo.itens.map(item => `
                                <tr>
                                    <td><select id="live-${item.id}-tipo">${atlasPlanoLiveOpcoes(OPCOES_TIPO_PLANO, item.tipo)}</select></td>
                                    <td><select id="live-${item.id}-esp">${atlasPlanoLiveOpcoes(OPCOES_ESPESSURA_PLANO, item.espessura, ' mm')}</select></td>
                                    <td><select id="live-${item.id}-ral-inf">${atlasPlanoLiveOpcoes(OPCOES_RAL_INF, item.ralInferior)}</select></td>
                                    <td><select id="live-${item.id}-ral-sup">${atlasPlanoLiveOpcoes(OPCOES_RAL_SUP, item.ralSuperior)}</select></td>
                                    <td><input id="live-${item.id}-qtd" type="number" value="${atlasPlanoLiveSeguro(item.quantidadeChapas || 0)}"></td>
                                    <td><input id="live-${item.id}-metros" type="number" step="0.01" value="${atlasPlanoLiveSeguro(item.metrosUnidade || 0)}"></td>
                                    <td><input id="live-${item.id}-info" value="${atlasPlanoLiveSeguro(item.infoManual || item.descricaoManual || '')}"></td>
                                    <td><b>${Number(item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaPedidoLive('${item.id}', '${atlasPlanoLiveKey(pedido, destino)}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaPedidoLive('${item.id}', '${atlasPlanoLiveKey(pedido, destino)}')" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.atlasFecharPlanilhaPedidoLive = function() {
        const modal = document.getElementById('atlas-plano-live-modal');
        if (modal) modal.style.display = 'none';
    };

    window.atlasSalvarLinhaPedidoLive = function(id, pedido, destino) {
        const item = (db_plano_live?.linhasAbertas || []).find(linha => String(linha.id) === String(id));
        if (!item) return alert('Linha nao encontrada.');
        const qtd = atlasPlanoLiveNum(document.getElementById(`live-${id}-qtd`)?.value);
        const metros = atlasPlanoLiveNum(document.getElementById(`live-${id}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        item.tipo = document.getElementById(`live-${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`live-${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`live-${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`live-${id}-ral-sup`)?.value || item.ralSuperior;
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`live-${id}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.descricao = `PEDIDO ${item.pedidoNumero || pedido}`;
        const urgente = !!document.getElementById('atlas-live-urgente')?.checked;
        (db_plano_live.linhasAbertas || []).forEach(linha => {
            if (String(linha.pedidoNumero) === String(pedido) && String(linha.destino) === String(destino)) linha.urgente = urgente;
        });
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaPedidoLive(pedido, destino);
    };

    window.atlasExcluirLinhaPedidoLive = function(id, pedido, destino) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        if (!confirm('Excluir esta linha do pedido?')) return;
        db_plano_live.linhasAbertas = (db_plano_live.linhasAbertas || []).filter(linha => String(linha.id) !== String(id));
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        const aindaTem = (db_plano_live.linhasAbertas || []).some(linha => String(linha.pedidoNumero) === String(pedido) && String(linha.destino) === String(destino));
        if (aindaTem) atlasAbrirPlanilhaPedidoLive(pedido, destino);
        else atlasFecharPlanilhaPedidoLive();
    };

    window.atlasAdicionarLinhaPedidoLive = function(pedido, destino) {
        const qtd = atlasPlanoLiveNum(document.getElementById('atlas-live-add-qtd')?.value);
        const metros = atlasPlanoLiveNum(document.getElementById('atlas-live-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        const tipo = document.getElementById('atlas-live-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('atlas-live-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';
        const urgente = !!document.getElementById('atlas-live-urgente')?.checked;
        db_plano_live.linhasAbertas.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            modo: 'pedido',
            pedidoNumero: pedido,
            destino,
            tipo,
            espessura,
            ralInferior: document.getElementById('atlas-live-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('atlas-live-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            infoManual: document.getElementById('atlas-live-add-info')?.value.trim() || '',
            descricaoManual: document.getElementById('atlas-live-add-info')?.value.trim() || '',
            descricao: `PEDIDO ${pedido}`,
            urgente
        });
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaPedidoLive(pedido, destino);
    };

    window.atlasGerarPDFPedidoLive = function(pedido, destino) {
        const grupo = atlasPlanoLivePedidos().find(g => String(g.pedido) === String(pedido) && String(g.destino) === String(destino));
        if (!grupo) return alert('Pedido nao encontrado.');
        const janela = window.open('', '_blank');
        if (!janela) return alert('O navegador bloqueou a abertura do PDF.');
        const total = grupo.itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const urgente = grupo.itens.some(item => item.urgente === true || item.urgente === 'sim');
        janela.document.write(`
            <html><head><meta charset="UTF-8"><title>Pedido ${atlasPlanoLiveSeguro(pedido)}</title>
            <style>
                body { font-family: Arial, sans-serif; color:#000; padding:18px; }
                .topo { display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #e31c24; padding-bottom:10px; margin-bottom:16px; }
                .marca { font-weight:900; font-size:24px; } .marca span { color:#e31c24; }
                .urgente { color:#dc2626; border:2px solid #dc2626; padding:8px 12px; font-weight:900; }
                table { width:100%; border-collapse:collapse; font-size:12px; }
                th, td { border:1.5px solid #000; padding:7px; text-align:center; }
                th { background:#e5e7eb; }
                .total { margin-top:14px; border:2px solid #000; padding:10px; text-align:right; font-size:18px; font-weight:900; }
                .no-print button { width:100%; margin-top:18px; padding:14px; background:#111827; color:white; border:0; font-weight:900; }
                @media print { .no-print { display:none; } }
            </style></head><body>
                <div class="topo">
                    <div><div class="marca"><span>ATLAS</span> PAINEL</div><b>Pedido ${atlasPlanoLiveSeguro(pedido)}</b><br>${atlasPlanoLiveSeguro(destino)}</div>
                    ${urgente ? '<div class="urgente">URGENTE</div>' : ''}
                </div>
                <table>
                    <thead><tr><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Descricao</th><th>Total</th></tr></thead>
                    <tbody>
                        ${grupo.itens.map(item => `
                            <tr>
                                <td>${atlasPlanoLiveSeguro(item.tipo)}</td>
                                <td>${atlasPlanoLiveSeguro(item.espessura)} mm</td>
                                <td>${atlasPlanoLiveSeguro(item.ralInferior)}</td>
                                <td>${atlasPlanoLiveSeguro(item.ralSuperior)}</td>
                                <td>${atlasPlanoLiveSeguro(item.quantidadeChapas)}</td>
                                <td>${Number(item.metrosUnidade || 0).toFixed(2)} m</td>
                                <td>${atlasPlanoLiveSeguro(item.infoManual || item.descricaoManual || '-')}</td>
                                <td><b>${Number(item.totalMetros || 0).toFixed(2)} m</b></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">TOTAL DO PEDIDO: ${total.toFixed(2)} m</div>
                <div class="no-print"><button onclick="window.print()">IMPRIMIR / PDF</button></div>
            </body></html>
        `);
        janela.document.close();
    };

    const atualizarTelaPlanoPlanilhaOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarTelaPlanoPlanilhaOriginal();
        atlasPlanoLiveRenderCards();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrirFormularioPlanoPlanilhaOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoPlanilhaOriginal(modo);
        atlasPlanoLiveAtualizarUrgente();
        atlasPlanoLiveRenderCards();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const htmlMinimoOriginal = window.htmlEditorMinimoStockSistema || htmlEditorMinimoStockSistema;
    window.htmlEditorMinimoStockSistema = function() {
        return `<details class="atlas-ajuste-pasta"><summary><span>Minimo para lembrete de stock</span><small>toque para abrir</small></summary><div class="atlas-ajuste-detalhe">${htmlMinimoOriginal()}</div></details>`;
    };
    htmlEditorMinimoStockSistema = window.htmlEditorMinimoStockSistema;

    const htmlPacotesOriginal = window.htmlEditorPacotesSerraSistema || htmlEditorPacotesSerraSistema;
    window.htmlEditorPacotesSerraSistema = function() {
        return `<details class="atlas-ajuste-pasta"><summary><span>Pacotes da Serra</span><small>toque para abrir</small></summary><div class="atlas-ajuste-detalhe">${htmlPacotesOriginal()}</div></details>`;
    };
    htmlEditorPacotesSerraSistema = window.htmlEditorPacotesSerraSistema;
})();

/* ==========================================================
   PLANO - TRAVAR RAL DO PEDIDO ABERTO
   ========================================================== */

(function() {
    if (window.atlasPlanoTravaRalPedidoAtivo) return;
    window.atlasPlanoTravaRalPedidoAtivo = true;

    function aplicarTravaRalPedidoPlano() {
        const pedido = db_plano_live?.modoAtual === 'pedido' ? db_plano_live.pedidoAtual : null;
        if (!pedido) return;
        const ralInf = document.getElementById('plano-ral-inf');
        const ralSup = document.getElementById('plano-ral-sup');
        if (ralInf && pedido.ralInferior) {
            ralInf.value = pedido.ralInferior;
            ralInf.disabled = true;
            ralInf.style.background = '#111827';
            ralInf.style.color = '#10b981';
            ralInf.style.fontWeight = 'bold';
        }
        if (ralSup && pedido.ralSuperior) {
            ralSup.value = pedido.ralSuperior;
            ralSup.disabled = true;
            ralSup.style.background = '#111827';
            ralSup.style.color = '#10b981';
            ralSup.style.fontWeight = 'bold';
        }
    }

    const abrirFormularioPlanoTravaRalOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoTravaRalOriginal(modo);
        aplicarTravaRalPedidoPlano();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const adicionarLinhaPlanoTravaRalOriginal = window.adicionarLinhaPlano || adicionarLinhaPlano;
    window.adicionarLinhaPlano = function(modo) {
        const antes = db_plano_live?.linhasAbertas?.length || 0;
        adicionarLinhaPlanoTravaRalOriginal(modo);
        const linhas = db_plano_live?.linhasAbertas || [];
        if (modo === 'pedido' && linhas.length > antes && db_plano_live?.pedidoAtual) {
            const item = linhas[linhas.length - 1];
            db_plano_live.pedidoAtual.ralInferior = item.ralInferior;
            db_plano_live.pedidoAtual.ralSuperior = item.ralSuperior;
            salvarPlanoLive();
            aplicarTravaRalPedidoPlano();
        }
    };
    adicionarLinhaPlano = window.adicionarLinhaPlano;
})();

/* ==========================================================
   AJUSTES/RELATORIOS - ORGANIZACAO, PERSISTENCIA E MOBILE
   ========================================================== */

(function() {
    if (window.atlasAjustesRelatoriosMobileV3Ativo) return;
    window.atlasAjustesRelatoriosMobileV3Ativo = true;

    const listasNumericasAtlas = new Set([
        'atlas_config_esp_chapa',
        'atlas_config_espuma_injecao',
        'atlas_config_fita_injecao',
        'atlas_config_medidas_chapa_stock',
        'atlas_config_velocidade_injecao'
    ]);

    function atlasConfigSeguro(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasValorNumericoLista(valor) {
        const numero = Number(String(valor ?? '').replace(/[^\d,.]/g, '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : null;
    }

    function atlasOrdenarListaConfig(chave, lista) {
        const limpa = [...new Set((lista || []).map(v => String(v || '').trim()).filter(Boolean))];
        if (!listasNumericasAtlas.has(chave)) return limpa;
        return limpa.sort((a, b) => {
            const na = atlasValorNumericoLista(a);
            const nb = atlasValorNumericoLista(b);
            if (na !== null && nb !== null && na !== nb) return na - nb;
            return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
        });
    }

    const salvarListaConfigOriginalAtlas = window.atlasSalvarListaConfig || atlasSalvarListaConfig;
    window.atlasSalvarListaConfig = function(chave, lista) {
        const ordenada = atlasOrdenarListaConfig(chave, lista);
        localStorage.setItem(chave, JSON.stringify(ordenada));
        localStorage.setItem(`${chave}_updated_ms`, String(Date.now()));
        if (typeof window.atlasFirebaseSincronizarAgora === 'function') {
            setTimeout(() => window.atlasFirebaseSincronizarAgora(), 80);
        }
        return ordenada;
    };
    atlasSalvarListaConfig = window.atlasSalvarListaConfig;

    if (!window.OPCOES_VELOCIDADE_INJECAO) {
        window.OPCOES_VELOCIDADE_INJECAO = atlasListaConfig('atlas_config_velocidade_injecao', ["5 m/min", "6 m/min", "8 m/min", "9 m/min", "10 m/min", "11 m/min", "12 m/min"]);
    }
    OPCOES_VELOCIDADE_INJECAO = window.atlasSalvarListaConfig('atlas_config_velocidade_injecao', window.OPCOES_VELOCIDADE_INJECAO);
    window.OPCOES_VELOCIDADE_INJECAO = OPCOES_VELOCIDADE_INJECAO;

    function atlasSetListaVariavel(variavel, lista) {
        if (variavel === 'destinosPlano') destinosPlano = lista;
        if (variavel === 'OPCOES_TIPO_PLANO') OPCOES_TIPO_PLANO = lista;
        if (variavel === 'OPCOES_RAL_INF') OPCOES_RAL_INF = lista;
        if (variavel === 'OPCOES_RAL_SUP') OPCOES_RAL_SUP = lista;
        if (variavel === 'OPCOES_ESP_CHAPA') OPCOES_ESP_CHAPA = lista;
        if (variavel === 'OPCOES_ESPUMA_INJECAO') OPCOES_ESPUMA_INJECAO = lista;
        if (variavel === 'OPCOES_FITA_INJECAO') OPCOES_FITA_INJECAO = lista;
        if (variavel === 'OPCOES_VELOCIDADE_INJECAO') OPCOES_VELOCIDADE_INJECAO = lista;
        if (variavel === 'OPCOES_MEDIDAS_CHAPA_STOCK') OPCOES_MEDIDAS_CHAPA_STOCK = lista;
        if (variavel === 'OPCOES_FORNECEDORES_STOCK') OPCOES_FORNECEDORES_STOCK = lista;
        if (variavel === 'OPCOES_FILMES_STOCK') OPCOES_FILMES_STOCK = lista;
        window[variavel] = lista;
    }

    window.atlasMoverItemListaSistema = function(chave, variavel, index, direcao) {
        if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
        if (listasNumericasAtlas.has(chave)) return alert('Esta lista fica em ordem crescente automaticamente.');
        const lista = (obterVariavelListaSistema(variavel) || []).slice();
        const destino = index + direcao;
        if (destino < 0 || destino >= lista.length) return;
        [lista[index], lista[destino]] = [lista[destino], lista[index]];
        const salva = window.atlasSalvarListaConfig(chave, lista);
        atlasSetListaVariavel(variavel, salva);
        abrirAjustesSistema();
    };

    const adicionarItemOriginal = window.adicionarItemListaSistema || adicionarItemListaSistema;
    window.adicionarItemListaSistema = function(chave, variavel, idInput) {
        const input = document.getElementById(idInput);
        const valor = input?.value.trim();
        if (!valor) return alert('Informe um valor.');
        const atual = obterVariavelListaSistema(variavel);
        const lista = window.atlasSalvarListaConfig(chave, [...atual, valor]);
        atlasSetListaVariavel(variavel, lista);
        abrirAjustesSistema();
    };
    adicionarItemListaSistema = window.adicionarItemListaSistema;

    const editarItemOriginal = window.editarItemListaSistema || editarItemListaSistema;
    window.editarItemListaSistema = function(chave, variavel, index) {
        if (!usuarioPodeEditarModulo('config')) return alert('Sem permissao para editar nos Ajustes.');
        const atual = obterVariavelListaSistema(variavel);
        const antigo = atual[index];
        if (typeof antigo === 'undefined') return;
        const novo = prompt('Novo nome:', antigo);
        if (novo === null) return;
        const valor = novo.trim();
        if (!valor) return alert('Informe um valor.');
        const lista = window.atlasSalvarListaConfig(chave, atual.map((item, i) => i === index ? valor : item));
        atlasSetListaVariavel(variavel, lista);
        if (variavel === 'OPCOES_FILMES_STOCK' && typeof renomearFilmeSistemaAtlas === 'function') renomearFilmeSistemaAtlas(antigo, valor);
        abrirAjustesSistema();
    };
    editarItemListaSistema = window.editarItemListaSistema;

    window.removerItemListaSistema = function(chave, variavel, index) {
        if (!usuarioPodeExcluirModulo('config')) return alert('Sem permissao para excluir nos Ajustes.');
        const atual = obterVariavelListaSistema(variavel);
        const lista = window.atlasSalvarListaConfig(chave, atual.filter((_, i) => i !== index));
        atlasSetListaVariavel(variavel, lista);
        abrirAjustesSistema();
    };
    removerItemListaSistema = window.removerItemListaSistema;

    window.htmlEditorListaSistema = function(titulo, chave, lista, variavel) {
        const id = chave.replace(/[^a-z0-9_]/gi, '_');
        const automatico = listasNumericasAtlas.has(chave);
        return `
            <details class="atlas-ajuste-pasta">
                <summary>
                    <span>${atlasConfigSeguro(titulo)}</span>
                    <small>${automatico ? 'ordem crescente' : 'toque para abrir'}</small>
                </summary>
                <div id="${id}-lista" class="atlas-ajuste-lista">
                    ${(lista || []).map((valor, index) => `
                        <div class="atlas-ajuste-item">
                            <span>${atlasConfigSeguro(valor)}</span>
                            <div>
                                ${automatico ? '' : `
                                    <button onclick="atlasMoverItemListaSistema('${chave}','${variavel}',${index},-1)" title="Subir"><i class="fas fa-arrow-up"></i></button>
                                    <button onclick="atlasMoverItemListaSistema('${chave}','${variavel}',${index},1)" title="Descer"><i class="fas fa-arrow-down"></i></button>
                                `}
                                <button onclick="editarItemListaSistema('${chave}','${variavel}',${index})">EDITAR</button>
                                <button onclick="removerItemListaSistema('${chave}','${variavel}',${index})" class="perigo">X</button>
                            </div>
                        </div>
                    `).join('') || `<div style="color:#94a3b8;">Nenhum item.</div>`}
                </div>
                <div class="atlas-ajuste-add">
                    <input id="${id}-novo" placeholder="Novo item">
                    <button onclick="adicionarItemListaSistema('${chave}','${variavel}','${id}-novo')">ADICIONAR</button>
                </div>
            </details>
        `;
    };
    htmlEditorListaSistema = window.htmlEditorListaSistema;

    const obterVariavelOriginal = window.obterVariavelListaSistema || obterVariavelListaSistema;
    window.obterVariavelListaSistema = function(variavel) {
        if (variavel === 'OPCOES_VELOCIDADE_INJECAO') return OPCOES_VELOCIDADE_INJECAO || [];
        return obterVariavelOriginal(variavel);
    };
    obterVariavelListaSistema = window.obterVariavelListaSistema;

    const abrirAjustesOriginal = window.abrirAjustesSistema || abrirAjustesSistema;
    window.abrirAjustesSistema = function() {
        abrirAjustesOriginal();
        const grade = document.querySelector('#conteudo-ajustes [style*="grid-template-columns:1fr 1fr"]');
        if (!grade || document.getElementById('atlas-ajustes-velocidade')) return;
        const bloco = document.createElement('div');
        bloco.innerHTML = htmlEditorListaSistema('Velocidade - Injecao', 'atlas_config_velocidade_injecao', OPCOES_VELOCIDADE_INJECAO, 'OPCOES_VELOCIDADE_INJECAO');
        if (bloco.firstElementChild) bloco.firstElementChild.id = 'atlas-ajustes-velocidade';
        grade.insertBefore(bloco.firstElementChild, grade.querySelector('[style*="minimo"], [style*="Pacotes"]') || null);
    };
    abrirAjustesSistema = window.abrirAjustesSistema;

    const criarNovoPlanoOriginal = window.criarNovoPlanoLimpo || criarNovoPlanoLimpo;
    window.criarNovoPlanoLimpo = function(modo) {
        criarNovoPlanoOriginal(modo);
        if (db_plano_live) db_plano_live.pedidosFinalizados = db_plano_live.pedidosFinalizados || [];
        if (typeof salvarPlanoLive === 'function') salvarPlanoLive();
    };
    criarNovoPlanoLimpo = window.criarNovoPlanoLimpo;

    const adicionarLinhaPlanoOriginalAtlas = window.adicionarLinhaPlano || adicionarLinhaPlano;
    window.adicionarLinhaPlano = function(modo) {
        const antes = db_plano_live?.linhasAbertas?.length || 0;
        adicionarLinhaPlanoOriginalAtlas(modo);
        const linhas = db_plano_live?.linhasAbertas || [];
        if (modo === 'pedido' && linhas.length > antes && db_plano_live?.pedidoAtual) {
            const item = linhas[linhas.length - 1];
            db_plano_live.pedidoAtual.ralSuperior = item.ralSuperior;
            db_plano_live.pedidoAtual.ralInferior = item.ralInferior;
            salvarPlanoLive();
        }
    };
    adicionarLinhaPlano = window.adicionarLinhaPlano;

    const finalizarPedidoOriginal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        if (db_plano_live?.modoAtual === 'pedido' && db_plano_live.pedidoAtual) {
            const pedido = db_plano_live.pedidoAtual;
            const itens = (db_plano_live.linhasAbertas || []).filter(x => x.modo === 'pedido' && x.pedidoNumero === pedido.numero);
            db_plano_live.pedidosFinalizados = db_plano_live.pedidosFinalizados || [];
            if (itens.length) {
                db_plano_live.pedidosFinalizados.push({
                    ...pedido,
                    itens: itens.map(item => ({ ...item })),
                    totalMetros: Number(itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0).toFixed(2)),
                    finalizadoEm: new Date().toLocaleString('pt-BR')
                });
            }
        }
        finalizarPedidoOriginal();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;

    const atualizarTelaPlanoOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarTelaPlanoOriginal();
        const destino = document.getElementById('plano-lista-aberta');
        if (!destino || !db_plano_live) return;
        const finalizados = db_plano_live.pedidosFinalizados || [];
        const htmlFinalizados = finalizados.length ? `
            <div class="atlas-plano-finalizados">
                <h4>Pedidos ja inseridos</h4>
                ${finalizados.map(pedido => `
                    <div class="atlas-plano-pedido-ok">
                        <b>Pedido ${atlasConfigSeguro(pedido.numero)} - ${atlasConfigSeguro(pedido.destino)}</b>
                        <small>${atlasConfigSeguro(pedido.tipo)} ${atlasConfigSeguro(pedido.espessura)} mm | RAL ${atlasConfigSeguro(pedido.ralInferior || '-')}/${atlasConfigSeguro(pedido.ralSuperior || '-')} | ${Number(pedido.totalMetros || 0).toFixed(2)} m</small>
                    </div>
                `).join('')}
            </div>
        ` : '';
        if (htmlFinalizados && !document.getElementById('atlas-plano-finalizados-wrap')) {
            destino.insertAdjacentHTML('afterend', `<div id="atlas-plano-finalizados-wrap">${htmlFinalizados}</div>`);
        }
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;
})();

/* ==========================================================
   PLANO - PDF LIMPO COM PEDIDO/RAL MESCLADO + GERIR PLANILHA
   ========================================================== */

(function() {
    if (window.atlasPlanoMescladoExcelV2Ativo) return;
    window.atlasPlanoMescladoExcelV2Ativo = true;

    window.atlasPlanoGrupoGestao = window.atlasPlanoGrupoGestao || {};

    function segPlano(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function numPlano(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function metroPlano(valor) {
        return numPlano(valor).toFixed(2).replace('.', ',');
    }

    function metroPlanoDetalhado(valor) {
      const numero = numPlano(valor);
      const mm = Math.round(numero * 1000);
      return `${mm}`;
    }

    function espTextoPlano(valor) {
        const texto = String(valor ?? '').trim();
        if (!texto) return '-';
        return texto.toLowerCase().includes('mm') ? texto : `${texto} mm`;
    }

    function ordenarEspPlano(a, b) {
        const na = Number(String(a).replace(/[^\d,.]/g, '').replace(',', '.'));
        const nb = Number(String(b).replace(/[^\d,.]/g, '').replace(',', '.'));
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
    }

    function opcoesPlano(lista, selecionado, sufixo) {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${segPlano(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${segPlano(texto)}</option>`;
        }).join('');
    }

    function valorUnico(lista) {
        const unicos = Array.from(new Set(lista.map(v => String(v || '-').trim() || '-')));
        return unicos.length === 1 ? unicos[0] : null;
    }

    function tipoPlanoAceitaPerfil(tipo) {
        const texto = String(tipo || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        return texto.includes('fachada oculta') || texto.includes('fachada visivel');
    }

    function descricaoPlanoItem(item, tipo, esp) {
        const partes = [];
        const base = item.descricaoManual || item.infoManual || item.observacaoPlano || '';
        const aceitaPerfil = tipoPlanoAceitaPerfil(item.tipo || tipo);
        const perfilInf = aceitaPerfil ? (item.perfilInferior || item.acabamentoInferior || item.perfilPainel || item.perfilFachada || item.acabamento || '') : '';
        const perfilSup = aceitaPerfil ? (item.perfilSuperior || item.acabamentoSuperior || item.perfilPainel || item.perfilFachada || item.acabamento || '') : '';
        const espInf = item.espChapaInf || item.espessuraChapaInferior || '';
        const espSup = item.espChapaSup || item.espessuraChapaSuperior || '';

        if (base) partes.push(base);

        if (perfilInf && perfilSup && perfilInf === perfilSup) partes.push(`Acab. inf/sup ${perfilInf}`);
        else {
            if (perfilInf) partes.push(`Acab. inf. ${perfilInf}`);
            if (perfilSup) partes.push(`Acab. sup. ${perfilSup}`);
        }
        if (espInf && String(espInf).toLowerCase() !== 'opcional') partes.push(`Chapa inf. ${espInf}`);
        if (espSup && String(espSup).toLowerCase() !== 'opcional') partes.push(`Chapa sup. ${espSup}`);

        return partes.filter(Boolean).join(' | ') || '--';
    }

    function agruparPlanoPorPedido(linhas) {
        const pedidos = {};
        const ordem = [];

        linhas.forEach(item => {
            const pedido = item.pedidoNumero || (item.modo === 'stock' ? 'STOCK' : 'S/N');
            const cliente = item.destino || item.qualidade || '';
            const chave = `${pedido}|||${cliente}`;

            if (!pedidos[chave]) {
                pedidos[chave] = [];
                ordem.push(chave);
            }

            pedidos[chave].push(item);
        });

        return { pedidos, ordem };
    }

    window.montarHTMLPlano = function(rel, comBotaoImpressao) {
        const itens = (rel.itens || []).filter(item => item.encomendaCancelada !== true);
        const gruposTipo = {};

        itens.forEach(item => {
            const tipo = String(item.tipo || 'Sem tipo').trim() || 'Sem tipo';
            const esp = String(item.espessura || 'Sem espessura').trim() || 'Sem espessura';
            gruposTipo[tipo] ||= {};
            gruposTipo[tipo][esp] ||= [];
            gruposTipo[tipo][esp].push(item);
        });

        let htmlGrupos = '';

        Object.keys(gruposTipo).sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(tipo => {
            htmlGrupos += `<section class="grupo-tipo"><h2>${segPlano(tipo)}</h2>`;

            Object.keys(gruposTipo[tipo]).sort(ordenarEspPlano).forEach(esp => {
                const linhas = gruposTipo[tipo][esp].slice().sort((a, b) => {
                    const pedidoA = String(a.pedidoNumero || '');
                    const pedidoB = String(b.pedidoNumero || '');
                    if (pedidoA !== pedidoB) return pedidoA.localeCompare(pedidoB, 'pt-BR', { numeric: true });
                    return numPlano(b.metrosUnidade) - numPlano(a.metrosUnidade);
                });

                const totalEsp = linhas.reduce((acc, item) => acc + numPlano(item.totalMetros), 0);
                const { pedidos, ordem } = agruparPlanoPorPedido(linhas);

                const htmlLinhas = ordem.map(chave => {
                    const itensPedido = pedidos[chave].slice().sort((a, b) => numPlano(b.metrosUnidade) - numPlano(a.metrosUnidade));
                    const [pedido, cliente] = chave.split('|||');
                    const totalPedido = itensPedido.reduce((acc, item) => acc + numPlano(item.totalMetros), 0);
                    const ralSupUnico = valorUnico(itensPedido.map(item => item.ralSuperior));
                    const ralInfUnico = valorUnico(itensPedido.map(item => item.ralInferior));
                    const ralUnicoIgual = ralInfUnico && ralSupUnico && ralInfUnico === ralSupUnico;
                    const descricoesPedido = Array.from(new Set(
                        itensPedido
                            .map(item => descricaoPlanoItem(item, tipo, esp))
                            .filter(desc => desc && desc !== '--')
                    ));
                    const descPedido = descricoesPedido.length ? descricoesPedido.join(' | ') : '--';
                    const pedidoUrgente = itensPedido.some(item => item.urgente === true || item.urgente === 'sim');

                    return `
                        ${itensPedido.map((item, indice) => `
                            <tr>
                                ${indice === 0 ? `
                                    <td rowspan="${itensPedido.length}" class="pedido-mesclado">
                                        <b>PEDIDO ${segPlano(pedido)}</b>
                                        <br><span>${segPlano(cliente)}</span>
                                        ${pedidoUrgente ? `<div class="urgente-pdf">URGENTE</div>` : ''}
                                    </td>
                                ` : ''}
                                ${ralUnicoIgual && indice === 0 ? `<td colspan="2" rowspan="${itensPedido.length}" class="ral-mesclado">RAL<br><b>${segPlano(ralInfUnico)}</b></td>` : ''}
                                ${!ralUnicoIgual && ralInfUnico && indice === 0 ? `<td rowspan="${itensPedido.length}" class="ral-mesclado">${segPlano(ralInfUnico)}</td>` : ''}
                                ${!ralUnicoIgual && !ralInfUnico ? `<td>${segPlano(item.ralInferior || '-')}</td>` : ''}
                                ${!ralUnicoIgual && ralSupUnico && indice === 0 ? `<td rowspan="${itensPedido.length}" class="ral-mesclado">${segPlano(ralSupUnico)}</td>` : ''}
                                ${!ralUnicoIgual && !ralSupUnico ? `<td>${segPlano(item.ralSuperior || '-')}</td>` : ''}
                                ${indice === 0 ? `<td rowspan="${itensPedido.length}" class="desc">${segPlano(descPedido)}</td>` : ''}
                                <td>${segPlano(item.quantidadeChapas || 0)}</td>
                                <td>${metroPlanoDetalhado(item.metrosUnidade)}</td>
                                <td><b>${metroPlano(item.totalMetros)}</b></td>
                            </tr>
                        `).join('')}
                    `;
                }).join('');

                htmlGrupos += `
                    <div class="grupo-esp">
                        <h3>${segPlano(espTextoPlano(esp))}</h3>
                        <table class="tabela-plano">
                            <thead>
                                <tr>
                                    <th>Pedido / Cliente</th>
                                    <th>RAL Inf.</th>
                                    <th>RAL Sup.</th>
                                    <th>Descricao</th>
                                    <th>Qtd</th>
                                    <th>Metro</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlLinhas}
                                <tr class="total-esp">
                                    <td colspan="6">TOTAL ${segPlano(tipo)} ${segPlano(espTextoPlano(esp))}</td>
                                    <td>${metroPlano(totalEsp)} m</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            });

            htmlGrupos += `</section>`;
        });

        const totalGeral = itens.reduce((acc, item) => acc + numPlano(item.totalMetros), 0);
        const blocoEdicao = '';

        return `
            <html>
            <head>
                <title>Plano de Pedidos</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color:#000; margin:0; padding:0; background:#fff; }
                    .cabecalho { display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #E31C24; padding:6px 0 10px 0; margin-bottom:10px; }
                    .marca { font-weight:900; font-size:22px; letter-spacing:1px; }
                    .marca span { color:#E31C24; }
                    .titulo { text-align:center; font-weight:800; font-size:18px; }
                    .dados { text-align:right; font-size:11px; line-height:1.45; }
                    .edicao { border:1px solid #f59e0b; background:#fff7ed; padding:6px; font-size:10px; margin-bottom:8px; }
                    .grupo-tipo { page-break-inside:avoid; margin-bottom:14px; }
                    .grupo-tipo h2 { margin:8px 0 4px 0; text-align:center; font-size:18px; text-transform:uppercase; }
                    .grupo-esp { margin-bottom:12px; page-break-inside:avoid; }
                    .grupo-esp h3 { margin:0; text-align:center; border:2px solid #000; border-bottom:none; padding:5px; font-size:15px; background:#f2f2f2; }
                    .tabela-plano { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10px; }
                    .tabela-plano th, .tabela-plano td { border:1.5px solid #000; padding:5px 4px; text-align:center; vertical-align:middle; }
                    .tabela-plano th { background:#d9d9d9; font-size:10px; }
                    .tabela-plano th:nth-child(4), .tabela-plano td.desc { width:30%; text-align:center; font-weight:800; }
                    .pedido-mesclado { background:#f8fafc; font-size:11px; font-weight:700; text-align:center; }
                    .urgente-pdf { color:#dc2626; font-weight:900; margin-top:6px; font-size:12px; }
                    .pedido-cabecalho td { background:#111827; color:#fff; font-weight:900; text-align:left; font-size:11px; letter-spacing:.2px; }
                    .pedido-cabecalho span { float:right; color:#fff; }
                    .ral-mesclado { background:#f8fafc; font-size:11px; font-weight:700; }
                    .total-esp td { background:#f2f2f2; font-weight:800; }
                    .total-geral { margin-top:10px; border:2px solid #000; padding:8px; text-align:center; font-size:18px; font-weight:900; }
                    .no-print { margin-top:16px; }
                    .no-print button { width:100%; padding:16px; border:0; border-radius:8px; background:#111827; color:#fff; font-size:16px; font-weight:800; }
                    @media print {
                        .no-print { display:none !important; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                <div class="cabecalho">
                    <div class="marca"><span>ATLAS</span> PAINEL</div>
                    <div class="titulo">PLANO DE PEDIDOS</div>
                    <div class="dados">
                        Data: <b>${segPlano(rel.data || '')}</b><br>
                        Operador: <b>${segPlano(rel.operador || '')}</b>
                    </div>
                </div>

                ${blocoEdicao}
                ${htmlGrupos || '<div style="text-align:center; padding:30px;">Nenhum pedido no plano.</div>'}

                <div class="total-geral">TOTAL GERAL DO PLANO: ${metroPlano(totalGeral)} m</div>

                ${comBotaoImpressao ? `
                    <div class="no-print">
                        <button onclick="window.print()">CONFIRMAR E GERAR PDF</button>
                    </div>
                ` : ''}
            </body>
            </html>
        `;
    };

    function gruposGestaoPlano(linhas) {
        const grupos = [];
        const mapa = {};

        linhas.forEach((item, indice) => {
            const pedido = item.pedidoNumero || (item.modo === 'stock' ? 'STOCK' : 'S/N');
            const cliente = item.destino || item.qualidade || '';
            const chave = `${pedido}|||${cliente}`;
            if (!mapa[chave]) {
                mapa[chave] = { pedido, cliente, indices: [] };
                grupos.push(mapa[chave]);
            }
            mapa[chave].indices.push(indice);
        });

        return grupos;
    }

    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const modal = document.getElementById('modal-plano-historico');
        if (!rel || !modal) return;

        const linhas = rel.itens || [];
        const total = linhas.reduce((acc, item) => acc + numPlano(item.totalMetros), 0);
        const grupos = gruposGestaoPlano(linhas);
        window.atlasPlanoGrupoGestao[indexPlano] = grupos.map(g => g.indices);

        modal.innerHTML = `
            <style>
                .plano-modal { max-width:1540px; margin:0 auto; background:#f8fafc; min-height:100%; border:2px solid #0f172a; border-radius:10px; padding:14px; color:#020617; box-shadow:0 18px 60px rgba(0,0,0,.45); }
                .plano-topo { position:sticky; top:0; background:#f8fafc; z-index:3; border-bottom:2px solid #0f172a; padding-bottom:12px; }
                .plano-add { display:grid; grid-template-columns:repeat(6, minmax(130px, 1fr)); gap:8px; margin-top:12px; padding:10px; border:1px solid #0f172a; background:#e5e7eb; }
                .plano-add.fechado { display:none; }
                .plano-add-toggle { display:flex; justify-content:flex-start; gap:10px; flex-wrap:wrap; margin-top:12px; }
                .plano-btn-inserir { background:#10b981; min-width:180px; min-height:46px; font-size:15px; }
                .plano-btn-fechar-inserir { background:#475569; min-height:46px; }
                .plano-add .linha-cheia { grid-column:span 2; }
                .plano-add .acabamento-add.oculto { display:none; }
                .plano-input, .plano-select { width:100%; padding:9px; background:#fff; color:#020617; border:1px solid #111827; border-radius:0; font-size:14px; font-weight:700; }
                .plano-input::placeholder { color:#64748b; font-weight:600; }
                .plano-wrap { overflow:auto; margin-top:14px; border:2px solid #0f172a; border-radius:0; max-height:70vh; background:white; }
                .plano-tabela { width:100%; min-width:1280px; border-collapse:collapse; font-size:13px; table-layout:fixed; }
                .plano-tabela th { position:sticky; top:0; background:#d9d9d9; color:#000; z-index:2; padding:8px; border:1px solid #111827; text-align:center; }
                .plano-tabela td { padding:5px; border:1px solid #111827; vertical-align:middle; background:#fff; color:#000; }
                .plano-tabela tr:nth-child(even) td:not(.plano-grupo-celula) { background:#f8fafc; }
                .plano-grupo td { background:#111827; color:#fff; border:1px solid #111827; }
                .plano-grupo-celula { background:#111827 !important; color:#fff !important; font-weight:900 !important; }
                .plano-grupo-grid { display:grid; grid-template-columns:150px 1fr 115px 145px 130px 125px 145px; gap:8px; align-items:center; }
                .plano-grupo-grid .plano-input, .plano-grupo-grid b { font-weight:900 !important; font-size:15px; }
                .plano-total { color:#047857; font-weight:900; text-align:center; }
                .plano-label-add { font-size:11px; color:#334155; font-weight:900; text-transform:uppercase; margin-bottom:3px; display:block; }
                .plano-btn { border:none; border-radius:7px; padding:9px 10px; color:white; font-weight:800; cursor:pointer; }
                .plano-btn-fechar { background:#475569; }
                .plano-btn-add { background:#10b981; }
                .plano-urgente-box { display:flex; align-items:center; justify-content:center; gap:10px; background:#fff; color:#b91c1c; border:1px solid #111827; border-radius:0; padding:9px; font-weight:900; text-align:center; min-height:44px; }
                .plano-urgente-box input { width:18px; height:18px; flex:0 0 auto; }
                .plano-urgente-pedido { background:#fee2e2 !important; color:#991b1b !important; border:2px solid #ef4444 !important; font-size:16px; letter-spacing:.3px; }
                .plano-toast { position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:20000; background:#10b981; color:#fff; border:2px solid #047857; box-shadow:0 12px 35px rgba(0,0,0,.35); padding:14px 22px; border-radius:8px; font-weight:900; font-size:16px; text-align:center; }
                @media (min-width: 761px) and (max-width: 1180px) {
                    .plano-modal { padding:12px; }
                    .plano-add { grid-template-columns:repeat(3, minmax(160px, 1fr)); }
                    .plano-add .linha-cheia { grid-column:span 2; }
                    .plano-tabela { min-width:1080px; font-size:12px; }
                    .plano-grupo-grid { grid-template-columns:130px 1fr 105px 140px 120px 120px 140px; }
                }
                @media (max-width: 760px) {
                    .plano-modal { padding:8px; border-radius:0; border-left:0; border-right:0; }
                    .plano-topo { position:static; padding-bottom:10px; }
                    .plano-topo > div:first-child { align-items:flex-start !important; }
                    .plano-topo h2 { font-size:20px !important; }
                    .plano-add { grid-template-columns:1fr; padding:8px; gap:7px; }
                    .plano-add-toggle { display:grid; grid-template-columns:1fr; }
                    .plano-add .linha-cheia { grid-column:auto; }
                    .plano-btn, .plano-btn-add, .plano-btn-fechar { width:100%; min-height:44px; }
                    .plano-wrap { max-height:none; overflow:visible; border:0; background:transparent; margin-top:10px; }
                    .plano-tabela { min-width:0; width:100%; display:block; border-collapse:separate; font-size:13px; }
                    .plano-tabela thead { display:none; }
                    .plano-tabela tbody, .plano-tabela tr, .plano-tabela td { display:block; width:100%; }
                    .plano-tabela tr { margin-bottom:10px; border:2px solid #0f172a; background:#fff; }
                    .plano-tabela td { border:0; border-bottom:1px solid #cbd5e1; padding:8px; background:#fff !important; }
                    .plano-tabela td:last-child { border-bottom:0; }
                    .plano-tabela td[data-label]::before { content:attr(data-label); display:block; margin-bottom:5px; color:#334155; font-size:11px; font-weight:900; text-transform:uppercase; }
                    .plano-input, .plano-select { font-size:15px; padding:11px; min-height:44px; }
                    .plano-grupo { border:0 !important; margin-top:14px !important; margin-bottom:0 !important; }
                    .plano-grupo-celula { padding:8px !important; border:2px solid #0f172a !important; }
                    .plano-grupo-grid { grid-template-columns:1fr; }
                    .plano-urgente-box { justify-content:center; font-size:16px; padding:12px; }
                    .plano-urgente-pedido { min-height:52px; font-size:17px; }
                    .plano-total { font-size:18px; text-align:left; }
                    .plano-total::before { color:#047857 !important; }
                    .plano-tabela td[data-label="Acoes"] div { flex-direction:column; }
                    .plano-toast { width:calc(100% - 28px); top:10px; font-size:15px; }
                }
            </style>
            <div class="plano-modal">
                <div class="plano-topo">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                        <div>
                            <h2 style="margin:0; font-size:22px; color:#000;">Gerir Plano</h2>
                            <div style="color:#334155; font-size:13px; margin-top:4px;">
                                ${segPlano(rel.data || '')} | Total atual:
                                <b style="color:#047857;">${metroPlano(total)} m</b>
                            </div>
                        </div>
                        <button onclick="fecharGestaoPlanoHistorico()" class="plano-btn plano-btn-fechar">FECHAR</button>
                    </div>

                    <div class="plano-add-toggle">
                        <button id="btn-abrir-inserir-plano-hist" onclick="toggleInserirPlanoHistorico(true)" class="plano-btn plano-btn-inserir">INSERIR</button>
                    </div>

                    <div id="bloco-inserir-plano-hist" class="plano-add fechado">
                        <div><span class="plano-label-add">Pedido</span><input id="grid-add-pedido" class="plano-input" placeholder="Pedido"></div>
                        <div>
                            <span class="plano-label-add">Cliente</span>
                            <input id="grid-add-destino" class="plano-input" list="lista-clientes-plano-excel" placeholder="Digite ou escolha cliente">
                            <datalist id="lista-clientes-plano-excel">
                                ${(destinosPlano || []).map(v => `<option value="${segPlano(v)}"></option>`).join('')}
                            </datalist>
                        </div>
                        <label class="plano-urgente-box plano-urgente-pedido">
                            <input id="grid-add-urgente" type="checkbox"> URGENTE
                        </label>
                        <div><span class="plano-label-add">Tipo</span><select id="grid-add-tipo" class="plano-select" onchange="atualizarAcabamentoAdicionarPlanoExcel()">${opcoesPlano(OPCOES_TIPO_PLANO, '')}</select></div>
                        <div><span class="plano-label-add">Espessura</span><select id="grid-add-esp" class="plano-select">${opcoesPlano(OPCOES_ESPESSURA_PLANO, '', ' mm')}</select></div>
                        <div><span class="plano-label-add">RAL inferior</span><select id="grid-add-ral-inf" class="plano-select">${opcoesPlano(OPCOES_RAL_INF, '')}</select></div>
                        <div><span class="plano-label-add">RAL superior</span><select id="grid-add-ral-sup" class="plano-select">${opcoesPlano(OPCOES_RAL_SUP, '')}</select></div>
                        <div id="grid-add-perfil-inf-wrap" class="acabamento-add"><span class="plano-label-add">Acab. inferior</span><select id="grid-add-perfil-inf" class="plano-select">
                            <option value="">Opcional</option>
                            <option value="Canelada" selected>Canelada</option>
                            <option value="Micronervurada">Micronervurada</option>
                            <option value="Lisa">Lisa</option>
                        </select></div>
                        <div id="grid-add-perfil-sup-wrap" class="acabamento-add"><span class="plano-label-add">Acab. superior</span><select id="grid-add-perfil-sup" class="plano-select">
                            <option value="">Opcional</option>
                            <option value="Canelada" selected>Canelada</option>
                            <option value="Micronervurada">Micronervurada</option>
                            <option value="Lisa">Lisa</option>
                        </select></div>
                        <div><span class="plano-label-add">Quantidade</span><input id="grid-add-qtd" type="number" inputmode="numeric" class="plano-input" placeholder="Qtd"></div>
                        <div><span class="plano-label-add">Metro</span><input id="grid-add-metros" type="number" inputmode="decimal" step="0.01" class="plano-input" placeholder="Metro"></div>
                        <div class="linha-cheia"><span class="plano-label-add">Mensagem / descricao</span><input id="grid-add-info" class="plano-input" placeholder="Informacao manual / descricao"></div>
                        <button onclick="adicionarLinhaPlanoExcel(${indexPlano})" class="plano-btn plano-btn-add">ADICIONAR</button>
                        <button onclick="toggleInserirPlanoHistorico(false)" class="plano-btn plano-btn-fechar-inserir">FECHAR INSERIR</button>
                    </div>
                </div>

                <div class="plano-wrap">
                    <table class="plano-tabela">
                        <thead>
                            <tr>
                                <th style="width:150px;">Tipo</th>
                                <th style="width:90px;">Esp.</th>
                                <th>RAL Inf.<br><small>Acab. inf.</small></th>
                                <th>RAL Sup.<br><small>Acab. sup.</small></th>
                                <th style="width:280px;">Descricao / mensagem</th>
                                <th style="width:90px;">Qtd</th>
                                <th style="width:110px;">Metro</th>
                                <th style="width:110px;">Total</th>
                                <th style="width:175px;">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grupos.map((grupo, grupoIndex) => {
                                const totalGrupo = grupo.indices.reduce((acc, idx) => acc + numPlano(linhas[idx]?.totalMetros), 0);
                                const grupoUrgente = grupo.indices.some(idx => linhas[idx]?.urgente === true || linhas[idx]?.urgente === 'sim');
                                return `
                                    <tr class="plano-grupo">
                                        <td colspan="9" class="plano-grupo-celula">
                                            <div class="plano-grupo-grid">
                                                <input id="grid-grupo-${grupoIndex}-pedido" class="plano-input" value="${segPlano(grupo.pedido)}">
                                                <input id="grid-grupo-${grupoIndex}-cliente" class="plano-input" value="${segPlano(grupo.cliente)}">
                                                <b style="color:#10b981; text-align:center;">${metroPlano(totalGrupo)} m</b>
                                                <label class="plano-urgente-box plano-urgente-pedido">
                                                    <input id="grid-grupo-${grupoIndex}-urgente" type="checkbox" ${grupoUrgente ? 'checked' : ''}> URGENTE
                                                </label>
                                                <button onclick="salvarGrupoPedidoPlanoExcel(${indexPlano}, ${grupoIndex})" class="plano-btn" style="background:#f59e0b; color:black;">SALVAR PEDIDO</button>
                                                <button onclick="prepararNovaLinhaPedidoPlanoExcel(${indexPlano}, ${grupoIndex})" class="plano-btn" style="background:#0f172a; color:white;">+ LINHA</button>
                                                <button onclick="removerPedidoPlanoHistorico(${indexPlano}, '${String(grupo.pedido).replace(/'/g, "\\'")}', '${String(grupo.cliente).replace(/'/g, "\\'")}')" class="plano-btn" style="background:#7f1d1d; color:white;">EXCLUIR PEDIDO</button>
                                            </div>
                                        </td>
                                    </tr>
                                    ${grupo.indices.map(idx => {
                                        const item = linhas[idx];
                                        return `
                                            <tr>
                                                <td data-label="Tipo"><select id="grid-${idx}-tipo" class="plano-select">${opcoesPlano(OPCOES_TIPO_PLANO, item.tipo)}</select></td>
                                                <td data-label="Espessura"><select id="grid-${idx}-esp" class="plano-select">${opcoesPlano(OPCOES_ESPESSURA_PLANO, item.espessura, ' mm')}</select></td>
                                                <td data-label="RAL inferior / Acab. inferior">
                                                    <select id="grid-${idx}-ral-inf" class="plano-select">${opcoesPlano(OPCOES_RAL_INF, item.ralInferior)}</select>
                                                    ${tipoPlanoAceitaPerfil(item.tipo) ? `<select id="grid-${idx}-perfil-inf" class="plano-select" style="margin-top:5px;">
                                                        <option value="">Acab. inf.</option>
                                                        <option value="Canelada" ${(item.perfilInferior || item.acabamentoInferior || item.perfilPainel || 'Canelada') === 'Canelada' ? 'selected' : ''}>Canelada</option>
                                                        <option value="Micronervurada" ${(item.perfilInferior || item.acabamentoInferior || item.perfilPainel) === 'Micronervurada' ? 'selected' : ''}>Micronervurada</option>
                                                        <option value="Lisa" ${(item.perfilInferior || item.acabamentoInferior || item.perfilPainel) === 'Lisa' ? 'selected' : ''}>Lisa</option>
                                                    </select>` : ''}
                                                </td>
                                                <td data-label="RAL superior / Acab. superior">
                                                    <select id="grid-${idx}-ral-sup" class="plano-select">${opcoesPlano(OPCOES_RAL_SUP, item.ralSuperior)}</select>
                                                    ${tipoPlanoAceitaPerfil(item.tipo) ? `<select id="grid-${idx}-perfil-sup" class="plano-select" style="margin-top:5px;">
                                                        <option value="">Acab. sup.</option>
                                                        <option value="Canelada" ${(item.perfilSuperior || item.acabamentoSuperior || item.perfilPainel || 'Canelada') === 'Canelada' ? 'selected' : ''}>Canelada</option>
                                                        <option value="Micronervurada" ${(item.perfilSuperior || item.acabamentoSuperior || item.perfilPainel) === 'Micronervurada' ? 'selected' : ''}>Micronervurada</option>
                                                        <option value="Lisa" ${(item.perfilSuperior || item.acabamentoSuperior || item.perfilPainel) === 'Lisa' ? 'selected' : ''}>Lisa</option>
                                                    </select>` : ''}
                                                </td>
                                                <td data-label="Descricao / mensagem">
                                                    <input id="grid-${idx}-info" class="plano-input" value="${segPlano(item.descricaoManual || item.infoManual || item.observacaoPlano || '')}" placeholder="Info manual">
                                                </td>
                                                <td data-label="Quantidade"><input id="grid-${idx}-qtd" type="number" inputmode="numeric" class="plano-input" value="${segPlano(item.quantidadeChapas || 0)}"></td>
                                                <td data-label="Metro"><input id="grid-${idx}-metros" type="number" inputmode="decimal" step="0.01" class="plano-input" value="${segPlano(item.metrosUnidade || 0)}"></td>
                                                <td data-label="Total" class="plano-total">${metroPlano(item.totalMetros)} m</td>
                                                <td data-label="Acoes">
                                                    <div style="display:flex; gap:6px;">
                                                        <button onclick="salvarLinhaPlanoExcel(${indexPlano}, ${idx})" class="plano-btn" style="background:#3b82f6;">SALVAR</button>
                                                        <button onclick="excluirLinhaPlanoExcel(${indexPlano}, ${idx})" class="plano-btn" style="background:#7f1d1d;">EXCLUIR</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        if (typeof atualizarAcabamentoAdicionarPlanoExcel === 'function') atualizarAcabamentoAdicionarPlanoExcel();
    };

    window.toggleInserirPlanoHistorico = function(abrir) {
        const bloco = document.getElementById('bloco-inserir-plano-hist');
        const botao = document.getElementById('btn-abrir-inserir-plano-hist');
        if (!bloco) return;
        bloco.classList.toggle('fechado', !abrir);
        if (botao) botao.style.display = abrir ? 'none' : '';
        if (abrir) {
            atualizarAcabamentoAdicionarPlanoExcel();
            setTimeout(() => document.getElementById('grid-add-pedido')?.focus(), 80);
        }
    };

    window.atualizarAcabamentoAdicionarPlanoExcel = function() {
        const tipo = document.getElementById('grid-add-tipo')?.value || '';
        const pode = tipoPlanoAceitaPerfil(tipo);
        ['grid-add-perfil-inf', 'grid-add-perfil-sup'].forEach(id => {
            const campo = document.getElementById(id);
            const wrap = document.getElementById(`${id}-wrap`);
            if (wrap) wrap.classList.toggle('oculto', !pode);
            if (!campo) return;
            campo.disabled = !pode;
            if (pode && !campo.value) campo.value = 'Canelada';
            if (!pode) campo.value = '';
        });
    };

    window.mostrarAvisoPlanoExcel = function(texto) {
        const antigo = document.getElementById('plano-toast-salvo');
        if (antigo) antigo.remove();
        const aviso = document.createElement('div');
        aviso.id = 'plano-toast-salvo';
        aviso.className = 'plano-toast';
        aviso.textContent = texto || 'Pedido salvo';
        document.body.appendChild(aviso);
        setTimeout(() => aviso.remove(), 1800);
    };

    window.salvarGrupoPedidoPlanoExcel = function(indexPlano, grupoIndex) {
        const rel = db_plano_hist[indexPlano];
        const indices = window.atlasPlanoGrupoGestao?.[indexPlano]?.[grupoIndex] || [];
        if (!rel || !indices.length) return;

        const pedido = document.getElementById(`grid-grupo-${grupoIndex}-pedido`)?.value.trim() || 'S/N';
        const cliente = document.getElementById(`grid-grupo-${grupoIndex}-cliente`)?.value.trim() || '';
        const urgente = !!document.getElementById(`grid-grupo-${grupoIndex}-urgente`)?.checked;

        indices.forEach(idx => {
            if (rel.itens[idx]) {
                rel.itens[idx].pedidoNumero = pedido;
                rel.itens[idx].destino = cliente;
                rel.itens[idx].urgente = urgente;
                aplicarCamposLinhaPlanoExcel(rel.itens[idx], idx);
            }
        });

        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou pedido ${pedido} - ${cliente}${urgente ? ' - URGENTE' : ''}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        setTimeout(() => mostrarAvisoPlanoExcel(`Pedido ${pedido} salvo`), 50);
        listarHistoricoPlano();
    };

    window.prepararNovaLinhaPedidoPlanoExcel = function(indexPlano, grupoIndex) {
        const rel = db_plano_hist[indexPlano];
        const indices = window.atlasPlanoGrupoGestao?.[indexPlano]?.[grupoIndex] || [];
        const base = rel?.itens?.[indices[0]];
        if (!rel || !indices.length || !base) return;

        const pedido = document.getElementById(`grid-grupo-${grupoIndex}-pedido`)?.value.trim() || base.pedidoNumero || 'S/N';
        const cliente = document.getElementById(`grid-grupo-${grupoIndex}-cliente`)?.value.trim() || base.destino || '';
        const urgente = !!document.getElementById(`grid-grupo-${grupoIndex}-urgente`)?.checked || !!base.urgente;

        const setCampo = (id, valor) => {
            const campo = document.getElementById(id);
            if (campo) campo.value = valor || '';
        };

        setCampo('grid-add-pedido', pedido);
        setCampo('grid-add-destino', cliente);
        setCampo('grid-add-tipo', base.tipo || OPCOES_TIPO_PLANO[0] || '');
        setCampo('grid-add-esp', base.espessura || OPCOES_ESPESSURA_PLANO[0] || '');
        setCampo('grid-add-ral-inf', base.ralInferior || OPCOES_RAL_INF[0] || '');
        setCampo('grid-add-ral-sup', base.ralSuperior || OPCOES_RAL_SUP[0] || '');
        setCampo('grid-add-info', '');
        setCampo('grid-add-qtd', '');
        setCampo('grid-add-metros', '');

        const campoUrgente = document.getElementById('grid-add-urgente');
        if (campoUrgente) campoUrgente.checked = urgente;

        if (tipoPlanoAceitaPerfil(base.tipo)) {
            setCampo('grid-add-perfil-inf', base.perfilInferior || base.acabamentoInferior || 'Canelada');
            setCampo('grid-add-perfil-sup', base.perfilSuperior || base.acabamentoSuperior || 'Canelada');
        }

        if (typeof atualizarAcabamentoAdicionarPlanoExcel === 'function') atualizarAcabamentoAdicionarPlanoExcel();

        if (typeof toggleInserirPlanoHistorico === 'function') toggleInserirPlanoHistorico(true);
        const foco = document.getElementById('grid-add-qtd');
        foco?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => foco?.focus(), 250);
        mostrarAvisoPlanoExcel(`Pronto para adicionar linha no pedido ${pedido}`);
    };

    function aplicarCamposLinhaPlanoExcel(item, linha) {
        if (!item) return false;
        const qtd = numPlano(document.getElementById(`grid-${linha}-qtd`)?.value);
        const metros = numPlano(document.getElementById(`grid-${linha}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return false;

        item.tipo = document.getElementById(`grid-${linha}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`grid-${linha}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`grid-${linha}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`grid-${linha}-ral-sup`)?.value || item.ralSuperior;
        item.infoManual = document.getElementById(`grid-${linha}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.perfilInferior = tipoPlanoAceitaPerfil(item.tipo) ? (document.getElementById(`grid-${linha}-perfil-inf`)?.value || 'Canelada') : '';
        item.perfilSuperior = tipoPlanoAceitaPerfil(item.tipo) ? (document.getElementById(`grid-${linha}-perfil-sup`)?.value || 'Canelada') : '';
        item.acabamentoInferior = item.perfilInferior;
        item.acabamentoSuperior = item.perfilSuperior;
        item.perfilPainel = '';
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetrosAntesCancelamento = Number((qtd * metros).toFixed(2));
        item.totalMetros = item.encomendaCancelada ? 0 : item.totalMetrosAntesCancelamento;
        item.descricao = `${item.tipo} ${item.espessura} mm`;
        return true;
    }

    window.salvarLinhaPlanoExcel = function(indexPlano, linha) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[linha];
        if (!rel || !item) return;

        if (!aplicarCamposLinhaPlanoExcel(item, linha)) return alert('Informe quantidade e metros validos.');

        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha do plano ${item.pedidoNumero || 'stock'}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.adicionarLinhaPlanoExcel = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;

        const qtd = numPlano(document.getElementById('grid-add-qtd')?.value);
        const metros = numPlano(document.getElementById('grid-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos para adicionar.');

        const pedidoNumero = document.getElementById('grid-add-pedido')?.value.trim() || 'S/N';
        const destino = document.getElementById('grid-add-destino')?.value.trim() || '';
        const tipo = document.getElementById('grid-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('grid-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';
        const infoManual = document.getElementById('grid-add-info')?.value.trim() || '';
        const perfilInferior = tipoPlanoAceitaPerfil(tipo) ? (document.getElementById('grid-add-perfil-inf')?.value || '') : '';
        const perfilSuperior = tipoPlanoAceitaPerfil(tipo) ? (document.getElementById('grid-add-perfil-sup')?.value || '') : '';

        if (destino && !destinosPlano.includes(destino)) {
            destinosPlano.push(destino);
            destinosPlano.sort();
            salvarDestinosPlano();
        }

        rel.itens ||= [];
        rel.itens.push({
            id: Date.now() + '-' + Math.random().toString(16).slice(2),
            modo: 'pedido',
            pedidoNumero,
            destino,
            tipo,
            espessura,
            ralInferior: document.getElementById('grid-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('grid-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            descricao: `${tipo} ${espessura} mm`,
            infoManual,
            descricaoManual: infoManual,
            perfilInferior,
            perfilSuperior,
            acabamentoInferior: perfilInferior,
            acabamentoSuperior: perfilSuperior,
            perfilPainel: '',
            urgente: !!document.getElementById('grid-add-urgente')?.checked
        });

        salvarPlanoHistoricoEditado(indexPlano, rel, `Adicionou linha ao plano ${pedidoNumero}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    function inserirCamposExtrasPlano() {
        if (document.getElementById('plano-extra-info')) return;
        const ralInf = document.getElementById('plano-ral-inf');
        const blocoRal = ralInf?.closest('div')?.parentElement;
        if (!blocoRal) return;

        blocoRal.insertAdjacentHTML('afterend', `
            <div id="plano-extra-info" style="display:grid; grid-template-columns:1fr 1fr auto; gap:10px; margin-bottom:12px; align-items:end;">
                <div id="plano-perfil-wrap">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div>
                            <label style="color:#94a3b8; font-size:11px;">ACAB. INFERIOR</label>
                            <select id="plano-perfil-inf" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">
                                <option value="">Opcional</option>
                                <option value="Canelada" selected>Canelada</option>
                                <option value="Micronervurada">Micronervurada</option>
                                <option value="Lisa">Lisa</option>
                            </select>
                        </div>
                        <div>
                            <label style="color:#94a3b8; font-size:11px;">ACAB. SUPERIOR</label>
                            <select id="plano-perfil-sup" style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">
                                <option value="">Opcional</option>
                                <option value="Canelada" selected>Canelada</option>
                                <option value="Micronervurada">Micronervurada</option>
                                <option value="Lisa">Lisa</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div>
                    <label style="color:#94a3b8; font-size:11px;">INFORMACAO MANUAL / DESCRICAO</label>
                    <input id="plano-info-manual" placeholder="Ex: cliente pediu prioridade, detalhe da chapa..." style="background:#1e293b; color:white; border:1px solid #334155; width:100%; padding:12px; border-radius:6px; margin-top:5px;">
                </div>
                <label style="display:flex; align-items:center; gap:8px; color:white; background:#1e293b; border:1px solid #334155; padding:12px; border-radius:6px;">
                    <input id="plano-urgente" type="checkbox"> Urgente
                </label>
            </div>
        `);

        const atualizarPerfil = () => {
            const tipoAtual = document.getElementById('plano-tipo')?.value || db_plano_live?.pedidoAtual?.tipo || '';
            const podePerfil = tipoPlanoAceitaPerfil(tipoAtual);
            const extraInfo = document.getElementById('plano-extra-info');
            const wrap = document.getElementById('plano-perfil-wrap');
            const selectInf = document.getElementById('plano-perfil-inf');
            const selectSup = document.getElementById('plano-perfil-sup');
            if (wrap) wrap.style.display = podePerfil ? 'block' : 'none';
            if (extraInfo) extraInfo.style.gridTemplateColumns = podePerfil ? '1fr 1fr auto' : '1fr auto';
            if (podePerfil && selectInf && !selectInf.value) selectInf.value = 'Canelada';
            if (podePerfil && selectSup && !selectSup.value) selectSup.value = 'Canelada';
            if (!podePerfil && selectInf) selectInf.value = '';
            if (!podePerfil && selectSup) selectSup.value = '';
        };

        document.getElementById('plano-tipo')?.addEventListener('change', atualizarPerfil);
        atualizarPerfil();
    }

    const abrirFormularioPlanoOriginalMesclado = window.abrirFormularioPlano;
    if (typeof abrirFormularioPlanoOriginalMesclado === 'function') {
        window.abrirFormularioPlano = function(modo) {
            abrirFormularioPlanoOriginalMesclado(modo);
            inserirCamposExtrasPlano();
        };
        abrirFormularioPlano = window.abrirFormularioPlano;
    }

    const adicionarLinhaPlanoOriginalMesclado = window.adicionarLinhaPlano;
    if (typeof adicionarLinhaPlanoOriginalMesclado === 'function') {
        window.adicionarLinhaPlano = function(modo) {
            const tipoAtual = document.getElementById('plano-tipo')?.value || db_plano_live?.pedidoAtual?.tipo || '';
            const extra = {
                infoManual: document.getElementById('plano-info-manual')?.value.trim() || '',
                perfilInferior: tipoPlanoAceitaPerfil(tipoAtual) ? (document.getElementById('plano-perfil-inf')?.value || '') : '',
                perfilSuperior: tipoPlanoAceitaPerfil(tipoAtual) ? (document.getElementById('plano-perfil-sup')?.value || '') : '',
                urgente: !!document.getElementById('plano-urgente')?.checked
            };
            const antes = db_plano_live?.linhasAbertas?.length || 0;

            adicionarLinhaPlanoOriginalMesclado(modo);

            const linhas = db_plano_live?.linhasAbertas || [];
            if (linhas.length > antes) {
                const item = linhas[linhas.length - 1];
                item.infoManual = extra.infoManual;
                item.descricaoManual = extra.infoManual;
                item.perfilInferior = extra.perfilInferior;
                item.perfilSuperior = extra.perfilSuperior;
                item.acabamentoInferior = extra.perfilInferior;
                item.acabamentoSuperior = extra.perfilSuperior;
                item.perfilPainel = '';
                item.urgente = extra.urgente;
                if (typeof salvarPlanoLive === 'function') salvarPlanoLive();
                if (typeof atualizarTelaPlanoAtual === 'function') atualizarTelaPlanoAtual();
            }
        };
        adicionarLinhaPlano = window.adicionarLinhaPlano;
    }
})();

/* ==========================================================
   PLANO - PDF AGRUPADO + GERIR EM TABELA
   ========================================================== */

(function() {
    if (window.atlasPlanoPdfTabelaGestaoAtivo || window.atlasPlanoMescladoExcelV2Ativo) return;
    window.atlasPlanoPdfTabelaGestaoAtivo = true;

    function atlasPlanoSeguro(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasNumeroPlano(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function atlasFormatoMetroPlano(valor) {
        return atlasNumeroPlano(valor).toFixed(2).replace('.', ',');
    }

    function atlasFormatoMetroPlanoDetalhado(valor) {
      const numero = atlasNumeroPlano(valor);
      const milimetros = Math.round(numero * 1000);
      return `${milimetros}`;
    }

    function atlasEspessuraTexto(valor) {
        const texto = String(valor ?? '').trim();
        if (!texto) return '-';
        return texto.toLowerCase().includes('mm') ? texto : `${texto} mm`;
    }

    function atlasOrdenarEspessurasPlano(a, b) {
        const na = Number(String(a).replace(/[^\d,.]/g, '').replace(',', '.'));
        const nb = Number(String(b).replace(/[^\d,.]/g, '').replace(',', '.'));
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
    }

    function atlasOpcoesPlano(lista, selecionado, sufixo) {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${atlasPlanoSeguro(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${atlasPlanoSeguro(texto)}</option>`;
        }).join('');
    }

    window.montarHTMLPlano = function(rel, comBotaoImpressao) {
        const itens = (rel.itens || []).filter(item => item.encomendaCancelada !== true);
        const gruposTipo = {};

        itens.forEach(item => {
            const tipo = String(item.tipo || 'Sem tipo').trim() || 'Sem tipo';
            const esp = String(item.espessura || 'Sem espessura').trim() || 'Sem espessura';
            gruposTipo[tipo] ||= {};
            gruposTipo[tipo][esp] ||= [];
            gruposTipo[tipo][esp].push(item);
        });

        let htmlGrupos = '';

        Object.keys(gruposTipo).sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(tipo => {
            htmlGrupos += `<section class="grupo-tipo"><h2>${atlasPlanoSeguro(tipo)}</h2>`;

            Object.keys(gruposTipo[tipo]).sort(atlasOrdenarEspessurasPlano).forEach(esp => {
                const linhas = gruposTipo[tipo][esp].slice().sort((a, b) => {
                    const pedidoA = String(a.pedidoNumero || '');
                    const pedidoB = String(b.pedidoNumero || '');
                    if (pedidoA !== pedidoB) return pedidoA.localeCompare(pedidoB, 'pt-BR', { numeric: true });
                    return atlasNumeroPlano(b.metrosUnidade) - atlasNumeroPlano(a.metrosUnidade);
                });

                const totalEsp = linhas.reduce((acc, item) => acc + atlasNumeroPlano(item.totalMetros), 0);
                const pedidos = {};
                const ordemPedidos = [];

                linhas.forEach(item => {
                    const pedido = item.pedidoNumero || (item.modo === 'stock' ? 'STOCK' : 'S/N');
                    const cliente = item.destino || item.qualidade || '';
                    const chave = `${pedido}|||${cliente}`;

                    if (!pedidos[chave]) {
                        pedidos[chave] = [];
                        ordemPedidos.push(chave);
                    }

                    pedidos[chave].push(item);
                });

                const htmlLinhas = ordemPedidos.map(chave => {
                    const itensPedido = pedidos[chave].slice().sort((a, b) => atlasNumeroPlano(b.metrosUnidade) - atlasNumeroPlano(a.metrosUnidade));
                    const [pedido, cliente] = chave.split('|||');
                    const totalPedido = itensPedido.reduce((acc, item) => acc + atlasNumeroPlano(item.totalMetros), 0);
                    const rowspan = itensPedido.length + 1;

                    return `
                        ${itensPedido.map((item, indice) => `
                            <tr>
                                ${indice === 0 ? `
                                    <td rowspan="${rowspan}" class="pedido-mesclado">
                                        <b>${atlasPlanoSeguro(pedido)}</b>
                                        <br><span>${atlasPlanoSeguro(cliente)}</span>
                                    </td>
                                ` : ''}
                                <td>${atlasPlanoSeguro(item.ralInferior || '-')}</td>
                                <td>${atlasPlanoSeguro(item.ralSuperior || '-')}</td>
                                <td>${atlasPlanoSeguro(item.descricao || item.tipo || tipo)}</td>
                                <td>${atlasPlanoSeguro(item.quantidadeChapas || 0)}</td>
                                <td>${atlasFormatoMetroPlanoDetalhado(item.metrosUnidade)}</td>
                                <td><b>${atlasFormatoMetroPlano(item.totalMetros)}</b></td>
                            </tr>
                        `).join('')}
                        <tr class="total-pedido">
                            <td colspan="5">TOTAL PEDIDO ${atlasPlanoSeguro(pedido)}${cliente ? ' - ' + atlasPlanoSeguro(cliente) : ''}</td>
                            <td>${atlasFormatoMetroPlano(totalPedido)} m</td>
                        </tr>
                    `;
                }).join('');

                htmlGrupos += `
                    <div class="grupo-esp">
                        <h3>${atlasPlanoSeguro(atlasEspessuraTexto(esp))}</h3>
                        <table class="tabela-plano">
                            <thead>
                                <tr>
                                    <th>Pedido / Cliente</th>
                                    <th>RAL Inf.</th>
                                    <th>RAL Sup.</th>
                                    <th>Tipo / Descricao</th>
                                    <th>Qtd</th>
                                    <th>Metro</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlLinhas}
                                <tr class="total-esp">
                                    <td colspan="6">TOTAL ${atlasPlanoSeguro(tipo)} ${atlasPlanoSeguro(atlasEspessuraTexto(esp))}</td>
                                    <td>${atlasFormatoMetroPlano(totalEsp)} m</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            });

            htmlGrupos += `</section>`;
        });

        const totalGeral = itens.reduce((acc, item) => acc + atlasNumeroPlano(item.totalMetros), 0);
        const blocoEdicao = '';

        return `
            <html>
            <head>
                <title>Plano de Pedidos</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color:#000; margin:0; padding:0; background:#fff; }
                    .cabecalho { display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #E31C24; padding:6px 0 10px 0; margin-bottom:10px; }
                    .marca { font-weight:900; font-size:22px; letter-spacing:1px; }
                    .marca span { color:#E31C24; }
                    .titulo { text-align:center; font-weight:800; font-size:18px; }
                    .dados { text-align:right; font-size:11px; line-height:1.45; }
                    .edicao { border:1px solid #f59e0b; background:#fff7ed; padding:6px; font-size:10px; margin-bottom:8px; }
                    .grupo-tipo { page-break-inside:avoid; margin-bottom:14px; }
                    .grupo-tipo h2 { margin:8px 0 4px 0; text-align:center; font-size:18px; text-transform:uppercase; }
                    .grupo-esp { margin-bottom:12px; page-break-inside:avoid; }
                    .grupo-esp h3 { margin:0; text-align:center; border:2px solid #000; border-bottom:none; padding:5px; font-size:15px; background:#f2f2f2; }
                    .tabela-plano { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10px; }
                    .tabela-plano th, .tabela-plano td { border:1.5px solid #000; padding:5px 4px; text-align:center; vertical-align:middle; }
                    .tabela-plano th { background:#d9d9d9; font-size:10px; }
                    .tabela-plano td:first-child { text-align:center; width:18%; }
                    .pedido-mesclado { background:#f8fafc; font-size:11px; }
                    .tabela-plano td span { font-size:9px; }
                    .total-pedido td { background:#fff; font-weight:800; }
                    .total-esp td { background:#f2f2f2; font-weight:800; }
                    .total-geral { margin-top:10px; border:2px solid #000; padding:8px; text-align:center; font-size:18px; font-weight:900; }
                    .no-print { margin-top:16px; }
                    .no-print button { width:100%; padding:16px; border:0; border-radius:8px; background:#111827; color:#fff; font-size:16px; font-weight:800; }
                    @media print {
                        .no-print { display:none !important; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                <div class="cabecalho">
                    <div class="marca"><span>ATLAS</span> PAINEL</div>
                    <div class="titulo">PLANO DE PEDIDOS</div>
                    <div class="dados">
                        Data: <b>${atlasPlanoSeguro(rel.data || '')}</b><br>
                        Operador: <b>${atlasPlanoSeguro(rel.operador || '')}</b>
                    </div>
                </div>

                ${blocoEdicao}
                ${htmlGrupos || '<div style="text-align:center; padding:30px;">Nenhum pedido no plano.</div>'}

                <div class="total-geral">TOTAL GERAL DO PLANO: ${atlasFormatoMetroPlano(totalGeral)} m</div>

                ${comBotaoImpressao ? `
                    <div class="no-print">
                        <button onclick="window.print()">CONFIRMAR E GERAR PDF</button>
                    </div>
                ` : ''}
            </body>
            </html>
        `;
    };

    window.abrirGestaoPlanoHistorico = function(indexPlano) {
        if (!usuarioPodeEditarPlanoHistorico()) {
            alert('Apenas ADMIN ou SUPERVISOR podem gerir planos do historico.');
            return;
        }

        if (!document.getElementById('modal-plano-historico')) {
            const modal = document.createElement('div');
            modal.id = 'modal-plano-historico';
            modal.style = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:10000; padding:10px; overflow:auto;';
            document.body.appendChild(modal);
        }

        renderizarGestaoPlanoHistorico(indexPlano);
    };

    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const modal = document.getElementById('modal-plano-historico');
        if (!rel || !modal) return;

        const linhas = rel.itens || [];
        const total = linhas.reduce((acc, item) => acc + atlasNumeroPlano(item.totalMetros), 0);

        modal.innerHTML = `
            <div style="max-width:1180px; margin:0 auto; background:#020617; min-height:100%; border:1px solid #334155; border-radius:14px; padding:14px; color:white;">
                <div style="position:sticky; top:0; background:#020617; z-index:3; border-bottom:1px solid #334155; padding-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                        <div>
                            <h2 style="margin:0; font-size:20px;">Gerir Plano</h2>
                            <div style="color:#94a3b8; font-size:13px; margin-top:4px;">
                                ${atlasPlanoSeguro(rel.data || '')} | Total atual:
                                <b style="color:#10b981;">${atlasFormatoMetroPlano(total)} m</b>
                            </div>
                        </div>
                        <button onclick="fecharGestaoPlanoHistorico()" style="background:#475569; color:white; border:none; padding:12px 16px; border-radius:8px; font-weight:bold;">FECHAR</button>
                    </div>

                    <div style="display:grid; grid-template-columns:1.1fr 1fr 1fr 1fr .8fr .8fr .8fr; gap:8px; margin-top:12px;">
                        <input id="grid-add-pedido" placeholder="Pedido" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                        <input id="grid-add-destino" placeholder="Cliente" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                        <select id="grid-add-tipo" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${atlasOpcoesPlano(OPCOES_TIPO_PLANO, '')}</select>
                        <select id="grid-add-esp" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${atlasOpcoesPlano(OPCOES_ESPESSURA_PLANO, '', ' mm')}</select>
                        <input id="grid-add-qtd" type="number" inputmode="numeric" placeholder="Qtd" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                        <input id="grid-add-metros" type="number" inputmode="decimal" step="0.01" placeholder="Metro" style="padding:11px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                        <button onclick="adicionarLinhaPlanoExcel(${indexPlano})" style="background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold;">ADICIONAR</button>
                    </div>
                </div>

                <div style="overflow:auto; margin-top:14px; border:1px solid #334155; border-radius:10px;">
                    <table style="width:100%; min-width:980px; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#1e293b;">
                                <th style="padding:10px; border-bottom:1px solid #334155;">Pedido</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Cliente</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Tipo</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Esp.</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">RAL Inf.</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">RAL Sup.</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Qtd</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Metro</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Total</th>
                                <th style="padding:10px; border-bottom:1px solid #334155;">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhas.map((item, idx) => `
                                <tr style="background:${idx % 2 ? '#111827' : '#0f172a'};">
                                    <td style="padding:6px;"><input id="grid-${idx}-pedido" value="${atlasPlanoSeguro(item.pedidoNumero || '')}" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;"></td>
                                    <td style="padding:6px;"><input id="grid-${idx}-destino" value="${atlasPlanoSeguro(item.destino || '')}" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;"></td>
                                    <td style="padding:6px;"><select id="grid-${idx}-tipo" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;">${atlasOpcoesPlano(OPCOES_TIPO_PLANO, item.tipo)}</select></td>
                                    <td style="padding:6px;"><select id="grid-${idx}-esp" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;">${atlasOpcoesPlano(OPCOES_ESPESSURA_PLANO, item.espessura, ' mm')}</select></td>
                                    <td style="padding:6px;"><select id="grid-${idx}-ral-inf" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;">${atlasOpcoesPlano(OPCOES_RAL_INF, item.ralInferior)}</select></td>
                                    <td style="padding:6px;"><select id="grid-${idx}-ral-sup" style="width:100%; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;">${atlasOpcoesPlano(OPCOES_RAL_SUP, item.ralSuperior)}</select></td>
                                    <td style="padding:6px;"><input id="grid-${idx}-qtd" type="number" inputmode="numeric" value="${atlasPlanoSeguro(item.quantidadeChapas || 0)}" style="width:82px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;"></td>
                                    <td style="padding:6px;"><input id="grid-${idx}-metros" type="number" inputmode="decimal" step="0.01" value="${atlasPlanoSeguro(item.metrosUnidade || 0)}" style="width:95px; padding:9px; background:#020617; color:white; border:1px solid #334155; border-radius:7px;"></td>
                                    <td style="padding:6px; color:#10b981; font-weight:bold; text-align:center;">${atlasFormatoMetroPlano(item.totalMetros)} m</td>
                                    <td style="padding:6px;">
                                        <div style="display:flex; gap:6px;">
                                            <button onclick="salvarLinhaPlanoExcel(${indexPlano}, ${idx})" style="background:#3b82f6; color:white; border:none; padding:9px 10px; border-radius:7px; font-weight:bold;">SALVAR</button>
                                            <button onclick="excluirLinhaPlanoExcel(${indexPlano}, ${idx})" style="background:#7f1d1d; color:white; border:none; padding:9px 10px; border-radius:7px; font-weight:bold;">EXCLUIR</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    };

    window.salvarLinhaPlanoExcel = function(indexPlano, linha) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[linha];
        if (!rel || !item) return;

        const qtd = atlasNumeroPlano(document.getElementById(`grid-${linha}-qtd`)?.value);
        const metros = atlasNumeroPlano(document.getElementById(`grid-${linha}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');

        item.pedidoNumero = document.getElementById(`grid-${linha}-pedido`)?.value.trim() || item.pedidoNumero || '';
        item.destino = document.getElementById(`grid-${linha}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`grid-${linha}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`grid-${linha}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`grid-${linha}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`grid-${linha}-ral-sup`)?.value || item.ralSuperior;
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetrosAntesCancelamento = Number((qtd * metros).toFixed(2));
        item.totalMetros = item.encomendaCancelada ? 0 : item.totalMetrosAntesCancelamento;
        item.descricao = `${item.tipo} ${item.espessura} mm`;

        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha do plano ${item.pedidoNumero || 'stock'}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.excluirLinhaPlanoExcel = function(indexPlano, linha) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[linha];
        if (!rel || !item) return;
        if (!confirm(`Excluir esta linha?\n\n${item.pedidoNumero || 'STOCK'} - ${item.destino || item.qualidade || ''}`)) return;

        rel.itens.splice(linha, 1);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Removeu linha do plano ${item.pedidoNumero || 'stock'}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.adicionarLinhaPlanoExcel = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;

        const qtd = atlasNumeroPlano(document.getElementById('grid-add-qtd')?.value);
        const metros = atlasNumeroPlano(document.getElementById('grid-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos para adicionar.');

        const pedidoNumero = document.getElementById('grid-add-pedido')?.value.trim() || 'S/N';
        const destino = document.getElementById('grid-add-destino')?.value.trim() || '';
        const tipo = document.getElementById('grid-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('grid-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';

        rel.itens ||= [];
        rel.itens.push({
            id: Date.now() + '-' + Math.random().toString(16).slice(2),
            modo: 'pedido',
            pedidoNumero,
            destino,
            tipo,
            espessura,
            ralInferior: OPCOES_RAL_INF[0] || '',
            ralSuperior: OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            descricao: `${tipo} ${espessura} mm`
        });

        salvarPlanoHistoricoEditado(indexPlano, rel, `Adicionou linha ao plano ${pedidoNumero}`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };
})();

function gerarPDF_Injecao_Final(dadosEncoded) {
    const rel = JSON.parse(decodeURIComponent(dadosEncoded));
    const janela = window.open('', '_blank');
    if (!janela) return alert('O navegador bloqueou a abertura do PDF.');

    const seguro = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const itens = Array.isArray(rel.itens) ? rel.itens : [];
    const totalDia = itens.reduce((soma, item) => soma + (parseFloat(item.metros) || 0), 0);
    const quimicos = [
        ['MDI', 'mdi', '#9b2c2c', '#fff'],
        ['POL PUR', 'pol', '#d9ead3', '#000'],
        ['POL PIR', 'polpir', '#d9ead3', '#000'],
        ['CAT 1', 'cat1', '#f4cccc', '#000'],
        ['CAT 2', 'cat2', '#f4cccc', '#000'],
        ['CAT 3', 'cat3', '#f4cccc', '#000'],
        ['CAT 4', 'cat4', '#f4cccc', '#000'],
        ['PENT', 'pen', '#fff200', '#000']
    ];

    const textoPainelRal = item => {
        const nomeBase = item?.nome || '';
        const nome = nomeBase;
        const ral = item?.ral || item?.ralInferior || item?.ralSuperior || '';
        return ral ? `${nome} / ${ral}` : nome;
    };

    const camposProducao = (item, lado, pagina) => {
        const densidade = textoDensidadesInjecao(item?.densidades) || '';
        const data = lado === 'esquerda' ? rel.data || '' : '';
        const funcionario = lado === 'direita' ? rel.operador || '' : '';
        return `
            <div>
                <div class="campo"><span>${lado === 'esquerda' ? 'Data:' : 'Funcionario:'}</span><span class="linha">${seguro(lado === 'esquerda' ? data : funcionario)}</span></div>
                <div class="espaco-campos"></div>
                <div class="campo"><span>Fita Atlas:</span><span class="linha">${seguro(item?.fita || '')}</span></div>
                <div class="campo"><span>Esponja:</span><span class="linha">${seguro(item?.espuma || '')}</span></div>
                <div class="campo"><span>PIR:</span><span class="linha">${seguro(item?.pir ? 'SIM' : '')}</span></div>
                <div class="campo"><span>Velocidade:</span><span class="linha">${seguro(item?.vel || '')}</span></div>
                <div class="espaco-densidade"></div>
                <div class="campo"><span>Densidade:</span><span class="linha">${seguro(densidade)}</span></div>
                <div class="campo"><span>Densidade Real:</span><span class="linha"></span></div>
            </div>
        `;
    };

    const observacoesPagina = (par, paginaIndex) => {
        const linhas = [];
        par.forEach(item => {
            if (!item) return;
            (item.paragens || []).forEach(p => {
                linhas.push({ hora: p.tempo || '', texto: `${item.nome || ''} ${item.esp || ''} mm - ${p.motivo || ''}` });
            });
            (item.densidades || []).forEach(d => {
                if (d.horario) linhas.push({ hora: d.horario, texto: `Densidade: ${textoDensidadesInjecao([d])}` });
            });
        });
        while (linhas.length < 9) linhas.push({ hora: '', texto: '' });
        return linhas.slice(0, 9).map(linha => `
            <tr><td class="hora">${seguro(linha.hora)}</td><td>${seguro(linha.texto)}</td></tr>
        `).join('');
    };

    const montarPagina = (par, paginaIndex) => {
        const prodA = par[0] || {};
        const prodB = par[1] || {};
        const valorQuimicoPDF = valor => {
            const texto = String(valor ?? '').trim();
            if (!texto || texto === '0') return '--';
            return `${texto} kg`;
        };
        const linhasConsumo = quimicos.map(([nome, chave, cor, texto]) => {
            const valorA = prodA[chave] || '';
            const valorB = prodB[chave] || '';
            return `<tr><td class="quimico" style="background:${cor}; color:${texto};">${nome}</td><td colspan="2" class="valor-quimico">${seguro(valorQuimicoPDF(valorA))}</td><td colspan="2" class="valor-quimico">${seguro(valorQuimicoPDF(valorB))}</td></tr>`;
        }).join('');
        const metrosA = prodA.metros ? `${Number(prodA.metros || 0).toFixed(2)} m` : '';
        const metrosB = prodB.metros ? `${Number(prodB.metros || 0).toFixed(2)} m` : '';

        return `
            <section class="page">
                <div class="topo">
                    <div class="logo-css">
                        <div class="logo-bars"><span></span><span></span></div>
                        <div><div class="atlas-word">ATLAS</div><div class="painel-word">PAINEL</div></div>
                    </div>
                    <div class="titulo">Gest&atilde;o de Produ&ccedil;&atilde;o Di&aacute;ria - Inje&ccedil;&atilde;o</div>
                </div>

                <div class="campos-duplos">
                    ${camposProducao(prodA, 'esquerda', paginaIndex)}
                    ${camposProducao(prodB, 'direita', paginaIndex)}
                </div>

                <table class="consumos">
                    <caption>Consumos Parciais</caption>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Tipo de Painel / Ral</th>
                            <th>Espessura</th>
                            <th>Tipo de Painel / Ral</th>
                            <th>Espessura</th>
                        </tr>
                        <tr>
                            <th></th>
                            <td class="${prodA.pir ? 'pir-produto' : ''}">${prodA.pir ? '<b>PIR</b><br>' : ''}${seguro(textoPainelRal(prodA))}</td>
                            <td class="${prodA.pir ? 'pir-produto' : ''}">${seguro(prodA.esp ? prodA.esp + ' mm' : '')}</td>
                            <td class="${prodB.pir ? 'pir-produto' : ''}">${prodB.pir ? '<b>PIR</b><br>' : ''}${seguro(textoPainelRal(prodB))}</td>
                            <td class="${prodB.pir ? 'pir-produto' : ''}">${seguro(prodB.esp ? prodB.esp + ' mm' : '')}</td>
                        </tr>
                    </thead>
                    <tbody>${linhasConsumo}</tbody>
                </table>

                <table class="dados">
                    <thead><tr><th colspan="3">Dados Inje&ccedil;&atilde;o Parciais</th></tr></thead>
                    <tbody>
                        <tr><th>Comprimento</th><td>${metrosA}</td><td>${metrosB}</td></tr>
                        <tr><th>Metros totais do dia</th><td colspan="2" class="total-dia-pdf">${totalDia.toFixed(2)} m</td></tr>
                    </tbody>
                </table>

                <table class="observacoes">
                    <thead><tr><th class="hora">Hora</th><th>Observa&ccedil;&otilde;es: (arranque, paragem uni&atilde;o rebentou, valor incorreto, etc)</th></tr></thead>
                    <tbody>${observacoesPagina(par, paginaIndex)}</tbody>
                </table>
            </section>
        `;
    };

    const paginas = [];
    for (let i = 0; i < Math.max(itens.length, 1); i += 2) {
        paginas.push(montarPagina([itens[i], itens[i + 1]], i / 2));
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Gestao de Producao Diaria - Injecao</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; background: #d1d5db; font-family: Arial, Helvetica, sans-serif; color: #000; }
                .page {
                    width: 210mm;
                    height: 297mm;
                    overflow: hidden;
                    margin: 0 auto 10mm;
                    background: #fff;
                    padding: 17mm 21mm 10mm;
                    page-break-after: always;
                }
                .page:last-of-type { page-break-after: auto; }
                .topo { display: flex; align-items: flex-end; gap: 16mm; margin-bottom: 11mm; }
                .logo-css { width: 58mm; display:flex; align-items:center; gap:2.2mm; }
                .logo-bars { width:14mm; display:grid; gap:2mm; transform:skewX(-14deg); }
                .logo-bars span { display:block; height:4.2mm; background:#e31c24; }
                .atlas-word { font-family: Arial Black, Arial, sans-serif; font-size: 32px; line-height:.78; letter-spacing:-1px; color:#111; }
                .painel-word { font-size: 10px; letter-spacing: 7px; font-weight: 800; margin-left: 4px; margin-top: 4px; }
                .titulo { font-size: 21px; font-weight: 800; text-align: center; flex: 1; margin-bottom: 3mm; }
                .campos-duplos { display: grid; grid-template-columns: 1fr 1fr; gap: 23mm; margin-bottom: 7mm; }
                .campo { display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 4px; margin-bottom: 2.1mm; font-size: 12px; font-weight: 700; }
                .linha { border-bottom: 2px solid #111; min-height: 15px; padding-left: 3px; }
                .espaco-campos { height: 6mm; }
                .espaco-densidade { height: 7mm; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 2px solid #111; padding: 2px 5px; height: 18px; }
                th { font-weight: 800; text-align: center; }
                .consumos { width: 78%; margin: 4mm auto 8mm; }
                .consumos caption { caption-side: top; border: 2px solid #111; border-bottom: 0; padding: 5px; font-weight: 800; }
                .quimico { width: 29mm; text-align: center; font-weight: 800; }
                .pir-produto { background:#fef08a !important; color:#991b1b !important; border:2px solid #991b1b !important; font-weight:900 !important; text-align:center; }
                .pir-produto b { font-size:14px; }
                .valor-quimico { text-align: center; font-weight: 700; }
                .dados { width: 58%; margin: 0 auto 4mm; }
                .dados th { background: #f5f5f5; }
                .total-dia-pdf { text-align: center; font-weight: 900; font-size: 13px; }
                .observacoes { margin-top: 4mm; }
                .observacoes .hora { width: 27mm; }
                .no-print { text-align: center; padding: 15px; background: #111827; position: sticky; bottom: 0; }
                .no-print button { padding: 14px 20px; background: #111; color: #fff; border: 3px solid #E31C24; border-radius: 10px; font-weight: 800; cursor: pointer; }
                @media print {
                    body { background: #fff; }
                    .page { margin: 0; width: 210mm; height: 297mm; padding: 17mm 21mm 10mm; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            ${paginas.join('')}
            <div class="no-print"><button onclick="window.print()">CONFIRMAR E GERAR PDF</button></div>
        </body>
        </html>
    `);
    janela.document.close();
    setTimeout(() => janela.focus(), 300);
}

/* ==========================================================
   LEMBRETES, AUDITORIA, PESQUISA GERAL E VALIDACOES
   ========================================================== */

(function() {
    if (window.atlasMelhoriasOperacionaisAtivas) return;
    window.atlasMelhoriasOperacionaisAtivas = true;

    const AUDITORIA_KEY = 'atlas_auditoria';

    function atlasTextoAuditoria(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasPodeVerAdminSupervisor() {
        return usuarioEhAdminSupervisor();
    }

    function atlasRegistrarAuditoria(acao, modulo, detalhes = '') {
        try {
            const lista = JSON.parse(localStorage.getItem(AUDITORIA_KEY)) || [];
            lista.unshift({
                id: Date.now(),
                usuario: usuarioLogado?.id || document.getElementById('user-display')?.innerText || 'SISTEMA',
                cargo: usuarioLogado?.cargo || '',
                modulo,
                acao,
                detalhes,
                dataHora: new Date().toLocaleString('pt-BR')
            });
            localStorage.setItem(AUDITORIA_KEY, JSON.stringify(lista.slice(0, 500)));
        } catch (erro) {
            console.warn('Nao foi possivel registrar auditoria.', erro);
        }
    }

    window.atlasRegistrarAuditoria = atlasRegistrarAuditoria;

    function atlasGarantirModuloOperacional(chave, nome, icone, onclick) {
        if (!MODULOS_SISTEMA.some(m => m.chave === chave)) {
            MODULOS_SISTEMA.push({ chave, nome });
        }

        const grid = document.getElementById('grid-home');
        const id = `card-${chave}-atlas`;
        if (!grid || document.getElementById(id)) return;

        const card = document.createElement('div');
        card.id = id;
        card.className = 'card';
        card.setAttribute('onclick', onclick || `abrirModulo('${chave}')`);
        card.innerHTML = `<i class="${icone}"></i><span>${nome}</span>`;
        grid.appendChild(card);
    }

    function atlasContarPor(lista, campo) {
        return (lista || []).reduce((acc, item) => {
            const chave = String(item?.[campo] || 'Sem informacao');
            acc[chave] = (acc[chave] || 0) + Number(item.qtd || 1);
            return acc;
        }, {});
    }

    const ATLAS_SECOES_RELATORIO = [
        { chave: 'injecao', nome: 'Injecao' },
        { chave: 'bobines', nome: 'Bobines' },
        { chave: 'serra', nome: 'Serra' },
        { chave: 'embalagem', nome: 'Embalagem' }
    ];

    function atlasDataISOHoje() {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    }

    function atlasDataBRParaISO(data) {
        const partes = String(data || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!partes) return '';
        return `${partes[3]}-${String(partes[2]).padStart(2, '0')}-${String(partes[1]).padStart(2, '0')}`;
    }

    function atlasDataISOParaBR(dataISO) {
        const partes = String(dataISO || '').split('-');
        if (partes.length !== 3) return dataISO || '';
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function atlasTemRelatorioHoje(secao, dataISO = atlasDataISOHoje()) {
        if (secao === 'injecao') {
            const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
            return Object.values(db).some(meses => Object.values(meses || {}).some(lista => (lista || []).some(rel => rel.modulo === 'injecao' && atlasDataBRParaISO(rel.data) === dataISO)));
        }
        if (secao === 'bobines') return (JSON.parse(localStorage.getItem('historicoBobines')) || []).some(rel => atlasDataBRParaISO(rel.data) === dataISO);
        if (secao === 'serra') return (JSON.parse(localStorage.getItem('atlas_serra_hist')) || []).some(rel => atlasDataBRParaISO(rel.data) === dataISO);
        if (secao === 'embalagem') return (JSON.parse(localStorage.getItem('atlas_emb_hist')) || []).some(rel => atlasDataBRParaISO(rel.data) === dataISO);
        return false;
    }

    function atlasDatasRelatoriosPorSecao() {
        const datas = {};
        ATLAS_SECOES_RELATORIO.forEach(secao => datas[secao.chave] = new Set());

        const adicionar = (secao, data) => {
            const iso = atlasDataBRParaISO(data);
            if (iso) datas[secao]?.add(iso);
        };

        const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
        Object.values(db).forEach(meses => {
            Object.values(meses || {}).forEach(lista => {
                (lista || []).forEach(rel => {
                    if (rel.modulo === 'injecao') adicionar('injecao', rel.data);
                });
            });
        });

        (JSON.parse(localStorage.getItem('historicoBobines')) || []).forEach(rel => adicionar('bobines', rel.data));
        (JSON.parse(localStorage.getItem('atlas_serra_hist')) || []).forEach(rel => adicionar('serra', rel.data));
        (JSON.parse(localStorage.getItem('atlas_emb_hist')) || []).forEach(rel => adicionar('embalagem', rel.data));

        return datas;
    }

    function atlasLembretesRelatoriosPendentes() {
        const porSecao = atlasDatasRelatoriosPorSecao();
        const todasDatas = [...new Set(Object.values(porSecao).flatMap(set => [...set]))]
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 10);

        const lembretes = [];

        todasDatas.forEach(dataISO => {
            const faltasDia = ATLAS_SECOES_RELATORIO
                .filter(secao => !porSecao[secao.chave]?.has(dataISO))
                .map(secao => secao.nome);

            if (faltasDia.length && faltasDia.length < ATLAS_SECOES_RELATORIO.length) {
                lembretes.push({
                    nivel: 'aviso',
                    titulo: `Relatorios pendentes - ${atlasDataISOParaBR(dataISO)}`,
                    detalhe: `Ainda falta enviar: ${faltasDia.join(', ')}.`
                });
            }
        });

        return lembretes;
    }

    function atlasLembretesAutomaticos() {
        const lembretes = [];
        const bobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
        const filmes = JSON.parse(localStorage.getItem('atlas_stock_filmes')) || [];
        const conferencias = JSON.parse(localStorage.getItem('atlas_conferencia_serra')) || [];
        const minimos = typeof window.atlasObterConfigMinimoStock === 'function'
            ? window.atlasObterConfigMinimoStock()
            : atlasObterConfigMinimoStock();

        Object.entries(contarBobinasPorChapaRalStock(bobinas.filter(b => b.status !== 'acabada_mes'))).forEach(([chapaRal, qtd]) => {
            if (qtd < minimos.bobinas) lembretes.push({ nivel: 'critico', titulo: `Bobinas baixas - ${chapaRal}`, detalhe: `${qtd} unidade(s) disponiveis para este tipo de chapa/RAL. Minimo: ${minimos.bobinas}.` });
        });

        Object.entries(atlasContarPor(filmes, 'tipo')).forEach(([tipo, qtd]) => {
            if (qtd < minimos.filmes) lembretes.push({ nivel: 'critico', titulo: `Filme baixo - ${tipo}`, detalhe: `${qtd} unidade(s) disponiveis. Minimo: ${minimos.filmes}.` });
        });

        const conferenciaAbertas = conferencias.filter(p => p.status !== 'finalizado');
        const conferenciaPendentes = conferenciaAbertas.filter(p => p.status !== 'stand_by');
        const conferenciaStandBy = conferenciaAbertas.filter(p => p.status === 'stand_by');

        const conferenciaPorData = conferenciaPendentes.reduce((acc, pedido) => {
            const data = pedido.data || new Date().toLocaleDateString('pt-BR');
            acc[data] ||= [];
            acc[data].push(pedido.pedidoNumero || 'S/N');
            return acc;
        }, {});

        Object.keys(conferenciaPorData).sort((a, b) => atlasDataBRParaISO(b).localeCompare(atlasDataBRParaISO(a))).forEach(data => {
            const pedidos = [...new Set(conferenciaPorData[data].map(String))].join(', ');
            lembretes.push({
                nivel: 'aviso',
                titulo: `Conferencia pendente - ${data}`,
                detalhe: `Falta conferir os pedidos: ${pedidos}.`
            });
        });

        conferenciaStandBy
            .slice(0, 20)
            .forEach(p => {
                const motivos = (p.unidades || [])
                    .filter(u => u.status === 'nao_ok' || u.status === 'nao')
                    .map(u => u.motivo)
                    .filter(Boolean)
                    .join(' + ');
                lembretes.push({
                    nivel: 'aviso',
                    titulo: `Pedido ${p.pedidoNumero || 'S/N'} em stand by`,
                    detalhe: motivos || 'Conferencia com problema pendente.'
                });
            });

        return [...lembretes, ...atlasLembretesRelatoriosPendentes()];
    }

    window.atlasLembretesAutomaticos = atlasLembretesAutomaticos;

    function renderizarLembretesAtlas() {
        const render = document.getElementById('render-modulo');
        if (!render) return;

        const lembretes = atlasLembretesAutomaticos();
        const cor = nivel => nivel === 'critico' ? '#ef4444' : '#f59e0b';

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:15px;">
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px;">
                        <div style="color:#94a3b8; font-size:12px;">Lembretes ativos</div>
                        <strong style="font-size:28px; color:${lembretes.length ? '#f59e0b' : '#10b981'};">${lembretes.length}</strong>
                    </div>
                    <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px;">
                        <div style="color:#94a3b8; font-size:12px;">Criticos</div>
                        <strong style="font-size:28px; color:#ef4444;">${lembretes.filter(l => l.nivel === 'critico').length}</strong>
                    </div>
                </div>
                ${lembretes.length ? lembretes.map(l => `
                    <div style="background:#111827; border:1px solid #334155; border-left:5px solid ${cor(l.nivel)}; border-radius:10px; padding:13px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                            <b>${atlasTextoAuditoria(l.titulo)}</b>
                            <span style="color:${cor(l.nivel)}; font-weight:bold; text-transform:uppercase;">${l.nivel}</span>
                        </div>
                        <div style="color:#cbd5e1; font-size:13px; margin-top:6px;">${atlasTextoAuditoria(l.detalhe)}</div>
                    </div>
                `).join('') : `
                    <div style="background:#052e16; border:1px solid #10b981; border-radius:12px; padding:18px; text-align:center; color:#bbf7d0;">
                        Nenhum lembrete importante agora.
                    </div>
                `}
            </div>
        `;
    }

    window.atlasMostrarLembretesPrimeiroAcessoDia = function() {
        if (!atlasPodeVerAdminSupervisor() || !usuarioPodeVerModulo('lembretes')) return;

        const lembretes = atlasLembretesAutomaticos();
        if (!lembretes.length) return;

        const usuario = String(usuarioLogado?.id || 'usuario').toLowerCase();
        const chave = `atlas_lembretes_primeiro_acesso_${usuario}_${atlasDataISOHoje()}`;
        if (localStorage.getItem(chave)) return;
        localStorage.setItem(chave, new Date().toISOString());

        document.getElementById('modal-lembretes-primeiro-acesso')?.remove();

        const criticos = lembretes.filter(l => l.nivel === 'critico').length;
        const modal = document.createElement('div');
        modal.id = 'modal-lembretes-primeiro-acesso';
        modal.style = 'position:fixed; inset:0; z-index:10001; background:rgba(2,6,23,.82); display:flex; align-items:center; justify-content:center; padding:16px;';
        modal.innerHTML = `
            <div style="width:100%; max-width:560px; background:#0f172a; border:1px solid #334155; border-radius:14px; color:white; box-shadow:0 20px 70px rgba(0,0,0,.45); overflow:hidden;">
                <div style="padding:18px; border-bottom:1px solid #334155; background:#1e293b;">
                    <div style="color:#93c5fd; font-size:13px; font-weight:bold; text-transform:uppercase;">Primeiro acesso do dia</div>
                    <h2 style="margin:6px 0 0; font-size:22px;">Voce tem ${lembretes.length} lembrete(s)</h2>
                    <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">${criticos ? `${criticos} critico(s) precisam de atencao.` : 'Nada critico, apenas avisos importantes.'}</p>
                </div>
                <div style="padding:14px; display:flex; flex-direction:column; gap:8px; max-height:52vh; overflow:auto;">
                    ${lembretes.slice(0, 6).map(l => `
                        <div style="border:1px solid #334155; border-left:5px solid ${l.nivel === 'critico' ? '#ef4444' : '#f59e0b'}; border-radius:10px; padding:10px; background:#111827;">
                            <b>${atlasTextoAuditoria(l.titulo)}</b>
                            <div style="color:#cbd5e1; font-size:13px; margin-top:4px;">${atlasTextoAuditoria(l.detalhe)}</div>
                        </div>
                    `).join('')}
                    ${lembretes.length > 6 ? `<div style="color:#94a3b8; font-size:13px; text-align:center;">Mais ${lembretes.length - 6} lembrete(s) na tela de Lembretes.</div>` : ''}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:14px; border-top:1px solid #334155;">
                    <button id="btn-ver-lembretes-dia" style="background:#3b82f6; color:white; border:none; border-radius:9px; padding:13px; font-weight:bold;">VER LEMBRETES</button>
                    <button id="btn-fechar-lembretes-dia" style="background:#64748b; color:white; border:none; border-radius:9px; padding:13px; font-weight:bold;">FECHAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('btn-fechar-lembretes-dia')?.addEventListener('click', () => modal.remove());
        document.getElementById('btn-ver-lembretes-dia')?.addEventListener('click', () => {
            modal.remove();
            abrirModulo('lembretes');
        });
    };

    function atlasDataRegistro(item) {
        const texto = String(item?.dataHora || '');
        const partes = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!partes) {
            const hoje = new Date();
            return {
                ano: String(hoje.getFullYear()),
                mes: String(hoje.getMonth() + 1).padStart(2, '0'),
                dia: String(hoje.getDate()).padStart(2, '0'),
                data: hoje.toLocaleDateString('pt-BR')
            };
        }

        return {
            ano: partes[3],
            mes: String(partes[2]).padStart(2, '0'),
            dia: String(partes[1]).padStart(2, '0'),
            data: `${String(partes[1]).padStart(2, '0')}/${String(partes[2]).padStart(2, '0')}/${partes[3]}`
        };
    }

    function atlasAgruparRegistros(lista) {
        return lista.reduce((acc, item) => {
            const data = atlasDataRegistro(item);
            const secao = item.modulo || 'Sistema';
            acc[data.ano] ||= {};
            acc[data.ano][data.mes] ||= {};
            acc[data.ano][data.mes][data.dia] ||= { data: data.data, secoes: {} };
            acc[data.ano][data.mes][data.dia].secoes[secao] ||= [];
            acc[data.ano][data.mes][data.dia].secoes[secao].push(item);
            return acc;
        }, {});
    }

    function atlasMesNome(numero) {
        const nomes = ["", "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return nomes[Number(numero)] || numero;
    }

    function atlasRegistrosFiltrados(termo = '') {
        const busca = String(termo || '').toLowerCase();
        return (JSON.parse(localStorage.getItem(AUDITORIA_KEY)) || [])
            .map((item, index) => ({ ...item, __atlasIndex: index }))
            .filter(item => !busca || JSON.stringify(item).toLowerCase().includes(busca));
    }

    function renderizarAuditoriaAtlas() {
        const render = document.getElementById('render-modulo');
        if (!render) return;

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px; margin-bottom:15px;">
                    <div style="display:grid; grid-template-columns:1fr auto ${usuarioEhAdmin() ? 'auto' : ''}; gap:8px;">
                        <input id="auditoria-busca" oninput="renderizarAuditoriaFiltradaAtlas(this.value)" onkeydown="if(event.key === 'Enter') renderizarAuditoriaFiltradaAtlas(this.value)" placeholder="Pesquisar por usuario, secao, acao ou data"
                            style="width:100%; padding:14px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">
                        <button onclick="renderizarAuditoriaFiltradaAtlas(document.getElementById('auditoria-busca')?.value || '')" style="background:#3b82f6; color:white; border:none; padding:0 16px; border-radius:8px; font-weight:bold;">
                            BUSCAR
                        </button>
                        ${usuarioEhAdmin() ? `
                            <button onclick="atlasApagarTodosRegistros()" style="background:#7f1d1d; color:white; border:none; padding:0 16px; border-radius:8px; font-weight:bold;">
                                APAGAR TODOS OS REGISTROS
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div id="auditoria-lista"></div>
            </div>
        `;
        renderizarAuditoriaFiltradaAtlas('');
    }

    window.atlasApagarTodosRegistros = function() {
        if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode apagar registros.');
        const total = (JSON.parse(localStorage.getItem(AUDITORIA_KEY)) || []).length;
        if (!total) return alert('Nao existem registros para apagar.');
        if (!confirm(`Apagar todos os ${total} registros? Esta acao nao pode ser desfeita.`)) return;
        localStorage.setItem(AUDITORIA_KEY, JSON.stringify([]));
        renderizarAuditoriaAtlas();
        alert('Registros apagados.');
    };

    window.atlasApagarRegistrosDia = function(ano, mes, dia) {
        if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode apagar registros.');
        const dataAlvo = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
        const lista = JSON.parse(localStorage.getItem(AUDITORIA_KEY)) || [];
        const restante = lista.filter(item => atlasDataRegistro(item).data !== dataAlvo);
        const total = lista.length - restante.length;
        if (!total) return alert('Nao existem registros neste dia.');
        if (!confirm(`Apagar ${total} registro(s) do dia ${dataAlvo}?`)) return;
        localStorage.setItem(AUDITORIA_KEY, JSON.stringify(restante));
        renderizarAuditoriaFiltradaAtlas(document.getElementById('auditoria-busca')?.value || '');
        alert('Registros do dia apagados.');
    };

    window.atlasApagarRegistroItem = function(indexOriginal) {
        if (!usuarioEhAdmin()) return alert('Apenas ADMIN pode apagar registros.');
        const lista = JSON.parse(localStorage.getItem(AUDITORIA_KEY)) || [];
        const index = Number(indexOriginal);
        const item = lista[index];
        if (!item) return alert('Registro nao encontrado.');
        if (!confirm(`Apagar este registro?\n\n${item.acao || ''}\n${item.dataHora || ''}`)) return;
        lista.splice(index, 1);
        localStorage.setItem(AUDITORIA_KEY, JSON.stringify(lista));
        renderizarAuditoriaFiltradaAtlas(document.getElementById('auditoria-busca')?.value || '');
    };

    window.renderizarAuditoriaFiltradaAtlas = function(termo) {
        const alvo = document.getElementById('auditoria-lista');
        if (!alvo) return;
        const lista = atlasRegistrosFiltrados(termo);
        const grupos = atlasAgruparRegistros(lista);
        const expandir = String(termo || '').trim().length > 0;

        if (!lista.length) {
            alvo.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px;">Nenhum registro encontrado.</div>`;
            return;
        }

        let html = '';

        Object.keys(grupos).sort((a, b) => b.localeCompare(a)).forEach(ano => {
            html += `
                <div style="margin-bottom:10px;">
                    <div onclick="togglePlanoElemento('reg-ano-${ano}')" style="background:#1e293b; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; border:1px solid #334155; display:flex; justify-content:space-between;">
                        <span>ANO ${ano}</span><span>${Object.values(grupos[ano]).reduce((acc, meses) => acc + Object.keys(meses).length, 0)} dia(s)</span>
                    </div>
                    <div id="reg-ano-${ano}" style="display:${expandir ? 'block' : 'none'}; padding-left:10px; margin-top:6px; border-left:2px solid #3b82f6;">
            `;

            Object.keys(grupos[ano]).sort((a, b) => Number(b) - Number(a)).forEach(mes => {
                html += `
                    <div onclick="togglePlanoElemento('reg-mes-${ano}-${mes}')" style="cursor:pointer; padding:10px; color:#60a5fa; background:#0f172a; margin-top:6px; border-radius:6px; font-weight:bold;">
                        ${atlasMesNome(mes)}
                    </div>
                    <div id="reg-mes-${ano}-${mes}" style="display:${expandir ? 'block' : 'none'}; padding-left:10px;">
                `;

                Object.keys(grupos[ano][mes]).sort((a, b) => Number(b) - Number(a)).forEach(dia => {
                    const grupoDia = grupos[ano][mes][dia];
                    const diaId = `reg-dia-${ano}-${mes}-${dia}`;
                    const totalDia = Object.values(grupoDia.secoes).reduce((acc, itens) => acc + itens.length, 0);

                    html += `
                        <div style="background:#111827; border:1px solid #334155; border-radius:10px; margin-top:8px; overflow:hidden;">
                            <div style="padding:12px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
                                <div onclick="togglePlanoElemento('${diaId}')" style="cursor:pointer; flex:1; min-width:220px;">
                                    <b>DIA ${grupoDia.data}</b>
                                </div>
                                ${usuarioEhAdmin() ? `
                                    <button onclick="atlasApagarRegistrosDia('${ano}','${mes}','${dia}')" style="background:#7f1d1d; color:white; border:none; padding:8px 10px; border-radius:8px; font-weight:bold;">
                                        APAGAR DIA
                                    </button>
                                ` : ''}
                                <span style="color:#f59e0b; font-weight:bold;">${totalDia} modificacao(oes)</span>
                            </div>
                            <div onclick="togglePlanoElemento('${diaId}')" style="cursor:pointer; padding:0 12px 10px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
                                <small style="color:#94a3b8;">Clique aqui para abrir os itens do dia</small>
                            </div>
                            <div style="display:grid; grid-template-columns:${usuarioEhAdmin() ? '1fr 1fr' : '1fr'}; gap:8px; padding:0 12px 12px;">
                                <button onclick="gerarRelatorioRegistrosDiaAtlas('${ano}','${mes}','${dia}')" style="width:100%; background:#10b981; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                                    RELATORIO DO DIA
                                </button>
                                ${usuarioEhAdmin() ? `
                                    <button onclick="atlasApagarRegistrosDia('${ano}','${mes}','${dia}')" style="width:100%; background:#7f1d1d; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">
                                        APAGAR DIA
                                    </button>
                                ` : ''}
                            </div>
                            <div id="${diaId}" style="display:${expandir ? 'block' : 'none'}; border-top:1px solid #334155;">
                    `;

                    Object.keys(grupoDia.secoes).sort().forEach(secao => {
                        html += `
                            <div style="padding:12px; border-bottom:1px solid #1f2937;">
                                <div style="color:#60a5fa; font-weight:bold; margin-bottom:8px; text-transform:uppercase;">${atlasTextoAuditoria(secao)}</div>
                                ${grupoDia.secoes[secao].map(item => `
                                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                                        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                                            <b>${atlasTextoAuditoria(item.acao)}</b>
                                            <span style="color:#94a3b8; font-size:12px;">${atlasTextoAuditoria(item.dataHora)}</span>
                                        </div>
                                        <div style="color:#cbd5e1; font-size:13px; margin-top:5px;">
                                            Usuario: <b>${atlasTextoAuditoria(item.usuario)}</b><br>
                                            ${atlasTextoAuditoria(item.detalhes)}
                                        </div>
                                        ${usuarioEhAdmin() ? `
                                            <button onclick="atlasApagarRegistroItem(${Number(item.__atlasIndex)})" style="width:100%; margin-top:8px; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:8px; font-weight:bold;">
                                                APAGAR ITEM
                                            </button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    });

                    html += `</div></div>`;
                });

                html += `</div>`;
            });

            html += `</div></div>`;
        });

        alvo.innerHTML = html;
    };

    window.gerarRelatorioRegistrosDiaAtlas = function(ano, mes, dia) {
        const dataAlvo = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
        const lista = atlasRegistrosFiltrados(document.getElementById('auditoria-busca')?.value || '')
            .filter(item => atlasDataRegistro(item).data === dataAlvo);

        const grupos = lista.reduce((acc, item) => {
            const secao = item.modulo || 'Sistema';
            acc[secao] ||= [];
            acc[secao].push(item);
            return acc;
        }, {});

        const janela = window.open('', '_blank');
        janela.document.write(`
            <html>
            <head>
                <title>Registros ${dataAlvo}</title>
                <style>
                    body { font-family: Arial, sans-serif; color:#111; padding:24px; }
                    h1 { margin:0 0 4px; }
                    h2 { margin-top:24px; border-bottom:2px solid #111; padding-bottom:6px; }
                    table { width:100%; border-collapse:collapse; margin-top:10px; font-size:12px; }
                    th, td { border:1px solid #333; padding:8px; text-align:left; vertical-align:top; }
                    th { background:#eee; }
                    .meta { color:#555; margin-bottom:18px; }
                    @media print { button { display:none; } }
                </style>
            </head>
            <body>
                <button onclick="window.print()" style="padding:10px 14px; margin-bottom:16px;">IMPRIMIR / SALVAR PDF</button>
                <h1>Registros do dia</h1>
                <div class="meta">Data: ${atlasTextoAuditoria(dataAlvo)} | Total: ${lista.length} modificacao(oes)</div>
                ${Object.keys(grupos).sort().map(secao => `
                    <h2>${atlasTextoAuditoria(secao)}</h2>
                    <table>
                        <thead><tr><th>Hora</th><th>Usuario</th><th>Acao</th><th>Detalhes</th></tr></thead>
                        <tbody>
                            ${grupos[secao].map(item => `
                                <tr>
                                    <td>${atlasTextoAuditoria(item.dataHora)}</td>
                                    <td>${atlasTextoAuditoria(item.usuario)}</td>
                                    <td>${atlasTextoAuditoria(item.acao)}</td>
                                    <td>${atlasTextoAuditoria(item.detalhes)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `).join('')}
            </body>
            </html>
        `);
        janela.document.close();
    };

    const aplicarPreferenciasOriginalLembretes = window.aplicarPreferenciasVisuaisUsuario;
    window.aplicarPreferenciasVisuaisUsuario = function() {
        if (typeof aplicarPreferenciasOriginalLembretes === 'function') aplicarPreferenciasOriginalLembretes();
        atlasGarantirModuloOperacional('lembretes', 'Lembretes', 'fas fa-bell', "abrirModulo('lembretes')");
        atlasGarantirModuloOperacional('auditoria', 'Registros', 'fas fa-list-check', "abrirModulo('auditoria')");

        const cardLembretes = document.getElementById('card-lembretes-atlas');
        const cardAuditoria = document.getElementById('card-auditoria-atlas');
        if (cardLembretes) cardLembretes.style.display = atlasPodeVerAdminSupervisor() && usuarioPodeVerModulo('lembretes') ? '' : 'none';
        if (cardAuditoria) cardAuditoria.style.display = atlasPodeVerAdminSupervisor() && usuarioPodeVerModulo('auditoria') ? '' : 'none';
    };

    const abrirModuloOriginalOperacional = window.abrirModulo;
    window.abrirModulo = function(nome) {
        if (nome === 'lembretes') {
            if (!atlasPodeVerAdminSupervisor() || !usuarioPodeVerModulo('lembretes')) return alert('Sem permissao para ver lembretes.');
            document.getElementById('grid-home').style.display = 'none';
            document.getElementById('conteudo-modulo').style.display = 'block';
            document.getElementById('titulo-modulo').innerText = 'LEMBRETES';
            renderizarLembretesAtlas();
            return;
        }

        if (nome === 'auditoria') {
            if (!atlasPodeVerAdminSupervisor() || !usuarioPodeVerModulo('auditoria')) return alert('Sem permissao para ver registros.');
            document.getElementById('grid-home').style.display = 'none';
            document.getElementById('conteudo-modulo').style.display = 'block';
            document.getElementById('titulo-modulo').innerText = 'REGISTROS';
            renderizarAuditoriaAtlas();
            return;
        }

        abrirModuloOriginalOperacional(nome);
    };

    function atlasValidarItensBasicos(lista, modulo) {
        const ruins = (lista || []).filter(item => {
            if (modulo === 'bobines') {
                if (item.tipo === 'filme') return !item.subtipo || !Number(item.qtd || 0);
                return !item.numBobine || !item.ral;
            }
            if (modulo === 'injecao') return !item.nome || !item.esp || !Number(item.metros || 0);
            return !item.tipo || !item.esp || !Number(item.metros || 0) || !item.ralI || !item.ralS;
        });
        return ruins.length === 0;
    }

    function atlasConfirmarValidacao(lista, modulo) {
        if (atlasValidarItensBasicos(lista, modulo)) return true;
        return confirm('Existem itens com informacoes incompletas. Deseja finalizar mesmo assim?');
    }

    const finalizarTurnoOriginalLembretes = window.finalizarTurno;
    if (typeof finalizarTurnoOriginalLembretes === 'function') {
        window.finalizarTurno = function(modulo) {
            const itens = window.producoesDoDia || producoesDoDia || [];
            if (!atlasConfirmarValidacao(itens, 'injecao')) return;
            atlasRegistrarAuditoria('Finalizou relatorio', 'injecao', `Modulo: ${modulo}`);
            return finalizarTurnoOriginalLembretes.apply(this, arguments);
        };
    }

    const fecharDiaBobinesOriginalLembretes = window.fecharDia;
    if (typeof fecharDiaBobinesOriginalLembretes === 'function') {
        window.fecharDia = function() {
            const itens = window.lancamentosTemporarios || lancamentosTemporarios || [];
            if (!atlasConfirmarValidacao(itens, 'bobines')) return;
            atlasRegistrarAuditoria('Finalizou relatorio', 'bobines', 'Fechou dia de bobines');
            return fecharDiaBobinesOriginalLembretes.apply(this, arguments);
        };
    }

    const fecharDiaSerraOriginalLembretes = window.fecharDiaSerra;
    if (typeof fecharDiaSerraOriginalLembretes === 'function') {
        window.fecharDiaSerra = function() {
            const itens = window.db_serra_live || db_serra_live || [];
            if (!atlasConfirmarValidacao(itens, 'serra')) return;
            atlasRegistrarAuditoria('Finalizou relatorio', 'serra', 'Fechou dia da serra');
            return fecharDiaSerraOriginalLembretes.apply(this, arguments);
        };
    }

    const fecharDiaEmbalagemOriginalLembretes = window.fecharDiaEmbalagem;
    if (typeof fecharDiaEmbalagemOriginalLembretes === 'function') {
        window.fecharDiaEmbalagem = function() {
            const itens = window.db_emb_live || db_emb_live || [];
            if (!atlasConfirmarValidacao(itens, 'embalagem')) return;
            atlasRegistrarAuditoria('Finalizou relatorio', 'embalagem', 'Fechou dia da embalagem');
            return fecharDiaEmbalagemOriginalLembretes.apply(this, arguments);
        };
    }

    const salvarPermissoesAdminOriginalAuditoria = window.salvarPermissoesAdmin;
    if (typeof salvarPermissoesAdminOriginalAuditoria === 'function') {
        window.salvarPermissoesAdmin = function(idUsuario) {
            const retorno = salvarPermissoesAdminOriginalAuditoria.apply(this, arguments);
            atlasRegistrarAuditoria('Alterou permissoes', 'permissoes', `Usuario: ${idUsuario}`);
            return retorno;
        };
    }

    function atlasBuscaGeral(termo) {
        const busca = String(termo || '').toLowerCase();
        const resultados = [];
        const inclui = valor => String(valor ?? '').toLowerCase().includes(busca);
        const add = (modulo, titulo, detalhe) => resultados.push({ modulo, titulo, detalhe });

        (JSON.parse(localStorage.getItem('atlas_plano_hist')) || []).forEach(rel => {
            (rel.itens || []).forEach(item => {
                if ([item.pedidoNumero, item.destino, item.tipo, item.ralInferior, item.ralSuperior].some(inclui)) {
                    add('Plano', `Pedido ${item.pedidoNumero || 'S/N'} - ${item.destino || ''}`, `${rel.data || ''} | ${item.tipo || ''} | ${item.totalMetros || 0} m`);
                }
            });
        });

        (JSON.parse(localStorage.getItem('atlas_serra_hist')) || []).forEach(rel => {
            (rel.itens || []).forEach(item => {
                if ([item.desc, item.tipo, item.ralI, item.ralS].some(inclui)) {
                    add('Serra', item.desc || 'Item da Serra', `${rel.data || ''} | ${item.tipo || ''} | ${item.metros || 0} m`);
                }
            });
        });

        (JSON.parse(localStorage.getItem('atlas_emb_hist')) || []).forEach(rel => {
            (rel.itens || []).forEach(item => {
                if ([item.desc, item.tipo, item.ralI, item.ralS].some(inclui)) {
                    add('Embalagem', item.desc || 'Item da Embalagem', `${rel.data || ''} | ${item.tipo || ''} | ${item.metros || 0} m`);
                }
            });
        });

        (JSON.parse(localStorage.getItem('historicoBobines')) || []).forEach(rel => {
            (rel.itens || []).forEach(item => {
                if ([item.numBobine, item.ral, item.subtipo, item.status, item.tipo].some(inclui)) {
                    add('Bobines', item.numBobine || item.subtipo || 'Lancamento', `${rel.data || ''} | ${item.tipo || ''} | ${item.status || ''}`);
                }
            });
        });

        (JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || []).forEach(item => {
            if ([item.numero, item.ral, item.espessura, item.fornecedor, item.medida, item.status].some(inclui)) {
                add('Stock Bobinas', `Bobina ${item.numero || ''}`, `${item.fornecedor || ''} | RAL ${item.ral || ''} | ${item.status || ''}`);
            }
        });

        (JSON.parse(localStorage.getItem('atlas_stock_filmes')) || []).forEach(item => {
            if ([item.tipo, item.fornecedor].some(inclui)) {
                add('Stock Filmes', item.tipo || 'Filme', `${item.fornecedor || ''} | ${item.qtd || 0} un.`);
            }
        });

        (JSON.parse(localStorage.getItem('atlas_conferencia_serra')) || []).forEach(item => {
            if ([item.pedidoNumero, item.status, item.finalizadoPor].some(inclui)) {
                add('Conferencia', `Pedido ${item.pedidoNumero || 'S/N'}`, `${item.status || 'aberto'} | ${item.data || ''}`);
            }
        });

        return resultados.slice(0, 80);
    }

    window.pesquisarEncomendaAtlas = function() {
        const input = document.getElementById('pesquisa-encomenda-input');
        const resultado = document.getElementById('resultado-pesquisa-encomenda');
        if (!input || !resultado) return;

        const termo = input.value.trim();
        if (!termo) return alert('Digite o que deseja pesquisar.');

        const resultados = atlasBuscaGeral(termo);
        resultado.innerHTML = resultados.length ? `
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${resultados.map(r => `
                    <div style="background:#111827; border:1px solid #334155; border-radius:10px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                            <b>${atlasTextoAuditoria(r.titulo)}</b>
                            <span style="color:#60a5fa; font-weight:bold;">${atlasTextoAuditoria(r.modulo)}</span>
                        </div>
                        <div style="color:#cbd5e1; font-size:13px; margin-top:6px;">${atlasTextoAuditoria(r.detalhe)}</div>
                    </div>
                `).join('')}
            </div>
        ` : `
            <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:20px; text-align:center; color:#94a3b8;">
                Nenhum resultado encontrado.
            </div>
        `;
    };

    setTimeout(() => {
        atlasGarantirModuloOperacional('lembretes', 'Lembretes', 'fas fa-bell', "abrirModulo('lembretes')");
        atlasGarantirModuloOperacional('auditoria', 'Registros', 'fas fa-list-check', "abrirModulo('auditoria')");
        if (typeof aplicarPreferenciasVisuaisUsuario === 'function') aplicarPreferenciasVisuaisUsuario();
    }, 500);
})();

/* ==========================================================
   LIXEIRA ATLAS - 7 DIAS PARA RECUPERAR
   ========================================================== */

const ATLAS_LIXEIRA_KEY = 'atlas_lixeira';
const ATLAS_LIXEIRA_DIAS = 7;

function atlasUsuarioAtualNome() {
    return document.getElementById('user-display')?.innerText || usuarioLogado?.nome || usuarioLogado?.id || 'SEM USUARIO';
}

function atlasLixeiraLer() {
    try {
        return JSON.parse(localStorage.getItem(ATLAS_LIXEIRA_KEY)) || [];
    } catch (erro) {
        return [];
    }
}

function atlasLixeiraSalvar(lista) {
    localStorage.setItem(ATLAS_LIXEIRA_KEY, JSON.stringify(lista));
}

function atlasLixeiraLimparExpirados() {
    const agora = Date.now();
    const limite = ATLAS_LIXEIRA_DIAS * 24 * 60 * 60 * 1000;
    atlasLixeiraSalvar(atlasLixeiraLer().filter(item => agora - Number(item.apagadoTimestamp || 0) < limite));
}

function atlasLixeiraEnviar(secao, titulo, chave, dados, extras = {}) {
    atlasLixeiraLimparExpirados();

    const item = {
        id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        secao,
        titulo,
        chave,
        dados: JSON.parse(JSON.stringify(dados || null)),
        extras,
        apagadoPor: atlasUsuarioAtualNome(),
        apagadoEm: new Date().toLocaleString('pt-BR'),
        apagadoTimestamp: Date.now(),
        expiraEm: new Date(Date.now() + ATLAS_LIXEIRA_DIAS * 24 * 60 * 60 * 1000).toLocaleString('pt-BR')
    };

    const lista = atlasLixeiraLer();
    lista.unshift(item);
    atlasLixeiraSalvar(lista);
    return item;
}

function atlasLixeiraRemover(id) {
    atlasLixeiraSalvar(atlasLixeiraLer().filter(item => String(item.id) !== String(id)));
}

function atlasLixeiraRestaurarItem(item) {
    if (!item) return false;

    if (item.chave === 'historicoBobines') {
        historicoBobines = JSON.parse(localStorage.getItem('historicoBobines')) || [];
        historicoBobines.unshift(item.dados);
        localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));
        return true;
    }

    if (['atlas_serra_hist', 'atlas_emb_hist', 'atlas_plano_hist'].includes(item.chave)) {
        const hist = JSON.parse(localStorage.getItem(item.chave)) || [];
        hist.unshift(item.dados);
        localStorage.setItem(item.chave, JSON.stringify(hist));
        if (item.chave === 'atlas_serra_hist') db_serra_hist = hist;
        if (item.chave === 'atlas_emb_hist') db_emb_hist = hist;
        if (item.chave === 'atlas_plano_hist') db_plano_hist = hist;
        return true;
    }

    if (item.chave === 'atlas_conferencia_serra') {
        db_conferencia_serra = JSON.parse(localStorage.getItem('atlas_conferencia_serra')) || [];
        db_conferencia_serra.unshift(item.dados);
        localStorage.setItem('atlas_conferencia_serra', JSON.stringify(db_conferencia_serra));
        return true;
    }

    if (item.chave === 'atlas_db') {
        const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
        const ano = item.extras?.ano || item.dados?.ano || new Date().getFullYear();
        const mes = item.extras?.mes || item.dados?.mesNome || item.dados?.mes || 'SEM MES';
        if (!db[ano]) db[ano] = {};
        if (!db[ano][mes]) db[ano][mes] = [];
        db[ano][mes].unshift(item.dados);
        localStorage.setItem('atlas_db', JSON.stringify(db));
        return true;
    }

    return false;
}

function atlasRestaurarDaLixeira(id) {
    if (!usuarioPodeExcluirModulo('lixeira')) return alert('Sem permissao para restaurar itens da lixeira.');
    const item = atlasLixeiraLer().find(x => String(x.id) === String(id));
    if (!item) return alert('Item não encontrado na lixeira.');
    if (!confirm(`Restaurar?\n\n${item.titulo}`)) return;

    if (!atlasLixeiraRestaurarItem(item)) {
        alert('Não foi possível restaurar este item automaticamente.');
        return;
    }

    atlasLixeiraRemover(id);
    renderizarLixeiraAtlas();
    alert('Item restaurado.');
}

function atlasApagarDefinitivoDaLixeira(id) {
    if (!usuarioPodeExcluirModulo('lixeira')) return alert('Sem permissao para apagar itens da lixeira.');
    if (!confirm('Apagar definitivamente este item da lixeira?')) return;
    atlasLixeiraRemover(id);
    renderizarLixeiraAtlas();
}

function atlasValorLixeira(valor) {
    if (valor === null || valor === undefined || valor === '') return '-';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
}

function atlasResumoLinhaLixeira(item) {
    const campos = [
        ['Pedido', item.pedidoNumero || item.pedido || item.numero || item.encomenda],
        ['Cliente', item.destino || item.cliente || item.comprador],
        ['Tipo', item.tipo || item.tipoPainel || item.descricao],
        ['Esp.', item.esp || item.espessura],
        ['RAL Inf.', item.ralI || item.ralInferior || item.ralInf],
        ['RAL Sup.', item.ralS || item.ralSuperior || item.ralSup],
        ['Qtd', item.qtd || item.quantidade],
        ['Metro', item.metros || item.metro],
        ['Total', item.total || item.totalMetros]
    ];
    return campos
        .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
        .map(([nome, valor]) => `<b>${nome}:</b> ${textoSeguroConferencia(atlasValorLixeira(valor))}`)
        .join(' | ');
}

function atlasTabelaLixeira(titulo, lista) {
    if (!Array.isArray(lista) || !lista.length) return '';
    const linhas = lista.slice(0, 120).map((linha, indice) => `
        <tr>
            <td style="border:1px solid #334155; padding:8px; color:#cbd5e1;">${indice + 1}</td>
            <td style="border:1px solid #334155; padding:8px;">${atlasResumoLinhaLixeira(linha) || textoSeguroConferencia(atlasValorLixeira(linha))}</td>
        </tr>
    `).join('');
    const extra = lista.length > 120 ? `<div style="color:#fbbf24; margin-top:8px;">Mostrando 120 de ${lista.length} linhas.</div>` : '';
    return `
        <h3 style="margin:18px 0 8px; color:#60a5fa;">${textoSeguroConferencia(titulo)} (${lista.length})</h3>
        <div style="overflow:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:520px; font-size:14px;">
                <tbody>${linhas}</tbody>
            </table>
        </div>
        ${extra}
    `;
}

function atlasMontarDetalhesLixeira(item) {
    const dados = item?.dados || {};
    const blocos = [];

    blocos.push(`
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-bottom:12px;">
            <div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Secao</small><br><b>${textoSeguroConferencia(item.secao || 'Sistema')}</b></div>
            <div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Titulo</small><br><b>${textoSeguroConferencia(item.titulo || '-')}</b></div>
            <div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Apagado por</small><br><b>${textoSeguroConferencia(item.apagadoPor || '-')}</b></div>
            <div style="background:#111827; border:1px solid #334155; border-radius:8px; padding:10px;"><small style="color:#94a3b8;">Data/hora</small><br><b>${textoSeguroConferencia(item.apagadoEm || '-')}</b></div>
        </div>
    `);

    const resumo = [
        ['Data do relatorio', dados.data],
        ['Operador', dados.operador],
        ['Pedido', dados.pedidoNumero || dados.pedido || dados.numero],
        ['Cliente', dados.destino || dados.cliente || dados.comprador],
        ['Total', dados.total || dados.totalMetros || dados.totalGeral]
    ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');

    if (resumo.length) {
        blocos.push(`
            <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:12px;">
                ${resumo.map(([nome, valor]) => `<div style="margin:4px 0;"><b style="color:#bfdbfe;">${nome}:</b> ${textoSeguroConferencia(atlasValorLixeira(valor))}</div>`).join('')}
            </div>
        `);
    }

    blocos.push(atlasTabelaLixeira('Itens apagados', dados.itens));
    blocos.push(atlasTabelaLixeira('Producoes', dados.producoes || dados.producoesDoDia));
    blocos.push(atlasTabelaLixeira('Linhas', dados.linhas || dados.pedidos));

    if (!blocos.some(bloco => bloco.includes('<table'))) {
        let bruto = '';
        try {
            bruto = JSON.stringify(dados, null, 2);
        } catch (erro) {
            bruto = String(dados || '');
        }
        if (bruto.length > 9000) bruto = `${bruto.slice(0, 9000)}\n...`;
        blocos.push(`
            <h3 style="margin:18px 0 8px; color:#60a5fa;">Dados salvos</h3>
            <pre style="white-space:pre-wrap; word-break:break-word; background:#020617; border:1px solid #334155; border-radius:8px; padding:12px; color:#cbd5e1; max-height:55vh; overflow:auto;">${textoSeguroConferencia(bruto)}</pre>
        `);
    }

    return blocos.join('');
}

function atlasVisualizarItemLixeira(id) {
    const item = atlasLixeiraLer().find(x => String(x.id) === String(id));
    if (!item) return alert('Item nao encontrado na lixeira.');

    document.getElementById('modal-lixeira-preview')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-lixeira-preview';
    modal.style.cssText = 'position:fixed; inset:0; z-index:10002; background:rgba(2,6,23,.92); padding:14px; overflow:auto; color:white;';
    modal.innerHTML = `
        <div style="max-width:1050px; margin:0 auto; background:#0f172a; border:1px solid #334155; border-radius:12px; padding:14px;">
            <div style="position:sticky; top:0; z-index:1; background:#0f172a; display:flex; justify-content:space-between; gap:10px; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px; margin-bottom:12px;">
                <h2 style="margin:0; font-size:22px;">O que foi apagado</h2>
                <button onclick="document.getElementById('modal-lixeira-preview')?.remove()" style="background:#ef4444; color:white; border:none; border-radius:8px; padding:10px 16px; font-weight:bold;">FECHAR</button>
            </div>
            ${atlasMontarDetalhesLixeira(item)}
        </div>
    `;
    document.body.appendChild(modal);
}

function renderizarLixeiraAtlas() {
    atlasLixeiraLimparExpirados();

    const render = document.getElementById('render-modulo');
    if (!render) return;

    const lista = atlasLixeiraLer();
    const podeGerirLixeira = usuarioPodeExcluirModulo('lixeira');

    let html = `
        <div style="padding:15px; color:white;">
            <h2 style="margin-top:0; border-bottom:2px solid #ef4444; padding-bottom:10px;">Lixeira</h2>
            <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:12px; color:#cbd5e1; font-size:13px; margin-bottom:14px;">
                Itens apagados ficam aqui por ${ATLAS_LIXEIRA_DIAS} dias. Cada PDF ou item apagado aparece separado.
            </div>
    `;

    if (!lista.length) {
        html += `<div style="text-align:center; padding:45px; color:#94a3b8;">Lixeira vazia.</div>`;
    }

    lista.forEach(item => {
        html += `
            <div style="background:#111827; border:1px solid #334155; border-left:5px solid #ef4444; border-radius:10px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                        <span style="display:inline-block; background:#1e3a8a; color:white; border-radius:999px; padding:4px 9px; font-size:11px; font-weight:bold; margin-bottom:6px;">${textoSeguroConferencia(item.secao || 'Sistema')}</span><br>
                        <b>${textoSeguroConferencia(item.titulo)}</b>
                    </div>
                    <span style="color:#fca5a5; font-size:12px;">Expira: ${textoSeguroConferencia(item.expiraEm)}</span>
                </div>
                <div style="color:#94a3b8; font-size:12px; margin-top:6px;">
                    Apagado por: <b style="color:white;">${textoSeguroConferencia(item.apagadoPor)}</b><br>
                    Data/hora: ${textoSeguroConferencia(item.apagadoEm)}
                </div>
                <button onclick="atlasVisualizarItemLixeira('${item.id}')" style="width:100%; background:#3b82f6; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; margin-top:10px;">CLIQUE AQUI PARA VER</button>
                ${podeGerirLixeira ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
                    <button onclick="atlasRestaurarDaLixeira('${item.id}')" style="background:#10b981; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">RESTAURAR</button>
                    <button onclick="atlasApagarDefinitivoDaLixeira('${item.id}')" style="background:#7f1d1d; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold;">APAGAR</button>
                </div>` : `<div style="margin-top:10px; color:#94a3b8; font-size:12px;">Somente visualizacao.</div>`}
            </div>
        `;
    });

    render.innerHTML = html + `</div>`;
}

function atlasInstalarLixeira() {
    atlasLixeiraLimparExpirados();

    if (!document.getElementById('card-lixeira-atlas')) {
        const grid = document.getElementById('grid-home');
        if (grid) {
            const card = document.createElement('div');
            card.id = 'card-lixeira-atlas';
            card.className = 'card';
            card.setAttribute('onclick', "abrirModulo('lixeira')");
            card.innerHTML = `<i class="fas fa-trash-can"></i><span>Lixeira</span>`;
            grid.appendChild(card);
        }
    }

    if (!window.abrirModuloOriginalLixeiraAtlas) {
        window.abrirModuloOriginalLixeiraAtlas = abrirModulo;
        abrirModulo = function(nome) {
            if (nome === 'lixeira') {
                if (!usuarioPodeVerModulo('lixeira')) return alert('Sem permissao para acessar a lixeira.');
                document.getElementById('grid-home').style.display = 'none';
                document.getElementById('conteudo-modulo').style.display = 'block';
                document.getElementById('titulo-modulo').innerText = 'LIXEIRA';
                renderizarLixeiraAtlas();
                return;
            }
            window.abrirModuloOriginalLixeiraAtlas(nome);
        };
    }

    if (typeof atlasApagarRelatorioBobines === 'function' && !window.atlasApagarRelatorioBobinesComLixeira) {
        window.atlasApagarRelatorioBobinesComLixeira = atlasApagarRelatorioBobines;
        atlasApagarRelatorioBobines = function(index) {
            if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');
            const rel = historicoBobines[index];
            if (!rel) return alert('Relatório não encontrado.');
            if (!confirm('Mover este relatório para a lixeira?')) return;
            atlasLixeiraEnviar('Bobines', `Bobines - ${rel.data || 'sem data'}`, 'historicoBobines', rel);
            historicoBobines.splice(index, 1);
            localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));
            atlasFecharModal('modal-gerir-bobines');
            renderizarHistoricoBobines();
            alert('Relatório movido para a lixeira.');
        };
    }

    if (typeof atlasApagarRelatorioCorte === 'function' && !window.atlasApagarRelatorioCorteComLixeira) {
        window.atlasApagarRelatorioCorteComLixeira = atlasApagarRelatorioCorte;
        atlasApagarRelatorioCorte = function(tipo, index) {
            if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');
            const cfg = atlasGetStoreCorte(tipo);
            const rel = cfg.hist[index];
            if (!rel) return alert('Relatório não encontrado.');
            if (!confirm('Mover este relatório para a lixeira?')) return;
            atlasLixeiraEnviar(tipo === 'serra' ? 'Serra' : 'Embalagem', `${tipo} - ${rel.data || 'sem data'}`, cfg.key, rel);
            cfg.hist.splice(index, 1);
            localStorage.setItem(cfg.key, JSON.stringify(cfg.hist));
            if (tipo === 'serra') db_serra_hist = cfg.hist;
            if (tipo === 'embalagem') db_emb_hist = cfg.hist;
            atlasFecharModal(cfg.modal);
            cfg.listar();
            alert('Relatório movido para a lixeira.');
        };
    }

    if (typeof atlasApagarRelatorioInjecao === 'function' && !window.atlasApagarRelatorioInjecaoComLixeira) {
        window.atlasApagarRelatorioInjecaoComLixeira = atlasApagarRelatorioInjecao;
        atlasApagarRelatorioInjecao = function(ano, mes, index, modulo) {
            if (!atlasPodeGerirHistoricos()) return alert('Apenas ADMIN ou SUPERVISOR podem apagar históricos.');
            const db = JSON.parse(localStorage.getItem('atlas_db')) || {};
            const rel = db?.[ano]?.[mes]?.[index];
            if (!rel) return alert('Relatório não encontrado.');
            if (!confirm('Mover este relatório para a lixeira?')) return;
            atlasLixeiraEnviar('Injecao', `Injecao - ${rel.data || 'sem data'}`, 'atlas_db', rel, { ano, mes });
            db[ano][mes].splice(index, 1);
            if (db[ano][mes].length === 0) delete db[ano][mes];
            if (Object.keys(db[ano]).length === 0) delete db[ano];
            localStorage.setItem('atlas_db', JSON.stringify(db));
            atlasFecharModal('modal-gerir-injecao');
            exibirHistoricoModulo(modulo);
            alert('Relatório movido para a lixeira.');
        };
    }

    if (typeof deletarHistoricoBobine === 'function' && !window.deletarHistoricoBobineComLixeira) {
        window.deletarHistoricoBobineComLixeira = deletarHistoricoBobine;
        deletarHistoricoBobine = function(index) {
            const rel = historicoBobines[index];
            if (!rel) return;
            if (!confirm('Mover este relatório para a lixeira?')) return;
            atlasLixeiraEnviar('Bobines', `Bobines - ${rel.data || 'sem data'}`, 'historicoBobines', rel);
            historicoBobines.splice(index, 1);
            localStorage.setItem('historicoBobines', JSON.stringify(historicoBobines));
            renderizarHistoricoBobines();
        };
    }

    if (typeof removerItemPlanoHistorico === 'function' && !window.removerItemPlanoHistoricoComLixeira) {
        window.removerItemPlanoHistoricoComLixeira = removerItemPlanoHistorico;
        removerItemPlanoHistorico = function(indexPlano, idItem) {
            const rel = db_plano_hist[indexPlano];
            const item = rel?.itens?.find(i => String(i.id) === String(idItem));
            window.removerItemPlanoHistoricoComLixeira(indexPlano, idItem);
            const aindaExiste = (db_plano_hist[indexPlano]?.itens || []).some(i => String(i.id) === String(idItem));
            if (item && !aindaExiste) {
                atlasLixeiraEnviar('Plano', `Item plano - ${item.pedidoNumero || item.descricao || 'stock'}`, 'atlas_plano_hist', { ...rel, itens: [item] });
            }
        };
    }

    if (typeof removerPedidoPlanoHistorico === 'function' && !window.removerPedidoPlanoHistoricoComLixeira) {
        window.removerPedidoPlanoHistoricoComLixeira = removerPedidoPlanoHistorico;
        removerPedidoPlanoHistorico = function(indexPlano, pedidoNumero, destino) {
            const rel = db_plano_hist[indexPlano];
            const itens = (rel?.itens || []).filter(item => item.modo === 'pedido' && String(item.pedidoNumero) === String(pedidoNumero) && String(item.destino) === String(destino));
            window.removerPedidoPlanoHistoricoComLixeira(indexPlano, pedidoNumero, destino);
            const aindaExistem = (db_plano_hist[indexPlano]?.itens || []).some(item => item.modo === 'pedido' && String(item.pedidoNumero) === String(pedidoNumero) && String(item.destino) === String(destino));
            if (itens.length && !aindaExistem) {
                atlasLixeiraEnviar('Plano', `Pedido ${pedidoNumero} - ${destino}`, 'atlas_plano_hist', { ...rel, itens });
            }
        };
    }
}

window.addEventListener('load', () => {
    setTimeout(atlasInstalarLixeira, 300);
});

/* ==========================================================
   MÓDULO STOCK - BOBINAS E FILMES
   ========================================================== */

let atlasStockBobinas = atlasArrayLocal('atlas_stock_bobinas');
let atlasStockFilmes = atlasArrayLocal('atlas_stock_filmes');

function salvarStockAtlas() {
    localStorage.setItem('atlas_stock_bobinas', JSON.stringify(atlasStockBobinas));
    localStorage.setItem('atlas_stock_filmes', JSON.stringify(atlasStockFilmes));
}

function renderizarMenuStockAtlas() {
    const render = document.getElementById('render-modulo');
    if (!render) return;

    render.innerHTML = `
        <div style="padding:15px; color:white;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <div class="card" onclick="renderizarStockBobinasAtlas()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                    <i class="fas fa-compact-disc" style="color:#3b82f6; font-size:2.5rem; margin-bottom:15px;"></i>
                    <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Bobinas</span>
                    <small style="color:#94a3b8;">Cadastro e baixas</small>
                </div>
                <div class="card" onclick="renderizarStockFilmesAtlas()" style="cursor:pointer; background:#1e293b; border-radius:10px; padding:30px 15px; text-align:center; border:1px solid #334155;">
                    <i class="fas fa-film" style="color:#10b981; font-size:2.5rem; margin-bottom:15px;"></i>
                    <span style="display:block; color:white; font-weight:bold; font-size:13px; text-transform:uppercase;">Filmes</span>
                    <small style="color:#94a3b8;">Medidas e quantidades</small>
                </div>
            </div>
            <div id="stock-conteudo" style="margin-top:15px;"></div>
        </div>
    `;
}

function corQtdStock(qtd, tipo = 'bobinas') {
    const minimos = atlasObterConfigMinimoStock();
    const minimo = tipo === 'filmes' ? minimos.filmes : minimos.bobinas;
    return Number(qtd || 0) < minimo ? '#ef4444' : '#10b981';
}

function registrarHistoricoBobinaStock(item, acao, usuario = atlasUsuarioAtualNome(), dataHora = new Date().toLocaleString('pt-BR')) {
    if (!item) return;
    item.historico ||= [];
    item.historico.unshift({ acao, usuario, dataHora });
}

function registrarHistoricoFilmeStock(item, acao, usuario = atlasUsuarioAtualNome(), dataHora = new Date().toLocaleString('pt-BR')) {
    if (!item) return;
    item.historico ||= [];
    item.historico.unshift({ acao, usuario, dataHora });
}

function textoFiltroStock(item) {
    return normalizarStockAtlas(Object.values(item || {}).filter(v => typeof v !== 'object').join(' '));
}

function valorFiltroStock(filtro, campo) {
    if (!filtro || typeof filtro !== 'object') return '';
    return normalizarStockAtlas(filtro[campo]);
}

function filtrarListaStock(lista, filtro) {
    const busca = typeof filtro === 'object' ? normalizarStockAtlas(filtro.texto) : normalizarStockAtlas(filtro);
    const ral = valorFiltroStock(filtro, 'ral');
    const espessura = valorFiltroStock(filtro, 'espessura');
    const fornecedor = valorFiltroStock(filtro, 'fornecedor');
    const medida = valorFiltroStock(filtro, 'medida');

    return (lista || []).filter(item => {
        if (busca && !textoFiltroStock(item).includes(busca)) return false;
        if (ral && normalizarStockAtlas(item.ral) !== ral) return false;
        if (espessura && normalizarStockAtlas(item.espessura) !== espessura) return false;
        if (fornecedor && normalizarStockAtlas(item.fornecedor) !== fornecedor) return false;
        if (medida && normalizarStockAtlas(item.medida) !== medida) return false;
        return true;
    });
}

function htmlDatalistStock(id, valores) {
    const limpos = [...new Set((valores || []).map(v => String(v || '').trim()).filter(Boolean))].slice(0, 120);
    return `<datalist id="${id}">${limpos.map(v => `<option value="${textoSeguroConferencia(v)}"></option>`).join('')}</datalist>`;
}

function grupoFornecedorStock(lista) {
    return (lista || []).reduce((acc, item) => {
        const fornecedor = item.fornecedor || 'SEM FORNECEDOR';
        acc[fornecedor] ||= [];
        acc[fornecedor].push(item);
        return acc;
    }, {});
}

function grupoFornecedorMedidaRalStock(lista) {
    return (lista || []).reduce((acc, item) => {
        const fornecedor = item.fornecedor || 'SEM FORNECEDOR';
        const medida = item.medida || 'SEM MEDIDA';
        const ral = item.ral || 'SEM RAL';
        const chave = `${fornecedor}|||${medida}|||${ral}`;
        if (!acc[chave]) acc[chave] = { fornecedor, medida, ral, itens: [] };
        acc[chave].itens.push(item);
        return acc;
    }, {});
}

function bobinaAcabadaNoMesAtualStock(item) {
    const mesAtual = new Date().toISOString().slice(0, 7);
    return item.status === 'acabada_mes' && (!item.acabadaMesISO || item.acabadaMesISO === mesAtual);
}

function contarBobinasStock(lista, campo) {
    return (lista || []).reduce((acc, item) => {
        const chave = item[campo] || 'SEM INFO';
        acc[chave] = (acc[chave] || 0) + Number(item.qtd ?? 1);
        return acc;
    }, {});
}

function chaveBobinaChapaRalStock(item) {
    const medida = item?.medida || 'SEM CHAPA';
    const ral = item?.ral || 'SEM RAL';
    return `${medida} | RAL ${ral}`;
}

function contarBobinasPorChapaRalStock(lista) {
    return (lista || []).reduce((acc, item) => {
        const chave = chaveBobinaChapaRalStock(item);
        acc[chave] = (acc[chave] || 0) + Number(item.qtd ?? 1);
        return acc;
    }, {});
}

function contarBobinasPorRalChapaEspStatusStock(lista) {
    return (lista || []).reduce((acc, item) => {
        const ral = item.ral || 'SEM RAL';
        const medida = item.medida || 'SEM CHAPA';
        const espessura = item.espessura || 'SEM ESP.';
        const chave = `${ral} / ${medida} / ${espessura}`;
        if (!acc[chave]) acc[chave] = { fechada: 0, aberta: 0, total: 0, fechadas: [], abertas: [] };
        const qtd = Number(item.qtd ?? 1);
        if (item.status === 'andamento') {
            acc[chave].aberta += qtd;
            acc[chave].abertas.push(item);
        } else {
            acc[chave].fechada += qtd;
            acc[chave].fechadas.push(item);
        }
        acc[chave].total += qtd;
        return acc;
    }, {});
}

function mostrarBobinasResumoStock(chave, status) {
    const grupo = window.atlasResumoBobinasStatus?.[chave];
    const lista = status === 'aberta' ? (grupo?.abertas || []) : (grupo?.fechadas || []);
    const titulo = `${chave} - ${status === 'aberta' ? 'abertas' : 'fechadas'}`;

    if (!lista.length) return alert(`${titulo}\n\nNenhuma bobina.`);

    const numeros = lista
        .slice()
        .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true }))
        .map(item => {
            const partes = [
                `Bobina ${item.numero || '-'}`,
                item.fornecedor ? `Fornecedor ${item.fornecedor}` : '',
                item.peso ? `${item.peso} kg` : '',
                item.metros ? `${item.metros} m` : ''
            ].filter(Boolean);
            return partes.join(' | ');
        })
        .join('\n');

    alert(`${titulo}\n\n${numeros}`);
}

function htmlResumoRalChapaEspStock(lista) {
    const dados = contarBobinasPorRalChapaEspStatusStock(lista);
    const chaves = Object.keys(dados).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
    window.atlasResumoBobinasStatus = dados;

    return `
        <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:10px;">
            <b style="display:block; margin-bottom:8px; color:#93c5fd;">Por RAL / chapa / espessura</b>
            ${chaves.map(chave => {
                const item = dados[chave];
                const chaveClick = textoSeguroConferencia(chave).replace(/'/g, "&#39;");
                return `
                    <div style="display:flex; justify-content:space-between; gap:10px; border-top:1px solid #1e293b; padding:8px 0; flex-wrap:wrap;">
                        <span>${textoSeguroConferencia(chave)}</span>
                        <span style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                            <button onclick="mostrarBobinasResumoStock('${chaveClick}', 'fechada')" style="background:transparent; border:none; color:#10b981; font-weight:bold; cursor:pointer; padding:0;">${item.fechada} un. fechada</button>
                            <button onclick="mostrarBobinasResumoStock('${chaveClick}', 'aberta')" style="background:transparent; border:none; color:#f59e0b; font-weight:bold; cursor:pointer; padding:0;">${item.aberta} un. aberta</button>
                            <b style="color:#93c5fd;">${item.total} total</b>
                        </span>
                    </div>
                `;
            }).join('') || `<small style="color:#94a3b8;">Sem bobinas.</small>`}
        </div>
    `;
}

function htmlResumoBobinasStock(lista) {
    const blocos = [
        ['Por chapa/RAL', contarBobinasPorChapaRalStock(lista)],
        ['Por fornecedor', contarBobinasStock(lista, 'fornecedor')],
        ['Por RAL', contarBobinasStock(lista, 'ral')],
        ['Por espessura', contarBobinasStock(lista, 'espessura')]
    ];

    return `
        <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px; margin-top:14px;">
            <h3 style="margin:0 0 12px;">Resumo do stock de bobinas</h3>
            ${htmlResumoRalChapaEspStock(lista)}
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:10px;">
                ${blocos.map(([titulo, dados]) => `
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                        <b style="display:block; margin-bottom:8px; color:#93c5fd;">${titulo}</b>
                        ${Object.keys(dados).sort().map(chave => `
                            <div style="display:flex; justify-content:space-between; gap:8px; border-top:1px solid #1e293b; padding:7px 0;">
                                <span>${textoSeguroConferencia(chave)}</span>
                                <b style="color:${corQtdStock(dados[chave])};">${dados[chave]} un.</b>
                            </div>
                        `).join('') || `<small style="color:#94a3b8;">Sem bobinas.</small>`}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function dataBobinaAcabadaISO(item) {
    const texto = item.acabadaEm || item.ultimaBaixaEm || item.criadoEm || '';
    const partes = String(texto).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!partes) return new Date().toISOString().slice(0, 10);
    return `${partes[3]}-${partes[2]}-${partes[1]}`;
}

function renderizarAcabadasPorDataStock(lista) {
    if (!lista.length) return `<div style="color:#94a3b8; padding:12px;">Nenhuma bobina acabada.</div>`;
    const porAno = {};
    lista.forEach(item => {
        const iso = dataBobinaAcabadaISO(item);
        const [ano, mes, dia] = iso.split('-');
        porAno[ano] ||= {};
        porAno[ano][mes] ||= {};
        porAno[ano][mes][dia] ||= [];
        porAno[ano][mes][dia].push(item);
    });

    return Object.keys(porAno).sort().reverse().map(ano => `
        <details open style="background:#111827; border:1px solid #334155; border-radius:10px; margin-bottom:10px; padding:8px;">
            <summary style="cursor:pointer; font-weight:bold;">${ano}</summary>
            ${Object.keys(porAno[ano]).sort().reverse().map(mes => `
                <details open style="margin:8px 0 0 12px;">
                    <summary style="cursor:pointer; color:#93c5fd; font-weight:bold;">Mes ${mes}</summary>
                    ${Object.keys(porAno[ano][mes]).sort().reverse().map(dia => `
                        <details open style="margin:8px 0 0 12px;">
                            <summary style="cursor:pointer; color:#fbbf24; font-weight:bold;">Dia ${dia}</summary>
                            ${renderizarListaBobinasStock(porAno[ano][mes][dia], 'acabada')}
                        </details>
                    `).join('')}
                </details>
            `).join('')}
        </details>
    `).join('');
}

function opcoesFiltroStock(valores, selecionado = '', rotulo = 'Todos') {
    const limpos = [...new Set((valores || []).map(v => String(v || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
    return [`<option value="">${rotulo}</option>`]
        .concat(limpos.map(v => `<option value="${textoSeguroConferencia(v)}" ${String(selecionado || '') === String(v) ? 'selected' : ''}>${textoSeguroConferencia(v)}</option>`))
        .join('');
}

function filtrosBobinasStockNormalizados(filtro = '') {
    if (!filtro || typeof filtro !== 'object') return { texto: String(filtro || ''), ral: '', espessura: '', fornecedor: '', medida: '' };
    return {
        texto: filtro.texto || '',
        ral: filtro.ral || '',
        espessura: filtro.espessura || '',
        fornecedor: filtro.fornecedor || '',
        medida: filtro.medida || ''
    };
}

function lerFiltrosBobinasStock() {
    return {
        texto: document.getElementById('stock-bob-pesquisa')?.value || '',
        ral: document.getElementById('stock-bob-filtro-ral')?.value || '',
        espessura: document.getElementById('stock-bob-filtro-esp')?.value || '',
        fornecedor: document.getElementById('stock-bob-filtro-forn')?.value || '',
        medida: document.getElementById('stock-bob-filtro-medida')?.value || ''
    };
}

function aplicarFiltrosBobinasStock() {
    renderizarStockBobinasAtlas(lerFiltrosBobinasStock());
}

function limparFiltrosBobinasStock() {
    renderizarStockBobinasAtlas('');
}

function avisoBobinaStockDuplicada() {
    const input = document.getElementById('stock-bob-num');
    const aviso = document.getElementById('stock-bob-aviso-duplicada');
    if (!input || !aviso) return;
    const numero = input.value.trim();
    const duplicada = atlasStockBobinas.find(b => normalizarStockAtlas(b.numero) === normalizarStockAtlas(numero) && b.status !== 'acabada_mes');
    aviso.innerHTML = numero && duplicada
        ? `<div style="background:#451a03; color:#fed7aa; border:1px solid #f97316; border-radius:8px; padding:10px; font-size:12px;">A bobina ${textoSeguroConferencia(numero)} ja esta cadastrada.</div>`
        : '';
}

function renderizarStockBobinasAtlas(termoBusca = '') {
    const filtros = filtrosBobinasStockNormalizados(termoBusca);
    atlasStockBobinas = JSON.parse(localStorage.getItem('atlas_stock_bobinas')) || [];
    let migrouBobinas = false;
    atlasStockBobinas.forEach(b => {
        if (!b.qtd) {
            b.qtd = 1;
            migrouBobinas = true;
        }
        if (b.status === 'andamento' && !b.origemAndamento) {
            b.status = 'fechada';
            migrouBobinas = true;
        }
    });
    if (migrouBobinas) salvarStockAtlas();
    const c = document.getElementById('stock-conteudo') || document.getElementById('render-modulo');
    if (!c) return;

    const listaFiltrada = filtrarListaStock(atlasStockBobinas, filtros);
    const ativas = listaFiltrada.filter(b => b.status === 'andamento');
    const fechadas = listaFiltrada.filter(b => !b.status || b.status === 'fechada');
    const acabadas = listaFiltrada.filter(b => b.status === 'acabada_mes');
    const disponiveisResumo = listaFiltrada.filter(b => b.status !== 'acabada_mes');
    const sugestoesBobinas = atlasStockBobinas.flatMap(b => [b.numero, b.ral, b.espessura, b.fornecedor, b.medida, b.metros, b.peso]);
    const sugestoesNumerosBobinas = atlasStockBobinas.map(b => b.numero);
    const ralsBobinas = [...(OPCOES_RAL_INF || []), ...(OPCOES_RAL_SUP || []), ...atlasStockBobinas.map(b => b.ral)];
    const espessurasBobinas = [...(OPCOES_ESP_CHAPA || []), ...atlasStockBobinas.map(b => b.espessura)];
    const fornecedoresBobinas = [...(OPCOES_FORNECEDORES_STOCK || []), ...atlasStockBobinas.map(b => b.fornecedor)];
    const medidasBobinas = [...(OPCOES_MEDIDAS_CHAPA_STOCK || []), ...atlasStockBobinas.map(b => b.medida)];

    c.innerHTML = `
        <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px;">
            <h3 style="margin-top:0;">Bobinas</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:12px;">
                <input id="stock-bob-num" list="stock-bob-num-sugestoes" oninput="avisoBobinaStockDuplicada()" placeholder="Nº bobina" autocomplete="off" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                ${htmlDatalistStock('stock-bob-num-sugestoes', sugestoesNumerosBobinas)}
                <select id="stock-bob-ral" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${OPCOES_RAL_INF.concat(OPCOES_RAL_SUP).filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
                <select id="stock-bob-medida" title="Tipo/tamanho da chapa" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${(OPCOES_MEDIDAS_CHAPA_STOCK || []).map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
                <select id="stock-bob-esp" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                    ${opcoesEspChapaHTML()}
                </select>
                <select id="stock-bob-forn" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${(OPCOES_FORNECEDORES_STOCK || []).map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
                <select id="stock-bob-status" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                    <option value="fechada">Fechada</option>
                    <option value="andamento">Em andamento</option>
                </select>
                <input id="stock-bob-peso" type="number" step="0.01" placeholder="Peso opcional" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
                <input id="stock-bob-metros" type="number" step="0.01" placeholder="Metros opcional" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
            </div>
            <div id="stock-bob-aviso-duplicada" style="margin-bottom:12px;"></div>
            <button onclick="cadastrarBobinaStockAtlas()" style="width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">CADASTRAR BOBINA</button>
        </div>

        ${htmlResumoBobinasStock(disponiveisResumo)}
        <div style="margin-top:14px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:8px;">
                <select id="stock-bob-filtro-ral" onchange="aplicarFiltrosBobinasStock()" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${opcoesFiltroStock(ralsBobinas, filtros.ral, 'Todos os RAL')}</select>
                <select id="stock-bob-filtro-esp" onchange="aplicarFiltrosBobinasStock()" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${opcoesFiltroStock(espessurasBobinas, filtros.espessura, 'Todas as esp.')}</select>
                <select id="stock-bob-filtro-forn" onchange="aplicarFiltrosBobinasStock()" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${opcoesFiltroStock(fornecedoresBobinas, filtros.fornecedor, 'Todos fornecedores')}</select>
                <select id="stock-bob-filtro-medida" onchange="aplicarFiltrosBobinasStock()" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${opcoesFiltroStock(medidasBobinas, filtros.medida, 'Todos tamanhos')}</select>
            </div>
            <div style="display:flex; gap:8px; align-items:stretch;">
                <input id="stock-bob-pesquisa" list="stock-bob-sugestoes" value="${textoSeguroConferencia(filtros.texto)}" oninput="aplicarFiltrosBobinasStock()" placeholder="Pesquisar livre: bobina, RAL, espessura, fornecedor ou tamanho" style="flex:1; min-width:0; padding:14px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">
                <button onclick="limparFiltrosBobinasStock()" style="background:#334155; color:white; border:none; padding:0 14px; border-radius:8px; font-weight:bold;">LIMPAR</button>
            </div>
            ${htmlDatalistStock('stock-bob-sugestoes', sugestoesBobinas)}
        </div>
        <details open style="margin-top:18px;">
            <summary style="cursor:pointer; font-size:20px; font-weight:bold;">Em andamento</summary>
            ${renderizarListaBobinasStock(ativas, 'em andamento')}
        </details>
        <details open style="margin-top:18px;">
            <summary style="cursor:pointer; font-size:20px; font-weight:bold;">Fechadas</summary>
            ${renderizarListaBobinasStock(fechadas, 'fechada')}
        </details>
        <details open style="margin-top:18px;">
            <summary style="cursor:pointer; font-size:20px; font-weight:bold;">Acabadas</summary>
            ${renderizarAcabadasPorDataStock(acabadas)}
        </details>
    `;
    if (filtros.texto) setTimeout(() => {
        const input = document.getElementById('stock-bob-pesquisa');
        if (input) {
            input.focus();
            input.selectionStart = input.selectionEnd = input.value.length;
        }
    }, 0);
}

function renderizarListaBobinasStock(lista, rotuloVazio) {
    if (!lista.length) return `<div style="color:#94a3b8; padding:12px;">Nenhuma bobina ${rotuloVazio || 'cadastrada'}.</div>`;
    const grupos = grupoFornecedorMedidaRalStock(lista);
    return Object.keys(grupos).sort().map(chave => {
        const grupo = grupos[chave];
        grupo.itens.sort((a, b) => Number(a.metros || 999999) - Number(b.metros || 999999) || String(a.ral || '').localeCompare(String(b.ral || '')) || String(a.numero || '').localeCompare(String(b.numero || '')));
        return `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; margin-bottom:10px; overflow:hidden;">
            <div style="padding:10px; font-weight:bold; color:white; background:#0f172a;">
                ${textoSeguroConferencia(grupo.fornecedor)} | Chapa ${textoSeguroConferencia(grupo.medida)} | RAL ${textoSeguroConferencia(grupo.ral)}
            </div>
            ${grupo.itens.map(item => `
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; padding:10px; border-top:1px solid #334155; flex-wrap:wrap;">
                    <span style="flex:1; min-width:240px;">
                        <b>Bobina ${textoSeguroConferencia(item.numero)}</b><br>
                        <small style="color:#94a3b8;">Chapa ${textoSeguroConferencia(item.medida || '-')} | RAL ${textoSeguroConferencia(item.ral)} | Esp. ${textoSeguroConferencia(item.espessura || '-')}${item.metros ? ' | ' + textoSeguroConferencia(item.metros) + ' m' : ''}${item.peso ? ' | ' + textoSeguroConferencia(item.peso) + ' kg' : ''}</small>
                        <details style="margin-top:6px;">
                            <summary style="cursor:pointer; color:#93c5fd; font-size:12px;">Historico da bobina</summary>
                            <div style="margin-top:6px; color:#cbd5e1; font-size:12px;">
                                ${(item.historico || []).length ? item.historico.map(h => `
                                    <div style="border-top:1px solid #334155; padding:5px 0;">
                                        ${textoSeguroConferencia(h.dataHora || '-')} - ${textoSeguroConferencia(h.acao || '-')}<br>
                                        <span style="color:#94a3b8;">Por: ${textoSeguroConferencia(h.usuario || '-')}</span>
                                    </div>
                                `).join('') : '<span style="color:#94a3b8;">Sem historico.</span>'}
                            </div>
                        </details>
                    </span>
                    <b style="color:${corQtdStock(item.qtd ?? 1)};">1 un.</b>
                    <div style="display:flex; gap:8px;">
                        ${item.status !== 'acabada_mes' ? `<button onclick="baixarBobinaStockAtlas('${item.id}')" style="background:#3b82f6; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">BAIXAR</button><button onclick="fecharBobinaStockAtlas('${item.id}')" style="background:#64748b; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">ACABOU</button>` : ''}
                        <button onclick="editarBobinaStockAtlas('${item.id}')" style="background:#f59e0b; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">EDITAR</button>
                        <button onclick="excluirBobinaStockAtlas('${item.id}')" style="background:#ef4444; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">EXCLUIR</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    }).join('');
}

function cadastrarBobinaStockAtlas() {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const numero = document.getElementById('stock-bob-num')?.value.trim();
    const ral = document.getElementById('stock-bob-ral')?.value;
    const medida = document.getElementById('stock-bob-medida')?.value;
    const espessura = document.getElementById('stock-bob-esp')?.value.trim();
    const fornecedor = document.getElementById('stock-bob-forn')?.value.trim();
    const status = document.getElementById('stock-bob-status')?.value || 'fechada';
    const peso = document.getElementById('stock-bob-peso')?.value.trim() || '';
    const metros = document.getElementById('stock-bob-metros')?.value.trim() || '';
    if (!numero || !ral || !medida || !fornecedor) return alert('Informe numero, RAL, medida e fornecedor.');
    const duplicada = atlasStockBobinas.find(b => normalizarStockAtlas(b.numero) === normalizarStockAtlas(numero) && b.status !== 'acabada_mes');
    if (duplicada) return alert(`A bobina ${numero} ja esta cadastrada no Stock.`);
    const nova = { id: String(Date.now()), numero, ral, medida, espessura, fornecedor, qtd: 1, status, peso, metros, origemAndamento: status === 'andamento' ? 'cadastro_stock' : '', criadoPor: atlasUsuarioAtualNome(), criadoEm: new Date().toLocaleString('pt-BR') };
    registrarHistoricoBobinaStock(nova, 'Bobina cadastrada no Stock', nova.criadoPor, nova.criadoEm);
    atlasStockBobinas.unshift(nova);
    salvarStockAtlas();
    alert(`Bobina ${numero} cadastrada.`);
    renderizarStockBobinasAtlas();
}

function baixarBobinaStockAtlas(id) {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const item = atlasStockBobinas.find(b => String(b.id) === String(id));
    if (!item) return;
    item.qtd = 0;
    item.status = 'acabada_mes';
    item.origemAndamento = '';
    item.ultimaBaixaPor = atlasUsuarioAtualNome();
    item.ultimaBaixaEm = new Date().toLocaleString('pt-BR');
    registrarHistoricoBobinaStock(item, 'Baixa manual no Stock', item.ultimaBaixaPor, item.ultimaBaixaEm);
    item.acabadaPor = item.ultimaBaixaPor;
    item.acabadaEm = item.ultimaBaixaEm;
    item.acabadaMesISO = new Date().toISOString().slice(0, 7);
    salvarStockAtlas();
    renderizarStockBobinasAtlas();
}

function editarBobinaStockAtlas(id) {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const item = atlasStockBobinas.find(b => String(b.id) === String(id));
    if (!item) return;
    const numero = prompt('Numero da bobina:', item.numero || '');
    if (numero === null) return;
    const ral = prompt('RAL:', item.ral || '');
    if (ral === null) return;
    const medida = prompt('Medida:', item.medida || '');
    if (medida === null) return;
    const espessura = prompt('Espessura:', item.espessura || '');
    if (espessura === null) return;
    const fornecedor = prompt('Fornecedor:', item.fornecedor || '');
    if (fornecedor === null) return;
    const status = prompt('Status (fechada ou andamento):', item.status || 'fechada');
    if (status === null) return;
    const peso = prompt('Peso opcional:', item.peso || '');
    if (peso === null) return;
    const metros = prompt('Metros opcionais:', item.metros || '');
    if (metros === null) return;
    const duplicada = atlasStockBobinas.find(b =>
        String(b.id) !== String(id) &&
        b.status !== 'acabada_mes' &&
        normalizarStockAtlas(b.numero) === normalizarStockAtlas(numero)
    );
    if (duplicada) return alert(`A bobina ${numero} ja esta cadastrada no Stock.`);

    Object.assign(item, {
        numero: numero.trim(),
        ral: ral.trim(),
        medida: medida.trim(),
        espessura: espessura.trim(),
        fornecedor: fornecedor.trim(),
        qtd: 1,
        status: normalizarStockAtlas(status).includes('and') ? 'andamento' : 'fechada',
        origemAndamento: normalizarStockAtlas(status).includes('and') ? (item.origemAndamento || 'cadastro_stock') : '',
        peso: peso.trim(),
        metros: metros.trim()
    });
    registrarHistoricoBobinaStock(item, 'Bobina editada no Stock');
    salvarStockAtlas();
    renderizarStockBobinasAtlas();
}

function excluirBobinaStockAtlas(id) {
    if (!usuarioPodeExcluirModulo('stock')) return alert('Sem permissao para excluir Stock.');
    const item = atlasStockBobinas.find(b => String(b.id) === String(id));
    if (!item) return;
    if (!confirm(`Excluir bobina ${item.numero || ''}?`)) return;
    atlasStockBobinas = atlasStockBobinas.filter(b => String(b.id) !== String(id));
    salvarStockAtlas();
    renderizarStockBobinasAtlas();
}

function fecharBobinaStockAtlas(id) {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const item = atlasStockBobinas.find(b => String(b.id) === String(id));
    if (!item) return;
    item.status = 'acabada_mes';
    item.acabadaPor = atlasUsuarioAtualNome();
    item.acabadaEm = new Date().toLocaleString('pt-BR');
    item.acabadaMesISO = new Date().toISOString().slice(0, 7);
    registrarHistoricoBobinaStock(item, 'Bobina marcada como acabada no Stock', item.acabadaPor, item.acabadaEm);
    salvarStockAtlas();
    renderizarStockBobinasAtlas();
}

function contarFilmesStock(lista) {
    return (lista || []).reduce((acc, item) => {
        const chave = item.tipo || 'SEM TIPO';
        acc[chave] = (acc[chave] || 0) + Number(item.qtd || 0);
        return acc;
    }, {});
}

function htmlResumoFilmesStock(lista) {
    const dados = contarFilmesStock(lista);
    return `
        <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px; margin-top:14px;">
            <h3 style="margin:0 0 12px;">Resumo do stock de filmes</h3>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                ${Object.keys(dados).sort().map(tipo => `
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px;">
                        <b>${textoSeguroConferencia(tipo)}</b>
                        <div style="font-size:20px; font-weight:bold; color:${corQtdStock(dados[tipo], 'filmes')}; margin-top:8px;">${dados[tipo]} un.</div>
                    </div>
                `).join('') || `<small style="color:#94a3b8;">Sem filmes cadastrados.</small>`}
            </div>
        </div>
    `;
}

function normalizarNomeFilmeStock(nome) {
    const configurado = (OPCOES_FILMES_STOCK || []).find(opcao => normalizarStockAtlas(opcao) === normalizarStockAtlas(nome));
    if (configurado) return configurado;

    const texto = normalizarStockAtlas(nome);
    if (texto.includes('telha')) return 'Telha (1180mm)';
    if (texto.includes('ondulado')) return 'Ondulado (1055mm)';
    if (texto.includes('5 ondas') || texto.includes('1175') || texto.includes('1265')) return '5 Ondas (1175mm)';
    if (texto.includes('fachada') || texto.includes('1010') || texto.includes('1060') || texto.includes('1065') || texto.includes('1163')) return 'Fachada (1010)';
    return nome || '';
}

function migrarFilmesDuplicadosStockAtlas() {
    const mapa = {};
    let alterou = false;
    (atlasStockFilmes || []).forEach(item => {
        const tipo = normalizarNomeFilmeStock(item.tipo || 'SEM TIPO');
        const fornecedor = item.fornecedor || 'SEM FORNECEDOR';
        if (tipo !== item.tipo) alterou = true;
        const chave = `${normalizarStockAtlas(tipo)}|||${normalizarStockAtlas(fornecedor)}`;
        if (!mapa[chave]) {
            mapa[chave] = { ...item, tipo, fornecedor, qtd: Number(item.qtd || 0), historico: [...(item.historico || [])] };
            return;
        }
        mapa[chave].qtd += Number(item.qtd || 0);
        mapa[chave].historico = [...(mapa[chave].historico || []), ...(item.historico || [])];
        alterou = true;
    });
    if (alterou) {
        atlasStockFilmes = Object.values(mapa);
        salvarStockAtlas();
    }
}

function renderizarStockFilmesAtlas(termoBusca = '') {
    atlasStockFilmes = JSON.parse(localStorage.getItem('atlas_stock_filmes')) || [];
    migrarFilmesDuplicadosStockAtlas();
    const c = document.getElementById('stock-conteudo') || document.getElementById('render-modulo');
    if (!c) return;
    const tipos = OPCOES_FILMES_STOCK || ['5 Ondas - 1265', 'Filme Telha Canudo', 'Filme 1163', 'Filme 1060', 'Filme 1065'];
    const listaFiltrada = filtrarListaStock(atlasStockFilmes, termoBusca);
    const grupos = grupoFornecedorStock(listaFiltrada);
    const sugestoesFilmes = atlasStockFilmes.flatMap(f => [f.tipo, f.fornecedor]);

    c.innerHTML = `
        <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:15px;">
            <h3 style="margin-top:0;">Filmes</h3>
            <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px; margin-bottom:12px;">
                <select id="stock-film-tipo" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${tipos.map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
                <select id="stock-film-forn" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">${(OPCOES_FORNECEDORES_STOCK || []).map(v=>`<option value="${v}">${v}</option>`).join('')}</select>
                <input id="stock-film-qtd" type="number" value="1" min="1" placeholder="Qtd" style="padding:12px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px;">
            </div>
            <button onclick="cadastrarFilmeStockAtlas()" style="width:100%; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">CADASTRAR FILME</button>
        </div>

        ${htmlResumoFilmesStock(listaFiltrada)}
        <div style="margin-top:14px;">
            <input id="stock-film-pesquisa" list="stock-film-sugestoes" value="${textoSeguroConferencia(termoBusca)}" oninput="renderizarStockFilmesAtlas(this.value)" placeholder="Pesquisar por tipo ou fornecedor" style="width:100%; padding:14px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">
            ${htmlDatalistStock('stock-film-sugestoes', sugestoesFilmes)}
        </div>
        <details open style="margin-top:18px;">
            <summary style="cursor:pointer; font-size:20px; font-weight:bold;">Stock de filmes</summary>
        ${Object.keys(grupos).length ? Object.keys(grupos).sort().map(forn => `
            <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; margin-bottom:10px; overflow:hidden;">
                <div style="padding:10px; font-weight:bold; color:white; background:#0f172a;">${textoSeguroConferencia(forn)}</div>
                ${grupos[forn].map(item => `
                    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; padding:10px; border-top:1px solid #334155; flex-wrap:wrap;">
                        <span><b>${textoSeguroConferencia(item.tipo)}</b><br><small style="color:#94a3b8;">Fornecedor: ${textoSeguroConferencia(item.fornecedor || '-')}</small></span>
                        <b style="color:${corQtdStock(item.qtd, 'filmes')};">${Number(item.qtd || 0)} un.</b>
                        <div style="display:flex; gap:8px;">
                            <button onclick="baixarFilmeStockAtlas('${item.id}')" style="background:#3b82f6; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">BAIXAR</button>
                            <button onclick="editarFilmeStockAtlas('${item.id}')" style="background:#f59e0b; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">EDITAR</button>
                            <button onclick="excluirFilmeStockAtlas('${item.id}')" style="background:#ef4444; color:white; border:none; padding:8px 10px; border-radius:6px; font-weight:bold;">EXCLUIR</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('') : `<div style="color:#94a3b8; padding:12px;">Nenhum filme cadastrado.</div>`}
        </details>
    `;
    if (termoBusca) setTimeout(() => {
        const input = document.getElementById('stock-film-pesquisa');
        if (input) {
            input.focus();
            input.selectionStart = input.selectionEnd = input.value.length;
        }
    }, 0);
}

function cadastrarFilmeStockAtlas() {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const tipo = normalizarNomeFilmeStock(document.getElementById('stock-film-tipo')?.value);
    const fornecedor = document.getElementById('stock-film-forn')?.value.trim();
    const qtd = Number(document.getElementById('stock-film-qtd')?.value || 1);
    if (!tipo || !fornecedor) return alert('Informe tipo e fornecedor.');
    const existente = atlasStockFilmes.find(f => normalizarStockAtlas(f.tipo) === normalizarStockAtlas(tipo) && normalizarStockAtlas(f.fornecedor) === normalizarStockAtlas(fornecedor));
    if (existente) {
        existente.qtd = Number(existente.qtd || 0) + qtd;
        registrarHistoricoFilmeStock(existente, `Somou ${qtd} un. no cadastro`, atlasUsuarioAtualNome(), new Date().toLocaleString('pt-BR'));
    } else {
        const novo = { id: String(Date.now()), tipo, medida: '', fornecedor, qtd, criadoPor: atlasUsuarioAtualNome(), criadoEm: new Date().toLocaleString('pt-BR') };
        registrarHistoricoFilmeStock(novo, 'Filme cadastrado no Stock', novo.criadoPor, novo.criadoEm);
        atlasStockFilmes.unshift(novo);
    }
    salvarStockAtlas();
    renderizarStockFilmesAtlas();
}

function baixarFilmeStockAtlas(id) {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const item = atlasStockFilmes.find(f => String(f.id) === String(id));
    if (!item) return;
    item.qtd = Math.max(0, Number(item.qtd || 0) - 1);
    item.ultimaBaixaPor = atlasUsuarioAtualNome();
    item.ultimaBaixaEm = new Date().toLocaleString('pt-BR');
    registrarHistoricoFilmeStock(item, 'Baixa manual no Stock', item.ultimaBaixaPor, item.ultimaBaixaEm);
    salvarStockAtlas();
    renderizarStockFilmesAtlas();
}

function editarFilmeStockAtlas(id) {
    if (!usuarioPodeEditarModulo('stock')) return alert('Sem permissao para editar Stock.');
    const item = atlasStockFilmes.find(f => String(f.id) === String(id));
    if (!item) return;
    const tipo = prompt('Tipo do filme:', item.tipo || '');
    if (tipo === null) return;
    const fornecedor = prompt('Fornecedor:', item.fornecedor || '');
    if (fornecedor === null) return;
    const qtd = prompt('Quantidade:', item.qtd || 0);
    if (qtd === null) return;

    item.tipo = normalizarNomeFilmeStock(tipo.trim());
    item.fornecedor = fornecedor.trim();
    item.qtd = Math.max(0, Number(qtd) || 0);
    registrarHistoricoFilmeStock(item, 'Filme editado no Stock');
    salvarStockAtlas();
    renderizarStockFilmesAtlas();
}

function excluirFilmeStockAtlas(id) {
    if (!usuarioPodeExcluirModulo('stock')) return alert('Sem permissao para excluir Stock.');
    const item = atlasStockFilmes.find(f => String(f.id) === String(id));
    if (!item) return;
    if (!confirm(`Excluir filme ${item.tipo || ''}?`)) return;
    atlasStockFilmes = atlasStockFilmes.filter(f => String(f.id) !== String(id));
    salvarStockAtlas();
    renderizarStockFilmesAtlas();
}

function instalarProtecaoExclusaoSeparadaAtlas() {
    const proteger = (nomeFuncao, modulo, mensagem) => {
        const original = window[nomeFuncao];
        if (typeof original !== 'function' || original._atlasProtegidaExcluir) return;
        const protegida = function(...args) {
            if (!usuarioPodeExcluirModulo(modulo)) return alert(mensagem || `Sem permissao para excluir em ${modulo}.`);
            return original.apply(this, args);
        };
        protegida._atlasProtegidaExcluir = true;
        window[nomeFuncao] = protegida;
    };

    proteger('removerItem', 'injecao', 'Sem permissao para excluir na Injecao.');
    proteger('atlasApagarRelatorioInjecao', 'injecao', 'Sem permissao para excluir na Injecao.');
    proteger('deletarHistoricoBobine', 'bobines', 'Sem permissao para excluir em Bobines.');
    proteger('removerLancamento', 'bobines', 'Sem permissao para excluir em Bobines.');
    proteger('removerCorteSerra', 'serra', 'Sem permissao para excluir na Serra.');
    proteger('removerCorteEmbalagem', 'embalagem', 'Sem permissao para excluir na Embalagem.');
    proteger('removerLinhaPlano', 'plano', 'Sem permissao para excluir no Plano.');
    proteger('removerGrupoFinalizadoPlano', 'plano', 'Sem permissao para excluir no Plano.');
    proteger('removerItemPlanoHistorico', 'plano', 'Sem permissao para excluir no Plano.');
    proteger('removerPedidoPlanoHistorico', 'plano', 'Sem permissao para excluir no Plano.');
    proteger('excluirPedidoConferenciaSerra', 'conferencia', 'Sem permissao para excluir Conferencia.');
    proteger('removerItemListaSistema', 'config', 'Sem permissao para excluir nos Ajustes.');
    proteger('excluirBobinaStockAtlas', 'stock', 'Sem permissao para excluir Stock.');
    proteger('excluirFilmeStockAtlas', 'stock', 'Sem permissao para excluir Stock.');
}

window.addEventListener('load', () => setTimeout(instalarProtecaoExclusaoSeparadaAtlas, 500));
/* ==========================================================
   PLANO - MARCAR ENCOMENDA / PEDIDO COMO CANCELADO
   Cole no FINAL do script.js
   ========================================================== */

(function() {
    if (window.atlasCancelamentoEncomendaPlanoAtivo) return;
    window.atlasCancelamentoEncomendaPlanoAtivo = true;

    function pedidoPlanoCancelado(rel, pedidoNumero, destino) {
        return (rel.itens || []).some(item =>
            item.modo === 'pedido' &&
            String(item.pedidoNumero) === String(pedidoNumero) &&
            String(item.destino) === String(destino) &&
            item.encomendaCancelada === true
        );
    }

    window.alternarCancelamentoEncomendaPlano = function(indexPlano, idItem) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;

        const itemBase = rel.itens.find(i => String(i.id) === String(idItem));
        if (!itemBase) return alert('Item não encontrado.');

        const pedidoNumero = itemBase.pedidoNumero;
        const destino = itemBase.destino;
        const jaCancelado = pedidoPlanoCancelado(rel, pedidoNumero, destino);

        if (jaCancelado) {
            const confirmar = confirm(`Reativar a encomenda ${pedidoNumero} - ${destino}?`);
            if (!confirmar) return;

            rel.itens.forEach(item => {
                if (
                    item.modo === 'pedido' &&
                    String(item.pedidoNumero) === String(pedidoNumero) &&
                    String(item.destino) === String(destino)
                ) {
                    item.encomendaCancelada = false;
                    item.totalMetros = Number(
                        item.totalMetrosAntesCancelamento ||
                        (Number(item.quantidadeChapas || 0) * Number(item.metrosUnidade || 0))
                    ).toFixed(2);

                    item.totalMetros = Number(item.totalMetros);
                }
            });

            salvarPlanoHistoricoEditado(indexPlano, rel, `Reativou encomenda ${pedidoNumero} - ${destino}`);
        } else {
            const motivo = prompt(`Motivo do cancelamento da encomenda ${pedidoNumero}:`, 'Encomenda cancelada') || 'Encomenda cancelada';
            const confirmar = confirm(`Confirmar cancelamento da encomenda ${pedidoNumero} - ${destino}?`);
            if (!confirmar) return;

            rel.itens.forEach(item => {
                if (
                    item.modo === 'pedido' &&
                    String(item.pedidoNumero) === String(pedidoNumero) &&
                    String(item.destino) === String(destino)
                ) {
                    item.encomendaCancelada = true;
                    item.motivoCancelamento = motivo;
                    item.canceladoPor = obterNomeEditorPlano();
                    item.canceladoEm = new Date().toLocaleString('pt-BR');

                    if (!item.totalMetrosAntesCancelamento) {
                        item.totalMetrosAntesCancelamento = Number(item.totalMetros || 0);
                    }

                    item.totalMetros = 0;
                }
            });

            salvarPlanoHistoricoEditado(indexPlano, rel, `Cancelou encomenda ${pedidoNumero} - ${destino}: ${motivo}`);
        }

        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    const abrirEdicaoItemPlanoHistoricoOriginalCancelamento = window.abrirEdicaoItemPlanoHistorico;

    window.abrirEdicaoItemPlanoHistorico = function(indexPlano, idItem) {
        abrirEdicaoItemPlanoHistoricoOriginalCancelamento(indexPlano, idItem);

        const rel = db_plano_hist[indexPlano];
        if (!rel) return;

        const item = rel.itens.find(i => String(i.id) === String(idItem));
        if (!item || item.modo !== 'pedido') return;

        const modal = document.getElementById('modal-plano-historico');
        if (!modal) return;

        const jaCancelado = pedidoPlanoCancelado(rel, item.pedidoNumero, item.destino);
        const cor = jaCancelado ? '#10b981' : '#ef4444';
        const texto = jaCancelado ? 'REATIVAR ENCOMENDA' : 'MARCAR ENCOMENDA CANCELADA';

        const bloco = document.createElement('div');
        bloco.style = `
            background:${jaCancelado ? '#052e16' : '#450a0a'};
            border:1px solid ${cor};
            color:white;
            padding:12px;
            border-radius:10px;
            margin:15px 0;
        `;

        bloco.innerHTML = `
            <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">
                Estado da encomenda:
                <b style="color:${cor};">${jaCancelado ? 'CANCELADA' : 'ATIVA'}</b>
            </div>

            ${jaCancelado ? `
                <div style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">
                    Motivo: <b>${item.motivoCancelamento || '-'}</b><br>
                    Cancelado por: <b>${item.canceladoPor || '-'}</b><br>
                    Em: <b>${item.canceladoEm || '-'}</b>
                </div>
            ` : ''}

            <button onclick="alternarCancelamentoEncomendaPlano(${indexPlano}, '${String(idItem).replace(/'/g, "\\'")}')"
                style="width:100%; background:${cor}; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold;">
                ${texto}
            </button>
        `;

        const areaEdicao = modal.querySelector('div[style*="padding-top:15px"]');
        if (areaEdicao) {
            areaEdicao.prepend(bloco);
        }
    };

    window.salvarEdicaoItemPlanoHistorico = function(indexPlano, idItem) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;

        const item = rel.itens.find(i => String(i.id) === String(idItem));
        if (!item) return;

        const qtd = Number(document.getElementById('edit-plano-qtd')?.value);
        const metros = Number(document.getElementById('edit-plano-metros')?.value);

        if (!qtd || qtd <= 0) return alert('Informe uma quantidade válida.');
        if (!metros || metros <= 0) return alert('Informe os metros válidos.');

        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;

        if (item.encomendaCancelada) {
            item.totalMetrosAntesCancelamento = Number((qtd * metros).toFixed(2));
            item.totalMetros = 0;
        } else {
            item.totalMetros = Number((qtd * metros).toFixed(2));
        }

        salvarPlanoHistoricoEditado(
            indexPlano,
            rel,
            `Editou item ${item.pedidoNumero ? 'do pedido ' + item.pedidoNumero : 'de stock'}: ${qtd} chapas x ${metros} m`
        );

        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };
})();
/* ==========================================================
   PLANO - NÃO MOSTRAR ENCOMENDAS CANCELADAS NO PDF
   Cole no FINAL do script.js, depois do bloco de cancelamento
   ========================================================== */

(function() {
    if (window.atlasPDFSemCanceladasAtivo) return;
    window.atlasPDFSemCanceladasAtivo = true;

    const gerarPDFPlanoOriginalSemCanceladas = window.gerarPDF_Plano;

    window.gerarPDF_Plano = function(dadosEncoded) {
        const rel = JSON.parse(decodeURIComponent(dadosEncoded));

        const relSemCanceladas = {
            ...rel,
            itens: (rel.itens || []).filter(item => item.encomendaCancelada !== true)
        };

        relSemCanceladas.totalGeral = Number(
            relSemCanceladas.itens.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0).toFixed(2)
        );

        if (typeof gerarResumoPlano === 'function') {
            relSemCanceladas.resumo = gerarResumoPlano(relSemCanceladas.itens);
        }

        const janela = window.open('', '_blank');
        janela.document.write(montarHTMLPlano(relSemCanceladas, true));
        janela.document.close();
    };
})();
/* ==========================================================
   PESQUISAR ENCOMENDA / PEDIDO
   Cole no FINAL do script.js
   ========================================================== */

(function() {
    if (window.atlasPesquisaEncomendaAtiva) return;
    window.atlasPesquisaEncomendaAtiva = true;

    if (typeof MODULOS_SISTEMA !== 'undefined' && !MODULOS_SISTEMA.some(m => m.chave === 'pesquisa_encomenda')) {
        MODULOS_SISTEMA.push({ chave: 'pesquisa_encomenda', nome: 'Pesquisar' });
    }

    function atlasTextoSeguro(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function atlasPedidoDescSerra(desc) {
        const match = String(desc || '').match(/PED:\s*(.+)/i);
        return match ? match[1].trim() : '';
    }

    function atlasGarantirCardPesquisaEncomenda() {
        const grid = document.getElementById('grid-home');
        if (!grid || document.getElementById('card-pesquisa-encomenda')) return;

        const card = document.createElement('div');
        card.id = 'card-pesquisa-encomenda';
        card.className = 'card';
        card.setAttribute('onclick', "abrirModulo('pesquisa_encomenda')");
        card.innerHTML = `
            <i class="fas fa-search"></i>
            <span>Pesquisar</span>
        `;

        grid.appendChild(card);
    }

    const aplicarPreferenciasOriginalPesquisa = window.aplicarPreferenciasVisuaisUsuario;
    window.aplicarPreferenciasVisuaisUsuario = function() {
        if (typeof aplicarPreferenciasOriginalPesquisa === 'function') {
            aplicarPreferenciasOriginalPesquisa();
        }

        atlasGarantirCardPesquisaEncomenda();

        const card = document.getElementById('card-pesquisa-encomenda');
        if (card) card.style.display = usuarioPodeVerModulo('pesquisa_encomenda') ? '' : 'none';
    };

    const abrirModuloOriginalPesquisa = window.abrirModulo;
    window.abrirModulo = function(nome) {
        if (nome === 'pesquisa_encomenda') {
            if (!usuarioPodeVerModulo('pesquisa_encomenda')) return alert('Sem permissao para pesquisar encomendas.');
            document.getElementById('grid-home').style.display = 'none';
            document.getElementById('conteudo-modulo').style.display = 'block';
            document.getElementById('titulo-modulo').innerText = 'PESQUISAR ENCOMENDA';
            renderizarPesquisaEncomendaAtlas();
            return;
        }

        abrirModuloOriginalPesquisa(nome);
    };

    setTimeout(atlasGarantirCardPesquisaEncomenda, 300);

    window.renderizarPesquisaEncomendaAtlas = function() {
        const render = document.getElementById('render-modulo');
        if (!render) return;

        render.innerHTML = `
            <div style="padding:15px; color:white;">
                <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:18px; margin-bottom:15px;">
                    <label style="color:#94a3b8; font-size:12px; font-weight:bold;">NÚMERO DA ENCOMENDA / PEDIDO</label>
                    <div style="display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:8px;">
                        <input id="pesquisa-encomenda-input" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="Ex: 12345"
                            onkeydown="if(event.key === 'Enter') pesquisarEncomendaAtlas()"
                            style="width:100%; padding:14px; background:#0f172a; color:white; border:1px solid #334155; border-radius:8px; font-size:16px;">
                        <button onclick="pesquisarEncomendaAtlas()"
                            style="background:#10b981; color:white; border:none; padding:0 18px; border-radius:8px; font-weight:bold;">
                            BUSCAR
                        </button>
                    </div>
                </div>

                <div id="resultado-pesquisa-encomenda"></div>
            </div>
        `;
    };

    function buscarNoPlano(numero) {
        const resultados = [];
        const historico = JSON.parse(localStorage.getItem('atlas_plano_hist')) || [];

        historico.forEach((rel, indexPlano) => {
            const itens = (rel.itens || []).filter(item =>
                item.modo === 'pedido' &&
                String(item.pedidoNumero || '').toLowerCase().includes(numero)
            );

            const grupos = {};

            itens.forEach(item => {
                const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || 'SEM CLIENTE'}`;
                if (!grupos[chave]) grupos[chave] = [];
                grupos[chave].push(item);
            });

            Object.keys(grupos).forEach(chave => {
                const [pedidoNumero, destino] = chave.split('|||');
                resultados.push({
                    origem: 'plano',
                    indexPlano,
                    rel,
                    pedidoNumero,
                    destino,
                    itens: grupos[chave]
                });
            });
        });

        return resultados;
    }

    function buscarNaSerra(numero) {
        const historico = JSON.parse(localStorage.getItem('atlas_serra_hist')) || [];
        const resultados = [];

        historico.forEach(rel => {
            const itens = (rel.itens || []).filter(item =>
                atlasPedidoDescSerra(item.desc).toLowerCase().includes(numero)
            );

            if (itens.length > 0) {
                resultados.push({ rel, itens });
            }
        });

        return resultados;
    }

    function buscarNaConferencia(numero) {
        const conf = JSON.parse(localStorage.getItem('atlas_conferencia_serra')) || [];

        return conf.filter(pedido =>
            String(pedido.pedidoNumero || '').toLowerCase().includes(numero)
        );
    }

    function calcularStatusPedido(plano, serra, conferencias) {
        const itensPlano = plano?.itens || [];
        const todosCancelados = itensPlano.length > 0 && itensPlano.every(i => i.encomendaCancelada === true);
        const algunsCancelados = itensPlano.some(i => i.encomendaCancelada === true);

        if (todosCancelados) {
            return {
                texto: 'CANCELADA',
                cor: '#ef4444',
                detalhe: 'Esta encomenda foi marcada como cancelada no Plano.'
            };
        }

        const confFinalizada = conferencias.some(c => c.status === 'finalizado');
        const confStandBy = conferencias.some(c => c.status === 'stand_by' || (c.unidades || []).some(u => u.status === 'nao'));
        const confAberta = conferencias.some(c => c.status !== 'finalizado');

        if (confStandBy) {
            return {
                texto: 'STAND BY',
                cor: '#ef4444',
                detalhe: 'A conferencia encontrou problema no pedido. Ele nao pode ser finalizado ate a correcao.'
            };
        }

        if (confAberta) {
            return {
                texto: 'FALTA CONFERIR',
                cor: '#f59e0b',
                detalhe: 'A encomenda já saiu da Serra, mas ainda falta finalizar a conferência.'
            };
        }

        if (confFinalizada) {
            const temNaoOk = conferencias.some(c => (c.unidades || []).some(u => u.status === 'nao'));

            return {
                texto: temNaoOk ? 'CONFERIDA COM PENDÊNCIA' : 'CONFERIDA OK',
                cor: temNaoOk ? '#f59e0b' : '#10b981',
                detalhe: temNaoOk
                    ? 'A conferência foi finalizada, mas existe pelo menos uma unidade marcada como NÃO OK.'
                    : 'A encomenda foi feita e conferida.'
            };
        }

        if (serra.length > 0) {
            return {
                texto: 'FEITA NA SERRA',
                cor: '#3b82f6',
                detalhe: 'A encomenda aparece no histórico da Serra, mas não tem conferência finalizada.'
            };
        }

        if (itensPlano.length > 0) {
            return {
                texto: algunsCancelados ? 'PARCIALMENTE CANCELADA' : 'AINDA NÃO FEITA',
                cor: algunsCancelados ? '#f59e0b' : '#94a3b8',
                detalhe: algunsCancelados
                    ? 'Parte da encomenda foi cancelada, mas ainda existem itens ativos.'
                    : 'A encomenda está no Plano, mas ainda não aparece como feita na Serra.'
            };
        }

        return {
            texto: 'NÃO ENCONTRADA',
            cor: '#64748b',
            detalhe: 'Não foi encontrado registro desta encomenda.'
        };
    }

    function montarHTMLResultado(plano, serra, conferencias) {
        const status = calcularStatusPedido(plano, serra, conferencias);
        const itensAtivos = (plano?.itens || []).filter(i => i.encomendaCancelada !== true);
        const itensCancelados = (plano?.itens || []).filter(i => i.encomendaCancelada === true);

        const totalAtivo = itensAtivos.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const totalCancelado = itensCancelados.reduce((acc, item) => acc + Number(item.totalMetrosAntesCancelamento || item.totalMetros || 0), 0);

        let html = `
            <div style="background:#111827; border:1px solid #334155; border-radius:12px; overflow:hidden; margin-bottom:14px;">
                <div style="background:#1e293b; padding:14px; border-left:6px solid ${status.cor};">
                    <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                        <div>
                            <div style="font-size:18px; font-weight:bold; color:white;">
                                PEDIDO ${atlasTextoSeguro(plano?.pedidoNumero || conferencias[0]?.pedidoNumero || '')}
                            </div>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                                Cliente: <b style="color:white;">${atlasTextoSeguro(plano?.destino || '-')}</b>
                            </div>
                        </div>

                        <span style="background:${status.cor}; color:white; padding:7px 10px; border-radius:8px; font-size:12px; font-weight:bold;">
                            ${status.texto}
                        </span>
                    </div>

                    <div style="color:#cbd5e1; font-size:12px; margin-top:10px;">
                        ${status.detalhe}
                    </div>
                </div>

                <div style="padding:14px;">
        `;

        if (plano) {
            html += `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
                    <div style="background:#0f172a; padding:10px; border-radius:8px;">
                        <div style="color:#94a3b8; font-size:11px;">DATA DO PLANO</div>
                        <b>${atlasTextoSeguro(plano.rel.data || '-')}</b>
                    </div>
                    <div style="background:#0f172a; padding:10px; border-radius:8px;">
                        <div style="color:#94a3b8; font-size:11px;">METROS ATIVOS</div>
                        <b style="color:#10b981;">${totalAtivo.toFixed(2)} m</b>
                    </div>
                </div>
            `;

            html += `
                <h3 style="font-size:14px; margin:0 0 8px 0; color:white;">Itens do Pedido</h3>
                ${(plano.itens || []).map(item => `
                    <div style="background:${item.encomendaCancelada ? '#450a0a' : '#0f172a'}; border:1px solid ${item.encomendaCancelada ? '#ef4444' : '#334155'}; border-radius:8px; padding:10px; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                            <b>${atlasTextoSeguro(item.tipo)} ${atlasTextoSeguro(item.espessura)} mm</b>
                            <span style="color:${item.encomendaCancelada ? '#fca5a5' : '#10b981'}; font-weight:bold;">
                                ${item.encomendaCancelada ? 'CANCELADO' : Number(item.totalMetros || 0).toFixed(2) + ' m'}
                            </span>
                        </div>
                        <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                            RAL ${atlasTextoSeguro(item.ralInferior)}/${atlasTextoSeguro(item.ralSuperior)}<br>
                            ${atlasTextoSeguro(item.quantidadeChapas)} chapas x ${atlasTextoSeguro(item.metrosUnidade)} m
                            ${item.encomendaCancelada ? `
                                <br><b style="color:#fca5a5;">Motivo:</b> ${atlasTextoSeguro(item.motivoCancelamento || '-')}
                                <br><b style="color:#fca5a5;">Cancelado por:</b> ${atlasTextoSeguro(item.canceladoPor || '-')} em ${atlasTextoSeguro(item.canceladoEm || '-')}
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            `;

            if (totalCancelado > 0) {
                html += `
                    <div style="background:#450a0a; border:1px solid #ef4444; border-radius:8px; padding:10px; color:#fca5a5; font-size:12px; margin-top:8px;">
                        Total cancelado: <b>${totalCancelado.toFixed(2)} m</b>
                    </div>
                `;
            }
        }

        if (serra.length > 0) {
            html += `
                <h3 style="font-size:14px; margin:18px 0 8px 0; color:white;">Serra</h3>
                ${serra.map(reg => `
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                        <b>Data: ${atlasTextoSeguro(reg.rel.data)}</b><br>
                        <small style="color:#94a3b8;">Operador: ${atlasTextoSeguro(reg.rel.operador || '-')}</small>
                        ${(reg.itens || []).map(item => `
                            <div style="margin-top:8px; color:#cbd5e1; font-size:12px;">
                                ${atlasTextoSeguro(item.tipo)} ${atlasTextoSeguro(item.esp)} mm -
                                ${Number(item.metros || 0).toFixed(2)} m -
                                RAL ${atlasTextoSeguro(item.ralI)}/${atlasTextoSeguro(item.ralS)}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            `;
        }

        if (conferencias.length > 0) {
            html += `
                <h3 style="font-size:14px; margin:18px 0 8px 0; color:white;">Conferência</h3>
                ${conferencias.map(conf => {
                    const ok = (conf.unidades || []).filter(u => u.status === 'ok').length;
                    const nao = (conf.unidades || []).filter(u => u.status === 'nao').length;
                    const pendente = (conf.unidades || []).filter(u => u.status === 'pendente').length;
                    const statusConfTexto = conf.status === 'finalizado' ? 'OK' : (conf.status === 'stand_by' ? 'STAND BY' : 'FALTA CONFERIR');
                    const statusConfCor = conf.status === 'finalizado' ? '#10b981' : (conf.status === 'stand_by' ? '#ef4444' : '#f59e0b');
                    const motivos = (conf.unidades || [])
                        .filter(u => u.status === 'nao')
                        .flatMap((u, idx) => motivosUnidadeConferenciaSerra(u).map(motivo => ({
                            unidade: idx + 1,
                            motivo,
                            conferidoPor: u.conferidoPor || '-',
                            conferidoEm: u.conferidoEm || '-'
                        })));

                    return `
                        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                                <b>${conf.status === 'finalizado' ? 'Finalizada' : (conf.status === 'stand_by' ? 'Stand by' : 'Em aberto')}</b>
                                <span style="color:${statusConfCor}; font-weight:bold;">
                                    ${statusConfTexto}
                                </span>
                            </div>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">
                                OK: ${ok} | NÃO OK: ${nao} | Pendentes: ${pendente}<br>
                                Finalizado por: ${atlasTextoSeguro(conf.finalizadoPor || '-')}<br>
                                Finalizado em: ${atlasTextoSeguro(conf.finalizadoEm || '-')}
                            </div>
                            ${motivos.length ? `
                                <div style="background:#450a0a; border:1px solid #ef4444; border-radius:8px; padding:10px; color:#fca5a5; font-size:12px; margin-top:8px;">
                                    <b>Motivos do stand by:</b>
                                    <ol style="margin:6px 0 0 18px; padding:0;">
                                        ${motivos.map(m => `<li>Unidade ${m.unidade}: ${atlasTextoSeguro(m.motivo)}<br><span style="color:#fecaca;">Conferido por ${atlasTextoSeguro(m.conferidoPor)} em ${atlasTextoSeguro(m.conferidoEm)}</span></li>`).join('')}
                                    </ol>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            `;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    window.pesquisarEncomendaAtlas = function() {
        const input = document.getElementById('pesquisa-encomenda-input');
        const resultado = document.getElementById('resultado-pesquisa-encomenda');

        if (!input || !resultado) return;

        const numero = input.value.trim().toLowerCase();

        if (!numero) {
            alert('Digite o número da encomenda.');
            return;
        }

        const planos = buscarNoPlano(numero);
        const serra = buscarNaSerra(numero);
        const conferencias = buscarNaConferencia(numero);

        if (planos.length === 0 && serra.length === 0 && conferencias.length === 0) {
            resultado.innerHTML = `
                <div style="background:#111827; border:1px solid #334155; border-radius:12px; padding:20px; text-align:center; color:#94a3b8;">
                    Nenhuma encomenda encontrada com este número.
                </div>
            `;
            return;
        }

        let html = '';

        if (planos.length > 0) {
            planos.forEach(plano => {
                const serraPedido = serra.filter(reg =>
                    (reg.itens || []).some(item => atlasPedidoDescSerra(item.desc) === plano.pedidoNumero)
                );

                const confPedido = conferencias.filter(conf =>
                    String(conf.pedidoNumero) === String(plano.pedidoNumero)
                );

                html += montarHTMLResultado(plano, serraPedido, confPedido);
            });
        } else {
            conferencias.forEach(conf => {
                const serraPedido = serra.filter(reg =>
                    (reg.itens || []).some(item => atlasPedidoDescSerra(item.desc) === conf.pedidoNumero)
                );

                html += montarHTMLResultado(null, serraPedido, [conf]);
            });
        }

        resultado.innerHTML = html;
    };
})();

/* ==========================================================
   PLANO - PLANILHA GERAL COM TODOS OS PEDIDOS
   ========================================================== */

(function() {
    if (window.atlasPlanoPlanilhaGeralAtivo) return;
    window.atlasPlanoPlanilhaGeralAtivo = true;

    function segGeral(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function numGeral(valor) {
        const numero = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(numero) ? numero : 0;
    }

    function opcoesGeral(lista, selecionado, sufixo = '') {
        return (lista || []).map(valor => {
            const limpo = String(valor ?? '');
            const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
            return `<option value="${segGeral(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${segGeral(texto)}</option>`;
        }).join('');
    }

    function modalGeral() {
        let modal = document.getElementById('atlas-plano-geral-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'atlas-plano-geral-modal';
            modal.className = 'atlas-plano-live-modal';
            document.body.appendChild(modal);
        }
        return modal;
    }

    function renderBotaoGeralLive() {
        const area = document.getElementById('atlas-plano-live-pedidos');
        if (!area || area.querySelector('.atlas-plano-geral-barra')) return;
        const totalLinhas = (db_plano_live?.linhasAbertas || []).filter(item => item.modo === 'pedido').length;
        if (!totalLinhas) return;
        area.insertAdjacentHTML('afterbegin', `
            <div class="atlas-plano-geral-barra">
                <button onclick="atlasAbrirPlanilhaGeralLive()">VER TUDO / PLANILHA GERAL</button>
                <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
            </div>
        `);
    }

    function renderBotaoGeralLiveFallback() {
        if (!db_plano_live || document.getElementById('atlas-plano-geral-fallback')) return;
        const totalLinhas = (db_plano_live.linhasAbertas || []).filter(item => item.modo === 'pedido').length;
        if (!totalLinhas) return;

        const titulos = Array.from(document.querySelectorAll('#container-acao-plano h1, #container-acao-plano h2, #container-acao-plano h3, #container-acao-plano h4, #container-acao-plano div, #container-acao-plano span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const alvo = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!alvo) return;

        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-fallback';
        barra.className = 'atlas-plano-geral-barra destaque';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;
        alvo.insertAdjacentElement('afterend', barra);
    }

    function linhasLive() {
        return (db_plano_live?.linhasAbertas || []).filter(item => item.modo === 'pedido');
    }

    window.atlasAbrirPlanilhaGeralLive = function() {
        const linhas = linhasLive();
        if (!linhas.length) return alert('Nao existem pedidos inseridos no plano.');
        const modal = modalGeral();
        const total = linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div>
                        <h2>Planilha geral dos pedidos</h2>
                        <small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small>
                    </div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="geral-add-pedido" placeholder="Pedido">
                    <input id="geral-add-destino" placeholder="Cliente">
                    <input id="geral-add-qtd" type="number" placeholder="Qtd">
                    <input id="geral-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="geral-add-tipo">${opcoesGeral(OPCOES_TIPO_PLANO, linhas[0]?.tipo)}</select>
                    <select id="geral-add-esp">${opcoesGeral(OPCOES_ESPESSURA_PLANO, linhas[0]?.espessura, ' mm')}</select>
                    <select id="geral-add-ral-inf">${opcoesGeral(OPCOES_RAL_INF, linhas[0]?.ralInferior)}</select>
                    <select id="geral-add-ral-sup">${opcoesGeral(OPCOES_RAL_SUP, linhas[0]?.ralSuperior)}</select>
                    <button onclick="atlasAdicionarLinhaGeralLive()">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela">
                        <thead>
                            <tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr>
                        </thead>
                        <tbody>
                            ${linhas.map(item => `
                                <tr>
                                    <td><input id="geral-${item.id}-pedido" value="${segGeral(item.pedidoNumero || '')}"></td>
                                    <td><input id="geral-${item.id}-destino" value="${segGeral(item.destino || '')}"></td>
                                    <td><select id="geral-${item.id}-tipo">${opcoesGeral(OPCOES_TIPO_PLANO, item.tipo)}</select></td>
                                    <td><select id="geral-${item.id}-esp">${opcoesGeral(OPCOES_ESPESSURA_PLANO, item.espessura, ' mm')}</select></td>
                                    <td><select id="geral-${item.id}-ral-inf">${opcoesGeral(OPCOES_RAL_INF, item.ralInferior)}</select></td>
                                    <td><select id="geral-${item.id}-ral-sup">${opcoesGeral(OPCOES_RAL_SUP, item.ralSuperior)}</select></td>
                                    <td><input id="geral-${item.id}-qtd" type="number" value="${segGeral(item.quantidadeChapas || 0)}"></td>
                                    <td><input id="geral-${item.id}-metros" type="number" step="0.01" value="${segGeral(item.metrosUnidade || 0)}"></td>
                                    <td><input id="geral-${item.id}-info" value="${segGeral(item.infoManual || item.descricaoManual || '')}"></td>
                                    <td><input id="geral-${item.id}-urgente" type="checkbox" ${item.urgente ? 'checked' : ''}></td>
                                    <td><b>${Number(item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaGeralLive('${item.id}')">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaGeralLive('${item.id}')" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    window.atlasFecharPlanilhaGeral = function() {
        const modal = document.getElementById('atlas-plano-geral-modal');
        if (modal) modal.style.display = 'none';
    };

    window.atlasSalvarLinhaGeralLive = function(id) {
        const item = (db_plano_live?.linhasAbertas || []).find(linha => String(linha.id) === String(id));
        if (!item) return;
        const qtd = numGeral(document.getElementById(`geral-${id}-qtd`)?.value);
        const metros = numGeral(document.getElementById(`geral-${id}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        item.pedidoNumero = document.getElementById(`geral-${id}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`geral-${id}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`geral-${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`geral-${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`geral-${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`geral-${id}-ral-sup`)?.value || item.ralSuperior;
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`geral-${id}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`geral-${id}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero}`;
        if (item.destino && !destinosPlano.includes(item.destino)) {
            destinosPlano.push(item.destino);
            destinosPlano.sort();
            salvarDestinosPlano();
        }
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaGeralLive();
    };

    window.atlasExcluirLinhaGeralLive = function(id) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        if (!confirm('Excluir esta linha?')) return;
        db_plano_live.linhasAbertas = (db_plano_live.linhasAbertas || []).filter(item => String(item.id) !== String(id));
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        if (linhasLive().length) atlasAbrirPlanilhaGeralLive();
        else atlasFecharPlanilhaGeral();
    };

    window.atlasAdicionarLinhaGeralLive = function() {
        if (!db_plano_live) return;
        const pedidoNumero = document.getElementById('geral-add-pedido')?.value.trim() || 'S/N';
        const destino = document.getElementById('geral-add-destino')?.value.trim() || '';
        const qtd = numGeral(document.getElementById('geral-add-qtd')?.value);
        const metros = numGeral(document.getElementById('geral-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        db_plano_live.linhasAbertas.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            modo: 'pedido',
            pedidoNumero,
            destino,
            tipo: document.getElementById('geral-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '',
            espessura: document.getElementById('geral-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '',
            ralInferior: document.getElementById('geral-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('geral-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            descricao: `PEDIDO ${pedidoNumero}`
        });
        if (destino && !destinosPlano.includes(destino)) {
            destinosPlano.push(destino);
            destinosPlano.sort();
            salvarDestinosPlano();
        }
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaGeralLive();
    };

    window.atlasGerarPDFGeralLive = function() {
        const linhas = linhasLive();
        if (!linhas.length) return alert('Nao existem pedidos inseridos.');
        const rel = {
            data: formatarDataPlanoBR(db_plano_live?.dataISO || new Date().toISOString().slice(0, 10)),
            operador: db_plano_live?.operador || '',
            itens: linhas,
            totalGeral: linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0)
        };
        if (typeof gerarPDF_Plano === 'function') gerarPDF_Plano(encodeURIComponent(JSON.stringify(rel)));
    };

    function renderBotaoGeralHistorico(indexPlano) {
        const painel = document.getElementById('atlas-historico-planilha-pedidos');
        if (!painel || painel.querySelector('.atlas-plano-geral-barra')) return;
        painel.insertAdjacentHTML('afterbegin', `
            <div class="atlas-plano-geral-barra">
                <button onclick="atlasAbrirPlanilhaGeralHistorico(${indexPlano})">VER TUDO / PLANILHA GERAL</button>
                <button onclick="atlasGerarPDFGeralHistorico(${indexPlano})" class="pdf">PDF GERAL</button>
            </div>
        `);
    }

    window.atlasAbrirPlanilhaGeralHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        const linhas = (rel?.itens || []).map((item, idx) => ({ item, idx })).filter(reg => reg.item.modo === 'pedido');
        if (!rel || !linhas.length) return alert('Nao existem pedidos neste historico.');
        const modal = modalGeral();
        const total = linhas.reduce((acc, reg) => acc + Number(reg.item.totalMetros || 0), 0);
        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div><h2>Historico - planilha geral</h2><small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small></div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralHistorico(${indexPlano})" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${linhas.map(reg => `
                                <tr>
                                    <td><input id="histgeral-${reg.idx}-pedido" value="${segGeral(reg.item.pedidoNumero || '')}"></td>
                                    <td><input id="histgeral-${reg.idx}-destino" value="${segGeral(reg.item.destino || '')}"></td>
                                    <td><select id="histgeral-${reg.idx}-tipo">${opcoesGeral(OPCOES_TIPO_PLANO, reg.item.tipo)}</select></td>
                                    <td><select id="histgeral-${reg.idx}-esp">${opcoesGeral(OPCOES_ESPESSURA_PLANO, reg.item.espessura, ' mm')}</select></td>
                                    <td><select id="histgeral-${reg.idx}-ral-inf">${opcoesGeral(OPCOES_RAL_INF, reg.item.ralInferior)}</select></td>
                                    <td><select id="histgeral-${reg.idx}-ral-sup">${opcoesGeral(OPCOES_RAL_SUP, reg.item.ralSuperior)}</select></td>
                                    <td><input id="histgeral-${reg.idx}-qtd" type="number" value="${segGeral(reg.item.quantidadeChapas || 0)}"></td>
                                    <td><input id="histgeral-${reg.idx}-metros" type="number" step="0.01" value="${segGeral(reg.item.metrosUnidade || 0)}"></td>
                                    <td><input id="histgeral-${reg.idx}-info" value="${segGeral(reg.item.infoManual || reg.item.descricaoManual || '')}"></td>
                                    <td><input id="histgeral-${reg.idx}-urgente" type="checkbox" ${reg.item.urgente ? 'checked' : ''}></td>
                                    <td><b>${Number(reg.item.totalMetros || 0).toFixed(2)} m</b></td>
                                    <td>
                                        <button onclick="atlasSalvarLinhaGeralHistorico(${indexPlano}, ${reg.idx})">SALVAR</button>
                                        <button onclick="atlasExcluirLinhaGeralHistorico(${indexPlano}, ${reg.idx})" class="perigo">EXCLUIR</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    };

    function recalcularHistoricoGeral(rel) {
        rel.totalGeral = Number((rel.itens || []).reduce((acc, item) => acc + Number(item.totalMetros || 0), 0).toFixed(2));
        if (typeof gerarResumoPlano === 'function') rel.resumo = gerarResumoPlano(rel.itens || []);
    }

    window.atlasSalvarLinhaGeralHistorico = function(indexPlano, idx) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!item) return;
        const qtd = numGeral(document.getElementById(`histgeral-${idx}-qtd`)?.value);
        const metros = numGeral(document.getElementById(`histgeral-${idx}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        item.pedidoNumero = document.getElementById(`histgeral-${idx}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`histgeral-${idx}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`histgeral-${idx}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`histgeral-${idx}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`histgeral-${idx}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`histgeral-${idx}-ral-sup`)?.value || item.ralSuperior;
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`histgeral-${idx}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`histgeral-${idx}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero}`;
        recalcularHistoricoGeral(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha ${item.pedidoNumero} na planilha geral`);
        renderizarGestaoPlanoHistorico(indexPlano);
        atlasAbrirPlanilhaGeralHistorico(indexPlano);
    };

    window.atlasExcluirLinhaGeralHistorico = function(indexPlano, idx) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const rel = db_plano_hist[indexPlano];
        if (!rel?.itens?.[idx]) return;
        if (!confirm('Excluir esta linha do historico?')) return;
        rel.itens.splice(idx, 1);
        recalcularHistoricoGeral(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, 'Excluiu linha na planilha geral');
        renderizarGestaoPlanoHistorico(indexPlano);
        atlasAbrirPlanilhaGeralHistorico(indexPlano);
    };

    window.atlasGerarPDFGeralHistorico = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;
        if (typeof gerarPDF_Plano === 'function') gerarPDF_Plano(encodeURIComponent(JSON.stringify(rel)));
    };

    const atualizarTelaGeralOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarTelaGeralOriginal();
        renderBotaoGeralLive();
        renderBotaoGeralLiveFallback();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const renderGestaoGeralOriginal = window.renderizarGestaoPlanoHistorico || renderizarGestaoPlanoHistorico;
    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        renderGestaoGeralOriginal(indexPlano);
        setTimeout(() => renderBotaoGeralHistorico(indexPlano), 0);
    };
    renderizarGestaoPlanoHistorico = window.renderizarGestaoPlanoHistorico;
})();

/* ==========================================================
   PLANO - REAPLICAR DESTAQUE URGENTE FINAL
   ========================================================== */

(function() {
    if (window.atlasPlanoUrgenteFinalDepoisAtivo) return;
    window.atlasPlanoUrgenteFinalDepoisAtivo = true;

    const abrirFormularioPlanoUrgenteDepois = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirFormularioPlanoUrgenteDepois(modo);
        if (typeof window.atlasPlanoLiveAtualizarUrgente === 'function') window.atlasPlanoLiveAtualizarUrgente();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;
})();

/* ==========================================================
   PLANO - CORRECAO FINAL ABSOLUTA: MESCLAR E MANTER BOTAO
   ========================================================== */

(function() {
    if (window.atlasPlanoMesclaFinalAbsolutaAtivo) return;
    window.atlasPlanoMesclaFinalAbsolutaAtivo = true;

    const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const num = valor => {
        const n = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };
    const safe = valor => String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const idKey = valor => String(valor ?? '').replace(/[^a-z0-9]/gi, '_');
    const options = (lista, selecionado, sufixo = '') => (lista || []).map(v => {
        const limpo = String(v ?? '');
        const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
        return `<option value="${esc(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${esc(texto)}</option>`;
    }).join('');

    function pedidosLive() {
        return (db_plano_live?.linhasAbertas || []).filter(item => item.modo === 'pedido');
    }

    function grupos(linhas) {
        const mapa = {};
        const ordem = [];
        linhas.forEach(item => {
            const chave = `${item.pedidoNumero || 'S/N'}|||${item.destino || ''}`;
            if (!mapa[chave]) {
                mapa[chave] = { chave, pedido: item.pedidoNumero || 'S/N', destino: item.destino || '', linhas: [] };
                ordem.push(mapa[chave]);
            }
            mapa[chave].linhas.push(item);
        });
        return ordem;
    }

    function modal() {
        let el = document.getElementById('atlas-plano-geral-modal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'atlas-plano-geral-modal';
            el.className = 'atlas-plano-live-modal';
            document.body.appendChild(el);
        }
        return el;
    }

    function celulasGrupo(grupo) {
        const base = grupo.linhas[0] || {};
        const id = `abs-${idKey(grupo.chave)}`;
        return `
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula">
                <input id="${id}-pedido" value="${esc(grupo.pedido)}">
                <button onclick="atlasExcluirPedidoGeralLive('${safe(grupo.pedido)}', '${safe(grupo.destino)}')" style="width:100%; margin-top:8px; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:6px; font-weight:bold;">APAGAR PEDIDO</button>
            </td>
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula"><input id="${id}-destino" value="${esc(grupo.destino)}"></td>
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula"><select id="${id}-tipo">${options(OPCOES_TIPO_PLANO, base.tipo)}</select></td>
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula"><select id="${id}-esp">${options(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select></td>
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula"><select id="${id}-ral-inf">${options(OPCOES_RAL_INF, base.ralInferior)}</select></td>
            <td rowspan="${grupo.linhas.length}" class="atlas-mescla-celula"><select id="${id}-ral-sup">${options(OPCOES_RAL_SUP, base.ralSuperior)}</select></td>
        `;
    }

    function aplicarGrupo(chave, item) {
        const id = `abs-${idKey(chave)}`;
        item.pedidoNumero = document.getElementById(`${id}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${id}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${id}-ral-sup`)?.value || item.ralSuperior;
    }

    window.atlasAbrirPlanilhaGeralLive = function() {
        const linhas = pedidosLive();
        if (!linhas.length) return alert('Nao existem pedidos inseridos no plano.');
        const total = linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const htmlGrupos = grupos(linhas).map(grupo => grupo.linhas.map((item, index) => `
            <tr>
                ${index === 0 ? celulasGrupo(grupo) : ''}
                <td><input id="geral-${item.id}-qtd" type="number" value="${esc(item.quantidadeChapas || 0)}"></td>
                <td><input id="geral-${item.id}-metros" type="number" step="0.01" value="${esc(item.metrosUnidade || 0)}"></td>
                <td><input id="geral-${item.id}-info" value="${esc(item.infoManual || item.descricaoManual || '')}"></td>
                <td><input id="geral-${item.id}-urgente" type="checkbox" ${item.urgente ? 'checked' : ''}></td>
                <td><b>${Number(item.totalMetros || 0).toFixed(2)} m</b></td>
                <td>
                    <button onclick="atlasSalvarLinhaGeralLive('${item.id}', '${safe(grupo.chave)}')">SALVAR</button>
                    <button onclick="atlasExcluirLinhaGeralLive('${item.id}')" class="perigo">EXCLUIR</button>
                </td>
            </tr>
        `).join('')).join('');

        const el = modal();
        el.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div><h2>Planilha geral dos pedidos</h2><small>${linhas.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small></div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
                        <button onclick="atlasFecharPlanilhaGeral()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="geral-add-pedido" placeholder="Pedido">
                    <input id="geral-add-destino" placeholder="Cliente">
                    <input id="geral-add-qtd" type="number" placeholder="Qtd">
                    <input id="geral-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="geral-add-tipo">${options(OPCOES_TIPO_PLANO, linhas[0]?.tipo)}</select>
                    <select id="geral-add-esp">${options(OPCOES_ESPESSURA_PLANO, linhas[0]?.espessura, ' mm')}</select>
                    <select id="geral-add-ral-inf">${options(OPCOES_RAL_INF, linhas[0]?.ralInferior)}</select>
                    <select id="geral-add-ral-sup">${options(OPCOES_RAL_SUP, linhas[0]?.ralSuperior)}</select>
                    <button onclick="atlasAdicionarLinhaGeralLive()">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>${htmlGrupos}</tbody>
                    </table>
                </div>
            </div>
        `;
        el.style.display = 'flex';
    };

    window.atlasSalvarLinhaGeralLive = function(id, chave = '') {
        const item = pedidosLive().find(linha => String(linha.id) === String(id));
        if (!item) return;
        const qtd = num(document.getElementById(`geral-${id}-qtd`)?.value);
        const metros = num(document.getElementById(`geral-${id}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        if (chave) aplicarGrupo(chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetros = Number((qtd * metros).toFixed(2));
        item.infoManual = document.getElementById(`geral-${id}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`geral-${id}-urgente`)?.checked;
        item.descricao = `PEDIDO ${item.pedidoNumero || 'S/N'}`;
        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        atlasAbrirPlanilhaGeralLive();
    };

    window.atlasExcluirPedidoGeralLive = function(pedido, destino) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const linhas = pedidosLive().filter(item =>
            String(item.pedidoNumero || 'S/N') === String(pedido || 'S/N') &&
            String(item.destino || '') === String(destino || '')
        );
        if (!linhas.length) return alert('Pedido nao encontrado.');
        const total = linhas.reduce((acc, item) => acc + Number(item.totalMetros || 0), 0);
        const confirmar = confirm(`Apagar o pedido completo?\n\nPedido: ${pedido || 'S/N'}\nCliente: ${destino || '-'}\nLinhas: ${linhas.length}\nTotal: ${total.toFixed(2)} m`);
        if (!confirmar) return;

        db_plano_live.linhasAbertas = (db_plano_live.linhasAbertas || []).filter(item => !(
            item.modo === 'pedido' &&
            String(item.pedidoNumero || 'S/N') === String(pedido || 'S/N') &&
            String(item.destino || '') === String(destino || '')
        ));

        if (db_plano_live.pedidoAtual &&
            String(db_plano_live.pedidoAtual.numero || '') === String(pedido || '') &&
            String(db_plano_live.pedidoAtual.destino || '') === String(destino || '')) {
            db_plano_live.pedidoAtual = null;
        }

        if (typeof window.atlasRegistrarAuditoria === 'function') {
            window.atlasRegistrarAuditoria('Apagou pedido do plano em andamento', 'plano', `Pedido: ${pedido || 'S/N'} | Cliente: ${destino || '-'} | Linhas: ${linhas.length} | Total: ${total.toFixed(2)} m`);
        }

        salvarPlanoLive();
        atualizarTelaPlanoAtual();
        if (pedidosLive().length) atlasAbrirPlanilhaGeralLive();
        else atlasFecharPlanilhaGeral();
    };

    function garantirBotao() {
        if (!pedidosLive().length) return;
        if (document.getElementById('atlas-plano-geral-final-absoluto')) return;
        const container = document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
        if (!container) return;
        const titulos = Array.from(container.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const ref = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!ref) return;
        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-final-absoluto';
        barra.className = 'atlas-plano-geral-barra destaque persistente';
        barra.innerHTML = `<button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button><button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>`;
        ref.insertAdjacentElement('afterend', barra);
    }

    function agenda() {
        setTimeout(garantirBotao, 0);
        setTimeout(garantirBotao, 200);
        setTimeout(garantirBotao, 700);
    }

    const atualizar = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizar();
        document.getElementById('atlas-plano-geral-final-absoluto')?.remove();
        agenda();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrir = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrir(modo);
        document.getElementById('atlas-plano-geral-final-absoluto')?.remove();
        agenda();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizar = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizar();
        document.getElementById('atlas-plano-geral-final-absoluto')?.remove();
        agenda();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;
})();

/* ==========================================================
   PLANO - BOTAO GERAL UNICO DEFINITIVO
   ========================================================== */

(function() {
    if (window.atlasPlanoBotaoUnicoDefinitivoAtivo) return;
    window.atlasPlanoBotaoUnicoDefinitivoAtivo = true;

    function temPedidoPlano() {
        return (db_plano_live?.linhasAbertas || []).some(item => item.modo === 'pedido');
    }

    function areaPlanoVisivel() {
        return document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
    }

    function removerTodosBotoesGerais() {
        document.querySelectorAll([
            '#atlas-plano-geral-persistente',
            '#atlas-plano-geral-fallback',
            '#atlas-plano-geral-persistente-final',
            '#atlas-plano-geral-final-absoluto',
            '#atlas-plano-geral-persistente-final',
            '#atlas-plano-geral-unico',
            '#atlas-plano-geral-final-absoluto',
            '.atlas-plano-geral-barra'
        ].join(',')).forEach(el => el.remove());
    }

    function inserirBotaoUnicoDefinitivo() {
        const area = areaPlanoVisivel();
        if (!area) return;

        removerTodosBotoesGerais();
        if (!temPedidoPlano()) return;

        const titulos = Array.from(area.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const referencia = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!referencia) return;

        const barra = document.createElement('div');
        barra.id = 'atlas-plano-geral-unico-definitivo';
        barra.className = 'atlas-plano-geral-barra-unica';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;
        referencia.insertAdjacentElement('afterend', barra);
    }

    function agendarBotaoUnicoDefinitivo() {
        setTimeout(inserirBotaoUnicoDefinitivo, 0);
        setTimeout(inserirBotaoUnicoDefinitivo, 250);
        setTimeout(inserirBotaoUnicoDefinitivo, 900);
        setTimeout(inserirBotaoUnicoDefinitivo, 1600);
    }

    const atualizarOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarOriginal();
        agendarBotaoUnicoDefinitivo();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrirOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirOriginal(modo);
        agendarBotaoUnicoDefinitivo();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizarOriginal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizarOriginal();
        agendarBotaoUnicoDefinitivo();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;

    const observer = new MutationObserver(() => {
        if (!temPedidoPlano()) return;
        const botoes = document.querySelectorAll('.atlas-plano-geral-barra, .atlas-plano-geral-barra-unica');
        if (botoes.length !== 1 || !document.getElementById('atlas-plano-geral-unico-definitivo')) {
            clearTimeout(window.atlasPlanoBotaoUnicoTimer);
            window.atlasPlanoBotaoUnicoTimer = setTimeout(inserirBotaoUnicoDefinitivo, 80);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

/* ==========================================================
   PLANO - BOTAO CANONICO UNICO, SEM DUPLICATAS VISUAIS
   ========================================================== */

(function() {
    if (window.atlasPlanoBotaoCanonicoUnicoAtivo) return;
    window.atlasPlanoBotaoCanonicoUnicoAtivo = true;

    function temPedido() {
        return (db_plano_live?.linhasAbertas || []).some(item => item.modo === 'pedido');
    }

    function limparCanonicoDuplicado() {
        const canonicos = Array.from(document.querySelectorAll('#atlas-plano-botao-canonico'));
        canonicos.slice(1).forEach(el => el.remove());
    }

    function inserirCanonico() {
        limparCanonicoDuplicado();

        const existente = document.getElementById('atlas-plano-botao-canonico');
        if (!temPedido()) {
            existente?.remove();
            return;
        }
        if (existente) return;

        const area = document.getElementById('container-acao-plano') || document.getElementById('render-modulo');
        if (!area) return;

        const titulos = Array.from(area.querySelectorAll('h1,h2,h3,h4,div,span'))
            .filter(el => String(el.textContent || '').trim().toLowerCase() === 'pedidos inseridos');
        const referencia = titulos[titulos.length - 1] || document.getElementById('plano-lista-aberta');
        if (!referencia) return;

        const barra = document.createElement('div');
        barra.id = 'atlas-plano-botao-canonico';
        barra.innerHTML = `
            <button onclick="atlasAbrirPlanilhaGeralLive()">VER TODOS OS PEDIDOS / PLANILHA GERAL</button>
            <button onclick="atlasGerarPDFGeralLive()" class="pdf">PDF GERAL</button>
        `;
        referencia.insertAdjacentElement('afterend', barra);
    }

    function agendarCanonico() {
        setTimeout(inserirCanonico, 0);
        setTimeout(inserirCanonico, 150);
        setTimeout(inserirCanonico, 500);
        setTimeout(inserirCanonico, 1200);
    }

    const atualizarOriginal = window.atualizarTelaPlanoAtual || atualizarTelaPlanoAtual;
    window.atualizarTelaPlanoAtual = function() {
        atualizarOriginal();
        agendarCanonico();
    };
    atualizarTelaPlanoAtual = window.atualizarTelaPlanoAtual;

    const abrirOriginal = window.abrirFormularioPlano || abrirFormularioPlano;
    window.abrirFormularioPlano = function(modo) {
        abrirOriginal(modo);
        agendarCanonico();
    };
    abrirFormularioPlano = window.abrirFormularioPlano;

    const finalizarOriginal = window.finalizarPedidoPlano || finalizarPedidoPlano;
    window.finalizarPedidoPlano = function() {
        finalizarOriginal();
        agendarCanonico();
    };
    finalizarPedidoPlano = window.finalizarPedidoPlano;

    new MutationObserver(() => {
        clearTimeout(window.atlasPlanoBotaoCanonicoTimer);
        window.atlasPlanoBotaoCanonicoTimer = setTimeout(inserirCanonico, 120);
    }).observe(document.body, { childList: true, subtree: true });
})();

/* ==========================================================
   PLANO HISTORICO - GERIR NO MESMO MODELO DA PLANILHA GERAL
   ========================================================== */

(function() {
    if (window.atlasHistoricoGerirPlanilhaFinalAtivo) return;
    window.atlasHistoricoGerirPlanilhaFinalAtivo = true;

    const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const num = valor => {
        const n = Number(String(valor ?? '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };
    const key = valor => String(valor ?? '').replace(/[^a-z0-9]/gi, '_');
    const js = valor => String(valor ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const opts = (lista, selecionado, sufixo = '') => (lista || []).map(v => {
        const limpo = String(v ?? '');
        const texto = sufixo && !limpo.toLowerCase().includes(String(sufixo).toLowerCase()) ? `${limpo}${sufixo}` : limpo;
        return `<option value="${esc(limpo)}" ${String(selecionado) === limpo ? 'selected' : ''}>${esc(texto)}</option>`;
    }).join('');
    const aceitaPerfil = tipo => String(tipo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes('fachada');

    function linhas(rel) {
        return (rel?.itens || []).map((item, idx) => ({ item, idx })).filter(reg => reg.item.modo === 'pedido');
    }

    function grupos(registros) {
        const mapa = {};
        const ordem = [];
        registros.forEach(reg => {
            const item = reg.item;
            const chave = [
                item.pedidoNumero || 'S/N',
                item.destino || '',
                item.tipo || '',
                item.espessura || '',
                item.ralInferior || '',
                item.ralSuperior || ''
            ].join('|||');
            if (!mapa[chave]) {
                mapa[chave] = { chave, linhas: [] };
                ordem.push(mapa[chave]);
            }
            mapa[chave].linhas.push(reg);
        });
        return ordem;
    }

    function recalcular(rel) {
        rel.totalGeral = Number((rel.itens || []).reduce((acc, item) => acc + num(item.totalMetros), 0).toFixed(2));
        if (typeof gerarResumoPlano === 'function') rel.resumo = gerarResumoPlano(rel.itens || []);
    }

    function aplicarGrupo(chave, item) {
        const id = `hist-final-${key(chave)}`;
        item.pedidoNumero = document.getElementById(`${id}-pedido`)?.value.trim() || item.pedidoNumero || 'S/N';
        item.destino = document.getElementById(`${id}-destino`)?.value.trim() || item.destino || '';
        item.tipo = document.getElementById(`${id}-tipo`)?.value || item.tipo;
        item.espessura = document.getElementById(`${id}-esp`)?.value || item.espessura;
        item.ralInferior = document.getElementById(`${id}-ral-inf`)?.value || item.ralInferior;
        item.ralSuperior = document.getElementById(`${id}-ral-sup`)?.value || item.ralSuperior;
        item.perfilInferior = aceitaPerfil(item.tipo) ? (item.perfilInferior || item.acabamentoInferior || 'Canelada') : '';
        item.perfilSuperior = aceitaPerfil(item.tipo) ? (item.perfilSuperior || item.acabamentoSuperior || 'Canelada') : '';
        item.acabamentoInferior = item.perfilInferior;
        item.acabamentoSuperior = item.perfilSuperior;
    }

    function cellsGrupo(grupo) {
        const item = grupo.linhas[0]?.item || {};
        const id = `hist-final-${key(grupo.chave)}`;
        const span = grupo.linhas.length;
        return `
            <td rowspan="${span}" class="atlas-mescla-celula">
                <input id="${id}-pedido" value="${esc(item.pedidoNumero || '')}">
                <button onclick="atlasExcluirPedidoGestaoHistoricoPlanilha(${window.atlasHistoricoPlanoAtualIndex ?? 0}, '${js(item.pedidoNumero || 'S/N')}', '${js(item.destino || '')}')" style="width:100%; margin-top:8px; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:6px; font-weight:bold;">APAGAR PEDIDO</button>
            </td>
            <td rowspan="${span}" class="atlas-mescla-celula"><input id="${id}-destino" value="${esc(item.destino || '')}"></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-tipo">${opts(OPCOES_TIPO_PLANO, item.tipo)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-esp">${opts(OPCOES_ESPESSURA_PLANO, item.espessura, ' mm')}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-inf">${opts(OPCOES_RAL_INF, item.ralInferior)}</select></td>
            <td rowspan="${span}" class="atlas-mescla-celula"><select id="${id}-ral-sup">${opts(OPCOES_RAL_SUP, item.ralSuperior)}</select></td>
        `;
    }

    window.renderizarGestaoPlanoHistorico = function(indexPlano) {
        window.atlasHistoricoPlanoAtualIndex = indexPlano;
        const rel = db_plano_hist[indexPlano];
        const modal = document.getElementById('modal-plano-historico');
        if (!rel || !modal) return;

        const registros = linhas(rel);
        const total = registros.reduce((acc, reg) => acc + num(reg.item.totalMetros), 0);
        const base = registros[0]?.item || {};
        const corpo = grupos(registros).map(grupo => grupo.linhas.map((reg, pos) => {
            const item = reg.item;
            return `
                <tr>
                    ${pos === 0 ? cellsGrupo(grupo) : ''}
                    <td><input id="hist-final-${reg.idx}-qtd" type="number" value="${esc(item.quantidadeChapas || 0)}"></td>
                    <td><input id="hist-final-${reg.idx}-metros" type="number" step="0.01" value="${esc(item.metrosUnidade || 0)}"></td>
                    <td><input id="hist-final-${reg.idx}-info" value="${esc(item.infoManual || item.descricaoManual || '')}"></td>
                    <td><input id="hist-final-${reg.idx}-urgente" type="checkbox" ${item.urgente ? 'checked' : ''}></td>
                    <td><b>${num(item.totalMetros).toFixed(2)} m</b></td>
                    <td>
                        <button onclick="atlasSalvarGestaoHistoricoPlanilha(${indexPlano}, ${reg.idx}, '${js(grupo.chave)}')">SALVAR</button>
                        <button onclick="atlasExcluirGestaoHistoricoPlanilha(${indexPlano}, ${reg.idx})" class="perigo">EXCLUIR</button>
                    </td>
                </tr>
            `;
        }).join('')).join('');

        modal.innerHTML = `
            <div class="atlas-plano-live-janela">
                <div class="atlas-plano-live-topo">
                    <div><h2>Planilha geral dos pedidos</h2><small>${registros.length} linha(s) | Total: <b>${total.toFixed(2)} m</b></small></div>
                    <div class="atlas-plano-live-topo-acoes">
                        <button onclick="atlasGerarPDFGeralHistorico(${indexPlano})" class="pdf">PDF GERAL</button>
                        <button onclick="fecharGestaoPlanoHistorico()">FECHAR</button>
                    </div>
                </div>
                <div class="atlas-plano-live-add">
                    <input id="hist-final-add-pedido" placeholder="Pedido">
                    <input id="hist-final-add-destino" placeholder="Cliente">
                    <input id="hist-final-add-qtd" type="number" placeholder="Qtd">
                    <input id="hist-final-add-metros" type="number" step="0.01" placeholder="Metros">
                    <select id="hist-final-add-tipo">${opts(OPCOES_TIPO_PLANO, base.tipo)}</select>
                    <select id="hist-final-add-esp">${opts(OPCOES_ESPESSURA_PLANO, base.espessura, ' mm')}</select>
                    <select id="hist-final-add-ral-inf">${opts(OPCOES_RAL_INF, base.ralInferior)}</select>
                    <select id="hist-final-add-ral-sup">${opts(OPCOES_RAL_SUP, base.ralSuperior)}</select>
                    <button onclick="atlasInserirGestaoHistoricoPlanilha(${indexPlano})">INSERIR</button>
                </div>
                <div class="atlas-plano-live-wrap">
                    <table class="atlas-plano-live-tabela atlas-plano-geral-tabela atlas-planilha-mesclada">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Esp.</th><th>RAL Inf.</th><th>RAL Sup.</th><th>Qtd</th><th>Metros</th><th>Obs.</th><th>Urg.</th><th>Total</th><th>Acoes</th></tr></thead>
                        <tbody>${corpo || '<tr><td colspan="12">Nenhum pedido neste plano.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    };

    window.atlasSalvarGestaoHistoricoPlanilha = function(indexPlano, idx, chave) {
        const rel = db_plano_hist[indexPlano];
        const item = rel?.itens?.[idx];
        if (!rel || !item) return;
        const qtd = num(document.getElementById(`hist-final-${idx}-qtd`)?.value);
        const metros = num(document.getElementById(`hist-final-${idx}-metros`)?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos.');
        aplicarGrupo(chave, item);
        item.quantidadeChapas = qtd;
        item.metrosUnidade = metros;
        item.totalMetrosAntesCancelamento = Number((qtd * metros).toFixed(2));
        item.totalMetros = item.encomendaCancelada ? 0 : item.totalMetrosAntesCancelamento;
        item.infoManual = document.getElementById(`hist-final-${idx}-info`)?.value.trim() || '';
        item.descricaoManual = item.infoManual;
        item.urgente = !!document.getElementById(`hist-final-${idx}-urgente`)?.checked;
        item.descricao = `${item.tipo} ${item.espessura} mm`;
        recalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Editou linha ${item.pedidoNumero || 'S/N'} na planilha geral`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.atlasExcluirGestaoHistoricoPlanilha = function(indexPlano, idx) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const rel = db_plano_hist[indexPlano];
        if (!rel?.itens?.[idx]) return;
        if (!confirm('Excluir esta linha do historico?')) return;
        rel.itens.splice(idx, 1);
        recalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, 'Excluiu linha na planilha geral');
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.atlasExcluirPedidoGestaoHistoricoPlanilha = function(indexPlano, pedidoNumero, destino) {
        if (!usuarioPodeExcluirModulo('plano')) return alert('Sem permissao para excluir no Plano.');
        const rel = db_plano_hist[indexPlano];
        if (!rel) return alert('Plano nao encontrado.');
        const itens = (rel.itens || []).filter(item =>
            item.modo === 'pedido' &&
            String(item.pedidoNumero || 'S/N') === String(pedidoNumero || 'S/N') &&
            String(item.destino || '') === String(destino || '')
        );
        if (!itens.length) return alert('Pedido nao encontrado.');
        const total = itens.reduce((acc, item) => acc + num(item.totalMetros), 0);
        const confirmar = confirm(`Apagar o pedido completo?\n\nPedido: ${pedidoNumero || 'S/N'}\nCliente: ${destino || '-'}\nLinhas: ${itens.length}\nTotal: ${total.toFixed(2)} m`);
        if (!confirmar) return;

        rel.itens = (rel.itens || []).filter(item => !(
            item.modo === 'pedido' &&
            String(item.pedidoNumero || 'S/N') === String(pedidoNumero || 'S/N') &&
            String(item.destino || '') === String(destino || '')
        ));

        if (!rel.itens.length) {
            db_plano_hist.splice(indexPlano, 1);
            localStorage.setItem('atlas_plano_hist', JSON.stringify(db_plano_hist));
            if (typeof window.atlasRegistrarAuditoria === 'function') {
                window.atlasRegistrarAuditoria('Apagou pedido completo do plano', 'plano', `Pedido: ${pedidoNumero || 'S/N'} | Cliente: ${destino || '-'} | Linhas: ${itens.length} | Total: ${total.toFixed(2)} m | Plano removido`);
            }
            fecharGestaoPlanoHistorico();
            listarHistoricoPlano();
            return;
        }

        recalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Apagou pedido completo ${pedidoNumero || 'S/N'} - ${destino || '-'}`);
        if (typeof window.atlasRegistrarAuditoria === 'function') {
            window.atlasRegistrarAuditoria('Apagou pedido completo do plano', 'plano', `Pedido: ${pedidoNumero || 'S/N'} | Cliente: ${destino || '-'} | Linhas: ${itens.length} | Total: ${total.toFixed(2)} m`);
        }
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };

    window.atlasInserirGestaoHistoricoPlanilha = function(indexPlano) {
        const rel = db_plano_hist[indexPlano];
        if (!rel) return;
        const qtd = num(document.getElementById('hist-final-add-qtd')?.value);
        const metros = num(document.getElementById('hist-final-add-metros')?.value);
        if (qtd <= 0 || metros <= 0) return alert('Informe quantidade e metros validos para inserir.');
        const tipo = document.getElementById('hist-final-add-tipo')?.value || OPCOES_TIPO_PLANO[0] || '';
        const espessura = document.getElementById('hist-final-add-esp')?.value || OPCOES_ESPESSURA_PLANO[0] || '';
        const fachada = aceitaPerfil(tipo);
        const novo = {
            id: Date.now() + '-' + Math.random().toString(16).slice(2),
            modo: 'pedido',
            pedidoNumero: document.getElementById('hist-final-add-pedido')?.value.trim() || 'S/N',
            destino: document.getElementById('hist-final-add-destino')?.value.trim() || '',
            tipo,
            espessura,
            ralInferior: document.getElementById('hist-final-add-ral-inf')?.value || OPCOES_RAL_INF[0] || '',
            ralSuperior: document.getElementById('hist-final-add-ral-sup')?.value || OPCOES_RAL_SUP[0] || '',
            quantidadeChapas: qtd,
            metrosUnidade: metros,
            totalMetros: Number((qtd * metros).toFixed(2)),
            totalMetrosAntesCancelamento: Number((qtd * metros).toFixed(2)),
            descricao: `${tipo} ${espessura} mm`,
            infoManual: '',
            descricaoManual: '',
            perfilInferior: fachada ? 'Canelada' : '',
            perfilSuperior: fachada ? 'Canelada' : '',
            acabamentoInferior: fachada ? 'Canelada' : '',
            acabamentoSuperior: fachada ? 'Canelada' : '',
            urgente: false
        };
        rel.itens ||= [];
        rel.itens.push(novo);
        recalcular(rel);
        salvarPlanoHistoricoEditado(indexPlano, rel, `Inseriu linha ${novo.pedidoNumero} na planilha geral`);
        renderizarGestaoPlanoHistorico(indexPlano);
        listarHistoricoPlano();
    };
})();

/* ==========================================================
   PLANO - GARANTIR BOTAO APAGAR PEDIDO NA PLANILHA GERAL
   ========================================================== */
(function() {
    if (window.atlasGarantirBotaoApagarPedidoPlanoAtivo) return;
    window.atlasGarantirBotaoApagarPedidoPlanoAtivo = true;

    function injetarBotoesApagarPedidoPlano() {
        const indexPlano = Number(window.atlasHistoricoPlanoAtualIndex ?? -1);

        [
            { el: document.getElementById('modal-plano-historico'), tipo: 'historico' },
            { el: document.getElementById('atlas-plano-geral-modal'), tipo: 'live' }
        ].forEach(ctx => {
            const modal = ctx.el;
            if (!modal || modal.style.display === 'none') return;

            modal.querySelectorAll('td[rowspan]').forEach(td => {
                const inputPedido = td.querySelector('input[id$="-pedido"]');
                if (!inputPedido || td.querySelector('.atlas-btn-apagar-pedido-injetado') || Array.from(td.querySelectorAll('button')).some(botao => String(botao.textContent || '').trim().toLowerCase() === 'apagar pedido')) return;
                const linha = td.closest('tr');
                const inputCliente = linha?.querySelector('input[id$="-destino"]');
                const pedido = inputPedido.value || 'S/N';
                const destino = inputCliente?.value || '';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'atlas-btn-apagar-pedido-injetado';
                btn.textContent = 'APAGAR PEDIDO';
                btn.style.cssText = 'width:100%; margin-top:8px; background:#7f1d1d; color:white; border:none; padding:9px; border-radius:6px; font-weight:bold;';
                btn.onclick = function() {
                    if (ctx.tipo === 'live' && typeof window.atlasExcluirPedidoGeralLive === 'function') {
                        window.atlasExcluirPedidoGeralLive(inputPedido.value || pedido, inputCliente?.value || destino);
                        return;
                    }
                    if (!Number.isInteger(indexPlano) || indexPlano < 0) return alert('Plano nao encontrado.');
                    window.atlasExcluirPedidoGestaoHistoricoPlanilha(indexPlano, inputPedido.value || pedido, inputCliente?.value || destino);
                };
                td.appendChild(btn);
            });
        });
    }

    const renderOriginal = window.renderizarGestaoPlanoHistorico;
    if (typeof renderOriginal === 'function') {
        window.renderizarGestaoPlanoHistorico = function(indexPlano) {
            window.atlasHistoricoPlanoAtualIndex = indexPlano;
            const retorno = renderOriginal.apply(this, arguments);
            setTimeout(injetarBotoesApagarPedidoPlano, 0);
            setTimeout(injetarBotoesApagarPedidoPlano, 250);
            return retorno;
        };
        renderizarGestaoPlanoHistorico = window.renderizarGestaoPlanoHistorico;
    }

    document.addEventListener('click', function(evento) {
        const alvo = evento.target.closest('button');
        if (!alvo) return;
        const texto = String(alvo.textContent || '').trim().toLowerCase();
        if (texto.includes('gerir') || texto.includes('planilha') || texto.includes('salvar')) {
            setTimeout(injetarBotoesApagarPedidoPlano, 250);
        }
    });
})();
