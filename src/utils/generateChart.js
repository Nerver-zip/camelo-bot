const axios = require('axios');
const fs = require('fs');
const path = require('path');

const QUICKCHART_URL = 'https://quickchart.io/chart';

// Cores para as fatias (vai repetir se houver mais de 10 decks)
const COLORS = [
  '#E63946', '#1D3557', '#2A9D8F', '#F4A261',
  '#264653', '#8D99AE', '#FFB703', '#6A4C93',
  '#2A9D8F', '#D62828'
];

// Agrega decks menores para garantir máximo 10 fatias
function aggregateDecks(deckData) {
  const totalAmountOriginal = deckData.reduce((sum, deck) => sum + deck.amount, 0);
  deckData = deckData.sort((a, b) => b.amount - a.amount);

  if (deckData.length > 10) {
    const sortedAsc = [...deckData].sort((a, b) => a.amount - b.amount);
    let sumOthers = 0;
    const others = [];

    for (const deck of sortedAsc) {
      const nextSum = sumOthers + deck.amount;
      if (nextSum / totalAmountOriginal <= 0.2) {
        sumOthers = nextSum;
        others.push(deck);
      } else break;
    }

    if (others.length === 0 && deckData.length > 10) {
      others.push(sortedAsc[0]);
      sumOthers = sortedAsc[0].amount;
    }

    const filteredDecks = deckData.filter(d => !others.includes(d));
    filteredDecks.push({ deckName: 'Outros', amount: sumOthers });

    deckData = filteredDecks.sort((a, b) => {
      if (a.deckName === 'Outros') return 1;
      if (b.deckName === 'Outros') return -1;
      return b.amount - a.amount;
    });
  }

  return deckData;
}

async function generateChart(deckData, outputFile = 'chart.png') {
  deckData = aggregateDecks(deckData);
  const totalAmount = deckData.reduce((sum, d) => sum + d.amount, 0);

  // Labels com percentual na legenda
  const labels = deckData.map(d => {
    const percent = ((d.amount / totalAmount) * 100).toFixed(1);
    return `${d.deckName} (${percent}%)`;
  });

  // Dados brutos para o dataset
  const data = deckData.map(d => d.amount);
  const backgroundColor = deckData.map((_, i) => COLORS[i % COLORS.length]);

  const chartConfig = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: 'white',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 12, weight: 'bold' },
            color: 'black'
          }
        },
        datalabels: {
          color: 'black',
          font: { weight: 'bold', size: 12 },
          formatter: (value) => {
            const percent = ((value / totalAmount) * 100).toFixed(1);
            return `${percent}%`; // percentual dentro da fatia
          }
        }
      },
      layout: { padding: 20 },
      responsive: true
    },
    plugins: ['chartjs-plugin-datalabels']
  };

  const outputDir = path.resolve(__dirname, 'public/charts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, outputFile);

  // URL do QuickChart com fundo transparente
  const chartUrl = `${QUICKCHART_URL}?c=${encodeURIComponent(JSON.stringify(chartConfig))}&backgroundColor=transparent&format=png`;

  const response = await axios.get(chartUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, response.data);

  console.log(`✅ Gráfico gerado: ${outputPath}`);
  return outputPath;
}

// Exemplo de uso
/*
async(async () => {
  const decks = [
    { deckName: 'Speedroid', amount: 10 },
    { deckName: 'Ancient Gear', amount: 7 },
    { deckName: 'Resonators', amount: 7 },
    { deckName: 'HEROs', amount: 3 },
    { deckName: 'Geminis', amount: 2 },
    { deckName: 'Shaddoll', amount: 15 },
    { deckName: 'Deck pequeno', amount: 1 },
    { deckName: 'Outro deck pequeno', amount: 1 },
    { deckName: 'Mais um deck pequeno', amount: 1 },
    { deckName: 'Deck mínimo', amount: 1 },
    { deckName: 'Deck extra', amount: 1 },
  ];
  await generateChart(decks);
})();
*/

module.exports = { generateChart };
