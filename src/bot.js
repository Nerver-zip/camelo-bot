require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { fetchMetaStats } = require('./utils/fetchMetaStats');
const { generateChart } = require('./utils/generateChart');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const replyMap = new Map();

const commands = [
  require('./commands/build'),
  require('./commands/cameloHelp'),
  require('./commands/createChannels'),
  require('./commands/getTierList'),
  require('./commands/meta'),
  require('./commands/moveChannels'),
  require('./commands/organizeChannels'),
  require('./commands/skill'),
  require('./commands/stats'),
];

// ========== Discord Bot Events ==========

client.on('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [
      {
        name: '🐪 Comandos na bio 🐫',
        type: ActivityType.Playing
      }
    ],
  });

  // Execução única ao iniciar
  fetchMetaStats()
    .then((decks) => {
      console.log('📈 fetchMetaStats executado na inicialização.');
      return generateChart(decks);
    })
    .then(() => {
      console.log('📊 Gráfico gerado na inicialização.');
    })
    .catch(console.error);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = commands.find(cmd => `!${cmd.name.toLowerCase()}` === commandName.toLowerCase());
  if (command) {
    try {
      const response = await command.execute(message, args);

      if (response?.id) {
        replyMap.set(message.id, response);
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ Ocorreu um erro ao executar o comando.');
    }
  }
});

client.on('messageDelete', async (deletedMessage) => {
  if (deletedMessage.author?.bot) return;

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

client.login(process.env.TOKEN);

// ========== Express Server para manter vivo e ativar update ==========
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => {
  res.send('✅ Bot está vivo!');
});

app.get('/update-meta', async (_, res) => {
  try {
    const decks = await fetchMetaStats();
    await generateChart(decks);
    console.log('📈 Meta atualizada via /update-meta');
    res.send('✅ Meta atualizada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao atualizar meta via /update-meta:', err.message);
    res.status(500).send('❌ Erro ao atualizar meta.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP iniciado na porta ${PORT}`);
});
