const { owners } = require("../../../config.json");
const sendStatsToChannel = require('../../utils/sendStatsToChannel');

module.exports = {
  name: 'sendteststats',
  description: 'Envía un test de stats (Notch) al canal de stats (OWNER)',
  type: 1,
  async execute(client, interaction) {
    if (!owners.includes(interaction.user.id)) {
      return interaction.reply({ content: "No tienes permiso para usar este comando.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      const mockAcc = { newName: 'Notch', email: 'test@example.com' };
      await sendStatsToChannel(client, mockAcc, interaction.user.tag);
      await interaction.editReply({ content: '✅ Test enviado al canal de stats (si está configurado).', ephemeral: true });
    } catch (err) {
      console.error('sendteststats error:', err);
      await interaction.editReply({ content: `❌ Error: ${err.message}`, ephemeral: true });
    }
  }
};
