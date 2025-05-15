module.exports = {
  name: 'createChannels',
  async execute(message, args) {
    console.log('Comando createChannels foi acionado');

    if (!message.guild) {
      return message.reply('Este comando só pode ser usado em servidores.');
    }

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('O bot não tem permissão para criar canais.');
    }

    const [categoryName, ...channelNames] = args;

    if (!categoryName || channelNames.length === 0) {
      return message.reply('Uso: !createChannels <categoria> <canal1> <canal2> ...');
    }

    const category = message.guild.channels.cache.find(
      (ch) => ch.type === 4 && ch.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return message.reply(`Categoria "${categoryName}" não encontrada.`);
    }

    const createdChannels = [];

    for (const name of channelNames) {
      const existing = category.children.cache.find(
        ch => ch.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        createdChannels.push(`❌ ${name} (já existe)`);
        continue;
      }

      try {
        await message.guild.channels.create({
          name,
          type: 0,
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
