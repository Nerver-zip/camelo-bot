const { spawn } = require('child_process');
const path = require('path');

async function initLists(){

    const cardScript = path.join(__dirname, 'scrapers/cardScraper.js');
    const skillScript = path.join(__dirname, 'scrapers/skillScraper.js');

    const processCards = spawn('node', [cardScript, '--filter', '--name'], { stdio: 'inherit' });
    const processSkills = spawn('node', [skillScript], { stdio: 'inherit' });

    processCards.on('close', (code) => {
        console.log(`Processo de coleta de cartas finalizou com código ${code}`);
    });

    processSkills.on('close', (code) =>{
        console.log(`Processo de coleta de skills finalizou com código ${code}`)
    });
}

(async () => {
    await initLists();
    console.log('Função initLists foi chamada com sucesso!');
})();

module.exports = { initLists };
