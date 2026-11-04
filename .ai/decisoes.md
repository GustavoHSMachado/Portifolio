# Decisões técnicas — Portifolio v2

> Decisões já tomadas, com o motivo. Consolidado em 10/09/2026 a partir dos
> comentários do código, de `docs/ESTADO-ATUAL.md`, `CONTEXTO-DO-PROJETO.md` e
> do relatório de homologação. Mudar qualquer uma delas exige entender antes por
> que ela está aqui.

---

## Arquitetura

**D-01 · Backend e frontend separados, conversando só por JSON.**
A v1 misturava PHP e HTML no mesmo arquivo. A separação permite publicar o site
e a API em provedores diferentes — que é exatamente o que acontece hoje.

**D-02 · MVC próprio, sem framework.**
O container de DI é minimalista, com autowiring por reflexão, porque é o que o
projeto precisa. Não se troca por Symfony DI "para o futuro": complexidade entra
quando o benefício for demonstrável hoje.

**D-03 · `Cors` antes do `ErrorHandler` no pipeline.**
Um middleware só enxerga a resposta que o seguinte devolve. Com o `Cors` abaixo,
toda resposta de erro saía sem `Access-Control-Allow-Origin` e o navegador a
transformava em "não conseguimos falar com o servidor". **Não reordenar.**

**D-04 · Conteúdo do portfólio no banco, não no código.**
O painel precisa editar sem deploy. Dado no código + tela de edição dariam duas
fontes para a mesma informação, que um dia divergem.

**D-05 · `site_settings` como chave/valor com padrões no código.**
Cada novo ajuste de aparência viraria uma coluna e uma migration. Os padrões
vivem em `SiteSettings::PADROES`; limpar o campo volta ao padrão.

---

## Autenticação e segurança

**D-06 · Segundo fator por e-mail no login (22/08/2026).**
Senha correta não abre sessão. Isso é o que sustenta uma política de senha de
mínimo 7 caracteres: quem adivinhar a senha ainda precisa da caixa de entrada.

**D-07 · Access token em memória, refresh em cookie `httpOnly`.**
`localStorage` entregaria a sessão a qualquer XSS. O refresh é opaco, rotativo e
por família; reuso derruba a família inteira.

**D-08 · Janela de tolerância na rotação (`REFRESH_ROTATION_GRACE`, 29/08/2026).**
Duas abas renovando ao mesmo tempo eram lidas como token roubado. A janela fica
ancorada na primeira rotação e não pode ser esticada indefinidamente.

**D-09 · Argon2id, e não MD5.**
Medição de 22/08/2026 no próprio container: 3,5 milhões de hashes MD5 por
segundo contra 5 do Argon2id — e MD5 não tem sal.

**D-10 · `ADMIN_EMAIL` além do papel no banco.**
Checar só `users.role` confia inteiramente numa coluna. A allowlist vive no
`.env` do servidor, fora do alcance de quem escreva nessa coluna. Aceita mais de
um endereço (vírgula) porque o E2E precisa de um endereço em domínio reservado.
O e-mail é lido do banco, não das claims do token.

**D-11 · Exclusão de conta anonimiza.**
Só marcar `deleted_at` prenderia o e-mail na constraint única para sempre, e
apagar a linha deixaria a auditoria órfã. Ver `User::softDelete`.

**D-12 · Senha já usada não volta.**
`password_history` guarda as últimas senhas da conta — cinco por padrão
(`PASSWORD_HISTORY_SIZE`), a em vigor inclusive; a recusa acontece antes de
qualquer escrita.

**D-13 · Cadastro responde igual para e-mail novo e existente.**
O 201/202 anterior entregava a existência da conta a um único `curl`. Corrigido
em 29/08/2026 — os dois casos devolvem 201 com o mesmo corpo.

**D-14 · Rate limit persistido em banco, por IP + rota.**
Na v1 o limite morria ao trocar de sessão. Os padrões de `STRICT_RULES` são os
valores de produção: ambiente que não configura nada continua protegido. O
compose local afrouxa esses limites de propósito, para a suíte E2E rodar duas
vezes na mesma hora — **não replicar em produção**.

**D-15 · CSP no site (23/08/2026).**
Veio junto do XSS armazenado real encontrado no JSON-LD, cujo escape estava
escrito com uma única barra invertida no `<` — que em JavaScript **é** o
próprio caractere `<`, então a troca não fazia nada. Corrigido com barra dupla e
coberto por testes, porque um comentário mente e um teste não.

**D-16 · O e-mail de cadastro sai depois do commit.**
Dentro da transação, o SMTP a segurava aberta pelo tempo da entrega e o link
podia chegar antes de o token existir no banco.

---

## Frontend

**D-17 · Todo acesso a dados passa por `lib/api.ts`.**
Componente não faz `fetch`. É ali que vivem a dedução de 401, o refresh único
compartilhado e o tratamento de erro por campo.

**D-18 · A fonte é servida do repositório.**
`next/font/google` baixa no build, e um timeout publica a página com a fonte de
sistema sem avisar. Junto disso apareceu o `--font-sans` com a string literal
`"Open Sans"`, que só casava com a fonte instalada na máquina de quem visita.

**D-19 · Home com `revalidate: 60` mais rota de revalidação sob demanda.**
Um minuto de home antiga parece defeito para quem acabou de trocar a cor. Quem
autoriza a revalidação é a API, não o Next: o token é repassado a uma rota
administrativa e só um 200 libera.

**D-20 · `prefers-reduced-motion` com exceção para carregamento.**
O reset global matava spinner e shimmer, e quem ativa "reduzir movimento" ficava
sem nenhum sinal de que algo estava acontecendo.

---

## Infraestrutura e processo

**D-21 · A imagem web é Debian, não Alpine.**
O `package-lock.json` foi gerado fora do Alpine e não traz o campo `libc`; o npm
instalava só a variante glibc do SWC, que falha no Alpine e derrubava o build.

**D-22 · `output: "standalone"` desligado na Vercel (30/08/2026).**
Com standalone, o Next escreve os arquivos de rastreamento dentro de
`.next/standalone` e o builder da Vercel os procura na raiz: o build gera as
páginas e morre em `ENOENT .next/next-server.js.nft.json`. O Docker continua
recebendo o standalone.

**D-23 · A API é um site próprio na Hostinger, não um subdomínio.**
Pelo menu Subdomínios a pasta nasce dentro do `public_html` do domínio
principal, e o `.env` fica exposto na web. Como site próprio,
`public_html/` guarda só `index.php` e `.htaccess`, e `src/ vendor/ database/
storage/ .env` ficam fora dele — que é o que `public/index.php` já espera.

**D-24 · Site e API sob o mesmo domínio registrável.**
O cookie de refresh usa `SameSite=Strict`; domínios diferentes fariam o
navegador nunca enviá-lo, e a sessão cairia a cada 15 minutos.

**D-25 · A `v1/` fica no repositório, congelada (22/08/2026).**
Ela é a evidência do projeto que o portfólio destaca — a reconstrução a partir
de uma auditoria com 22 falhas. Nenhum container a serve e o `v1/README.md`
recusa código novo. Ressalva: publicar o repositório inteiro num servidor com
PHP faria os arquivos da raiz dela voltarem a responder.

**D-26 · Branches `master` e `dev`, não `main`/`develop`.**
O repositório nasceu assim; renomear quebraria clones existentes por ganho
nenhum. A `master` é produção e o Gustavo a trata como tal: merge só com
autorização explícita dele.

**D-27 · O E2E roda no serviço `e2e`, com a imagem oficial do Playwright.**
A tag da imagem no compose precisa acompanhar a versão de `@playwright/test` no
`package.json`; desalinhadas, o navegador não abre.

**D-28 · O E2E faz o login final numa aba nova.**
A tela de login chega por navegação do lado do cliente, e digitar durante a
transição não funciona — a montagem limpa os campos. `goto` e `reload` disputam
com a navegação em curso.

**D-29 · Observabilidade opcional, ligada por `.env`.**
O Sentry só é inicializado quando há `SENTRY_DSN` — não se cria dependência de
conta de terceiro para rodar o projeto. O OpenTelemetry ficou no meio do
caminho: o pacote está no `composer.json` e as variáveis `OTEL_*` no
`.env.example`, mas **nenhum código o usa**. Preenchê-las hoje não produz
telemetria nenhuma.

**D-30 · Toda habilidade declara onde foi usada.**
As entradas da seção de tecnologias trazem evidência ancorada em fonte
verificável (experiências cadastradas ou este repositório). A do Java declara o
alcance real e o que fica de fora.

**D-31 · A vitrine de projetos voltou a ser pública (01/11/2026).**
Exigir sessão para ver os projetos invertia o propósito do portfólio: quem
decide sobre o trabalho — recrutador, cliente — é justamente quem não tem conta.
A troca é de critério, não de rigor: a pergunta deixou de ser "quem está
autenticado" e passou a ser "o que está publicado". `published = 1` já existia e
já era filtrado em `publishedProjects()`; virou a única trava, então ganhou
teste de integração próprio. Projeto em construção não aparece porque fica como
rascunho no painel — não se criou campo de situação para isso.
Em aberto: `/projetos` é renderizada no cliente, então o rastreador indexa a
casca. Se a vitrine passar a valer por busca, ela precisa virar renderização no
servidor com revalidação, como a home já faz em `fetchContentSafe()`.

**D-32 · Foto de projeto em disco, com o caminho no banco (01/11/2026).**
Imagem em `BLOB` entraria em todo `mysqldump`, obrigaria o PHP a carregar o
arquivo na memória a cada exibição e tiraria a foto do alcance do cache do
navegador — uma captura passaria a custar uma consulta por visita. O caminho é
relativo (`uploads/projetos/xxx.png`) e nunca absoluto: trocar de domínio não
deve exigir `UPDATE` em cima dos dados, e quem monta a URL é o presenter, a
partir de `APP_URL`. Tabela própria, e não coluna em `projects`, porque um
projeto mostra mais de uma tela.

A validação do upload não confia em nada que o cliente escolhe: o tipo é lido
dos bytes com `finfo`, a extensão vem do tipo detectado e o nome em disco é
sorteado — é assim que `../../index.php` deixa de ser um problema, em vez de ser
tratado com sanitização. `getimagesize()` derruba o PHP renomeado para `.jpg`, e
SVG fica fora da allowlist por ser XML com `<script>` dentro.

O que **não** é feito: reconstruir a imagem para descartar metadados. Exigiria a
extensão GD, que não está no container e não é verificável no PHP da Hostinger.
O risco que sobra — payload no EXIF — é contido pelo `.htaccess` que nega
execução na pasta e pelo `nosniff` que a API já envia. Habilitar GD é um rebuild
das imagens dev e prod, e fica como opção.

O limite de 2 MB está amarrado ao `upload_max_filesize` do PHP: elevar só a
constante não serve de nada, porque o PHP descarta o arquivo antes de o código
rodar e a requisição chega com `UPLOAD_ERR_INI_SIZE`.

Risco de operação registrado: a pasta de uploads **não** é versionada, e o
deploy da API é envio manual de pacote. Um envio que sobrescreva
`public_html/uploads/` apaga as fotos. Ela precisa entrar no backup e ficar fora
do pacote.

**D-33 · A ordem dos projetos passou a ser editável (01/11/2026).**
A coluna `position` existia desde o início, a consulta ordenava por ela e o
backend a persistia — mas nenhum formulário do painel tinha o campo. O
`form.get("position")` não encontrava nada, o `?? 0` assumia zero, e a ordem na
vitrine caía sempre no `id`: a ordem de cadastro. Num portfólio isso importa,
porque o projeto mais forte deveria abrir a vitrine. O campo entrou no
formulário de projetos. **Os outros três formulários (formação, experiências,
habilidades) seguem com o mesmo defeito** — ficaram fora por escopo.

**D-34 · O `tsconfig.json` está fora do formatador do Biome (01/11/2026).**
O Next 16 reescreve esse arquivo sozinho, e escreve arrays expandidos
(`"lib": [` em várias linhas) onde o Biome quer uma linha só. O resultado era um
erro de formatação permanente, que deixava `npm run lint` com saída 1 e o job de
lint do CI vermelho desde `4999fc8` — sem nada de errado em `src/`.

Formatar o arquivo não resolveria: a próxima execução do Next o reescreveria e o
erro voltaria. Quem manda no `tsconfig.json` é o Next, então ele saiu do
`formatter.ignore` do Biome em vez de entrar numa disputa que se repete a cada
`next dev`. O lint do TypeScript sobre o arquivo continua valendo — o que saiu é
só a formatação.

**D-35 · O Lighthouse não exige SEO da tela de login (02/11/2026).**
O job `performance` nunca havia rodado — ele só dispara em `pull_request`, e o
primeiro PR do repositório é de 02/11/2026. Quando rodou, reprovou numa única
asserção: `categories:seo` em `/entrar`, com 0,63 contra o mínimo de 0,9, igual
nas três medições.

A nota é baixa porque a página está **corretamente** fora do índice: o layout de
`(auth)` declara `robots: { index: false, follow: false }`, e o Lighthouse conta
"Page is blocked from indexing" dentro da categoria SEO. A configuração exigia
nota de busca de uma tela que o projeto decidiu, por escrito, manter fora da
busca — a asserção não tinha como passar.

`/entrar` **continua auditada**: é onde se digita senha, e regressão de
performance ou de acessibilidade ali importa. O que saiu foi apenas o SEO. Em
vez de `assertions`, a configuração passou a usar `assertMatrix` com dois
grupos, e o padrão da URL foi escrito por negação (`^(?!.*/entrar$).*`) para que
qualquer URL nova caia no grupo completo — inclusive SEO. O lado seguro é o
padrão; a exceção é que precisa ser declarada.

Verificado rodando o `lhci` no serviço `e2e`, que já traz navegador. Três
tropeços de ambiente ficam registrados para a próxima vez: o build de produção
falha com o `next dev` ativo (use `NEXT_DIST_DIR=.next-prod` **e** pare o
`web`); o Git Bash do Windows reescreve `/ms-playwright/...` como
`C:/Program Files/Git/...` quando o caminho passa por `-e`, então resolva a
variável dentro do container; e o Chrome recusa rodar como root sem
`--no-sandbox`, flag que o CI não precisa porque lá o job não é root.

**D-36 · O `php -S` do CI atende uma requisição por vez (02/11/2026).**
A suíte E2E reprovou no PR #1 em 1 cenário de 92 — "consome o token uma única
vez", só no Firefox, nas três tentativas. O mesmo commit havia passado no push
para a `dev` minutos antes: código idêntico, resultados diferentes. Não era
defeito do produto. O snapshot de acessibilidade capturado na falha mostra a
página em `status: Confirmando seu e-mail`, o estado `verifying` da tela — que
só existe depois de o React hidratar e disparar o
`POST /api/v1/auth/verify-email`. A tela fazia o que deve fazer: esperar a
resposta. Quem demorava era a API, que no CI sobe com `php -S` e sem
`PHP_CLI_SERVER_WORKERS`; nessa configuração o servidor embutido do PHP **não
faz fork** e atende uma requisição por vez, enquanto a suíte bate nele com
5 projetos de navegador × 2 workers. Medido no container local (mesmo `php -S`,
PHP 8.3), 10 requisições paralelas de 1 s levaram 10010 ms sem a variável,
5004 ms com 2 workers, 5008 ms com 4 e 3005 ms com 8 — amostra única, e a
escala não é linear porque os filhos competem no `accept`. O que importa é que
a serialização absoluta desaparece, e era ela que estourava os 5 s. A
reprodução mediu as quatro condições: com o `expect` de 20 s do ambiente local
o cenário passou 10 de 10; com o `expect` de 5 s do CI falhou 2 de 10; com 5 s
e um único worker do Playwright passou 10 de 10; e com 5 s, dois workers e a
API em 4 processos passou 20 de 20. Por isso a correção foi
`PHP_CLI_SERVER_WORKERS=4` no workflow, e não subir o `expect`: o limite de 5 s
é vigilância legítima, e afrouxá-lo para a suíte inteira pagaria com cegueira
generalizada o preço de um gargalo de um lugar só. Em produção a API roda sob
PHP-FPM, com vários processos — o funil não existe lá, e medi-lo era medir o
ambiente de teste, não o produto. O compose local **não** ganhou a variável:
ali o `expect` é de 20 s e o sintoma nunca apareceu; quem precisar reproduzir
sobe a API com a variável por um arquivo extra passado com `-f`, sem tocar no
`docker-compose.override.yml`.


**D-37 · O deploy da API é automático a cada push na master (02/11/2026).**
O site já subia sozinho pela Vercel; a API dependia de envio manual de pacote,
e foi isso que deixou `/projetos` mostrando "Não foi possível carregar os
projetos agora" ao público por horas depois do merge. Agora o job `deploy-api`,
no fim do `ci.yml`, publica a API por SSH assim que o `quality-gate` fecha
verde — e só em push na `master`. O deploy **envia arquivos**, e não faz
`git pull` no servidor, por três razões verificadas com acesso SSH neste mesmo
dia: a instalação não é um clone; a estrutura de lá não espelha o repositório
(existe só o miolo de `v2/backend/`, e `public/` chama-se `public_html/`); e o
PHP do shell é 8.2.35 enquanto o `composer.json` exige >= 8.3. O `composer
install` passou a rodar no runner, onde a versão é escolhida, e as migrações
usam `/opt/alt/php83/usr/bin/php` explicitamente — com o binário padrão, código
que usa recurso de 8.3 quebraria em produção e em lugar nenhum mais. O backup
do banco roda sempre antes da migração, haja pendência ou não: a regra do
projeto exige backup **e** autorização, e como automático não pede autorização,
o que substitui a autorização é a rede embaixo. As fotos têm proteção dupla —
`public_html/uploads/` é excluída do envio **e** fica fora do `--delete`, que só
se aplica a `src`, `database` e `vendor`, inteiramente derivados do repositório.
O `.env` nunca é enviado, e o deploy recusa seguir se ele sumir.

Três tentativas falharam antes da que funcionou, e nenhuma tocou no servidor,
porque a verificação vem antes do envio: a primeira e a segunda por erro no
secret `HOSTINGER_API_PATH` (apontava para `public_html` e usava `~`, que não
expande vindo de variável), e a terceira no backup, com `exit 127` e
`./.env: line 56: PT: command not found`. Essa terceira ensinou o que fica
registrado aqui: **`source` num `.env` faz o shell interpretar o arquivo como
script**, e o formato que o phpdotenv aceita não é script de shell — o bash
tentou executar parte de um valor. As chaves passaram a ser lidas com `sed`,
sem executar nada. O `.env` de produção também usa `DB_NAME`, `DB_USER` e
`DB_PASS`, não os nomes que o script presumia.

Fica em aberto uma limitação conhecida: durante o envio há alguns segundos em
que convivem arquivos novos e antigos. Resolver exigiria deploy atômico — pasta
nova e troca de link simbólico —, o que mudaria a estrutura do servidor. Para o
volume deste projeto não compensa.


**D-38 · Um campo de descrição no lugar dos três do caso (02/11/2026).**
`problem`, `decisions` e `result` deram lugar a `description`. A estrutura em
três partes nasceu para forçar o que separa portfólio de lista de
repositórios, e cumpriu esse papel no projeto que ela descrevia — mas obrigava
a repartir em três um texto que nem todo projeto tem em três, e campo que a
pessoa não sabe preencher fica vazio. Decisão do Gustavo, com a perda na mesa:
os 1.094 caracteres do único projeto cadastrado **não** foram migrados, porque
ele preferiu recomeçar o texto a herdar um emendado; o backup que o próprio
deploy tirou antes da migração guarda o original. Na vitrine o bloco recolhido
virou "Sobre o projeto", com `white-space: pre-line` para que as quebras
digitadas no painel sobrevivam.

No mesmo trabalho, o envio de fotos passou a aceitar várias de uma vez, e a
validação saiu do componente para `lib/portfolio.ts`: `recusarFotos` é função
pura, devolve a primeira queixa do lote ou `null`, e recusa a seleção inteira
de propósito — aceitar os válidos e descartar os ruins em silêncio deixaria
alguém achando que mandou cinco quando mandou três. O envio é em série, uma
requisição por foto, e a lista recarrega mesmo quando o lote falha no meio,
para mostrar o que de fato entrou.

**E aí apareceu o defeito que nenhum teste pegava: o envio de fotos nunca
funcionou pelo navegador.** O bloco usava dois `<form>` desenhados dentro do
formulário do projeto. Formulário aninhado não existe em HTML; o parser
desaninharia, mas o React constrói o DOM por JavaScript e o aninhamento
persiste — o submit do interno subia para o externo, e clicar em "Enviar foto"
recarregava a página com os campos na URL (`/admin?descricao=...`). Estava
assim desde que o bloco foi criado, em 01/11/2026. Os E2E não exercitam
upload e os testes unitários não montam DOM, então só apareceu quando a tela
foi aberta e usada. Os dois viraram `<div>` com botões `type="button"`.
Verificado depois: nenhum form aninhado, três fotos enviadas de uma vez
gravaram três linhas em `project_images` nas posições 0, 1 e 2, com os três
arquivos em disco, e a vitrine mostrou capa e galeria.

A lição que fica é de verificação, não de código: "os testes passaram" não
cobre o que teste nenhum exercita. Abrir a tela e usar encontrou em dois
minutos o que duas suítes verdes não viam.


**D-39 · O nome da pasta pública é configuração, não constante (03/11/2026).**
As oito primeiras fotos enviadas pelo painel em produção responderam 404. Elas
foram gravadas sem erro, o banco guardou o caminho e o painel mostrou as
miniaturas — mas o arquivo foi parar em `public/uploads/projetos/`, e a
Hostinger serve `public_html`. O `ImageStorage` era registrado com o caminho
fixo `basePath . "/public"`.

O constrangedor é que essa diferença já tinha sido descoberta no mesmo dia, ao
montar o deploy, que mapeia `v2/backend/public/` para `public_html/`. A
correção foi aplicada no envio de arquivos e **não propagada para o código que
grava em tempo de execução** — metade do problema resolvida, e a outra metade
invisível até alguém olhar a vitrine.

Agora o caminho vem de `PUBLIC_DIR`, com `public` como padrão: Docker, testes e
desenvolvimento seguem iguais, e o `.env` de produção declara `public_html`.

Na mesma investigação apareceu um segundo buraco, este de segurança: o deploy
excluía `uploads/` inteira do envio para não apagar as fotos, e com isso o
`.htaccess` que nega execução de PHP na pasta **nunca chegava ao servidor**. A
defesa que existe para o dia em que a validação do upload falhar não estava lá.
O envio passou a usar `--include 'uploads/' --include 'uploads/.htaccess'`
antes de `--exclude 'uploads/*'`, porque o rsync avalia include antes de
exclude; comprovado num container, com uma foto no destino que sobreviveu ao
envio.

A lição é sobre alcance de correção: ao descobrir que duas instalações diferem,
vale procurar **todos** os lugares que dependem dessa diferença, e não só o que
estava na frente. Aqui eram dois, e o segundo só apareceu porque o primeiro foi
testado com dados reais.


**D-40 · A capa é uma foto própria, fora das 8 da galeria (03/11/2026).**
A capa era a primeira foto da galeria, o que amarrava duas decisões
diferentes: qual imagem representa o projeto na vitrine e qual é a primeira
das telas. A capa quer a imagem mais vendedora; a galeria quer ordem de
leitura. Com um campo só, escolher uma estragava a outra.

A flag `is_cover` vive em `project_images`, e não como coluna em `projects`,
para a capa reaproveitar o que a foto já tem: o mesmo upload validado, o nome
sorteado, o `alt` obrigatório e a remoção que apaga o arquivo do disco. Um
`cover_path` em `projects` duplicaria esse caminho inteiro. Ela não ocupa
vaga — o limite de 8 vale para a galeria, e a capa é a nona —, e trocar apaga
a anterior, arquivo e linha, porque guardá-la encheria o disco de imagens que
nenhuma tela mostra.

Não há índice único garantindo uma capa por projeto: o MySQL não tem índice
parcial, e um `UNIQUE (project_id, is_cover)` proibiria duas fotos comuns no
mesmo projeto. Quem garante é `marcarComoCapa()`, que desmarca as demais.

Na vitrine, a galeria mostra a capa à frente das telas, porque quem clica em
"Ver fotos" espera encontrar a imagem que viu no cartão; a tira de miniaturas
do cartão, essa sim, pula a capa — repetir ali seria mostrar a mesma coisa a
dois centímetros de distância.

**D-41 · A foto da galeria amplia, e o Modal passou a usar portal
(03/11/2026).**
Clicar na foto alterna entre ajustada e tamanho real, com a tecla `Z` como
atalho que funciona sem o foco estar na imagem; ampliada, o contêiner rola.
O motivo é prático: numa captura de painel o texto some quando a imagem cabe
inteira na janela, e é justamente o texto que a pessoa quer ler. Trocar de
foto volta ao tamanho ajustado, senão a próxima apareceria cortada num canto
qualquer.

O `Modal` ganhou `createPortal` para o `<body>`, e o caminho até essa mudança
merece ficar escrito porque foi um erro de método. A galeria renderizava com
161px e o diálogo com 219px; construí um diagnóstico inteiro em cima disso —
mexi no flex, depois no portal — até medir a janela e encontrar
`window.innerWidth: 0`. **A janela do navegador de teste estava com 0×0, e
toda medida era artefato disso.** Com a viewport corrigida para 1280×900,
estava certo desde o começo.

A mudança ficou por outro motivo, esse real: `position: fixed` se posiciona
pela viewport exceto sob um ancestral com `transform`, e o cartão da vitrine
é animado pelo framer-motion. A janela é estreita — só durante a animação de
entrada —, mas existe, e diálogo presa dentro de um cartão é defeito que
aparece uma vez em dez e ninguém reproduz.

O portal quebrou o foco inicial: o efeito rodava antes de o diálogo existir no
DOM. **O teste do `Modal` pegou na mesma rodada**, e sem ele quem navega por
teclado ficaria fora do diálogo sem ninguém notar. Corrigido com `montado` nas
dependências, com `biome-ignore` explicando por que uma variável não lida
dentro do efeito está ali.

A lição é sobre medir antes de concluir: três mudanças de CSS saíram de um
número que o ambiente de teste inventou. Conferir a viewport custava uma
linha.

---

## Decisões pendentes

- **Credencial no histórico do Git (B50).** A senha foi revogada em 23/08/2026;
  o risco acabou ali. Falta decidir entre reescrever o histórico com
  `limpar-senha-do-historico.sh` ou aceitar e registrar em `.gitleaksignore`.
- **Procedimento de deploy da infraestrutura real.** `docs/DEPLOY.md` documenta
  VPS/Docker; a produção é Vercel + Hostinger.
- **Agendamento do expurgo em produção.**
