const { queryParams } = require("../../../db/database");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const getStats = require("../../utils/hypixelapi/getStats");
const getDonutStats = require("../../utils/donutapi");
const { generateStatsImage } = require("../../../mainbot/utils/sendStatsImage");

module.exports = {
    name: "p",
    callback: async (client, interaction) => {
        try {
            const customId = interaction.customId;
            
            // Check if it's a profile button (starts with p_)
            if (!customId.startsWith('p_')) {
                return;
            }

            const buttonId = customId.substring(2); // Remove "p_" prefix
            
            // Map button IDs to their types
            const buttonMap = {
                '216102854258069609': 'duels',
                '216102860562108523': 'skywars',
                '216102867314937965': 'skyblock',
                '216102874709495919': 'bedwars',
                '216105999999999999': 'donut',
                '216105482849357945': 'claim'
            };

            const buttonType = buttonMap[buttonId];

            if (buttonType === 'claim') {
                // Handle claim button
                await handleClaimButton(client, interaction);
            } else if (['duels', 'skywars', 'skyblock', 'bedwars'].includes(buttonType)) {
                // Handle stats viewing buttons
                await interaction.reply({
                    content: `Stats for ${buttonType} will be shown here.`,
                    ephemeral: true
                });
            } else if (buttonType === 'donut') {
                // Donut button — fetch DonutSMP stats and show embed
                await interaction.deferReply({ ephemeral: true });
                try {
                    // Extract mcUsername similar to claim flow
                    const message = interaction.message;
                    const embed = message.embeds && message.embeds[0];
                    let mcUsername = null;
                    const titleMatch = embed?.title?.match(/^([^\s|]+)/);
                    if (titleMatch) mcUsername = titleMatch[1];

                    if (!mcUsername) {
                        return interaction.editReply({ content: 'Could not determine Minecraft username from this profile.' });
                    }

                    const stats = await getDonutStats(mcUsername);
                    if (!stats) return interaction.editReply({ content: `No DonutSMP stats found for **${mcUsername}**.` });

                    const fields = [];
                    fields.push({ name: 'Money', value: `${stats.money || 0}`, inline: true });
                    fields.push({ name: 'Shards', value: `${stats.shards || 0}`, inline: true });
                    fields.push({ name: 'Player Kills', value: `${stats.playerKills || 0}`, inline: true });
                    fields.push({ name: 'Deaths', value: `${stats.deaths || 0}`, inline: true });

                    // format playtime
                    const seconds = stats.playtimeSeconds || 0;
                    const days = Math.floor(seconds / 86400);
                    const hours = Math.floor((seconds % 86400) / 3600);
                    const mins = Math.floor((seconds % 3600) / 60);
                    const playtimeStr = `${days}d ${hours}h ${mins}m`;
                    fields.push({ name: 'Playtime', value: playtimeStr, inline: true });

                    fields.push({ name: 'Blocks Placed', value: `${stats.blocksPlaced || 0}`, inline: true });
                    fields.push({ name: 'Blocks Broken', value: `${stats.blocksBroken || 0}`, inline: true });
                    fields.push({ name: 'Mobs Killed', value: `${stats.mobsKilled || 0}`, inline: true });
                    fields.push({ name: 'Money Spent', value: `${stats.moneySpent || 0}`, inline: true });
                    fields.push({ name: 'Money Made', value: `${stats.moneyMade || 0}`, inline: true });

                    const { EmbedBuilder } = require('discord.js');
                    const donutEmbed = new EmbedBuilder()
                        .setTitle(`${mcUsername} — DonutSMP Stats`)
                        .setColor(0xffc857)
                        .addFields(fields)
                        .setFooter({ text: 'DonutSMP' });

                    if (stats.uuid) {
                        donutEmbed.setThumbnail(`https://crafatar.com/avatars/${stats.uuid}?size=256&overlay`);
                    }

                    return interaction.editReply({ embeds: [donutEmbed] });
                } catch (e) {
                    console.error('[ProfileButtons] Donut button error:', e);
                    return interaction.editReply({ content: 'Error fetching DonutSMP stats.' });
                }
            }
        } catch (error) {
            console.error('[ProfileButtons] Error:', error);
            await interaction.reply({
                content: 'An error occurred while processing this button.',
                ephemeral: true
            }).catch(() => {});
        }
    }
};

async function handleClaimButton(client, interaction) {
    try {
        // Get the last secured account info from the interaction message
        const message = interaction.message;
        
        // Extract account info from embed
        if (!message.embeds || message.embeds.length === 0) {
            return interaction.reply({
                content: 'Could not find account information.',
                ephemeral: true
            });
        }

        const embed = message.embeds[0];
        const description = embed.description || '';
        const author = embed.author?.name || '';
        
        // Extract minecraft username from embed
        let mcUsername = null;
        const titleMatch = embed.title?.match(/^([^\s|]+)/);
        if (titleMatch) {
            mcUsername = titleMatch[1];
        }

        if (!mcUsername || mcUsername === '*' || mcUsername === 'Hidden') {
            return interaction.reply({
                content: 'Unable to claim account: No valid Minecraft username found.',
                ephemeral: true
            });
        }

        // Get account stats
        const stats = await getStats(mcUsername);
        
        if (!stats) {
            return interaction.reply({
                content: 'Could not fetch account statistics.',
                ephemeral: true
            });
        }

        // Create account info embed
        const accountEmbed = new EmbedBuilder()
            .setColor(0x5f9ea0)
            .setTitle(`Account Claimed: ${mcUsername}`)
            .setDescription(`Successfully claimed account for ${mcUsername}`)
            .addFields(
                { name: 'Minecraft Account', value: mcUsername, inline: true },
                { name: 'Claimed By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: 'Powered By ILJ' })
            .setTimestamp();

        // Add stats if available
        if (stats.skyblock) {
            accountEmbed.addFields({
                name: 'Skyblock Level',
                value: `${stats.skyblock.skillAverage?.toFixed(1) || 0}`,
                inline: true
            });
        }

        if (stats.network) {
            accountEmbed.addFields({
                name: 'Network Level',
                value: `${stats.network.level || 0}`,
                inline: true
            });
        }

        // Send to user's DM
        try {
            const dmChannel = await interaction.user.createDM();
            await dmChannel.send({ embeds: [accountEmbed] });
        } catch (dmError) {
            console.error('[ProfileButtons] Could not send DM:', dmError);
        }

        // Reply to the interaction
        await interaction.reply({
            content: `✅ Account **${mcUsername}** has been claimed! Check your DMs for account details.`,
            ephemeral: true
        });

    } catch (error) {
        console.error('[ProfileButtons] Error handling claim button:', error);
        await interaction.reply({
            content: 'An error occurred while claiming the account.',
            ephemeral: true
        }).catch(() => {});
    }
}
