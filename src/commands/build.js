const {fetchTopDeckUrl} = require("../utils/fetchTopDeckUrl.js");

module.exports = {
  name: 'build',
  async execute(message, _) {
    console.log('Comando !build foi acionado');
    const match = message.content.match(/^!build\s+(.+)$/i);
    if (!match) {
      return message.reply('Uso correto: `!build Nome do Arquetipo`');
    }
    const archetype = match[1];
    try {
        const url = await fetchTopDeckUrl(archetype);
        if (url) {
            return message.reply(url);
        }
        else
        return message.reply('❌ Não foi possível encontrar um deck para esse arquétipo, atenção a escrita ou plural!');

    }   catch (error) {
        console.error(error);
        return message.reply('❌ Erro ao buscar o deck. Tente novamente mais tarde.');
    }
  }
};