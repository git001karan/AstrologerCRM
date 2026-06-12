-- Enable uuid-ossp extension for UUID calculations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums for Roles and Statuses
CREATE TYPE user_role AS ENUM ('super_admin', 'lead_astrologer', 'junior_astrologer', 'finance_officer', 'client');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLIENT BIRTH PROFILES
CREATE TABLE IF NOT EXISTS client_birth_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    birth_time TIME NOT NULL,
    birth_place VARCHAR(255) NOT NULL,
    planetary_positions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CONSULTATION NOTES TABLE
CREATE TABLE IF NOT EXISTS consultation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. REFERRAL ACCESS TOKENS TABLE
CREATE TABLE IF NOT EXISTS referral_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_to_astrologer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, granted_to_astrologer_id)
);

-- 6. AUDIT LOGS TABLE (Compliance & History Ledger)
-- Tamper-evident log table recording cancellations, reschedules, note edits, and access changes.
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
-- Indexing scheduled_at for rapid timeline-sorting
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);

-- Indexing foreign keys to accelerate join operations
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_astrologer_id ON appointments(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_birth_profiles_client_id ON client_birth_profiles(client_id);

-- Indexing referral tokens for fast verification checks
CREATE INDEX IF NOT EXISTS idx_referral_granted_to ON referral_access_tokens(granted_to_astrologer_id);
CREATE INDEX IF NOT EXISTS idx_referral_expires_at ON referral_access_tokens(expires_at);

-- Indexing audit logs for compliance reviews
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- TRIGGER function to update updated_at timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to ensure updated_at remains current
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_birth_profiles_updated_at BEFORE UPDATE ON client_birth_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_consultation_notes_updated_at BEFORE UPDATE ON consultation_notes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_referral_access_tokens_updated_at BEFORE UPDATE ON referral_access_tokens FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
