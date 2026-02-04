const { queryParams } = require('../db/database');

(async () => {
  try {
    await queryParams(`ALTER TABLE users ADD COLUMN usebuttons INTEGER DEFAULT 0`);
    console.log('Added column usebuttons to users (if not exists).');
  } catch (e) {
    console.error('Error adding usebuttons column:', e.message || e);
    process.exit(1);
  }
})();
