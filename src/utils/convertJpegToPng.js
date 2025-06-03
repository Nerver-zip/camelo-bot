const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertJpegToPng(jpegPath, outputDir) {
  try {
    if (!fs.existsSync(jpegPath)) {
      throw new Error(`Arquivo não encontrado: ${jpegPath}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileBuffer = await fs.promises.readFile(jpegPath); // <-- Lê em memória
    const fileNameWithoutExt = path.basename(jpegPath, path.extname(jpegPath));
    const pngPath = path.join(outputDir, `${fileNameWithoutExt}.png`);

    await sharp(fileBuffer)
      .png()
      .toFile(pngPath);

    console.log(`✅ Convertido para PNG: ${pngPath}`);
    return pngPath;
  } catch (error) {
    console.error('Erro ao converter JPEG para PNG:', error.message);
    throw error;
  }
}

module.exports = { convertJpegToPng };
