const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { initServers } = require("../utils/auto-suggestions/suggestionServers.js")
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");
const { Matcher } = require("../utils/fuzzyfind/Matcher.js");
const { DeckController } = require("../controllers/DeckController.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('builds')
    .setDescription('Retorna até as ultimas 10 builds do deck upadas no DLM')
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Nome do deck/archetype')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) 
        return await interaction.respond([]);

    try {
        const [_, __, archetypeServer] = await initServers(false);
        const archetypeSuggestions = await queryTrie(archetypeServer, focusedValue);
        if (!archetypeSuggestions) 
            return await interaction.respond([]);

        const choices = archetypeSuggestions.slice(0, 25).map(archetype => ({
            name: archetype,
            value: `suggested|${archetype}`
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
    const [flag, archetypeNameRaw] = input.split('|');
    const fromSuggestion = flag === 'suggested';
    const archetypeName = fromSuggestion ? archetypeNameRaw : input;

    const bestMatchArchetype = fromSuggestion
      ? archetypeName
      : Matcher.archetype(archetypeName.toLowerCase());

    if (!bestMatchArchetype) {
      await interaction.deleteReply();
      return interaction.followUp({
        content: '❌ Deck/archetype não encontrado.',
        ephemeral: true
      });
    }

    try {
        const links = DeckController.getDecklists(bestMatchArchetype); 
        
        if(!bestMatchArchetype){
            await interaction.deleteReply();
            return interaction.followUp({
                content: '❌ Builds não encontradas.',
                ephemeral: true
            });
        }

        let currentIndex = 0;

        // Função para criar a linha de botões com contador
        const createRow = () => {
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('⬅️')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('counter')
              .setLabel(`${currentIndex + 1}/${links.length}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true), 
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('➡️')
              .setStyle(ButtonStyle.Primary)
          );
        };

        const message = await interaction.editReply({ content: links[currentIndex], components: [createRow()] });
        
        //Duração atual de interatividade: 1 dia (86400000ms)
        //Opções plausiveis: 1 hora: 3600000ms; 30 minutos: 1800000; 5 minutos: 300000
        const collector = message.createMessageComponentCollector({ time: 86400000 });

        collector.on('collect', async i => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: '❌ Sai fora camelo! Somente quem usou o comando pode usar os botões.',
              ephemeral: true
            });
          }

          if (i.customId === 'next') {
            currentIndex = (currentIndex + 1) % links.length;
          } else if (i.customId === 'prev') {
            currentIndex = (currentIndex - 1 + links.length) % links.length;
          }

          await i.update({ content: links[currentIndex], components: [createRow()] });
        });

        collector.on('end', async () => {
          try {
            const disabledRow = new ActionRowBuilder().addComponents(
              createRow().components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            );
            await message.edit({ components: [disabledRow] });
          } catch (err) {
            if (err.code === 10008) {
              console.warn('[DeckCommand] Mensagem deletada antes do collector encerrar. Ignorando.');
            } else {
              console.error('[DeckCommand] Erro ao editar mensagem:', err);
            }
          }
        });

    } catch (error) {
      await interaction.deleteReply();
      console.error('Erro inesperado ao buscar builds:', error.message || error);
      return interaction.followUp({
        content: '❌ Erro ao buscar as builds. Tente novamente mais tarde.',
        ephemeral: true
      });    
    }
  }
};
