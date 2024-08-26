const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { getBotInfo } = require('./botAPIv2');

const BOT_TOKEN = getBotInfo('bot_token');
const APPLICATION_ID = getBotInfo('application_id');

const commands = [
    {
        name: 'reload',
        description: 'Reloads commands (administrators only)',
    },

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
        name: 'setmodpack_id',
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
    {
        name: 'autocheckupdates',
        description: 'toggles automated update checking every hour (administrators only)',
        options: [
            {
                name: 'enabled',
                description: 'Enable or disable automatic update checking',
                type: 5,
                required: false,
                choices: [
                    {
                        name: 'true',
                        value: true,
                    },
                    {
                        name: 'false',
                        value: false,
                    },
                ],
            },
            {
                name: 'channel_id',
                description: 'The ID of the channel to send the update message to',
                type: 3,
                required: false,
            }
        ],
    }
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
