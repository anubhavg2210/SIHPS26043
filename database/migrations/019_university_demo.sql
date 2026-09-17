-- Migration 019: University Profiles and Demo Accounts

-- 1. Create university_profiles table to map users to institutions
CREATE TABLE IF NOT EXISTS university_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    designation VARCHAR(255) DEFAULT 'University Admin'
);

-- 2. Seed Demo University Accounts
INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] IIT (ISM) Dhanbad', 'university.dhanbad@demo.civicsync', 'dummyhash', 'UNIVERSITY'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'university.dhanbad@demo.civicsync');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] BIT Mesra', 'university.ranchi@demo.civicsync', 'dummyhash', 'UNIVERSITY'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'university.ranchi@demo.civicsync');

-- 3. Link Demo Accounts to Institutions
INSERT INTO university_profiles (user_id, institution_id)
SELECT u.id, 1 -- 1 is IIT (ISM) Dhanbad in seed.sql
FROM users u WHERE u.email = 'university.dhanbad@demo.civicsync'
AND NOT EXISTS (SELECT 1 FROM university_profiles WHERE user_id = u.id);

INSERT INTO university_profiles (user_id, institution_id)
SELECT u.id, 2 -- 2 is BIT Mesra in seed.sql
FROM users u WHERE u.email = 'university.ranchi@demo.civicsync'
AND NOT EXISTS (SELECT 1 FROM university_profiles WHERE user_id = u.id);
