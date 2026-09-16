-- Migration 004: Faculty Matching
--
-- 1. Performance index for expertise_id lookups on faculty_expertise
--    (the primary key covers (faculty_id, expertise_id), but searching
--     by expertise_id alone requires a separate index).
CREATE INDEX IF NOT EXISTS idx_faculty_expertise_expertise_id
    ON faculty_expertise(expertise_id);

-- 2. Performance index for department_id lookups on faculty
CREATE INDEX IF NOT EXISTS idx_faculty_department_id
    ON faculty(department_id);

-- 3. Performance index for institution_id lookups on departments
CREATE INDEX IF NOT EXISTS idx_departments_institution_id
    ON departments(institution_id);

-- ---------------------------------------------------------------------------
-- SYNTHETIC DEMO DATA
--
-- The faculty, departments, and faculty_expertise tables are empty.
-- The following records are clearly synthetic demo data created for the
-- SIH26043 hackathon demonstration only.
--
-- Naming convention: faculty names are prefixed with [DEMO] to make them
-- visually distinguishable from any future real faculty records.
--
-- These inserts are idempotent: they check for existing rows by name
-- before inserting, so re-running this migration does not create duplicates.
-- ---------------------------------------------------------------------------

-- Departments (linked to existing institutions)
-- Institution 1: IIT (ISM) Dhanbad
INSERT INTO departments (institution_id, name, description)
SELECT 1, 'Environmental Science & Engineering',
       'Research in groundwater, water quality, and environmental remediation'
WHERE NOT EXISTS (
    SELECT 1 FROM departments
    WHERE institution_id = 1
      AND name = 'Environmental Science & Engineering'
);

INSERT INTO departments (institution_id, name, description)
SELECT 1, 'Mining & Civil Engineering',
       'Civil infrastructure and sustainable development research'
WHERE NOT EXISTS (
    SELECT 1 FROM departments
    WHERE institution_id = 1
      AND name = 'Mining & Civil Engineering'
);

-- Institution 2: BIT Mesra
INSERT INTO departments (institution_id, name, description)
SELECT 2, 'Environmental Engineering & Management',
       'Water treatment, environmental impact assessment, and GIS'
WHERE NOT EXISTS (
    SELECT 1 FROM departments
    WHERE institution_id = 2
      AND name = 'Environmental Engineering & Management'
);

-- Institution 4: Birsa Agricultural University
INSERT INTO departments (institution_id, name, description)
SELECT 4, 'Soil & Water Conservation',
       'Irrigation, groundwater resource management, and crop systems'
WHERE NOT EXISTS (
    SELECT 1 FROM departments
    WHERE institution_id = 4
      AND name = 'Soil & Water Conservation'
);

-- Faculty members (6 demo records across 4 departments)
-- [DEMO] prefix makes them clearly identifiable as synthetic
INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Amit Sharma',
       'Professor',
       'https://demo.iitism.ac.in/faculty/amit-sharma'
FROM departments d
WHERE d.institution_id = 1
  AND d.name = 'Environmental Science & Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Amit Sharma'
  )
LIMIT 1;

INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Priya Nair',
       'Associate Professor',
       'https://demo.iitism.ac.in/faculty/priya-nair'
FROM departments d
WHERE d.institution_id = 1
  AND d.name = 'Environmental Science & Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Priya Nair'
  )
LIMIT 1;

INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Rajiv Mehta',
       'Assistant Professor',
       'https://demo.iitism.ac.in/faculty/rajiv-mehta'
FROM departments d
WHERE d.institution_id = 1
  AND d.name = 'Mining & Civil Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Rajiv Mehta'
  )
LIMIT 1;

INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Sunita Verma',
       'Professor',
       'https://demo.bitmesra.ac.in/faculty/sunita-verma'
FROM departments d
WHERE d.institution_id = 2
  AND d.name = 'Environmental Engineering & Management'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Sunita Verma'
  )
LIMIT 1;

INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Deepak Kumar',
       'Associate Professor',
       'https://demo.bitmesra.ac.in/faculty/deepak-kumar'
FROM departments d
WHERE d.institution_id = 2
  AND d.name = 'Environmental Engineering & Management'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Deepak Kumar'
  )
LIMIT 1;

INSERT INTO faculty (department_id, name, designation, profile_url)
SELECT d.id,
       '[DEMO] Dr. Rekha Singh',
       'Professor',
       'https://demo.bau.ac.in/faculty/rekha-singh'
FROM departments d
WHERE d.institution_id = 4
  AND d.name = 'Soil & Water Conservation'
  AND NOT EXISTS (
      SELECT 1 FROM faculty WHERE name = '[DEMO] Dr. Rekha Singh'
  )
LIMIT 1;

-- Faculty expertise links
-- Dr. Amit Sharma: Groundwater (1), Water Quality (2), Water Treatment (3), Environmental Engineering (4)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Amit Sharma'
  AND e.name = 'Groundwater'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Amit Sharma'
  AND e.name = 'Water Quality'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Amit Sharma'
  AND e.name = 'Water Treatment'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Amit Sharma'
  AND e.name = 'Environmental Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

-- Dr. Priya Nair: Groundwater (1), Water Quality (2), Environmental Engineering (4)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Priya Nair'
  AND e.name = 'Groundwater'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Priya Nair'
  AND e.name = 'Water Quality'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Priya Nair'
  AND e.name = 'Environmental Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

-- Dr. Rajiv Mehta: Civil Engineering (14), Groundwater (1)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Rajiv Mehta'
  AND e.name = 'Civil Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Rajiv Mehta'
  AND e.name = 'Groundwater'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

-- Dr. Sunita Verma: Water Quality (2), Water Treatment (3), Environmental Engineering (4), Wastewater Treatment (5)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Sunita Verma'
  AND e.name = 'Water Quality'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Sunita Verma'
  AND e.name = 'Water Treatment'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Sunita Verma'
  AND e.name = 'Environmental Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Sunita Verma'
  AND e.name = 'Wastewater Treatment'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

-- Dr. Deepak Kumar: Water Quality (2), Environmental Engineering (4)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Deepak Kumar'
  AND e.name = 'Water Quality'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Deepak Kumar'
  AND e.name = 'Environmental Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

-- Dr. Rekha Singh: Groundwater (1), Agriculture (6), Irrigation (7)
INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Rekha Singh'
  AND e.name = 'Groundwater'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Rekha Singh'
  AND e.name = 'Agriculture'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );

INSERT INTO faculty_expertise (faculty_id, expertise_id)
SELECT f.id, e.id
FROM faculty f, expertise e
WHERE f.name = '[DEMO] Dr. Rekha Singh'
  AND e.name = 'Irrigation'
  AND NOT EXISTS (
      SELECT 1 FROM faculty_expertise fe2
      WHERE fe2.faculty_id = f.id AND fe2.expertise_id = e.id
  );
