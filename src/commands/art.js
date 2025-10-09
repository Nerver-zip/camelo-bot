const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");

const { initServers } = require("../utils/auto-suggestions/suggestionServers.js");
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");
const { Matcher } = require("../utils/fuzzyfind/Matcher.js");
const { fetchCardArt } = require("../utils/fetchCardArt.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('art')
    .setDescription('Mostra diferentes artes de uma carta de Yu-Gi-Oh!')
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Nome da carta')
        .setRequired(true)
        .setAutocomplete(true)
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
            value: `suggested|${card}`
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error('[Autocomplete /art] Erro:', error.message || error);
        await interaction.respond([]);
    }  
  },

  async execute(interaction) {
    await interaction.deferReply(); 

    const input = interaction.options.getString('nome');
    const [flag, cardNameRaw] = input.split('|');
    const fromSuggestion = flag === 'suggested';
    const cardName = fromSuggestion ? cardNameRaw : input;

    const bestMatchCard = fromSuggestion
      ? cardName
      : Matcher.card(cardName.toLowerCase());

    if (!bestMatchCard) {
      await interaction.deleteReply();
      return interaction.followUp({
        content: '❌ Carta não encontrada.',
        ephemeral: true
      });
    }

    try {
      const artUrls = await fetchCardArt(bestMatchCard);

      if (!artUrls || artUrls.length === 0) {
        await interaction.deleteReply();
        return interaction.followUp({
          content: `❌ Não foi possível encontrar artes para **${cardName}**.`,
          ephemeral: true
        });
      }

      let currentIndex = 0;

      const createEmbed = () => {
        return new EmbedBuilder()
          .setImage(artUrls[currentIndex])
          .setColor("#00BFFF")
          .setFooter({ text: `Arte ${currentIndex + 1}/${artUrls.length}` });
      };

      const createRow = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('counter')
            .setLabel(`${currentIndex + 1}/${artUrls.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
        );
      };

      const message = await interaction.editReply({ embeds: [createEmbed()], components: [createRow()] });

      const collector = message.createMessageComponentCollector({ time: 86400000 }); // 24h

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: '❌ Sai fora camelo! Só quem usou o comando pode usar os botões.',
            ephemeral: true
          });
        }

        if (i.customId === 'next') {
          currentIndex = (currentIndex + 1) % artUrls.length;
        } else if (i.customId === 'prev') {
          currentIndex = (currentIndex - 1 + artUrls.length) % artUrls.length;
        }

        await i.update({ embeds: [createEmbed()], components: [createRow()] });
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            createRow().components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
          );
          await message.edit({ components: [disabledRow] });
        } catch (err) {
          if (err.code === 10008) {
            console.warn('[ArtCommand] Mensagem deletada antes do collector encerrar. Ignorando.');
          } else {
            console.error('[ArtCommand] Erro ao editar mensagem:', err);
          }
        }
      });

    } catch (error) {
      await interaction.deleteReply();
      if (error.response?.status === 404) {
        console.warn(`[ArtCommand] Carta não encontrada no site: ${bestMatchCard}`);
        return interaction.followUp({
            content : '❌ Carta não encontrada no site',
            ephemeral : true
        });
      }
      console.error('[ArtCommand] Erro inesperado ao buscar arte de carta:', error.message || error);
      return interaction.followUp({
        content: '❌ Erro ao buscar arte de carta. Tente novamente mais tarde.',
        ephemeral: true
      });
    }
  }
};
