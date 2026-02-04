const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: "purchaselicense",
  callback: async (client, interaction) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('Purchase License')
        .setDescription('Selecciona la duración de la licencia que deseas comprar:')
        .setColor('#60a5fa');

      const select = new StringSelectMenuBuilder()
        .setCustomId('purchaselicense')
        .setPlaceholder('Selecciona una duración')
        .addOptions([
          { label: '30 días', value: '30' },
          { label: '60 días', value: '60' },
          { label: '90 días', value: '90' },
          { label: '120 días', value: '120' }
        ]);

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (e) {
      console.error('Error in purchaselicense button:', e);
      return interaction.reply({ content: 'Error opening purchase menu.', ephemeral: true });
    }
  }
};
