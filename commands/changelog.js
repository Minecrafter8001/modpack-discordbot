// commands/changelog.js
const { SlashCommandBuilder } = require('discord.js');
const { getLatest } = require("../botAPIv2"); // Updated import statement

// Command logic...


module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Get the changelog for a specific file')
        .addIntegerOption(option =>
            option.setName('file_id')
                .setDescription('The ID of the file')
                .setRequired(true)),
    async execute(interaction) {
        const fileId = interaction.options.getInteger("file_id");
        const changelogData = await getFileDetails(fileId);
        await interaction.reply(changelogData);
    },
};
