const { Client, GatewayIntentBits } = require('discord.js');
const { getLatest, getFileDetails } = require('./botAPIv2');
const { createLogger, format, transports } = require('winston');
const bot = new Client({ intents: [GatewayIntentBits.Guilds] })
// Set up logging

const logger = createLogger({
    level: 'info',
    format: format.simple(),
    transports: [new transports.Console()]
});

// Define constants
const guildId = 'no stealing';

// Define the /latest command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'latest') return;

    logger.info('Executing /latest command...');
    const fileInfo = await getLatest();
    if (fileInfo instanceof Object) {
        await interaction.reply(`Newest File Information:\nFile Name: ${fileInfo.file_name}\nFile Date: ${fileInfo.file_date}`);
    } else {
        await interaction.reply(fileInfo);
    }
});

// Define the /changelog command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'changelog') return;

    const fileId = interaction.options.getInteger('file_id');
    logger.info(`Executing /changelog command for file ID: ${fileId}`);
    const changelogData = await getFileDetails(fileId);
    await interaction.reply(changelogData);
});

// Start the bot
bot.login('not for u : )');
