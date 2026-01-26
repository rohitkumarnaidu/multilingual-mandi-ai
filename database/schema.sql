-- Multilingual Mandi Database Schema
-- PostgreSQL Database Schema for the Multilingual Mandi Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
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
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commodities table
CREATE TABLE commodities (
    commodity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    name_te VARCHAR(100),
    name_ta VARCHAR(100),
    name_kn VARCHAR(100),
    name_bn VARCHAR(100),
    name_mr VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality_grades TEXT[], -- Array of quality grades
    peak_months INTEGER[], -- Array of peak season months (1-12)
    off_season_months INTEGER[], -- Array of off-season months (1-12)
    regional_names JSONB, -- Regional name variations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Price data table
CREATE TABLE price_data (
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commodity_id UUID REFERENCES commodities(commodity_id) ON DELETE CASCADE,
    location_state VARCHAR(100) NOT NULL,
    location_district VARCHAR(100) NOT NULL,
    location_market VARCHAR(100) NOT NULL,
    price_min DECIMAL(10,2) NOT NULL,
    price_max DECIMAL(10,2) NOT NULL,
    price_modal DECIMAL(10,2) NOT NULL,
    quality VARCHAR(50),
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    source VARCHAR(100) NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Translation cache table
CREATE TABLE translation_cache (
    cache_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_text TEXT NOT NULL,
    source_lang VARCHAR(5) NOT NULL,
    target_lang VARCHAR(5) NOT NULL,
    translation TEXT NOT NULL,
    context VARCHAR(100),
    confidence DECIMAL(3,2) DEFAULT 0.9,
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_text, source_lang, target_lang, context)
);

-- Communication sessions table
CREATE TABLE communication_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    commodity_id UUID REFERENCES commodities(commodity_id),
    commodity_quantity DECIMAL(10,2),
    commodity_quality VARCHAR(50),
    agreed_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'moderated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES communication_sessions(session_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    original_language VARCHAR(5) NOT NULL,
    translations JSONB, -- Translations in different languages
    moderation_flags TEXT[], -- Array of moderation flags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Negotiation contexts table
CREATE TABLE negotiation_contexts (
    context_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES communication_sessions(session_id) ON DELETE CASCADE,
    current_offer DECIMAL(10,2),
    market_min DECIMAL(10,2),
    market_max DECIMAL(10,2),
    conversation_history JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market insights table
CREATE TABLE market_insights (
    insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_state VARCHAR(100) NOT NULL,
    region_district VARCHAR(100),
    insight_date DATE NOT NULL,
    high_demand_commodities UUID[], -- Array of commodity IDs
    price_trends JSONB, -- Price trend data
    trading_tips JSONB, -- AI-generated tips by language
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region_state, region_district, insight_date)
);

-- Indexes for performance optimization
CREATE INDEX idx_users_language_role ON users(preferred_language, role);
CREATE INDEX idx_users_location ON users(location_state, location_district, location_market);
CREATE INDEX idx_users_last_active ON users(last_active);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_commodities_category ON commodities(category);
CREATE INDEX idx_commodities_name_en ON commodities(name_en);

CREATE INDEX idx_price_data_commodity ON price_data(commodity_id);
CREATE INDEX idx_price_data_location ON price_data(location_state, location_district, location_market);
CREATE INDEX idx_price_data_recorded_at ON price_data(recorded_at);

CREATE INDEX idx_translation_cache_lookup ON translation_cache(source_lang, target_lang, source_text);
CREATE INDEX idx_translation_cache_access ON translation_cache(last_accessed);

CREATE INDEX idx_communication_sessions_participants ON communication_sessions(vendor_id, buyer_id);
CREATE INDEX idx_communication_sessions_status ON communication_sessions(status);
CREATE INDEX idx_communication_sessions_activity ON communication_sessions(last_activity);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_negotiation_contexts_session ON negotiation_contexts(session_id);
CREATE INDEX idx_negotiation_contexts_status ON negotiation_contexts(status);

CREATE INDEX idx_market_insights_region_date ON market_insights(region_state, region_district, insight_date);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commodities_updated_at BEFORE UPDATE ON commodities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_sessions_updated_at BEFORE UPDATE ON communication_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_negotiation_contexts_updated_at BEFORE UPDATE ON negotiation_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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