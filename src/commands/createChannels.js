const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createchannels')
    .setDescription('Cria canais de texto dentro de uma categoria existente.')
    .addChannelOption(option =>
      option.setName('categoria')
        .setDescription('Categoria destino')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .addStringOption(option =>
      option.setName('canal1')
        .setDescription('Nome do canal a criar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('canal2')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal3')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal4')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal5')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal6')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal7')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal8')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal9')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal10')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal11')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal12')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal13')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal14')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal15')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal16')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal17')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal18')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal19')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal20')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal21')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal22')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal23')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('canal24')
        .setDescription('Nome do canal a criar')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 

    //Checa se é em um servidor
    if (!interaction.guild) {
      return interaction.editReply({ content: '❌ Este comando só pode ser usado em servidores.' });
    }

    //Checa permissão do usuário
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({ content: '❌ Você precisa ser moderador ou maior para usar este comando.' });
    }

    //Checa permissão do bot
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.editReply({ content: '❌ O bot não tem permissão para criar canais.' });
    }

    const category = interaction.options.getChannel('categoria');

    //Reunir todos os nomes de canais fornecidos
    const channelNames = [];
    for (let i = 1; i <= 24; i++) {
      const name = interaction.options.getString(`canal${i}`);
      if (name) channelNames.push(name.trim());
    }

    if (channelNames.length === 0) {
      return interaction.editReply({ content: '❌ Nenhum canal fornecido.' });
    }

    const createdChannels = [];

    //Criar os canais
    for (const name of channelNames) {
      const existing = interaction.guild.channels.cache.find(
        ch => ch.parentId === category.id && ch.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        createdChannels.push(`❌ ${name} (já existe)`);
        continue;
      }

      try {
        await interaction.guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: category.id,
        });
        createdChannels.push(`✅ ${name}`);
      } catch (err) {
        console.error(`Erro ao criar canal "${name}":`, err);
        createdChannels.push(`⚠️ ${name} (erro)`);
      }
    }

    //Resposta final
    return interaction.editReply({
      content: `Resultado da criação de canais em "${category.name}":\n${createdChannels.join('\n')}`
    });
  },
};
