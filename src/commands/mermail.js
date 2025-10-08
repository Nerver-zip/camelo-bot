//----- Piada interna do servidor xD

const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mermail')
    .setDescription('Só... Mermail...'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const jokesPath = path.resolve(__dirname, '../local/dump/mermail.txt');

      if (!fs.existsSync(jokesPath)) {
        throw new Error('Arquivo de piadas não encontrado.');
      }

      const jokes = fs.readFileSync(jokesPath, 'utf-8')
        .split('\n')
        .filter(line => line.trim().length > 0);

      if (jokes.length === 0) {
        throw new Error('Arquivo de piadas está vazio.');
      }

      let joke = jokes[Math.floor(Math.random() * jokes.length)];

      joke = joke.replace(/"(.*?)"/g, '**_$1_**').replace(/“(.*?)”/g, '**_$1_**');

      return interaction.editReply(joke);

    } catch (error) {
      console.error('Erro no comando mermail:', error.message || error);

      try {
        await interaction.deleteReply();
      } catch {}

      return interaction.followUp({
        content: '❌ Erro ao executar comando. Tente novamente mais tarde.',
        ephemeral: true
      });
    }
  }
};

