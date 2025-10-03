const { spawn } = require('child_process');
const path = require('path');

async function initAutoSuggestionLists(){

    const cardScript = path.join(__dirname, 'scrapers/cardScraper.js');
    const skillScript = path.join(__dirname, 'scrapers/skillScraper.js');
    const arquetypeScript = path.join(__dirname, 'scrapers/archetypeScraper.js');

    const processCards = spawn('node', [cardScript, '--filter', '--name'], { stdio: 'inherit' });
    const processSkills = spawn('node', [skillScript], { stdio: 'inherit' });
    const processArchetypes = spawn('node', [arquetypeScript], { stdio: 'inherit' });
    
    processCards.on('close', (code) => {
        console.log(`Processo de coleta de cartas finalizou com código ${code}`);
    });

    processSkills.on('close', (code) =>{
        console.log(`Processo de coleta de skills finalizou com código ${code}`)
    });

    processArchetypes.on('close', (code) =>{
        console.log(`Processo de coleta de arquetipos finalizou com código ${code}`)
    });
}

//(async () => {
//    await initAutoSuggestionLists();
//    console.log('Função initLists foi chamada com sucesso!');
//})();

module.exports = { initAutoSuggestionLists };
