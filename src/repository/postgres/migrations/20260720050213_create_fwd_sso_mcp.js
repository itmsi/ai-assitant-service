/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {

};

/** 
 * manual query
 CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER IF NOT EXISTS gate_sso_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'localhost', port '5432', dbname 'gate_sso');


CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
    SERVER gate_sso_server
    OPTIONS (user 'msiserver', password 'Rubysa179596!');


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
    

    -- DROP
    DROP FOREIGN TABLE IF EXISTS gate_sso_employees;
    DROP FOREIGN TABLE IF EXISTS gate_sso_mcp_credentials;
    DROP FOREIGN TABLE IF EXISTS gate_sso_mcp_credential_permissions;
    DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER gate_sso_server;
    DROP SERVER IF EXISTS gate_sso_server;
    DROP EXTENSION IF EXISTS postgres_fdw;

 */
