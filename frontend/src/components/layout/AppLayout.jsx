import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        width: "100%",
      }}
    >
      {/* Desktop-First Collapsible Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // Prevents flex child overflow
          overflowX: "hidden",
        }}
      >
        <Topbar />

        <main
          style={{
            flex: 1,
            padding: "2.5rem",
            maxWidth: "1440px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
