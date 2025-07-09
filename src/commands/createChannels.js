const { ChannelType } = require('discord.js');

module.exports = {
  name: 'createChannels',
  async execute(message, args) {
    console.log('Comando createChannels foi acionado');

    if (!message.guild) {
      return message.reply('Este comando só pode ser usado em servidores.');
    }

    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ Você precisa ser moderador ou maior para usar este comando.');
    }

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('O bot não tem permissão para criar canais.');
    }

    const content = message.content;
    const match = content.match(/^!createChannels\s+<([^>]+)>\s+(.*)$/);

    if (!match) {
      return message.reply('Uso: !createChannels <categoria> <canal1> <canal2> ...');
    }

    const categoryName = match[1].trim();
    const channelNames = match[2].trim().split(/\s+/);

    const category = message.guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && ch.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return message.reply(`Categoria "${categoryName}" não encontrada.`);
    }

    const createdChannels = [];

    for (const name of channelNames) {
      const existing = message.guild.channels.cache.find(
        ch => ch.parentId === category.id && ch.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        createdChannels.push(`❌ ${name} (já existe)`);
        continue;
      }

      try {
        await message.guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: category.id,
        });
        createdChannels.push(`✅ ${name}`);
      } catch (err) {
        console.error(`Erro ao criar canal "${name}":`, err);
        createdChannels.push(`⚠️ ${name} (erro)`);
      }
    }

    return message.reply(
      `Resultado da criação de canais em "${category.name}":\n` +
      createdChannels.join('\n')
    );
  }
};
