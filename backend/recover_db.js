const pool = require('./src/config/db');
const fs = require('fs');

async function recover() {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    const schema = `
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(50),
            password_hash VARCHAR(255),
            role VARCHAR(50),
            district VARCHAR(255),
            department VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            is_phone_verified BOOLEAN DEFAULT FALSE,
            is_email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE institutions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            type VARCHAR(100),
            district VARCHAR(100),
            city VARCHAR(100),
            state VARCHAR(100)
        );

        CREATE TABLE departments (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER REFERENCES institutions(id),
            name VARCHAR(255),
            description TEXT
        );

        CREATE TABLE faculty (
            id SERIAL PRIMARY KEY,
            department_id INTEGER REFERENCES departments(id),
            name VARCHAR(255),
            designation VARCHAR(255),
            email VARCHAR(255),
            profile_url VARCHAR(255)
        );

        CREATE TABLE expertise (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            category VARCHAR(100),
            subcategory VARCHAR(100),
            description TEXT,
            keywords TEXT[],
            related_expertise TEXT[]
        );

        CREATE TABLE faculty_expertise (
            faculty_id INTEGER REFERENCES faculty(id),
            expertise_id INTEGER REFERENCES expertise(id),
            PRIMARY KEY (faculty_id, expertise_id)
        );

        CREATE TABLE institution_expertise (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER REFERENCES institutions(id),
            expertise_id INTEGER REFERENCES expertise(id),
            strength_score NUMERIC DEFAULT 100,
            evidence TEXT
        );

        CREATE TABLE problem_clusters (
            id SERIAL PRIMARY KEY,
            cluster_name VARCHAR(255),
            category VARCHAR(100),
            district VARCHAR(100),
            severity VARCHAR(50),
            report_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE problems (
            id SERIAL PRIMARY KEY,
            cluster_id INTEGER REFERENCES problem_clusters(id),
            title VARCHAR(255),
            description TEXT,
            category VARCHAR(100),
            subcategory VARCHAR(100),
            district VARCHAR(100),
            city VARCHAR(100),
            address TEXT,
            latitude NUMERIC,
            longitude NUMERIC,
            available_from DATE,
            available_until DATE,
            status VARCHAR(50) DEFAULT 'OPEN',
            affected_people INTEGER,
            ai_summary TEXT,
            ai_keywords TEXT[],
            required_expertise TEXT[],
            reporter_id INTEGER REFERENCES users(id),
            priority_score NUMERIC DEFAULT 0,
            severity VARCHAR(50),
            urgency VARCHAR(50),
            ai_confidence NUMERIC,
            verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE solutions (
            id SERIAL PRIMARY KEY,
            problem_id INTEGER REFERENCES problems(id),
            submitted_by INTEGER REFERENCES users(id),
            title VARCHAR(255),
            description TEXT,
            methodology TEXT,
            technology TEXT,
            expected_impact TEXT,
            estimated_cost NUMERIC,
            implementation_time VARCHAR(100),
            scalability TEXT,
            required_resources TEXT,
            risks TEXT,
            evidence TEXT,
            benefits TEXT,
            required_budget NUMERIC,
            estimated_timeline_months INTEGER,
            team_id INTEGER,
            status VARCHAR(50) DEFAULT 'SUBMITTED',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE solution_contributors (
            id SERIAL PRIMARY KEY,
            solution_id INTEGER REFERENCES solutions(id),
            user_id INTEGER REFERENCES users(id),
            contribution_role VARCHAR(100),
            contribution_description TEXT
        );

        CREATE TABLE student_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
            department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
            course VARCHAR(255),
            graduation_year INTEGER,
            skills TEXT[]
        );

        CREATE TABLE researcher_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
            department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
            designation VARCHAR(255),
            bio TEXT,
            profile_url VARCHAR(255),
            research_interests TEXT[]
        );

        CREATE TABLE authority_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            department_name VARCHAR(255),
            designation VARCHAR(255),
            district VARCHAR(100)
        );

        CREATE TABLE organizations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            organization_type VARCHAR(50),
            description TEXT,
            website VARCHAR(255),
            district VARCHAR(100),
            city VARCHAR(100)
        );

        CREATE TABLE innovation_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
            innovation_areas TEXT[],
            description TEXT
        );

        CREATE TABLE root_causes (
            id SERIAL PRIMARY KEY,
            problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
            cause TEXT,
            confidence NUMERIC(5,2) DEFAULT 50.00,
            verified BOOLEAN DEFAULT FALSE,
            verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE problem_dependencies (
            id SERIAL PRIMARY KEY,
            problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
            depends_on_problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
            dependency_type VARCHAR(50) DEFAULT 'BLOCKS_SOLUTION',
            confidence NUMERIC(5,2) DEFAULT 50.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_problem_dependency UNIQUE (problem_id, depends_on_problem_id)
        );

        CREATE TABLE reputation (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) UNIQUE,
            score INTEGER DEFAULT 0
        );

        CREATE TABLE badges (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            description TEXT
        );

        CREATE TABLE user_badges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            badge_id INTEGER REFERENCES badges(id),
            awarded_at TIMESTAMP,
            CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
        );
    `;

    await pool.query(schema);
    console.log('Base schema created');

    const seed = `
        INSERT INTO institutions (id, name, type, district, city, state) VALUES 
        (1, 'IIT (ISM) Dhanbad', 'UNIVERSITY', 'Dhanbad', 'Dhanbad', 'Jharkhand'),
        (2, 'BIT Mesra', 'UNIVERSITY', 'Ranchi', 'Ranchi', 'Jharkhand'),
        (3, 'NIT Jamshedpur', 'UNIVERSITY', 'Jamshedpur', 'Jamshedpur', 'Jharkhand'),
        (4, 'Birsa Agricultural University', 'UNIVERSITY', 'Ranchi', 'Ranchi', 'Jharkhand'),
        (5, 'Institution 5', 'UNIVERSITY', 'Unknown', 'Unknown', 'Jharkhand');
        SELECT setval('institutions_id_seq', 5);

        INSERT INTO expertise (id, name, category) VALUES
        (1, 'Groundwater', 'Water'),
        (2, 'Water Quality', 'Water'),
        (3, 'Water Treatment', 'Water'),
        (4, 'Environmental Engineering', 'Environment'),
        (5, 'Civil Engineering', 'Urban Infrastructure'),
        (6, 'Wastewater Treatment', 'Water'),
        (7, 'Agriculture', 'Agriculture'),
        (8, 'Irrigation', 'Agriculture');
        SELECT setval('expertise_id_seq', 8);

        INSERT INTO institution_expertise (institution_id, expertise_id, strength_score) VALUES
        (1, 1, 95), (1, 2, 90), (1, 3, 90), (1, 4, 85),
        (2, 2, 80), (2, 4, 80),
        (3, 5, 85),
        (4, 7, 90), (4, 8, 85);

        INSERT INTO problems (id, title, description, category, subcategory, district, status, priority_score, severity, urgency, required_expertise, affected_people) VALUES
        (1, 'Groundwater Contamination in Borewells', 'Severe yellowing of teeth and joint pains due to fluoride', 'Water', 'Water Quality', 'Palamu', 'OPEN', 85, 'HIGH', 'HIGH', NULL, 14500),
        (2, 'Acid Mine Drainage Contamination', 'Runoff turning local stream acidic with heavy orange precipitate', 'Environment', 'Industrial Waste', 'Dhanbad', 'OPEN', 90, 'CRITICAL', 'HIGH', ARRAY['Water Treatment', 'Environmental Engineering'], 22000),
        (3, 'Leaf Blast Infestation in Kharif Paddy', 'Severe necrotic lesions and rotting stems', 'Agriculture', 'Crop Disease', 'Ranchi', 'OPEN', 80, 'HIGH', 'HIGH', ARRAY['Agriculture'], 8200),
        (4, 'Severe Acidic Soil Degradation', 'Plateau laterite soils dropped to pH 4.2', 'Agriculture', 'Soil Health', 'Gumla', 'OPEN', 75, 'MEDIUM', 'MEDIUM', ARRAY['Agriculture'], 11000),
        (5, 'Arsenic Contamination in Shallow Aquifers', 'Handpumps produce water with arsenic levels over 0.08 mg/L', 'Water', 'Water Quality', 'Sahibganj', 'OPEN', 92, 'CRITICAL', 'HIGH', ARRAY['Water Quality', 'Water Treatment'], 18000),
        (6, 'Urban Waterlogging and Storm Drain Congestion', 'Monsoon rains submerge low-lying residential sectors', 'Urban Infrastructure', 'Drainage', 'East Singhbhum', 'OPEN', 80, 'MEDIUM', 'HIGH', ARRAY['Civil Engineering'], 35000),
        (7, 'High Neonatal and Maternal Anemia', 'Severe hemoglobin deficiency among expectant mothers', 'Healthcare', 'Maternal Health', 'West Singhbhum', 'OPEN', 94, 'CRITICAL', 'HIGH', NULL, 9500),
        (8, 'Endemic Kala-azar Transmission Hotspot', 'Mud houses harbor sandfly vectors causing spikes in visceral leishmaniasis', 'Healthcare', 'Epidemiology', 'Dumka', 'OPEN', 88, 'HIGH', 'HIGH', NULL, 6700),
        (9, 'Collapse of Rural Earth Roads', 'Transport corridors wash out every July stranding buses', 'Urban Infrastructure', 'Rural Roads', 'Koderma', 'OPEN', 76, 'MEDIUM', 'MEDIUM', ARRAY['Civil Engineering'], 16000),
        (10, 'Water Treatment & Groundwater Remediation', 'High fluoride and industrial runoff requiring comprehensive water treatment', 'Water', 'Water Quality', 'Dhanbad', 'OPEN', 95, 'CRITICAL', 'HIGH', ARRAY['Groundwater', 'Water Quality', 'Water Treatment', 'Environmental Engineering'], 25000);
        SELECT setval('problems_id_seq', 10);
    `;
    await pool.query(seed);
    console.log('Seed data inserted');

    const dir = '../database/migrations';
    const files = fs.readdirSync(dir).sort();
    for (const file of files) {
        if (!file.endsWith('.sql')) continue;
        const sql = fs.readFileSync(dir + '/' + file, 'utf8');
        await pool.query(sql);
        console.log('Ran', file);
    }
    
    process.exit(0);
}

recover().catch(e => { console.error(e); process.exit(1); });

