const { fetchCardStats } = require("../utils/fetchCardStats.js");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { initServers } = require("../utils/auto-suggestions/suggestionServers.js")
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra estatísticas de uma carta')
    .addStringOption(option =>
      option.setName('carta')
        .setDescription('Nome da carta')
        .setRequired(true)
    ),
  
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) 
        return await interaction.respond([]);

    try {
        const [cardServer, _] = await initServers();
        const cardSuggestions = await queryTrie(cardServer, focusedValue);
        if (!cardSuggestions) 
            return await interaction.respond([]);

        const choices = cardSuggestions.slice(0, 25).map(card => ({
            name: card,
            value: card
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error('Autocomplete error:', error);
        await interaction.respond([]);
    }  
  },

  async execute(interaction) {
    await interaction.deferReply(); 

    const cardName = interaction.options.getString('carta').trim();

    try {
      const stats = await fetchCardStats(cardName);

      if (!stats) {
        return interaction.editReply(`❌ Não foi possível encontrar informações para **${cardName}**.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(stats.Name)
        .setThumbnail(stats.Image)
        .addFields(
          { name: "📘 Tipo", value: stats.Type, inline: true },
          {
            name: stats["Level"] ? "🔺 Nível" : "🔹 Sub-tipo",
            value: stats["Level"] || stats["Sub-type"],
            inline: true
          },
          { name: "🏆 Popularidade Geral", value: stats["Overall popularity"], inline: false },
          { name: "📊 Entre o Mesmo Tipo", value: stats["Among type"], inline: false },
        )
        .setColor("#00BFFF");

      for (const deck of stats["Used decks"]) {
        const statStrings = Object.entries(deck.stats)
          .map(([key, perc]) => `${key}: ${perc}`)
          .join(" | ");
        embed.addFields({
          name: `• ${deck.deckName}`,
          value: statStrings,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Erro ao executar o comando /stats:", error);
      await interaction.editReply("❌ Ocorreu um erro ao buscar as informações da carta.");
    }
  }
};
