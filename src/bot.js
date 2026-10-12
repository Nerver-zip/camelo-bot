require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { scheduleChartUpdate, scheduleLocalFilesUpdate, scheduleTournamentUpdate, scheduleMatcherUpdate, scheduleTierListUpdate } = require('./scheduler.js');
const { DeckController } = require('./controllers/DeckController.js');
const { NewsFeeder } = require('./automessages/NewsFeeder.js');
const { TournamentFeeder } = require('./automessages/TournamentFeeder.js');
const { stopServers } = require('./utils/auto-suggestions/suggestionServers.js');

// ========== Discord Client ==========
const commands = new Collection();
const transientNetworkErrorCodes = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
]);
const initialLoginRetryDelayMs = 1000;
const maxLoginRetryDelayMs = 30000;
let shuttingDown = false;

function createClient() {
  const botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  botClient.commands = commands;

  botClient.once('clientReady', async () => {
    console.log(`Bot online como ${botClient.user.tag}`);
    await NewsFeeder.init(botClient);
    await TournamentFeeder.init(botClient);
    await scheduleTierListUpdate(botClient);

    botClient.user.setPresence({
      status: 'online',
      activities: [
        { name: '🐪 Online nas horas vagas 🐫' }
      ],
    });
  });

  botClient.on('interactionCreate', async interaction => {
    const command = botClient.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.isAutocomplete()) {
        if (command.autocomplete) {
          await command.autocomplete(interaction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        await command.execute(interaction);
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Ocorreu um erro.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Ocorreu um erro.', ephemeral: true });
      }
    }
  });

  return botClient;
}

function getTransientNetworkErrorCode(error) {
  const seen = new Set();
  let current = error;

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (transientNetworkErrorCodes.has(current.code)) return current.code;
    current = current.cause;
  }

  return null;
}

let client = createClient();

async function loginWithRetry() {
  let attempt = 0;

  while (!shuttingDown) {
    try {
      await client.login(process.env.TOKEN);
      return;
    } catch (error) {
      const code = getTransientNetworkErrorCode(error);
      if (!code) throw error;

      attempt += 1;
      const delayMs = Math.min(
        initialLoginRetryDelayMs * (2 ** Math.min(attempt - 1, 5)),
        maxLoginRetryDelayMs,
      );
      console.error(`[WARNING] Falha de rede ao conectar ao Discord (${code}). Tentativa ${attempt + 1} em ${delayMs / 1000}s.`);

      await new Promise(resolve => setTimeout(resolve, delayMs));
      if (!shuttingDown) {
        // discord.js destroys its WebSocket manager when login rejects, so a
        // fresh Client is required before retrying the initial connection.
        client = createClient();
      }
    }
  }
}

(async () => {

    const art = fs.readFileSync('art.txt', 'utf8');
    console.log(`${art}\n\n`);

    console.log("Importando arquivos...\n");
    await scheduleLocalFilesUpdate();

    scheduleMatcherUpdate();
    
    await DeckController.init({verbose : true});

    await scheduleTournamentUpdate();

    await scheduleChartUpdate();
    
    // Coleção de comandos
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[INFO] Comando ${command.data.name} carregado.`);
      } else {
        console.warn(`[WARNING] Comando ${file} faltando "data" ou "execute".`);
      }
    }

    await loginWithRetry();
})();

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[INFO] Recebido ${signal}; encerrando o bot.`);
  stopServers();
  await client.destroy();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
