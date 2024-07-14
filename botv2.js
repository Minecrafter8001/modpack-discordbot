const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getBotInfo, getModFiles, getLatest, getFileDetails, checkUpdates, saveSettings, loadSettings,logMetric } = require('./botAPIv2');
const { createLogger, format, transports } = require('winston');
const declareCommands = require("./declare_commands");
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = getBotInfo('bot_token');
const ownerId = getBotInfo('owner_id'); // Replace with your bot owner's user ID



bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    logMetric("commands_ran","inc")
});

const logger = createLogger({
    level: 'info',
    format: format.simple(),
    transports: [new transports.Console()]
});

// Define the /latest command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'latest') return;
    
    logger.info('Executing /latest command...');
    
    try {
      const fileInfo = await getLatest(false, interaction.guildId);
      console.log('File Info:', fileInfo); // Log fileInfo for debugging
      
      switch (true) {
          case !fileInfo:
              throw new Error('Failed to fetch file information');
          case typeof fileInfo !== 'object':
              throw new Error('File information is not in expected format');
          case !fileInfo.fileName:
              throw new Error('File Name is missing in the file information');
          case !fileInfo.fileDate:
              throw new Error('File Date is missing in the file information');
          default:
              // If all checks pass, send the response
              const fileDate = new Date(fileInfo.fileDate);
              const discordTimestamp = Math.floor(fileDate.getTime() / 1000);
              await interaction.reply(
                  `**Newest File Information:**\n` +
                  `**File Name:** ${fileInfo.fileName}\n` +
                  `**File Date:** <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)\n` +
                  `**Changelog:**\n${fileInfo.changelog}`
              );
              break;
      }
    } catch (error) {
      console.error('Error occurred while executing /latest command:', error.message);
      await interaction.reply('An error occurred while fetching latest file information.');
    }
});
  

// Define the /changelog command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'changelog') return;
    const fileId = interaction.options.getInteger('file_id');
    logger.info(`Executing /changelog command for file ID: ${fileId}`);
    const changelogData = await getFileDetails(fileId, interaction.guildId);
    await interaction.reply(changelogData);
});

// Define the /checkupdates command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'checkupdates') return;
    const message = await checkUpdates(interaction.guildId);
    if (!message) {
        console.log('no updates found');
        interaction.reply("no updates found");
    } else {
        console.log('update found');
        interaction.reply(`update found:\n${message}`);
    }
});

// Define the /serverversion command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'serverversion') return;
  
    try {
      logger.info('Setting server version');
  
      const guildId = interaction.guildId;
      const fileId = await loadSettings(guildId, 'server_version');
      if (!typeof(fileID) == "number"){
        interaction.reply('Server version not set.\n please spam lion until he updates it : )');
        console.error("server version not set");
        return;
      }
      
      if (!fileId) {
        interaction.reply('Server version not set.\n please spam lion until he updates it : )');
        return;
      }
  
      const message = await getFileDetails(fileId, guildId);
      interaction.reply('current server version\n' + message);
    } catch (error) {
      console.error('Error handling /serverVersion command:', error.message);
      interaction.reply('An error occurred while fetching server version details. Please try again later.');
    }
});
  

// Define the /reload command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'reload') return;

    // Check if the user has administrator permissions or is the bot owner
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
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

    logger.info("Restarting bot...");
    await interaction.reply('Restarting bot...');

    // Call the external script to handle bot restart
    const { exec } = require('child_process');
    exec('./manageBot.sh -r <bot_process_name>', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing restart script: ${error.message}`);
            interaction.reply('Error restarting bot.');
            return;
        }
        console.log(`Restart script output: ${stdout}`);
        interaction.reply('Bot restarted successfully.');
    });
});

// Define the /shutdown command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'shutdown') return;

    // Check if the user is the bot owner
    if (interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    logger.info("Shutting down bot...");
    await interaction.reply('Shutting down bot...');

    // Call the external script to handle bot shutdown
    const { exec } = require('child_process');
    exec('./manageBot.sh <bot_process_name>', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing shutdown script: ${error.message}`);
            interaction.reply('Error shutting down bot.');
            return;
        }
        console.log(`Shutdown script output: ${stdout}`);
        interaction.reply('Bot shut down successfully.');
    });
});

// Define the /setmodpackid command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'setmodpackid') return;

    // Check if the user has administrator permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    const modpackId = interaction.options.getInteger('modpack_id');
    await saveSettings(interaction.guildId, 'modpackid', modpackId);
    await interaction.reply(`Modpack ID set to ${modpackId}.`);
});

// Define the /setversion command with dropdown using getModFiles function
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'setversion') return;
    console.log();

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }


    try {
        const modpackId = await loadSettings(interaction.guildId, 'modpackid');
        if (typeof(modpackId) !== 'number') {
            await interaction.reply('Modpack ID not set');
            console.error("modpack id not set");
            return;
        }
        console.log(modpackId);
        const modFiles = await getModFiles(modpackId);

        if (!modFiles || modFiles.length === 0) {
            return await interaction.reply('No versions found.');
        }

        const options = modFiles.map(file => ({
            label: file.fileName,
            value: file.id.toString(),
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_version')
                .setPlaceholder('Select a version...')
                .addOptions(options)
        );

        await interaction.reply({ content: 'Please select the server version:', components: [row] });
    } catch (error) {
        console.error(`botv2.js:Error fetching mod files: ${error.message}`);
        await interaction.reply('An error occurred while fetching mod versions. Please try again later.');
    }
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu() || interaction.customId !== 'select_version') return;

    const selectedVersionId = interaction.values[0];
    const selectedVersionDetails = await getFileDetails(selectedVersionId, interaction.guildId,true);
    console.debug(selectedVersionDetails);
    const selectedVersionName = selectedVersionDetails.fileName;
    console.debug(selectedVersionName);
    await saveSettings(interaction.guildId, 'server_version', parseInt(selectedVersionId));
    await interaction.reply(`Server version set to ${selectedVersionName}.`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Logging out...');
    bot.destroy();
    process.exit();
});

bot.once("ready", () => {
    console.log("Bot started");
    console.debug("Bot username:" + bot.user.username +"#"+ bot.user.discriminator +"\nBot id:" + bot.user.id);


});

// Refresh commands and then login
async function main(restartCMD, channelid) {
    await declareCommands();

    if (restartCMD) {
        setTimeout(() => {
            bot.login(token);
        }, 10000); // Wait 10 seconds before logging in again after restart
    } else {
        console.log("Starting bot...");
        bot.login(token);
    }
}

main();