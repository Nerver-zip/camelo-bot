const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rebalance')
    .setDescription('Rebalanceia os canais entre as categorias "Outros decks" de forma alfabética.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guild) {
      return interaction.editReply({ content: '❌ Este comando só pode ser usado em servidores.' });
    }

    const guild = interaction.guild;

    try {
      // 1. Identificar categorias "Outros decks"
      const allChannelsFetch = await guild.channels.fetch();
      const targetCategories = allChannelsFetch
        .filter(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().startsWith('outros decks'))
        .sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          // O que não tem número (implicitamente o 1) sempre vem primeiro
          if (nameA === 'outros decks') return -1;
          if (nameB === 'outros decks') return 1;
          // Para os demais (2, 3, etc), usamos ordenação numérica natural
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });

      if (targetCategories.size === 0) {
        return interaction.editReply({ content: '❌ Nenhuma categoria que comece com "Outros decks" foi encontrada.' });
      }

      // 2. Identificar ou criar a categoria "tmp"
      let tmpCategory = allChannelsFetch.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tmp');
      let createdTmp = false;
      if (!tmpCategory) {
        try {
          // Criar a categoria privada e no final
          tmpCategory = await guild.channels.create({
            name: 'tmp',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: guild.members.me.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
              }
            ],
            position: 999 // Tenta colocar ao final
          });
          createdTmp = true;
        } catch (err) {
          console.error('Erro ao criar categoria tmp:', err);
          return interaction.editReply({ content: '❌ Erro ao criar categoria "tmp" necessária para o rebalance.' });
        }
      }

      // 3. Coletar todos os canais das categorias alvo
      const allDecks = [];
      const targetCatList = Array.from(targetCategories.values());
      
      const channelTypes = [ChannelType.GuildText, ChannelType.GuildVoice];

      for (const cat of targetCatList) {
        const children = allChannelsFetch.filter(ch => ch.parentId === cat.id && channelTypes.includes(ch.type));
        allDecks.push(...children.values());
      }

      if (allDecks.length === 0) {
        return interaction.editReply({ content: '❌ Não há canais nas categorias "Outros decks" para rebalancear.' });
      }

      // Ordenar alfabeticamente por nome (Garante a ordem global A-Z)
      allDecks.sort((a, b) => a.name.localeCompare(b.name));

      await interaction.editReply({ content: `⏳ Iniciando rebalance de ${allDecks.length} canais em ${targetCatList.length} categorias...` });

      // 4. Calcular distribuição
      const totalChannels = allDecks.length;
      const numCats = targetCatList.length;
      
      // Distribuição balanceada: define o limite de cada categoria
      // Usamos Math.ceil para preencher as primeiras categorias primeiro, 
      // respeitando o limite de 50 do Discord.
      const maxPerCat = Math.min(50, Math.ceil(totalChannels / numCats));

      const assignments = allDecks.map((channel, i) => {
        const catIndex = Math.floor(i / maxPerCat);
        // Garante que não ultrapassamos o índice das categorias disponíveis
        const targetCategory = targetCatList[Math.min(catIndex, numCats - 1)];
        return { channel, targetCategory };
      });

      // 5. Mover canais usando tmp como buffer
      // Função auxiliar para mover e logar
      const moveChannel = async (channel, targetCatId) => {
          if (channel.parentId === targetCatId) return;
          await channel.setParent(targetCatId, { lockPermissions: false });
      };

      // Mapeamento de ocupação atual para evitar fetches excessivos
      const occupancy = new Map();
      targetCatList.forEach(cat => {
          const count = allChannelsFetch.filter(ch => ch.parentId === cat.id).size;
          occupancy.set(cat.id, count);
      });
      occupancy.set(tmpCategory.id, allChannelsFetch.filter(ch => ch.parentId === tmpCategory.id).size);

      for (let i = 0; i < assignments.length; i++) {
          const { channel, targetCategory } = assignments[i];

          if (channel.parentId !== targetCategory.id) {
              // Se a categoria destino do canal atual estiver cheia, movemos um de lá para tmp
              while (occupancy.get(targetCategory.id) >= 50) {
                  // Encontrar um canal que está na categoria alvo mas NÃO deveria estar lá
                  const allInTarget = (await guild.channels.fetch()).filter(ch => ch.parentId === targetCategory.id);
                  const evictee = allInTarget.first();
                  
                  if (evictee) {
                      await moveChannel(evictee, tmpCategory.id);
                      occupancy.set(targetCategory.id, occupancy.get(targetCategory.id) - 1);
                      occupancy.set(tmpCategory.id, (occupancy.get(tmpCategory.id) || 0) + 1);
                  } else {
                      break; // Categoria vazia? (não deveria acontecer se count >= 50)
                  }

                  // Se tmp encher, descarrega algo de tmp para seu destino correto
                  if (occupancy.get(tmpCategory.id) >= 50) {
                      const tmpChannels = (await guild.channels.fetch()).filter(ch => ch.parentId === tmpCategory.id);
                      for (const chTmp of tmpChannels.values()) {
                          const destAssignment = assignments.find(a => a.channel.id === chTmp.id);
                          if (destAssignment && occupancy.get(destAssignment.targetCategory.id) < 50) {
                              await moveChannel(chTmp, destAssignment.targetCategory.id);
                              occupancy.set(tmpCategory.id, occupancy.get(tmpCategory.id) - 1);
                              occupancy.set(destAssignment.targetCategory.id, occupancy.get(destAssignment.targetCategory.id) + 1);
                              if (occupancy.get(tmpCategory.id) < 50) break;
                          }
                      }
                  }
              }

              // Agora movemos o canal atual para o destino (se houver espaço) ou para tmp
              const currentParentId = channel.parentId;
              if (occupancy.get(targetCategory.id) < 50) {
                  await moveChannel(channel, targetCategory.id);
                  occupancy.set(targetCategory.id, occupancy.get(targetCategory.id) + 1);
                  if (currentParentId) occupancy.set(currentParentId, occupancy.get(currentParentId) - 1);
              } else {
                  await moveChannel(channel, tmpCategory.id);
                  occupancy.set(tmpCategory.id, occupancy.get(tmpCategory.id) + 1);
                  if (currentParentId) occupancy.set(currentParentId, occupancy.get(currentParentId) - 1);
              }
          }
      }

      // Final: Mover tudo que sobrou em tmp para seus destinos finais
      const finalTmpChannels = (await guild.channels.fetch()).filter(ch => ch.parentId === tmpCategory.id);
      for (const chTmp of finalTmpChannels.values()) {
          const assignment = assignments.find(a => a.channel.id === chTmp.id);
          if (assignment) {
              await moveChannel(chTmp, assignment.targetCategory.id);
          }
      }

      // 6. Ordenação final dentro de cada categoria
      await interaction.editReply({ content: `⏳ Quase lá! Ajustando a ordem alfabética final...` });
      for (const cat of targetCatList) {
          const catChannels = (await guild.channels.fetch())
            .filter(ch => ch.parentId === cat.id && channelTypes.includes(ch.type))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          let pos = 0;
          for (const [, ch] of catChannels) {
              await ch.setPosition(pos++);
          }
      }

      // 7. Limpeza
      if (createdTmp) {
          const updatedTmp = await guild.channels.fetch(tmpCategory.id);
          if (updatedTmp && updatedTmp.children.cache.size === 0) {
              await updatedTmp.delete();
          }
      }

      return interaction.editReply({ content: `✅ Rebalance concluído! ${allDecks.length} canais organizados em ${targetCatList.length} categorias.` });

    } catch (error) {
      console.error('Erro no rebalance:', error);
      return interaction.editReply({ content: `❌ Erro no rebalance: ${error.message}` });
    }
  },
};
