const sendStatsToChannel = require('../../utils/sendStatsToChannel');

module.exports = {
    name: 'test_stats_button',
    userOnly: false,
    callback: async (client, interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Create a mock account with test player
            const mockAccount = {
                newName: 'Notch',
                email: 'test@example.com'
            };

            await sendStatsToChannel(client, mockAccount, interaction.user.tag);

            await interaction.editReply({
                content: '✅ Test stats for **Notch** sent to stats channel!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Test stats button error:', error);
            await interaction.editReply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
