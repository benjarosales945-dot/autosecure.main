const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const sendStatsToChannel = require('../mainbot/utils/sendStatsToChannel');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log('Temporary client ready as', client.user?.tag || client.userID);
  try {
    const mockAcc = { newName: 'Notch', email: 'test@example.com' };
    await sendStatsToChannel(client, mockAcc, 'script');
    console.log('sendStatsToChannel invoked');
  } catch (err) {
    console.error('Error invoking sendStatsToChannel:', err);
  } finally {
    setTimeout(() => client.destroy(), 2000);
    setTimeout(() => process.exit(0), 3000);
  }
});

client.login(config.token).catch(err => {
  console.error('Login failed:', err);
  process.exit(1);
});
