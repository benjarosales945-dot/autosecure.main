const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const getStats = require('../../autosecure/utils/hypixelapi/getStats.js');

/**
 * Get Minecraft UUID from username
 * @param {String} username - Minecraft username
 * @returns {Promise<String>} UUID
 */
async function getMcUUID(username) {
    try {
        const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        return response.data.id;
    } catch (err) {
        console.warn('[StatsImage] Failed to get UUID:', err.message);
        return null;
    }
}

/**
 * Get player cape URL
 * @param {String} uuid - Minecraft UUID
 * @returns {Promise<String|null>} Cape image URL or null
 */
async function getPlayerCape(uuid) {
    try {
        const response = await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
        if (response.data.properties) {
            const texturesProperty = response.data.properties.find(p => p.name === 'textures');
            if (texturesProperty) {
                const texturesData = JSON.parse(Buffer.from(texturesProperty.value, 'base64').toString());
                if (texturesData.textures && texturesData.textures.CAPE) {
                    return texturesData.textures.CAPE.url;
                }
            }
        }
        return null;
    } catch (err) {
        console.warn('[StatsImage] Failed to get cape:', err.message);
        return null;
    }
}

/**
 * Sends stats image to channel using the new template design
 * @param {Object} client - Discord client
 * @param {Object} acc - Account object with newName (Minecraft username)
 * @returns {Promise<Buffer>} PNG buffer with stats image
 */
async function generateStatsImage(acc) {
    try {
        // Get player stats from Hypixel API
        let playerStats = null;
        try {
            playerStats = await getStats(acc.newName);
        } catch (statsErr) {
            console.warn('[StatsImage] Failed to fetch stats:', statsErr.message || statsErr);
            playerStats = {
                skyblock_level: 0,
                nw: 0,
                coop_members: 0,
                skill_average: 0,
                catacomb_level: 0,
                network_level: 0,
                network_exp: 0,
                skywars_kills: 0,
                skywars_deaths: 0,
                skywars_wins: 0,
                bedwars_fk: 0,
                bedwars_final_kills: 0,
                bedwars_deaths: 0,
                bedwars_final_deaths: 0,
                bedwars_wins: 0,
                duel_kills: 0,
                duel_wins: 0,
                duel_losses: 0
            };
        }

        // Combine: Notch face as background, secured account face overlay, and all stats/texts
        const templatePath = path.join(__dirname, '../../assets/stats_template_new.png');
        if (!fs.existsSync(templatePath)) {
            throw new Error('Template not found at ' + templatePath);
        }
        const template = await loadImage(templatePath);
        const width = 1522;
        const height = 856;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        // Draw Notch face as background (stretched to fit)
        const notchUUID = '069a79f444e94726a5befca90e38aaf5';
        const notchFaceUrl = `https://visage.surgeplay.com/face/${notchUUID}?size=1024`;
        const notchFaceImg = await loadImage(notchFaceUrl);
        ctx.drawImage(notchFaceImg, 0, 0, width, height);
        // Draw template overlay
        ctx.drawImage(template, 0, 0, width, height);
        // Overlay secured account face (centered, large square)
        const uuid = await getMcUUID(acc.newName);
        if (uuid) {
            const userFaceUrl = `https://visage.surgeplay.com/face/${uuid}?size=400`;
            const userFaceImg = await loadImage(userFaceUrl);
            // Center the overlay (400x400)
            const overlaySize = 400;
            const x = (width - overlaySize) / 2;
            const y = (height - overlaySize) / 2 - 100;
            ctx.drawImage(userFaceImg, x, y, overlaySize, overlaySize);
        }
        // ...existing code for drawing stats and texts...
        // Draw player name (masked: N***h)
        const maskedName = maskPlayerName(acc.newName);
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(maskedName, width / 2, 120);
        // Draw login info (top right)
        const firstLogin = acc.firstLogin || 'Unknown';
        const lastLogin = acc.lastLogin || 'Unknown';
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText(`First Login: ${firstLogin}`, width - 80, 100);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Last Login: ${lastLogin}`, width - 80, 140);
        // Draw Skyblock stats
        const sbLevel = playerStats.skyblock_level || 0;
        const netWorth = playerStats.nw ? formatNumber(playerStats.nw) : '0';
        const skillAvg = playerStats.skill_average || 0;
        const catacombs = playerStats.catacomb_level || 0;
        const coopMembers = playerStats.coop_members || 0;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('Skyblock Level: ' + sbLevel, 400, 240);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Net Worth: ' + netWorth, 400, 270);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Skill Average: ' + skillAvg, 400, 300);
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Catacombs: ' + catacombs, 400, 330);
        // Draw Network Level
        const networkLevel = playerStats.network_level || 0;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Network Level: ' + networkLevel, 850, 240);
        ctx.fillStyle = '#00BFFF';
        ctx.fillText('0 / 10,000', 850, 270);
        // Draw Skywars stats
        const skywarStars = playerStats.skywars_wins || 0;
        const skywarKills = playerStats.skywars_kills || 0;
        // ...existing code continues...

        // Draw Minecraft cape if available
        try {
            const uuid = await getMcUUID(acc.newName);
            if (uuid) {
                const capeUrl = await getPlayerCape(uuid);
                if (capeUrl) {
                    const capeImage = await loadImage(capeUrl);
                    // Draw cape in top-left corner (50x50px, scaled)
                    ctx.drawImage(capeImage, 20, 20, 80, 120);
                }
            }
        } catch (capeErr) {
            console.warn('[StatsImage] Cape rendering error:', capeErr.message);
        }

        // Draw player name (masked: N***h)
        const maskedName = maskPlayerName(acc.newName);
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(maskedName, 250, 120);

        // Draw login info (top right)
        const firstLogin = acc.firstLogin || 'Unknown';
        const lastLogin = acc.lastLogin || 'Unknown';
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText(`First Login: ${firstLogin}`, width - 80, 100);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Last Login: ${lastLogin}`, width - 80, 140);

        // Draw Skyblock stats
        const sbLevel = playerStats.skyblock_level || 0;
        const netWorth = playerStats.nw ? formatNumber(playerStats.nw) : '0';
        const skillAvg = playerStats.skill_average || 0;
        const catacombs = playerStats.catacomb_level || 0;
        const coopMembers = playerStats.coop_members || 0;

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('Skyblock Level: ' + sbLevel, 400, 240);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Net Worth: ' + netWorth, 400, 270);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Skill Average: ' + skillAvg, 400, 300);
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Catacombs: ' + catacombs, 400, 330);

        // Draw Network Level
        const networkLevel = playerStats.network_level || 0;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Network Level: ' + networkLevel, 850, 240);
        ctx.fillStyle = '#00BFFF';
        ctx.fillText('0 / 10,000', 850, 270);

        // Draw Skywars stats
        const skywarStars = playerStats.skywars_wins || 0;
        const skywarKills = playerStats.skywars_kills || 0;
        const skywarDeaths = playerStats.skywars_deaths || 0;

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00FF00';
        ctx.textAlign = 'left';
        ctx.fillText('Stars: ' + skywarStars, 1100, 240);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Kills: ' + skywarKills, 1100, 270);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Deaths: ' + skywarDeaths, 1100, 300);

        // Draw Bedwars stats
        const bedwarStars = playerStats.bedwars_wins || 0;
        const bedwarFKDR = playerStats.bedwars_fk ? (playerStats.bedwars_final_deaths ? (playerStats.bedwars_fk / playerStats.bedwars_final_deaths).toFixed(2) : playerStats.bedwars_fk) : '0.00';
        const bedwarWinstreak = playerStats.bedwars_wins || 0;

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00BFFF';
        ctx.textAlign = 'left';
        ctx.fillText('Stars: ' + bedwarStars, 400, 550);
        ctx.fillStyle = '#FF6347';
        ctx.fillText('FKDR: ' + bedwarFKDR, 400, 580);
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Winstreak: ' + bedwarWinstreak, 400, 610);

        // Draw Duels stats
        const duelWins = playerStats.duel_wins || 0;
        const duelKills = playerStats.duel_kills || 0;
        const duelLosses = playerStats.duel_losses || 0;

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00FF00';
        ctx.textAlign = 'left';
        ctx.fillText('Wins: ' + duelWins, 850, 550);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Kills: ' + duelKills, 850, 580);
        ctx.fillStyle = '#FF6347';
        ctx.fillText('Losses: ' + duelLosses, 850, 610);

        const buffer = canvas.toBuffer('image/png');
        return buffer;

    } catch (err) {
        console.error('[StatsImage] Error generating stats image:', err.message);
        throw err;
    }
}

/**
 * Masks a player name with asterisks
 * @param {string} name
 */
function maskPlayerName(name) {
    if (!name || name.length < 2) return '****';
    const first = name[0];
    const last = name[name.length - 1];
    const middle = '*'.repeat(Math.max(0, name.length - 2));
    return first + middle + last;
}

/**
 * Format number with K, M, B
 */
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

module.exports = {
    generateStatsImage
};
