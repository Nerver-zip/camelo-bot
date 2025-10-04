const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function deployCommands() {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos...`);

        if (process.env.COMMAND_SCOPE === "guild") {
            // Múltiplas guilds separadas por ';'
            const guildIds = process.env.GUILD_ID.split(';').map(id => id.trim());
            
            for (const guildId of guildIds) {
                const data = await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                    { body: commands },
                );
                console.log(`✅ Comandos registrados na guilda ${guildId} (${data.length} comandos).`);
            }
        } else {
            // Global
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`🌍 Comandos registrados globalmente (${data.length} comandos).`);
        }

        console.log(`✨ Todos os comandos foram registrados com sucesso!`);
    } catch (error) {
        console.error("❌ Erro ao registrar comandos:", error);
    }
}

deployCommands();
