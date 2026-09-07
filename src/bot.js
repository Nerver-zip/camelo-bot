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
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

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
    client.commands = new Collection();
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

    await client.login(process.env.TOKEN);
})();

// ========== Discord Events ==========
client.once('clientReady', async () => { 
  console.log(`Bot online como ${client.user.tag}`);
  await NewsFeeder.init(client);
  await TournamentFeeder.init(client);
  await scheduleTierListUpdate(client); 
  
  client.user.setPresence({
    status: 'online',
    activities: [
      { name: '🐪 Online nas horas vagas 🐫' }
    ],
  });

});

//---------------Interaction Listener-------------------

client.on('interactionCreate', async interaction => {
  const command = client.commands.get(interaction.commandName);
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
      await interaction.followUp({ content: '❌ Ocorreu um erro.', ephemeral : true });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro.', ephemeral : true });
    }
  }
});

let shuttingDown = false;
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
