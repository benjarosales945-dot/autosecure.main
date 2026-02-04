const { EmbedBuilder } = require('discord.js');
const getStats = require('../../utils/hypixelapi/getStats');

module.exports = {
	name: "p",
	callback: async (client, interaction) => {
		try {
			const customId = interaction.customId;
			if (!customId.startsWith('p_')) return;

			const buttonId = customId.substring(2);
			const buttonMap = {
				'216102854258069609': 'duels',
				'216102860562108523': 'skywars',
				'216102867314937965': 'skyblock',
				'216102874709495919': 'bedwars',
				'216105482849357945': 'claim'
			};
			const buttonType = buttonMap[buttonId];

			if (buttonType === 'claim') {
				await handleClaimButton(client, interaction);
			} else if (['duels', 'skywars', 'skyblock', 'bedwars'].includes(buttonType)) {
				await interaction.reply({
					content: `Stats for ${buttonType} will be shown here.`,
					ephemeral: true
				});
			}
		} catch (error) {
			console.error('[ProfileButtons] Error:', error);
			await interaction.reply({
				content: 'An error occurred while processing this button.',
				ephemeral: true
			}).catch(() => {});
		}
	}
};

async function handleClaimButton(client, interaction) {
	try {
		const message = interaction.message;
		if (!message.embeds || message.embeds.length === 0) {
			return interaction.reply({
				content: 'Could not find account information.',
				ephemeral: true
			});
		}
		const embed = message.embeds[0];
		let mcUsername = null;
		// Extraer el nombre de usuario de Minecraft del título del embed
		// Ejemplo de título: "Elmenda_YT | Minecraft Profile"
		const { EmbedBuilder } = require('discord.js');
		const getStats = require('../../utils/hypixelapi/getStats');
		module.exports = {
	callback: async (client, interaction) => {
		try {
			const customId = interaction.customId;
			if (!customId.startsWith('p_')) return;

			const buttonId = customId.substring(2);
			const buttonMap = {
				'216102854258069609': 'duels',
				'216102860562108523': 'skywars',
				'216102867314937965': 'skyblock',
				'216102874709495919': 'bedwars',
				'216105482849357945': 'claim'
			};
			const buttonType = buttonMap[buttonId];

			if (buttonType === 'claim') {
				await handleClaimButton(client, interaction);
			} else if (['duels', 'skywars', 'skyblock', 'bedwars'].includes(buttonType)) {
				await interaction.reply({
					content: `Stats for ${buttonType} will be shown here.`,
					ephemeral: true
				});
			}
		} catch (error) {
			console.error('[ProfileButtons] Error:', error);
			await interaction.reply({
				content: 'An error occurred while processing this button.',
				ephemeral: true
			}).catch(() => {});
		}
	}
};

async function handleClaimButton(client, interaction) {
	try {
		const message = interaction.message;
		if (!message.embeds || message.embeds.length === 0) {
			return interaction.reply({
				content: 'Could not find account information.',
				ephemeral: true
			});
		}
		const embed = message.embeds[0];
		let mcUsername = null;
		const titleMatch = embed.title?.match(/^([\w\d_]+)\s*\|/);
const { EmbedBuilder } = require('discord.js');
const getStats = require('../../utils/hypixelapi/getStats');

module.exports = {
	name: "p",
	callback: async (client, interaction) => {
		try {
			const customId = interaction.customId;
			if (!customId.startsWith('p_')) return;

			const buttonId = customId.substring(2);
			const buttonMap = {
				'216102854258069609': 'duels',
				'216102860562108523': 'skywars',
				'216102867314937965': 'skyblock',
				'216102874709495919': 'bedwars',
				'216105482849357945': 'claim'
			};
			const buttonType = buttonMap[buttonId];

			if (buttonType === 'claim') {
				await handleClaimButton(client, interaction);
			} else if (['duels', 'skywars', 'skyblock', 'bedwars'].includes(buttonType)) {
				await interaction.reply({
					content: `Stats for ${buttonType} will be shown here.`,
					ephemeral: true
				});
			}
		} catch (error) {
			console.error('[ProfileButtons] Error:', error);
			await interaction.reply({
				content: 'An error occurred while processing this button.',
				ephemeral: true
			}).catch(() => {});
		}
	}
};

async function handleClaimButton(client, interaction) {
	try {
		const message = interaction.message;
		if (!message.embeds || message.embeds.length === 0) {
			return interaction.reply({
				content: 'Could not find account information.',
				ephemeral: true
			});
		}
		const embed = message.embeds[0];
		let mcUsername = null;
		const titleMatch = embed.title?.match(/^([\w\d_]+)\s*\|/);
		if (titleMatch) mcUsername = titleMatch[1];
		if (!mcUsername || mcUsername === '*' || mcUsername === 'Hidden') {
			return interaction.reply({
				content: 'Unable to claim account: No valid Minecraft username found.',
				ephemeral: true
			});
		}
		const stats = await getStats(mcUsername);
		if (!stats) {
			return interaction.reply({
				content: 'Could not fetch account statistics.',
				ephemeral: true
			});
		}
		const accountEmbed = new EmbedBuilder()
			.setColor(0x5f9ea0)
			.setTitle(`Account Claimed: ${mcUsername}`)
			.setDescription(`Successfully claimed account for ${mcUsername}`)
			.addFields(
				{ name: 'Minecraft Account', value: mcUsername, inline: true },
				{ name: 'Claimed By', value: `<@${interaction.user.id}>`, inline: true },
				{ name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
			)
			.setFooter({ text: 'Powered By ILJ' })
			.setTimestamp();
		if (stats.skyblock) {
			accountEmbed.addFields({
				name: 'Skyblock Level',
				value: `${stats.skyblock.skillAverage?.toFixed(1) || 0}`,
				inline: true
			});
		}
		if (stats.network) {
			accountEmbed.addFields({
				name: 'Network Level',
				value: `${stats.network.level || 0}`,
				inline: true
			});
		}
		try {
			const dmChannel = await interaction.user.createDM();
			await dmChannel.send({ embeds: [accountEmbed] });
		} catch (dmError) {
			console.error('[ProfileButtons] Could not send DM:', dmError);
		}
		await interaction.reply({
			content: `✅ Account **${mcUsername}** has been claimed! Check your DMs for account details.`,
			ephemeral: true
		});
	} catch (error) {
		console.error('[ProfileButtons] Error handling claim button:', error);
		await interaction.reply({
			content: 'An error occurred while claiming the account.',
			ephemeral: true
		}).catch(() => {});
	}
}
		if (titleMatch) mcUsername = titleMatch[1];
		if (!mcUsername || mcUsername === '*' || mcUsername === 'Hidden') {
			return interaction.reply({
				content: 'Unable to claim account: No valid Minecraft username found.',
				ephemeral: true
			});
		}
		const stats = await getStats(mcUsername);
		if (!stats) {
			return interaction.reply({
				content: 'Could not fetch account statistics.',
				ephemeral: true
			});
		}
		const accountEmbed = new EmbedBuilder()
			.setColor(0x5f9ea0)
			.setTitle(`Account Claimed: ${mcUsername}`)
			.setDescription(`Successfully claimed account for ${mcUsername}`)
			.addFields(
				{ name: 'Minecraft Account', value: mcUsername, inline: true },
				{ name: 'Claimed By', value: `<@${interaction.user.id}>`, inline: true },
				{ name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
			)
			.setFooter({ text: 'Powered By ILJ' })
			.setTimestamp();
		if (stats.skyblock) {
			accountEmbed.addFields({
				name: 'Skyblock Level',
				value: `${stats.skyblock.skillAverage?.toFixed(1) || 0}`,
				inline: true
			});
		}
		if (stats.network) {
			accountEmbed.addFields({
				name: 'Network Level',
				value: `${stats.network.level || 0}`,
				inline: true
			});
		}
		try {
			const dmChannel = await interaction.user.createDM();
			await dmChannel.send({ embeds: [accountEmbed] });
		} catch (dmError) {
			console.error('[ProfileButtons] Could not send DM:', dmError);
		}
		await interaction.reply({
			content: `✅ Account **${mcUsername}** has been claimed! Check your DMs for account details.`,
			ephemeral: true
		});
	} catch (error) {
		console.error('[ProfileButtons] Error handling claim button:', error);
		await interaction.reply({
			content: 'An error occurred while claiming the account.',
			ephemeral: true
		}).catch(() => {});
	}
}
		if (titleMatch) mcUsername = titleMatch[1];
		if (!mcUsername || mcUsername === '*' || mcUsername === 'Hidden') {
			return interaction.reply({
				content: 'Unable to claim account: No valid Minecraft username found.',
				ephemeral: true
			});
		}
		const stats = await getStats(mcUsername);
		if (!stats) {
			return interaction.reply({
				content: 'Could not fetch account statistics.',
				ephemeral: true
			});
		}
		const accountEmbed = new EmbedBuilder()
			.setColor(0x5f9ea0)
			.setTitle(`Account Claimed: ${mcUsername}`)
			.setDescription(`Successfully claimed account for ${mcUsername}`)
			.addFields(
				{ name: 'Minecraft Account', value: mcUsername, inline: true },
				{ name: 'Claimed By', value: `<@${interaction.user.id}>`, inline: true },
				{ name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
			)
			.setFooter({ text: 'Powered By ILJ' })
			.setTimestamp();
		if (stats.skyblock) {
			accountEmbed.addFields({
				name: 'Skyblock Level',
				value: `${stats.skyblock.skillAverage?.toFixed(1) || 0}`,
				inline: true
			});
		}
		if (stats.network) {
			accountEmbed.addFields({
				name: 'Network Level',
				value: `${stats.network.level || 0}`,
				inline: true
			});
		}
		try {
			const dmChannel = await interaction.user.createDM();
			await dmChannel.send({ embeds: [accountEmbed] });
		} catch (dmError) {
			console.error('[ProfileButtons] Could not send DM:', dmError);
		}
		await interaction.reply({
			content: `✅ Account **${mcUsername}** has been claimed! Check your DMs for account details.`,
			ephemeral: true
		});
	} catch (error) {
		console.error('[ProfileButtons] Error handling claim button:', error);
		await interaction.reply({
			content: 'An error occurred while claiming the account.',
			ephemeral: true
		}).catch(() => {});
	}
}
