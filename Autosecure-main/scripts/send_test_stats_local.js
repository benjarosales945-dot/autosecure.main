const sendStatsToChannel = require('../mainbot/utils/sendStatsToChannel');

// Mock channel that simulates a text channel
const mockChannel = {
  isTextBased: () => true,
  send: async (payload) => {
    console.log('MOCK CHANNEL: send called with payload keys:', Object.keys(payload));
    if (payload.embeds) console.log('MOCK CHANNEL: embed title:', payload.embeds[0].title || payload.embeds[0].data?.title);
    return { id: 'mockmsg' };
  }
};

// Mock client with channels.cache.get and channels.fetch
const mockClient = {
  channels: {
    // emulate discord.js v14 cache.get
    cache: {
      get: (id) => {
        console.log('MOCK CLIENT: cache.get called for channel id', id);
        return mockChannel;
      }
    },
    // also provide fetch for scripts that use it
    fetch: async (id) => {
      console.log('MOCK CLIENT: fetch called for channel id', id);
      return mockChannel;
    }
  }
};

(async () => {
  try {
    const mockAcc = { newName: 'Notch', email: 'test@example.com' };
    await sendStatsToChannel(mockClient, mockAcc, 'local-script');
    console.log('Local sendStatsToChannel invocation finished');
  } catch (err) {
    console.error('Local invocation error:', err);
  }
})();
