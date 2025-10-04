const axios = require('axios');
const cloudinary = require('cloudinary');
require('dotenv').config();

// Configuração Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cardCache = new Map();

async function fetchCardData(cardName) {
  if (!cardName) return null;

  if (cardCache.has(cardName)) {
    return cardCache.get(cardName);
  }

  // Busca na API do YGOPRODeck
  let cardData;
  try {
    const res = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`);
    if (!res.data || !res.data.data || res.data.data.length === 0) return null;
    cardData = res.data.data[0];
  } catch (err) {
    console.error("Erro ao buscar carta na API:", err.message);
    return null;
  }

  // Define URL do Cloudinary
  const publicId = cardData.name; // seu padrão de nome
  const cloudURL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/yugioh_cards/${encodeURIComponent(publicId)}.jpg`;

  // 4️⃣Tenta verificar se a imagem existe
  try {
    await cloudinary.v2.api.resource(`yugioh_cards/${publicId}`);
  } catch (err) {
      // qualquer erro assume que a imagem não existe
        try {
            const imageResponse = await axios.get(cardData.card_images[0].image_url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageResponse.data);
            await new Promise((resolve, reject) => {
            cloudinary.v2.uploader.upload_stream(
            { folder: "yugioh_cards", public_id: publicId },
            (error, result) => (error ? reject(error) : resolve(result))
          ).end(buffer);
        });
      } catch (uploadErr) {
        console.error("Erro ao subir imagem para Cloudinary:", uploadErr.message);
      }
  }

  // Monta objeto final
  const cardObj = {
    name: cardData.name,
    description: cardData.desc,
    type: cardData.type,
    typeLine: cardData.typeline || null,
    attribute: cardData.attribute || null,
    level: cardData.level || null,
    humanReadable: cardData.humanReadableCardType || null,
    linkVal: cardData.linkval || null,
    archetype: cardData.archetype || null,
    atk: cardData.atk || null,
    def: cardData.def || null,
    imgURL: cloudURL,
  };

  cardCache.set(cardName, cardObj);

  return cardObj;
}

/*(async () =>{
    const cardInfo = await fetchCardData("Polymerization");
    console.dir(cardInfo, {depth: null});
})();*/

module.exports = { fetchCardData }
