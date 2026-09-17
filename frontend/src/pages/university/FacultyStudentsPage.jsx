import { useState, useEffect } from "react";
import { universityApi } from "../../services/api";
import { Card } from "../../components/common/Cards";
import { LoadingSkeleton, EmptyState } from "../../components/common/Feedback";
import { Button } from "../../components/common/Button";

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
    if (!skills || skills.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        {skills.map((skill, index) => (
          <span
            key={index}
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0.3rem 0.6rem",
              borderRadius: "var(--radius-full)",
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

  const renderAvatar = (name) => {
    return (
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "var(--radius-full)",
        backgroundColor: "var(--bg-muted)",
        border: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "var(--text-secondary)",
        flexShrink: 0
      }}>
        {name ? name.charAt(0).toUpperCase() : "U"}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Faculty &amp; Students
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "1.05rem" }}>
          Explore academic expertise available within your institution for collaborative problem-solving.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("faculty")}
          style={{
            background: "none",
            border: "none",
            padding: "0.5rem 1.5rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "faculty" ? 700 : 500,
            color: activeTab === "faculty" ? "var(--color-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "faculty" ? "2px solid var(--color-primary)" : "none",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            marginBottom: "-0.5rem"
          }}
        >
          Faculty Members ({data.faculty.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          style={{
            background: "none",
            border: "none",
            padding: "0.5rem 1.5rem",
            fontSize: "0.95rem",
            fontWeight: activeTab === "students" ? 700 : 500,
            color: activeTab === "students" ? "var(--color-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "students" ? "2px solid var(--color-primary)" : "none",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            marginBottom: "-0.5rem"
          }}
        >
          Students ({data.students.length})
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
          <div className="cs-grid-3">
            {data.faculty.map((f) => (
              <Card key={f.id} hover style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  {renderAvatar(f.name)}
                  <div>
                    <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {f.name}
                    </h3>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {f.designation || "Professor"} &bull; {f.department || "Department"}
                    </div>
                  </div>
                </div>
                {renderChips(f.skills)}
                <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                   <Button variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                     View Profile
                   </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        data.students.length === 0 ? (
          <EmptyState title="No student records found for this institution." />
        ) : (
          <div className="cs-grid-3">
            {data.students.map((s) => (
              <Card key={s.id} hover style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  {renderAvatar(s.name)}
                  <div>
                    <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {s.name}
                    </h3>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {s.course || "B.Tech"} &bull; {s.graduation_year ? `${s.graduation_year} Batch` : "Student"}
                    </div>
                  </div>
                </div>
                {renderChips(s.skills)}
                <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                   <Button variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
                     View Profile
                   </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
