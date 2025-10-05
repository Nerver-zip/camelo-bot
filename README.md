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
- É preciso criar registrar seu bot em discord.dev e configurá-lo da seguinte forma:
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
     TOKEN=TokenFornecidoPeloDiscord
  
     # Pode passar multiplas guilds separando por ;
     CLIENT_ID=IdDoSeuBotFornecidoPeloDiscord
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
- 4. Registrar comandos
     ```bash
     node src/deployCommands.js
     ```
- 5. Iniciar
     ```bash
     node src/bot.js
     ```
