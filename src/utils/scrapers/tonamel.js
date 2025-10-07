require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const BASE = 'https://tonamel.com';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 200;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          setTimeout(resolve, 700);
        }
      }, 150);
    });
  });
}

async function clickLoadMoreIfExists(page, selector = 'button.load-more, .load-more, button[aria-label*="load"], button[data-role="load-more"]', maxClicks = 10) {
  for (let i = 0; i < maxClicks; i++) {
    try {
      const btn = await page.$(selector);
      if (!btn) break;
      const visible = await page.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }, btn);
      if (!visible) break;

      await btn.click();
      await delay(800 + Math.random() * 800);
      await autoScroll(page);
    } catch (err) {
      break;
    }
  }
}

async function extractFromPage(page) {
  return await page.evaluate((BASE) => {
    const out = [];
    const ul = document.querySelector('ul.competition-list') || document.querySelector('ul[class*="competition-list"]');
    if (!ul) return out;

    const items = Array.from(ul.querySelectorAll('li.list-item'));
    for (const li of items) {
      const a = li.querySelector('a[href^="/competition/"]') || li.querySelector('a');
      const href = a ? a.getAttribute('href') : null;
      const url = href ? (href.startsWith('http') ? href : (new URL(href, BASE)).href) : null;

      // Nome do torneio
      let name = null;
      if (a) {
        const titleSpan = Array.from(a.querySelectorAll('span')).find(s => (s.className || '').toLowerCase().includes('title'));
        if (titleSpan) name = titleSpan.textContent.trim();
        else name = a.textContent.trim().split('\n').map(s => s.trim()).filter(Boolean)[0] || null;
      }

      // Data e participantes
      const dataList = li.querySelector('.m-competition-data-list') || li.querySelector('.competition-items') || li.querySelector('.competition-data') || li;
      let date = null;
      let participants_raw = null;
      let participants_number = null;

      if (dataList) {
        const spans = Array.from(dataList.querySelectorAll('span')).map(s => s.textContent.trim()).filter(Boolean);
        date = spans.find(s => /\/|-/i.test(s) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(s) || /年|月|日/.test(s) || /\d{4}/.test(s)) || null;

        const participantsSpan = spans.find(s => /\d+\/\d+/.test(s) || /^\d+$/.test(s));
        if (participantsSpan) {
          participants_raw = participantsSpan;
          const m = participantsSpan.match(/(\d+)\s*\/\s*\d+/);
          if (m) participants_number = parseInt(m[1], 10);
          else {
            const n = participantsSpan.match(/\d+/);
            if (n) participants_number = parseInt(n[0], 10);
          }
        }
      }

      // Imagem do torneio
      let image_url = null;
      const imgEl = li.querySelector('img');
      if (imgEl) image_url = imgEl.src || null;

      // Fallback para background-image
      if (!image_url) {
        const bgEl = li.querySelector('[style*="background-image"]');
        if (bgEl) {
          const match = bgEl.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
          if (match) image_url = match[1];
        }
      }

      out.push({
        name: name || null,
        url,
        participants_raw: participants_raw || null,
        participants: participants_number || 0,
        date_raw: date || null,
        image_url,
      });
    }

    return out;
  }, BASE);
}

async function getUpcomingTournamentsTonamel(opts = {}) {
  const {
    game = process.env.GAME || 'yugioh_duel_links',
    region = process.env.REGION || 'JP',
    maxLoadMoreClicks = 5,
    headless = true,
    chromePath = process.env.CHROME_PATH
  } = opts;

  const url = `${BASE}/competitions?game=${encodeURIComponent(game)}&region=${encodeURIComponent(region)}`;

  const browser = await puppeteer.launch({
    headless,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await autoScroll(page);
    await clickLoadMoreIfExists(page, process.env.LOAD_MORE_SELECTOR || 'button.load-more, .load-more', maxLoadMoreClicks);

    try {
      await page.waitForSelector('ul.competition-list', { timeout: 8000 });
    } catch {}

    await autoScroll(page);

    const data = await extractFromPage(page);
    return data;
  } finally {
    await page.close();
    await browser.close();
  }
}

module.exports = { getUpcomingTournamentsTonamel };
/*
(async () => {
const data = await getUpcomingTournamentsTonamel();
console.log(JSON.stringify(data, null, 2));
})();
*/
