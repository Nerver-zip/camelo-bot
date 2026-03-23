// Função de normalização (copiada para o teste, ou poderíamos exportar de um util)
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/s$/, '');
}

describe('normalizeName', () => {
    it('deve normalizar Red-Eyes corretamente', () => {
        expect(normalizeName('Red-Eyes')).toBe('redeye');
        expect(normalizeName('red-eyes-')).toBe('redeye');
        expect(normalizeName('Red Eyes')).toBe('redeye');
    });

    it('deve normalizar plurais como HEROs', () => {
        expect(normalizeName('HEROs')).toBe('hero');
        expect(normalizeName('Harpies')).toBe('harpie');
    });

    it('deve remover caracteres especiais e manter o resultado limpo', () => {
        expect(normalizeName('Red-Eyes🔥')).toBe('redeye');
        expect(normalizeName('!!Blue-Eyes!!')).toBe('blueeye');
    });

    it('não deve quebrar nomes que já estão no singular ou sem especiais', () => {
        expect(normalizeName('Dark Magician')).toBe('darkmagician');
        expect(normalizeName('Exodia')).toBe('exodia');
    });

    it('deve normalizar nomes de categorias para comparação se necessário', () => {
        expect(normalizeName('Outros decks 10')).toBe('outrosdecks10');
    });
});
 
