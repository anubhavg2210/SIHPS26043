import { useState, useEffect } from "react";
import { universityApi } from "../../services/api";
import { Card } from "../../components/common/Cards";
import { LoadingSkeleton, EmptyState } from "../../components/common/Feedback";

export function FacultyStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ faculty: [], students: [] });
  const [activeTab, setActiveTab] = useState("faculty");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        const res = await universityApi.getFacultyAndStudents();
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Unable to load faculty and student data. Please try again.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const renderChips = (skills) => {
    if (!skills || skills.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Skills not added yet</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {skills.map((skill, index) => (
          <span
            key={index}
            style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary-border)",
            }}
          >
            {skill}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800 }}>
          Faculty & Students
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Explore academic expertise available within your institution.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("faculty")}
          style={{
            background: "none",
            border: "none",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            fontWeight: activeTab === "faculty" ? 700 : 500,
            color: activeTab === "faculty" ? "var(--color-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "faculty" ? "2px solid var(--color-primary)" : "none",
            cursor: "pointer",
          }}
        >
          Faculty
        </button>
        <button
          onClick={() => setActiveTab("students")}
          style={{
            background: "none",
            border: "none",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            fontWeight: activeTab === "students" ? 700 : 500,
            color: activeTab === "students" ? "var(--color-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "students" ? "2px solid var(--color-primary)" : "none",
            cursor: "pointer",
          }}
        >
          Students
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : error ? (
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
      ) : activeTab === "faculty" ? (
        data.faculty.length === 0 ? (
          <EmptyState title="No faculty records found for this institution." />
        ) : (
          <div className="cs-grid-2">
            {data.faculty.map((f) => (
              <Card key={f.id} title={f.name}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <strong>Department:</strong> {f.department || "Unknown"}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <strong>Designation:</strong> {f.designation || "Faculty"}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong style={{ fontSize: "0.9rem" }}>Expertise:</strong>
                    <div style={{ marginTop: "0.3rem" }}>{renderChips(f.skills)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        data.students.length === 0 ? (
          <EmptyState title="No student records found for this institution." />
        ) : (
          <div className="cs-grid-2">
            {data.students.map((s) => (
              <Card key={s.id} title={s.name}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    {s.course || "Degree not specified"}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    {s.graduation_year ? `${s.graduation_year} Batch` : "Year not specified"}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong style={{ fontSize: "0.9rem" }}>Skills:</strong>
                    <div style={{ marginTop: "0.3rem" }}>{renderChips(s.skills)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
