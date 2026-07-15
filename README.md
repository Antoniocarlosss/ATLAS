Atlas Painel - Sistema de Gestao
O Atlas Painel e um sistema web para gestao de producao, operacoes e historicos industriais. A aplicacao roda diretamente no navegador, funciona como PWA e usa Firebase Firestore para sincronizar dados entre dispositivos.

O projeto foi desenvolvido em HTML, CSS e JavaScript puro, sem etapa de build ou instalacao de dependencias.

Principais recursos
Login de usuarios com perfis de acesso.
Painel principal com modulos operacionais.
Controle de permissoes por usuario e por cargo.
Registro de producao por setor.
Historicos editaveis com rastreio de alteracoes.
Geracao de PDFs de relatorios.
Sincronizacao em nuvem com Firebase.
Funcionamento como PWA, com cache e suporte offline.
Controle de versao do sistema e aviso de atualizacao.
Registro de dispositivos online.
Lixeira para recuperar ou consultar itens removidos.
Auditoria de acoes importantes do sistema.
Lembretes automaticos para pendencias e stock baixo.
Modulos do sistema
Injecao
Modulo para lancamentos de producao da injecao, incluindo:

tipo de painel;
espessura;
metros produzidos;
velocidade;
fita;
densidades;
paragens;
finalizacao de turno;
historico e PDF do relatorio.
Bobines
Modulo para controle de bobines e filmes, com lancamentos diarios, historico, edicao e geracao de PDF.

Serra
Modulo de corte na serra. Permite lancar pedidos, itens de stock, RAL, espessuras, acabamentos, metros e quantidades. Tambem gera relatorios em PDF e mantem historico.

Embalagem
Modulo de corte/embalagem com funcionamento semelhante ao modulo de serra, incluindo pedidos, stock, RAL, metros, quantidades, historico e PDF.

Plano
Modulo para planejamento de producao. Permite criar planos por pedido ou stock, definir destinos, quantidades, metros, espessuras, qualidade e gerar relatorios gerais.

Gestao
Area de consulta e acompanhamento dos historicos do sistema. Reune informacoes dos modulos produtivos e permite visualizar, editar e exportar registros conforme as permissoes do usuario.

Ajustes
Area de configuracao do sistema, incluindo listas usadas nos formularios, parametros de stock, preferencias visuais e opcoes operacionais.

Stock
Controle de stock de bobinas e filmes, com:

cadastro de bobinas;
cadastro de filmes;
fornecedores;
medidas;
RAL;
espessuras;
status;
pesquisa;
resumo de quantidades;
alertas de stock baixo.
Permissoes
Modulo administrativo para configurar o que cada cargo ou usuario pode ver, editar e excluir.

Conferencia
Modulo para acompanhar conferencia de pedidos, unidades e status de finalizacao.

Lixeira
Area para consultar registros apagados e manter rastreabilidade de exclusoes.

Lembretes e Registros
Recursos adicionais para supervisores e administradores:

lembretes de relatorios pendentes;
avisos de stock baixo;
registros de auditoria;
pesquisa de acoes por usuario, secao, data ou descricao.
Perfis de usuario
O sistema trabalha com cargos e permissoes:

admin: acesso total, incluindo permissoes e auditoria.
supervisor: acesso amplo aos modulos operacionais e de gestao, conforme configuracao.
operario: acesso aos modulos basicos definidos pelo sistema ou pelo administrador.
Por seguranca, credenciais de administrador nao devem ficar publicadas no README. Configure os usuarios e senhas diretamente no sistema antes de usar em producao.

Sincronizacao com Firebase
O arquivo firebase-atlas.js inicializa o Firebase e sincroniza os dados do navegador com o Firestore.

Entre os dados sincronizados estao:

usuarios;
usuarios excluidos;
historicos de injecao;
historicos de bobines;
historicos de serra;
historicos de embalagem;
planos;
conferencia;
configuracoes;
stock;
backup do localStorage;
dispositivos online;
versao publicada do sistema.
A aplicacao tambem escuta atualizacoes em tempo real e aplica dados recebidos da nuvem quando necessario.

PWA e cache
O projeto possui:

manifest.json, com nome, icones e configuracao de instalacao;
sw.js, responsavel pelo service worker e cache dos arquivos principais;
controle de versao em index.html, usado para limpar cache antigo e avisar quando existe atualizacao.
Por isso, o sistema pode ser instalado no celular ou computador como aplicativo.

Estrutura de arquivos
.
|-- index.html                  # Tela principal, login, estrutura dos modulos e carregamento dos scripts
|-- style.css                   # Estilos da interface
|-- script.js                   # Logica principal do sistema e modulos operacionais
|-- firebase-atlas.js           # Integracao e sincronizacao com Firebase
|-- historicos-admin.js         # Gestao e edicao avancada de historicos
|-- atlas-ajustes-fachadas.js   # Ajustes especificos de paineis, fachadas, RAL e detalhes de corte
|-- manifest.json               # Configuracao PWA
|-- sw.js                       # Service worker e cache offline
`-- logo.png                    # Icone/logo do sistema
Como executar localmente
Como o sistema e estatico, basta servir a pasta em um servidor local.

Exemplo com Python:

python -m http.server 8000
Depois acesse:

http://localhost:8000
Tambem e possivel publicar em qualquer hospedagem estatica, como GitHub Pages, desde que os arquivos estejam na raiz publicada.

Tecnologias usadas
HTML5
CSS3
JavaScript
Firebase Firestore
PWA / Service Worker
Font Awesome
Google Fonts
html2pdf.js
Observacoes importantes
O sistema armazena dados localmente no localStorage e sincroniza com Firebase.
As regras de seguranca do Firestore devem ser configuradas corretamente antes de uso real.
O cache do PWA pode manter arquivos antigos; por isso o projeto possui rotina propria de atualizacao.
O projeto nao possui processo de build. Alteracoes em HTML, CSS e JavaScript entram em vigor ao atualizar a pagina/publicacao.
