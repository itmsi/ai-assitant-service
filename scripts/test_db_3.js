const { raw } = require('../src/repository/postgres/core_postgres');

async function test() {
  try {
    console.log("Creating FDW extension and tables...");
    await raw(`
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER IF NOT EXISTS gate_sso_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'localhost', port '5432', dbname 'gate_sso');

CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
    SERVER gate_sso_server
    OPTIONS (user 'postgres', password 'postgres');

CREATE FOREIGN TABLE IF NOT EXISTS gate_sso_employees (
      employee_id uuid,
      employee_name varchar(255),
      employee_email varchar(255),
      employee_id_netsuite varchar(255)
    )
    SERVER gate_sso_server
    OPTIONS (schema_name 'public', table_name 'employees');

CREATE FOREIGN TABLE IF NOT EXISTS gate_sso_mcp_credentials (
      mcp_credential_id uuid,
      client_id varchar(255),
      client_secret varchar(255),
      client_secret_hash varchar(255),
      status varchar(255),
      employee_id uuid
    )
    SERVER gate_sso_server
    OPTIONS (schema_name 'public', table_name 'mcp_credentials');

CREATE FOREIGN TABLE IF NOT EXISTS gate_sso_mcp_credential_permissions (
      id uuid,
      mcp_credential_id uuid,
      menu_id uuid,
      data_scope text,
      actions jsonb
    )
    SERVER gate_sso_server
    OPTIONS (schema_name 'public', table_name 'mcp_credential_permissions');

CREATE FOREIGN TABLE IF NOT EXISTS gate_sso_menus (
      menu_id uuid,
      menu_key varchar(255),
      menu_name varchar(255),
      menu_url varchar(255),
      menu_icon varchar(255),
      menu_order integer
    )
    SERVER gate_sso_server
    OPTIONS (schema_name 'public', table_name 'menus');
    `);
    console.log("Successfully created FDW tables.");
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
test();
