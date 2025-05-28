const { fetchTierList } = require("../utils/fetchTierList.js");

module.exports = {
  name: 'getTierList',
  async execute(message, _) {
    if (!message.guild) {
      return message.reply('Este comando só pode ser usado em servidores.');
    }

    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ Você precisa ser moderador ou maior para usar este comando.');
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

    const allPossibleCategories = [
      "Tier 0 decks",
      "Tier 1 decks",
      "Tier 2 decks",
      "Tier 3 decks",
      "Tier 90 decks",
      "Novos decks",
      "Outros decks",
      "Outros decks 2",
      "Outros decks 3",
      "Outros decks 4"
    ];

    const categories = {};
    for (const name of allPossibleCategories) {
      const cat = message.guild.channels.cache.find(
        ch => ch.type === 4 && ch.name.toLowerCase() === name.toLowerCase()
      );
      if (!cat && Object.values(categoryNames).includes(name)) {
        return message.reply(`Categoria "${name}" não encontrada no servidor.`);
      }
      if (cat) categories[name] = cat;
    }

    function normalizeName(name) {
      return name
        .toLowerCase()
        .replace(/s$/, '')
        .replace(/[-\s]/g, '');
    }

    const allDeckChannels = [];
    for (const catName of Object.keys(categories)) {
      const cat = categories[catName];
      cat.children.cache.forEach(ch => {
        if (ch.type === 0) allDeckChannels.push(ch);
      });
    }

    const tierMap = {};
    for (const tierKey in tierList) {
      const tierNumber = parseInt(tierKey.replace(/[^0-9]/g, ''), 10);
      if (isNaN(tierNumber)) continue;

      for (const deckName of tierList[tierKey]) {
        tierMap[normalizeName(deckName)] = tierNumber;
      }
    }

    const prevTierDecks = {};
    for (const tier of [0,1,2,3]) {
      const catName = categoryNames[tier];
      const cat = categories[catName];
      if (!cat) continue;

      cat.children.cache.forEach(ch => {
        if (ch.type === 0) {
          prevTierDecks[normalizeName(ch.name)] = tier;
        }
      });
    }

    const movedChannels = [];

    for (const ch of allDeckChannels) {
      const chNorm = normalizeName(ch.name);

      if (tierMap.hasOwnProperty(chNorm)) {
        const targetTier = tierMap[chNorm];
        const targetCategory = categories[categoryNames[targetTier]];

        if (!targetCategory) continue;

        if (ch.parentId !== targetCategory.id) {
          try {
            await ch.setParent(targetCategory.id);
            movedChannels.push(`📁 ${ch.name} movido para ${categoryNames[targetTier]}`);
          } catch (error) {
            console.error(`Erro ao mover canal ${ch.name}:`, error);
            movedChannels.push(`⚠️ Erro ao mover canal ${ch.name}`);
          }
        }
        continue;
      }

      if (prevTierDecks.hasOwnProperty(chNorm)) {
        const tier90Cat = categories[categoryNames[90]];
        if (!tier90Cat) continue;

        if (ch.parentId !== tier90Cat.id) {
          try {
            await ch.setParent(tier90Cat.id);
            movedChannels.push(`📁 ${ch.name} movido para ${categoryNames[90]} (despromovido)`);
          } catch (error) {
            console.error(`Erro ao mover canal ${ch.name}:`, error);
            movedChannels.push(`⚠️ Erro ao mover canal ${ch.name}`);
          }
        }
        continue;
      }
      // Não toca em decks que não estavam antes e não estão agora na tier list
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
