import { useState } from "react";
import "./App.css";

function App() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    district: "",
    affected_people: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/challenges",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            district: form.district,
            affected_people: form.affected_people
              ? Number(form.affected_people)
              : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>SIH26043</h1>
          <p>Societal Challenge Intelligence Platform</p>
        </div>
      </header>


      <main className="container">

        {/* -------------------------------- */}
        {/* Challenge Submission */}
        {/* -------------------------------- */}

        <section className="card">

          <h2>Report a Societal Challenge</h2>

          <p className="subtitle">
            Describe a real-world problem and let AI identify
            the expertise required to solve it.
          </p>

          <form onSubmit={handleSubmit}>

            <label>
              Challenge Title
            </label>

            <input
              type="text"
              name="title"
              placeholder="Example: Village water problem"
              value={form.title}
              onChange={handleChange}
              required
            />


            <label>
              Problem Description
            </label>

            <textarea
              name="description"
              placeholder="Describe the problem in detail..."
              value={form.description}
              onChange={handleChange}
              rows="6"
              required
            />


            <div className="form-row">

              <div>
                <label>
                  District
                </label>

                <input
                  type="text"
                  name="district"
                  placeholder="Dhanbad"
                  value={form.district}
                  onChange={handleChange}
                />
              </div>


              <div>
                <label>
                  People Affected
                </label>

                <input
                  type="number"
                  name="affected_people"
                  placeholder="500"
                  min="0"
                  value={form.affected_people}
                  onChange={handleChange}
                />
              </div>

            </div>


            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Analyzing Challenge..."
                : "Analyze Challenge"}
            </button>

          </form>

        </section>


        {/* -------------------------------- */}
        {/* Error */}
        {/* -------------------------------- */}

        {error && (
          <section className="error-card">
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </section>
        )}


        {/* -------------------------------- */}
        {/* AI Analysis */}
        {/* -------------------------------- */}

        {result && (
          <>
            <section className="card">

              <h2>🧠 AI Challenge Analysis</h2>

              <div className="analysis-grid">

                <div>
                  <span>Domain</span>
                  <strong>
                    {result.ai_analysis.domain}
                  </strong>
                </div>

                <div>
                  <span>Subdomain</span>
                  <strong>
                    {result.ai_analysis.subdomain}
                  </strong>
                </div>

                <div>
                  <span>Problem Type</span>
                  <strong>
                    {result.ai_analysis.problem_type}
                  </strong>
                </div>

                <div>
                  <span>AI Confidence</span>
                  <strong>
                    {Math.round(
                      result.ai_analysis.confidence * 100
                    )}
                    %
                  </strong>
                </div>

              </div>


              <div className="summary">
                <span>Summary</span>
                <p>
                  {result.ai_analysis.summary}
                </p>
              </div>


              <div className="priority-row">

                <div>
                  <span>Severity</span>
                  <strong>
                    {result.ai_analysis.severity}/10
                  </strong>
                </div>

                <div>
                  <span>Urgency</span>
                  <strong>
                    {result.ai_analysis.urgency}/10
                  </strong>
                </div>

              </div>


              <h3>Required Expertise</h3>

              <div className="skills">

                {result.ai_analysis.required_expertise.map(
                  (skill) => (
                    <span
                      className="skill"
                      key={skill}
                    >
                      ✓ {skill}
                    </span>
                  )
                )}

              </div>

            </section>


            {/* -------------------------------- */}
            {/* Institution Recommendations */}
            {/* -------------------------------- */}

            <section className="card">

              <h2>🏫 Recommended Institutions</h2>

              <p className="subtitle">
                Institutions ranked according to how well
                their expertise matches the challenge.
              </p>


              <div className="institutions">

                {result.recommended_institutions
                  .filter(
                    (institution) =>
                      Number(institution.match_score) > 0
                  )
                  .map((institution, index) => (

                    <div
                      className="institution"
                      key={institution.institution_id}
                    >

                      <div className="institution-top">

                        <div>

                          <span className="rank">
                            {index === 0
                              ? "🥇"
                              : index === 1
                              ? "🥈"
                              : "🥉"}
                          </span>

                          <h3>
                            {institution.institution}
                          </h3>

                        </div>


                        <div className="score">
                          {institution.match_score}%
                        </div>

                      </div>


                      <p className="match-label">
                        {institution.matched_expertise} of{" "}
                        {institution.required_expertise}{" "}
                        required expertise matched
                      </p>


                      <div className="matched-skills">

                        {institution.matched_skills
                          .split(", ")
                          .filter(Boolean)
                          .map((skill) => (
                            <span key={skill}>
                              ✓ {skill}
                            </span>
                          ))}

                      </div>

                    </div>

                  ))}

              </div>

            </section>
          </>
        )}

      </main>

    </div>
  );
}

export default App;