const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateTierList } = require('../utils/updateTierList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('get-tier-list')
    .setDescription('Organiza os canais de acordo com a Tier List')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 1️⃣ Só em servidores
    if (!interaction.guild) {
      return interaction.editReply({ content: '❌ Este comando só pode ser usado em servidores.' });
    }

    // 2️⃣ Permissão do usuário
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({ content: '❌ Você precisa ser moderador ou maior para usar este comando.' });
    }

    // 3️⃣ Permissão do bot
    if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({ content: '❌ O bot não tem permissão para gerenciar canais.' });
    }

    try {
      const result = await updateTierList(interaction.guild);

      if (!result || !result.success) {
        return interaction.editReply({
          content: result?.reason ? `❌ ${result.reason}` : '❌ Não foi possível atualizar a Tier List no momento.'
        });
      }

      const summary = [
        ...(result.createdChannels || []),
        ...(result.movedChannels || [])
      ];

      if (summary.length === 0) {
        return interaction.editReply({ content: 'Todos os canais já estão nas categorias corretas.' });
      }

      let content = 'Resumo da organização da Tier List:\n' + summary.join('\n');
      if (content.length > 2000) {
        content = content.slice(0, 1990) + '\n...';
      }

      return interaction.editReply({ content });
    } catch (error) {
      console.error('Erro no comando get-tier-list:', error);
      return interaction.editReply({ content: '❌ Ocorreu um erro ao atualizar a Tier List.' });
    }
  }
};
