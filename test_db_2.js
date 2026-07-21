const { raw } = require('./src/repository/postgres/core_postgres');

async function test() {
  try {
    const res = await raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' AND table_name LIKE '%gate_sso%';
    `);
    console.log("Tables found:", res.rows);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
test();
