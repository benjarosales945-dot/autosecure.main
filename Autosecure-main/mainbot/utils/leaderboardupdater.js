const { queryParams } = require("../../db/database");
const { setTimeout } = require("timers/promises");
const shorten = require("../../autosecure/utils/utils/shorten");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function checkhidden(userid) {
    const entry = await queryParams(`SELECT showleaderboard FROM settings WHERE user_id = ?`, [userid]);
    if (entry.length === 0) {
        return false;
    }
    return entry[0].showleaderboard === 0 || entry[0].showleaderboard === "0";
}

const embedColor = 0xB8D2F0;

async function updatemessageid(id, channelId) {
    const set = `${id}|${channelId}`;
    const existing = await queryParams(`SELECT * FROM controlbot WHERE id = ?`, [1]);

    if (existing.length > 0) {
        try {
            await queryParams(`UPDATE controlbot SET leaderboardid = ? WHERE id = ?`, [set, 1]);
        } catch (error) {
                    }
    } else {
        try {
            await queryParams(`INSERT INTO controlbot (id, leaderboardid) VALUES (?, ?)`, [1, set]);
        } catch (error) {
                    }
    }
}

async function generateLeaderboardEmbeds() {
    try {
        const countLeaderboard = await queryParams(
            'SELECT user_id, amount FROM leaderboard ORDER BY amount DESC LIMIT 10'
        );
        const networthLeaderboard = await queryParams(
            'SELECT user_id, networth FROM leaderboard ORDER BY networth DESC LIMIT 10'
        );

        let countDescription = '';
        for (let index = 0; index < countLeaderboard.length; index++) {
            const entry = countLeaderboard[index];
            const isHidden = await checkhidden(entry.user_id);
            const userTag = isHidden ? '`Hidden user`' : `<@${entry.user_id}>`;
            countDescription += `**${index + 1} |** ${userTag} has auto secured \`${entry.amount.toLocaleString()}\` accounts\n`;
        }

        let networthDescription = '';
        for (let index = 0; index < networthLeaderboard.length; index++) {
            const entry = networthLeaderboard[index];
            const isHidden = await checkhidden(entry.user_id);
            const userTag = isHidden ? '`Hidden user`' : `<@${entry.user_id}>`;
            const actualnetworth = shorten(entry.networth);
            networthDescription += `**${index + 1} |** ${userTag} has auto secured \`${actualnetworth}\` of networth\n`;
        }

        return {
            content: `Last updated: <t:${Math.floor(Date.now() / 1000)}:R>`,
            embeds: [
                {
                    title: "Leaderboard",
                    description: countDescription,
                    color: embedColor
                },
                {
                    title: "Networth Leaderboard",
                    description: networthDescription,
                    color: embedColor
                }
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("hideleaderboard")
                        .setLabel("Hide me")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        };
    } catch (error) {
        console.error(`Error generating leaderboard: ${error.message}`);
        return { content: "❌ Failed to generate leaderboard" };
    }
}

async function getMessageId() {
    try {
        const data = await queryParams('SELECT leaderboardid FROM controlbot WHERE id = 1');
        const raw = data[0]?.leaderboardid || null;
                return raw;
    } catch (error) {
        console.error(`Error getting message ID from DB: ${error.message}`);
        return null;
    }
}

async function editExistingMessage(client, rawId, content) {
    try {
        const [messageId, channelId] = rawId.split("|");
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        const message = await channel.messages.fetch(messageId);
        
        // Check if the bot owns the message
        if (message.author.id !== client.user.id) {
            console.warn(`[Leaderboard] Message ${messageId} not owned by bot. Cannot edit. Recreating...`);
            // Delete the stored ID to trigger a new message creation
            await queryParams(`UPDATE controlbot SET leaderboardid = NULL WHERE id = ?`, [1]);
            return false;
        }
        
        await message.edit(content);
        return true;
    } catch (error) {
        if (error.code === 10008) {
            // Message not found - clear stored ID
            console.warn(`[Leaderboard] Message not found (10008). Clearing stored ID.`);
            await queryParams(`UPDATE controlbot SET leaderboardid = NULL WHERE id = ?`, [1]);
            return false;
        }
        throw error;
    }
}

async function updateLeaderboardMessage(client) {
    try {
        const rawId = await getMessageId();
        if (!rawId) {
            // No message ID stored - ignore for now
            return;
        }
        const content = await generateLeaderboardEmbeds();
        const success = await editExistingMessage(client, rawId, content);
        
        if (!success) {
            // Message edit failed, will retry next cycle
            return;
        }
    } catch (error) {
        console.error(`[Leaderboard] Update failed: ${error.message}`);
        // Don't recurse - just log and let the interval retry
        return;
    }
}

async function startLeaderboardUpdater(client) {
        let updateInterval = null;
    await updateLeaderboardMessage(client);

        updateInterval = setInterval(() => updateLeaderboardMessage(client), 1800000);

    return async () => {
                if (updateInterval) {
            clearInterval(updateInterval);
                    }
            };
}

module.exports = { startLeaderboardUpdater, getMessageId, generateLeaderboardEmbeds, updatemessageid };
