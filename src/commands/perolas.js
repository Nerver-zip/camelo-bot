const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perolas")
    .setDescription("Mostra uma pérola ou meme aleatório da comunidade 🤣"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: "meme_repo",
        max_results: 100,
      });

      const memes = result.resources;
      if (!memes || memes.length === 0) {
        await interaction.deleteReply();
        return interaction.followUp({
          content: "❌ Erro, conteúdo não encontrado",
          ephemeral: true,
        });
      }

      const randomMeme = memes[Math.floor(Math.random() * memes.length)];

      const embed = new EmbedBuilder()
        .setImage(randomMeme.secure_url)
        .setColor("#FFD700")

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[MemeCommand] Erro ao buscar meme:", error.message || error);
      await interaction.deleteReply();
      return interaction.followUp({
        content: "❌ Erro ao buscar conteúdo. Tente novamente mais tarde.",
        ephemeral: true,
      });
    }
  },
};
