const axios = require("axios");
const cheerio = require("cheerio");

async function fetchTierList() {
  const url = "https://www.duellinksmeta.com/tier-list/";

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(data);
    const tiers = {};

    $("div.mt-4.tab-content.active > div").each((_, tierDiv) => {
      const tierName = $(tierDiv).find("div.tier-img-container img[alt]").attr("alt");
      if (!tierName) return;

      tiers[tierName] = [];

      $(tierDiv).find("div.deck-type-container div.label").each((_, labelDiv) => {
        const deckName = $(labelDiv).text().trim();
        if (deckName) {
          tiers[tierName].push(deckName);
        }
      });
    });

    console.log(tiers);
    return tiers;

  } catch (error) {
    console.error("Erro ao buscar a Tier List:", error.message);
    throw error;
  }
}
module.exports = { fetchTierList };
