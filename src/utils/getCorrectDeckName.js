const axios = require('axios');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');

async function getCorrectDeckName(inputName) {
  const sitemapUrl = 'https://www.duellinksmeta.com/sitemap-deck-types.xml';
  const { data: xml } = await axios.get(sitemapUrl);
  const $xml = cheerio.load(xml, { xmlMode: true });

  const urls = [];
  $xml('url > loc').each((_, el) => {
    urls.push($xml(el).text());
  });

  const deckNames = urls.map(url => decodeURIComponent(url.split('/').pop()));

  const inputLower = inputName.toLowerCase();
  const lowerDeckNames = deckNames.map(name => name.toLowerCase());

  const { bestMatch } = stringSimilarity.findBestMatch(inputLower, lowerDeckNames);

  if (bestMatch.rating < 0.4) return null;

  return deckNames[lowerDeckNames.indexOf(bestMatch.target)];
}

module.exports = {getCorrectDeckName};

//(async () => {
//  const name = await getCorrectDeckName("dino");
//  console.log(name);
//})();