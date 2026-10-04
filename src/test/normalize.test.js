const { normalizeName, formatChannelName } = require('../utils/updateTierList.js');

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

describe('formatChannelName', () => {
    it('deve formatar nomes com espaços para padrão kebab-case de canais', () => {
        expect(formatChannelName('Battle Chronicle')).toBe('battle-chronicle');
        expect(formatChannelName('Dark Magician')).toBe('dark-magician');
    });

    it('deve formatar barras e caracteres especiais para hífens', () => {
        expect(formatChannelName('Stardust / Synchron')).toBe('stardust-synchron');
        expect(formatChannelName('Live☆Twin')).toBe('live-twin');
        expect(formatChannelName('Performage & Pals')).toBe('performage-pals');
    });

    it('deve manter invariante de compatibilidade com normalizeName', () => {
        const testCases = [
            'Battle Chronicle',
            'Shaddoll',
            'Borrel',
            'Speedroid',
            'Performage',
            'Sacred Beast',
            'Stardust / Synchron',
            'Red-Eyes',
            'HEROs',
            'Live☆Twin',
            'D/D/D',
            'Sunavalon / Rikka',
            'T.G.',
            'Dark Magician',
            'Blue-Eyes'
        ];

        for (const deck of testCases) {
            const formatted = formatChannelName(deck);
            expect(normalizeName(formatted)).toBe(normalizeName(deck));
        }
    });

    it('deve limitar tamanho do canal a no máximo 100 caracteres', () => {
        const longName = 'A'.repeat(120);
        expect(formatChannelName(longName).length).toBeLessThanOrEqual(100);
    });

    it('deve retornar fallback seguro caso o nome fique vazio', () => {
        expect(formatChannelName('   ')).toBe('novo-deck');
        expect(formatChannelName('!!!')).toBe('novo-deck');
    });
});
