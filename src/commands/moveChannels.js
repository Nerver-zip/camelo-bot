module.exports = {
  name: 'moveChannels',
  async execute(message, args) {
    console.log('Comando move_channels acionado');

    if (!message.guild) return message.reply('Este comando só pode ser usado em servidores.');

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('❌ O bot não tem permissão para mover canais.');
    }

    if (args.length < 2) {
      return message.reply('Uso correto: `!move_channels <categoria> <canal1> <canal2> ...`');
    }

    const [categoryName, ...channelNames] = args;

    const category = message.guild.channels.cache.find(
      (c) => c.type === 4 && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return message.reply(`❌ Categoria "${categoryName}" não encontrada.`);
    }

    const moved = [];
    const notFound = [];

    for (const name of channelNames) {
      const channel = message.guild.channels.cache.find(
        (c) => c.type === 0 && c.name.toLowerCase() === name.toLowerCase()
      );

      if (channel) {
        await channel.setParent(category.id);
        moved.push(channel.name);
      } else {
        notFound.push(name);
      }
    }

    let reply = `✅ Canais movidos para **${category.name}**: ${moved.join(', ') || 'nenhum'}`;
    if (notFound.length > 0) {
      reply += `\n⚠️ Canais não encontrados: ${notFound.join(', ')}`;
    }

    return message.reply(reply);
  }
};