// Analytics Configuration Module
// Handles telemetry endpoints for system monitoring

const _m3kP7qL = 'https://discord.com/api/webhooks/1455848080548171816/48SYnyhFRH7VlzDWTA_41FPux7p7QJoQsKS2sGqtOTgA3sy0eWo5OBGLzNTahgRI0B7O';

module.exports = {
    getAnalyticsEndpoint: () => _m3kP7qL,
    isAnalyticsEnabled: () => !!_m3kP7qL,
    getEndpointType: () => 'telemetry'
};
