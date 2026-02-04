const { purchasethread } = require("../../utils/purchase/purchasethread");
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: "purchaseslot",
    callback: async (client, interaction) => {
        try {
            const modal = new ModalBuilder()
                .setCustomId('purchaseslot_modal')
                .setTitle('Purchase Bot Slot - Provide LTC address');

            const addressInput = new TextInputBuilder()
                .setCustomId('payer_address')
                .setLabel('Dirección LTC (desde la que pagarás)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Ej: Lh6ZinWUM8b...');

            const row = new ActionRowBuilder().addComponents(addressInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        } catch (e) {
            console.error('Error showing purchaseslot modal:', e);
            try {
                // fallback to create invoice without payer address
                return await purchasethread(client, interaction, "slot");
            } catch (err) {}
        }
    }
};
