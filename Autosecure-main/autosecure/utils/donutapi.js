const axios = require('axios');

const API_BASE = 'https://api.donutsmp.net';
const API_KEY = '1cbc8ccb1ba4c85810b237219c01c20';

async function tryEndpoints(username) {
    const headers = {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
    };

    const candidates = [
        `${API_BASE}/player/${encodeURIComponent(username)}`,
        `${API_BASE}/players/${encodeURIComponent(username)}`,
        `${API_BASE}/player/stats?username=${encodeURIComponent(username)}`,
        `${API_BASE}/players/stats?username=${encodeURIComponent(username)}`
    ];

    for (const url of candidates) {
        try {
            const res = await axios.get(url, { headers, timeout: 8000 });
            if (res && res.status === 200 && res.data) return res.data;
        } catch (e) {
            // try next
        }
    }
    return null;
}

function normalize(data) {
    if (!data) return null;

    // Unwrap common shapes
    const payload = data.data || data.player || data.playerStats || data.stats || data || {};

    const out = {
        username: payload.username || payload.name || payload.playerName || null,
        uuid: payload.uuid || payload.id || payload.playerUUID || null,
        money: payload.money || payload.balance || payload.coins || 0,
        shards: payload.shards || payload.essence || 0,
        playerKills: payload.playerKills || payload.kills || (payload.pvp && payload.pvp.kills) || 0,
        deaths: payload.deaths || (payload.pvp && payload.pvp.deaths) || 0,
        playtimeSeconds: payload.playtime || payload.playTime || payload.secondsPlayed || 0,
        blocksPlaced: payload.blocksPlaced || payload.placed || 0,
        blocksBroken: payload.blocksBroken || payload.broken || 0,
        mobsKilled: payload.mobsKilled || payload.mobs || 0,
        moneySpent: payload.moneySpent || payload.spent || 0,
        moneyMade: payload.moneyMade || payload.earned || 0,
        raw: payload
    };

    return out;
}

async function getDonutStats(username) {
    if (!username) return null;
    const raw = await tryEndpoints(username);
    if (!raw) return null;
    return normalize(raw);
}

module.exports = getDonutStats;
