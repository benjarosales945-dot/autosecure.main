const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../../../config.json');

module.exports = {
    name: 'emailconfig',
    description: 'View or set IMAP email configuration',
    options: [
        {
            name: 'view',
            description: 'View current IMAP/email configuration',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'set',
            description: 'Set IMAP/email configuration (partial updates allowed)',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'host', description: 'IMAP host (ej: imap.gmail.com)', type: ApplicationCommandOptionType.String, required: false },
                { name: 'port', description: 'IMAP port (ej: 993)', type: ApplicationCommandOptionType.Integer, required: false },
                { name: 'user', description: 'IMAP username/email', type: ApplicationCommandOptionType.String, required: false },
                { name: 'password', description: 'IMAP password or app-password', type: ApplicationCommandOptionType.String, required: false },
                { name: 'checkinterval', description: 'Poll interval in seconds', type: ApplicationCommandOptionType.Integer, required: false },
                { name: 'domain', description: 'Catch-all domain to handle (ej: inbox.auto-secure.lol)', type: ApplicationCommandOptionType.String, required: false },
                { name: 'usecatchall', description: 'Enable catch-all/subaddressing (true/false)', type: ApplicationCommandOptionType.Boolean, required: false }
            ]
        }
    ],
    callback: async (client, interaction) => {
        // only allow bot owners to use this command
        const owners = require('../../../config.json').owners || [];
        if (!owners.includes(interaction.user.id)) {
            return interaction.reply({ content: 'Only bot owners can use this command.', flags: 64 });
        }

        const sub = interaction.options.getSubcommand();
        if (sub === 'view') {
            const cfg = require('../../../config.json');
            const emailCfg = cfg.email || {};
            const display = Object.assign({}, emailCfg);
            if (display.password) display.password = '*** (hidden)';
            const embed = new EmbedBuilder()
                .setTitle('IMAP Email Configuration')
                .setDescription('Current configured IMAP/email settings (password hidden)')
                .addFields(Object.entries(display).map(([k, v]) => ({ name: k, value: String(v || ''), inline: true })))
                .setColor('#72c6ff');
            return interaction.reply({ embeds: [embed], flags: 64 });
        } else if (sub === 'set') {
            // read current config
            let cfgRaw = fs.readFileSync(configPath, 'utf8');
            let cfg = JSON.parse(cfgRaw);
            cfg.email = cfg.email || {};

            const updates = {};
            const host = interaction.options.getString('host');
            const port = interaction.options.getInteger('port');
            const user = interaction.options.getString('user');
            const password = interaction.options.getString('password');
            const checkinterval = interaction.options.getInteger('checkinterval');
            const domain = interaction.options.getString('domain');
            const usecatchall = interaction.options.getBoolean('usecatchall');

            if (host) updates.host = host;
            if (port) updates.port = port;
            if (user) updates.user = user;
            if (password) updates.password = password;
            if (checkinterval) updates.checkInterval = checkinterval;
            if (domain) updates.domain = domain;
            if (typeof usecatchall === 'boolean') updates.useCatchAll = usecatchall;

            Object.assign(cfg.email, updates);

            try {
                fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
            } catch (err) {
                console.error('Failed to write config.json:', err);
                return interaction.reply({ content: 'Failed to update config.json. See logs.', flags: 64 });
            }

            return interaction.reply({ content: 'Updated config.json email settings. Restart the bot to apply changes.', flags: 64 });
        }
    }
};
