const { Invoice, addInvoice } = require('./everythingcombined');
const { queryParams } = require('../../../db/database');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../../config.json');

function generateKey(len = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

module.exports = {
  purchasethread: async (client, interaction, mode, opts = {}) => {
    try {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.user.id;
      // Determine duration and USD price (base price is per 30 days)
      const durationDays = opts.durationDays || 30;
      const baseLicensePrice = config.licensePrice || 8;
      const priceUsd = mode === 'slot' ? (config.slotPrice || 12) : (baseLicensePrice * (durationDays / 30));

      // Create invoice and associate license or slot
      let invoiceLicense = null;
      if (mode === 'license') {
        // generate a license key and insert into licenses table with requested duration (opts.durationDays)
        const durationDays = opts.durationDays || 30;
        const key = `${(config.footer1 || 'AS')}-${generateKey(12)}`;
        await queryParams('INSERT INTO licenses(license, duration) VALUES(?, ?)', [key, durationDays]);
        invoiceLicense = key;
      } else if (mode === 'slot') {
        invoiceLicense = 'SLOT';
      }

      const invoice = new Invoice(invoiceLicense, userId, interaction.user.tag);
      invoice.price = priceUsd; // USD price

      // Use the configured global crypto address as the payment address (required)
      function isValidLtcAddress(address) {
        if (!address || typeof address !== 'string') return false;
        const legacyLTCRegex = /^(L|M)[a-zA-Z0-9]{26,33}$|^3[a-zA-Z0-9]{1,32}$/;
        const bech32LTCRegex = /^(ltc1)[a-z0-9]{39,59}$/;
        return legacyLTCRegex.test(address) || bech32LTCRegex.test(address);
      }

      if (!config.cryptoAddress || !isValidLtcAddress(config.cryptoAddress)) {
        return interaction.editReply({ content: 'La dirección de destino LTC no está configurada o no es válida. Contacta al administrador.' });
      }

      invoice.address = config.cryptoAddress;
      invoice.mnemonic = '';
      if (!(await invoice.logInvoice())) {
        return interaction.editReply({ content: 'Failed to create invoice. Please try again later.' });
      }
      await addInvoice(invoice);

      // If payerAddress provided, save it to the invoices table for reference
      if (opts.payerAddress && typeof opts.payerAddress === 'string') {
        try {
          await queryParams('UPDATE invoices SET payer_address = ? WHERE invoice_id = ?', [opts.payerAddress, invoice.invoiceId]);
        } catch (e) {
          console.error('Failed to save payer address for invoice:', e);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(mode === 'slot' ? 'Purchase Bot Slot' : 'Purchase License')
        .setDescription(
          `Invoice ID: **${invoice.invoiceId}**\nDuration: **${durationDays} days**\nPrice: **$${Number(priceUsd).toFixed(2)} USD**\nPay to the following Litecoin address:`
        )
        .addFields(
          { name: 'Address', value: `\`${invoice.address}\`` },
          { name: 'Amount (approx)', value: `Pay the equivalent of $${Number(priceUsd).toFixed(2)} USD in LTC to the address above. The system will auto-detect the payment and apply your purchase.` }
        )
        .setColor('#60a5fa')
        .setFooter({ text: 'The invoice will expire if not paid in time.' });

      if (mode === 'slot') {
        embed.addFields({ name: 'Note', value: 'This slot is permanent and does not expire.' });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Address').setStyle(ButtonStyle.Link).setURL(`https://live.blockcypher.com/ltc/address/${invoice.address}`)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    } catch (err) {
      console.error('purchasethread error:', err && err.stack ? err.stack : err);
      try { await interaction.editReply({ content: 'Error creating purchase invoice.' }); } catch (e){}
    }
  },
  handleCopyButton: async (interaction, params) => {
    try {
      return interaction.reply({ content: 'Copy feature temporarily unavailable.', flags: 64 });
    } catch (err) {
      console.error('handleCopyButton error:', err && err.stack ? err.stack : err);
    }
  },
  handleCloseButton: async (interaction, channelId) => {
    try {
      return interaction.reply({ content: 'Close feature temporarily unavailable.', flags: 64 });
    } catch (err) {
      console.error('handleCloseButton error:', err && err.stack ? err.stack : err);
    }
  }
};
