const axios = require("axios");
const path = require("path");
const fs = require("fs");
const minimist = require("minimist");
const cliProgress = require("cli-progress");

const args = minimist(process.argv.slice(2));
const requestedFields = Object.keys(args).filter(key => key !== "_" && key !== "filter" && key !== "list");

// Show all possible fields
if (args.list) {
  console.log("📌 Available fields you can request:\n");

  const fields = {
    "Basic": ["id", "name", "type", "desc"],
    "Monster": ["atk", "def", "level", "linkval", "linkmarkers", "race", "attribute"],
    "Support": ["archetype", "humanReadableCardType", "frameType", "typeline"],
    "Card Sets": ["card_sets.set_name", "card_sets.set_code", "card_sets.set_rarity", "card_sets.set_rarity_code", "card_sets.set_price"],
    "Card Images": ["card_images.image_url", "card_images.image_url_small", "card_images.image_url_cropped"],
    "Card Prices": ["card_prices.cardmarket_price", "card_prices.tcgplayer_price", "card_prices.ebay_price", "card_prices.amazon_price", "card_prices.coolstuffinc_price"],
    "Banlist Info": ["banlist_info.ban_tcg", "banlist_info.ban_ocg", "banlist_info.ban_goat"],
    "Extra": ["ygoprodeck_url"]
  };

  for (const [category, list] of Object.entries(fields)) {
    console.log(`🔹 ${category}`);
    list.forEach(f => console.log("   --" + f));
    console.log();
  }

  process.exit(0);
}

// Default fields if none requested
if (requestedFields.length === 0) {
  const allFields = [
    "id", "name", "type", "desc",
    "atk", "def", "level", "linkval", "linkmarkers", "race", "attribute",
    "archetype", "humanReadableCardType", "frameType", "typeline",
    "card_sets.set_name", "card_sets.set_code", "card_sets.set_rarity", "card_sets.set_rarity_code", "card_sets.set_price",
    "card_images.image_url", "card_images.image_url_small", "card_images.image_url_cropped",
    "card_prices.cardmarket_price", "card_prices.tcgplayer_price", "card_prices.ebay_price", "card_prices.amazon_price", "card_prices.coolstuffinc_price",
    "banlist_info.ban_tcg", "banlist_info.ban_ocg", "banlist_info.ban_goat",
    "ygoprodeck_url"
  ];
  requestedFields.push(...allFields);
}

// Check if filter mode is on
const isFilterMode = args.filter;

(async () => {
  try {
    console.log("🔄 Fazendo fetch de dados do YGOProDeck...");
    const { data } = await axios.get("https://db.ygoprodeck.com/api/v7/cardinfo.php");
    const cards = data.data;
    const total = cards.length;

    // Init progress bar
    const bar = new cliProgress.SingleBar({
      format: "Progresso |{bar}| {percentage}% || {value}/{total} cartas",
      hideCursor: true
    }, cliProgress.Presets.shades_classic);
    bar.start(total, 0);

    let output = "";

    for (let i = 0; i < total; i++) {
      const card = cards[i];

      if (isFilterMode) {
        // Skip card if any requested field is missing
        const allFieldsExist = requestedFields.every(field => {
          const value = field.split(".").reduce((obj, k) => (obj ? obj[k] : undefined), card);
          return value !== undefined && value !== null;
        });
        if (!allFieldsExist) continue;
      }

      const values = requestedFields.map(field => {
        let value = field.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), card);
        if (Array.isArray(value)) value = value.join(", ");
        if (value === undefined || value === null) value = "";
        return String(value).replace(/\r?\n|\r/g, " ");
      });

      output += values.join(";") + "\n";
      bar.update(i + 1);
    }
    
    bar.stop();
    
    const outputDir = path.join(__dirname, "../../local/dump"); 
    const outputFile = path.join(outputDir, "cards.txt");


    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, output, "utf-8");
    
    console.log(`✅ Exportadas ${output.split("\n").length - 1} cartas para ${outputFile}`); 
    console.log(`Campos selecionados: ${requestedFields.join(", ")}`);  
    } 
    
    catch (err) {
        console.error("❌ Erro ao exportar cartas:", err.message);
  }
})();
