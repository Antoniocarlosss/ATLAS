// Controle de permissoes por modulo. Mantem a regra atual e oferece API modular.

export function canView(moduleName) {
    return window.usuarioPodeVerModulo ? window.usuarioPodeVerModulo(moduleName) : false;
}

export function canEdit(moduleName) {
    return window.usuarioPodeEditarModulo ? window.usuarioPodeEditarModulo(moduleName) : false;
}

export function canDelete(moduleName) {
    return window.usuarioPodeExcluirModulo ? window.usuarioPodeExcluirModulo(moduleName) : false;
}

export function initPermissoes() {
    window.AtlasPermissoes = {
        canView,
        canEdit,
        canDelete,
        isAdmin: () => window.usuarioEhAdmin?.() === true,
        isAdminSupervisor: () => window.usuarioEhAdminSupervisor?.() === true
    };
}
