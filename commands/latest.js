// commands/latest.js
const { SlashCommandBuilder } = require('discord.js');
const { getFileDetails } = require("../botAPIv2"); // Updated import statement

// Command logic...


module.exports = {
    data: new SlashCommandBuilder()
        .setName('latest')
        .setDescription('Get the latest file information'),
    async execute(interaction) {
        const fileInfo = await getLatest(false);
        if (fileInfo instanceof Object) {
            await interaction.reply(`Newest File Information:\nFile Name: ${fileInfo.file_name}\nFile Date: ${fileInfo.file_date}`);
        } else {
            await interaction.reply(fileInfo);
        }
    },
};
