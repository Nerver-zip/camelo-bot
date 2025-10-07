require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { scheduleChartUpdate, scheduleLocalFilesUpdate, scheduleTournamentUpdate, scheduleMatcherUpdate } = require('./scheduler.js');
const { DeckController } = require('./controllers/DeckController.js');

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

// Map para rastrear respostas do bot
const replyMap = new Map();

// ========== Discord Events ==========
client.once('clientReady', async () => { 
  console.log(`Bot online como ${client.user.tag}`);

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
      const response = await command.execute(interaction);
      if (response?.id) replyMap.set(interaction.id, response);
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

client.on('messageDelete', async deletedMessage => {
  const reply = replyMap.get(deletedMessage.id);
  if (reply) {
    try {
      await reply.delete();
      replyMap.delete(deletedMessage.id);
    } catch (err) {
      console.error('Erro ao deletar resposta do bot:', err.message);
    }
  }
});
