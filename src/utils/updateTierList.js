const {
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const { fetchTierList } = require("./fetchTierList.js");

/**
 * Atualiza e organiza os canais da Tier List em um servidor específico.
 *
 * @param {import("discord.js").Guild} guild
 * @param {Record<string, string[]>} [passedTierList]
 */
async function updateTierList(guild, passedTierList) {
    if (!guild) {
        console.error("[updateTierList] Guild não fornecida.");
        return;
    }

    const botMember = guild.members.me;

    if (!botMember) {
        console.error(
            `[updateTierList] Não foi possível localizar o bot no servidor ${guild.name}.`
        );
        return;
    }

    if (
        !botMember.permissions.has(
            PermissionFlagsBits.ManageChannels
        )
    ) {
        console.error(
            `[updateTierList] O bot não possui a permissão global "Gerenciar Canais" em ${guild.name}.`
        );
        return;
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
            return;
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
        "Outros decks 4",
        "Outros decks 5",
        "Outros decks 6",
        "Outros decks 7",
        "Outros decks 8",
        "Outros decks 9",
        "Outros decks 10"
    ];

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
            await channel.setParent(targetCategory.id, {
                // Evita copiar/sincronizar os permission overwrites
                // da categoria de destino.
                lockPermissions: false,
                reason
            });

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
            if (channel.type === ChannelType.GuildText) {
                allDeckChannels.push(channel);
            }
        });
    }

    /*
     * Cria o mapa:
     *
     * nome normalizado do deck -> número da tier
     */
    const tierMap = {};

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
            tierMap[normalizeName(deckName)] = tierNumber;
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
            if (channel.type === ChannelType.GuildText) {
                prevTierDecks[normalizeName(channel.name)] =
                    tier;
            }
        });
    }

    let movedCount = 0;

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
            }
        }
    }

    /*
     * Recarrega os canais do servidor para atualizar pais,
     * posições e caches após as movimentações.
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
                        ChannelType.GuildText
                )
                .sort((a, b) =>
                    a.name.localeCompare(
                        b.name,
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
        `[updateTierList] Concluído para ${guild.name}. Canais movidos: ${movedCount}`
    );
}

module.exports = {
    updateTierList
};
