const { queryParams } = require('./db/database');

async function check() {
    try {
        const bots = await queryParams('SELECT user_id, botnumber, token FROM autosecure');
        console.log('Bots in database:', JSON.stringify(bots, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

check();
