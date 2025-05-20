const axios = require('axios');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

async function getCorrectCardName(inputName) {
  try {
    const sitemapUrl = 'https://www.duellinksmeta.com/sitemap-cards.xml';
    const { data: xml } = await axios.get(sitemapUrl);
    const $xml = cheerio.load(xml, { xmlMode: true });

    const urls = [];
    $xml('url > loc').each((_, el) => {
      const url = $xml(el).text();
      urls.push(url);
    });

    if (urls.length === 0) return null;

    const cardNamesFromUrls = urls.map(u => {
      const lastPart = decodeURIComponent(u.split('/').filter(Boolean).pop() || '');
      return lastPart.replace(/-/g, ' ');
    });

    const { bestMatch } = stringSimilarity.findBestMatch(inputName.toLowerCase(), cardNamesFromUrls.map(c => c.toLowerCase()));
    if (bestMatch.rating < 0.4) return null;

    return cardNamesFromUrls[cardNamesFromUrls.findIndex(c => c.toLowerCase() === bestMatch.target)];
  } catch (err) {
    console.error('Erro em getCorrectCardName:', err.message);
    return null;
  }
}

//(async () => {
//  const name = await getCorrectCardName("Nibiru, the");
//  console.log(name);
//})();

module.exports = {getCorrectCardName};
