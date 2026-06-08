Análise da Estrutura do App Atlas
Pelas telas fornecidas (login, Início, Contatos, Agenda, Enquetes) é possível mapear as principais entidades e fluxos de dados do app. Há usuários (ex.: “Victor” na tela inicial) com perfil e roles (eleitores, captadores, lideranças, etc.), e um banco local que armazena dados de eleitores cadastrados (nome, endereço, CPF/E-mail), atividades de agenda (reuniões, visitas com data e horário, vinculadas a eleitores), e enquetes (pesquisas com perguntas e contagem de respostas). A tela “Meus Contatos” indica que cada eleitor cadastrado possui nome e endereço (ex.: “João da Silva, Rua das Flores, 123”). A tela “Enquetes” sugere que há registros de pesquisas (perguntas, status “Ativa/Encerrada” e respostas totais). Na arquitetura, provavelmente há um repositório local (SQLite ou similar) que guarda essas entidades, e uma API para sincronizar quando online.

Requisitos Funcionais das Mudanças Solicitadas
Título de eleitor: Cada cadastro de eleitor deve incluir o campo “Título de Eleitor”. No fluxo de registro/edição de eleitores, adicionar um campo para esse número. Nos relatórios ou na visualização de perfis, exibir o título do eleitor associado. Isso pode requerer alterar o modelo de dados local (adicionando um atributo tituloEleitor) e atualizar formulários e visualizações.
Renomear “Apoiador” para “Cabo Eleitoral”: Em todo o app e na base de dados, trocar o nome do perfil/papel “Apoiador” para “Cabo Eleitoral”. Isso envolve modificar rótulos nas telas e rotas condicionalmente baseadas em role para refletir o novo termo. Por exemplo, se houver uma role no código role: 'apoiador', deve-se mudar para role: 'cabo_eleitoral'.
QR Code no App: Implementar leitura (scanner) e/ou geração de QR codes. Por exemplo, permitir que captadores escaneiem um QR code do título do eleitor ou do perfil do candidato para registros rápidos. É possível usar bibliotecas consolidadas (ex.: em Flutter, [qr_flutter] para gerar QR e [mobile_scanner] para leitura)
. Deve-se tratar permissões de câmera e desenhar um overlay claro para apontar o código
.
Extração de Dados: Incluir funcionalidade para exportar dados do app (por ex. lista de eleitores ou de votos) em formato padrão (CSV, PDF). Bibliotecas como react-native-fs (no React Native) permitem criar arquivos no dispositivo
. Em apps web/Next.js, pode-se gerar CSV manualmente (concatenando linhas e criando um Blob para download) ou usar libs como json2csv/PapaParse
.
Visão Geral de Dados (Gestor): Criar tela/dashboards que mostrem métricas consolidadas para gestores (total de eleitores cadastrados, votos coletados por região, enquetes respondidas, etc.). Apenas perfis de gerência (“Liderança”) devem acessar essa visão. Deve exibir gráficos e contagens agregadas dos dados locais/sincronizados.
Novos Papéis e Acesso por Aba: Incluir papéis adicionais – Coordenador Regional, Coordenador Geral – além de Liderança, Captador de Votos e Eleitores. A navegação do app (abas Início, Contatos, Agenda, Enquetes) deve permitir acesso condicionado pela role do usuário. Por exemplo:
Liderança: Aba extra (ex.: “Administração”) exclusiva para líderes.
Coordenador Geral: Aba que mostra o trabalho agregado de todas as equipes (vinculado a um deputado).
Coordenador Regional: Aba “Equipe” onde pode ver atividades de cada captador de sua coordenação.
Captador de Votos: Acesso à interface padrão (Contatos e Agenda), sem visão de coordenação.
Eleitor: Papel básico (pode receber enquetes, mas não acessa abas administrativas).
Isso implementa um controle RBAC (Role-Based Access Control): cada role tem um conjunto de permissões e telas acessíveis
. O app verificará o role do usuário no login e exibirá apenas as abas permitidas.

Tela do Coordenador: Criar, para cada coordenador, uma tela que liste todos os captadores de sua equipe e permita ver detalhes do trabalho de cada um (ex.: quantos eleitores cadastrou, quais atividades fez). Trata-se de um modo de visualização adicional acessível apenas a coordenadores. Além disso, a interface normal do captador permanece inalterada – ou seja, o captador continua sem controles de coordenação.
Offline nos Celulares: Fazer com que o app funcione no modo offline-first. Segundo práticas de arquitetura mobile, um app offline-first deve manter um repositório local contendo pelo menos os dados básicos para operação e só depender da rede para sincronizar
. Em implementação, usar um banco de dados local (SQLite, Realm, ou o próprio AsyncStorage aprimorado) para armazenar eleitores, atividades e enquetes. As leituras de dados deverão ocorrer sempre localmente; as escritas são salvas localmente e sincronizadas em background quando houver conexão. Em suma, o app consegue exibir e salvar registros mesmo sem internet, após o que “vence” conflitos de sincronização mais tarde
.
Tecnologias e Bibliotecas Recomendadas
QR Code: Em Flutter, o pacote mobile_scanner oferece scanner universal (Android/iOS), e qr_flutter gera códigos QR
. Em React Native, pode-se usar react-native-qrcode-scanner ou combinar react-native-camera com ZXing. É importante implementar “debouncing” (pausar o scanner após leitura) e pedir a permissão de câmera de forma amigável
.
Offline: Adotar arquitetura offline-first: por exemplo, Jetpack Room + WorkManager no Android, ou Sqflite/Hive + background sync no Flutter. Isso segue o guia Android para offline-first, que recomenda manter dados locais sempre disponíveis e tratar sincronização posterior
.
Exportação de Dados: Para exportar tabelas ou listas, várias libs existem. Em React/Web, json2csv ou papaparse permitem converter arrays JSON em CSV
. Em apps nativos, react-native-fs permite criar arquivos fisicamente
. A lógica básica (sem libs) é montar uma string CSV e usar uma API de arquivo/Blob para fazer o download ou compartilhamento
.
Permissões/RBAC: Implementar RBAC, atribuindo a cada usuário uma role (ver IBM: cada role representa um conjunto de permissões
). No frontend, checar o role antes de renderizar cada tela/aba. No backend (API), restringir dados conforme a role. Isso segue boas práticas de controle de acesso e principio do menor privilégio
.
Plano de Implementação e Estimativas
Mapear e Atualizar Modelos de Dados (1–2 dias): Analisar a estrutura existente (entidades: Usuário, Eleitor, Enquete, Atividade). Adicionar campo tituloEleitor em Eleitor. Alterar enum/constante ROLE_APOIADOR para ROLE_CABO_ELEITOR. Ajustar servidor/backend se houver para suportar novo campo e nome de role.
Interface de Login/Acesso (0.5 dia): Nada muda, apenas garantir que usuários recebam role correto no login e inicialização do app.
Ajustes de Navegação e Abas (2–3 dias): Incluir novas abas ou condicionalmente exibir “Administração” (para líderes), “Equipe” (para coordenadores), etc. Alterar o menu de abas padrão. Verificar RBAC nos componentes da rota.
Cadastro de Eleitores (1–2 dias): Na tela de cadastro/edição de eleitor, adicionar campo “Título de Eleitor” (validação/mascara de número). No visual do perfil de eleitor (por ex. detalhe do contato), mostrar o título. Armazenar no BD local.
QR Code (2–3 dias): Integrar pacote de QR code. Criar função “Gerar QR” para, digamos, o título ou link de perfil do eleitor. Criar tela “Escanear QR” para captadores. Tratar permissões de câmera. Testar em Android e iOS.
Exportação de Dados (2 dias): Implementar botão “Exportar CSV” nas telas de lista (eleitores, enquetes). Usar lógica de CSV simples ou biblioteca. No web, criar Blob e acionar download; no mobile, usar API nativa para salvar/compartilhar arquivo
.
Dashboard Gerencial (3–4 dias): Desenvolver novas telas de relatório para Liderança e Coordenador Geral (gráficos de votos por região, total de pesquisas respondidas, etc). Pode usar bibliotecas de charts ou componentes de UI já existentes. Garantir que apenas líderes/coordenador geral vejam essas telas.
Tela do Coordenador Regional (2–3 dias): Criar visualização “Equipe” listando captadores de um coordenador e seus indicadores (quantos eleitores cada um cadastrou, etc). Permite filtrar por captador e ver detalhes de trabalho. Usar os mesmos dados de BD das outras telas.
Offline-First (4–5 dias): Adaptar repositório de dados para comportamento offline-first. Garantir que leitura de dados (eleitores, enquetes) sempre recupere da base local. Implementar sincronização (por ex. WorkManager no Android ou isolate no Flutter) para enviar alterações pendentes quando online
. Testar cenários completos sem conexão.
Testes (2–3 dias): Criar testes automatizados (unitários/instrumentação) para todas as funcionalidades críticas: campos de cadastro, leitura de QR, exportação de dados, RBAC (acessos restritos). Testar manualmente fluxo offline.
Cada etapa deve ser revisada por QA com foco em usabilidade. Estima-se um esforço total de duas a quatro semanas de trabalho, dependendo do tamanho da equipe. A abordagem incremental garante que funcionalidades básicas (cadastros e offline) sejam estáveis antes de implementar as telas avançadas.

Fontes: As recomendações de arquitetura offline estão baseadas no guia oficial do Android
. As bibliotecas sugeridas para QR Code são as mais usadas em Flutter
. Para exportação de dados, há exemplos no StackOverflow mostrando o uso de react-native-fs
 e bibliotecas JS para CSV
. O modelo de controle de acesso foi fundamentado em conceitos de RBAC

Adicionar o titulo de eleitor de cada cadastro. Apoiador - cabo eleitoral (trocar o nome no app) Qr code do app Extracao de dados Observacao geral de dados por gerenciador. O app vai ser para coordenadores também, que estao a trabalhando de deputados. Acesso aba diferente de liderança( apenas eles vao acessar)/ coordenador geral( apenas eles vao acessar) / captador de votos/ eleitores Aba de coordenador q consiga ver o trabalho de cada captador, uma normal mas para o Captador sem o controle de coordenador. E uma aba do coordenador geral que é ligado ao deputado rodar offline nos celulares: na reunial la foi esses pontos adotados