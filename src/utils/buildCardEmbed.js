const { EmbedBuilder } = require('discord.js');

function getCardColor(card) {
  const type = (card.humanReadable || card.type || '').toLowerCase();
  
  let color;
  
  if (type.includes('normal')) color = 0xFFFF00; // #FFFF00
  if (type.includes('effect')) color = 0xFFA500; // #FFA500
  if (type.includes('spell')) color = 0x058E7B;    // #058E7B
  if (type.includes('trap')) color = 0x9E4576;     // #9E4576
  if (type.includes('fusion')) color = 0x92529A; // #92529A
  if (type.includes('synchro')) color = 0xFFFFFF; // #FFFFFF
  if (type.includes('xyz')) color = 0x000000;    // #000000
  if (type.includes('link')) color = 0x2A77B1;   // #2A77B1
  if (type.includes('ritual')) color = 0xADD8E6; // #577CBB
  if (type.includes('token')) color = 0x808080;  // #808080

  //padrão neutro
  return color ? color : 0x1d1d1d; // #1d1d1d
}

// Função para construir o embed
function buildCardEmbed(cardObj) {
  const fields = [];

  if (cardObj.typeLine && cardObj.typeLine.length > 0) {
    fields.push({ name: 'Tipo', value: cardObj.typeLine.join(' / '), inline: true });
  }

  if (cardObj.humanReadable) {
    fields.push({ name: 'Subtipo', value: cardObj.humanReadable, inline: true });
  }

  if (cardObj.attribute) {
    fields.push({ name: 'Atributo', value: cardObj.attribute, inline: true });
  }

  if (cardObj.level) {
    fields.push({ name: 'Nível', value: cardObj.level.toString(), inline: true });
  }

  if (cardObj.linkVal) {
    fields.push({ name: 'Link', value: cardObj.linkVal.toString(), inline: true });
  }

  if (cardObj.atk !== null) {
    fields.push({ name: 'ATK', value: cardObj.atk.toString(), inline: true });
  }

  if (cardObj.def !== null) {
    fields.push({ name: 'DEF', value: cardObj.def.toString(), inline: true });
  }

  if (cardObj.archetype) {
    fields.push({ name: 'Arquétipo', value: cardObj.archetype, inline: true });
  }
  const embed = new EmbedBuilder()
    .setTitle(cardObj.name)
    .setURL(`https://duellinksmeta.com/cards/${encodeURIComponent(cardObj.name)}`)
    .setDescription(cardObj.description)
    .setThumbnail(cardObj.imgURL)
    .addFields(fields)
    .setColor(getCardColor(cardObj))
    .setFooter({ text: 'Dados da YGOPRODeck' });

  return embed;
}

module.exports = { buildCardEmbed, getCardColor };
