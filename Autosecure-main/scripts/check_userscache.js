(async () => {
  try {
    const uc = require('../db/usersCache');
    if (!uc || !uc.getUser) return console.error('usersCache module missing or malformed');
    console.log('Calling usersCache.getUser for 691361579417075846...');
    const res = await uc.getUser('691361579417075846');
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  }
})();
