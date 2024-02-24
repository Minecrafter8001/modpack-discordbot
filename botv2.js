const { Client, GatewayIntentBits, enableValidators, messageLink } = require("discord.js");
const { getLatest, getFileDetails, checkupdates } = require("./botAPIv2");
const schedule = require('node-schedule');

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });


const botToken = "token_here";
enableupdates = false
maintancemode = true
bot.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	switch (interaction.commandName) {
		case "latest":
			const fileInfo = await getLatest(false);

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
		case "toggleupdates":
		 if (enableupdates){
		  enableupdates = false
		  interaction.reply('automated updates messages disabled')
		 }
		 else {
			enableupdates = true
			interaction.reply('automated updates messages enabled')
		 }

		 break;

	}
});

async function sendupdates(){
const channel = client.channels.cache.find(channel => channel.name === 'general');
if (channel) {
	message = await checkupdates()
	if (message){
	 console.log('update found')
	 channel.send(`ATM 9 has updated:\n ` + message);
	 
	}
	else {
		console.log('no updates found')
	  return
	}
	

} else {
	console.error('Could not find the specified channel.');
}
};

schedule.scheduleJob('45 20 * * *', sendupdates);

process.on('SIGINT', () => {
    console.log('Received SIGINT. Logging out...');
	bot.destroy()
	process.exit();
});


bot.on("ready", () => {
	console.log(`Bot started`);
	if (maintancemode){
	 client.user.setStatus('idle');
	}
	else {
		client.user.setStatus('online');


	}

});

bot.login(botToken);

