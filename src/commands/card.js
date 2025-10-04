const { fetchCardData } = require("../utils/fetchCardData.js");
const { SlashCommandBuilder } = require("discord.js");
const { initServers } = require("../utils/auto-suggestions/suggestionServers.js")
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");
const { Matcher } = require("../utils/fuzzyfind/Matcher.js");
const { buildCardEmbed } = require("../utils/buildCardEmbed.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Mostra as informações de uma carta')
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
        console.error('Autocomplete error:', error.message || error);
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
      const data = await fetchCardData(bestMatchCard);
      
      if (!data) {
        await interaction.deleteReply();
        return interaction.followUp({
            content :  `❌ Não foi possível encontrar informações para **${cardName}**.`,
            ephemeral : true
        });
      }

      const embed = buildCardEmbed(data);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.deleteReply();
      if(error.response?.status === 404){
        console.warn(`Carta não encontrada no site: ${bestMatchCard}`);
        return interaction.followUp({
            content : '❌ Carta não encontrada no site',
            ephemeral : true
        });
      }
      console.error('Erro inesperado ao buscar stats de carta:', error.message || error);
      return interaction.followUp({
        content: '❌ Erro ao buscar os card stats. Tente novamente mais tarde.',
        ephemeral: true
      });    
    }
  }
};
