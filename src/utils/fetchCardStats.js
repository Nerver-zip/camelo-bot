const axios = require("axios");
const cheerio = require("cheerio");

async function fetchCardStats(cardName) {

  if (!cardName) 
    return null;

  const baseUrl = "https://www.duellinksmeta.com/cards/";
  const url = `${baseUrl}${encodeURIComponent(cardName)}`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(data);

    const pageTitle = $("h1").first().text().trim();
    if (!pageTitle || pageTitle.toLowerCase() === "404") {
      return null;
    }

    const name = pageTitle;

    const imgElement = $(".image-wrapper img.card-img");
    const srcset = imgElement.attr("srcset");
    const src = imgElement.attr("src");

    let image = null;

    if (srcset) {
      const srcList = srcset.split(",").map(item => item.trim().split(" ")[0]);
      image = srcList[srcList.length - 1]; // Pega a maior resolução
    } else if (src) {
      image = src;
    }

    // Extrai tipo e sub-tipo (ou level/rank/link)
    const specs = $(".card-specs .spec-container span");
    const type = specs.eq(0).text().trim();
    const rawSubType = specs.eq(1).text().trim();

    //Verifica se é numero para saber se é monstro ou outra coisa mudando o identificador do objeto final
    const isNumeric = /^\d+$/.test(rawSubType);
    const subTypeKey = isNumeric ? "Level" : "Sub-type";
    const subTypeValue = rawSubType;

    // Extrai os rankings de popularidade...
    const rankingDivs = $(".ranking-holder .ranking-column");
    const overallPopularity = rankingDivs.eq(0).find(".ranking-text").text().trim();
    const amongType = rankingDivs.eq(1).find(".ranking-text").text().trim();

    const usedDecks = [];

    $('.deck-type-container').slice(0, 6).each((_, container) => {
      const deckName = $(container).find('a').first().text().trim();
      const statsContainer = $(container).find('.stats-container');

      const stats = {};
      // Para cada div dentro de stats-container que tem o formato "Nx" e porcentagem ao lado...
      statsContainer.children('div').each((_, statDiv) => {
        const countText = $(statDiv).find('img').attr('alt')?.trim();
        const percentText = $(statDiv).find('div').text().trim();  

        if (countText && percentText) {
          stats[countText] = percentText;
        }
      });

      if (deckName) {
        usedDecks.push({ deckName, stats });
      }
    });

    return {
      Name: name,
      Type: type,
      [subTypeKey]: subTypeValue,
      "Overall popularity": overallPopularity,
      "Among type": amongType,
      "Used decks": usedDecks,
      Image: image
    };

  } catch (error) {
    console.error("Erro ao buscar os dados do card:", error.message);
    return null;
  }
}

/*(async () => {
  const stats = await fetchCardStats("Swordsoul%20of%20Mo%20Ye");
  console.dir(stats, { depth: null });
})();*/

module.exports = { fetchCardStats };
