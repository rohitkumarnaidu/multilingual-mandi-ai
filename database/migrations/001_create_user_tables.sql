-- Migration: Create User Profile Tables
-- Description: Creates user, user_sessions tables and related functions
-- Requirements: 7.1, 7.2, 7.3

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preferred_language VARCHAR(5) NOT NULL CHECK (preferred_language IN ('hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en')),
    role VARCHAR(20) NOT NULL CHECK (role IN ('vendor', 'buyer', 'farmer', 'trader')),
    location_state VARCHAR(100),
    location_district VARCHAR(100),
    location_market VARCHAR(100),
    voice_enabled BOOLEAN DEFAULT true,
    negotiation_style VARCHAR(20) DEFAULT 'balanced' CHECK (negotiation_style IN ('polite', 'assertive', 'balanced')),
    price_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_language_role ON users(preferred_language, role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_state, location_district, location_market);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating users.updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user language
CREATE OR REPLACE FUNCTION is_valid_language(lang VARCHAR(5))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN lang IN ('hi', 'te', 'ta', 'kn', 'bn', 'mr', 'en');
END;
$$ LANGUAGE plpgsql;

-- Function to validate user role
CREATE OR REPLACE FUNCTION is_valid_role(user_role VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_role IN ('vendor', 'buyer', 'farmer', 'trader');
END;
$$ LANGUAGE plpgsql;

-- Function to get user profile with session info
CREATE OR REPLACE FUNCTION get_user_with_session(session_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    preferred_language VARCHAR(5),
    role VARCHAR(20),
    location_state VARCHAR(100),
    location_district VARCHAR(100),
    location_market VARCHAR(100),
    voice_enabled BOOLEAN,
    negotiation_style VARCHAR(20),
    price_alerts BOOLEAN,
    session_id UUID,
    session_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.preferred_language,
        u.role,
        u.location_state,
        u.location_district,
        u.location_market,
        u.voice_enabled,
        u.negotiation_style,
        u.price_alerts,
        us.session_id,
        us.session_token,
        us.expires_at,
        us.last_accessed
    FROM users u
    JOIN user_sessions us ON u.user_id = us.user_id
    WHERE us.session_id = session_uuid 
    AND us.expires_at > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing (optional)
-- This will be handled by the seed script instead

COMMENT ON TABLE users IS 'User profiles with language preferences and role information';
COMMENT ON TABLE user_sessions IS 'User session management for authentication and state persistence';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Utility function to remove expired user sessions';
COMMENT ON FUNCTION update_user_last_active(UUID) IS 'Updates user last_active timestamp';
COMMENT ON FUNCTION is_valid_language(VARCHAR) IS 'Validates if language code is supported';
COMMENT ON FUNCTION is_valid_role(VARCHAR) IS 'Validates if user role is supported';
COMMENT ON FUNCTION get_user_with_session(UUID) IS 'Retrieves user profile with session information';