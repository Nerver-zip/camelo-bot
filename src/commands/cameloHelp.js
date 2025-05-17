module.exports = {
  name: 'cameloHelp',
  async execute(message, _) {

    let reply = `🐫 Comandos 🐪\n\n\n`;

    if (message.member.permissions.has('ManageChannels')) {
      reply += 
    `Administrativos ⚙️\n\n` +
    `!createChannels <categoria> <mermail> <hero> <blue-eyes>: cria os canais indicados sob a categoria\n\n` +
    `!moveChannels <categoria> <mermail> <hero> <blue-eyes>: move canais para a categoria referenciada\n\n` +
    `!organizeChannels <categoria>: ordena em ordem alfabética crescente os canais da categoria\n\n` +
    `!getTierList <>: atualiza a tier list com base no DLM`;
    }   
    return message.reply(reply);
  }
};