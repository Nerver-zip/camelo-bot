const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move-channels')
    .setDescription('Move canais para a categoria especificada.')
    .addChannelOption(option =>
      option.setName('categoria')
        .setDescription('Categoria destino')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .addChannelOption(option =>
      option.setName('canal1')
        .setDescription('Canal a ser movido')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal2')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal3')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal4')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal5')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal6')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal7')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal8')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal9')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal10')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal11')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal12')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal13')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal14')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal15')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal16')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal17')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal18')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal19')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal20')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal21')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal22')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal23')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .addChannelOption(option =>
      option.setName('canal24')
        .setDescription('Canal a ser movido')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral : true });

        if (!interaction.guild) {
          return interaction.editReply({ content: '❌ Este comando só pode ser usado em servidores.' });
        }

        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.editReply({ content: '❌ Você precisa ser moderador ou maior para usar este comando.' });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.editReply({ content: '❌ O bot não tem permissão para mover canais.' });
        }

        const category = interaction.options.getChannel('categoria');

        const channelOptions = [];
        for (let i = 1; i <= 24; i++) {
          const ch = interaction.options.getChannel(`canal${i}`);
          if (ch) channelOptions.push(ch);
        }

        if (channelOptions.length === 0) {
          return interaction.editReply({ content: '❌ Nenhum canal selecionado.' });
        }

        const moved = [];
        const notMoved = [];

        const currentChildren = category.children.cache.filter(c =>
          [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(c.type)
        );
        const availableSlots = 50 - currentChildren.size;

        if (channelOptions.length > availableSlots) {
          return interaction.editReply({
            content: `❌ A categoria "${category.name}" já possui ${currentChildren.size} canais.\n` +
                     `Ela pode conter no máximo 50 canais.\n` +
                     `Você tentou mover ${channelOptions.length}, mas só há espaço para ${availableSlots}.`
          });
        }

        for (const channel of channelOptions) {
          try {
            await channel.setParent(category.id);
            moved.push(channel.name);
          } catch (err) {
            console.error(`Erro ao mover canal ${channel.name}:`, err);
            notMoved.push(channel.name);
          }
        }

        let reply = `✅ Canais movidos para **${category.name}**: ${moved.join(', ') || 'nenhum'}`;
        if (notMoved.length > 0) {
          reply += `\n⚠️ Canais não encontrados ou com erro: ${notMoved.join(', ')}`;
        }

        return interaction.editReply({ content: reply });
    },
};
