/**
 * DBLINK Utility
 * Utility untuk setup dan menggunakan dblink ke database external (gate_sso)
 */

const { pgCore } = require('../config/database');

let dblinkSetup = false;

/**
 * Force reset dblink connection (untuk reconnect)
 * @returns {Promise<void>}
 */
const forceResetDblink = async () => {
  try {
    console.log('[DBLINK] Force resetting dblink connection...');
    dblinkSetup = false;
    // Disconnect existing connection if any
    await pgCore.raw(`SELECT dblink_disconnect('gate_sso_conn')`).catch(() => {
      // Ignore error if connection doesn't exist
    });
  } catch (error) {
    console.warn('[DBLINK] Error during force reset:', error.message);
  }
};

/**
 * Setup dblink extension dan connection ke database gate_sso
 * @param {Boolean} forceReconnect - Force reconnect even if connection exists
 * @returns {Promise<Boolean>} True if setup successful
 */
const setupDblink = async (forceReconnect = false) => {
  try {
    // Force reconnect if requested
    if (forceReconnect) {
      await forceResetDblink();
    }
    
    // Only setup once, but verify connection is still alive
    if (dblinkSetup && !forceReconnect) {
      // Test if connection is still alive
      try {
        await pgCore.raw(`
          SELECT * FROM dblink(
            'gate_sso_conn',
            'SELECT 1 as test'
          ) AS t(test INTEGER)
        `);
        console.log('[DBLINK] Connection verified and still alive');
        return true;
      } catch (testError) {
        console.warn('[DBLINK] Connection test failed, reconnecting...', testError.message);
        // Reset flag to reconnect
        await forceResetDblink();
      }
    }

    const dbHost = process.env.DB_GATE_SSO_HOST || 'localhost';
    const dbPort = process.env.DB_GATE_SSO_PORT || '5432';
    const dbName = process.env.DB_GATE_SSO_NAME || 'gate_sso';
    const dbUser = process.env.DB_GATE_SSO_USER || 'msiserver';
    const dbPassword = process.env.DB_GATE_SSO_PASSWORD || '';

    console.log('[DBLINK] Setting up connection to:', dbHost, dbPort, dbName, dbUser);

    // Escape single quotes in password
    const escapedPassword = dbPassword.replace(/'/g, "''");

    // Create dblink connection string
    const connectionString = `host=${dbHost} port=${dbPort} dbname=${dbName} user=${dbUser} password=${escapedPassword}`;

    // Check if dblink extension exists, if not create it
    await pgCore.raw('CREATE EXTENSION IF NOT EXISTS dblink').catch((err) => {
      console.warn('[DBLINK] Extension might already exist:', err.message);
    });

    // Disconnect existing connection if any
    await pgCore.raw(`SELECT dblink_disconnect('gate_sso_conn')`).catch(() => {
      // Ignore error if connection doesn't exist
    });

    // Create new dblink connection
    // Use same connection name as in the example: 'gate_sso_conn'
    const connectResult = await pgCore.raw(`
      SELECT dblink_connect(
        'gate_sso_conn',
        '${connectionString}'
      )
    `);

    console.log('[DBLINK] Connection result:', connectResult.rows);

    // Verify connection with a test query
    try {
      await pgCore.raw(`
        SELECT * FROM dblink(
          'gate_sso_conn',
          'SELECT 1 as test'
        ) AS t(test INTEGER)
      `);
      console.log('[DBLINK] Connection verified successfully');
    } catch (verifyError) {
      console.error('[DBLINK] Connection verification failed:', verifyError.message);
      dblinkSetup = false;
      return false;
    }

    dblinkSetup = true;
    console.log('[DBLINK] Connection setup successful');
    return true;
  } catch (error) {
    console.error('[DBLINK] Error setting up dblink:', error.message);
    console.error('[DBLINK] Error stack:', error.stack);
    dblinkSetup = false; // Reset flag on error
    // Don't throw, just return false
    return false;
  }
};

/**
 * Execute dblink query with auto-retry on connection error
 * @param {Function} queryFn - Function that returns a promise with the query
 * @param {Number} maxRetries - Maximum number of retries (default: 1)
 * @returns {Promise<any>} Query result
 */
const executeDblinkQueryWithRetry = async (queryFn, maxRetries = 1) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure dblink is set up (force reconnect on retry)
      const setupSuccess = await setupDblink(attempt > 0);
      if (!setupSuccess) {
        console.error('[DBLINK] Failed to setup dblink connection on attempt', attempt + 1);
        if (attempt === maxRetries) {
          throw new Error('Failed to setup dblink connection after retries');
        }
        continue;
      }

      // Execute query
      const result = await queryFn();
      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';
      
      // Check if error is connection-related
      const isConnectionError = 
        errorMessage.includes('could not establish connection') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('dblink');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[DBLINK] Connection error on attempt ${attempt + 1}, retrying...`, errorMessage);
        // Force reset connection for next attempt
        await forceResetDblink();
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // If not connection error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError || new Error('Query failed after retries');
};

/**
 * Get employee_name and title from gate_sso database using dblink
 * @param {String} employeeId - Employee ID (UUID)
 * @returns {Promise<Object|null>} Object with employee_name and title, or null
 */
const getEmployeeData = async (employeeId) => {
  try {
    if (!employeeId) {
      console.log('[DBLINK] No employeeId provided');
      return null;
    }

    console.log('[DBLINK] Getting employee data for:', employeeId);

    // Build the query string directly with proper escaping
    const escapedId = employeeId.replace(/'/g, "''");
    
    console.log('[DBLINK] Querying employee_id:', employeeId);
    
    const queryResult = await executeDblinkQueryWithRetry(async () => {
      return await pgCore.raw(`
        SELECT employee_name, title
        FROM dblink(
          'gate_sso_conn',
          'SELECT 
            e.employee_id, 
            e.employee_name,
            t.title_name as title
          FROM employees e
          LEFT JOIN titles t ON e.title_id = t.title_id
          WHERE e.employee_id = ''' || '${escapedId}' || ''' AND e.is_delete = false'
        ) AS employee_data(employee_id uuid, employee_name varchar, title varchar)
      `);
    });
    
    console.log('[DBLINK] Raw query result:', JSON.stringify(queryResult, null, 2));
    console.log('[DBLINK] Query result:', queryResult.rows);

    if (queryResult.rows && queryResult.rows.length > 0) {
      const employee = queryResult.rows[0];
      console.log('[DBLINK] Found employee:', employee.employee_name, employee.title);
      return {
        employee_name: employee.employee_name || null,
        title: employee.title || null
      };
    }

    console.log('[DBLINK] No employee data found');
    return null;
  } catch (error) {
    console.error('[DBLINK] Error getting employee data from dblink:', error.message);
    console.error('[DBLINK] Error stack:', error.stack);
    // Return null instead of throwing to avoid breaking the main query
    return null;
  }
};

/**
 * Get employee data for multiple employee IDs using dblink
 * @param {Array<String>} employeeIds - Array of Employee IDs (UUIDs)
 * @returns {Promise<Object>} Object with employee_id as key and {employee_name, title} as value
 */
const getEmployeeDataBatch = async (employeeIds) => {
  try {
    if (!employeeIds || employeeIds.length === 0) {
      console.log('[DBLINK] No employeeIds provided');
      return {};
    }

    console.log('[DBLINK] Getting employee data for:', employeeIds.length, 'employees');

    // Filter valid IDs
    const validIds = employeeIds.filter(id => id);
    if (validIds.length === 0) {
      return {};
    }

    // Ensure dblink connection
    const dblinkConnected = await setupDblink();
    if (!dblinkConnected) {
      console.warn('[DBLINK] Dblink connection failed, returning empty map');
      return {};
    }

    // Optimasi: Escape semua IDs dalam satu query untuk menghindari N+1 query problem
    // Build array literal untuk PostgreSQL
    const idsArray = validIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
    
    if (idsArray.length === 0) {
      return {};
    }

    // Build inner query - must match the dblink definition exactly
    // Left join ke tabel titles untuk mendapatkan employee title
    // Menggunakan array literal untuk menghindari multiple queries
    const innerQuery = `SELECT 
      e.employee_id, 
      e.employee_name,
      t.title_name as title
    FROM employees e
    LEFT JOIN titles t ON e.title_id = t.title_id
    WHERE e.employee_id = ANY(ARRAY[${idsArray}]::uuid[]) AND e.is_delete = false`;

    // Escape the entire inner query dengan mengganti single quote menjadi double single quote
    const escapedInnerQuery = innerQuery.replace(/'/g, "''");

    // Build final query using dblink
    // The dblink definition must match the inner query columns exactly
    const finalQuery = `SELECT employee_id::text, employee_name, title
      FROM dblink('gate_sso_conn', '${escapedInnerQuery}') AS employee_data(
        employee_id uuid, 
        employee_name varchar,
        title varchar
      )`;

    console.log('[DBLINK] Executing batch query for', validIds.length, 'employees');
    console.log('[DBLINK] Employee IDs to query:', validIds.slice(0, 5));
    console.log('[DBLINK] Final query:', finalQuery.substring(0, 500)); // Log first 500 chars
    
    let queryResult;
    try {
      queryResult = await executeDblinkQueryWithRetry(async () => {
        return await pgCore.raw(finalQuery);
      });
    } catch (queryError) {
      console.error('[DBLINK] Query execution failed:', queryError.message);
      console.error('[DBLINK] Query error stack:', queryError.stack);
      // Return empty map instead of throwing
      return {};
    }
    
    console.log('[DBLINK] Query result rows:', queryResult?.rows?.length || 0);
    if (queryResult?.rows && queryResult.rows.length > 0) {
      console.log('[DBLINK] Sample row:', JSON.stringify(queryResult.rows[0], null, 2));
    } else {
      console.warn('[DBLINK] No rows returned from query');
    }

    // Convert result to object
    // Pastikan employee_id dikonversi ke string untuk konsistensi
    const employeeMap = {};
    if (queryResult.rows) {
      queryResult.rows.forEach(row => {
        if (row.employee_id) {
          // Konversi employee_id ke string untuk memastikan format konsisten
          const empId = String(row.employee_id).toLowerCase();
          employeeMap[empId] = {
            employee_name: row.employee_name || null,
            title: row.title || null
          };
        }
      });
    }

    console.log('[DBLINK] Total mapped:', Object.keys(employeeMap).length);
    console.log('[DBLINK] Mapped employee IDs:', Object.keys(employeeMap).slice(0, 5));
    return employeeMap;
  } catch (error) {
    console.error('[DBLINK] Error getting employee data from dblink:', error.message);
    console.error('[DBLINK] Error stack:', error.stack);
    // Return empty object instead of throwing to avoid breaking the main query
    return {};
  }
};

/**
 * Create employee join using dblink (similar to customer join in quotes)
 * Gets employee data from gate_sso database with title from titles table
 * @returns {Object} Knex raw query for employee join
 */
const createEmployeeJoin = () => {
  // Get employee_id, employee_name, and title from titles table
  return pgCore.raw(
    `dblink('gate_sso_conn', 
      'SELECT 
        e.employee_id, 
        e.employee_name,
        t.title_name as title
      FROM employees e
      LEFT JOIN titles t ON e.title_id = t.title_id
      WHERE e.employee_id IS NOT NULL AND e.is_delete = false'
    ) AS employee_data(employee_id uuid, employee_name varchar, title varchar)`
  );
};

/**
 * Close dblink connection
 * @returns {Promise<void>}
 */
const closeDblink = async () => {
  try {
    await pgCore.raw('SELECT dblink_disconnect(\'gate_sso_conn\')').catch(() => {
      // Ignore error if connection doesn't exist
    });
  } catch (error) {
    console.error('Error closing dblink:', error);
  }
};

module.exports = {
  setupDblink,
  forceResetDblink,
  executeDblinkQueryWithRetry,
  getEmployeeData,
  getEmployeeDataBatch,
  createEmployeeJoin,
  closeDblink
};

