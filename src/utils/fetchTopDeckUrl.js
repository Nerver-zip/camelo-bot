const puppeteer = require('puppeteer');
const { getCorrectDeckName } = require("./getCorrectDeckName.js");

function formatDeckName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

async function fetchTopDeckUrl(name) {

  const correctedName = await getCorrectDeckName(name);
  if (!correctedName) return null;

  const baseUrl = 'https://www.duellinksmeta.com';
  const url = `${baseUrl}/top-decks#deck=${encodeURIComponent(correctedName)}`;
  const formattedName = formatDeckName(correctedName);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 800, height: 600 });
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const block = ['image', 'stylesheet', 'font'];
    if (block.includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

  await page.waitForSelector('a[href^="/top-decks/"]', { timeout: 15000 });

  const deckLink = await page.evaluate((formattedName) => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/top-decks/"]'));
    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (
        href.startsWith('/top-decks/') &&
        href.split('/').length > 6 &&
        href.includes(`/${formattedName}/`)
      ) {
        return href;
      }
    }
    return null;
  }, formattedName);

  await browser.close();
  return deckLink ? baseUrl + deckLink : null;
}

//(async () => {
//  const deck = await fetchTopDeckUrl("shadoll");
//  console.log(deck);
//})();

module.exports = { fetchTopDeckUrl };
