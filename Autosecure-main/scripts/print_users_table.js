const { queryParams } = require('../db/database');

(async () => {
  try {
    const rows = await queryParams('SELECT * FROM users LIMIT 500');
    console.log('Users rows:', rows.length);
    for (const r of rows) {
      console.log(JSON.stringify(r));
    }
  } catch (e) {
    console.error('Error querying users table:', e);
    process.exit(1);
  }
})();
