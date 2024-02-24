// commands/toggleupdates.js
const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggleupdates')
        .setDescription('Toggle automated update messages'),
    async execute(interaction) {
        try {
            // Read configuration from config.json
            const configData = fs.readFileSync('./config.json', 'utf8');
            const config = JSON.parse(configData);
            
            // Toggle the value of enableupdates
            config.enableupdates = !config.enableupdates;

            // Write the updated configuration back to config.json
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 4), 'utf8');

            await interaction.reply(`Automated updates messages ${config.enableupdates ? 'enabled' : 'disabled'}.`);
        } catch (error) {
            console.error('Error toggling updates:', error);
            await interaction.reply('An error occurred while toggling updates.');
        }
    },
};
