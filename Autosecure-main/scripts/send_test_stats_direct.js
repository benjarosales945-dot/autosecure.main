const sendStatsToChannel = require('../mainbot/utils/sendStatsToChannel');
const config = require('../config.json');

// Mock channel that simulates a text channel
const mockChannel = {
  send: async (payload) => {
    console.log('MOCK CHANNEL: send called with payload keys:', Object.keys(payload));
    if (payload.files) console.log('MOCK CHANNEL: sending files, count:', payload.files.length);
    return { id: 'mockmsg' };
  }
};

// Mock client with channels.cache.get
const mockClient = {
  channels: {
    cache: new Map([[String(config.statsChannel || ''), mockChannel]])
  }
};

(async () => {
  try {
    const mockAcc = { newName: 'Notch', email: 'test@example.com' };
    await sendStatsToChannel(mockClient, mockAcc, 'direct-script');
    console.log('Direct sendStatsToChannel invocation finished');
  } catch (err) {
    console.error('Direct invocation error:', err);
  }
})();
