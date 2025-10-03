const axios = require('axios');
const cheerio = require('cheerio');
const { SlashCommandBuilder } = require('discord.js');
const { initServers } = require("../utils/auto-suggestions/suggestionServers.js")
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");
const { Matcher } = require("../utils/fuzzyfind/Matcher.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skill')
    .setDescription('Busca informações sobre uma skill pelo nome')
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Nome da skill')
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) 
        return await interaction.respond([]);

    try {
        const [_, skillServer] = await initServers();
        const skillSuggestions = await queryTrie(skillServer, focusedValue);
        if (!skillSuggestions) 
            return await interaction.respond([]);

        const choices = skillSuggestions.slice(0, 25).map(skill => ({
            name: skill,
            value: `suggested|${skill}`
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error('Autocomplete error:', error);
        await interaction.respond([]);
    }  
  },
  
  async execute(interaction) {
    await interaction.deferReply(); 

    const input = interaction.options.getString('nome').toLowerCase();
    
    const [flag, skillName] = input.split('|');
    const fromSuggestion = flag === 'suggested';

    const bestMatchSkill = fromSuggestion ? skillName : Matcher.skill(skillName);

    try {
      bestMatchUrl = `https://www.duellinksmeta.com/skills/${encodeURIComponent(bestMatchSkill)}`;

      // Buscar HTML da skill
      const { data: skillHtml } = await axios.get(bestMatchUrl);
      const $ = cheerio.load(skillHtml);

      // Extrair dados da skill
      const name = $('h1.h1').first().text().trim() || bestMatchSkill;

      const description = $('.skill-description').first().text().trim() ||
                          $('.skill-desc').first().text().trim() ||
                          'Descrição não encontrada.';

      let image = $('.char-img-container img').first().attr('src');
      if (image && image.startsWith('/')) {
        image = `https://www.duellinksmeta.com${image}`;
      }

      const obtainSet = new Set();
      $('.obtain-wrapper a').each((_, el) => {
        const text = $(el).text().trim();
        if (text) obtainSet.add(text);
      });

      $('.obtain-container').each((_, el) => {
        $(el).find('span').each((_, spanEl) => {
          const text = $(spanEl).text().trim();
          if (text) obtainSet.add(text);
        });
      });

      const obtainList = Array.from(obtainSet).slice(0, 5);
      const obtain = obtainList.length > 0
        ? obtainList.join(', ')
        : 'Forma de obtenção não encontrada.';

      // Enviar embed
      await interaction.editReply({
        embeds: [{
          title: `Skill: ${name}`,
          description: `${description}\n\n**Obtenção:** ${obtain}`,
          color: 0xFFD700,
          thumbnail: image ? { url: image } : undefined,
          url: bestMatchUrl,
        }]
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Erro ao buscar a skill. Tente novamente mais tarde.');
    }
  },
};

