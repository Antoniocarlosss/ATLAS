/* ==========================================================
   ATLAS - FIREBASE ORGANIZADO
   Arquivo: firebase-atlas.js
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
   getFirestore,
doc,
getDoc,
getDocs,
getDocsFromServer,
collection,
setDoc,
deleteDoc,
serverTimestamp,
onSnapshot

} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCyUe7O434SYtYR3pb-_wj_QGyeaHbMICg",
    authDomain: "atlaspainel-22f63.firebaseapp.com",
    projectId: "atlaspainel-22f63",
    storageBucket: "atlaspainel-22f63.firebasestorage.app",
    messagingSenderId: "794861110337",
    appId: "1:794861110337:web:b1a673d370e996d9f432c0",
    measurementId: "G-4PD1RWEYWN"
};

const atlasFirebaseApp = initializeApp(firebaseConfig);
const atlasFirestore = getFirestore(atlasFirebaseApp);

let atlasFirebaseBloqueado = false;
let atlasFirebaseTimer = null;
let atlasFirebaseEnviando = false;
let atlasFirebaseEnvioPendente = false;
let atlasFirebaseUltimoHistoricoBackupMs = 0;
let atlasFirebaseUltimoSnapshotAutomaticoMs = 0;
let atlasFirebaseUltimaAlteracaoLocal = 0;
const ATLAS_FIREBASE_SYNC_KEY = "atlas_sync_local_updated_ms";
const ATLAS_RELATORIOS_EXCLUIDOS_KEY = "atlas_relatorios_excluidos";
const ATLAS_FIREBASE_HISTORICO_BACKUP_INTERVALO_MS = 5 * 60 * 1000;
const ATLAS_FIREBASE_SNAPSHOT_AUTOMATICO_INTERVALO_MS = 60 * 1000;

function atlasFirebaseNomeUsuario() {
    return document.getElementById("user-display")?.innerText || "SEM USUARIO";
}

function atlasParseJSON(chave, fallback) {
    try {
        return JSON.parse(localStorage.getItem(chave)) ?? fallback;
    } catch (erro) {
        return fallback;
    }
}

function atlasFirebaseChaveTemporaria(chave) {
    return [
        "atlas_dispositivos_online",
        "atlas_atualizacoes_confirmadas",
        "atlas_atualizacoes_solicitadas_local",
        "atlas_atualizacao_pendente_info",
        "atlas_atualizacao_global_info",
        "atlas_forcar_atualizacao_usuarios",
        "atlas_versao_publicada_info",
        "atlas_sistema_versao",
        "atlas_sistema_mostrar_atualizado",
        "atlas_sistema_forcar_recarregar_sem_cache",
        "atlas_dispositivo_ultimo_sync_ms",
        "atlas_guias_editando_ate",
        "atlas_sessao_usuario_id"
    ].includes(chave)
        || String(chave || "").startsWith("atlas_update_")
        || String(chave || "").startsWith("atlas_sistema_cache_limpo_")
        || String(chave || "").startsWith("atlas_backup_local_")
        || String(chave || "") === "atlas_backups_locais_lista"
        || String(chave || "").startsWith("atlas_dispositivo_");
}

function atlasFirebaseChaveSincronizada(chave) {
    return chave && !atlasFirebaseChaveTemporaria(chave) && (chave.startsWith("atlas_") || chave === "historicoBobines");
}

function atlasFirebaseAplicarGuiasInjecao(dados) {
    const localAtual = atlasParseJSON("atlas_guias_injecao", {});
    const localMs = Number(localAtual?._atlasMeta?.atualizadoEmMs || 0);
    const nuvemMs = Number(dados?._atlasMeta?.atualizadoEmMs || 0);
    if (localMs && nuvemMs && localMs >= nuvemMs) return false;
    if (window.atlasGuiasInjecaoSalvandoLocal === true && (!nuvemMs || localMs >= nuvemMs)) return false;

    const novoValor = JSON.stringify(dados || {});
    if (localStorage.getItem("atlas_guias_injecao") === novoValor) return false;

    atlasFirebaseBloqueado = true;
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_guias_injecao", novoValor);
    atlasFirebaseBloqueado = false;

    window.dispatchEvent(new CustomEvent("atlasDadosNuvemAtualizados", {
        detail: { chaves: ["atlas_guias_injecao"], origem: "guias_injecao" }
    }));

    return true;
}

function atlasFirebaseMesclarUsuario(local, nuvem) {
    if (String(local?.id || nuvem?.id || "").trim().toLowerCase() === "admin") {
        return { id: "admin", nome: "ADMIN", senha: "123", cargo: "admin", bloqueado: false, _atlasUsuarioAtualizadoEm: Date.now() };
    }
    if (!local) return nuvem;
    if (!nuvem) return local;

    if (local.bloqueado === true && nuvem.bloqueado !== true) {
        return { ...nuvem, bloqueado: true, _atlasUsuarioAtualizadoEm: Date.now() };
    }

    const localAtualizado = Number(local._atlasUsuarioAtualizadoEm || 0);
    const nuvemAtualizado = Number(nuvem._atlasUsuarioAtualizadoEm || 0);

    if (localAtualizado > nuvemAtualizado) return local;
    if (nuvemAtualizado > localAtualizado) return nuvem;

    return nuvem;
}

function atlasUsuariosExcluidosFirebase() {
    const excluidos = atlasParseJSON("atlas_usuarios_excluidos", {});
    if (excluidos && typeof excluidos === "object" && excluidos.admin) {
        delete excluidos.admin;
        localStorage.setItem("atlas_usuarios_excluidos", JSON.stringify(excluidos));
    }
    return excluidos && typeof excluidos === "object" ? excluidos : {};
}

function atlasUsuarioFoiExcluidoFirebase(idUsuario) {
    const id = String(idUsuario || "").trim().toLowerCase();
    if (id === "admin") return false;
    return Boolean(id && atlasUsuariosExcluidosFirebase()[id]);
}

async function atlasFirebaseBaixarUsuariosExcluidosDireto() {
    const snap = await getDocs(collection(atlasFirestore, "usuarios_excluidos"));
    const excluidosLocais = atlasUsuariosExcluidosFirebase();
    let mudou = false;

    snap.docs.forEach(d => {
        const dados = d.data() || {};
        const id = String(dados.id || d.id || "").trim().toLowerCase();
        if (!id) return;
        if (id === "admin") return;

        const localAtualizado = Number(excluidosLocais[id]?.atualizadoEm || 0);
        const nuvemAtualizado = Number(dados.atualizadoEm || 0);
        if (!excluidosLocais[id] || nuvemAtualizado >= localAtualizado) {
            excluidosLocais[id] = {
                id: dados.id || id,
                nome: dados.nome || dados.id || id,
                cargo: dados.cargo || "",
                excluidoPor: dados.excluidoPor || "SISTEMA",
                excluidoEm: dados.excluidoEm || "",
                atualizadoEm: nuvemAtualizado || Date.now()
            };
            mudou = true;
        }
    });

    if (mudou) {
        atlasFirebaseBloqueado = true;
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_usuarios_excluidos", JSON.stringify(excluidosLocais));
        atlasFirebaseBloqueado = false;
    }

    return excluidosLocais;
}

async function atlasEnviarUsuariosExcluidos() {
    const excluidos = atlasUsuariosExcluidosFirebase();
    await Promise.all(Object.keys(excluidos).map(id => {
        if (String(id).trim().toLowerCase() === "admin") return Promise.resolve();
        const dados = excluidos[id] || {};
        return atlasSetDoc(["usuarios_excluidos", atlasDocId(id)], {
            ...dados,
            id: dados.id || id,
            atualizadoEm: Number(dados.atualizadoEm || Date.now())
        });
    }));
}

function atlasFirebaseMarcarAlteracaoLocal() {
    const agora = Date.now();
    atlasFirebaseUltimaAlteracaoLocal = agora;
    atlasLocalStorageSetItemOriginal.call(localStorage, ATLAS_FIREBASE_SYNC_KEY, String(agora));
}

function atlasFirebaseBackupPodeEntrar(dados, opcoes = {}) {
    if (opcoes.forcar) return true;
    const nuvem = Number(dados?.[ATLAS_FIREBASE_SYNC_KEY] || 0);
    const local = Number(localStorage.getItem(ATLAS_FIREBASE_SYNC_KEY) || 0);
    const totalNuvem = atlasFirebaseContarDadosBackup(dados);
    const totalLocal = atlasFirebaseContarDadosLocais();

    if (totalNuvem > totalLocal) return true;
    if (opcoes.tempoReal && totalNuvem > 0 && nuvem !== local) return true;
    if (!local) return true;
    if (!nuvem) return false;
    return nuvem > local;
}

function atlasDocId(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120) || String(Date.now());
}

function atlasDataPartes(dataBR) {
    const [dia, mes, ano] = String(dataBR || "").split("/");
    return {
        dia: Number(dia) || null,
        mes: Number(mes) || null,
        ano: Number(ano) || null
    };
}

async function atlasSetDoc(caminho, dados) {
    await setDoc(doc(atlasFirestore, ...caminho), {
        ...dados,
        atualizadoPor: atlasFirebaseNomeUsuario(),
        atualizadoEm: serverTimestamp()
    }, { merge: true });
}

async function atlasLimparColecao(nomeColecao) {
    const snap = await getDocs(collection(atlasFirestore, nomeColecao));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

async function atlasFirebaseRemoverUsuarioExcluidoDaNuvem(idUsuario) {
    if (String(idUsuario || "").trim().toLowerCase() === "admin") return;
    const id = atlasDocId(idUsuario);
    if (!id) return;
    const excluidos = atlasUsuariosExcluidosFirebase();
    const idNormalizado = String(idUsuario || "").trim().toLowerCase();
    const dadosExclusao = excluidos[idNormalizado] || {
        id: idUsuario,
        nome: idUsuario,
        cargo: "",
        excluidoPor: atlasFirebaseNomeUsuario(),
        excluidoEm: new Date().toLocaleString("pt-BR"),
        atualizadoEm: Date.now()
    };
    await atlasSetDoc(["usuarios_excluidos", id], {
        ...dadosExclusao,
        id: dadosExclusao.id || idUsuario,
        atualizadoEm: Number(dadosExclusao.atualizadoEm || Date.now())
    });
    await deleteDoc(doc(atlasFirestore, "usuarios", id)).catch(erro => {
        console.warn("Nao foi possivel remover usuario excluido da nuvem:", erro);
    });
}

async function atlasFirebaseLimparUsuarioExcluidoDaNuvem(idUsuario) {
    if (String(idUsuario || "").trim().toLowerCase() === "admin") return;
    const id = atlasDocId(idUsuario);
    if (!id) return;
    await deleteDoc(doc(atlasFirestore, "usuarios_excluidos", id)).catch(erro => {
        console.warn("Nao foi possivel limpar usuario excluido da nuvem:", erro);
    });
}

async function atlasFirebaseRegistrarDispositivo(dados) {
    if (!dados || !dados.id) return;
    const id = atlasDocId(dados.id);
    await atlasSetDoc(["dispositivos_online", id], {
        ...dados,
        id: dados.id,
        online: dados.online !== false,
        saiuEmMs: Number(dados.saiuEmMs || 0),
        saiuEm: dados.saiuEm || "",
        ultimoAcessoMs: Number(dados.ultimoAcessoMs || Date.now())
    });
}

async function atlasFirebaseMarcarDispositivoOffline(dados) {
    if (!dados || !dados.id) return;
    const id = atlasDocId(dados.id);
    const agora = Number(dados.saiuEmMs || Date.now());
    await atlasSetDoc(["dispositivos_online", id], {
        ...dados,
        id: dados.id,
        online: false,
        saiuEmMs: agora,
        saiuEm: dados.saiuEm || new Date(agora).toLocaleString("pt-BR"),
        ultimoAcessoMs: Number(dados.ultimoAcessoMs || agora)
    });
}

async function atlasFirebaseAtualizarUltimoAcessoUsuario(dados) {
    if (!dados || !dados.id) return;
    const id = atlasDocId(dados.id);
    await atlasSetDoc(["usuarios", id], {
        id: dados.id,
        nome: dados.nome || dados.id,
        cargo: dados.cargo || "",
        _atlasUltimoAcessoMs: Number(dados.ultimoAcessoMs || Date.now()),
        _atlasUltimoAcesso: dados.ultimoAcesso || new Date().toLocaleString("pt-BR"),
        _atlasUltimoAcessoVersao: dados.versao || window.ATLAS_SISTEMA_VERSAO || "sem-versao",
        _atlasUltimoAcessoAparelho: dados.aparelho || "",
        _atlasUltimoAcessoDispositivoId: dados.dispositivoId || "",
        _atlasUsuarioAtualizadoEm: Number(dados.ultimoAcessoMs || Date.now())
    });
}

async function atlasFirebaseListarDispositivos() {
    const ref = collection(atlasFirestore, "dispositivos_online");
    const snap = await getDocsFromServer(ref).catch(() => getDocs(ref));
    return snap.docs
        .map(d => d.data())
        .filter(item => item && item.id);
}

function atlasFirebaseSalvarDispositivosNuvem(lista) {
    const objeto = {};
    (lista || []).forEach(item => {
        if (item && item.id) objeto[item.id] = item;
    });

    atlasFirebaseBloqueado = true;
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_dispositivos_online", JSON.stringify(objeto));
    atlasFirebaseBloqueado = false;

    window.dispatchEvent(new CustomEvent("atlasDispositivosNuvemAtualizados", {
        detail: { total: Object.keys(objeto).length }
    }));
}

async function atlasFirebaseEnviarDispositivosLocais() {
    const dispositivos = atlasParseJSON("atlas_dispositivos_online", {});
    const idAtual = localStorage.getItem("atlas_dispositivo_id");
    const atual = idAtual ? dispositivos[idAtual] : null;
    if (atual && atual.id) {
        await atlasFirebaseRegistrarDispositivo(atual);
    }
}

async function atlasFirebaseSincronizarVersaoSistema() {
    const atual = {
        versao: window.ATLAS_SISTEMA_VERSAO || "sem-versao",
        build: Number(window.ATLAS_SISTEMA_BUILD || 0),
        publicadaEm: new Date().toLocaleString("pt-BR")
    };

    const ref = doc(atlasFirestore, "sistema", "versao");
    const snap = await getDoc(ref);
    const nuvem = snap.exists() ? (snap.data() || {}) : {};
    const buildNuvem = Number(nuvem.build || 0);

    if (!snap.exists() || atual.build >= buildNuvem) {
        await atlasSetDoc(["sistema", "versao"], atual);
        await atlasFirebasePublicarAtualizacaoGlobal(atual);
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_versao_publicada_info", JSON.stringify(atual));
        window.dispatchEvent(new Event("atlasVersaoPublicadaAtualizada"));
        return atual;
    }

    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_versao_publicada_info", JSON.stringify(nuvem));
    await atlasFirebaseBaixarAtualizacaoGlobal();
    window.dispatchEvent(new Event("atlasVersaoPublicadaAtualizada"));
    return nuvem;
}

function atlasFirebaseSalvarAtualizacaoGlobal(info) {
    if (!info) return;
    atlasFirebaseBloqueado = true;
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_atualizacao_global_info", JSON.stringify(info));
    atlasFirebaseBloqueado = false;
    window.dispatchEvent(new CustomEvent("atlasAtualizacaoGlobalAtualizada", { detail: info }));
    window.dispatchEvent(new Event("atlasVersaoPublicadaAtualizada"));
}

async function atlasFirebasePublicarAtualizacaoGlobal(info = {}) {
    const atual = {
        versao: info.versao || window.ATLAS_SISTEMA_VERSAO || "sem-versao",
        build: Number(info.build || window.ATLAS_SISTEMA_BUILD || 0),
        solicitadoPor: atlasFirebaseNomeUsuario(),
        solicitadoEmMs: Date.now(),
        solicitadoEm: new Date().toLocaleString("pt-BR"),
        todosUsuarios: true,
        pendente: true
    };

    const ref = doc(atlasFirestore, "sistema", "atualizacao_global");
    const snap = await getDoc(ref).catch(() => null);
    const nuvem = snap && snap.exists() ? (snap.data() || {}) : {};
    if (Number(nuvem.build || 0) > atual.build) {
        atlasFirebaseSalvarAtualizacaoGlobal(nuvem);
        return nuvem;
    }

    await atlasSetDoc(["sistema", "atualizacao_global"], atual);
    atlasFirebaseSalvarAtualizacaoGlobal(atual);
    return atual;
}

async function atlasFirebaseBaixarAtualizacaoGlobal() {
    const snap = await getDoc(doc(atlasFirestore, "sistema", "atualizacao_global")).catch(() => null);
    if (!snap || !snap.exists()) return null;
    const info = snap.data() || {};
    atlasFirebaseSalvarAtualizacaoGlobal(info);
    return info;
}

function atlasChavesAtualizacaoAparelho(alvo = {}) {
    const chaves = [];
    if (alvo.dispositivoId) chaves.push(`device_${alvo.dispositivoId}`);
    if (alvo.usuario) chaves.push(`user_${String(alvo.usuario).toLowerCase()}`);
    return Array.from(new Set(chaves.filter(Boolean)));
}

function atlasChavesAtualizacaoLocais() {
    const idDispositivo = localStorage.getItem("atlas_dispositivo_id") || "";
    const usuarioTexto = document.getElementById("user-display")?.innerText || "";
    let usuarioLocal = null;
    try {
        usuarioLocal = window.usuarioLogado || (typeof usuarioLogado !== "undefined" ? usuarioLogado : null);
    } catch (erro) {
        usuarioLocal = window.usuarioLogado || null;
    }

    const usuarios = [
        usuarioTexto,
        usuarioLocal?.id,
        usuarioLocal?.nome,
        ...(Array.isArray(usuarioLocal?.usuarioAliases) ? usuarioLocal.usuarioAliases : [])
    ].filter(Boolean);

    return atlasChavesAtualizacaoAparelho({ dispositivoId: idDispositivo })
        .concat(usuarios.flatMap(usuario => atlasChavesAtualizacaoAparelho({ usuario })))
        .map(chave => atlasDocId(chave));
}

function atlasFirebaseSalvarConfirmacoesAtualizacao(lista) {
    const objeto = {};
    (lista || []).forEach(item => {
        if (item && item.chave) objeto[atlasDocId(item.chave)] = item;
    });

    atlasFirebaseBloqueado = true;
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_atualizacoes_confirmadas", JSON.stringify(objeto));
    atlasFirebaseBloqueado = false;

    window.dispatchEvent(new CustomEvent("atlasAtualizacoesConfirmadasAtualizadas", {
        detail: { total: Object.keys(objeto).length }
    }));
}

async function atlasFirebaseConfirmarAtualizacaoAparelho(info = {}) {
    const chaves = new Set([
        ...atlasChavesAtualizacaoLocais(),
        ...atlasChavesAtualizacaoAparelho({
            dispositivoId: info.dispositivoId,
            usuario: info.usuario
        }).map(chave => atlasDocId(chave))
    ].filter(Boolean));

    if (!chaves.size) return null;

    const agora = Date.now();
    const confirmacao = {
        usuario: info.usuario || document.getElementById("user-display")?.innerText || "",
        dispositivoId: info.dispositivoId || localStorage.getItem("atlas_dispositivo_id") || "",
        versao: info.versao || window.ATLAS_SISTEMA_VERSAO || "sem-versao",
        build: Number(info.build || window.ATLAS_SISTEMA_BUILD || 0),
        pedidoSolicitadoEmMs: Number(info.pedidoSolicitadoEmMs || info.solicitadoEmMs || 0),
        confirmadoEmMs: agora,
        confirmadoEm: new Date(agora).toLocaleString("pt-BR"),
        pendente: false
    };

    await Promise.all(Array.from(chaves).map(chave => Promise.all([
        atlasSetDoc(["atualizacoes_confirmadas", chave], {
            ...confirmacao,
            chave
        }),
        deleteDoc(doc(atlasFirestore, "atualizacoes_pendentes", chave)).catch(erro => {
            console.warn("Nao foi possivel limpar pedido de atualizacao:", erro);
        })
    ])));

    return confirmacao;
}

function atlasFirebaseAvisarAtualizacaoPendente(pedido = {}) {
    if (!pedido || pedido.pendente === false) return null;
    const buildPedido = Number(pedido.build || 0);
    const buildAtual = Number(window.ATLAS_SISTEMA_BUILD || 0);
    if (buildPedido && buildAtual >= buildPedido) {
        atlasFirebaseConfirmarAtualizacaoAparelho({
            usuario: pedido.usuario,
            dispositivoId: pedido.dispositivoId,
            versao: window.ATLAS_SISTEMA_VERSAO || pedido.versao,
            build: buildAtual,
            pedidoSolicitadoEmMs: pedido.solicitadoEmMs
        }).catch(erro => {
            console.error("Erro ao confirmar atualizacao ja aplicada:", erro);
        });
        return null;
    }

    const avisoId = `atlas_update_notice_sent_${buildPedido}_${pedido.versao || "sem-versao"}_${pedido.solicitadoEmMs || pedido.chave || ""}`;
    if (sessionStorage.getItem(avisoId) === "1") return null;

    sessionStorage.setItem(avisoId, "1");
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_atualizacao_pendente_info", JSON.stringify(pedido));
    window.dispatchEvent(new CustomEvent("atlasAtualizacaoSolicitada", { detail: pedido }));
    return pedido;
}

async function atlasFirebaseSolicitarAtualizacaoAparelho(alvo = {}) {
    const chaves = atlasChavesAtualizacaoAparelho(alvo);
    if (!chaves.length) return null;

    const pedido = {
        usuario: alvo.usuario || "",
        dispositivoId: alvo.dispositivoId || "",
        versao: window.ATLAS_SISTEMA_VERSAO || "sem-versao",
        build: Number(window.ATLAS_SISTEMA_BUILD || 0),
        solicitadoPor: atlasFirebaseNomeUsuario(),
        solicitadoEmMs: Date.now(),
        solicitadoEm: new Date().toLocaleString("pt-BR"),
        pendente: true
    };

    await Promise.all(chaves.map(chave => atlasSetDoc(["atualizacoes_pendentes", atlasDocId(chave)], {
        ...pedido,
        chave
    })));

    return pedido;
}

async function atlasFirebaseChecarAtualizacaoPendente(dispositivoId, usuarioId) {
    const chaves = atlasChavesAtualizacaoAparelho({
        dispositivoId,
        usuario: usuarioId
    });
    if (!chaves.length) return null;

    for (const chave of chaves) {
        const snap = await getDoc(doc(atlasFirestore, "atualizacoes_pendentes", atlasDocId(chave)));
        if (!snap.exists()) continue;
        const pedido = snap.data() || {};
        if (pedido.pendente === false) continue;
        const avisado = atlasFirebaseAvisarAtualizacaoPendente(pedido);
        if (avisado) return avisado;
    }

    return null;
}

async function atlasEnviarUsuarios() {
    const usuarios = atlasParseJSON("atlas_usuarios", [])
        .filter(usuario => !atlasUsuarioFoiExcluidoFirebase(usuario?.id))
        .map(usuario => String(usuario?.id || "").trim().toLowerCase() === "admin"
            ? { id: "admin", nome: "ADMIN", senha: "123", cargo: "admin", bloqueado: false, _atlasUsuarioAtualizadoEm: Date.now() }
            : usuario);

    await Promise.all(usuarios.map(usuario => {
        const id = atlasDocId(usuario.id);
        return atlasSetDoc(["usuarios", id], {
            ...usuario,
            id: usuario.id,
            senha: usuario.senha,
            cargo: usuario.cargo,
            bloqueado: usuario.bloqueado === true
        });
    }));
}

async function atlasFirebaseBaixarUsuariosDireto() {
    const refUsuarios = collection(atlasFirestore, "usuarios");
    const snap = await getDocsFromServer(refUsuarios).catch(() => getDocs(refUsuarios));
    const excluidos = await atlasFirebaseBaixarUsuariosExcluidosDireto();
    const usuariosNuvem = snap.docs
        .map(d => d.data())
        .filter(usuario => usuario && usuario.id && !excluidos[String(usuario.id).toLowerCase()]);

    const usuariosAtuais = atlasParseJSON("atlas_usuarios", []);
    const mapaMesclado = new Map();

    usuariosAtuais.forEach(usuario => {
        if (usuario && usuario.id) {
            const chaveUsuario = String(usuario.id).toLowerCase();
            if (!excluidos[chaveUsuario]) mapaMesclado.set(chaveUsuario, usuario);
        }
    });

    usuariosNuvem.forEach(usuario => {
        const chaveUsuario = String(usuario.id).toLowerCase();
        mapaMesclado.set(chaveUsuario, atlasFirebaseMesclarUsuario(mapaMesclado.get(chaveUsuario), usuario));
    });

    mapaMesclado.set("admin", { id: "admin", nome: "ADMIN", senha: "123", cargo: "admin", bloqueado: false, _atlasUsuarioAtualizadoEm: Date.now() });

    const usuariosMesclados = Array.from(mapaMesclado.values());

    usuariosMesclados.sort((a, b) => {
        const adminA = String(a.id).toLowerCase() === "admin" ? -1 : 0;
        const adminB = String(b.id).toLowerCase() === "admin" ? -1 : 0;
        if (adminA !== adminB) return adminA - adminB;
        return String(a.id).localeCompare(String(b.id));
    });

    if (JSON.stringify(usuariosAtuais) === JSON.stringify(usuariosMesclados)) return false;

    atlasFirebaseBloqueado = true;
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_usuarios", JSON.stringify(usuariosMesclados));
    atlasFirebaseBloqueado = false;

    if (typeof window.usuariosSistema !== "undefined") {
        window.usuariosSistema = usuariosMesclados;
    }
    if (typeof usuariosSistema !== "undefined") {
        usuariosSistema = usuariosMesclados;
    }

    return true;
}

async function atlasEnviarInjecao() {
    const db = atlasParseJSON("atlas_db", {});
    const promessas = [];

    Object.keys(db).forEach(ano => {
        Object.keys(db[ano] || {}).forEach(mesNome => {
            (db[ano][mesNome] || []).forEach((rel, index) => {
                if (rel.modulo !== "injecao") return;

                const id = atlasDocId(rel.id || `${ano}_${mesNome}_${rel.data}_${index}`);
                promessas.push(atlasSetDoc(["injecao", id], {
                    id,
                    ano: Number(ano),
                    mesNome,
                    data: rel.data,
                    operador: rel.operador,
                    totalMetros: (rel.itens || []).reduce((acc, item) => acc + Number(item.metros || 0), 0),
                    itens: rel.itens || [],
                    editadoPor: rel.editadoPor || "",
                    editadoEm: rel.editadoEm || "",
                    historicoEdicoes: rel.historicoEdicoes || []
                }));
            });
        });
    });

    await Promise.all(promessas);
}

async function atlasEnviarBobines() {
    const historico = atlasParseJSON("historicoBobines", []);

    await Promise.all(historico.map((rel, index) => {
        const id = atlasDocId(rel.id || `${rel.data}_${index}`);
        return atlasSetDoc(["bobines", id], {
            id,
            data: rel.data,
            dia: rel.dia || null,
            mes: rel.mes || null,
            ano: rel.ano || null,
            hora: rel.hora || "",
            operador: rel.operador || "",
            totalProducoes: Array.from(new Set((rel.itens || []).map(item => item.producao))).length,
            itens: rel.itens || [],
            editadoPor: rel.editadoPor || "",
            editadoEm: rel.editadoEm || "",
            historicoEdicoes: rel.historicoEdicoes || []
        });
    }));
}

async function atlasEnviarCorte(nomeColecao, chaveLocalStorage) {
    const historico = atlasParseJSON(chaveLocalStorage, []);

    await Promise.all(historico.map((rel, index) => {
        const partes = rel.ano ? {} : atlasDataPartes(rel.data);
        const id = atlasDocId(rel.id || `${rel.data}_${index}`);

        return atlasSetDoc([nomeColecao, id], {
            id,
            data: rel.data || "",
            dia: rel.dia || partes.dia,
            mes: rel.mes || partes.mes,
            ano: rel.ano || partes.ano,
            operador: rel.operador || "",
            totalGeral: Number(rel.totalGeral || 0),
            itens: rel.itens || [],
            editadoPor: rel.editadoPor || "",
            editadoEm: rel.editadoEm || "",
            historicoEdicoes: rel.historicoEdicoes || []
        });
    }));
}

async function atlasEnviarPlanos() {
    const historico = atlasParseJSON("atlas_plano_hist", []);

    await Promise.all(historico.map((rel, index) => {
        const id = atlasDocId(rel.id || `${rel.data}_${index}`);

        return atlasSetDoc(["planos", id], {
            id,
            data: rel.data || "",
            dataISO: rel.dataISO || "",
            dia: rel.dia || null,
            mes: rel.mes || null,
            ano: rel.ano || null,
            operador: rel.operador || "",
            totalGeral: Number(rel.totalGeral || 0),
            tiposLancamento: rel.tiposLancamento || [],
            resumo: rel.resumo || {},
            itens: rel.itens || [],
            editadoPor: rel.editadoPor || "",
            editadoEm: rel.editadoEm || "",
            historicoEdicoes: rel.historicoEdicoes || []
        });
    }));
}

async function atlasEnviarConferencia() {
    const pedidos = atlasParseJSON("atlas_conferencia_serra", []);

    await Promise.all(pedidos.map((pedido, index) => {
        const id = atlasDocId(pedido.id || `${pedido.data}_${pedido.pedidoNumero}_${index}`);

        return atlasSetDoc(["conferencia", id], {
            id,
            chavePedido: pedido.chavePedido || "",
            pedidoNumero: pedido.pedidoNumero || "",
            data: pedido.data || "",
            dia: pedido.dia || null,
            mes: pedido.mes || null,
            ano: pedido.ano || null,
            operadorSerra: pedido.operadorSerra || "",
            status: pedido.status || "aberto",
            finalizadoPor: pedido.finalizadoPor || "",
            finalizadoEm: pedido.finalizadoEm || "",
            unidades: pedido.unidades || []
        });
    }));
}

async function atlasEnviarStockFirebase() {
    const bobinas = atlasParseJSON("atlas_stock_bobinas", []);
    const filmes = atlasParseJSON("atlas_stock_filmes", []);

    await Promise.all((bobinas || []).map((item, index) => {
        const id = atlasDocId(item.id || `${item.numero || "bobina"}_${item.ral || ""}_${item.medida || ""}_${index}`);
        return atlasSetDoc(["stock_bobinas", id], {
            ...item,
            id: item.id || id
        });
    }));

    await Promise.all((filmes || []).map((item, index) => {
        const id = atlasDocId(item.id || `${item.tipo || "filme"}_${item.fornecedor || ""}_${index}`);
        return atlasSetDoc(["stock_filmes", id], {
            ...item,
            id: item.id || id
        });
    }));
}

async function atlasEnviarDestinosPlano() {
    const destinos = atlasParseJSON("atlas_plano_destinos", []);
    await atlasSetDoc(["configuracoes", "destinos_plano"], {
        destinos
    });
}

async function atlasEnviarGuiasInjecao() {
    const dados = atlasParseJSON("atlas_guias_injecao", {});
    await atlasSetDoc(["configuracoes", "guias_injecao"], {
        dados,
        atualizadoEmMs: Date.now(),
        atualizadoPor: atlasFirebaseNomeUsuario()
    });
}

async function atlasBaixarGuiasInjecaoDireto() {
    const snap = await getDoc(doc(atlasFirestore, "configuracoes", "guias_injecao")).catch(() => null);
    if (!snap || !snap.exists()) return false;
    atlasFirebaseAplicarGuiasInjecao(snap.data()?.dados || {});
    return true;
}

const ATLAS_CHAVES_DADOS_PRINCIPAIS = [
    "atlas_db",
    "historicoBobines",
    "atlas_serra_hist",
    "atlas_emb_hist",
    "atlas_plano_hist",
    "atlas_conferencia_serra",
    "atlas_stock_bobinas",
    "atlas_stock_filmes"
];

function atlasFirebaseContarItensValor(chave, valorBruto) {
    let valor = valorBruto;
    if (typeof valorBruto === "string") {
        try {
            valor = JSON.parse(valorBruto);
        } catch (erro) {
            return valorBruto.trim() ? 1 : 0;
        }
    }

    if (Array.isArray(valor)) return valor.length;
    if (!valor || typeof valor !== "object") return 0;

    if (chave === "atlas_db") {
        return Object.values(valor).reduce((totalAno, meses) => {
            return totalAno + Object.values(meses || {}).reduce((totalMes, lista) => {
                return totalMes + (Array.isArray(lista) ? lista.length : 0);
            }, 0);
        }, 0);
    }

    return Object.keys(valor).length;
}

function atlasFirebaseContarDadosBackup(dados) {
    return ATLAS_CHAVES_DADOS_PRINCIPAIS.reduce((total, chave) => {
        return total + atlasFirebaseContarItensValor(chave, dados?.[chave]);
    }, 0);
}

function atlasFirebaseContarDadosLocais() {
    return ATLAS_CHAVES_DADOS_PRINCIPAIS.reduce((total, chave) => {
        return total + atlasFirebaseContarItensValor(chave, localStorage.getItem(chave));
    }, 0);
}

function atlasFirebaseParseValorBackup(valorBruto, fallback) {
    if (typeof valorBruto !== "string") return valorBruto ?? fallback;
    try {
        return JSON.parse(valorBruto);
    } catch (erro) {
        return fallback;
    }
}

function atlasFirebaseChaveRegistro(chave, item, index) {
    if (!item || typeof item !== "object") return `${chave}_${index}_${String(item)}`;
    if (item.id) return `${chave}_id_${item.id}`;
    if (chave === "atlas_stock_bobinas") return `${chave}_${item.numero || ""}_${item.ral || ""}_${item.medida || ""}_${item.espessura || ""}`;
    if (chave === "atlas_stock_filmes") return `${chave}_${item.tipo || ""}_${item.fornecedor || ""}`;
    if (item.chavePedido) return `${chave}_pedido_${item.chavePedido}`;
    return `${chave}_${item.data || ""}_${item.operador || item.operadorSerra || ""}_${JSON.stringify(item.itens || item.unidades || []).slice(0, 200)}`;
}

function atlasFirebaseChavesRegistro(chave, item, index) {
    const chaves = new Set();
    chaves.add(atlasFirebaseChaveRegistro(chave, item, index));
    if (item && typeof item === "object") {
        if (item.id) chaves.add(`${chave}_id_${item.id}`);
        if (item.chavePedido) chaves.add(`${chave}_pedido_${item.chavePedido}`);
        chaves.add(`${chave}_${item.data || ""}_${item.operador || item.operadorSerra || ""}_${JSON.stringify(item.itens || item.unidades || []).slice(0, 200)}`);
    }
    return Array.from(chaves).filter(Boolean);
}

function atlasFirebaseColecaoPorChaveRelatorio(chave) {
    return {
        atlas_db: "injecao",
        historicoBobines: "bobines",
        atlas_serra_hist: "serra",
        atlas_emb_hist: "embalagem",
        atlas_plano_hist: "planos"
    }[chave] || "";
}

async function atlasFirebaseApagarRelatorioDocumento(chave, rel, index = 0) {
    const colecao = atlasFirebaseColecaoPorChaveRelatorio(chave);
    if (!colecao || !rel || typeof rel !== "object") return false;

    const ids = new Set();
    if (rel.id) ids.add(atlasDocId(rel.id));

    if (chave === "atlas_db") {
        const partes = atlasDataPartes(rel.data);
        const ano = rel.ano || partes.ano || "";
        const mes = rel.mesNome || rel.mes || partes.mes || "";
        ids.add(atlasDocId(`${ano}_${mes}_${rel.data || ""}_${index}`));
    } else {
        ids.add(atlasDocId(`${rel.data || ""}_${index}`));
    }

    await Promise.all(Array.from(ids).filter(Boolean).map(id =>
        deleteDoc(doc(atlasFirestore, colecao, id)).catch(erro => {
            console.warn("Nao foi possivel apagar relatorio antigo da nuvem:", colecao, id, erro);
        })
    ));
    return true;
}

function atlasFirebaseRelatoriosExcluidos() {
    const dados = atlasParseJSON(ATLAS_RELATORIOS_EXCLUIDOS_KEY, {});
    return dados && typeof dados === "object" ? dados : {};
}

function atlasFirebaseRegistroFoiExcluido(chave, item, index) {
    const excluidos = atlasFirebaseRelatoriosExcluidos();
    return atlasFirebaseChavesRegistro(chave, item, index).some(id => Boolean(excluidos[id]));
}

function atlasFirebaseFiltrarRelatoriosExcluidos(chave, lista) {
    return (Array.isArray(lista) ? lista : []).filter((item, index) => !atlasFirebaseRegistroFoiExcluido(chave, item, index));
}

function atlasFirebaseAplicarExclusoesRelatoriosLocais() {
    let mudou = false;
    const chavesLista = ["historicoBobines", "atlas_serra_hist", "atlas_emb_hist", "atlas_plano_hist"];

    chavesLista.forEach(chave => {
        const lista = atlasParseJSON(chave, []);
        if (!Array.isArray(lista)) return;
        const filtrada = atlasFirebaseFiltrarRelatoriosExcluidos(chave, lista);
        if (filtrada.length !== lista.length) {
            atlasLocalStorageSetItemOriginal.call(localStorage, chave, JSON.stringify(filtrada));
            mudou = true;
        }
    });

    const db = atlasParseJSON("atlas_db", {});
    if (db && typeof db === "object") {
        Object.keys(db).forEach(ano => {
            Object.keys(db[ano] || {}).forEach(mes => {
                const lista = Array.isArray(db[ano][mes]) ? db[ano][mes] : [];
                const filtrada = atlasFirebaseFiltrarRelatoriosExcluidos("atlas_db", lista);
                if (filtrada.length !== lista.length) {
                    if (filtrada.length) db[ano][mes] = filtrada;
                    else delete db[ano][mes];
                    mudou = true;
                }
            });
            if (Object.keys(db[ano] || {}).length === 0) delete db[ano];
        });
        if (mudou) atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_db", JSON.stringify(db));
    }

    return mudou;
}

function atlasFirebaseMesclarArrays(chave, localLista, nuvemLista) {
    const mapa = new Map();
    [
        ...atlasFirebaseFiltrarRelatoriosExcluidos(chave, localLista),
        ...atlasFirebaseFiltrarRelatoriosExcluidos(chave, nuvemLista)
    ].forEach((item, index) => {
        const id = atlasFirebaseChaveRegistro(chave, item, index);
        if (!mapa.has(id)) {
            mapa.set(id, item);
            return;
        }
        mapa.set(id, { ...(mapa.get(id) || {}), ...(item || {}) });
    });
    return Array.from(mapa.values());
}

function atlasFirebaseMesclarDbInjecao(localDb, nuvemDb) {
    const resultado = { ...(localDb && typeof localDb === "object" ? localDb : {}) };
    Object.keys(nuvemDb || {}).forEach(ano => {
        resultado[ano] ||= {};
        Object.keys(nuvemDb[ano] || {}).forEach(mes => {
            resultado[ano][mes] = atlasFirebaseMesclarArrays("atlas_db", resultado[ano][mes] || [], nuvemDb[ano][mes] || []);
            if (Array.isArray(resultado[ano][mes]) && resultado[ano][mes].length === 0) delete resultado[ano][mes];
        });
        if (Object.keys(resultado[ano] || {}).length === 0) delete resultado[ano];
    });
    return resultado;
}

function atlasFirebaseMesclarValorBackup(chave, valorLocalBruto, valorNuvemBruto) {
    if (chave === ATLAS_RELATORIOS_EXCLUIDOS_KEY) {
        const local = atlasFirebaseParseValorBackup(valorLocalBruto, {});
        const nuvem = atlasFirebaseParseValorBackup(valorNuvemBruto, {});
        return JSON.stringify({ ...(nuvem && typeof nuvem === "object" ? nuvem : {}), ...(local && typeof local === "object" ? local : {}) });
    }

    if (!ATLAS_CHAVES_DADOS_PRINCIPAIS.includes(chave)) return valorNuvemBruto;

    const local = atlasFirebaseParseValorBackup(valorLocalBruto, chave === "atlas_db" ? {} : []);
    const nuvem = atlasFirebaseParseValorBackup(valorNuvemBruto, chave === "atlas_db" ? {} : []);

    if (chave === "atlas_db") return JSON.stringify(atlasFirebaseMesclarDbInjecao(local, nuvem));
    return JSON.stringify(atlasFirebaseMesclarArrays(chave, local, nuvem));
}

function atlasFirebaseMesclarBackups(localDados, nuvemDados) {
    const resultado = { ...(localDados || {}) };
    Object.keys(nuvemDados || {}).forEach(chave => {
        if (!atlasFirebaseChaveSincronizada(chave) || chave === "atlas_guias_injecao" || chave === "atlas_usuarios") return;
        resultado[chave] = atlasFirebaseMesclarValorBackup(chave, resultado[chave], nuvemDados[chave]);
    });
    return resultado;
}

function atlasFirebaseCriarBackupLocalSnapshot(motivo = "snapshot") {
    const total = atlasFirebaseContarDadosLocais();
    if (total === 0) return false;
    if (String(motivo).startsWith("antes_de_aplicar_")) {
        const agora = Date.now();
        if (agora - atlasFirebaseUltimoSnapshotAutomaticoMs < ATLAS_FIREBASE_SNAPSHOT_AUTOMATICO_INTERVALO_MS) return false;
        atlasFirebaseUltimoSnapshotAutomaticoMs = agora;
    }

    const dados = {};
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (atlasFirebaseChaveSincronizada(chave) && chave !== "atlas_usuarios" && chave !== "atlas_guias_injecao") {
            dados[chave] = localStorage.getItem(chave);
        }
    }

    const id = `atlas_backup_local_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    atlasLocalStorageSetItemOriginal.call(localStorage, id, JSON.stringify({
        motivo,
        criadoEm: new Date().toISOString(),
        total,
        dados
    }));

    const lista = atlasParseJSON("atlas_backups_locais_lista", []);
    lista.unshift({ id, motivo, criadoEm: new Date().toISOString(), total });
    const curta = lista.slice(0, 10);
    atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_backups_locais_lista", JSON.stringify(curta));
    lista.slice(10).forEach(item => atlasLocalStorageRemoveItemOriginal.call(localStorage, item.id));
    return true;
}

async function atlasEnviarBackupLocalStorage() {
    const backup = {};
    atlasFirebaseAplicarExclusoesRelatoriosLocais();
    if (!atlasFirebaseBloqueado && !localStorage.getItem(ATLAS_FIREBASE_SYNC_KEY)) {
        atlasLocalStorageSetItemOriginal.call(localStorage, ATLAS_FIREBASE_SYNC_KEY, String(Date.now()));
    }

    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (atlasFirebaseChaveSincronizada(chave) && chave !== "atlas_usuarios" && chave !== "atlas_guias_injecao") {
            backup[chave] = localStorage.getItem(chave);
        }
    }
    backup.atlas_sessao_usuario_id = null;

    const snapAtual = await getDoc(doc(atlasFirestore, "backups_localstorage", "ultimo_backup")).catch(() => null);
    const dadosAtuais = snapAtual?.exists() ? (snapAtual.data()?.dados || {}) : {};
    const totalBackup = atlasFirebaseContarDadosBackup(backup);
    const totalAtual = atlasFirebaseContarDadosBackup(dadosAtuais);

    if (totalBackup === 0 && totalAtual > 0) {
        console.warn("Backup vazio bloqueado para proteger dados existentes na nuvem.");
        return;
    }

    if (totalBackup < totalAtual) {
        Object.assign(backup, atlasFirebaseMesclarBackups(backup, dadosAtuais));
        console.warn("Backup menor mesclado com o backup maior da nuvem para preservar dados.");
    }

    await atlasSetDoc(["backups_localstorage", "ultimo_backup"], {
        dados: backup
    });

    const agora = Date.now();
    const deveSalvarHistorico = atlasFirebaseContarDadosBackup(backup) > 0
        && agora - atlasFirebaseUltimoHistoricoBackupMs >= ATLAS_FIREBASE_HISTORICO_BACKUP_INTERVALO_MS;

    if (deveSalvarHistorico) {
        atlasFirebaseUltimoHistoricoBackupMs = agora;
        const idHistorico = new Date().toISOString().replace(/[:.]/g, "-");
        await atlasSetDoc(["backups_localstorage_historico", idHistorico], {
            dados: backup,
            totalItens: atlasFirebaseContarDadosBackup(backup),
            criadoEmISO: new Date().toISOString(),
            dispositivoId: localStorage.getItem("atlas_dispositivo_id") || ""
        });
    }
}

async function atlasFirebaseEnviarTudoOrganizadoInterno() {
    if (atlasFirebaseBloqueado) return;
    atlasFirebaseAplicarExclusoesRelatoriosLocais();

    if (atlasFirebaseContarDadosLocais() === 0) {
        const snapAtual = await getDoc(doc(atlasFirestore, "backups_localstorage", "ultimo_backup")).catch(() => null);
        const dadosAtuais = snapAtual?.exists() ? (snapAtual.data()?.dados || {}) : {};
        if (atlasFirebaseContarDadosBackup(dadosAtuais) > 0) {
            console.warn("Sincronizacao vazia bloqueada para proteger dados existentes na nuvem.");
            return;
        }
    }

    await atlasEnviarUsuariosExcluidos();
    await atlasEnviarUsuarios();
    await atlasEnviarInjecao();
    await atlasEnviarBobines();
    await atlasEnviarCorte("serra", "atlas_serra_hist");
    await atlasEnviarCorte("embalagem", "atlas_emb_hist");
    await atlasEnviarPlanos();
    await atlasEnviarConferencia();
    await atlasEnviarStockFirebase();
    await atlasEnviarDestinosPlano();
    await atlasEnviarGuiasInjecao().catch(erro => {
        console.error("Erro ao sincronizar guias da injecao:", erro);
    });
    await atlasEnviarBackupLocalStorage();
}

async function atlasFirebaseExecutarEnvioAgendado() {
    if (atlasFirebaseEnviando) {
        atlasFirebaseEnvioPendente = true;
        return;
    }

    atlasFirebaseEnviando = true;
    try {
        do {
            atlasFirebaseEnvioPendente = false;
            await atlasFirebaseEnviarTudoOrganizadoInterno();
        } while (atlasFirebaseEnvioPendente);
    } finally {
        atlasFirebaseEnviando = false;
    }
}

function atlasFirebaseChaveImediata(chave) {
    return ATLAS_CHAVES_DADOS_PRINCIPAIS.includes(chave)
        || chave === "atlas_plano_live"
        || chave === "atlas_plano_destinos"
        || chave === "atlas_usuarios";
}

function atlasFirebaseAgendarEnvio(chave) {
    if (!chave) return;
    if (!atlasFirebaseChaveSincronizada(chave)) return;
    if (atlasFirebaseBloqueado) return;

    clearTimeout(atlasFirebaseTimer);
    const atraso = atlasFirebaseChaveImediata(chave) ? 350 : 1200;
    atlasFirebaseTimer = setTimeout(() => {
        atlasFirebaseExecutarEnvioAgendado().catch(erro => {
            console.error("Erro ao sincronizar Firebase:", erro);
        });
    }, atraso);
}

const atlasLocalStorageSetItemOriginal = localStorage.setItem;
const atlasLocalStorageRemoveItemOriginal = localStorage.removeItem;

onSnapshot(collection(atlasFirestore, "dispositivos_online"), snap => {
    atlasFirebaseSalvarDispositivosNuvem(
        snap.docs
            .map(d => d.data())
            .filter(item => item && item.id)
    );
}, erro => {
    console.error("Erro ao ouvir dispositivos online:", erro);
});

onSnapshot(collection(atlasFirestore, "atualizacoes_pendentes"), snap => {
    const chavesLocais = new Set(atlasChavesAtualizacaoLocais());
    if (!chavesLocais.size) return;

    snap.docChanges().forEach(change => {
        if (change.type === "removed") return;
        if (!chavesLocais.has(change.doc.id)) return;
        atlasFirebaseAvisarAtualizacaoPendente(change.doc.data() || {});
    });
}, erro => {
    console.error("Erro ao ouvir atualizacoes pendentes:", erro);
});

onSnapshot(collection(atlasFirestore, "atualizacoes_confirmadas"), snap => {
    atlasFirebaseSalvarConfirmacoesAtualizacao(
        snap.docs
            .map(d => d.data())
            .filter(item => item && item.chave)
    );
}, erro => {
    console.error("Erro ao ouvir confirmacoes de atualizacao:", erro);
});

onSnapshot(doc(atlasFirestore, "sistema", "atualizacao_global"), snap => {
    if (!snap.exists()) return;
    const info = snap.data() || {};
    atlasFirebaseSalvarAtualizacaoGlobal(info);
    atlasFirebaseAvisarAtualizacaoPendente(info);
}, erro => {
    console.error("Erro ao ouvir atualizacao global:", erro);
});

localStorage.setItem = function(chave, valor) {
    const resultado = atlasLocalStorageSetItemOriginal.call(localStorage, chave, valor);
    if (!atlasFirebaseBloqueado && atlasFirebaseChaveSincronizada(chave) && chave !== ATLAS_FIREBASE_SYNC_KEY) {
        atlasFirebaseMarcarAlteracaoLocal();
    }
    atlasFirebaseAgendarEnvio(chave);
    return resultado;
};

localStorage.removeItem = function(chave) {
    const resultado = atlasLocalStorageRemoveItemOriginal.call(localStorage, chave);
    if (!atlasFirebaseBloqueado && atlasFirebaseChaveSincronizada(chave) && chave !== ATLAS_FIREBASE_SYNC_KEY) {
        atlasFirebaseMarcarAlteracaoLocal();
    }
    atlasFirebaseAgendarEnvio(chave);
    return resultado;
};

window.atlasFirebaseEnviarTudo = function() {
    atlasFirebaseEnviarTudoOrganizadoInterno()
        .then(() => alert("Dados organizados enviados para a nuvem."))
        .catch(erro => {
            console.error(erro);
            alert("Erro ao enviar dados para a nuvem: " + erro.message);
        });
};

window.atlasFirebaseRegistrarRelatorioExcluidoAgora = async function(chave, rel, index = 0) {
    try {
        await atlasFirebaseApagarRelatorioDocumento(chave, rel, index);
        await atlasFirebaseExecutarEnvioAgendado();
        return true;
    } catch (erro) {
        console.error("Erro ao sincronizar exclusao do relatorio:", erro);
        return false;
    }
};

window.atlasFirebaseStatus = {
    app: atlasFirebaseApp,
    db: atlasFirestore
};

function atlasFirebaseRelatorioInjecaoDoc(dados) {
    return {
        id: dados.id || String(Date.now()),
        modulo: "injecao",
        data: dados.data || "",
        operador: dados.operador || "",
        itens: dados.itens || [],
        editadoPor: dados.editadoPor || "",
        editadoEm: dados.editadoEm || "",
        historicoEdicoes: dados.historicoEdicoes || []
    };
}

function atlasFirebaseRelatorioBobinesDoc(dados) {
    return {
        id: dados.id || String(Date.now()),
        data: dados.data || "",
        dia: dados.dia || null,
        mes: dados.mes || null,
        ano: dados.ano || null,
        hora: dados.hora || "",
        operador: dados.operador || "",
        itens: dados.itens || [],
        editadoPor: dados.editadoPor || "",
        editadoEm: dados.editadoEm || "",
        historicoEdicoes: dados.historicoEdicoes || []
    };
}

function atlasFirebaseRelatorioCorteDoc(dados) {
    return {
        id: dados.id || String(Date.now()),
        data: dados.data || "",
        dia: dados.dia || null,
        mes: dados.mes || null,
        ano: dados.ano || null,
        operador: dados.operador || "",
        totalGeral: Number(dados.totalGeral || 0),
        itens: dados.itens || [],
        editadoPor: dados.editadoPor || "",
        editadoEm: dados.editadoEm || "",
        historicoEdicoes: dados.historicoEdicoes || []
    };
}

function atlasFirebaseRelatorioPlanoDoc(dados) {
    return {
        id: dados.id || String(Date.now()),
        data: dados.data || "",
        dataISO: dados.dataISO || "",
        dia: dados.dia || null,
        mes: dados.mes || null,
        ano: dados.ano || null,
        operador: dados.operador || "",
        totalGeral: Number(dados.totalGeral || 0),
        tiposLancamento: dados.tiposLancamento || [],
        resumo: dados.resumo || {},
        itens: dados.itens || [],
        editadoPor: dados.editadoPor || "",
        editadoEm: dados.editadoEm || "",
        historicoEdicoes: dados.historicoEdicoes || []
    };
}

function atlasFirebaseConferenciaDoc(dados) {
    return {
        id: dados.id || String(Date.now()),
        chavePedido: dados.chavePedido || "",
        pedidoNumero: dados.pedidoNumero || "",
        data: dados.data || "",
        dia: dados.dia || null,
        mes: dados.mes || null,
        ano: dados.ano || null,
        operadorSerra: dados.operadorSerra || "",
        status: dados.status || "aberto",
        finalizadoPor: dados.finalizadoPor || "",
        finalizadoEm: dados.finalizadoEm || "",
        unidades: dados.unidades || []
    };
}

async function atlasFirebaseDocsColecao(nomeColecao) {
    const snap = await getDocsFromServer(collection(atlasFirestore, nomeColecao)).catch(() => null);
    return snap ? snap.docs.map(d => d.data() || {}) : [];
}

window.atlasFirebaseRestaurarRelatoriosDaNuvem = async function() {
    const confirmar = confirm("Tentar restaurar relatorios salvos nas colecoes do Firebase? Isto vai preencher novamente os historicos deste aparelho e reenviar o backup recuperado.");
    if (!confirmar) return false;

    try {
        atlasFirebaseBloqueado = true;

        const injecaoDocs = await atlasFirebaseDocsColecao("injecao");
        const dbInjecao = {};
        injecaoDocs.forEach(dados => {
            const ano = String(dados.ano || atlasDataPartes(dados.data).ano || new Date().getFullYear());
            const mesNome = dados.mesNome || String(dados.mes || atlasDataPartes(dados.data).mes || "SEM_MES");
            dbInjecao[ano] ||= {};
            dbInjecao[ano][mesNome] ||= [];
            dbInjecao[ano][mesNome].push(atlasFirebaseRelatorioInjecaoDoc(dados));
        });

        const bobines = (await atlasFirebaseDocsColecao("bobines")).map(atlasFirebaseRelatorioBobinesDoc);
        const serra = (await atlasFirebaseDocsColecao("serra")).map(atlasFirebaseRelatorioCorteDoc);
        const embalagem = (await atlasFirebaseDocsColecao("embalagem")).map(atlasFirebaseRelatorioCorteDoc);
        const planos = (await atlasFirebaseDocsColecao("planos")).map(atlasFirebaseRelatorioPlanoDoc);
        const conferencia = (await atlasFirebaseDocsColecao("conferencia")).map(atlasFirebaseConferenciaDoc);
        const stockBobinas = await atlasFirebaseDocsColecao("stock_bobinas");
        const stockFilmes = await atlasFirebaseDocsColecao("stock_filmes");

        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_db", JSON.stringify(dbInjecao));
        atlasLocalStorageSetItemOriginal.call(localStorage, "historicoBobines", JSON.stringify(bobines));
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_serra_hist", JSON.stringify(serra));
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_emb_hist", JSON.stringify(embalagem));
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_plano_hist", JSON.stringify(planos));
        atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_conferencia_serra", JSON.stringify(conferencia));
        if (stockBobinas.length) atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_stock_bobinas", JSON.stringify(stockBobinas));
        if (stockFilmes.length) atlasLocalStorageSetItemOriginal.call(localStorage, "atlas_stock_filmes", JSON.stringify(stockFilmes));
        atlasLocalStorageSetItemOriginal.call(localStorage, ATLAS_FIREBASE_SYNC_KEY, String(Date.now()));

        atlasFirebaseBloqueado = false;
        if (typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("atlasDadosNuvemAtualizados", {
                detail: {
                    chaves: ["atlas_db", "historicoBobines", "atlas_serra_hist", "atlas_emb_hist", "atlas_plano_hist", "atlas_conferencia_serra", "atlas_stock_bobinas", "atlas_stock_filmes"],
                    origem: "restauro_colecoes"
                }
            }));
        }

        await atlasFirebaseEnviarTudoOrganizadoInterno();

        alert(`Restauro concluido. Recuperado: Injecao ${injecaoDocs.length}, Bobines ${bobines.length}, Serra ${serra.length}, Embalagem ${embalagem.length}, Plano ${planos.length}, Conferencia ${conferencia.length}, Stock bobinas ${stockBobinas.length}, Stock filmes ${stockFilmes.length}. A pagina vai recarregar.`);
        location.reload();
        return true;
    } catch (erro) {
        atlasFirebaseBloqueado = false;
        console.error("Erro ao restaurar relatorios da nuvem:", erro);
        alert("Erro ao restaurar relatorios da nuvem: " + erro.message);
        return false;
    }
};

window.atlasFirebaseDiagnosticarRecuperacao = async function() {
    try {
        const linhas = [];
        const add = (nome, valor) => linhas.push(`${nome}: ${valor}`);

        add("Local - Injecao", atlasFirebaseContarItensValor("atlas_db", localStorage.getItem("atlas_db")));
        add("Local - Bobines", atlasFirebaseContarItensValor("historicoBobines", localStorage.getItem("historicoBobines")));
        add("Local - Serra", atlasFirebaseContarItensValor("atlas_serra_hist", localStorage.getItem("atlas_serra_hist")));
        add("Local - Embalagem", atlasFirebaseContarItensValor("atlas_emb_hist", localStorage.getItem("atlas_emb_hist")));
        add("Local - Plano", atlasFirebaseContarItensValor("atlas_plano_hist", localStorage.getItem("atlas_plano_hist")));
        add("Local - Stock bobinas", atlasFirebaseContarItensValor("atlas_stock_bobinas", localStorage.getItem("atlas_stock_bobinas")));
        add("Local - Stock filmes", atlasFirebaseContarItensValor("atlas_stock_filmes", localStorage.getItem("atlas_stock_filmes")));

        const backupSnap = await getDoc(doc(atlasFirestore, "backups_localstorage", "ultimo_backup")).catch(() => null);
        const backupDados = backupSnap?.exists() ? (backupSnap.data()?.dados || {}) : {};
        add("Backup nuvem - total principal", atlasFirebaseContarDadosBackup(backupDados));
        add("Backup nuvem - Injecao", atlasFirebaseContarItensValor("atlas_db", backupDados.atlas_db));
        add("Backup nuvem - Stock bobinas", atlasFirebaseContarItensValor("atlas_stock_bobinas", backupDados.atlas_stock_bobinas));
        add("Backup nuvem - Stock filmes", atlasFirebaseContarItensValor("atlas_stock_filmes", backupDados.atlas_stock_filmes));

        const historicoSnap = await getDocsFromServer(collection(atlasFirestore, "backups_localstorage_historico")).catch(() => null);
        add("Backups versionados na nuvem", historicoSnap ? historicoSnap.size : "erro/sem acesso");

        const snapshotsLocais = atlasParseJSON("atlas_backups_locais_lista", []);
        add("Snapshots locais neste aparelho", Array.isArray(snapshotsLocais) ? snapshotsLocais.length : 0);

        const colecoes = ["injecao", "bobines", "serra", "embalagem", "planos", "conferencia", "stock_bobinas", "stock_filmes"];
        for (const nome of colecoes) {
            const snap = await getDocsFromServer(collection(atlasFirestore, nome)).catch(() => null);
            add(`Colecao Firebase - ${nome}`, snap ? snap.size : "erro/sem acesso");
        }

        alert("Diagnostico de recuperacao:\n\n" + linhas.join("\n"));
        console.log("Diagnostico de recuperacao Atlas", linhas);
        return linhas;
    } catch (erro) {
        console.error("Erro no diagnostico de recuperacao:", erro);
        alert("Erro no diagnostico: " + erro.message);
        return [];
    }
};

window.atlasFirebaseRestaurarUltimoSnapshotLocal = async function() {
    try {
        const lista = atlasParseJSON("atlas_backups_locais_lista", []);
        if (!Array.isArray(lista) || !lista.length) {
            alert("Nenhum snapshot local encontrado neste aparelho.");
            return false;
        }

        const melhor = lista
            .slice()
            .sort((a, b) => Number(b.total || 0) - Number(a.total || 0) || String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")))[0];
        const bruto = localStorage.getItem(melhor.id);
        if (!bruto) {
            alert("Snapshot local nao encontrado no armazenamento deste aparelho.");
            return false;
        }

        const snapshot = JSON.parse(bruto);
        const dados = snapshot.dados || {};
        const total = atlasFirebaseContarDadosBackup(dados);
        if (!total) {
            alert("Snapshot local existe, mas nao contem dados principais.");
            return false;
        }

        const confirmar = confirm(`Restaurar snapshot local de ${snapshot.criadoEm || melhor.criadoEm || ""} com ${total} item(ns)?`);
        if (!confirmar) return false;

        atlasFirebaseCriarBackupLocalSnapshot("antes_de_restaurar_snapshot_local");
        atlasFirebaseBloqueado = true;
        Object.keys(dados).forEach(chave => {
            if (typeof dados[chave] === "string") {
                const valorMesclado = atlasFirebaseMesclarValorBackup(chave, localStorage.getItem(chave), dados[chave]);
                atlasLocalStorageSetItemOriginal.call(localStorage, chave, valorMesclado);
            }
        });
        atlasLocalStorageSetItemOriginal.call(localStorage, ATLAS_FIREBASE_SYNC_KEY, String(Date.now()));
        atlasFirebaseBloqueado = false;

        window.dispatchEvent(new CustomEvent("atlasDadosNuvemAtualizados", {
            detail: { chaves: Object.keys(dados), origem: "snapshot_local" }
        }));

        await atlasFirebaseEnviarTudoOrganizadoInterno();
        alert("Snapshot local restaurado e reenviado para a nuvem. A pagina vai recarregar.");
        location.reload();
        return true;
    } catch (erro) {
        atlasFirebaseBloqueado = false;
        console.error("Erro ao restaurar snapshot local:", erro);
        alert("Erro ao restaurar snapshot local: " + erro.message);
        return false;
    }
};

function atlasFirebaseAplicarBackupNuvem(dados, opcoes = {}) {
    const chaves = Object.keys(dados || {}).filter(chave => atlasFirebaseChaveSincronizada(chave) && chave !== "atlas_guias_injecao");
    if (chaves.length === 0) return false;

    let exclusoesAtualizadas = false;
    if (typeof dados[ATLAS_RELATORIOS_EXCLUIDOS_KEY] === "string") {
        const valorMescladoExcluidos = atlasFirebaseMesclarValorBackup(
            ATLAS_RELATORIOS_EXCLUIDOS_KEY,
            localStorage.getItem(ATLAS_RELATORIOS_EXCLUIDOS_KEY),
            dados[ATLAS_RELATORIOS_EXCLUIDOS_KEY]
        );
        if (valorMescladoExcluidos !== localStorage.getItem(ATLAS_RELATORIOS_EXCLUIDOS_KEY)) {
            atlasFirebaseBloqueado = true;
            atlasLocalStorageSetItemOriginal.call(localStorage, ATLAS_RELATORIOS_EXCLUIDOS_KEY, valorMescladoExcluidos);
            exclusoesAtualizadas = atlasFirebaseAplicarExclusoesRelatoriosLocais();
            atlasFirebaseBloqueado = false;
        }
    }

    if (atlasFirebaseContarDadosBackup(dados) === 0 && atlasFirebaseContarDadosLocais() > 0) {
        console.warn("Backup vazio da nuvem ignorado para proteger dados locais.");
        return false;
    }
    if (!atlasFirebaseBackupPodeEntrar(dados, opcoes)) {
        if (exclusoesAtualizadas) {
            window.dispatchEvent(new CustomEvent("atlasDadosNuvemAtualizados", {
                detail: { chaves: [...ATLAS_CHAVES_DADOS_PRINCIPAIS, ATLAS_RELATORIOS_EXCLUIDOS_KEY], origem: opcoes.origem || "firebase_exclusao" }
            }));
            setTimeout(() => atlasFirebaseAgendarEnvio("atlas_db"), 300);
        }
        return exclusoesAtualizadas;
    }
    if (Date.now() - atlasFirebaseUltimaAlteracaoLocal < 5000 && !opcoes.forcar && !opcoes.tempoReal) return false;

    atlasFirebaseCriarBackupLocalSnapshot(`antes_de_aplicar_${opcoes.origem || "firebase"}`);
    atlasFirebaseBloqueado = true;
    atlasFirebaseAplicarExclusoesRelatoriosLocais();

    chaves.forEach(chave => {
        if (chave !== "atlas_usuarios" && typeof dados[chave] === "string") {
            const valorMesclado = atlasFirebaseMesclarValorBackup(chave, localStorage.getItem(chave), dados[chave]);
            atlasLocalStorageSetItemOriginal.call(localStorage, chave, valorMesclado);
        }
    });

    atlasFirebaseBloqueado = false;

    window.dispatchEvent(new CustomEvent("atlasDadosNuvemAtualizados", {
        detail: { chaves, origem: opcoes.origem || "firebase" }
    }));

    const nuvemMs = Number(dados?.[ATLAS_FIREBASE_SYNC_KEY] || 0);
    const localMs = Number(localStorage.getItem(ATLAS_FIREBASE_SYNC_KEY) || 0);
    if (opcoes.tempoReal && localMs > nuvemMs) {
        setTimeout(() => atlasFirebaseAgendarEnvio("atlas_db"), 700);
    }

    if (opcoes.recarregar) location.reload();
    return true;
}

async function atlasFirebaseBaixarBackupInicial() {
    const jaBaixou = sessionStorage.getItem("atlas_firebase_backup_baixado");
    if (jaBaixou === "sim") return;

    const snap = await getDoc(doc(atlasFirestore, "backups_localstorage", "ultimo_backup"));

    if (!snap.exists()) return;

    const dados = snap.data()?.dados || {};
    sessionStorage.setItem("atlas_firebase_backup_baixado", "sim");
    atlasFirebaseAplicarBackupNuvem(dados, { forcar: true, recarregar: false, origem: "backup_inicial" });
}

setTimeout(() => {
    atlasFirebaseSincronizarVersaoSistema()
        .then(() => atlasFirebaseBaixarUsuariosDireto())
        .then(() => atlasBaixarGuiasInjecaoDireto())
        .then(() => atlasFirebaseBaixarBackupInicial())
        .then(() => atlasFirebaseEnviarDispositivosLocais())
        .then(() => atlasFirebaseEnviarTudoOrganizadoInterno())
        .catch(erro => {
            console.error("Erro inicial Firebase:", erro);
        });
}, 1500);

window.dispatchEvent(new Event("atlasFirebasePronto"));
async function atlasFirebaseAtualizarSemSair() {
    try {
        const atualizouUsuarios = await atlasFirebaseBaixarUsuariosDireto();
        if (atualizouUsuarios && typeof usuarioLogado !== "undefined" && usuarioLogado) {
            const usuarioAtualizado = atlasParseJSON("atlas_usuarios", []).find(usuario => String(usuario.id).toLowerCase() === String(usuarioLogado.id).toLowerCase());
            if (usuarioAtualizado) usuarioLogado = usuarioAtualizado;
        }

        if (Date.now() - atlasFirebaseUltimaAlteracaoLocal < 30000) return;

        await atlasBaixarGuiasInjecaoDireto();

        const snap = await getDoc(doc(atlasFirestore, "backups_localstorage", "ultimo_backup"));
        if (!snap.exists()) return;

        const dados = snap.data()?.dados || {};
        atlasFirebaseAplicarBackupNuvem(dados, { origem: "polling" });

        if (typeof usuarioLogado !== "undefined" && usuarioLogado) {
            if (typeof aplicarPermissoesUsuario === "function") aplicarPermissoesUsuario();
            if (typeof aplicarPreferenciasVisuaisUsuario === "function") aplicarPreferenciasVisuaisUsuario();
        }
    } catch (erro) {
        console.error("Erro ao atualizar dados da nuvem:", erro);
    }
}

setInterval(() => {
    atlasFirebaseAtualizarSemSair();
}, 15000);

onSnapshot(doc(atlasFirestore, "backups_localstorage", "ultimo_backup"), snap => {
    if (!snap.exists()) return;
    const dados = snap.data()?.dados || {};
    atlasFirebaseAplicarBackupNuvem(dados, { origem: "tempo_real", tempoReal: true });
}, erro => {
    console.error("Erro ao ouvir atualizacoes em tempo real:", erro);
});

onSnapshot(doc(atlasFirestore, "configuracoes", "guias_injecao"), snap => {
    if (!snap.exists()) return;
    atlasFirebaseAplicarGuiasInjecao(snap.data()?.dados || {});
}, erro => {
    console.error("Erro ao ouvir guias da injecao:", erro);
});

window.atlasFirebaseForcarAtualizacao = function() {
    return atlasFirebaseBaixarUsuariosDireto()
        .then(() => atlasBaixarGuiasInjecaoDireto())
        .then(() => atlasFirebaseBaixarBackupInicial())
        .then(() => {
            if (typeof usuariosSistema !== "undefined") {
                usuariosSistema = atlasParseJSON("atlas_usuarios", usuariosSistema);
            }
            return true;
        });
};

window.atlasFirebaseAtualizarUsuariosSistema = function() {
    return atlasFirebaseBaixarUsuariosDireto().catch(erro => {
        console.error("Erro ao atualizar usuarios:", erro);
        return false;
    });
};

window.atlasFirebaseRemoverUsuarioExcluido = function(idUsuario) {
    return atlasFirebaseRemoverUsuarioExcluidoDaNuvem(idUsuario)
        .then(() => atlasFirebaseEnviarTudoOrganizadoInterno())
        .catch(erro => {
            console.error("Erro ao remover usuario excluido:", erro);
        });
};

window.atlasFirebaseLimparUsuarioExcluido = function(idUsuario) {
    return atlasFirebaseLimparUsuarioExcluidoDaNuvem(idUsuario)
        .catch(erro => {
            console.error("Erro ao limpar usuario excluido:", erro);
        });
};

window.atlasFirebaseRegistrarDispositivo = function(dados) {
    return atlasFirebaseRegistrarDispositivo(dados).catch(erro => {
        console.error("Erro ao registrar dispositivo:", erro);
    });
};

window.atlasFirebaseMarcarDispositivoOffline = function(dados) {
    return atlasFirebaseMarcarDispositivoOffline(dados).catch(erro => {
        console.error("Erro ao marcar dispositivo offline:", erro);
    });
};

window.atlasFirebaseAtualizarUltimoAcessoUsuario = function(dados) {
    return atlasFirebaseAtualizarUltimoAcessoUsuario(dados).catch(erro => {
        console.error("Erro ao atualizar ultimo acesso do usuario:", erro);
    });
};

window.atlasFirebaseListarDispositivos = function() {
    return atlasFirebaseListarDispositivos().catch(erro => {
        console.error("Erro ao listar dispositivos:", erro);
        return [];
    });
};

window.atlasFirebaseRemoverDispositivo = function(idDispositivo) {
    const id = atlasDocId(idDispositivo);
    if (!id) return Promise.resolve();
    return deleteDoc(doc(atlasFirestore, "dispositivos_online", id)).catch(erro => {
        console.error("Erro ao remover dispositivo:", erro);
    });
};

window.atlasFirebaseSincronizarAgora = function() {
    return atlasFirebaseSincronizarVersaoSistema()
        .then(() => atlasFirebaseEnviarDispositivosLocais())
        .then(() => atlasFirebaseEnviarTudoOrganizadoInterno())
        .then(() => atlasBaixarGuiasInjecaoDireto())
        .catch(erro => {
        console.error("Erro ao sincronizar agora:", erro);
    });
};

window.atlasFirebaseAtualizarGuiasInjecao = function() {
    return atlasBaixarGuiasInjecaoDireto().catch(erro => {
        console.error("Erro ao atualizar guias da injecao:", erro);
        return false;
    });
};

window.atlasFirebaseChecarVersaoSistema = function() {
    return atlasFirebaseSincronizarVersaoSistema().catch(erro => {
        console.error("Erro ao checar versao do sistema:", erro);
        return null;
    });
};

window.atlasFirebaseSolicitarAtualizacaoAparelho = function(alvo) {
    return atlasFirebaseSolicitarAtualizacaoAparelho(alvo).catch(erro => {
        console.error("Erro ao solicitar atualizacao do aparelho:", erro);
        throw erro;
    });
};

window.atlasFirebaseChecarAtualizacaoPendente = function(dispositivoId, usuarioId) {
    return atlasFirebaseChecarAtualizacaoPendente(dispositivoId, usuarioId).catch(erro => {
        console.error("Erro ao checar atualizacao pendente:", erro);
        return null;
    });
};

window.atlasFirebaseConfirmarAtualizacaoAparelho = function(info) {
    return atlasFirebaseConfirmarAtualizacaoAparelho(info).catch(erro => {
        console.error("Erro ao confirmar atualizacao do aparelho:", erro);
        return null;
    });
};

window.atlasFirebasePublicarAtualizacaoGlobal = function(info) {
    return atlasFirebasePublicarAtualizacaoGlobal(info).catch(erro => {
        console.error("Erro ao publicar atualizacao global:", erro);
        return null;
    });
};
