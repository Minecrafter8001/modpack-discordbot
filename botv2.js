const { Client, GatewayIntentBits } = require('discord.js');
const { getLatest, getFileDetails, checkupdates } = require('./botAPIv2');
const { createLogger, format, transports } = require('winston');
const schedule = require('node-schedule');
const declareCommands = require("./declare_commands");


const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = "";
const ownerId = "512988669561274400"; // Replace with your bot owner's user ID

let updatemessages = true;

const logger = createLogger({
    level: 'info',
    format: format.simple(),
    transports: [new transports.Console()]
});

// Define the /latest command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'latest') return;
    logger.info('Executing /latest command...');
    const fileInfo = await getLatest(false);
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

// Define the /checkupdates command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'checkupdates') return;
    message = await checkupdates(interaction.guildId);
    if (!message) {
        console.log('no updates found');
        interaction.reply("no updates found");
    } else {
        console.log('update found');
        interaction.reply(`update found:\n ` + message);
    }
});

// Define the /reload command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'reload') return;

    // Check if the user has administrator permissions or is the bot owner
    if (!interaction.member.permissions.has(GatewayIntentBits.GuildMembers.MANAGE_GUILD) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    logger.info("Reloading all commands...");
    await declareCommands();
    await interaction.reply('All commands have been reloaded.');
});



// Define the /restart command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'restart') return;

    // Check if the user is the bot owner
    if (interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    logger.info("restarting bot...");
    await interaction.reply('restarting bot...');
    main(true, interaction.channelId)
});




process.on('SIGINT', () => {
    console.log('Received SIGINT. Logging out...');
    bot.destroy();
    process.exit();
});

bot.once("ready", () => {
    console.log(`Bot started`);
});


// Refresh commands and then login
function main(restartCMD, channelid) {
    bot.destroy();
    declareCommands();
    
    if (restartCMD) {
        setTimeout(() => {
            bot.login(token);
        }, 10000);
    } else {
        console.log("starting bot...");
        bot.login(token);
    }
}
main()