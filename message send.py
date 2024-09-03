import discord
import asyncio

# Replace with your bot's token and the channel ID
TOKEN = ''
CHANNEL_ID = 

# Create an instance of a client
intents = discord.Intents.default()
client = discord.Client(intents=intents)

# Event: When the bot is ready
@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    guild = client.get_guild(962252962476982272)
    await guild.leave()
    # Start the terminal input loop
    await send_terminal_input()

async def send_terminal_input():
    channel = client.get_channel(CHANNEL_ID)
    
    if channel is None:
        print("Invalid channel ID!")
        return

    while True:
        # Take input from the terminal
        user_input = input("Enter your message: ")

        # Send the input to the specified channel
        await channel.send(user_input)
        print(f'Message sent: {user_input}')

# Run the bot
client.run(TOKEN)
