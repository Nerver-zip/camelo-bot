const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const getColors = require('get-image-colors');

const width = 500;
const height = 500;

async function getDominantColor(imagePath) {
  try {
    const colors = await getColors(imagePath);
    if (colors && colors.length) {
      return colors[0].hex();
    }
  } catch (err) {
    console.warn(`Erro ao extrair cor de ${imagePath}: ${err.message}`);
  }
  return null;
}

async function generateChart(deckData) {
  // Soma total original (antes da agregação)
  const totalAmountOriginal = deckData.reduce((sum, deck) => sum + deck.amount, 0);

  // Ordena do maior para o menor
  deckData = deckData.sort((a, b) => b.amount - a.amount);

  // Agrega decks menores para garantir no máximo 10 itens
  if (deckData.length > 10) {
    const sortedAsc = [...deckData].sort((a, b) => a.amount - b.amount);
    
    let sumOthers = 0;
    const others = [];
    
    for (const deck of sortedAsc) {
      const nextSum = sumOthers + deck.amount;
    
      // Se ainda não passou de 30%, continua agregando
      if (nextSum / totalAmountOriginal <= 0.2) {
        sumOthers = nextSum;
        others.push(deck);
      } else {
        // Se passar de 30%, para de agregar
        break;
      }
    }
  
    // Se não agregou ninguém (others vazio), pode agregar o menor deck mesmo assim
    if (others.length === 0 && deckData.length > 10) {
      others.push(sortedAsc[0]);
      sumOthers = sortedAsc[0].amount;
    }
  
    const filteredDecks = deckData.filter(d => !others.includes(d));
  
    filteredDecks.push({ deckName: 'Outros', amount: sumOthers, image: null });
  
    deckData = filteredDecks.sort((a, b) => {
      if (a.deckName === 'Outros') return 1;      // "Outros" sempre depois
      if (b.deckName === 'Outros') return -1;
      return b.amount - a.amount;                   // os demais em ordem decrescente
    });
  }


  // Soma após agregação
  const totalAmount = deckData.reduce((sum, deck) => sum + deck.amount, 0);

  // Cores reservadas para fatias pequenas e decks sem imagem (excluindo 'Outros')
  const reservedSmallColors = [
    '#E63946', // vermelho
    '#1D3557', // azul escuro
    '#2A9D8F', // verde azulado
    '#F4A261', // laranja
    '#264653', // azul acinzentado
  ];

  const images = {};
  const usedColors = new Set();
  const backgroundColorMap = {};

  // Identifica índices de fatias pequenas (<10%)
  const smallSlicesIndexes = deckData
    .map((deck, idx) => ({ idx, percent: deck.amount / totalAmount }))
    .filter(({ percent }) => percent < 0.10)
    .map(({ idx }) => idx);

  let reservedColorIndex = 0;

  for (let i = 0; i < deckData.length; i++) {
    const deck = deckData[i];
    let img = null;
    let color = null;

    if (deck.image) {
      try {
        const imagePath = path.resolve(__dirname, deck.image);
        if (!fs.existsSync(imagePath)) throw new Error(`Imagem não encontrada`);
        img = await loadImage(imagePath);
        color = await getDominantColor(imagePath);
      } catch (err) {
        console.warn(`Erro com imagem de ${deck.deckName}: ${err.message}`);
      }
    }

    images[deck.deckName] = img;

    if (deck.deckName === 'Outros') {
      // "Outros" é sempre cinza escuro
      backgroundColorMap[deck.deckName] = '#444444';
      usedColors.add('#444444');
    } else if (!deck.image) {
      // Deck sem imagem e que não é "Outros" => cor reservada
      let reservedColor = reservedSmallColors[reservedColorIndex % reservedSmallColors.length];
      reservedColorIndex++;
      backgroundColorMap[deck.deckName] = reservedColor;
      usedColors.add(reservedColor);
    } else if (smallSlicesIndexes.includes(i)) {
      // Deck com imagem e fatia pequena => cor reservada
      let reservedColor = reservedSmallColors[reservedColorIndex % reservedSmallColors.length];
      reservedColorIndex++;
      backgroundColorMap[deck.deckName] = reservedColor;
      usedColors.add(reservedColor);
    } else {
      // Deck com imagem e fatia grande => cor dominante ou fallback
      if (color && !usedColors.has(color)) {
        backgroundColorMap[deck.deckName] = color;
        usedColors.add(color);
      } else {
        // fallback para cor aleatória não usada
        let fallbackColor;
        do {
          const hue = Math.floor(Math.random() * 360);
          const saturation = 70 + Math.floor(Math.random() * 30);
          const lightness = 40 + Math.floor(Math.random() * 20);
          fallbackColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } while (usedColors.has(fallbackColor));
        backgroundColorMap[deck.deckName] = fallbackColor;
        usedColors.add(fallbackColor);
      }
    }
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    chartCallback: (ChartJS) => {
      ChartJS.defaults.font.family = 'Arial';
      ChartJS.defaults.font.size = 12;
      ChartJS.defaults.color = 'white'; // fonte branca
    }
  });

  // Labels com porcentagem
  const labels = deckData.map(d => {
    const percent = ((d.amount / totalAmount) * 100).toFixed(2);
    return `${d.deckName} (${percent}%)`;
  });

  const configuration = {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: deckData.map(d => d.amount),
        backgroundColor: deckData.map(d => backgroundColorMap[d.deckName]),
        borderColor: 'white',
        borderWidth: 2,
      }]
    },
    options: {
      layout: { padding: { bottom: 50 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            generateLabels: (chart) => {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: label,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: data.datasets[0].backgroundColor[i],
                lineWidth: 1,
                pointStyle: 'circle',
                fontColor: 'white',
                index: i,
              }));
            },
            usePointStyle: true,
            font: { size: 12, family: 'Arial', color: 'white' },
            padding: 15,
          }
        },
        title: {
          display: true,
          text: 'Recorte atual do meta, apenas torneios',
          font: { family: 'Arial', size: 14, weight: 'bold' },
          color: 'white',
        }
      }
    },
    plugins: [{
    id: 'drawImagesInSlices',
    afterDraw(chart) {
      const { ctx, chartArea: { left, top, right, bottom }, data } = chart;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      const radius = Math.min(right - left, bottom - top) / 2;

      const meta = chart.getDatasetMeta(0);
      const arcs = meta.data;

      // Calcula o diâmetro da imagem baseado na menor fatia >=10%
      const validSlices = arcs
        .map((arc, idx) => {
          const percent = deckData[idx].amount / totalAmount;
          const angle = arc.endAngle - arc.startAngle;
          return percent >= 0.10 ? angle : null;
        })
        .filter(Boolean);

      const minAngle = validSlices.length > 0 ? Math.min(...validSlices) : 0.2;
      const maxImgDiameter = radius * 0.6;
      const imgDiameter = Math.min(minAngle * radius * 0.6, maxImgDiameter);

      arcs.forEach((arc, index) => {
        const label = data.labels[index];
        const deckName = label.split(' (')[0];
        const img = images[deckName];
        const percent = deckData[index].amount / totalAmount;

        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const midRadius = radius * 0.65;
        const centerSliceX = centerX + midRadius * Math.cos(midAngle);
        const centerSliceY = centerY + midRadius * Math.sin(midAngle);

        if (img && percent >= 0.10) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerSliceX, centerSliceY, imgDiameter / 2, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(img, centerSliceX - imgDiameter / 2, centerSliceY - imgDiameter / 2, imgDiameter, imgDiameter);
          ctx.restore();
        } else if (percent >= 0.05) {
        // Só desenha o nome se a fatia tiver pelo menos 5%
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        const maxWidth = radius * 0.6;
        const lines = splitTextIntoLines(deckName, ctx, maxWidth);

        const lineHeight = 14;
        const textHeight = lines.length * lineHeight;
        lines.forEach((line, i) => {
          ctx.fillText(line, centerSliceX, centerSliceY - textHeight / 2 + i * lineHeight + lineHeight / 2);
        });
        ctx.restore();
      }
      });

      // Função para quebrar texto em linhas, respeitando maxWidth
      function splitTextIntoLines(text, ctx, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);
        return lines;
      }
    }
  }]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const outputDir = path.resolve(__dirname, 'public', 'charts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'chart.png');
  fs.writeFileSync(outputPath, imageBuffer);

  console.log(`Gráfico salvo em ${outputPath}`);
  return outputPath;
}

//if (require.main === module) {
//  (async () => {
//    const decks = [
//      { deckName: 'Speedroid', amount: 10, image: 'public/images/Speedroid.png' },
//      { deckName: 'Ancient Gear', amount: 7, image: 'public/images/Ancient_Gear.png' },
//      { deckName: 'Resonators', amount: 7, image: 'public/images/Resonators.png' },
//      { deckName: 'HEROs', amount: 3, image: 'public/images/HEROs.png' },
//      { deckName: 'Geminis', amount: 2, image: 'public/images/Geminis.png' },
//      { deckName: 'Shaddoll', amount: 15, image: 'public/images/Shaddoll.png' },
//      { deckName: 'Deck sem imagem', amount: 1, image: null },
//      { deckName: 'Outro deck sem imagem', amount: 1, image: null },
//      { deckName: 'Mais um deck pequeno', amount: 1, image: null },
//      { deckName: 'Deck pequeno 2', amount: 1, image: null },
//      { deckName: 'Deck pequeno 3', amount: 1, image: null },
//      { deckName: 'Deck pequeno 4', amount: 1, image: null },
//    ];
//    await generateChart(decks);
//  })();
//}

module.exports = { generateChart };
