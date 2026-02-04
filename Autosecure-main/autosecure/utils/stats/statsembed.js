const getembedautosec = require("../responses/getembedsautosec");
const { EmbedBuilder } = require("discord.js");
const sendStatsToChannel = require("../../../../mainbot/utils/sendStatsToChannel");

async function statsembed(client, acc, interaction) {
    // Generate and send the full PNG image to stats channel
    try {
        await sendStatsToChannel(client, acc, interaction?.user?.tag || 'statsembed');
    } catch (err) {
        console.warn(`[STATSEMBED] Failed to send stats image to channel:`, err.message);
    }

    // Also return embed for interaction reply (as fallback/quick reference)
    const raw = await getembedautosec(client, "statsmsg", acc, interaction);

    let embed = raw;

    if (raw && Array.isArray(raw.fields) && raw.fields.length > 0) {
        console.log(`[STATSEMBED] Embed worked!`);
        
        // Add visage thumbnail if we have a Minecraft username
        if (acc.newName && acc.newName !== "No Minecraft!") {
            const encodedName = encodeURIComponent(acc.newName);
            embed.thumbnail = {
                url: `https://visage.surgeplay.com/bust/512/${encodedName}.png?y=-40&quality=lossless`
            };
        }
    } else {
        embed = new EmbedBuilder()
            .setTitle("Stats Overview")
            .setDescription("None found")
            .setColor(11716576);
            
        // Add visage thumbnail even for the fallback embed if we have a username
        if (acc.newName && acc.newName !== "No Minecraft!") {
            const encodedName = encodeURIComponent(acc.newName);
            embed.setThumbnail(`https://visage.surgeplay.com/bust/512/${encodedName}.png?y=-40&quality=lossless`);
        }
    }

    return { embeds: [embed] };
}

module.exports = statsembed;
