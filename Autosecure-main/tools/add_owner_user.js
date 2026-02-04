const { queryParams } = require('../db/database');
const cfg = require('../config.json');

async function main() {
  try {
    const ownerFromArg = process.argv[2];
    // Prefer explicit arg, otherwise try to find a likely owner from config, otherwise fallback to known log id
    const fallback = '1465856973919486128';
    let ownerId = ownerFromArg || (Array.isArray(cfg.owners) && cfg.owners[cfg.owners.length - 1]) || fallback;

    ownerId = String(ownerId).trim();

    if (!/^[0-9]+$/.test(ownerId)) {
      console.error('Owner ID appears invalid:', ownerId);
      process.exit(1);
    }

    const botnumber = 1;

    console.log(`Using owner id: ${ownerId}, botnumber: ${botnumber}`);

    const exists = await queryParams('SELECT * FROM users WHERE user_id = ? AND child = ? AND botnumber = ?', [ownerId, ownerId, botnumber]);
    if (exists && exists.length > 0) {
      console.log('Owner entry already exists in users table. No action taken.');
      process.exit(0);
    }

    await queryParams('INSERT INTO users (user_id, child, addedby, botnumber, addedtime) VALUES (?, ?, ?, ?, ?)', [ownerId, ownerId, ownerId, botnumber, Date.now().toString()], 'run');

    console.log('Inserted owner row into users table successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting owner row:', err);
    process.exit(1);
  }
}

main();
