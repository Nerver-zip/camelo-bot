const axios = require("axios");
require('dotenv').config();

async function getUpcomingTournamentsStartgg(videogameId, perPage = 5, daysAhead = 0) {
  const token = process.env.STARTGG_KEY;
  if (!token) {
    console.warn("⚠️ [start.gg] STARTGG_KEY não configurado no ambiente.");
    return [];
  }

  const now = new Date();
  const afterDate = Math.floor(
    new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).getTime() / 1000
  );

  const query = `
    query TournamentsByVideogame($perPage: Int!, $videogameId: ID!, $afterDate: Timestamp!) {
      tournaments(query: {
        perPage: $perPage
        page: 1
        sortBy: "startAt asc"
        filter: {
          upcoming: true
          videogameIds: [$videogameId]
          afterDate: $afterDate
        }
      }) {
        nodes {
          id
          name
          slug
          startAt
          images {
            url
          }
          events(limit: 1) {
            numEntrants
            entrantSizeMax
          }
        }
      }
    }
  `;

  const variables = { perPage, videogameId: String(videogameId), afterDate };

  try {
    const response = await axios.post(
      "https://api.start.gg/gql/alpha",
      { query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      }
    );

    if (response.data?.errors?.length) {
      console.error("❌ [start.gg] Erros retornados pela API GraphQL:", response.data.errors.map(e => e.message).join(", "));
      return [];
    }

    const tournaments = response.data?.data?.tournaments?.nodes || [];

    const formatted = tournaments.map((t) => {
      const event = t.events?.[0] || {};
      const current = event.numEntrants || 0;
      const max = event.entrantSizeMax || 0;

      const d = new Date(t.startAt * 1000);
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();

      return {
        name: t.name,
        url: `https://start.gg/tournament/${t.slug}`,
        participants_raw: max ? `${current}/${max}` : `${current}`,
        participants: current,
        date_raw: `${weekday}, ${month} ${day} ${year}`,
        image_url: t.images?.[0]?.url || null // pega a primeira imagem ou null
      };
    });

    return formatted;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const apiMsg = err.response.data?.message || err.response.statusText || '';
      if (status === 401) {
        console.error(`❌ [start.gg] Erro de autenticação (HTTP 401): ${apiMsg || 'Token expirado ou inválido'}. Verifique STARTGG_KEY.`);
      } else {
        console.error(`❌ [start.gg] Falha na API (HTTP ${status}): ${apiMsg}`);
      }
    } else {
      console.error(`❌ [start.gg] Erro de rede ou requisição: ${err.message}`);
    }
    return [];
  }
}
/*
(async () => {
  try {
    const tournaments = await getUpcomingTournamentsStartgg(936, 10, 0);
    console.log(JSON.stringify(tournaments, null, 2));
  } catch (err) {
    console.error("❌ Erro:", err.message);
  }
})();
*/
module.exports = { getUpcomingTournamentsStartgg };

