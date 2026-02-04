const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

async function createTestStatsPanel() {
    const embed = new EmbedBuilder()
        .setColor(0x5f9ea0)
        .setTitle('🧪 Test Stats Panel')
        .setDescription('Click the button below to test the stats channel with a sample player');

    const button = new ButtonBuilder()
        .setCustomId('test_stats_button')
        .setLabel('Test Stats (Notch)')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    return { embeds: [embed], components: [row] };
}

module.exports = createTestStatsPanel;
