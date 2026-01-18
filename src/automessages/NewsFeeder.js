const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MessageFlags } = require('discord.js');

class NewsFeeder {
    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================
    static verbose = true;
    
    // Intervalo de checagem
    static checkInterval = 60 * 1000; // 15 minutos
    
    // Intervalo mínimo para mandar um Header novo (12 horas)
    // Se chegar mensagem antes, manda sem header nenhum.
    static headerCooldown = 12 * 60 * 60 * 1000; 

    static sourceName = "Duel Links Official";
    static sourceLink = "https://discord.com/invite/duellinks";

    // ==========================================
    // CAMINHOS
    // ==========================================
    static sourcePath = path.join(__dirname, '../local/dump/datamine.json'); 
    static mirrorDir = path.join(__dirname, 'mirrors');
    static historyPath = path.join(__dirname, 'mirrors', 'history.json');

    // Estado Interno
    static client = null;
    static history = {};
    static targetChannelId = process.env.NEWS_CHANNEL_ID; 
    
    static lastHeaderTime = 0;
    
    // Trava para evitar envio duplicado se o lote for grande e o intervalo curto
    static isProcessing = false; 

    static log(...args) {
        if (this.verbose) console.log('[NewsFeeder]', ...args);
    }

    static async init(discordClient) {
        this.client = discordClient;

        if (!fs.existsSync(this.mirrorDir)) {
            fs.mkdirSync(this.mirrorDir, { recursive: true });
        }

        this.loadHistory();
        
        if (this.history._meta && this.history._meta.lastHeaderTime) {
            this.lastHeaderTime = this.history._meta.lastHeaderTime;
        }

        this.log('Iniciado. Monitorando datamine.json...');

        this.checkFeed();
        setInterval(() => this.checkFeed(), this.checkInterval);
    }

    static loadHistory() {
        try {
            if (fs.existsSync(this.historyPath)) {
                this.history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
            }
        } catch (err) {
            console.error('[NewsFeeder] Erro ao carregar histórico:', err);
        }
    }

    static saveHistory() {
        try {
            this.history._meta = { lastHeaderTime: this.lastHeaderTime };
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
        } catch (err) {
            console.error('[NewsFeeder] Erro ao salvar histórico:', err);
        }
    }

    static generateHash(msg) {
        const content = msg.content || '';
        const attachments = JSON.stringify(msg.attachments || []);
        const raw = content + attachments;
        return crypto.createHash('md5').update(raw).digest('hex');
    }

    static async checkFeed() {
        // Se já estiver processando um lote, ignora essa chamada
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (!fs.existsSync(this.sourcePath)) return;

            let feedData;
            try {
                const raw = fs.readFileSync(this.sourcePath, 'utf8');
                feedData = JSON.parse(raw);
            } catch (err) {
                console.error('[NewsFeeder] Erro leitura JSON:', err.message);
                return;
            }

            if (!Array.isArray(feedData) || feedData.length === 0) return;

            const channel = await this.client.channels.fetch(this.targetChannelId).catch(() => null);
            if (!channel) return;

            const newMessages = [];
            const editedMessages = [];

            for (const msg of feedData) {
                const msgId = msg.id;
                if (!this.history[msgId]) {
                    newMessages.push(msg);
                } else {
                    const currentHash = this.generateHash(msg);
                    if (this.history[msgId].content_hash !== currentHash) {
                        editedMessages.push(msg);
                    }
                }
            }

            if (newMessages.length > 0) await this.sendBatch(channel, newMessages);
            if (editedMessages.length > 0) {
                for (const msg of editedMessages) await this.processEdit(channel, msg);
            }

        } catch (err) {
            console.error('[NewsFeeder] Erro crítico no loop:', err);
        } finally {
            // Permite nova checagem
            this.isProcessing = false;
        }
    }

    static async sendBatch(channel, messages) {
        this.log(`Lote detectado: ${messages.length} novas mensagens.`);
        
        const now = Date.now();
        const timeSinceLast = now - this.lastHeaderTime;
        const isFollowUp = timeSinceLast < this.headerCooldown;

        // Lógica de Header (Só envia se passou 12h)
        if (!isFollowUp) {
            const uniqueAuthors = [...new Set(messages.map(m => m.author))];
            const authorsStr = uniqueAuthors.join(', ');

            const headerContent = `## 🐫 Datamine Updates\n` +
                                  `- **Autores:** ${authorsStr}\n` +
                                  `- **Fonte:** [${this.sourceName}](${this.sourceLink})`; 

            const ruler = `~~-----------------------------------------------~~`;

            try {
                await channel.send({ 
                    content: headerContent,
                    flags: [MessageFlags.SuppressEmbeds]
                });
                await new Promise(r => setTimeout(r, 500)); 
                await channel.send({ content: ruler });
                
                // Atualiza o timer se enviou o header
                this.lastHeaderTime = now; 
            } catch (err) {
                console.error('[NewsFeeder] Erro ao enviar header:', err);
            }
        }
        
        // Se for follow-up (menos de 12h), não faz nada. Só manda as mensagens.

        // Envia as mensagens
        for (const msg of messages) {
            await new Promise(r => setTimeout(r, 1000));
            try {
                const payload = this.buildPayload(msg);
                const sentMsg = await channel.send(payload);

                this.history[msg.id] = {
                    bot_message_id: sentMsg.id,
                    content_hash: this.generateHash(msg),
                    timestamp: Date.now()
                };
            } catch (err) {
                console.error(`[NewsFeeder] Falha msg ${msg.id}:`, err);
            }
        }

        this.saveHistory();
    }

    static async processEdit(channel, msg) {
        const stored = this.history[msg.id];
        if (!stored) return;
        
        try {
            const messageToEdit = await channel.messages.fetch(stored.bot_message_id);
            if (messageToEdit) {
                const payload = this.buildPayload(msg);
                await messageToEdit.edit(payload);
                stored.content_hash = this.generateHash(msg);
                stored.timestamp = Date.now();
                this.saveHistory();
            }
        } catch (err) {
             if (err.code === 10008) delete this.history[msg.id];
        }
    }

    static buildPayload(msg) {
        let content = msg.content || '';
        if (msg.attachments && msg.attachments.length > 0) {
            content += '\n' + msg.attachments.join('\n');
        }
        if (!content.trim()) content = '📁 *(Mídia/Arquivo sem texto)*';
        if (content.length > 2000) content = content.substring(0, 1990) + '...';
        return { content: content };
    }
}

module.exports = { NewsFeeder };
