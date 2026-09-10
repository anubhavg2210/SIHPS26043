/**
 * lifecycle.js
 *
 * Deterministic problem lifecycle stage definitions and valid transition graph.
 */

export const LIFECYCLE_STAGES = [
  { key: "REPORTED", label: "Reported", desc: "Citizen reports challenge" },
  { key: "UNDER_REVIEW", label: "Under Review", desc: "Authority triage & validation" },
  { key: "VERIFIED", label: "Verified", desc: "Problem authenticity confirmed" },
  { key: "ASSIGNED", label: "Assigned", desc: "Assigned to nodal department/expert" },
  { key: "ROOT_CAUSE_ANALYSIS", label: "Root Cause", desc: "AI heuristics & expert evidence" },
  { key: "SOLUTION_SEARCH", label: "Solution Search", desc: "Academic & startup proposals open" },
  { key: "SOLUTION_EVALUATION", label: "Evaluation", desc: "Authority multidimensional scoring" },
  { key: "APPROVED", label: "Approved", desc: "Solution approved for pilot deployment" },
  { key: "PILOT", label: "Pilot", desc: "Field pilot validation in progress" },
  { key: "IMPLEMENTING", label: "Implementing", desc: "Full-scale civic execution" },
  { key: "RESOLVED", label: "Resolved", desc: "Intervention completed" },
  { key: "MONITORING", label: "Monitoring", desc: "Post-resolution community monitoring" },
  { key: "SUSTAINED", label: "Sustained", desc: "Long-term civic impact verified" },
];

export const STATUS_FLOW = {
  REPORTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["VERIFIED", "REPORTED"],
  VERIFIED: ["ASSIGNED"],
  ASSIGNED: ["ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH"],
  ROOT_CAUSE_ANALYSIS: ["SOLUTION_SEARCH"],
  SOLUTION_SEARCH: ["SOLUTION_EVALUATION"],
  SOLUTION_EVALUATION: ["APPROVED", "SOLUTION_SEARCH"],
  APPROVED: ["PILOT"],
  PILOT: ["IMPLEMENTING", "SOLUTION_SEARCH"],
  IMPLEMENTING: ["RESOLVED"],
  RESOLVED: ["MONITORING"],
  MONITORING: ["SUSTAINED", "IMPLEMENTING"],
  SUSTAINED: [],
};
