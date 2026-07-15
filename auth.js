// Auth centraliza login, logout, sessao e verificacoes basicas de usuario.
// As funcoes antigas continuam em window para compatibilidade com onclick do HTML.

export function currentUser() {
    return window.usuarioLogado || null;
}

export function isLoggedIn() {
    return Boolean(currentUser());
}

export function login() {
    return window.fazerLogin?.();
}

export function logout() {
    return window.atlasSairSistema?.();
}

export function hasRole(...roles) {
    const role = String(currentUser()?.cargo || "").toLowerCase();
    return roles.map(r => String(r).toLowerCase()).includes(role);
}

export function initAuth() {
    window.AtlasAuth = {
        currentUser,
        isLoggedIn,
        login,
        logout,
        hasRole
    };
}
