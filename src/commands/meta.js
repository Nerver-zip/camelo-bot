const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Mostra o gráfico atualizado do meta'),

  async execute(interaction) {
    console.log('Comando /meta acionado');

    // Defere a resposta para evitar timeout
    await interaction.deferReply();

    try {
      // Caminho para o gráfico gerado previamente
      const chartPath = path.resolve(__dirname, '../local/charts/chart.png');

      if (!fs.existsSync(chartPath)) {
        return interaction.editReply('❌ Nenhum gráfico encontrado. Gere o gráfico antes de usar este comando.');
      }

      const attachment = new AttachmentBuilder(chartPath, { name: 'meta.png' });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Recorte atual do meta')
        .setDescription('Baseado apenas em torneios recentes')
        .setImage('attachment://meta.png')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error('Erro ao enviar gráfico do meta:', error);
      return interaction.editReply('❌ Ocorreu um erro ao carregar o gráfico do meta.');
    }
  }
};
