const { fetchCardStats } = require("../utils/fetchCardStats.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: 'stats',
  async execute(message, _) {
    const match = message.content.match(/^!stats\s+(.+)$/i);
    if (!match) return;

    const cardName = match[1].trim();

    try {
      const stats = await fetchCardStats(cardName);

      if (!stats) {
        return message.reply(`❌ Não foi possível encontrar informações para **${cardName}**.`);
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
          .map(([x, perc]) => `${x}: ${perc}`)
          .join(" | ");
        embed.addFields({
          name: `• ${deck.deckName}`,
          value: statStrings,
          inline: false
        });
      }
      return await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Erro ao executar o comando !stats:", error.message);
      await message.reply("❌ Ocorreu um erro ao buscar as informações da carta.");
    }
  }
};
