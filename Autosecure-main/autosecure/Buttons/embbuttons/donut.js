const getDonutStats = require('../../utils/donutapi');
const { EmbedBuilder } = require('discord.js');

let donut = {
    name: 'donut',
    userOnly: true,
    callback: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const customId = interaction.customId;
            const parts = customId.split('|');
            const username = parts[1];
            
            if (!username) {
                return await interaction.editReply({ content: 'No username provided.' });
            }

            console.log(`[DONUT] Fetching stats for username: ${username}`);
            const stats = await getDonutStats(username);
            
            if (!stats) {
                console.log(`[DONUT] No stats found for: ${username}`);
                return await interaction.editReply({ content: `No DonutSMP stats found for **${username}**.` });
            }

            console.log(`[DONUT] Stats retrieved for: ${username}`);
            const fields = [];
            fields.push({ name: 'Money', value: `${stats.money || 0}`, inline: true });
            fields.push({ name: 'Shards', value: `${stats.shards || 0}`, inline: true });
            fields.push({ name: 'Kills', value: `${stats.kills || 0}`, inline: true });
            fields.push({ name: 'Deaths', value: `${stats.deaths || 0}`, inline: true });
            fields.push({ name: 'Playtime', value: stats.playtimeFormatted || '0m', inline: true });
            fields.push({ name: 'Blocks Placed', value: `${stats.placed_blocks || 0}`, inline: true });
            fields.push({ name: 'Blocks Broken', value: `${stats.broken_blocks || 0}`, inline: true });
            fields.push({ name: 'Mobs Killed', value: `${stats.mobs_killed || 0}`, inline: true });
            fields.push({ name: 'Money Spent (Shop)', value: `${stats.money_spent_on_shop || 0}`, inline: true });
            fields.push({ name: 'Money Made (Sell)', value: `${stats.money_made_from_sell || 0}`, inline: true });

            const embed = new EmbedBuilder()
                .setTitle(`${username} — DonutSMP Stats`)
                .setColor(0xffc857)
                .addFields(fields)
                .setFooter({ text: 'DonutSMP' });

            if (stats.uuid) {
                embed.setThumbnail(`https://crafatar.com/avatars/${stats.uuid}?size=256&overlay`);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            console.error('[DONUT] Error:', e.message, e.stack);
            try { 
                await interaction.editReply({ content: 'Error fetching DonutSMP stats.' }); 
            } catch(_){}
        }
    }
};

module.exports = donut;
