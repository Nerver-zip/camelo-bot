require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
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
  require('./commands/moveChannels'),
  require('./commands/organizeChannels'),
  require('./commands/skill'),
  require('./commands/stats'),
];

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

