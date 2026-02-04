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
        `${API_BASE}/players/stats?username=${encodeURIComponent(username)}`,
        `${API_BASE}/api/player/${encodeURIComponent(username)}`,
        `${API_BASE}/api/players/${encodeURIComponent(username)}`,
        `${API_BASE}/stats/${encodeURIComponent(username)}`,
        `${API_BASE}/player?username=${encodeURIComponent(username)}`,
        `${API_BASE}/players?username=${encodeURIComponent(username)}`
    ];

    console.log(`[DONUT API] Trying endpoints for username: "${username}"`);
    for (const url of candidates) {
        try {
            console.log(`[DONUT API] Attempting: ${url}`);
            const res = await axios.get(url, { headers, timeout: 8000 });
            console.log(`[DONUT API] Success (${res.status}): ${JSON.stringify(res.data).substring(0, 500)}`);
            if (res && res.status === 200 && res.data) return res.data;
        } catch (e) {
            const status = e.response?.status || e.code || 'unknown';
            const data = e.response?.data ? JSON.stringify(e.response.data).substring(0, 100) : '';
            console.log(`[DONUT API] Failed (${status}): ${url} ${data}`);
        }
    }
    console.log(`[DONUT API] All endpoints failed for username: "${username}"`);
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
    if (!username) {
        console.log('[DONUT API] No username provided');
        return null;
    }
    console.log(`[DONUT API] getDonutStats called for: "${username}"`);
    const raw = await tryEndpoints(username);
    if (!raw) {
        console.log(`[DONUT API] No raw data returned for: "${username}"`);
        return null;
    }
    const normalized = normalize(raw);
    console.log(`[DONUT API] Normalized result:`, JSON.stringify(normalized).substring(0, 200));
    return normalized;
}

module.exports = getDonutStats;
