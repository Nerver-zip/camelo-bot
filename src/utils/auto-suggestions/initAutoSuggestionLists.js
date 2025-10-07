const { spawn } = require('child_process');
const path = require('path');

function runScript(script, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [script, ...args], { stdio: 'inherit' });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${script} finalizou com código ${code}`));
            }
        });

        proc.on('error', reject);
    });
}

async function initAutoSuggestionLists() {
    const cardScript = path.join(__dirname, '../scrapers/cardScraper.js');
    const skillScript = path.join(__dirname, '../scrapers/skillScraper.js');
    const archetypeScript = path.join(__dirname, '../scrapers/archetypeScraper.js');

    // Executar em paralelo
    await Promise.all([
        runScript(cardScript, ['--filter', '--name']),
        runScript(skillScript),
        runScript(archetypeScript)
    ]);

    console.log("Todos os scrapers finalizaram com sucesso!");
}
/*
(async () => {
    await initAutoSuggestionLists();
    console.log('Função initLists foi chamada com sucesso!');
})();*/
module.exports = { initAutoSuggestionLists };
