# Auditoria técnica do Atlas

## Correções aplicadas

- Removido o acesso administrativo alternativo com credenciais fixas no código público.
- Removido o reset automático do utilizador `admin` e da respetiva senha durante inicialização e sincronização.
- O login público agora valida um utilizador realmente cadastrado e respeita o estado de bloqueio.
- Senhas deixaram de aparecer na interface de permissões.
- As fachadas modulares de permissão passaram a negar acesso quando a implementação principal não estiver disponível.
- Corrigido erro de referência no logout ao marcar o dispositivo como offline.
- Corrigida a preservação da sessão ao abrir módulos em outra aba.
- Corrigidas as rotas diretas de Lembretes, Registros e Pesquisa.
- Corrigido o fallback offline para não devolver `index.html` no lugar de JavaScript, CSS ou imagens.
- Atualizado o identificador, a orientação e a versão do cache da PWA.

## Validação executada

- Verificação de sintaxe de todos os ficheiros JavaScript.
- Verificação de IDs duplicados e referências locais do HTML.
- Abertura da aplicação em servidor HTTP local.
- Login válido, rejeição da antiga senha alternativa e logout.
- Abertura dos módulos Injeção, Bobines, Serra, Embalagem, Gestão, Ajustes, Plano, Stock, Permissões, Conferência, Lixeira, Lembretes, Registros e Pesquisa.
- Abertura dos quatro históricos públicos.
- Testes responsivos em 390 × 844 e 1440 × 900, sem overflow horizontal.
- Verificação do console após os fluxos testados.

## Riscos que exigem decisão de arquitetura

- A autenticação continua a ser implementada no cliente e as senhas existentes continuam armazenadas em texto simples no Firestore/localStorage. A correção definitiva requer Firebase Authentication e migração gradual de utilizadores.
- Não há ficheiro de regras do Firestore versionado. Sem Firebase Authentication, regras realmente restritivas impediriam a sincronização atual. As regras da consola Firebase precisam ser auditadas antes de produção.
- Operações destrutivas e criação/edição de dados reais não foram executadas contra a base de produção durante esta auditoria local.
- PDFs foram inspecionados pelo código e pelas telas disponíveis, mas downloads com dados reais não foram disparados para evitar efeitos e ficheiros desnecessários.

## Migração recomendada

1. Criar contas no Firebase Authentication para administradores, supervisores e operadores.
2. Guardar no Firestore apenas perfil, cargo e permissões associados ao `uid`; nunca guardar senha.
3. Publicar regras que exijam autenticação e validem cargo, módulo e operação.
4. Forçar redefinição da senha atual do administrador, que já existia com valor fraco na base.
5. Validar a migração num projeto Firebase de homologação antes de alterar a produção.

## Como testar

Sirva a raiz do projeto por HTTP e execute:

```powershell
python -m http.server 8000
node tests/smoke.mjs
```

Abra `http://localhost:8000`, valide um utilizador de cada cargo e percorra os módulos. Para publicar, faça primeiro backup do Firestore, teste em homologação e só depois promova os mesmos ficheiros para a hospedagem estática.
