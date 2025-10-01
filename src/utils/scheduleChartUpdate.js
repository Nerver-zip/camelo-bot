const { generateChart } = require('./generateChart');
const { fetchMetaStats } = require('./fetchMetaStats');

async function scheduleChartUpdate() {
  try {
    console.log('🔄 Gerando gráfico...');
    const decks = await fetchMetaStats();
    await generateChart(decks); // gera e salva em public/charts
    console.log('✅ Gráfico atualizado.');
  } catch (err) {
    console.error('❌ Erro ao gerar gráfico:', err);
  }

  // Agenda a próxima execução daqui 24h
  setTimeout(scheduleChartUpdate, 24 * 60 * 60 * 1000);
}

module.exports = { scheduleChartUpdate };
