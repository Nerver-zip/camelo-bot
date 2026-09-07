# 🐪 camelo-bot
Um bot multifuncional para servidores de **Duel Links**, projetado para trazer praticidade, informação e automação à comunidade.  
Ele integra dados de sites como [**DuelLinksMeta**](https://www.duellinksmeta.com/) e [**YGOProDeck**](https://ygoprodeck.com/), organiza canais do servidor e fornece estatísticas úteis sobre cartas, decks e torneios.

---

## ⚙️ Comandos principais

### 🃏 `/card`
Busca informações detalhadas de **qualquer carta** do Duel Links.  
Exibe:
- Nome, tipo, ATK/DEF e atributos
- Descrição completa do efeito
- Arquétipo pertencente

---

### 📊 `/stats`
Mostra suas **estatísticas pessoais** no servidor.  
Inclui:
- Número de interações
- Quantidade de cartas pesquisadas
- Decks consultados
- Outras métricas de uso do bot

---

### 🧱 `/builds`
Retorna até as **10 builds mais recentes** de um arquétipo no **DuelLinksMeta**.  
Permite navegar entre as builds usando botões ⬅️ ➡️, com acesso restrito ao usuário que executou o comando.

> Exemplo: `/builds nome: Blue-Eyes`

---

### 🧩 `/meta`
Gera um **gráfico dos decks mais utilizados** em torneios recentes.  
Os dados são atualizados automaticamente com base nas estatísticas do DuelLinksMeta.

> Ideal para acompanhar o meta game atual

---

### 🎯 `/skill`
Exibe informações detalhadas sobre uma **Skill**, incluindo:
- Descrição completa
- Personagem que a utiliza
- Como obtê-la (nível, evento, drop etc.)

---

### 🏆 `/tournaments`
Lista os **próximos torneios** marcados para os próximos dias, com links diretos de inscrição ou acompanhamento.

---

## 🧭 Comandos de organização de canal

Além dos comandos de Duel Links, o **camelo-bot** também auxilia na organização do servidor:

- `/organize-channels` — Organiza canais em categorias predefinidas  
- `/create-channels` — Cria novos canais com permissões automáticas  
- `/move-channels` — Move canais entre categorias de forma prática
- `/get-tier-list` — Realoca automaticamente os decks em categorias que refletem a tier list atual do jogo

> Ideal para servidores grandes ou que realizam eventos frequentemente.

---

## 💡 Sobre
O **camelo-bot** é um projeto em constante evolução, com foco em:
- 🔍 Consultas rápidas e precisas  
- 🧠 Integração inteligente com dados externos  
- ⚡ Atualizações automáticas e cache local  
- 🧭 Ferramentas úteis para administração de servidores

---

## 📦 Tecnologias
- **Node.js** + **Discord.js**
- **Axios** para integração com APIs externas
- **Local cache system** (para builds e sitemaps)
- **Sistema de sugestões** baseado em Trie e fuzzy matching

---

## 🧪 Status
Atualmente, o bot está em **fase ativa de desenvolvimento**.  
Novas funcionalidades estão sendo adicionadas com foco em estabilidade, performance e automação.

---

> 💬 “Online nas horas vagas”  
> — *Camelo 🐪*

---

### Rode localmente:

#### Dependências principais

- Node.js (versão 18 ou superior) — necessário para rodar o bot.
- g++ — usado para compilar e os módulos C++ integrados.
- Cloudinary — serviço externo para upload e armazenamento de imagens.
- Chromium/Google Chrome - necessário para web scraping com Puppeteer.
- É preciso criar registrar seu bot em [discord.dev](https://discord.com/developers/applications) e configurá-lo da seguinte forma:
  ```
  Scopes
  applications.commands   bot
  ```
  ```
  Permissions
  Attach Files Embed Links Manage Channels Manage Messages Manage Server Read Message History Send Messages View Channels View Server Insights
  ```
- 1. Baixe o projeto
     ```bash
     git clone https://github.com/Nerver-zip/camelo-bot.git
     ```
- 2. Crie um arquivo .env na raíz do projeto e adicione as suas credenciais. Esqueleto:
     ```dotenv
     #Token gerado no registro do bot
     TOKEN=TokenFornecidoPeloDiscord
  
     #Id do seu bot dado pelo Discord
     CLIENT_ID=123456789
     
     # IDs do seu seus servidores. Pode passar multiplas guilds separando por ;
     GUILD_ID=123456789;987654321

     CHROME_PATH=ajuste para o caminho do chrome/chromium na sua máquina

     # Registrar comandos como globais ou na guild. Guild registra imediatamente
     # global /  guild
     COMMAND_SCOPE=guild

     #Cloudinary stuff
     CLOUDINARY_CLOUD_NAME=seucloudname
     CLOUDINARY_API_KEY=suaapikey123456789
     CLOUDINARY_API_SECRET=suaapisecret123456789
     ```
- 3. Compilar binários C++
     ```
     cd camelo-bot
     make
     ```
- 4. Instalar dependências
     ```nodejs
     npm install
     ```
- 5. Registrar comandos
     ```bash
     node src/deployCommands.js
     ```
- 6. Iniciar
     ```bash
     node src/bot.js
     ```

## 🐳 Docker

O Compose deste repositório executa somente o `camelo-bot`. Os dados JSON de
entrada ficam no volume Docker externo `channel-output`, que deve existir antes
do primeiro start.

### Setup a partir de um clone

```bash
git clone https://github.com/Nerver-zip/camelo-bot.git
cd camelo-bot
cp .env.example .env
chmod 600 .env
```

Preencha `.env` com as credenciais do bot e das APIs. O arquivo real `.env` é
local e não deve ser commitado.

Valide e construa a imagem:

```bash
docker compose config --quiet
docker compose build
```

Inicie o serviço quando estiver pronto:

```bash
docker compose up -d
docker compose ps
docker compose logs -f camelo-bot
```

O container compila os servidores C++ durante o build, inclui Chromium e roda
como usuário sem privilégios. Não há portas públicas configuradas.

### Persistência

O Compose usa volumes nomeados para:

- `channel-output`: diretório persistente de JSONs consumidos pelo bot;
- `camelo-charts`: gráficos e dados auxiliares;
- `camelo-history`: históricos e mirrors.

Não use `docker compose down -v` em produção, pois isso remove esses dados.

### Memória e scrapers

Cada coleta fecha seu Chromium em `finally`, inclusive quando a criação ou
configuração da página falha. Se o fechamento falhar ou exceder 5 segundos,
o processo daquele navegador é encerrado à força. Não é necessário fechar
páginas separadamente: `Browser.close()` fecha todas elas
([documentação do Puppeteer](https://pptr.dev/api/puppeteer.browser.close)).
A rolagem do Tonamel tem limite de 100 passos por passagem para evitar que
uma página que cresce continuamente prenda a coleta. A extração do meta
bloqueia imagens e mídia, além de fontes e CSS.

Os caches de cartas e artes mantêm até 500 entradas cada, descartando as menos
recentemente usadas. Respostas de slash commands não ficam guardadas em um
mapa permanente: IDs de interações não correspondem a IDs de mensagens deletadas.

Para acompanhar o consumo e a idade dos processos do container em execução:

```bash
docker stats --no-stream camelo-bot-camelo-bot-1
docker top camelo-bot-camelo-bot-1 -eo pid,ppid,rss,etime,comm
```

Chromium deve existir apenas durante coletas. Processos com vários dias de
vida indicam retenção; compare períodos ociosos equivalentes após atualizar.
RSS dos processos compartilha páginas e não deve ser somado como memória
exclusiva do container. A estabilização ao longo de dias exige acompanhamento
após a implantação; os testes locais não demonstram essa estabilidade.

Execute `npm test` para validar caches limitados e encerramento em falhas.
Para repetir a verificação com Chromium real, sem credenciais ou rede:

```bash
docker build -t camelo-bot:memory-check .
docker run --rm --network none camelo-bot:memory-check node scripts/check-browser-memory.js
```

### Atualização e rollback

```bash
git pull --ff-only
docker compose build camelo-bot
docker compose up -d camelo-bot
```

Para rollback, selecione um commit anterior conhecido, reconstrua a imagem e
suba novamente o serviço. Mantenha os volumes nomeados durante o rollback.
