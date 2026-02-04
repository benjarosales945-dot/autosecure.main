
const axios = require('axios');

async function getDonutStats(username) {
    if (!username) {
        console.log('[DONUT] No username provided');
        return null;
    }
    const apiKey = process.env.DONUT_API_KEY;
    if (!apiKey) {
        console.log('[DONUT] No API key found in environment');
        return null;

    const axios = require('axios');
    async function getDonutStats(username) {
        if (!username) {
            console.log('[DONUT] No username provided');
            return null;
        }
        const apiKey = process.env.DONUT_API_KEY;
        if (!apiKey) {
            console.log('[DONUT] No API key found');
            return null;
        }
        try {
            const url = `https://api.donutsmp.net/v1/stats/${encodeURIComponent(username)}`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000
            });
            if (response?.data?.result) {
                const r = response.data.result;
                return {
                    money: Number(r.money || 0),
                    shards: Number(r.shards || 0),
                    playerKills: Number(r.kills || 0),
                    deaths: Number(r.deaths || 0),
                    playtimeSeconds: Number(r.playtime || 0),
                    blocksPlaced: Number(r.placed_blocks || 0),
                    blocksBroken: Number(r.broken_blocks || 0),
                    mobsKilled: Number(r.mobs_killed || 0),
                    moneySpent: Number(r.money_spent_on_shop || 0),
                    moneyMade: Number(r.money_made_from_sell || 0)
                };
            }
            return null;
        } catch (e) {
            console.log(`[DONUT] API error: ${e.message}`);
            return null;
        }
    }

    module.exports = getDonutStats;
    return out.trim();
