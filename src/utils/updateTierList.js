const { ChannelType } = require('discord.js');
const { fetchTierList } = require("./fetchTierList.js");

/**
 * Atualiza e organiza os canais da Tier List em um servidor específico.
 * @param {import('discord.js').Guild} guild - O objeto Guild do Discord.
 */
async function updateTierList(guild) {
    if (!guild) {
        console.error("[updateTierList] Guild não fornecida.");
        return;
    }

    // Verifica permissão do bot (apenas loga aviso se falhar, já que é task agendada)
    // Note: Em contexto de scheduler, assume-se que o bot deve ter permissão se estiver configurado.

    let tierList;
    try {
        tierList = await fetchTierList();
    } catch (error) {
        console.error("[updateTierList] Erro ao buscar tier list:", error);
        return;
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
        const cat = guild.channels.cache.find(
            ch => ch.type === ChannelType.GuildCategory && ch.name.toLowerCase() === name.toLowerCase()
        );
        // Em modo silencioso, apenas ignora se não achar, ou loga aviso
        if (!cat && Object.values(categoryNames).includes(name)) {
             console.warn(`[updateTierList] Categoria "${name}" não encontrada no servidor ${guild.name}.`);
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
            if (ch.type === ChannelType.GuildText) allDeckChannels.push(ch);
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
    for (const tier of [0, 1, 2, 3]) {
        const catName = categoryNames[tier];
        const cat = categories[catName];
        if (!cat) continue;

        cat.children.cache.forEach(ch => {
            if (ch.type === ChannelType.GuildText) {
                prevTierDecks[normalizeName(ch.name)] = tier;
            }
        });
    }

    let movedCount = 0;

    for (const ch of allDeckChannels) {
        const chNorm = normalizeName(ch.name);

        if (tierMap.hasOwnProperty(chNorm)) {
            const targetTier = tierMap[chNorm];
            const targetCategory = categories[categoryNames[targetTier]];

            if (!targetCategory) continue;

            if (ch.parentId !== targetCategory.id) {
                try {
                    await ch.setParent(targetCategory.id);
                    movedCount++;
                    console.log(`[updateTierList] 📁 ${ch.name} movido para ${categoryNames[targetTier]} em ${guild.name}`);
                } catch (error) {
                    console.error(`[updateTierList] Erro ao mover canal ${ch.name}:`, error);
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
                    movedCount++;
                    console.log(`[updateTierList] 📁 ${ch.name} movido para ${categoryNames[90]} (despromovido) em ${guild.name}`);
                } catch (error) {
                    console.error(`[updateTierList] Erro ao mover canal ${ch.name}:`, error);
                }
            }
            continue;
        }
    }

    // Organiza alfabeticamente as categorias de Tier
    const categoriesToSort = [
        categoryNames[0],
        categoryNames[1],
        categoryNames[2],
        categoryNames[3],
        categoryNames[90]
    ];

    for (const catName of categoriesToSort) {
        if (!catName) continue;
        const category = categories[catName];
        if (!category) continue;

        try {
            // Recarrega a categoria para garantir que os canais movidos estejam listados
            const freshCategory = await guild.channels.fetch(category.id);
            const channels = freshCategory.children.cache.sort((a, b) => a.name.localeCompare(b.name));

            if (channels.size > 0) {
                const basePos = Math.min(...channels.map(ch => ch.position));
                let i = 0;
                for (const [, channel] of channels) {
                    if (channel.position !== basePos + i) {
                        await channel.setPosition(basePos + i);
                    }
                    i++;
                }
            }
        } catch (err) {
            console.error(`[updateTierList] Erro ao organizar categoria ${catName}:`, err);
        }
    }

    console.log(`[updateTierList] Concluído para ${guild.name}. Canais movidos: ${movedCount}`);
}

module.exports = { updateTierList };
