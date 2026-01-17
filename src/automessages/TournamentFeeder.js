const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TournamentFeeder {
    // ========================================== 
    // CONFIGURAÇÕES
    // ========================================== 
    static verbose = true;
    static checkInterval = 60 * 1000; // 1 minuto
    
    // Configuração dos Feeds
    static feedConfig = [
        {
            filename: 'quantum_dailies.json',
            channelEnv: 'TOURNAMENTS_CHANNEL_ID'
        },
        {
            filename: 'tournaments.json',
            channelEnv: 'TOURNAMENTS_CHANNEL_ID'
        }
    ];

    // ------------------------------------------
    // FILTROS E SANITIZAÇÃO
    // ------------------------------------------
    
    // Tokens que serão REMOVIDOS da mensagem antes de enviar
    static blockedTokens = [
        '@everyone',
        '@here'
    ];

    // Palavras-chave que devem aparecer
    // A mensagem deve conter pelo menos UMA dessas para ser enviada.
    static requiredKeywords = [
         'Tournament',
         'League',
         'Prize',
         'start.gg',
         'tonamel',
         'tourney',
         'clan war',
         'challonge'
    ];

    // ========================================== 
    // CAMINHOS
    // ========================================== 
    static dumpDir = path.join(__dirname, '../local/dump'); 
    static mirrorDir = path.join(__dirname, 'mirrors');
    static historyPath = path.join(__dirname, 'mirrors', 'tournament_history.json');

    // Estado Interno
    static client = null;
    static history = {};
    static isProcessing = false; 

    static log(...args) {
        if (this.verbose) console.log('[TournamentFeeder]', ...args);
    }

    static async init(discordClient) {
        this.client = discordClient;

        if (!fs.existsSync(this.mirrorDir)) {
            fs.mkdirSync(this.mirrorDir, { recursive: true });
        }

        this.loadHistory();
        this.log('Iniciado. Monitorando múltiplos feeds de torneios...');

        this.checkFeeds();
        setInterval(() => this.checkFeeds(), this.checkInterval);
    }

    static loadHistory() {
        try {
            if (fs.existsSync(this.historyPath)) {
                this.history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
            }
        } catch (err) {
            console.error('[TournamentFeeder] Erro ao carregar histórico:', err);
        }
    }

    static saveHistory() {
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
        } catch (err) {
            console.error('[TournamentFeeder] Erro ao salvar histórico:', err);
        }
    }

    // Hash é gerado sobre o conteúdo RAW (Original), garantindo integridade
    static generateHash(msg) {
        const content = msg.content || '';
        const attachments = JSON.stringify(msg.attachments || []);
        const raw = content + attachments;
        return crypto.createHash('md5').update(raw).digest('hex');
    }

    // Verifica se a mensagem deve ser processada baseada nas Keywords
    static isValidMessage(msg) {
        // Se a lista estiver vazia, aceita tudo
        if (!this.requiredKeywords || this.requiredKeywords.length === 0) return true;

        const content = (msg.content || '').toLowerCase();
        
        // Verifica se contém Pelo Menos Uma das palavras chave
        return this.requiredKeywords.some(keyword => content.includes(keyword.toLowerCase()));
    }

    // Remove tokens proibidos para o envio
    static sanitizeContent(content) {
        if (!content) return '';
        let clean = content;
        
        for (const token of this.blockedTokens) {
            clean = clean.split(token).join('');
        }
        
        // Remove espaços duplos/múltiplos que sobraram e faz trim nas pontas
        return clean.replace(/\s+/g, ' ').trim();
    }

    static async checkFeeds() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            for (const config of this.feedConfig) {
                await this.processFeed(config);
            }
        } catch (err) {
            console.error('[TournamentFeeder] Erro crítico no loop principal:', err);
        } finally {
            this.isProcessing = false;
        }
    }

    static async processFeed(config) {
        const sourcePath = path.join(this.dumpDir, config.filename);
        const targetChannelId = process.env[config.channelEnv];

        if (!targetChannelId) return;
        if (!fs.existsSync(sourcePath)) return;

        let feedData;
        try {
            const raw = fs.readFileSync(sourcePath, 'utf8');
            feedData = JSON.parse(raw);
        } catch (err) {
            console.error(`[TournamentFeeder] Erro leitura JSON (${config.filename}):`, err.message);
            return;
        }

        if (!Array.isArray(feedData) || feedData.length === 0) return;

        const channel = await this.client.channels.fetch(targetChannelId).catch(() => null);
        if (!channel) {
            console.error(`[TournamentFeeder] Canal não encontrado: ${targetChannelId}`);
            return;
        }

        const newMessages = [];
        const editedMessages = [];
        let historyChanged = false;

        for (const msg of feedData) {
            const msgId = msg.id;
            const currentHash = this.generateHash(msg);
            const isTarget = this.isValidMessage(msg);
            
            // 1. Mensagem Nova (Não está no histórico)
            if (!this.history[msgId]) {
                if (isTarget) {
                    newMessages.push(msg);
                } else {
                    // Salva como "Skipped" (bot_message_id: null) para não processar de novo
                    this.history[msgId] = {
                        bot_message_id: null,
                        content_hash: currentHash,
                        timestamp: Date.now()
                    };
                    historyChanged = true;
                }
            } 
            // 2. Mensagem Já Existe (Checar edição)
            else {
                if (this.history[msgId].content_hash !== currentHash) {
                    // Se o conteúdo mudou, verificamos se agora ela é válida
                    if (isTarget) {
                        editedMessages.push(msg);
                    } else {
                        // Se editou mas continua inválida (ou ficou inválida), só atualiza o hash
                        this.history[msgId].content_hash = currentHash;
                        this.history[msgId].timestamp = Date.now();
                        historyChanged = true;
                    }
                }
            }
        }

        if (newMessages.length > 0) {
            this.log(`[${config.filename}] ${newMessages.length} mensagens para envio.`);
            await this.sendBatch(channel, newMessages);
        }
        
        if (editedMessages.length > 0) {
            for (const msg of editedMessages) await this.processEdit(channel, msg);
        }

        if (historyChanged) this.saveHistory();
    }

    static async sendBatch(channel, messages) {
        for (const msg of messages) {
            await new Promise(r => setTimeout(r, 1000));
            
            try {
                const payload = this.buildPayload(msg);
                const sentMsg = await channel.send(payload);

                this.history[msg.id] = {
                    bot_message_id: sentMsg.id,
                    content_hash: this.generateHash(msg),
                    original_channel_id: channel.id,
                    timestamp: Date.now()
                };
            } catch (err) {
                console.error(`[TournamentFeeder] Falha ao enviar msg ${msg.id}:`, err);
            }
        }
        this.saveHistory();
    }

    static async processEdit(channel, msg) {
        const stored = this.history[msg.id];
        if (!stored) return;

        if (!stored.bot_message_id) {
            this.log(`Mensagem ${msg.id} era ignorada, mas agora é válida. Enviando...`);
            await this.sendBatch(channel, [msg]);
            return;
        }
        
        try {
            const messageToEdit = await channel.messages.fetch(stored.bot_message_id);
            if (messageToEdit) {
                const payload = this.buildPayload(msg);
                await messageToEdit.edit(payload);
                
                stored.content_hash = this.generateHash(msg);
                stored.timestamp = Date.now();
                this.saveHistory();
                this.log(`Mensagem editada: ${msg.id}`);
            }
        } catch (err) {
             if (err.code === 10008) {
                 delete this.history[msg.id];
             } else {
                 console.error(`[TournamentFeeder] Erro ao editar msg ${msg.id}:`, err.message);
             }
        }
    }

    static buildPayload(msg) {
        let content = this.sanitizeContent(msg.content || '');
        
        if (msg.attachments && msg.attachments.length > 0) {
            content += '\n' + msg.attachments.join('\n');
        }
        
        if (!content.trim()) content = '📁 *(Mídia/Arquivo sem texto)*';
        
        if (content.length > 2000) content = content.substring(0, 1990) + '...';
        
        return { content: content };
    }
}

module.exports = { TournamentFeeder };
