module.exports = {
  name: 'organizeChannels',
  async execute(message, _) {
    console.log('Comando organizeChannels foi acionado');

    if (!message.guild) return message.reply('Este comando só pode ser usado em servidores.');

    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ Você precisa ser moderador ou maior para usar este comando.');
    }
    
    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('O bot não tem permissão para organizar canais.');
    }

    const match = message.content.match(/^!organizeChannels\s+<([^>]+)>$/);
    if (!match) {
      return message.reply('Uso correto: `!organizeChannels <nome da categoria>`');
    }

    const categoryName = match[1].trim();

    const category = message.guild.channels.cache.find(
      (channel) => channel.type === 4 && channel.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return message.reply(`Categoria "${categoryName}" não encontrada 🐪🐫.`);
    }

    const textChannels = category.children.cache
      .filter(channel => channel.type === 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    let position = 0;
    for (const channel of textChannels.values()) {
      await channel.setPosition(position++);
    }

    return message.reply(`Canais em "${category.name}" organizados em ordem alfabética! 🐪🐫`);
  }
};
