const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { getBotInfo } = require('./botAPIv2');

const BOT_TOKEN = getBotInfo('bot_token');
const APPLICATION_ID = getBotInfo('application_id');

const commands = [
    {
        name: 'changelog',
        description: 'Get the changelog for a specific file',
    },
    {
        name: 'latest',
        description: 'Get the latest file information',
    },
    {
        name: 'checkupdates',
        description: 'Checks for a pack update',
    },
    {
        name: 'reload',
        description: 'Reload all commands (administrators only)',
    },
    {
        name: 'restart',
        description: 'Reboots the bot (bot owner only)',
    },
    {
        name: 'shutdown',
        description: 'Shutdowns the bot (bot owner only)',
    },
    {
        name: 'setmodpackid',
        description: 'Set the modpack ID (administrators only)',
        options: [
            {
                name: 'modpack_id',
                description: 'The ID of the modpack',
                type: 4, // Integer type
                required: true,
            },
        ],
    },
    {
        name: 'setversion',
        description: 'Set the server version (administrators only)',
    },
    {
        name: 'serverversion',
        description: 'Gets the current server version\n(assuming lion remembered to update it)',
    },
];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

async function refreshCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(APPLICATION_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
        
    } catch (error) {
        console.error('Error refreshing application (/) commands:', error);
    }
}

module.exports = refreshCommands;
