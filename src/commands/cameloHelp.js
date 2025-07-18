function isRestrictedChannel(channel) {
  if (!channel.isTextBased()) return false;

  const everyoneRole = channel.guild.roles.everyone;
  const permissions = channel.permissionsFor(everyoneRole);

  return !permissions.has('ViewChannel');
}

module.exports = {
  name: 'cameloHelp',
  async execute(message, _) {

    let reply = `🐫 Comandos 🐪\n\n\n`;

    if (message.member.permissions.has('ManageChannels') && isRestrictedChannel(message.channel)) {
      reply += 
    `Administrativos ⚙️\n\n` +
    `!createChannels <categoria> mermail hero blue-eyes...: cria os canais indicados sob a categoria\n\n` +
    `!moveChannels <categoria> mermail hero blue-eyes: move canais para a categoria referenciada\n\n` +
    `!organizeChannels <categoria>: ordena em ordem alfabética crescente os canais da categoria\n\n`;
    `!getTierList: atualiza a tier list com base no DLM\n\n`;
    }
    
    reply += `Gerais 🌐\n\n` +
    `!skill nome da skill: pega informações da skill\n` + 
    `!build nome do arquetipo: pega a última build do deck no DLM\n` + 
    `!stats nome da carta: pega stats da carta (popularidade, deck mais usados, quantidade mais usada)\n` +
    `!meta: gera um gráfico mostrando os decks mais utilizados no meta atual em torneios\n`;
    
    return message.reply(reply);
  }
};