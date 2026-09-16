-- Migration 006: Student & Researcher Demo Data
-- 
-- Creates synthetic demo data for student_profiles and researcher_profiles.
-- Naming convention: prefixed with [DEMO]
-- All inserts are idempotent using WHERE NOT EXISTS.

-- 1. Create Demo Users
INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Student Strong', 'student.strong@demo.com', 'dummyhash', 'STUDENT'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student.strong@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Student Medium', 'student.medium@demo.com', 'dummyhash', 'STUDENT'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student.medium@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Student Weak', 'student.weak@demo.com', 'dummyhash', 'STUDENT'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student.weak@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Researcher Strong', 'researcher.strong@demo.com', 'dummyhash', 'RESEARCHER'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'researcher.strong@demo.com');

INSERT INTO users (name, email, password_hash, role)
SELECT '[DEMO] Researcher No Match', 'researcher.nomatch@demo.com', 'dummyhash', 'RESEARCHER'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'researcher.nomatch@demo.com');

-- 2. Create Student Profiles
-- Strong Match: Matches Groundwater, Water Quality, Environmental Engineering (3)
INSERT INTO student_profiles (user_id, institution_id, department_id, course, graduation_year, skills)
SELECT u.id, 1, 1, 'B.Tech Environmental Engineering', 2026, ARRAY['Groundwater', 'Water Quality', 'Environmental Engineering', 'GIS']
FROM users u WHERE u.email = 'student.strong@demo.com'
AND NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = u.id);

-- Medium Match: Matches Water Quality (1)
INSERT INTO student_profiles (user_id, institution_id, department_id, course, graduation_year, skills)
SELECT u.id, 1, 1, 'M.Tech Civil Engineering', 2025, ARRAY['Water Quality', 'AutoCAD', 'Structural Design']
FROM users u WHERE u.email = 'student.medium@demo.com'
AND NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = u.id);

-- Weak Match (No match): Software Engineering
INSERT INTO student_profiles (user_id, institution_id, department_id, course, graduation_year, skills)
SELECT u.id, 2, NULL, 'B.Tech Computer Science', 2027, ARRAY['Java', 'Python', 'React']
FROM users u WHERE u.email = 'student.weak@demo.com'
AND NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = u.id);

-- 3. Create Researcher Profiles
-- Strong Match: Groundwater, Water Treatment (2)
INSERT INTO researcher_profiles (user_id, institution_id, department_id, designation, bio, research_interests)
SELECT u.id, 1, 1, 'Postdoctoral Researcher', 'Focused on aquatic systems and water remediation strategies.', ARRAY['Groundwater', 'Water Treatment', 'Hydrology']
FROM users u WHERE u.email = 'researcher.strong@demo.com'
AND NOT EXISTS (SELECT 1 FROM researcher_profiles WHERE user_id = u.id);

-- No Match: Machine Learning
INSERT INTO researcher_profiles (user_id, institution_id, department_id, designation, bio, research_interests)
SELECT u.id, 2, NULL, 'Research Fellow', 'Deep learning for NLP.', ARRAY['Machine Learning', 'NLP', 'Computer Vision']
FROM users u WHERE u.email = 'researcher.nomatch@demo.com'
AND NOT EXISTS (SELECT 1 FROM researcher_profiles WHERE user_id = u.id);
