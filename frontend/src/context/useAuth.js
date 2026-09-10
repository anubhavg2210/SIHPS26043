import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { role: "CITIZEN", label: "Citizen", name: "Ramesh Citizen", email: "citizen@civicsync.demo" },
  { role: "STUDENT", label: "Student", name: "Arjun Sharma", email: "student@civicsync.demo" },
  { role: "RESEARCHER", label: "Researcher", name: "Dr. Sunita Rao", email: "researcher@civicsync.demo" },
  { role: "STARTUP", label: "Startup", name: "AquaTech Solutions", email: "startup@civicsync.demo" },
  { role: "MSME", label: "MSME", name: "EcoFilter Works", email: "msme@civicsync.demo" },
  { role: "UNIVERSITY", label: "University", name: "IIT (ISM) Dhanbad", email: "university@civicsync.demo" },
  { role: "AUTHORITY", label: "Authority", name: "Dhanbad DM Office", email: "authority@civicsync.demo" },
  { role: "ADMIN", label: "Admin", name: "Platform Admin", email: "admin@civicsync.demo" },
];

export const DEMO_PASSWORD = "CivicSync2026!";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
