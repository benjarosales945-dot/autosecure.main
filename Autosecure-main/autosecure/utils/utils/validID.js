const axios = require('axios');

async function validID(userId) {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error('DISCORD_TOKEN not found in environment variables');
        return false;
    }

    const url = `https://discord.com/api/v10/users/${userId}`;
    const headers = {
        Authorization: `Bot ${token}`,
    };

    try {
        const response = await axios.get(url, { headers });


        return response.status === 200;
    } catch (error) {
        console.log(`Invalid irl!`)
        if (error.response && error.response.status === 404) {

            return false;
        }

        return false;
    }
}

module.exports = validID;
