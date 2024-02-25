const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const BOT_TOKEN = ' ';
const APPLICATION_ID = ' ';

const commands = [

    {
        name: 'changelog',
        description: 'Get the changelog for a specific file',
        options: [
            {
                name: 'file_id',
                description: 'The ID of the file',
                type: 4, // Integer type
                required: true,
            },
        ],
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
        description: 'reboots the bot (bot owner only)',
    }
];


const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

function refreshcommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        rest.put(
            Routes.applicationCommands(APPLICATION_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
        
    } catch (error) {
        console.error(error);
        return
    }
    console.log("done")
    return
}

module.exports = refreshcommands;
