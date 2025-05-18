const axios = require('axios');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

module.exports = {
  name: 'skill',
  async execute(message, _) {
    const match = message.content.match(/^!skill\s+(.+)$/i);
    if (!match) {
      return message.reply('Uso correto: `!skill nome da skill`');
    }

    const inputSkillName = match[1].toLowerCase();

    try {
      // 1) Buscar sitemap XML
        const sitemapUrl = 'https://www.duellinksmeta.com/sitemap-skills.xml';
        const { data: xml } = await axios.get(sitemapUrl);
        const $xml = cheerio.load(xml, { xmlMode: true });

        // 2) Coletar URLs
        const urls = [];
        $xml('url > loc').each((_, el) => {
          const url = $xml(el).text();
          urls.push(url);
        });

        if (urls.length === 0) {
          return message.reply('❌ Não foi possível carregar a lista de skills.');
        }

        // 3) Extrair nomes das skills das URLs
        const skillNamesFromUrls = urls.map(u => {
          const lastPart = decodeURIComponent(u.split('/').filter(Boolean).pop() || '');
          return lastPart.replace(/-/g, ' ').toLowerCase();
        });

        // 4) Fuzzy match
        const { bestMatch } = stringSimilarity.findBestMatch(inputSkillName, skillNamesFromUrls);
        if (bestMatch.rating < 0.4) {
          return message.reply(`❌ Skill "${inputSkillName}" não encontrada.`);
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

        // Coletar todas as formas de obtenção únicas
        const obtainElements = $('.obtain-wrapper a');
        const obtainSet = new Set();

        obtainElements.each((_, el) => {
          const text = $(el).text().trim();
          if (text) obtainSet.add(text);
        });

        // Converter Set em array e limitar a 5
        const obtainList = Array.from(obtainSet).slice(0, 5);
        const obtain = obtainList.length > 0
          ? obtainList.join(', ')
          : 'Forma de obtenção não encontrada.';

        // 8) Enviar embed
        return message.reply({
          embeds: [{
            title: `🐫 Skill: ${name}`,
            description: `${description}\n\n**Obtenção:** ${obtain}`,
            color: 0xFFD700,
            thumbnail: image ? { url: image } : undefined,
            url: bestMatchUrl,
          }]
        });

    }   catch (error) {
        console.error(error);
        return message.reply('❌ Erro ao buscar a skill. Tente novamente mais tarde.');
    }
  }
};
