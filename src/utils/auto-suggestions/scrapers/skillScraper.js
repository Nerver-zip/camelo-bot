const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function coletarSkills() {
  try {
    console.log("Iniciando coleta de skills...");

    // 1) Buscar sitemap XML
    const sitemapUrl = 'https://www.duellinksmeta.com/sitemap-skills.xml';
    const { data: xml } = await axios.get(sitemapUrl);

    // 2) Carregar XML com cheerio
    const $xml = cheerio.load(xml, { xmlMode: true });

    // 3) Coletar URLs
    const urls = [];
    $xml('url > loc').each((_, el) => {
      urls.push($xml(el).text());
    });

    if (urls.length === 0) {
      console.log('❌ Não foi possível carregar a lista de skills.');
      return;
    }

    // 4) Extrair nomes das skills
    const skillNames = urls.map(u => {
      const lastPart = decodeURIComponent(u.split('/').filter(Boolean).pop() || '');
      return lastPart.replace(/-/g, ' '); // mantêm maiúsculas e minúsculas originais
    });

    // 5) Salvar em skills.txt, uma por linha
    const outputPath = path.join(__dirname, '../dump', 'skills.txt');
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, skillNames.join('\n'), 'utf8');

    console.log(`✅ ${skillNames.length} skills salvas em dump/skills.txt`);
  } catch (err) {
    console.error('❌ Erro ao coletar skills:', err.message);
  }
}

// Executar
coletarSkills();
