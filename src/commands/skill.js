const axios = require('axios');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
const { SlashCommandBuilder } = require('discord.js');
const { initServers } = require("../utils/auto-suggestions/suggestionServers.js")
const { queryTrie } = require("../utils/auto-suggestions/queryTrie.js");

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
            value: skill
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error('Autocomplete error:', error);
        await interaction.respond([]);
    }  
  },
  
  async execute(interaction) {
    await interaction.deferReply(); 

    const inputSkillName = interaction.options.getString('nome').toLowerCase();

    try {
      // 1) Buscar sitemap XML
      const sitemapUrl = 'https://www.duellinksmeta.com/sitemap-skills.xml';
      const { data: xml } = await axios.get(sitemapUrl);
      const $xml = cheerio.load(xml, { xmlMode: true });

      // 2) Coletar URLs
      const urls = [];
      $xml('url > loc').each((_, el) => {
        urls.push($xml(el).text());
      });

      if (urls.length === 0) {
        return interaction.editReply('❌ Não foi possível carregar a lista de skills.');
      }

      // 3) Extrair nomes das skills das URLs
      const skillNamesFromUrls = urls.map(u => {
        const lastPart = decodeURIComponent(u.split('/').filter(Boolean).pop() || '');
        return lastPart.replace(/-/g, ' ').toLowerCase();
      });

      // 4) Fuzzy match
      const { bestMatch } = stringSimilarity.findBestMatch(inputSkillName, skillNamesFromUrls);
      if (bestMatch.rating < 0.4) {
        return interaction.editReply(`❌ Skill "${inputSkillName}" não encontrada.`);
      }

      // 5) URL da skill correspondente
      const bestMatchUrl = urls[skillNamesFromUrls.indexOf(bestMatch.target)];

      // 6) Buscar HTML da skill
      const { data: skillHtml } = await axios.get(bestMatchUrl);
      const $ = cheerio.load(skillHtml);

      // 7) Extrair dados da skill
      const name = $('h1.h1').first().text().trim() || bestMatch.target;

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

      // 8) Enviar embed
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

