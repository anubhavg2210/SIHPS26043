import { useState } from "react";
import { Input, Textarea } from "../../components/common/FormControls";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { Icon } from "../../components/common/Icons";
import { AIAnalysisView } from "../../components/problems/AIAnalysisView.jsx";
import { ExpertiseMatchingView } from "../../components/problems/ExpertiseMatchingView.jsx";
import { problemApi, challengeApi, matchingApi } from "../../services/api.js";
import { useToast } from "../../context/useToast.js";
import { useRouter } from "../../context/useRouter.js";

export function ReportProblemPage() {
  const toast = useToast();
  const { navigate } = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    district: "",
    city: "",
    address: "",
    affected_people: "",
    available_from: "",
    available_until: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Result state after submission
  const [createdProblem, setCreatedProblem] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [clusterCheck, setClusterCheck] = useState(null);

  // Matching results state
  const [institutions, setInstitutions] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [startups, setStartups] = useState([]);
  const [msmes, setMsmes] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Quick Demo Scenario Prefill (Groundwater Contamination in Dhanbad)
  const handlePrefillDemo = () => {
    setForm({
      title: "Groundwater contamination and high salinity in village drinking wells",
      description:
        "Village groundwater has become contaminated with heavy mineral runoff and high turbidity. Residents and local schools are reporting unsafe water quality, leading to waterborne illnesses and lack of potable drinking water.",
      district: "Dhanbad",
      city: "Govindpur Block",
      address: "Village Barmasia, Near Primary Health Sub-Centre",
      affected_people: "1250",
      available_from: new Date().toISOString().split("T")[0],
      available_until: "",
    });
    setError("");
    toast.info("Prefilled primary SIH 2026 water challenge demonstration scenario.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please provide a title and detailed problem description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Submit Problem to Real Backend API (calls analyzeChallenge, calculatePriority, duplicate check, clustering)
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        district: form.district.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        affected_people: form.affected_people ? Number(form.affected_people) : null,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      };

      let problemRes;

      try {
        problemRes = await problemApi.createProblem(payload);
        setCreatedProblem(problemRes.problem);
        setAiAnalysis(problemRes.ai_analysis);
        setDuplicateCheck(problemRes.duplicate_check);
        setClusterCheck(problemRes.cluster_check);
      } catch (probErr) {
        console.warn("Standard problem submission fallback to challenge analysis:", probErr);
        // If unauthenticated or role constraint, use challenge endpoint
        const chalRes = await challengeApi.createChallenge({
          title: payload.title,
          description: payload.description,
          district: payload.district,
          affected_people: payload.affected_people,
        });
        setCreatedProblem(chalRes.challenge);
        setAiAnalysis(chalRes.ai_analysis);
        if (chalRes.recommended_institutions) {
          setInstitutions(chalRes.recommended_institutions);
        }
      }

      toast.success("Problem registered & analyzed by rule-based NLP engine!");

      // 2. Fetch Real Matching Entities for this problem
      const probId = problemRes?.problem?.id;
      if (probId) {
        setMatchingLoading(true);

        // Fetch institutions, faculty, students, researchers, startups, MSMEs in parallel
        const [facRes, stuRes, resRes, staRes, msmRes, chalRes] = await Promise.allSettled([
          matchingApi.getFacultyMatches(probId),
          matchingApi.getStudentMatches(probId),
          matchingApi.getResearcherMatches(probId),
          matchingApi.getStartupMatches(probId),
          matchingApi.getMsmeMatches(probId),
          challengeApi.createChallenge({
            title: payload.title,
            description: payload.description,
            district: payload.district,
            affected_people: payload.affected_people,
          }),
        ]);

        if (facRes.status === "fulfilled" && facRes.value?.matches) {
          setFaculty(facRes.value.matches);
        }
        if (stuRes.status === "fulfilled" && stuRes.value?.matches) {
          setStudents(stuRes.value.matches);
        }
        if (resRes.status === "fulfilled" && resRes.value?.matches) {
          setResearchers(resRes.value.matches);
        }
        if (staRes.status === "fulfilled" && staRes.value?.matches) {
          setStartups(staRes.value.matches);
        }
        if (msmRes.status === "fulfilled" && msmRes.value?.matches) {
          setMsmes(msmRes.value.matches);
        }
        if (chalRes.status === "fulfilled" && chalRes.value?.recommended_institutions) {
          setInstitutions(chalRes.value.recommended_institutions);
        }

        setMatchingLoading(false);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setError(err.message || "Failed to submit challenge.");
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedProblem(null);
    setAiAnalysis(null);
    setInstitutions([]);
    setFaculty([]);
    setStudents([]);
    setResearchers([]);
    setStartups([]);
    setMsmes([]);
    setForm({
      title: "",
      description: "",
      district: "",
      city: "",
      address: "",
      affected_people: "",
      available_from: "",
      available_until: "",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Page Title & Breadcrumb Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.75rem", fontWeight: 700 }}>
            Report a Problem
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Submit a real-world societal challenge. Rule-based NLP extracts capabilities and matches verified solutions.
          </p>
        </div>

        {!createdProblem && (
          <Button
            variant="outline"
            size="sm"
            icon="award"
            onClick={handlePrefillDemo}
          >
            Prefill SIH Demo Scenario
          </Button>
        )}
      </div>

      {/* BEFORE SUBMISSION: Two-Column Form & Tips */}
      {!createdProblem ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Left: Problem Form */}
          <Card
            title="Societal Challenge Submission"
            subtitle="Fill in specific details to help AI identify the right institutional capabilities."
          >
            {error && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-danger-subtle)",
                  border: "1px solid var(--color-danger-border)",
                  color: "var(--color-danger)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Icon name="alert-triangle" size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <Input
                label="Challenge Title"
                name="title"
                placeholder="e.g. Village groundwater contamination affecting drinking supply"
                value={form.title}
                onChange={handleChange}
                required
                hint="Summarize the core societal challenge clearly."
              />

              <Textarea
                label="Problem Description"
                name="description"
                rows={5}
                placeholder="Describe the problem in detail: what is happening, what sources are contaminated, what are the observed health or economic effects, and how long has it persisted..."
                value={form.description}
                onChange={handleChange}
                required
                hint="Rich descriptions allow rule-based NLP to extract precise expertise keywords."
              />

              <div className="cs-grid-2">
                <Input
                  label="District"
                  name="district"
                  placeholder="e.g. Dhanbad"
                  value={form.district}
                  onChange={handleChange}
                />

                <Input
                  label="City / Town / Block"
                  name="city"
                  placeholder="e.g. Govindpur Block"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Specific Location / Address"
                name="address"
                placeholder="e.g. Ward 4, Near Panchayat Bhawan, Barmasia"
                value={form.address}
                onChange={handleChange}
              />

              <div className="cs-grid-2">
                <Input
                  label="Estimated Affected Population"
                  name="affected_people"
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  value={form.affected_people}
                  onChange={handleChange}
                  hint="Helps calculate urgency & priority score."
                />

                <Input
                  label="Observed Since / Available From"
                  name="available_from"
                  type="date"
                  value={form.available_from}
                  onChange={handleChange}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon="cpu"
                style={{ width: "100%", marginTop: "1rem" }}
              >
                {loading ? "Analyzing Challenge with NLP Engine..." : "Analyse & Submit Challenge"}
              </Button>
            </form>
          </Card>

          {/* Right: Helpful Guidance Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Card title="Tips for a Better Report" subtitle="How to get maximum matching accuracy">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <Icon name="check-circle" size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>Be Specific:</strong>
                    <div style={{ marginTop: "0.15rem" }}>
                      Mention specific technical domains like water testing, road paving, sewage drainage, or soil quality.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <Icon name="map-pin" size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>Pinpoint Geography:</strong>
                    <div style={{ marginTop: "0.15rem" }}>
                      Identifying the district (e.g. Dhanbad, Ranchi) enables geographic proximity ranking for universities.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <Icon name="users" size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>Affected People:</strong>
                    <div style={{ marginTop: "0.15rem" }}>
                      Estimated numbers determine the calculated priority score and urgency weighting for authorities.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <Icon name="cpu" size={18} color="var(--color-primary)" />
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>Rule-Based AI Extraction:</strong>
                    <div style={{ marginTop: "0.15rem" }}>
                      Our NLP classifier extracts required skills (e.g. Water Treatment, Environmental Engineering) automatically.
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ backgroundColor: "var(--color-primary-subtle)", borderColor: "var(--color-primary-border)" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <Icon name="shield-check" size={24} color="var(--color-primary)" />
                <div>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", color: "var(--color-primary-dark)" }}>
                    Verified Civic Lifecycle
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-primary-dark)", lineHeight: 1.5 }}>
                    Unlike passive complaint portals, CivicSync connects this challenge directly to researchers, students, and startups for root cause analysis, prototyping, and measurable impact tracking.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* AFTER SUBMISSION: SUCCESS BANNER + AI ANALYSIS + EXPERTISE MATCHING HERO */
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Success Banner */}
          <div
            style={{
              padding: "1.25rem 1.5rem",
              backgroundColor: "var(--color-success-subtle)",
              border: "1px solid var(--color-success-border)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ color: "var(--color-success)" }}>
                <Icon name="check-circle" size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--color-secondary)" }}>
                  Challenge #{createdProblem.id} Registered Successfully
                </h3>
                <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                  Title: <strong>{createdProblem.title}</strong> &bull; District: <strong>{createdProblem.district || "Dhanbad"}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                variant="outline"
                size="sm"
                icon="plus-circle"
                onClick={handleReset}
              >
                Submit Another
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="search"
                onClick={() => navigate("/explore")}
              >
                Explore Problems
              </Button>
            </div>
          </div>

          {/* 1. AI Challenge Intelligence */}
          <AIAnalysisView
            analysis={aiAnalysis}
            priorityScore={createdProblem.priority_score}
            duplicateCheck={duplicateCheck}
            clusterCheck={clusterCheck}
          />

          {/* 2. Expertise Matching Hero Section */}
          <ExpertiseMatchingView
            institutions={institutions}
            faculty={faculty}
            students={students}
            researchers={researchers}
            startups={startups}
            msmes={msmes}
            loading={matchingLoading}
            requiredExpertise={aiAnalysis?.required_expertise || []}
          />

          {/* Bottom Next-Step Action Bar */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>Ready to explore the solution lifecycle?</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Track root cause analysis, upstream dependencies, solution submissions, and impact metrics.
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Button
                  variant="outline"
                  icon="layers"
                  onClick={() => navigate("/my-reports")}
                >
                  View My Reports
                </Button>
                <Button
                  variant="primary"
                  icon="arrow-right"
                  onClick={() => navigate("/explore")}
                >
                  View in Problem Catalog
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
