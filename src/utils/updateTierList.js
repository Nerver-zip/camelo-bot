const {
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const { fetchTierList } = require("./fetchTierList.js");

/**
 * Normaliza nomes para comparar canais com os nomes da tier list.
 *
 * Exemplo:
 * "Stardust / Synchron" -> "stardustsynchron"
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
    return String(name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/s$/, "");
}

/**
 * Formata o nome de um deck para um nome de canal de texto válido no Discord.
 *
 * Exemplo:
 * "Battle Chronicle" -> "battle-chronicle"
 * "Stardust / Synchron" -> "stardust-synchron"
 *
 * @param {string} name
 * @returns {string}
 */
function formatChannelName(name) {
    const formatted = String(name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);

    return formatted || "novo-deck";
}

/**
 * Atualiza e organiza os canais da Tier List em um servidor específico.
 * Se um deck que aparece na tier list não existir no servidor, cria o canal
 * na categoria correta preservando as permissões da categoria.
 *
 * @param {import("discord.js").Guild} guild
 * @param {Record<string, string[]>} [passedTierList]
 * @returns {Promise<{ success: boolean, reason?: string, movedCount?: number, createdCount?: number, movedChannels?: string[], createdChannels?: string[] }>}
 */
async function updateTierList(guild, passedTierList) {
    if (!guild) {
        console.error("[updateTierList] Guild não fornecida.");
        return { success: false, reason: "Guild não fornecida." };
    }

    const botMember = guild.members.me;

    if (!botMember) {
        console.error(
            `[updateTierList] Não foi possível localizar o bot no servidor ${guild.name}.`
        );
        return {
            success: false,
            reason: `Não foi possível localizar o bot no servidor ${guild.name}.`
        };
    }

    if (
        !botMember.permissions.has(
            PermissionFlagsBits.ManageChannels
        )
    ) {
        console.error(
            `[updateTierList] O bot não possui a permissão global "Gerenciar Canais" em ${guild.name}.`
        );
        return {
            success: false,
            reason: `O bot não possui a permissão global "Gerenciar Canais" em ${guild.name}.`
        };
    }

    let tierList = passedTierList;

    if (!tierList) {
        try {
            tierList = await fetchTierList();
        } catch (error) {
            console.error(
                "[updateTierList] Erro ao buscar tier list:",
                error
            );
            return {
                success: false,
                reason: "Erro ao buscar a tier list."
            };
        }
    }

    if (
        !tierList ||
        typeof tierList !== "object" ||
        Object.keys(tierList).length === 0
    ) {
        console.warn(
            "[updateTierList] Tier List vazia ou inválida. Abortando atualização."
        );
        return {
            success: false,
            reason: "Tier List vazia ou inválida."
        };
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
        "Outros decks 4",
        "Outros decks 5",
        "Outros decks 6",
        "Outros decks 7",
        "Outros decks 8",
        "Outros decks 9",
        "Outros decks 10"
    ];

    /**
     * Verifica se o bot possui permissões efetivas em um canal ou categoria.
     *
     * @param {import("discord.js").GuildChannel} channel
     * @param {bigint} permission
     * @returns {boolean}
     */
    function hasChannelPermission(channel, permission) {
        return Boolean(
            channel
                .permissionsFor(botMember)
                ?.has(permission)
        );
    }

    const categoryChannelCounts = new Map();

    function getCategoryCount(cat) {
        if (!categoryChannelCounts.has(cat.id)) {
            categoryChannelCounts.set(
                cat.id,
                cat.children?.cache?.size ?? 0
            );
        }
        return categoryChannelCounts.get(cat.id);
    }

    function incrementCategoryCount(catId) {
        if (categoryChannelCounts.has(catId)) {
            categoryChannelCounts.set(
                catId,
                categoryChannelCounts.get(catId) + 1
            );
        }
    }

    function decrementCategoryCount(catId) {
        if (categoryChannelCounts.has(catId)) {
            categoryChannelCounts.set(
                catId,
                Math.max(0, categoryChannelCounts.get(catId) - 1)
            );
        }
    }

    /**
     * Move um canal sem sincronizar automaticamente os overwrites
     * da categoria de destino.
     *
     * @param {import("discord.js").GuildChannel} channel
     * @param {import("discord.js").CategoryChannel} targetCategory
     * @param {string} reason
     * @returns {Promise<boolean>}
     */
    async function moveChannel(
        channel,
        targetCategory,
        reason
    ) {
        if (channel.parentId === targetCategory.id) {
            return false;
        }

        if (getCategoryCount(targetCategory) >= 50) {
            console.warn(
                `[updateTierList] Categoria "${targetCategory.name}" atingiu o limite de 50 canais em ${guild.name}. Não foi possível mover "${channel.name}".`
            );
            return false;
        }

        const canViewSource = hasChannelPermission(
            channel,
            PermissionFlagsBits.ViewChannel
        );

        const canManageSource = hasChannelPermission(
            channel,
            PermissionFlagsBits.ManageChannels
        );

        const canViewTarget = hasChannelPermission(
            targetCategory,
            PermissionFlagsBits.ViewChannel
        );

        const canManageTarget = hasChannelPermission(
            targetCategory,
            PermissionFlagsBits.ManageChannels
        );

        if (
            !canViewSource ||
            !canManageSource ||
            !canViewTarget ||
            !canManageTarget
        ) {
            console.warn(
                `[updateTierList] Sem permissão efetiva para mover o canal "${channel.name}".`,
                {
                    servidor: guild.name,
                    origem: channel.parent?.name ?? null,
                    destino: targetCategory.name,
                    canViewSource,
                    canManageSource,
                    canViewTarget,
                    canManageTarget,
                    channelManageable: channel.manageable
                }
            );

            return false;
        }

        if (!channel.manageable) {
            console.warn(
                `[updateTierList] O canal "${channel.name}" não é gerenciável pelo bot em ${guild.name}.`
            );
            return false;
        }

        try {
            const oldParentId = channel.parentId;

            await channel.setParent(targetCategory.id, {
                // Evita copiar/sincronizar os permission overwrites
                // da categoria de destino.
                lockPermissions: false,
                reason
            });

            if (oldParentId) {
                decrementCategoryCount(oldParentId);
            }
            incrementCategoryCount(targetCategory.id);

            console.log(
                `[updateTierList] 📁 ${channel.name} movido para ${targetCategory.name} em ${guild.name}`
            );

            return true;
        } catch (error) {
            console.error(
                `[updateTierList] Erro ao mover o canal "${channel.name}" para "${targetCategory.name}":`,
                error
            );

            return false;
        }
    }

    /*
     * Localiza as categorias existentes.
     */
    const categories = {};

    for (const name of allPossibleCategories) {
        const category = guild.channels.cache.find(
            channel =>
                channel.type === ChannelType.GuildCategory &&
                channel.name.toLowerCase() ===
                    name.toLowerCase()
        );

        if (
            !category &&
            Object.values(categoryNames).includes(name)
        ) {
            console.warn(
                `[updateTierList] Categoria "${name}" não encontrada no servidor ${guild.name}.`
            );
        }

        if (category) {
            categories[name] = category;
        }
    }

    /*
     * Coleta os canais de texto de todas as categorias monitoradas.
     */
    const allDeckChannels = [];

    for (const categoryName of Object.keys(categories)) {
        const category = categories[categoryName];

        category.children.cache.forEach(channel => {
            if (channel.type === ChannelType.GuildText && channel.name) {
                allDeckChannels.push(channel);
            }
        });
    }

    /*
     * Cria o mapa:
     * nome normalizado do deck -> número da tier
     * e a lista de decks ordenada conforme a tier list.
     */
    const tierMap = {};
    const tierDecks = [];

    for (const tierKey of Object.keys(tierList)) {
        const tierNumber = Number.parseInt(
            tierKey.replace(/[^0-9]/g, ""),
            10
        );

        if (Number.isNaN(tierNumber)) {
            continue;
        }

        if (!Array.isArray(tierList[tierKey])) {
            console.warn(
                `[updateTierList] A entrada "${tierKey}" não contém uma lista válida de decks.`
            );
            continue;
        }

        for (const deckName of tierList[tierKey]) {
            if (
                !deckName ||
                typeof deckName !== "string" ||
                !deckName.trim()
            ) {
                continue;
            }

            const normalized = normalizeName(deckName);
            tierMap[normalized] = tierNumber;
            tierDecks.push({
                name: deckName.trim(),
                normalizedName: normalized,
                tier: tierNumber
            });
        }
    }

    /*
     * Registra quais canais estavam anteriormente em uma tier.
     * Se desaparecerem da tier list, serão movidos para Tier 90.
     */
    const prevTierDecks = {};

    for (const tier of [0, 1, 2, 3]) {
        const categoryName = categoryNames[tier];
        const category = categories[categoryName];

        if (!category) {
            continue;
        }

        category.children.cache.forEach(channel => {
            if (channel.type === ChannelType.GuildText && channel.name) {
                prevTierDecks[normalizeName(channel.name)] =
                    tier;
            }
        });
    }

    let movedCount = 0;
    let createdCount = 0;
    const movedChannels = [];
    const createdChannels = [];
    const matchedDecks = new Set();

    /*
     * Move canais para suas tiers atuais.
     */
    for (const channel of allDeckChannels) {
        const normalizedChannelName = normalizeName(
            channel.name
        );

        if (
            Object.prototype.hasOwnProperty.call(
                tierMap,
                normalizedChannelName
            )
        ) {
            matchedDecks.add(normalizedChannelName);

            const targetTier =
                tierMap[normalizedChannelName];

            const targetCategoryName =
                categoryNames[targetTier];

            const targetCategory =
                categories[targetCategoryName];

            if (!targetCategory) {
                console.warn(
                    `[updateTierList] Não foi possível mover "${channel.name}": ` +
                    `a categoria da Tier ${targetTier} não existe em ${guild.name}.`
                );

                continue;
            }

            const moved = await moveChannel(
                channel,
                targetCategory,
                `Atualização automática da Tier List: Tier ${targetTier}`
            );

            if (moved) {
                movedCount++;
                movedChannels.push(
                    `📁 ${channel.name} movido para ${targetCategory.name}`
                );
            }

            continue;
        }

        /*
         * Se o canal estava anteriormente em uma tier, mas não está
         * mais presente na tier list, move para Tier 90.
         */
        if (
            Object.prototype.hasOwnProperty.call(
                prevTierDecks,
                normalizedChannelName
            )
        ) {
            const tier90Category =
                categories[categoryNames[90]];

            if (!tier90Category) {
                console.warn(
                    `[updateTierList] Não foi possível despromover "${channel.name}": ` +
                    `a categoria "${categoryNames[90]}" não existe em ${guild.name}.`
                );

                continue;
            }

            const moved = await moveChannel(
                channel,
                tier90Category,
                "Deck removido da Tier List; movido automaticamente para Tier 90"
            );

            if (moved) {
                movedCount++;
                movedChannels.push(
                    `📁 ${channel.name} movido para ${tier90Category.name} (despromovido)`
                );
            }
        }
    }

    /*
     * Cria canais para decks que aparecerem na tier list e não existirem.
     * Preserva as permissões da categoria.
     */
    for (const deck of tierDecks) {
        if (matchedDecks.has(deck.normalizedName)) {
            continue;
        }

        const targetCategoryName = categoryNames[deck.tier];
        const targetCategory = categories[targetCategoryName];

        if (!targetCategory) {
            console.warn(
                `[updateTierList] Não foi possível criar canal para "${deck.name}": ` +
                `a categoria "${targetCategoryName}" não existe em ${guild.name}.`
            );
            continue;
        }

        // Verifica se o canal já existe em outra parte do servidor
        const existingInGuild = guild.channels.cache.find(
            ch =>
                ch.type === ChannelType.GuildText &&
                normalizeName(ch.name) === deck.normalizedName
        );

        if (existingInGuild) {
            matchedDecks.add(deck.normalizedName);

            const moved = await moveChannel(
                existingInGuild,
                targetCategory,
                `Atualização automática da Tier List: Tier ${deck.tier}`
            );

            if (moved) {
                movedCount++;
                movedChannels.push(
                    `📁 ${existingInGuild.name} movido para ${targetCategory.name}`
                );
            }

            continue;
        }

        const canManageTarget = hasChannelPermission(
            targetCategory,
            PermissionFlagsBits.ManageChannels
        );

        const canViewTarget = hasChannelPermission(
            targetCategory,
            PermissionFlagsBits.ViewChannel
        );

        if (!canManageTarget || !canViewTarget) {
            console.warn(
                `[updateTierList] Sem permissão para criar canal na categoria "${targetCategory.name}" em ${guild.name}.`,
                {
                    servidor: guild.name,
                    destino: targetCategory.name,
                    canViewTarget,
                    canManageTarget
                }
            );
            continue;
        }

        if (getCategoryCount(targetCategory) >= 50) {
            console.warn(
                `[updateTierList] Categoria "${targetCategory.name}" atingiu o limite de 50 canais em ${guild.name}.`
            );
            continue;
        }

        const channelName = formatChannelName(deck.name);

        try {
            // Preserva as permissões da categoria
            const categoryOverwrites =
                targetCategory.permissionOverwrites?.cache;

            const permissionOverwrites =
                categoryOverwrites && categoryOverwrites.size > 0
                    ? [...categoryOverwrites.values()].map(po =>
                          typeof po.toJSON === "function"
                              ? po.toJSON()
                              : po
                      )
                    : undefined;

            const createOptions = {
                name: channelName,
                type: ChannelType.GuildText,
                parent: targetCategory.id,
                reason: `Criação automática para deck da Tier ${deck.tier}: ${deck.name}`
            };

            if (permissionOverwrites && permissionOverwrites.length > 0) {
                createOptions.permissionOverwrites = permissionOverwrites;
            }

            const newChannel =
                await guild.channels.create(createOptions);

            incrementCategoryCount(targetCategory.id);

            try {
                if (typeof newChannel?.lockPermissions === "function") {
                    await newChannel.lockPermissions();
                }
            } catch (lockError) {
                console.warn(
                    `[updateTierList] Aviso ao sincronizar permissões do canal "${newChannel?.name ?? channelName}":`,
                    lockError
                );
            }

            matchedDecks.add(deck.normalizedName);
            createdCount++;
            createdChannels.push(
                `✨ ${newChannel.name} criado em ${targetCategory.name}`
            );

            console.log(
                `[updateTierList] ✨ ${newChannel.name} criado em ${targetCategory.name} em ${guild.name}`
            );
        } catch (error) {
            console.error(
                `[updateTierList] Erro ao criar canal para o deck "${deck.name}" em "${targetCategory.name}":`,
                error
            );
        }
    }

    /*
     * Recarrega os canais do servidor para atualizar pais,
     * posições e caches após as movimentações e criações.
     */
    try {
        await guild.channels.fetch();
    } catch (error) {
        console.warn(
            `[updateTierList] Não foi possível atualizar o cache de canais de ${guild.name}:`,
            error
        );
    }

    /*
     * Organiza alfabeticamente os canais das categorias de Tier.
     */
    const categoriesToSort = [
        categoryNames[0],
        categoryNames[1],
        categoryNames[2],
        categoryNames[3],
        categoryNames[90]
    ];

    for (const categoryName of categoriesToSort) {
        const category = categories[categoryName];

        if (!category) {
            continue;
        }

        const canManageCategory = hasChannelPermission(
            category,
            PermissionFlagsBits.ManageChannels
        );

        if (!canManageCategory) {
            console.warn(
                `[updateTierList] Sem permissão para organizar a categoria "${categoryName}" em ${guild.name}.`
            );
            continue;
        }

        try {
            const freshCategory =
                await guild.channels.fetch(category.id);

            if (
                !freshCategory ||
                freshCategory.type !==
                    ChannelType.GuildCategory
            ) {
                continue;
            }

            const channels = [
                ...freshCategory.children.cache.values()
            ]
                .filter(
                    channel =>
                        channel.type ===
                            ChannelType.GuildText &&
                        Boolean(channel.name)
                )
                .sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "pt-BR",
                        {
                            sensitivity: "base"
                        }
                    )
                );

            if (channels.length === 0) {
                continue;
            }

            const basePosition = Math.min(
                ...channels.map(channel => channel.position)
            );

            for (
                let index = 0;
                index < channels.length;
                index++
            ) {
                const channel = channels[index];
                const targetPosition =
                    basePosition + index;

                if (channel.position === targetPosition) {
                    continue;
                }

                if (!channel.manageable) {
                    console.warn(
                        `[updateTierList] O canal "${channel.name}" não pode ser reordenado pelo bot.`
                    );
                    continue;
                }

                try {
                    await channel.setPosition(
                        targetPosition,
                        {
                            reason: "Organização alfabética automática da Tier List"
                        }
                    );
                } catch (error) {
                    console.error(
                        `[updateTierList] Erro ao posicionar o canal "${channel.name}" na categoria "${categoryName}":`,
                        error
                    );
                }
            }
        } catch (error) {
            console.error(
                `[updateTierList] Erro ao organizar a categoria "${categoryName}":`,
                error
            );
        }
    }

    console.log(
        `[updateTierList] Concluído para ${guild.name}. Canais movidos: ${movedCount}, canais criados: ${createdCount}`
    );

    return {
        success: true,
        movedCount,
        createdCount,
        movedChannels,
        createdChannels
    };
}

module.exports = {
    updateTierList,
    normalizeName,
    formatChannelName
};
