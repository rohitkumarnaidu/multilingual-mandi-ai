/**
 * Database Schema Tests
 * Tests for database schema structure and migration scripts
 * Validates Requirements 7.1, 7.2, 7.3
 */

const fs = require('fs');
const path = require('path');

describe('Database Schema', () => {
  describe('Schema Files', () => {
    test('should have main schema file', () => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    test('should have user tables migration file', () => {
      const migrationPath = path.join(__dirname, '../../../database/migrations/001_create_user_tables.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    test('should have migration script', () => {
      const scriptPath = path.join(__dirname, '../../../scripts/migrate-users.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });

  describe('Schema Content Validation', () => {
    let schemaContent;
    let migrationContent;

    beforeAll(() => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const migrationPath = path.join(__dirname, '../../../database/migrations/001_create_user_tables.sql');
      
      schemaContent = fs.readFileSync(schemaPath, 'utf8');
      migrationContent = fs.readFileSync(migrationPath, 'utf8');
    });

    test('should define users table with required columns', () => {
      expect(schemaContent).toContain('CREATE TABLE users');
      expect(schemaContent).toContain('user_id UUID PRIMARY KEY');
      expect(schemaContent).toContain('preferred_language VARCHAR(5) NOT NULL');
      expect(schemaContent).toContain('role VARCHAR(20) NOT NULL');
      expect(schemaContent).toContain('location_state VARCHAR(100)');
      expect(schemaContent).toContain('location_district VARCHAR(100)');
      expect(schemaContent).toContain('location_market VARCHAR(100)');
      expect(schemaContent).toContain('voice_enabled BOOLEAN DEFAULT true');
      expect(schemaContent).toContain('negotiation_style VARCHAR(20) DEFAULT \'balanced\'');
      expect(schemaContent).toContain('price_alerts BOOLEAN DEFAULT true');
      expect(schemaContent).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
      expect(schemaContent).toContain('last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
      expect(schemaContent).toContain('updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
    });

    test('should define user_sessions table with required columns', () => {
      expect(schemaContent).toContain('CREATE TABLE user_sessions');
      expect(schemaContent).toContain('session_id UUID PRIMARY KEY');
      expect(schemaContent).toContain('user_id UUID REFERENCES users(user_id) ON DELETE CASCADE');
      expect(schemaContent).toContain('session_token VARCHAR(255) UNIQUE NOT NULL');
      expect(schemaContent).toContain('expires_at TIMESTAMP WITH TIME ZONE NOT NULL');
      expect(schemaContent).toContain('created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
      expect(schemaContent).toContain('last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
    });

    test('should have language constraints for supported languages', () => {
      const supportedLanguages = ['hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en'];
      const languageConstraint = supportedLanguages.map(lang => `'${lang}'`).join(', ');
      
      expect(schemaContent).toContain(`preferred_language IN (${languageConstraint})`);
    });

    test('should have role constraints for supported roles', () => {
      const supportedRoles = ['vendor', 'buyer', 'farmer', 'trader'];
      const roleConstraint = supportedRoles.map(role => `'${role}'`).join(', ');
      
      expect(schemaContent).toContain(`role IN (${roleConstraint})`);
    });

    test('should have negotiation style constraints', () => {
      const supportedStyles = ['polite', 'assertive', 'balanced'];
      const styleConstraint = supportedStyles.map(style => `'${style}'`).join(', ');
      
      expect(schemaContent).toContain(`negotiation_style IN (${styleConstraint})`);
    });

    test('should have required indexes for performance', () => {
      expect(schemaContent).toContain('CREATE INDEX idx_users_language_role ON users(preferred_language, role)');
      expect(schemaContent).toContain('CREATE INDEX idx_users_location ON users(location_state, location_district, location_market)');
      expect(schemaContent).toContain('CREATE INDEX idx_users_last_active ON users(last_active)');
      expect(schemaContent).toContain('CREATE INDEX idx_user_sessions_token ON user_sessions(session_token)');
      expect(schemaContent).toContain('CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at)');
    });

    test('should have utility functions', () => {
      expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION cleanup_expired_sessions()');
      expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION update_user_last_active(user_uuid UUID)');
      expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    });

    test('should have triggers for automatic timestamp updates', () => {
      expect(schemaContent).toContain('CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users');
      expect(schemaContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
    });

    test('migration file should have same user table structure', () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS user_sessions');
      expect(migrationContent).toContain('user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()');
      expect(migrationContent).toContain('preferred_language VARCHAR(5) NOT NULL');
      expect(migrationContent).toContain('role VARCHAR(20) NOT NULL');
    });

    test('migration file should have validation functions', () => {
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION is_valid_language(lang VARCHAR(5))');
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION is_valid_role(user_role VARCHAR(20))');
      expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION get_user_with_session(session_uuid UUID)');
    });
  });

  describe('Migration Script Validation', () => {
    test('should export required functions', () => {
      const migrationScript = require('../../../scripts/migrate-users.js');
      expect(typeof migrationScript.runUserMigrations).toBe('function');
      expect(typeof migrationScript.testConnection).toBe('function');
    });

    test('migration script should handle database configuration', () => {
      const scriptPath = path.join(__dirname, '../../../scripts/migrate-users.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      expect(scriptContent).toContain('process.env.DB_HOST');
      expect(scriptContent).toContain('process.env.DB_PORT');
      expect(scriptContent).toContain('process.env.DB_NAME');
      expect(scriptContent).toContain('process.env.DB_USER');
      expect(scriptContent).toContain('process.env.DB_PASSWORD');
    });

    test('migration script should have error handling', () => {
      const scriptPath = path.join(__dirname, '../../../scripts/migrate-users.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      expect(scriptContent).toContain('try {');
      expect(scriptContent).toContain('} catch (error) {');
      expect(scriptContent).toContain('logger.error');
    });

    test('migration script should verify table creation', () => {
      const scriptPath = path.join(__dirname, '../../../scripts/migrate-users.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      expect(scriptContent).toContain('information_schema.tables');
      expect(scriptContent).toContain('table_name IN (\'users\', \'user_sessions\')');
    });
  });

  describe('Schema Consistency', () => {
    test('should have consistent column definitions between schema and migration', () => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const migrationPath = path.join(__dirname, '../../../database/migrations/001_create_user_tables.sql');
      
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');

      // Check that key column definitions match
      const keyColumns = [
        'user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
        'preferred_language VARCHAR(5) NOT NULL',
        'role VARCHAR(20) NOT NULL',
        'session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
        'session_token VARCHAR(255) UNIQUE NOT NULL'
      ];

      keyColumns.forEach(column => {
        expect(schemaContent).toContain(column);
        expect(migrationContent).toContain(column);
      });
    });

    test('should have consistent constraints between schema and migration', () => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const migrationPath = path.join(__dirname, '../../../database/migrations/001_create_user_tables.sql');
      
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');

      // Check that key constraints match
      const constraints = [
        'CHECK (preferred_language IN (\'hi\', \'te\', \'ta\', \'kn\', \'bn\', \'mr\', \'en\'))',
        'CHECK (role IN (\'vendor\', \'buyer\', \'farmer\', \'trader\'))',
        'CHECK (negotiation_style IN (\'polite\', \'assertive\', \'balanced\'))'
      ];

      constraints.forEach(constraint => {
        expect(schemaContent).toContain(constraint);
        expect(migrationContent).toContain(constraint);
      });
    });
  });
});