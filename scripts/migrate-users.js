const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../src/utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'multilingual_mandi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function runUserMigrations() {
  const pool = new Pool(dbConfig);
  
  try {
    logger.info('Starting user profile database migration...');
    
    // Read and execute user tables migration
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_user_tables.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Split migration into individual statements
    const statements = migration
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await pool.query(statement);
        logger.debug(`Executed: ${statement.substring(0, 50)}...`);
      } catch (error) {
        // Skip errors for statements that might already exist
        if (error.code === '42P07' || error.code === '42710' || error.code === '42P06') {
          logger.debug(`Skipped existing: ${statement.substring(0, 50)}...`);
        } else {
          logger.error(`Error executing statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    // Verify tables were created
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_sessions')
      ORDER BY table_name;
    `;
    
    const result = await pool.query(verifyQuery);
    const tables = result.rows.map(row => row.table_name);
    
    logger.info(`Verified tables created: ${tables.join(', ')}`);
    
    // Verify functions were created
    const functionsQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('cleanup_expired_sessions', 'update_user_last_active', 'is_valid_language', 'is_valid_role', 'get_user_with_session')
      ORDER BY routine_name;
    `;
    
    const functionsResult = await pool.query(functionsQuery);
    const functions = functionsResult.rows.map(row => row.routine_name);
    
    logger.info(`Verified functions created: ${functions.join(', ')}`);
    
    logger.info('User profile database migration completed successfully');
    
    return {
      success: true,
      tables: tables,
      functions: functions
    };
  } catch (error) {
    logger.error('User migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Test database connection
async function testConnection() {
  const pool = new Pool(dbConfig);
  
  try {
    logger.info('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    logger.info(`Database connected successfully at ${result.rows[0].current_time}`);
    logger.info(`Database version: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  (async () => {
    try {
      // Test connection first
      const connected = await testConnection();
      if (!connected) {
        process.exit(1);
      }
      
      // Run migrations
      const result = await runUserMigrations();
      
      logger.info('User migration script completed successfully');
      logger.info(`Tables: ${result.tables.join(', ')}`);
      logger.info(`Functions: ${result.functions.join(', ')}`);
      
      process.exit(0);
    } catch (error) {
      logger.error('User migration script failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { runUserMigrations, testConnection };