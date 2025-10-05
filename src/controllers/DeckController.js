const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * DeckController (singleton)
 * --------------------------
 * Mantém um mapa (arquetipo -> últimas 10 URLs) a partir dos sitemaps do DuelLinksMeta.
 * - Processamento global por lastmod (garante newest-first real)
 * - Cache local do sitemap 0 (xml0_cache.xml)
 * - Normalização de URLs para evitar mismatches por encoding / trailing slash
 */
class DeckController {
  // ======== ESTADO GLOBAL (SINGLETON) ========
  static cachePath = path.join(__dirname, '../local/dump/deck_cache.json');
  static xmlUrls = [
    'https://www.duellinksmeta.com/sitemap-top-decks-0.xml',
    'https://www.duellinksmeta.com/sitemap-top-decks-1.xml'
  ];
  static updateInterval = 12 * 60 * 60 * 1000; // 12h em ms

  static deckMap = new Map();       // Map(arquetipo -> [url1, url2, ...])
  static lastUpdated = null;        // Timestamp da última atualização
  static seenUrls = new Set();      // URLs normalizadas já vistas
  static knownArchetypes = new Set(); // Arquétipos (lowercase) carregados do arquivo
  static xml0CachePath = path.join(path.dirname(DeckController.cachePath), 'xml0_cache.xml');

  // ---------- Helpers ----------
  static normalizeUrl(raw) {
    if (!raw) return raw;
    let u = raw.trim();
    // remove trailing slash(es)
    while (u.endsWith('/')) u = u.slice(0, -1);
    try {
      // tenta decodificar percent-encoding para normalizar (não obrigatório)
      u = decodeURIComponent(u);
    } catch (e) {
      // ignora se inválido
    }
    return u;
  }

  /**
   * Inicialização do singleton:
   * - Pode receber overrides: { cachePath, xmlUrls, updateInterval }
   */
  static async init({ cachePath, xmlUrls, updateInterval } = {}) {
    if (cachePath) this.cachePath = cachePath;
    if (xmlUrls && xmlUrls.length > 0) this.xmlUrls = xmlUrls;
    if (updateInterval) this.updateInterval = updateInterval;

    // atualizar xml0CachePath caso cachePath tenha sido sobrescrito
    this.xml0CachePath = path.join(path.dirname(this.cachePath), 'xml0_cache.xml');

    // Carrega lista de arquétipos (arquivo)
    const archetypePath = path.join(__dirname, '../local/dump/archetypes.txt');
    if (fs.existsSync(archetypePath)) {
      const lines = fs.readFileSync(archetypePath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) this.knownArchetypes.add(line.trim().toLowerCase());
      }
      console.log(`[DeckController] ${this.knownArchetypes.size} arquétipos conhecidos carregados.`);
    } else {
      console.warn('[DeckController] Arquivo de arquétipos não encontrado.');
    }

    await this.loadCache();

    if (this.deckMap.size === 0) {
      console.log('[DeckController] Cache vazio — carregando dados iniciais...');
      await this.forceUpdate();
    } else {
      console.log('[DeckController] Cache carregado da memória local.');
    }

    this.startScheduler();
  }

  /**
   * Lê o cache local (arquivo JSON) e reconstrói o Map.
   * Também inicializa seenUrls com URLs normalizadas.
   */
  static async loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf8');
        const data = JSON.parse(raw);
        this.deckMap = new Map(data.map(([key, value]) => [key, value]));
        console.log(`[DeckController] Cache carregado: ${this.deckMap.size} arquétipos.`);

        // Inicializa seenUrls com URLs já no cache (normalizadas)
        for (const urls of this.deckMap.values()) {
          urls.forEach(url => this.seenUrls.add(this.normalizeUrl(url)));
        }
      }
    } catch (err) {
      console.error('[DeckController] Erro ao carregar cache local:', err);
    }
  }

  /**
   * Salva o conteúdo atual do Map no cache local (como JSON).
   */
  static saveCache() {
    try {
      const serialized = JSON.stringify(Array.from(this.deckMap.entries()), null, 2);
      fs.writeFileSync(this.cachePath, serialized, 'utf8');
      console.log('[DeckController] Cache salvo com sucesso.');
    } catch (err) {
      console.error('[DeckController] Erro ao salvar cache local:', err);
    }
  }

  /**
   * Parser de XML mais robusto:
   * - Extrai blocos <url>...</url>, pega <loc> e <lastmod> (quando houver)
   * - Determina o arquétipo com heurísticas (- -> ' ', plural 's')
   * @returns Array<{archetype: string (lowercase), link: string, lastmod: number|null}>
   */
  static parseXml(xml) {
    const results = [];
    if (!xml) return results;

    // Itera blocos <url>...</url>
    const urlBlockRE = /<url\b[^>]*>([\s\S]*?)<\/url>/g;
    let blockMatch;
    while ((blockMatch = urlBlockRE.exec(xml)) !== null) {
      const block = blockMatch[1];

      const locMatch = /<loc>(.*?)<\/loc>/i.exec(block);
      if (!locMatch) continue;
      const link = locMatch[1].trim();

      const lmMatch = /<lastmod>(.*?)<\/lastmod>/i.exec(block);
      let lastmod = null;
      if (lmMatch && lmMatch[1]) {
        const d = new Date(lmMatch[1].trim());
        if (!isNaN(d)) lastmod = d.getTime();
      }

      // identifica o archetype pela primeira parte que bater com knownArchetypes
      const parts = link.split('/').filter(Boolean);

      const archetypeSegment = parts.find(p => {
        const normalized = p.replace(/-/g, ' ').toLowerCase();

        if (this.knownArchetypes.has(normalized)) return true;

        // tenta plural simples
        if (this.knownArchetypes.has(normalized + 's')) return true;

        return false;
      });

      if (archetypeSegment) {
        const normalized = archetypeSegment.replace(/-/g, ' ').toLowerCase();
        // guardamos archetype em lowercase — consistente com getDecklists(archetype.toLowerCase())
        results.push({ archetype: normalized, link, lastmod });
      }
    }

    return results;
  }

  /**
   * Atualiza os dados manualmente, lendo os XMLs remotos e atualizando o Map.
   *
   * Estratégia:
   *  - Lê todos os XMLs (usa cache local para xml0).
   *  - Junta todos os <url> encontrados, ordena por lastmod.
   *  - Processa globalmente do mais recente para o mais antigo.
   *  - Se encontrar uma URL já vista (seenUrls), interrompe (restantes são antigos).
   *  - Para cada archetype, pula se já tiver 10 itens.
   */
  static async forceUpdate() {
    console.log('[DeckController] Iniciando atualização de dados...');

    try {
      const combined = []; // todos os {archetype, link, lastmod}

      // carrega cada sitemap (xmlUrls). 0.xml é cacheado localmente
      for (let i = 0; i < this.xmlUrls.length; i++) {
        const url = this.xmlUrls[i];
        let data;

        if (i === 0 && fs.existsSync(this.xml0CachePath)) {
          console.log(`[DeckController] Usando cache local para XML 0: ${this.xml0CachePath}`);
          data = fs.readFileSync(this.xml0CachePath, 'utf8');
        } else {
          console.log(`[DeckController] Baixando dump XML: ${url}`);
          const response = await axios.get(url, { responseType: 'text' });
          data = response.data;

          if (i === 0) {
            try {
              fs.writeFileSync(this.xml0CachePath, data, 'utf8');
              console.log(`[DeckController] XML 0 salvo no cache local: ${this.xml0CachePath}`);
            } catch (e) {
              console.warn('[DeckController] Falha ao salvar xml0 cache local:', e.message || e);
            }
          }
        }

        // parse e concatena
        const parsed = this.parseXml(data);
        if (parsed && parsed.length) combined.push(...parsed);
      }

      if (combined.length === 0) {
        console.log('[DeckController] Nenhum URL encontrado nos XMLs.');
        return;
      }

      // Ordena por lastmod asc (antigo -> novo). null lastmod fica no início.
      combined.sort((a, b) => {
        const ta = a.lastmod || 0;
        const tb = b.lastmod || 0;
        return ta - tb;
      });

      // Processa do mais recente para o mais antigo
      for (let k = combined.length - 1; k >= 0; k--) {
        const { archetype, link } = combined[k];
        const normalizedLink = this.normalizeUrl(link);

        // Se já vimos a URL (normalizada), podemos parar — o resto será mais antigo.
        if (this.seenUrls.has(normalizedLink)) {
          console.log('[DeckController] Encontrado link já visto, finalizando atualização incremental.');
          break;
        }

        // Se o archetype já tem 10 builds, não inserimos mais para ele (pula)
        const lower = archetype.toLowerCase();
        if (this.deckMap.has(lower) && this.deckMap.get(lower).length >= 10) {
          // não marca como visto (pois não processamos essa link para armazenamento),
          // apenas pula e continua
          continue;
        }

        // Marca como vista (normalize)
        this.seenUrls.add(normalizedLink);

        if (!this.deckMap.has(lower)) this.deckMap.set(lower, []);
        const arr = this.deckMap.get(lower);
        arr.push(link);
        if (arr.length > 10) arr.shift();
      }

      this.lastUpdated = new Date();
      this.saveCache();
      console.log('[DeckController] Atualização completa.');

    } catch (err) {
      console.error('[DeckController] Erro durante atualização:', err);
    }
  }

  /**
   * Inicia o scheduler periódico de atualização (a cada X horas).
   */
  static startScheduler() {
    console.log(`[DeckController] Scheduler iniciado (atualiza a cada ${this.updateInterval / 3600000}h).`);
    setInterval(() => this.forceUpdate(), this.updateInterval);
  }

  /**
   * Retorna as URLs associadas a um arquétipo específico.
   * @param {string} archetype - Nome do deck/arquetipo (case-insensitive)
   * @returns {string[]} Lista de URLs das últimas builds conhecidas.
   */
  static getDecklists(archetype) {
    if (!archetype) return [];
    return this.deckMap.get(archetype.toLowerCase()) || [];
  }
}
/*
(async () => {
  await DeckController.init();

  const decks = DeckController.getDecklists('Blue Eyes');
  console.log(decks);
})();
*/
module.exports = { DeckController };
