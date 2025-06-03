const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'meta',
  async execute(message, _) {
    console.log('Comando !meta foi acionado');

    try {
      const chartPath = path.resolve(__dirname, '../utils/public/charts/chart.png');

      if (!fs.existsSync(chartPath)) {
        return message.reply('❌ Nenhum gráfico encontrado. Gere o gráfico antes de usar este comando.');
      }

      const attachment = new AttachmentBuilder(chartPath, { name: 'meta.png' });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Recorte atual do meta')
        .setDescription('Baseado apenas em torneios recentes')
        .setImage('attachment://meta.png')
        .setTimestamp();

      return message.reply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error('Erro ao enviar gráfico do meta:', error);
      return message.reply('❌ Ocorreu um erro ao carregar o gráfico do meta.');
    }
  }
};
