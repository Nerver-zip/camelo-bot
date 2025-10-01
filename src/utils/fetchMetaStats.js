require('dotenv').config();
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function fetchMetaStats() {
  const url = 'https://www.duellinksmeta.com/top-decks#tournamentsOnly';

  console.log('🚀 Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Intercepta requests desnecessários (CSS, fontes)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'stylesheet' || resourceType === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    console.log('⏳ Carregando página:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(res => setTimeout(res, 4000)); // espera extra para carregar o meta

    console.log('⏳ Esperando seletor .deck-button-container .deck-type-container');
    await page.waitForSelector('.deck-button-container .deck-type-container', { timeout: 30000 });

    console.log('✅ Seletor encontrado! Extraindo dados...');
    const decks = await page.evaluate(() => {
      const deckContainers = document.querySelectorAll('.deck-button-container .deck-type-container');
      const result = [];

      deckContainers.forEach(container => {
        const label = container.querySelector('.label')?.textContent.trim();
        const amountText = container.querySelector('.bottom-sub-label')?.textContent.trim();

        if (label && amountText) {
          const amount = parseInt(amountText.replace(/\D/g, '')) || 0;
          result.push({ deckName: label, amount });
        }
      });

      return result;
    });

    console.log('✅ Extração finalizada. Total de decks:', decks.length);
    return decks;
  } catch (error) {
    console.error('❌ Erro ao buscar top meta decks:', error.message);
    return [];
  } finally {
    await browser.close();
    console.log('🧹 Browser fechado.');
  }
}

//(async () => {
//  const decks = await fetchMetaStats();
//  console.dir(decks, { depth: null });
//})();

module.exports = { fetchMetaStats };
