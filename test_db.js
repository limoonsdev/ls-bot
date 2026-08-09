const { initializeHybridDB, query, closeHybridDB } = require('./src/database/hybridPool');
(async () => {
  await initializeHybridDB();
  try {
    const res = await query('INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4) ON CONFLICT (combo) DO NOTHING', ['fortnite', 'test:123', 'test', 50]);
    console.log('SUCCESS 1', res);
  } catch (e) {
    console.log('ERROR 1', e.message);
    try {
      const res = await query('INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4)', ['fortnite', 'test:123', 'test', 50]);
      console.log('SUCCESS 2', res);
    } catch(e2) {
      console.log('ERROR 2', e2.message);
    }
  }
  await closeHybridDB();
})();
