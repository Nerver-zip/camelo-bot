const { ChannelType, PermissionFlagsBits, Collection } = require('discord.js');
const { updateTierList } = require('../utils/updateTierList.js');

describe('updateTierList', () => {
    function createMockPermissionOverwrites(entries = []) {
        const cache = new Collection();
        for (const entry of entries) {
            cache.set(entry.id, {
                id: entry.id,
                type: entry.type ?? 0,
                allow: entry.allow ?? '0',
                deny: entry.deny ?? '0',
                toJSON() {
                    return {
                        id: this.id,
                        type: this.type,
                        allow: this.allow,
                        deny: this.deny
                    };
                }
            });
        }
        return { cache };
    }

    function createMockCategory(id, name, permissions = {}) {
        const childrenMap = new Collection();
        return {
            id,
            name,
            type: ChannelType.GuildCategory,
            position: 0,
            manageable: true,
            permissionOverwrites: createMockPermissionOverwrites(permissions.overwrites || []),
            children: {
                cache: childrenMap
            },
            permissionsFor(member) {
                return {
                    has(perm) {
                        if (permissions.denyAll) return false;
                        if (permissions.denied?.includes(perm)) return false;
                        return true;
                    }
                };
            }
        };
    }

    function createMockTextChannel(id, name, parentId, extra = {}) {
        return {
            id,
            name,
            type: ChannelType.GuildText,
            parentId,
            position: extra.position ?? 0,
            manageable: extra.manageable ?? true,
            parent: extra.parent ?? null,
            setParent: vi.fn().mockImplementation(async (newParentId) => {
                // update parentId
            }),
            setPosition: vi.fn().mockResolvedValue(true),
            lockPermissions: vi.fn().mockResolvedValue(true),
            permissionsFor(member) {
                return {
                    has(perm) {
                        if (extra.denied?.includes(perm)) return false;
                        return true;
                    }
                };
            }
        };
    }

    function setupMockGuild(options = {}) {
        const channelsMap = new Collection();

        const botMember = {
            id: 'bot-123',
            permissions: {
                has(perm) {
                    if (options.botHasNoGlobalPerms) return false;
                    return true;
                }
            }
        };

        const guild = {
            id: 'guild-1',
            name: 'Servidor Teste',
            members: {
                me: options.noBotMember ? null : botMember
            },
            channels: {
                cache: channelsMap,
                fetch: vi.fn().mockImplementation(async (channelId) => {
                    if (channelId) {
                        return channelsMap.get(channelId) || null;
                    }
                    return channelsMap;
                }),
                create: vi.fn()
            }
        };

        return { guild, channelsMap, botMember };
    }

    it('retorna erro se guild ou botMember for inválido', async () => {
        const resNoGuild = await updateTierList(null);
        expect(resNoGuild.success).toBe(false);

        const { guild } = setupMockGuild({ noBotMember: true });
        const resNoBot = await updateTierList(guild);
        expect(resNoBot.success).toBe(false);
    });

    it('retorna erro se bot não possuir permissão global ManageChannels', async () => {
        const { guild } = setupMockGuild({ botHasNoGlobalPerms: true });
        const res = await updateTierList(guild, { 'Tier 1': ['Speedroid'] });
        expect(res.success).toBe(false);
    });

    it('retorna erro se tier list for vazia', async () => {
        const { guild } = setupMockGuild();
        const res = await updateTierList(guild, {});
        expect(res.success).toBe(false);
    });

    it('cria canal novo na categoria correta se deck não existir no servidor', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const customOverwrites = [
            { id: 'role-everyone', type: 0, allow: '0', deny: '1024' },
            { id: 'role-vip', type: 0, allow: '1024', deny: '0' }
        ];

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks', {
            overwrites: customOverwrites
        });
        const outrosCat = createMockCategory('cat-outros', 'Outros decks');

        channelsMap.set(tier1Cat.id, tier1Cat);
        channelsMap.set(outrosCat.id, outrosCat);

        const createdChannelMock = createMockTextChannel('new-ch-1', 'speedroid', tier1Cat.id);
        guild.channels.create.mockResolvedValue(createdChannelMock);

        const tierList = {
            'Tier 1': ['Speedroid']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.createdCount).toBe(1);
        expect(guild.channels.create).toHaveBeenCalledTimes(1);

        const createCallArgs = guild.channels.create.mock.calls[0][0];
        expect(createCallArgs.name).toBe('speedroid');
        expect(createCallArgs.type).toBe(ChannelType.GuildText);
        expect(createCallArgs.parent).toBe(tier1Cat.id);

        // Verifica que as permissões da categoria foram preservadas
        expect(createCallArgs.permissionOverwrites).toEqual([
            { id: 'role-everyone', type: 0, allow: '0', deny: '1024' },
            { id: 'role-vip', type: 0, allow: '1024', deny: '0' }
        ]);

        // Verifica que lockPermissions foi chamado para sincronizar com a categoria
        expect(createdChannelMock.lockPermissions).toHaveBeenCalledTimes(1);
    });

    it('move canal existente para categoria da tier e não cria canal duplicado', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks');
        const outrosCat = createMockCategory('cat-outros', 'Outros decks');

        const speedroidChannel = createMockTextChannel('ch-speed', 'speedroid', outrosCat.id);
        outrosCat.children.cache.set(speedroidChannel.id, speedroidChannel);

        channelsMap.set(tier1Cat.id, tier1Cat);
        channelsMap.set(outrosCat.id, outrosCat);
        channelsMap.set(speedroidChannel.id, speedroidChannel);

        const tierList = {
            'Tier 1': ['Speedroid']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.movedCount).toBe(1);
        expect(result.createdCount).toBe(0);
        expect(guild.channels.create).not.toHaveBeenCalled();
        expect(speedroidChannel.setParent).toHaveBeenCalledWith(tier1Cat.id, {
            lockPermissions: false,
            reason: expect.stringContaining('Tier 1')
        });
    });

    it('move canal existente fora das categorias monitoradas para a tier sem duplicar', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks');
        channelsMap.set(tier1Cat.id, tier1Cat);

        // Canal que estava em uma categoria não monitorada (ex: sem parentId ou categoria avulsa)
        const speedroidChannel = createMockTextChannel('ch-speed', 'Speedroid', 'cat-avulsa');
        channelsMap.set(speedroidChannel.id, speedroidChannel);

        const tierList = {
            'Tier 1': ['Speedroid']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.movedCount).toBe(1);
        expect(result.createdCount).toBe(0);
        expect(guild.channels.create).not.toHaveBeenCalled();
        expect(speedroidChannel.setParent).toHaveBeenCalledWith(tier1Cat.id, {
            lockPermissions: false,
            reason: expect.stringContaining('Tier 1')
        });
    });

    it('despromove canal que saiu da tier list para Tier 90 decks', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks');
        const tier90Cat = createMockCategory('cat-tier-90', 'Tier 90 decks');

        // Shaddoll estava na Tier 1 anteriormente
        const shaddollChannel = createMockTextChannel('ch-shad', 'shaddoll', tier1Cat.id);
        tier1Cat.children.cache.set(shaddollChannel.id, shaddollChannel);

        channelsMap.set(tier1Cat.id, tier1Cat);
        channelsMap.set(tier90Cat.id, tier90Cat);
        channelsMap.set(shaddollChannel.id, shaddollChannel);

        // Apenas Speedroid está na tier list atual, Shaddoll saiu
        const createdChannelMock = createMockTextChannel('new-speed', 'speedroid', tier1Cat.id);
        guild.channels.create.mockResolvedValue(createdChannelMock);

        const tierList = {
            'Tier 1': ['Speedroid']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.createdCount).toBe(1); // Speedroid foi criado
        expect(result.movedCount).toBe(1); // Shaddoll foi despromovido
        expect(shaddollChannel.setParent).toHaveBeenCalledWith(tier90Cat.id, {
            lockPermissions: false,
            reason: expect.stringContaining('Tier 90')
        });
    });

    it('não cria canal se categoria de destino atingir o limite de 50 canais', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks');
        // Preenche com 50 canais
        for (let i = 0; i < 50; i++) {
            tier1Cat.children.cache.set(`dummy-${i}`, {
                id: `dummy-${i}`,
                name: `dummy-${i}`,
                type: ChannelType.GuildText
            });
        }
        channelsMap.set(tier1Cat.id, tier1Cat);

        const tierList = {
            'Tier 1': ['Battle Chronicle']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.createdCount).toBe(0);
        expect(guild.channels.create).not.toHaveBeenCalled();
    });

    it('não cria canal se bot não tiver permissão ManageChannels na categoria de destino', async () => {
        const { guild, channelsMap } = setupMockGuild();

        const tier1Cat = createMockCategory('cat-tier-1', 'Tier 1 decks', {
            denied: [PermissionFlagsBits.ManageChannels]
        });
        channelsMap.set(tier1Cat.id, tier1Cat);

        const tierList = {
            'Tier 1': ['Battle Chronicle']
        };

        const result = await updateTierList(guild, tierList);

        expect(result.success).toBe(true);
        expect(result.createdCount).toBe(0);
        expect(guild.channels.create).not.toHaveBeenCalled();
    });
});

describe('get-tier-list command', () => {
    const getTierListCommand = require('../commands/getTierList.js');

    it('rejeita execução fora de servidor', async () => {
        const interaction = {
            guild: null,
            deferReply: vi.fn(),
            editReply: vi.fn()
        };

        await getTierListCommand.execute(interaction);
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: '❌ Este comando só pode ser usado em servidores.'
        });
    });

    it('rejeita execução se o usuário não tiver permissão ManageChannels', async () => {
        const interaction = {
            guild: { id: 'guild-1' },
            memberPermissions: {
                has: vi.fn().mockReturnValue(false)
            },
            deferReply: vi.fn(),
            editReply: vi.fn()
        };

        await getTierListCommand.execute(interaction);
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: '❌ Você precisa ser moderador ou maior para usar este comando.'
        });
    });

    it('rejeita execução se o bot não tiver permissão ManageChannels', async () => {
        const interaction = {
            guild: {
                id: 'guild-1',
                members: {
                    me: {
                        permissions: {
                            has: vi.fn().mockReturnValue(false)
                        }
                    }
                }
            },
            memberPermissions: {
                has: vi.fn().mockReturnValue(true)
            },
            deferReply: vi.fn(),
            editReply: vi.fn()
        };

        await getTierListCommand.execute(interaction);
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: '❌ O bot não tem permissão para gerenciar canais.'
        });
    });
});

