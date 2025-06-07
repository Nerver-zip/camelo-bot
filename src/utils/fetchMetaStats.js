const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { convertJpegToPng } = require("./convertJpegToPng");

function formatDeckNameForImage(name) {
  return encodeURIComponent(name);
}

function deckNameToFileName(deckName) {
  return deckName.replace(/\s+/g, '_') + '.jpg';
}

async function downloadImage(url, filename) {
  const outputDir = path.join(__dirname, 'public', 'images');
  const filePath = path.join(outputDir, filename);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);

      writer.on('finish', () => {
        writer.close(() => {
          console.log(`✅ Imagem salva: ${filename}`);
          resolve(filePath);
        });
      });

      writer.on('error', (err) => {
        writer.destroy(); // Libera recurso mesmo com erro
        console.error(`❌ Erro ao salvar ${filename}:`, err.message);
        reject(err);
      });
    });
  } catch (err) {
    console.error(`❌ Erro ao baixar ${filename}:`, err.message);
  }
}

async function fetchMetaStats() {
  const url = 'https://www.duellinksmeta.com/top-decks#tournamentsOnly';

  console.log('🚀 Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    // 'protocolTimeout' não é um parâmetro oficial do launch, melhor controlar no goto/waitForSelector
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const resourceType = req.resourceType();
    // bloquear só o que realmente não quer
    if (resourceType === 'stylesheet' || resourceType === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  const enriched = [];

  try {
    console.log('⏳ Carregando página:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise(res => setTimeout(res, 4000));

    console.log('⏳ Esperando seletor .deck-button-container .deck-type-container');
    await page.waitForSelector('.deck-button-container .deck-type-container', { timeout: 120000 });

    console.log('✅ Seletor encontrado! Extraindo dados...');
    const results = await page.evaluate(() => {
      const deckContainers = document.querySelectorAll('.deck-button-container .deck-type-container');
      const decks = [];

      deckContainers.forEach(container => {
        const label = container.querySelector('.label')?.textContent.trim();
        const amountText = container.querySelector('.bottom-sub-label')?.textContent.trim();

        if (label && amountText) {
          const amount = parseInt(amountText.replace(/\D/g, '')) || 0;
          decks.push({ deckName: label, amount });
        }
      });

      return decks;
    });

    const maxWithImages = 10;
    for (let i = 0; i < results.length; i++) {
      const deck = results[i];
      let imagePath = null;

      if (i < maxWithImages) {
        const formattedName = formatDeckNameForImage(deck.deckName);
        const jpgFileName = deckNameToFileName(deck.deckName);
        const jpgFilePath = await downloadImage(
          `https://imgserv.duellinksmeta.com/v2/dlm/deck-type/${formattedName}?portrait=true&width=420`,
          jpgFileName
        );

        if (jpgFilePath) {
          imagePath = await convertJpegToPng(jpgFilePath, path.dirname(jpgFilePath));
          try {
            await fs.promises.unlink(jpgFilePath);
            console.log(`🗑️  JPG deletado: ${jpgFilePath}`);
          } catch (err) {
            console.warn(`⚠️ Não foi possível remover ${jpgFilePath}:`, err.message);
          }
          imagePath = path.relative(__dirname, imagePath).replace(/\\/g, '/');
        }
      }

      enriched.push({
        ...deck,
        image: imagePath,
      });
    }

    console.log('✅ Dados enriquecidos finalizados.');
    return enriched;
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
