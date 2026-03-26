const env = require('../config/env');
const { pool } = require('./pool');

function assertDevResetAllowed() {
  const isDevContext = ['development', 'test'].includes(env.nodeEnv);
  if (!isDevContext) {
    throw new Error(`reset:dev blocked because NODE_ENV=${env.nodeEnv}. Use development or test only.`);
  }

  if (process.env.DEV_DB_RESET_CONFIRM !== 'RESET_HOPE_DEV_DB') {
    throw new Error(
      'reset:dev blocked. Set DEV_DB_RESET_CONFIRM=RESET_HOPE_DEV_DB to confirm destructive dev reset.'
    );
  }
}

async function resetDevDb() {
  assertDevResetAllowed();
  await pool.query(
    `DO $$
     DECLARE
       rec RECORD;
     BEGIN
       FOR rec IN
         SELECT tablename
         FROM pg_tables
         WHERE schemaname = 'public'
       LOOP
         EXECUTE format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE', 'public', rec.tablename);
       END LOOP;
     END $$;`
  );
}

resetDevDb()
  .then(() => {
    console.log('Development database reset completed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
