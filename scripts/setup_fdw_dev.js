const { Client } = require('pg');

const client = new Client({
  user: 'falaqmsi',
  host: 'localhost',
  database: 'ai_assistant',
  password: 'postgres',
  port: 5432,
});

async function setup() {
  try {
    await client.connect();
    console.log("Connected to ai_assistant DB.");
    
    await client.query(`
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
    console.log("Successfully created FDW tables in ai_assistant DB.");
    
    const res = await client.query(`
      SELECT p.*, m.menu_key 
      FROM gate_sso_mcp_credential_permissions p
      LEFT JOIN gate_sso_menus m ON p.menu_id = m.menu_id
      LIMIT 1
    `);
    console.log("Test fetch from FDW:", JSON.stringify(res.rows, null, 2));

  } catch(e) {
    console.error("Error setting up FDW:", e.message);
  } finally {
    await client.end();
  }
}

setup();
