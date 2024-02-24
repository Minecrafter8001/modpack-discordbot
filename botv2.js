const { Client, GatewayIntentBits } = require("discord.js");
const { getLatest, getFileDetails } = require("./botAPIv2");

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

const botToken = "your token here";

bot.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	switch (interaction.commandName) {
		case "latest":
			const fileInfo = await getLatest();

			if (fileInfo instanceof Object) {
				await interaction.reply(`Newest File Information:\nFile Name: ${fileInfo.file_name}\nFile Date: ${fileInfo.file_date}`);
			} else {
				await interaction.reply(fileInfo);
			}

			break;
		case "changelog":
			const fileId = interaction.options.getInteger("file_id");
			const changelogData = await getFileDetails(fileId);
			await interaction.reply(changelogData);

			break;
	}
});

bot.on("ready", () => {
	console.log(`Bot started`);
});

bot.login(botToken);
