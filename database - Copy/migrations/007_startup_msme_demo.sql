-- Migration 007: Startup & MSME Matching Demo Data
--
-- Creates synthetic demo organizations (STARTUP and MSME types)
-- and their innovation_profiles for matching against problems.
-- Naming convention: prefixed with [DEMO]
-- All inserts are idempotent using WHERE NOT EXISTS.

-- 1. Demo Organizations — STARTUPs
INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] AquaTech Solutions',
       'STARTUP',
       'AI-powered water quality monitoring and purification systems for rural India.',
       'https://demo.aquatech.example.com',
       'Ranchi',
       'Ranchi'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] AquaTech Solutions');

INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] GreenHydro Innovations',
       'STARTUP',
       'Groundwater remediation technology and sustainable water management solutions.',
       'https://demo.greenhydro.example.com',
       'Dhanbad',
       'Dhanbad'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] GreenHydro Innovations');

INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] WaterBot AI',
       'STARTUP',
       'Conversational AI for water supply monitoring and citizen reporting.',
       'https://demo.waterbot.example.com',
       'Mumbai',
       'Mumbai'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] WaterBot AI');

-- 2. Demo Organizations — MSMEs
INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] Rural Water Works Pvt Ltd',
       'MSME',
       'Water treatment and supply infrastructure for rural communities.',
       'https://demo.ruralwater.example.com',
       'Pune',
       'Pune'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] Rural Water Works Pvt Ltd');

INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] EcoFilter Systems',
       'MSME',
       'Manufacturing affordable water filtration systems using local materials.',
       'https://demo.ecofilter.example.com',
       'Nagpur',
       'Nagpur'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] EcoFilter Systems');

-- 3. No-match organization (different domain entirely)
INSERT INTO organizations (name, organization_type, description, website, district, city)
SELECT '[DEMO] AgroTech Enterprises',
       'MSME',
       'Precision agriculture and soil analysis solutions.',
       'https://demo.agrotech.example.com',
       'Patna',
       'Patna'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = '[DEMO] AgroTech Enterprises');

-- 4. Create corresponding users for innovation_profiles
INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] AquaTech Owner', 'aquatech.owner@demo.com', 'dummyhash', 'STARTUP'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aquatech.owner@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] GreenHydro Owner', 'greenhydro.owner@demo.com', 'dummyhash', 'STARTUP'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'greenhydro.owner@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] WaterBot Owner', 'waterbot.owner@demo.com', 'dummyhash', 'STARTUP'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'waterbot.owner@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Rural Water Owner', 'ruralwater.owner@demo.com', 'dummyhash', 'MSME'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ruralwater.owner@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] EcoFilter Owner', 'ecofilter.owner@demo.com', 'dummyhash', 'MSME'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ecofilter.owner@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] AgroTech Owner', 'agrotech.owner@demo.com', 'dummyhash', 'MSME'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agrotech.owner@demo.com');

-- 5. Innovation Profiles linked to organizations

-- AquaTech: Strong match — Water Quality, Water Treatment, Environmental Engineering (3/4)
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Water Quality', 'Water Treatment', 'Environmental Engineering'],
       'AI-powered monitoring with focus on purification and environmental compliance.'
FROM users u, organizations o
WHERE u.email = 'aquatech.owner@demo.com'
  AND o.name = '[DEMO] AquaTech Solutions'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);

-- GreenHydro: Partial match — Groundwater, Water Treatment (2/4)
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Groundwater', 'Water Treatment'],
       'Groundwater remediation and sustainable water resource management.'
FROM users u, organizations o
WHERE u.email = 'greenhydro.owner@demo.com'
  AND o.name = '[DEMO] GreenHydro Innovations'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);

-- WaterBot: Weak match — Water Quality (1/4)
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Water Quality', 'Artificial Intelligence', 'IoT'],
       'Conversational AI for water supply monitoring.'
FROM users u, organizations o
WHERE u.email = 'waterbot.owner@demo.com'
  AND o.name = '[DEMO] WaterBot AI'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);

-- Rural Water Works: Strong MSME — Water Quality, Water Treatment, Environmental Engineering (3/4)
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Water Quality', 'Water Treatment', 'Environmental Engineering'],
       'Rural water treatment and supply infrastructure with 15+ years experience.'
FROM users u, organizations o
WHERE u.email = 'ruralwater.owner@demo.com'
  AND o.name = '[DEMO] Rural Water Works Pvt Ltd'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);

-- EcoFilter: Partial MSME — Water Quality, Environmental Engineering (2/4)
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Water Quality', 'Environmental Engineering', 'Materials Science'],
       'Affordable filtration using locally sourced materials.'
FROM users u, organizations o
WHERE u.email = 'ecofilter.owner@demo.com'
  AND o.name = '[DEMO] EcoFilter Systems'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);

-- AgroTech: No match — Agriculture, Soil Science
INSERT INTO innovation_profiles (user_id, organization_id, innovation_areas, description)
SELECT u.id, o.id,
       ARRAY['Agriculture', 'Soil Science', 'Remote Sensing'],
       'Precision agriculture and soil analysis for farming communities.'
FROM users u, organizations o
WHERE u.email = 'agrotech.owner@demo.com'
  AND o.name = '[DEMO] AgroTech Enterprises'
  AND NOT EXISTS (SELECT 1 FROM innovation_profiles WHERE user_id = u.id);
