const { queryParams } = require('../../db/database');
const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { sendFullConfigToUser } = require('../../autosecure/utils/bot/configutils'); 
const deleteuser = require('../../db/deleteuser');
const { tablesforuser } = require('../../db/gettablesarray');
const { autosecurelogs } = require('../../autosecure/utils/embeds/autosecurelogs');
const checkroles = require("../../mainbot/utils/checkroles.js")

const delay = "10";

function extractSnowflake(id) {
    if (!id) return null;
    const s = String(id);
    if (/^\d{17,19}$/.test(s)) return s;
    return null;
}

const checkLicenses = async (client) => {
  //  console.log(`Checking licenses, date: ${Date.now()}`)
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const oneDayFromNow = now + 24 * 60 * 60 * 1000;
    const rows = await queryParams('SELECT * FROM usedLicenses', []);
    
    for (const row of rows) {
        const { license, user_id, expiry, one_day_warning_sent, seven_day_warning_sent, istrial } = row;
        const istrialflag = !!istrial;
        const expiryTime = parseInt(expiry, 10);
        const time = `<t:${Math.floor(expiryTime / 1000)}:R>`;
        

        /// Already expired
        if (expiryTime <= now) {
            try {
                const discordId = extractSnowflake(user_id);
                if (discordId) {
                    await sendFullConfigToUser(discordId, client, istrialflag);
                    await autosecurelogs(null, "config", user_id)
                } else {
                    console.log(`[licensechecker] Skipping DM for non-snowflake user_id: ${user_id}`);
                }
            } catch (error) {
                console.error(`Failed to send full config to user ${user_id} on expiry:`, error);
            }

            const expirationEmbed = new EmbedBuilder()
                .setTitle('Your subscription has expired!')
                .setDescription('Please renew your subscription to regain access.')
                .setColor('#5f9ea0');
            
            try {
                const discordId = extractSnowflake(user_id);
                if (discordId) {
                    await sendMessageWithEmbed(client, discordId, expirationEmbed);
                } else {
                    console.log(`[licensechecker] Skipping expiration DM for non-snowflake user_id: ${user_id}`);
                }
            } catch (error) {
                console.error(`Failed to send expiration embed to user ${user_id}:`, error);
            }
            
                try {
                    await deleteuser(client, user_id);
                } catch (error) {
                    console.error(`Failed to delete user ${user_id} after expiry:`, error);
                }


        /// One day left
        } else if (expiryTime <= oneDayFromNow && !one_day_warning_sent) {
            if (istrial) continue; 
            console.log('sending one-day warning!');
            {
                const discordId = extractSnowflake(user_id);
                if (discordId) {
                    await sendMessage(client, discordId, `Your license will expire ${time}. If you wish to extend your subscription, redeem another license key.`);
                } else {
                    console.log(`[licensechecker] Skipping one-day warning DM for non-snowflake user_id: ${user_id}`);
                }
            }
            await queryParams('UPDATE usedLicenses SET one_day_warning_sent = 1 WHERE license = ?', [license]);


        // Seven Day Left
        } else if (expiryTime <= sevenDaysFromNow && !seven_day_warning_sent && expiryTime > oneDayFromNow) {
            console.log('sending seven-day warning!');
            {
                const discordId = extractSnowflake(user_id);
                if (discordId) {
                    await sendMessage(client, discordId, `Your license will expire ${time}. If you wish to extend your subscription, redeem another license key.`);
                } else {
                    console.log(`[licensechecker] Skipping seven-day warning DM for non-snowflake user_id: ${user_id}`);
                }
            }
            await queryParams('UPDATE usedLicenses SET seven_day_warning_sent = 1 WHERE license = ?', [license]);
        }
    }
};

const sendMessage = async (client, userId, message) => {
    try {
        if (!extractSnowflake(userId)) return console.log(`[sendMessage] Invalid non-snowflake userId: ${userId}`);
        const user = await client.users.fetch(userId);
        if (!user) return console.log('[sendMessage] User not found');
        await user.send(message);
    } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error);
    }
};

const sendMessageWithEmbed = async (client, userId, embed) => {
    try {
        if (!extractSnowflake(userId)) return console.log(`[sendMessageWithEmbed] Invalid non-snowflake userId: ${userId}`);
        const user = await client.users.fetch(userId);
        if (!user) return console.log('[sendMessageWithEmbed] User not found');
        await user.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send message with embed to user ${userId}:`, error);
    }
};

/*
Checking user licenses & user and owner roles
*/

const startLicenseChecker = (client) => {
  checkLicenses(client);
  checkroles(client);

  setInterval(() => {
    checkLicenses(client);
  }, parseInt(delay) * 1000); 

  setInterval(() => {
    checkroles(client);
  }, 30 * 60 * 1000); // 30 minutes
};

module.exports = { startLicenseChecker };
