const axios = require('axios');

async function getDonutStats(username) {
    if (!username) {
        console.log('[DONUT] No username provided');
        return null;
    }
    console.log(`[DONUT] Fetching stats for: "${username}"`);
    
    try {
        const url = `https://www.donutstats.net/player/${encodeURIComponent(username)}`;
        const response = await axios.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000 
        });
        
        if (!response.data) {
            console.log(`[DONUT] Empty response for: "${username}"`);
            return null;
        }

        const html = response.data;
        
        // Function to extract number from text
        const extractNumber = (text) => {
            if (!text) return 0;
            const match = text.match(/[\d.]+/);
            return match ? parseInt(match[0].replace(/[,.]/g, ''), 10) : 0;
        };

        // Try to extract stats from various HTML structures
        const stats = {
            money: 0,
            shards: 0,
            playerKills: 0,
            deaths: 0,
            playtimeSeconds: 0,
            blocksPlaced: 0,
            blocksBroken: 0,
            mobsKilled: 0,
            moneySpent: 0,
            moneyMade: 0
        };

        // Method 1: Look for text patterns with stat names followed by numbers
        const patterns = {
            money: /(?:money|balance|coins?)[:\s]*\$?\s*([\d,]+)/gi,
            shards: /(?:shard|essence)[:\s]*([\d,]+)/gi,
            playerKills: /(?:kills?|player\s*kills?)[:\s]*([\d,]+)/gi,
            deaths: /(?:death|deaths)[:\s]*([\d,]+)/gi,
            playtimeSeconds: /(?:playtime?|play\s*time)[:\s]*(\d+)[dhms]+/gi,
            blocksPlaced: /(?:blocks?\s*placed|placed)[:\s]*([\d,]+)/gi,
            blocksBroken: /(?:blocks?\s*broken|broken)[:\s]*([\d,]+)/gi,
            mobsKilled: /(?:mobs?\s*killed|mobs?)[:\s]*([\d,]+)/gi,
            moneySpent: /(?:spent|money\s*spent)[:\s]*\$?\s*([\d,]+)/gi,
            moneyMade: /(?:made|earned|money\s*made)[:\s]*\$?\s*([\d,]+)/gi,
        };

        for (const [key, pattern] of Object.entries(patterns)) {
            const match = html.match(pattern);
            if (match && match[1]) {
                let val = match[1].replace(/[,$\s]/g, '');
                stats[key] = isNaN(val) ? 0 : parseInt(val, 10);
            }
        }

        // Method 2: Look for script tags with JSON data (common in React/Next apps)
        const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});?/s);
        if (jsonMatch) {
            try {
                const initialState = JSON.parse(jsonMatch[1]);
                const playerData = initialState?.player || initialState?.playerStats || initialState;
                if (playerData) {
                    stats.money = playerData.money || playerData.balance || stats.money;
                    stats.shards = playerData.shards || stats.shards;
                    stats.playerKills = playerData.playerKills || playerData.kills || stats.playerKills;
                    stats.deaths = playerData.deaths || stats.deaths;
                    stats.blocksPlaced = playerData.blocksPlaced || stats.blocksPlaced;
                    stats.blocksBroken = playerData.blocksBroken || stats.blocksBroken;
                    stats.mobsKilled = playerData.mobsKilled || stats.mobsKilled;
                }
            } catch (e) {
                console.log('[DONUT] Could not parse JSON from HTML');
            }
        }

        const hasData = Object.values(stats).some(v => v > 0);
        if (!hasData) {
            console.log(`[DONUT] No stats found for: "${username}" (all zeros)`);
            return null;
        }

        console.log(`[DONUT] Successfully parsed stats for: "${username}"`, stats);
        return stats;
    } catch (e) {
        console.log(`[DONUT] Error: ${e.message}`);
        return null;
    }
}

module.exports = getDonutStats;
