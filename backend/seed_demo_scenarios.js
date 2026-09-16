const pool = require("./src/config/db");

const DEMO_PROBLEMS = [
  {
    title: "Unsafe drinking water in village school",
    description: "Students in a rural school are facing unsafe drinking water due to suspected groundwater contamination and high turbidity in handpump discharge.",
    category: "Water & Sanitation",
    subcategory: "Water Quality",
    district: "Bokaro",
    city: "Chas Block",
    address: "Government Middle School, Chas",
    status: "OPEN",
    severity: "HIGH",
    urgency: "HIGH",
    priority_score: 75.0,
    affected_people: 450,
    required_expertise: ["Water Quality", "Groundwater Hydrology", "Environmental Engineering"],
    ai_summary: "Severe groundwater contamination affecting drinking water supply in rural school premises.",
    ai_keywords: ["water", "drinking", "contamination", "groundwater", "school", "turbidity"]
  },
  {
    title: "Waterlogging near residential market",
    description: "Persistent monsoon waterlogging and poor runoff drainage near the local commercial vegetable market, causing health hazards and pedestrian blockage.",
    category: "Waste & Drainage",
    subcategory: "Stormwater Drainage",
    district: "Ranchi",
    city: "Kanke Block",
    address: "Near Main Vegetable Market, Kanke Road",
    status: "UNDER_REVIEW",
    severity: "MEDIUM",
    urgency: "HIGH",
    priority_score: 65.0,
    affected_people: 1200,
    required_expertise: ["Stormwater Drainage", "Civil Engineering", "Urban Hydrology"],
    ai_summary: "Severe monsoon waterlogging and clogged runoff culverts obstructing commercial market access.",
    ai_keywords: ["waterlogging", "drainage", "runoff", "market", "monsoon", "culvert"]
  },
  {
    title: "Irregular waste collection in residential area",
    description: "Municipal solid waste collection has been inconsistent for three weeks, leading to open waste accumulation along residential streets and foul odor.",
    category: "Waste Management",
    subcategory: "Solid Waste",
    district: "Dhanbad",
    city: "Govindpur Block",
    address: "Ward 12, Housing Colony, Govindpur",
    status: "OPEN",
    severity: "MEDIUM",
    urgency: "MEDIUM",
    priority_score: 55.0,
    affected_people: 850,
    required_expertise: ["Solid Waste Management", "Municipal Logistics", "Public Health"],
    ai_summary: "Solid waste overflow and irregular pickup schedules creating sanitary risks in residential wards.",
    ai_keywords: ["waste", "garbage", "collection", "municipal", "sanitation", "odor"]
  },
  {
    title: "Poor street lighting near school route",
    description: "Non-functional street lights along the primary pedestrian route to the government secondary school pose safety risks for students during early morning and evening hours.",
    category: "Public Safety / Infrastructure",
    subcategory: "Electrical Infrastructure",
    district: "Ranchi",
    city: "Doranda Block",
    address: "School Access Road, Ward 8, Doranda",
    status: "UNDER_REVIEW",
    severity: "MEDIUM",
    urgency: "MEDIUM",
    priority_score: 50.0,
    affected_people: 600,
    required_expertise: ["Electrical Engineering", "Public Infrastructure", "Solar Lighting"],
    ai_summary: "Unlit school pedestrian corridors creating safety vulnerabilities during twilight hours.",
    ai_keywords: ["lighting", "safety", "school", "infrastructure", "electricity", "street"]
  },
  {
    title: "Irrigation water shortage affecting small farmers",
    description: "Seasonal canal water supply has been severely depleted, leaving small marginal farmers unable to irrigate rabi crops in the absence of community solar borewells.",
    category: "Agriculture",
    subcategory: "Canal Irrigation",
    district: "Hazaribagh",
    city: "Barhi Block",
    address: "Panchayat Agricultural Belt, Barhi",
    status: "IN_PROGRESS",
    severity: "HIGH",
    urgency: "HIGH",
    priority_score: 72.0,
    affected_people: 1500,
    required_expertise: ["Irrigation Systems", "Agricultural Engineering", "Solar Pumping"],
    ai_summary: "Canal depletion threatening seasonal rabi crop yields across marginal farming clusters.",
    ai_keywords: ["agriculture", "irrigation", "farmers", "canal", "crops", "drought"]
  },
  {
    title: "Smart water quality monitoring in rural schools",
    description: "Students in rural government schools face undetected water contamination; deploying automated IoT sensor nodes and real-time data telemetry will enable instant alerts on fluoride and arsenic thresholds.",
    category: "Water & Sanitation",
    subcategory: "Water Quality",
    district: "Bokaro",
    city: "Chas Block",
    address: "Bokaro High School Zone, Chas",
    status: "OPEN",
    severity: "HIGH",
    urgency: "HIGH",
    priority_score: 82.0,
    affected_people: 1800,
    required_expertise: ["IoT", "Water Quality", "Data Analytics", "Python"],
    ai_summary: "Automated IoT telemetry for continuous monitoring of fluoride and contaminant thresholds in rural schools.",
    ai_keywords: ["iot", "sensors", "water", "quality", "telemetry", "python", "analytics"]
  },
  {
    title: "Damaged rural road affecting daily transport",
    description: "Severe structural potholes and foundation washouts on the primary rural artery prevent buses, ambulances, and crop transport from reaching the regional market.",
    category: "Infrastructure",
    subcategory: "Roads",
    district: "Ranchi",
    city: "Mandar Block",
    address: "Panchayat Arterial Link Road, Mandar",
    status: "OPEN",
    severity: "MEDIUM",
    urgency: "HIGH",
    priority_score: 70.0,
    affected_people: 3200,
    required_expertise: ["Civil Engineering", "Road Construction", "Structural Engineering"],
    ai_summary: "Heavy sub-base degradation and pavement collapse stranding agrarian transport links.",
    ai_keywords: ["roads", "civil", "construction", "transport", "pavement", "infrastructure"]
  }
];

async function seed() {
  try {
    const citizenUser = await pool.query("SELECT id FROM users WHERE role = 'CITIZEN' LIMIT 1");
    const reporterId = citizenUser.rows[0]?.id || 1;

    for (const prob of DEMO_PROBLEMS) {
      const existing = await pool.query("SELECT id FROM problems WHERE title = $1 LIMIT 1", [prob.title]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO problems (
            reporter_id, title, description, category, subcategory,
            district, city, address, status, severity, urgency,
            priority_score, affected_people, required_expertise, ai_summary, ai_keywords
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            reporterId, prob.title, prob.description, prob.category, prob.subcategory,
            prob.district, prob.city, prob.address, prob.status, prob.severity, prob.urgency,
            prob.priority_score, prob.affected_people, prob.required_expertise, prob.ai_summary, prob.ai_keywords
          ]
        );
        console.log(`✓ Inserted demo scenario: "${prob.title}"`);
      } else {
        console.log(`- Already exists: "${prob.title}" (ID ${existing.rows[0].id})`);
      }
    }
    console.log("Demo scenarios seeding complete.");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await pool.end();
  }
}

seed();
