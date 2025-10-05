const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * DeckController (singleton)
 * --------------------------
 * Mantém um mapa (arquetipo -> últimas 10 URLs) a partir dos sitemaps do DuelLinksMeta.
 * - Processamento global incremental (garante newest-first real)
 * - Cache local do sitemap 0 (xml0_cache.xml)
 * - Normalização de URLs para evitar mismatches por encoding / trailing slash
 * - Usa a última URL processada como referência de atualização (hash posicional)
 */
class DeckController {
  // ======== ESTADO GLOBAL (SINGLETON) ========
  static verbose = true;
  static cachePath = path.join(__dirname, '../local/dump/deck_cache.json');
  static lastUrlPath = path.join(path.dirname(DeckController.cachePath), 'last_url.txt'); // Última URL do último XML processado
  static xmlUrls = [
    'https://www.duellinksmeta.com/sitemap-top-decks-0.xml',
    'https://www.duellinksmeta.com/sitemap-top-decks-1.xml'
  ];
  static updateInterval = 21600000; // 6 horas em ms

  static deckMap = new Map(); // Map(arquetipo -> [url1, url2, ...])
  static lastUrl = null; // Última URL processada (string)
  static knownArchetypes = new Set(); // Arquétipos (lowercase) carregados do arquivo
  static xml0CachePath = path.join(path.dirname(DeckController.cachePath), 'xml0_cache.xml');

  // ---------- Helpers ----------
  static log(...args) {
    if (this.verbose) console.log(...args);
  }
  
  static normalizeUrl(raw) {
    if (!raw) return raw;
    let u = raw.trim();
    // remove trailing slash(es)
    while (u.endsWith('/')) u = u.slice(0, -1);
    try {
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
  static async init({ cachePath, xmlUrls, updateInterval, verbose } = {}) {
    if (cachePath) this.cachePath = cachePath;
    if (xmlUrls && xmlUrls.length > 0) this.xmlUrls = xmlUrls;
    if (updateInterval) this.updateInterval = updateInterval;
    if (typeof verbose === 'boolean') this.verbose = verbose;

    // atualizar paths caso cachePath tenha sido sobrescrito
    this.xml0CachePath = path.join(path.dirname(this.cachePath), 'xml0_cache.xml');
    this.lastUrlPath = path.join(path.dirname(this.cachePath), 'last_url.txt');

    // --- Carrega lastUrl global salvo em disco ---
    if (fs.existsSync(this.lastUrlPath)) {
      const lu = fs.readFileSync(this.lastUrlPath, 'utf8').trim();
      if (lu) this.lastUrl = this.normalizeUrl(lu);
    }

    // Carrega lista de arquétipos (arquivo)
    const archetypePath = path.join(__dirname, '../local/dump/archetypes.txt');
    if (fs.existsSync(archetypePath)) {
      const lines = fs.readFileSync(archetypePath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) this.knownArchetypes.add(line.trim().toLowerCase());
      }
      this.log(`[DeckController] ${this.knownArchetypes.size} arquétipos conhecidos carregados.`);
    } else {
      console.warn('[DeckController] Arquivo de arquétipos não encontrado.');
    }

    await this.loadCache();

    if (this.deckMap.size === 0) {
      this.log('[DeckController] Cache vazio — carregando dados iniciais...');
      await this.forceUpdate();
    } else {
      this.log('[DeckController] Cache carregado da memória local.');
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
        this.log(`[DeckController] Cache carregado: ${this.deckMap.size} arquétipos.`);
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
      this.log('[DeckController] Cache salvo com sucesso.');
    } catch (err) {
      console.error('[DeckController] Erro ao salvar cache local:', err);
    }
  }

  /**
   * Parser de XML mais robusto:
   * - Extrai blocos <url>...</url>, pega <loc> e <lastmod> (quando houver)
   * - Determina o arquétipo com heurísticas (- -> ' ', plural 's')
   * @returns Array<{archetype: string (lowercase), link: string, lastmod: string|null}>
   */
  static parseXml(xml) {
    const results = [];
    if (!xml) return results;

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
        lastmod = lmMatch[1].trim(); // mantém string diretamente
      }

      const parts = link.split('/').filter(Boolean);
      const archetypeSegment = parts.find(p => {
        const normalized = p.replace(/-/g, ' ').toLowerCase();
        if (this.knownArchetypes.has(normalized)) return true;
        if (this.knownArchetypes.has(normalized + 's')) return true;
        return false;
      });

      if (archetypeSegment) {
        const normalized = archetypeSegment.replace(/-/g, ' ').toLowerCase();
        results.push({ archetype: normalized, link, lastmod });
      }
    }

    return results;
  }

  /**
   * Atualiza os dados manualmente, lendo os XMLs remotos e atualizando o Map.
   *
   * Nova revisão:
   * - Usa última URL salva (hash posicional) como ponto de referência.
   * - Itera o XML do mais recente para o mais antigo.
   * - Para ao encontrar a URL anterior.
   * - Salva nova última URL global no disco junto com o cache.
   * - Log reduzido: exibe apenas o total de novos decks adicionados.
   */
  static async forceUpdate() {
    this.log('[DeckController] Iniciando atualização de dados...');

    try {
      let totalAdded = 0;

      for (let i = 0; i < this.xmlUrls.length; i++) {
        const url = this.xmlUrls[i];
        let data;

        // XML 0 cacheado localmente
        if (i === 0 && fs.existsSync(this.xml0CachePath)) {
          this.log(`[DeckController] Usando cache local para XML 0: ${this.xml0CachePath}`);
          data = fs.readFileSync(this.xml0CachePath, 'utf8');
        } else {
          this.log(`[DeckController] Baixando dump XML: ${url}`);
          const response = await axios.get(url, { responseType: 'text' });
          data = response.data;

          if (i === 0) {
            try {
              fs.writeFileSync(this.xml0CachePath, data, 'utf8');
              this.log(`[DeckController] XML 0 salvo no cache local: ${this.xml0CachePath}`);
            } catch (e) {
              console.warn('[DeckController] Falha ao salvar xml0 cache local:', e.message || e);
            }
          }
        }

        const decks = this.parseXml(data);
        if (!decks || decks.length === 0) continue;

        // === NOVO: salva última URL REAL do XML (último item da lista) ===
        const lastUrlFromXML = this.normalizeUrl(decks[decks.length - 1].link);

        let foundOldUrl = false;

        // Itera do mais recente para o mais antigo
        for (let k = 0; k < decks.length; k++) {
          const { archetype, link } = decks[k];
          const normLink = this.normalizeUrl(link);

          if (this.lastUrl && normLink === this.lastUrl) {
            foundOldUrl = true;
            this.log(`[DeckController] Última URL anterior encontrada (${this.lastUrl}). Parando atualização incremental.`);
            break;
          }

          const lower = archetype.toLowerCase();
          const arr = this.deckMap.get(lower) || [];

          if (!arr.includes(normLink)) {
            arr.unshift(normLink);
            if (arr.length > 10) arr.pop();
            this.deckMap.set(lower, arr);
            totalAdded++;
          }
        }

        // === Atualiza marcador global com a última URL real do XML ===
        if (!this.lastUrl || lastUrlFromXML !== this.lastUrl) {
          this.lastUrl = lastUrlFromXML;
          this.log(`[DeckController] Atualizado lastUrl global para ${this.lastUrl}`);
        }

        if (foundOldUrl) break;
      }

      this.saveCache();
      fs.writeFileSync(this.lastUrlPath, this.lastUrl, 'utf8');
      this.log(`[DeckController] lastUrl global salvo em disco: ${this.lastUrlPath}`);

      this.log(`[DeckController] Atualização completa. Novos decks adicionados: ${totalAdded}`);

    } catch (err) {
      console.error('[DeckController] Erro durante atualização:', err);
    }
  }

  /**
   * Inicia o scheduler periódico de atualização (a cada X horas).
   */
  static startScheduler() {
    this.log(`[DeckController] Scheduler iniciado (atualiza a cada ${this.updateInterval / 3600000}h).`);
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

module.exports = { DeckController };
