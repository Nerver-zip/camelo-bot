const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('organizechannels')
    .setDescription('Organiza os canais de uma categoria em ordem alfabética.')
    .addChannelOption(option =>
      option.setName('categoria')
        .setDescription('Escolha a categoria a ser organizada')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({
        content: '❌ Sai fora zé! Você precisa de permissão de administrador para usar este comando.'
      });
    }

    try {
      const category = interaction.options.getChannel('categoria');
      if (!category || category.type !== ChannelType.GuildCategory) {
        return interaction.editReply({ content: '❌ Categoria inválida.' });
      }

      const channels = category.children.cache
        .sort((a, b) => a.name.localeCompare(b.name));

      if (channels.size === 0) {
        return interaction.editReply({
          content: `A categoria **${category.name}** não possui canais para organizar.`
        });
      }

      // pega a menor posição atual
      const basePos = Math.min(...channels.map(ch => ch.position));

      let i = 0;
      for (const [, channel] of channels) {
        await channel.setPosition(basePos + i);
        i++;
      }

      return interaction.editReply({
        content: `✅ Canais da categoria **${category.name}** organizados em ordem alfabética!`
      });

    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: '❌ Ocorreu um erro ao organizar os canais.'
      });
    }
  },
};
