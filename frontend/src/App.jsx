import { RouterProvider } from "./context/RouterContext.jsx";
import { useRouter } from "./context/useRouter.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth.js";
import { ToastProvider } from "./context/ToastContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { Card } from "./components/common/Cards";
import { Button } from "./components/common/Button";
import { Icon } from "./components/common/Icons";
import { ReportProblemPage } from "./pages/problems/ReportProblemPage.jsx";
import { ProblemDetailPage } from "./pages/problems/ProblemDetailPage.jsx";
import { ExplorePage } from "./pages/explore/ExplorePage.jsx";
import NotificationsPage from "./pages/notifications/NotificationsPage.jsx";
import ReputationPage from "./pages/reputation/ReputationPage.jsx";
import RankingsPage from "./pages/rankings/RankingsPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";
import { DashboardPage } from "./pages/dashboard/DashboardPage.jsx";

/**
 * Main Application View Routing Switcher
 */
function AppContent() {
  const { path, segments, navigate } = useRouter();
  const { role, isAuthenticated, loading } = useAuth();

  const isProblemDetail = segments.length >= 2 && segments[0] === "problems";
  const problemId = isProblemDetail ? segments[1] : null;

  // Loading Session Screen
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <Icon name="spinner" size={32} color="var(--color-primary)" />
        <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Initializing CivicSync secure session...
        </span>
      </div>
    );
  }

  // Public Routes for Unauthenticated Users
  if (!isAuthenticated) {
    if (path === "/login") return <LoginPage />;
    if (path === "/register") return <RegisterPage />;
    return <LandingPage />;
  }

  // If Authenticated and trying to visit /login or /register or root /, send to dashboard
  if (path === "/login" || path === "/register" || path === "/") {
    navigate("/dashboard");
    return null;
  }

  // Authenticated Layout Wrapper
  return (
    <AppLayout>
      {/* Route: /dashboard */}
      {path === "/dashboard" && <DashboardPage />}

      {/* Route: /explore, /matches, /my-reports */}
      {(path === "/explore" || path === "/matches" || path === "/my-reports") && <ExplorePage />}

      {/* Route: /report */}
      {path === "/report" && <ReportProblemPage />}

      {/* Route: /problems/:id */}
      {isProblemDetail && <ProblemDetailPage id={problemId} />}

      {/* Route: /notifications */}
      {path === "/notifications" && <NotificationsPage />}

      {/* Route: /reputation */}
      {path === "/reputation" && <ReputationPage />}

      {/* Route: /rankings */}
      {path === "/rankings" && <RankingsPage />}

      {/* Route: /profile */}
      {path === "/profile" && <ProfilePage />}

      {/* Other routes placeholder */}
      {path !== "/dashboard" &&
        path !== "/explore" &&
        path !== "/matches" &&
        path !== "/my-reports" &&
        path !== "/report" &&
        path !== "/notifications" &&
        path !== "/reputation" &&
        path !== "/rankings" &&
        path !== "/profile" &&
        !isProblemDetail && (
          <Card
            title={`Section: ${path.replace("/", "").toUpperCase()}`}
            subtitle="Integrated into CivicSync design system"
          >
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Viewing <strong>{path}</strong> as <strong>{role}</strong>.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <Button variant="outline" size="sm" onClick={() => navigate("/explore")}>
                  Explore Problems
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </RouterProvider>
  );
}