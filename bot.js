require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const axios = require('axios')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
})

const DISCORD_TOKEN = process.env.DISCORD_TOKEN

const chessAccounts = new Map()

client.once('ready', () => {
    console.log(`Bot is online! ${client.user.tag}`)
})

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('/link') || message.author.bot) return

    const args = message.content.split(' ')
    if (args.length !== 2) {
        return message.reply('Correct use: /link your-chess.com-username')
    }

    const chessUsername = args[1]
    const userId = message.author.id

    try {
        const response = await axios.get(`https://api.chess.com/pub/player/${chessUsername}`)
        if (response.status === 200) {
            chessAccounts.set(userId, chessUsername)
            message.reply(`Chess.com account successfully linked: **${chessUsername}**`)

            const guild = message.guild
            if (!guild) return message.reply('Error: Unable to access the server.')

            const member = await guild.members.fetch(userId)
            if (!member) return message.reply('Error: Could not find member on server.')

            const statsResponse = await axios.get(`https://api.chess.com/pub/player/${chessUsername}/stats`)
            const stats = statsResponse.data

            const blitzStats = stats.chess_blitz
            if (!blitzStats || !blitzStats.last) {
                return message.reply('The rating blitz could not be obtained. Make sure you played at least one blitz match on Chess.com.')
            }

            const rating = blitzStats.last.rating

            const rolesToRemove = member.roles.cache.filter(role => role.name.startsWith('Rating'))
            for (const role of rolesToRemove.values()) {
                await member.roles.remove(role)
            }

            let role = guild.roles.cache.find(role => role.name === `Rating: ${rating}`)
            if (!role) {
                role = await guild.roles.create({
                    name: `Rating: ${rating}`,
                    color: '#0000FF',
                })
            }

            await member.roles.add(role)
            message.reply(`Your role has been updated to **Rating: ${rating}**!`)
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            message.reply('Chess.com user not found. Check if the name is correct.')
        } else {
            console.error(error.message)
            message.reply('An error occurred while processing your request. Try again later.')
        }
    }
})

client.login(DISCORD_TOKEN)