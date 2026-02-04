const { purchasethread } = require('../../utils/purchase/purchasethread');

module.exports = {
  name: 'purchaseslot_modal',
  callback: async (client, interaction) => {
    try {
      if (!interaction.isModalSubmit()) return;
      const payerAddress = interaction.fields.getTextInputValue('payer_address').trim();

      // Basic LTC address validation (simple regex)
      const legacyLTCRegex = /^(L|M)[a-zA-Z0-9]{26,33}$|^3[a-zA-Z0-9]{1,32}$/;
      const bech32LTCRegex = /^(ltc1)[a-z0-9]{39,59}$/;
      const isValid = legacyLTCRegex.test(payerAddress) || bech32LTCRegex.test(payerAddress);
      if (!isValid) {
        return interaction.reply({ content: 'Dirección LTC no válida. Por favor verifica e intenta de nuevo.', ephemeral: true });
      }

      // Call purchasethread for slot purchase with payer address
      await purchasethread(client, interaction, 'slot', { payerAddress });
    } catch (e) {
      console.error('Error handling purchaseslot modal submit:', e);
      try { await interaction.reply({ content: 'Error procesando la compra.', ephemeral: true }); } catch (e){}
    }
  }
};
