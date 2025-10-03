const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

class Matcher {
  // Campos estáticos para singleton
  static _initialized = false;
  static _cardList = [];
  static _skillList = [];
  static _archetypeList = [];

  static _cardLower = [];
  static _skillLower = [];
  static _archetypeLower = [];

  static _cardMap = new Map();
  static _skillMap = new Map();
  static _archetypeMap = new Map();

  // Inicialização lazy, resolve caminhos, lê listas e as pré-processa
  static init() {
    if (this._initialized) 
        return;

    // Caminhos dos arquivos locais
    const cardFile = path.join(__dirname, "../dump/cards.txt");
    const skillFile = path.join(__dirname, "../dump/skills.txt");
    const archetypeFile = path.join(__dirname, "../dump/archetypes.txt");

    // Lê listas
    this._cardList = this._readFile(cardFile);
    this._skillList = this._readFile(skillFile);
    this._archetypeList = this._readFile(archetypeFile);

    // Pré-processa listas
    this._processList(this._cardList, this._cardLower, this._cardMap);
    this._processList(this._skillList, this._skillLower, this._skillMap);
    this._processList(this._archetypeList, this._archetypeLower, this._archetypeMap);

    this._initialized = true;
  }

  // ---------- métodos privados ----------

  static _readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8')
             .split(/\r?\n/)
             .filter(Boolean);
  }

  static _processList(list, lowerArr, map) {
    list.forEach(archetype => {
      const lower = archetype.toLowerCase();
      lowerArr.push(lower);
      map.set(lower, archetype);
    });
  }

  static _fuzzyMatch(query, lowerArr, map, threshold = 0.4) {
    if (!query || lowerArr.length === 0) 
        return null;
    const { bestMatch } = stringSimilarity.findBestMatch(query.toLowerCase(), lowerArr);
    if (bestMatch.rating < threshold) 
        return null;
    return map.get(bestMatch.target);
  }

  static _fuzzyTop(query, lowerArr, map, n = 5, threshold = 0.4) {
    if (!query || lowerArr.length === 0) 
        return [];
    const { ratings } = stringSimilarity.findBestMatch(query.toLowerCase(), lowerArr);
    return ratings
      .filter(r => r.rating >= threshold)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, n)
      .map(r => map.get(r.target));
  }

  // ---------- métodos públicos ----------
    
  //------------BEST SEARCH-----------------
  
  static card(query) {
    this.init();
    return this._fuzzyMatch(query, this._cardLower, this._cardMap);
  }

  static skill(query) {
    this.init();
    return this._fuzzyMatch(query, this._skillLower, this._skillMap);
  }

  static archetype(query) {
    this.init();
    return this._fuzzyMatch(query, this._archetypeLower, this._archetypeMap);
  }
  
  //-----------TOP SEARCHES----------------

  static cardTop(query, n = 5) {
    this.init();
    return this._fuzzyTop(query, this._cardLower, this._cardMap, n);
  }

  static skillTop(query, n = 5) {
    this.init();
    return this._fuzzyTop(query, this._skillLower, this._skillMap, n);
  }

  static archetypeTop(query, n = 5) {
    this.init();
    return this._fuzzyTop(query, this._archetypeLower, this._archetypeMap, n);
  }
}

module.exports = { Matcher };
