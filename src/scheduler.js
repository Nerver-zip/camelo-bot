const path = require("path");
const fs = require("fs");

const { generateChart } = require('./utils/generateChart');
const { fetchMetaStats } = require('./utils/fetchMetaStats');
const { initAutoSuggestionLists } = require('./utils/auto-suggestions/initAutoSuggestionLists.js');
const { initServers } = require('./utils/auto-suggestions/suggestionServers.js');
const { getUpcomingTournamentsTonamel } = require('./utils/scrapers/tonamel.js');
const { getUpcomingTournamentsStartgg } = require('./utils/scrapers/startgg.js');
const { Matcher } = require('./utils/fuzzyfind/Matcher.js');
const { updateTierList } = require('./utils/updateTierList.js');

async function scheduleChartUpdate() {
  try {
    console.log('🔄 Gerando gráfico do meta game...');
    const decks = await fetchMetaStats();
    await generateChart(decks); // gera e salva em local/charts
    console.log('✅ Gráfico atualizado.');
  } catch (err) {
    console.error('❌ Erro ao gerar gráfico:', err);
  }

  // Agenda a próxima execução daqui 12h
  setTimeout(scheduleChartUpdate, 12 * 60 * 60 * 1000);
}

async function scheduleLocalFilesUpdate() {
    try {
        await initAutoSuggestionLists();
        await initServers();
    } catch (err) {
        console.error("Erro na atualização diária:", err);
    } finally {
        setTimeout(scheduleLocalFilesUpdate, 12 * 60 * 60 * 1000);
    }
}

async function scheduleTournamentUpdate() {
  try {
    console.log("🔄 Atualizando torneios...");

    // Pega torneios Tonamel e Start.gg
    const [tonamel, startgg] = await Promise.all([
      getUpcomingTournamentsTonamel(),
      getUpcomingTournamentsStartgg(936, 50) // 936 = Yu-Gi-Oh Duel Links ID
    ]);

    const allTournaments = [...tonamel, ...startgg];

    // Filtro: apenas entre hoje e +7 dias
    const today = new Date();
    const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const filtered = allTournaments.filter(t => {
      if (!t.date_raw) return false;
      const d = new Date(t.date_raw);
      return d >= today && d <= inSevenDays;
    });

    const filePath = path.join(__dirname, "./local/dump/upcomingTournaments.json");

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf8");

    console.log(`✅ Torneios atualizados. Total: ${filtered.length}. Salvos em ${filePath}`);
  } catch (err) {
    console.error("❌ Erro ao atualizar torneios:", err);
  } finally {
    // Reagenda em 1h
    setTimeout(scheduleTournamentUpdate, 1 * 60 * 60 * 1000);
  }
}

function scheduleMatcherUpdate(){
    try {
        Matcher.reload();
        Matcher.init();
    } catch (err) {
        console.error("Erro ao atualizar Matcher:", err);
    } finally {
        setTimeout(scheduleMatcherUpdate, 12 * 60 * 60 * 1000);
    }
}

async function scheduleTierListUpdate(client) {
    if (!client) {
        console.error("❌ scheduleTierListUpdate chamado sem client.");
        return;
    }

    try {
        console.log("🔄 Iniciando atualização automática da Tier List...");
        
        // Pega IDs do env, suporta múltiplos com ;
        const guildIds = (process.env.GUILD_ID || "").split(';').map(id => id.trim()).filter(id => id.length > 0);
        
        if (guildIds.length === 0) {
            console.warn("⚠️ GUILD_ID não configurado. Pule a atualização da Tier List.");
        } else {
             for (const guildId of guildIds) {
                let guild = client.guilds.cache.get(guildId);
                
                if (!guild) {
                    try {
                        guild = await client.guilds.fetch(guildId);
                    } catch (err) {
                        console.error(`Falha ao buscar guilda ${guildId}:`, err.message);
                        continue;
                    }
                }
                
                if (guild) {
                    await updateTierList(guild);
                }
             }
        }
        console.log("✅ Atualização automática da Tier List concluída.");

    } catch (err) {
        console.error("❌ Erro na atualização da Tier List:", err);
    } finally {
        // Reagenda em 3h
        setTimeout(() => scheduleTierListUpdate(client), 3 * 60 * 60 * 1000);
    }
}

/*
(async () => {
    scheduleTournamentUpdate();
})();
*/
module.exports = { scheduleChartUpdate, scheduleLocalFilesUpdate, scheduleTournamentUpdate, scheduleMatcherUpdate, scheduleTierListUpdate };
