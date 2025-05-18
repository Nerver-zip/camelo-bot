const { fetchTierList } = require("../utils/fetchTierList.js");

module.exports = {
  name: 'getTierList',
  async execute(message, _) {
    if (!message.guild) {
      return message.reply('Este comando só pode ser usado em servidores.');
    }

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply('O bot não tem permissão para gerenciar canais.');
    }

    let tierList;
    try {
      tierList = await fetchTierList();
    } catch (error) {
      console.error("Erro ao buscar tier list:", error);
      return message.reply("Não foi possível buscar a tier list no momento.");
    }

    const categoryNames = {
      0: "Tier 0 decks",
      1: "Tier 1 decks",
      2: "Tier 2 decks",
      3: "Tier 3 decks",
      90: "Tier 90 decks"
    };

    const categories = {};
    for (const key in categoryNames) {
      const cat = message.guild.channels.cache.find(
        ch => ch.type === 4 && ch.name.toLowerCase() === categoryNames[key].toLowerCase()
      );
      if (!cat) {
        return message.reply(`Categoria "${categoryNames[key]}" não encontrada no servidor.`);
      }
      categories[key] = cat;
    }

    // Função para normalizar nomes (lowercase, remove s final, espaços e traços)
    function normalizeName(name) {
      return name
        .toLowerCase()
        .replace(/s$/, '')
        .replace(/[-\s]/g, '');
    }

    // Pega todos canais de decks em todas as categorias (0,1,2,3,90)
    const allDeckChannels = [];
    for (const catKey of [0,1,2,3,90]) {
      const cat = categories[catKey];
      cat.children.cache.forEach(ch => {
        if (ch.type === 0) allDeckChannels.push(ch);
      });
    }

    // Monta o mapa deckNameNormalizado -> tierNumber
    const tierMap = {};
    for (const tierKey in tierList) {
      // extrai o número da tier a partir da string 'Tier 1', 'Tier 2', etc
      const tierNumber = parseInt(tierKey.replace(/[^0-9]/g, ''), 10);
      if (isNaN(tierNumber)) continue;

      // Cada deck normalizado recebe o número da tier
      for (const deckName of tierList[tierKey]) {
        tierMap[normalizeName(deckName)] = tierNumber;
      }
    }

    const movedChannels = [];

    for (const ch of allDeckChannels) {
      const chNorm = normalizeName(ch.name);

      let foundTier = null;

      if (tierMap.hasOwnProperty(chNorm)) {
        foundTier = tierMap[chNorm];
      } else {
        foundTier = 90; // Se não está na tier list, vai pra Tier 90
      }

      // Se já está na categoria correta, pula
      if (ch.parentId === categories[foundTier].id) continue;

      try {
        await ch.setParent(categories[foundTier].id);
        movedChannels.push(`📁 ${ch.name} movido para ${categoryNames[foundTier]}`);
      } catch (error) {
        console.error(`Erro ao mover canal ${ch.name}:`, error);
        movedChannels.push(`⚠️ Erro ao mover canal ${ch.name}`);
      }
    }

    if (movedChannels.length === 0) {
      return message.reply("Todos os canais já estão nas categorias corretas.");
    } else {
      return message.reply(
        "Resumo da organização da Tier List:\n" + movedChannels.join("\n")
      );
    }
  }
};
