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

        CREATE TABLE problem_clusters (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            description TEXT,
            category VARCHAR(100),
            district VARCHAR(100),
            status VARCHAR(50),
            problem_count INTEGER DEFAULT 0
        );

        CREATE TABLE problems (
            id SERIAL PRIMARY KEY,
            cluster_id INTEGER REFERENCES problem_clusters(id),
            title VARCHAR(255),
            description TEXT,
            category VARCHAR(100),
            subcategory VARCHAR(100),
            district VARCHAR(100),
            status VARCHAR(50) DEFAULT 'OPEN',
            affected_people INTEGER,
            required_expertise TEXT[],
            reporter_id INTEGER REFERENCES users(id),
            priority_score NUMERIC DEFAULT 0,
            severity VARCHAR(50),
            urgency VARCHAR(50),
            ai_summary TEXT,
            verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE solutions (
            id SERIAL PRIMARY KEY,
            problem_id INTEGER REFERENCES problems(id),
            title VARCHAR(255),
            description TEXT,
            methodology TEXT,
            benefits TEXT,
            required_budget NUMERIC,
            estimated_timeline_months INTEGER,
            submitted_by INTEGER REFERENCES users(id),
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE solution_contributors (
            id SERIAL PRIMARY KEY,
            solution_id INTEGER REFERENCES solutions(id),
            user_id INTEGER REFERENCES users(id),
            contribution_role VARCHAR(100),
            contribution_description TEXT
        );

        CREATE TABLE student_profiles (
            user_id INTEGER REFERENCES users(id),
            institution_id INTEGER REFERENCES institutions(id),
            department_id INTEGER REFERENCES departments(id),
            course VARCHAR(255),
            graduation_year INTEGER,
            skills TEXT[]
        );

        CREATE TABLE researcher_profiles (
            user_id INTEGER REFERENCES users(id),
            institution_id INTEGER REFERENCES institutions(id),
            department_id INTEGER REFERENCES departments(id),
            designation VARCHAR(255),
            bio TEXT,
            research_interests TEXT[]
        );

        CREATE TABLE authority_profiles (
            user_id INTEGER REFERENCES users(id),
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
            user_id INTEGER REFERENCES users(id),
            organization_id INTEGER REFERENCES organizations(id),
            innovation_areas TEXT[],
            description TEXT
        );

        CREATE TABLE root_causes (
            id SERIAL PRIMARY KEY,
            problem_id INTEGER REFERENCES problems(id),
            cause TEXT,
            confidence NUMERIC(5,2),
            verified BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE problem_dependencies (
            id SERIAL PRIMARY KEY, problem_id INTEGER REFERENCES problems(id), depends_on_problem_id INTEGER REFERENCES problems(id), dependency_type VARCHAR(50), confidence NUMERIC(5,2)
        );
        CREATE TABLE reputation (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, score INTEGER DEFAULT 0
        );
        CREATE TABLE badges (
            id SERIAL PRIMARY KEY, name VARCHAR(255), description TEXT
        );
        CREATE TABLE user_badges (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), badge_id INTEGER REFERENCES badges(id), awarded_at TIMESTAMP
        );
        CREATE TABLE problem_supports (
            id SERIAL PRIMARY KEY, problem_id INTEGER REFERENCES problems(id), user_id INTEGER REFERENCES users(id)
        );
        CREATE TABLE problem_comments (
            id SERIAL PRIMARY KEY, problem_id INTEGER REFERENCES problems(id), user_id INTEGER REFERENCES users(id), content TEXT
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
            faculty_expertise_id VARCHAR(100) PRIMARY KEY,
            faculty_id INTEGER REFERENCES faculty(id),
            expertise_id INTEGER REFERENCES expertise(id),
            confidence_score NUMERIC,
            evidence TEXT,
            source_url TEXT,
            verification_status VARCHAR(50)
        );

        CREATE TABLE institution_expertise (
            mapping_id VARCHAR(100) PRIMARY KEY,
            institution_id INTEGER REFERENCES institutions(id),
            expertise_id INTEGER REFERENCES expertise(id),
            strength_score NUMERIC,
            evidence TEXT,
            source_url TEXT,
            verification_status VARCHAR(50),
            data_status VARCHAR(50)
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
        
        -- Reset sequence since we inserted hardcoded IDs
        SELECT setval('institutions_id_seq', (SELECT MAX(id) FROM institutions));
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
