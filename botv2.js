const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, PresenceUpdateStatus } = require('discord.js');
const { getBotInfo, getModFiles, getLatest, getFileDetails, checkUpdates, saveSettings, loadSettings } = require('./botAPIv2');
const { createLogger, format, transports } = require('winston');
const schedule = require('node-schedule');
const declareCommands = require("./declare_commands");
const { load } = require('cheerio');
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = getBotInfo('bot_token');
const ownerId = getBotInfo('owner_id'); // Replace with your bot owner's user ID

const logger = createLogger({
    level: 'info',
    format: format.simple(),
    transports: [new transports.Console()]
});


// Define the /latest command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'latest') return;
        
    try {
      const fileInfo = await getLatest(false, interaction.guildId);
      logger.debug('File Info:', fileInfo); // Log fileInfo for debugging
      
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
      logger.error('Error occurred while executing /latest command:', error.message);
      await interaction.reply('An error occurred while fetching latest file information.');
    }
});

// Define the /changelog command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'changelog') return;
    try {
        const modpackId = await loadSettings(interaction.guildId, 'modpackid');
        if (typeof(modpackId) !== Number) {
            await interaction.reply('Modpack ID not set');
            logger.info("modpack id not set");
            return;
        }
        logger.debug(modpackId);
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
                .setCustomId(`setversion_${interaction.guildId}`)
                .setPlaceholder('Select a version...')
                .addOptions(options)
        );

        const response = await interaction.reply({ content: 'Please select a version:', components: [row] });

        const filter = i => i.user.id === interaction.user.id && i.isSelectMenu();
        const collector = response.createMessageComponentCollector({ filter, time: 60_000 });

        collector.on('collect', async i => {
            const selectedVersionId = i.values[0];
            const selectedVersionDetails = await getFileDetails(selectedVersionId, interaction.guildId);
            interaction.editReply({ content: selectedVersionDetails, components: [] });
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'Selection not received within 1 minute, cancelling', components: [] });
            }
        });

    } catch (error) {
        logger.error('Error occurred while executing /changelog command:', error.message);
        await interaction.update('An error occurred while fetching changelog.');
    }
});

// Define the /checkupdates command
bot.on('interactionCreate', async interaction => {

    if (!interaction.isCommand() || interaction.commandName !== 'checkupdates') return;
    try {
        const message = await checkUpdates(interaction.guildId);
        if (!message) {
            await interaction.reply('no updates found');
        } else {
            await interaction.reply(`update found:\n${message}`);
        }
    } catch (error) {
        logger.error('Error occurred while checking updates:', error.message);
        await interaction.reply('An error occurred while fetching update details. Please try again later.');
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
        logger.error("server version not set");
        return;
      }
      
      if (!fileId) {
        interaction.reply('Server version not set.\n please spam lion until he updates it : )');
        return;
      }
  
      const message = await getFileDetails(fileId, guildId);
      interaction.reply('current server version\n' + message);
    } catch (error) {
      logger.error('Error handling /serverVersion command:', error.message);
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
            logger.error(`Error executing restart script: ${error.message}`);
            interaction.reply('Error restarting bot.');
            return;
        }
        logger.info(`Restart script output: ${stdout}`);
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
            logger.error(`Error executing shutdown script: ${error.message}`);
            interaction.reply('Error shutting down bot.');
            return;
        }
        logger.info(`Shutdown script output: ${stdout}`);
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

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    try {
        const modpackId = await loadSettings(interaction.guildId, 'modpackid');
        if (typeof(modpackId) !== Number) {
            await interaction.reply('Modpack ID not set');
            logger.info("modpack id not set");
            return;
        }
        logger.debug(modpackId);
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
                .setCustomId(`setversion_${interaction.guildId}`)
                .setPlaceholder('Select a version...')
                .addOptions(options)
        );

        const message = await interaction.reply({ content: 'Please select the server version:', components: [row] });
        const filter = i => i.user.id === interaction.user.id && i.isSelectMenu();
        const collector = message.createMessageComponentCollector({ filter, time: 60_000 });

        collector.on('collect', async i => {
            collector.stop();
            const selectedVersionId = i.values[0];
            const selectedVersionDetails = await getFileDetails(selectedVersionId, interaction.guildId, true);
            const selectedVersionName = selectedVersionDetails.fileName;
            await saveSettings(interaction.guildId, 'server_version', parseInt(selectedVersionId));
            await interaction.editReply({content:`Server version set to ${selectedVersionName}.`,  components: [] });
        });
    } catch (error) {
        logger.error(`botv2.js:Error fetching mod files: ${error.message}`);
        await interaction.reply('An error occurred while fetching mod versions. Please try again later.');
    }
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Logging out...');
    bot.user.setStatus(PresenceUpdateStatus.Invisible);
    bot.destroy();
    process.exit();
});

bot.once("ready", () => {
    logger.info("Bot started");
    logger.debug("Bot username:" + bot.user.username +"#"+ bot.user.discriminator +"\nBot id:" + bot.user.id);
    bot.user.setStatus(PresenceUpdateStatus.Online);
});

// Refresh commands and then login
async function main() {
    await declareCommands();
    logger.info("Starting bot...");
    bot.login(token);

}

main();

