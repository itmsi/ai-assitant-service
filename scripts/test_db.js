const { raw } = require('../src/repository/postgres/core_postgres');

async function test() {
  try {
    const res = await raw('SELECT p.*, m.menu_key FROM gate_sso_mcp_credential_permissions p LEFT JOIN gate_sso_menus m ON p.menu_id = m.menu_id LIMIT 1');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
test();
