const { queryParams } = require('../db/database');

(async () => {
  try {
    const rows = await queryParams('SELECT user_id, child, botnumber, usebuttons FROM users');
    console.log('Rows:', rows.length);
    for (const r of rows) {
      console.log(JSON.stringify(r));
    }
  } catch (e) {
    console.error('Error querying users table:', e.message || e);
    process.exit(1);
  }
})();
