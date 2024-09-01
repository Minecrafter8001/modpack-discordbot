const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, PresenceUpdateStatus, channelType, ChannelType, Activity, ActivityType } = require('discord.js');
const { getBotInfo, getModFiles, getLatest, getFileDetails, checkUpdates, saveSettings, loadSettings } = require('./botAPIv2');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const declareCommands = require("./declare_commands");
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = getBotInfo('bot_token');
const ownerId = getBotInfo('owner_id');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const workerfile = './updatecheck-worker.js';
const commands_enabled = false



const logger = createLogger({
    level: getBotInfo('logger_level'),
    format: format.simple(),
    transports: [new transports.Console()]
});


async function saveservers() {
    const servers = []
    if (bot.guilds) {
        bot.guilds.cache.forEach((guild) => {
            servers.push(guild.id);
        });
    }
    await saveSettings("global", "servers", servers);
}

bot.on('guildCreate', async (guild) => {
    const servers = await loadServers();
    servers.push(guild.id);
    await saveSettings("global", "servers", servers);
});

bot.on('guildDelete', async (guild) => {
    let servers = await loadServers();
    servers = servers.filter(server => server !== guild.id);
    await saveSettings("global", "servers", servers);
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (!commands_enabled) {
        interaction.reply("All commands are currently disabled")
        logger.info("A command was attempted to be executed but all commands are currently disabled")
    }
    saveservers()
});

function isText(channel) {
    return channel.type === ChannelType.GuildText;
}


// Define the /latest command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'latest') return;
    if (!commands_enabled) return;
        
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
    if (!commands_enabled) return;
    try {
        const modpackId = await loadSettings(interaction.guildId, 'modpackid');
        if (!modpackId){
            await interaction.reply('Modpack ID not set');
            logger.info("modpack id not set");
            return;
        }
        logger.debug(modpackId);
        const modFiles = await getModFiles(modpackId);

        if (!modFiles || modFiles.length === 0) {
            return await interaction.reply('No versions found.');
        }

        let options = modFiles.map(file => ({
            label: file.fileName,
            value: file.id.toString(),
        }));

        if (options.length > 25) {
            options = options.slice(0, 25);
        }

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
        await interaction.editReply('An error occurred while fetching changelog.');
    }
});

// Define the /checkupdates command
bot.on('interactionCreate', async interaction => {
    if (!commands_enabled) return;

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
    if (!commands_enabled) return;
  
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
    if (!commands_enabled) return;

    // Check if the user has administrator permissions or is the bot owner
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    logger.info("Reloading all commands...");
    await declareCommands();
    await interaction.reply('All commands have been reloaded.');
});


// Define the /setmodpackid command
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'setmodpackid') return;
    if (!commands_enabled) return;

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
    if (!commands_enabled) return;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        return await interaction.reply('You do not have permission to use this command.');
    }

    try {
        const modpackId = await loadSettings(interaction.guildId, 'modpackid');
        if (!modpackId) {
            await interaction.reply('Modpack ID not set');
            logger.info("modpack id not set");
            return;
        }
        logger.debug(modpackId);
        const modFiles = await getModFiles(modpackId);

        if (!modFiles || modFiles.length === 0) {
            return await interaction.reply('No versions found.');
        }

        let options = modFiles.map(file => ({
            label: file.fileName,
            value: file.id.toString(),
        }));
        if (options.length > 25) {
            options = options.slice(0, 25);
        }


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

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'autocheckupdates') return;
    if (!commands_enabled) return;
    
    const guildId = interaction.guildId;
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && interaction.user.id !== ownerId) {
        logger.info(`User ${interaction.user.id} attempted to use /autocheckupdates without permission in guild ${guildId}.`);
        return await interaction.reply('You do not have permission to use this command.');
    }

    let responseMessage = '';
    try {
        logger.info(`Executing /autocheckupdates command in guild ${guildId}.`);
        const enabled = interaction.options.getBoolean('enabled');
        const channelId = interaction.options.getString('channel_id');

        if (enabled !== null) {
            logger.info(`Setting autocheckupdates to ${enabled} in guild ${guildId}.`);
            await saveSettings(guildId, 'autocheckupdates', enabled);
            responseMessage += `Automatic update checking is now ${enabled ? 'enabled' : 'disabled'}.\n`;
        }

        if (channelId) {
            logger.info(`Setting notification channel to ${channelId} in guild ${guildId}.`);
            try {
                const channel = await interaction.guild.channels.fetch(channelId);
                if (channel && channel.type === ChannelType.GuildText) {
                    await saveSettings(guildId, 'notification_channel_id', channelId);
                    responseMessage += `Notification channel set to <#${channelId}>.\n`;
                } else {
                    responseMessage += 'Invalid channel ID or not a text channel.\n';
                    logger.error(`Invalid channel ID or not a text channel in guild ${guildId}.`);
                }
            } catch (fetchError) {
                responseMessage += 'Failed to fetch the channel. Please check if the channel ID is correct.\n';
                logger.error(`Failed to fetch channel ${channelId} in guild ${guildId}: ${fetchError.message}`);
            }
        }

        if (responseMessage === '') {
            responseMessage = 'No changes were made. Please provide an option to update.';
        }
        
        await interaction.reply(responseMessage.trim());
    } catch (error) {
        logger.error(`Error handling /autocheckupdates command in guild ${guildId}: ${error.message}`);
        await interaction.reply('An error occurred while handling the command. Please try again later.');
    }
});






process.on('SIGINT', () => {
    logger.info('Received SIGINT. Logging out...');
    bot.user.setStatus(PresenceUpdateStatus.Invisible);
    bot.destroy();
    worker.postMessage({ command: 'stop' });
    worker.terminate();
    process.exit();
});

async function startWorker() {
    worker = new Worker(path.resolve(__dirname, workerfile));
    logger.info('Starting worker...');
    worker.postMessage("start");
    worker.on('message', async (message) => {
        if (message.version) {
            const guild = bot.guilds.cache.get(message.serverId);
            if (guild) {
                const channelId = await loadSettings(message.serverId, 'notification_channel_id');
                const channel = guild.channels.cache.get(channelId);
                if (channel && channel.type === ChannelType.GuildText) {
                    await channel.send(`Update found: ${message.version}`);
                }
            }
        } else if (message.error) {
            logger.error(`Worker error: ${message.error}`);
        }
    });

    worker.on('error', (error) => logger.error(`Worker encountered an error: ${error}`));
    worker.on('exit', (code) => {
        if (code !== 0) logger.error(`Worker stopped with exit code ${code}`);
    });
}


bot.once("ready", () => {
    logger.info("Bot started");
    logger.debug("Bot username:" + bot.user.username +"#"+ bot.user.discriminator +"\nBot id:" + bot.user.id);
    if (!commands_enabled) {
        bot.user.setPresence({
            activities: [{ name: 'Disabled', type: ActivityType.Playing }],
        })
        bot.user.setStatus(PresenceUpdateStatus.DoNotDisturb)
    }else{
    bot.user.setStatus(PresenceUpdateStatus.Online);
    }
    saveservers()
    startWorker();

});

// Refresh commands and then login
async function main() {
    await declareCommands();
    logger.info("Starting bot...");
    bot.login(token);

}

main();

