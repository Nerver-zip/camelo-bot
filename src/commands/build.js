const { SlashCommandBuilder } = require('discord.js');
const { fetchTopDeckUrl } = require('../utils/fetchTopDeckUrl.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Busca a primeira build de um arquétipo no DLM')
    .addStringOption(option =>
      option.setName('arquetipo')
        .setDescription('Nome do arquétipo para buscar a build')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply(); // visível para todos

    const archetype = interaction.options.getString('arquetipo');

    try {
      const url = await fetchTopDeckUrl(archetype);

      if (url) {
        await interaction.editReply(`${url}`);
      } else {
        await interaction.editReply(
          '❌ Não foi possível encontrar um deck para esse arquétipo. Atenção à escrita ou plural!'
        );
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Erro ao buscar o deck. Tente novamente mais tarde.');
    }
  },
};
