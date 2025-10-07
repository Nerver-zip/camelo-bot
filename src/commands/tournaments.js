const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournaments')
    .setDescription('Mostra os próximos torneios'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const jsonPath = path.resolve(__dirname, '../local/dump/upcomingTournaments.json');

      if (!fs.existsSync(jsonPath)) {
        return interaction.editReply('❌ Nenhum arquivo de torneios encontrado.');
      }

      const tournaments = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      if (tournaments.length === 0) {
        return interaction.editReply('❌ Nenhum torneio encontrado no arquivo.');
      }

      const firstImage = tournaments.find(t => t.image_url)?.image_url || null;

      const description = tournaments
        .map(t => `**[${t.name}](${t.url})**\n📅 ${t.date_raw}  👥 ${t.participants_raw}`)
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🏆 Próximos Torneios')
        .setDescription(description)
        .setTimestamp();

      if (firstImage) {
        embed.setImage(firstImage);
      }

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erro ao enviar torneios:', error);
      return interaction.editReply('❌ Ocorreu um erro ao carregar os torneios.');
    }
  }
};
