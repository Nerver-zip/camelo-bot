module.exports = {
  name: 'moveChannels',
  async execute(message, args) {
    console.log('Comando moveChannels acionado');

    if (!message.guild) return message.reply('Este comando só pode ser usado em servidores.');

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('❌ O bot não tem permissão para mover canais.');
    }

    const content = message.content;
    const match = content.match(/^!moveChannels\s+<([^>]+)>\s+(.*)$/);

    if (!match) {
      return message.reply('Uso correto: `!moveChannels <nome da categoria> <canal1> <canal2> ...`');
    }

    const categoryName = match[1].trim();
    const channelNames = match[2].trim().split(/\s+/);

    const category = message.guild.channels.cache.find(
      (c) => c.type === 4 && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return message.reply(`❌ Categoria "${categoryName}" não encontrada.`);
    }

    const moved = [];
    const notFound = [];

    // Verifica quantos canais já estão na categoria
    const currentChildren = category.children.cache.filter(c => c.type === 0 || c.type === 2 || c.type === 15);
    const availableSlots = 50 - currentChildren.size;

    if (channelNames.length > availableSlots) {
      return message.reply(
        `❌ A categoria "${category.name}" já possui ${currentChildren.size} canais.\n` +
        `Ela pode conter no máximo 50 canais.\n` +
        `Você tentou mover ${channelNames.length}, mas só há espaço para ${availableSlots}.`
      );
    }

    for (const name of channelNames) {
      const channel = message.guild.channels.cache.find(
        (c) => c.type === 0 && c.name.toLowerCase() === name.toLowerCase()
      );

      if (channel) {
        try {
          await channel.setParent(category.id);
          moved.push(channel.name);
        } catch (error) {
          console.error(`Erro ao mover canal ${channel.name}:`, error);
          notFound.push(`${name} (erro ao mover)`);
        }
      } else {
        notFound.push(name);
      }
    }

    let reply = `✅ Canais movidos para **${category.name}**: ${moved.join(', ') || 'nenhum'}`;
    if (notFound.length > 0) {
      reply += `\n⚠️ Canais não encontrados ou com erro: ${notFound.join(', ')}`;
    }

    return message.reply(reply);
  }
};
