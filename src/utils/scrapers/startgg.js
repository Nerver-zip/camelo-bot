const axios = require("axios");
require('dotenv').config();

async function getUpcomingTournamentsStartgg(videogameId, perPage = 5, daysAhead = 0) {
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

  const response = await axios.post(
    "https://api.start.gg/gql/alpha",
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STARTGG_KEY}`,
      },
    }
  );

  const tournaments = response.data.data.tournaments.nodes;

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

