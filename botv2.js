const { Client, GatewayIntentBits } = require("discord.js");
const schedule  = require('node-schedule');
const fs = require('fs');
const config = require('./config.json');
const {checkupdates } = require("./botAPIv2")

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = new Map();

// Dynamically load command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}

bot.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
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
    bot.destroy();
    process.exit();
});

bot.once("ready", () => {
    console.log(`Bot started`);
});

bot.login(config.token);
