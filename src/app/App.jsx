import React, { useEffect, useState } from "react";
import { BarChart2, MessageSquare, Moon, Sun } from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChatPage from "../pages/chat/ChatPage.jsx";
import AccountPage from "../pages/account/AccountPage.jsx";
import ProjectsPage from "../pages/projects/ProjectsPage.jsx";
import brandLogo from "../assets/logo.svg";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);
  const activePage = location.pathname.startsWith("/projects")
    ? "projects"
    : location.pathname.startsWith("/account") || location.pathname.startsWith("/plugins")
      ? "account"
      : "chat";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const handleSelectPage = (page) => {
    const path = page === "projects" ? "/projects" : page === "account" || page === "plugins" ? "/account" : "/";
    navigate(path);
  };

  return (
    <div className="app-shell">
      <AppNavbar
        activePage={activePage}
        onSelectPage={handleSelectPage}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />
      <main className="page page-chat">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/plugins" element={<AccountPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/costs" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/activity/:activityId" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/requests/:requestId" element={<ProjectsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppNavbar({ activePage, onSelectPage, theme, onToggleTheme }) {
  return (
    <header className="app-navbar" aria-label="Primary navigation">
      <div className="app-brand" aria-label="Flowline home">
        <span className="app-brand-mark" style={{ "--brand-logo": `url("${brandLogo}")` }} aria-hidden="true" />
        <span className="app-brand-name">Flow<span className="app-brand-name-accent">line</span></span>
      </div>

      <nav className="app-nav-links" aria-label="Page navigation">
        <button
          type="button"
          className={`app-nav-link ${activePage === "chat" ? "active" : ""}`}
          onClick={() => onSelectPage("chat")}
        >
          <MessageSquare size={15} aria-hidden="true" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          className={`app-nav-link ${activePage === "projects" ? "active" : ""}`}
          onClick={() => onSelectPage("projects")}
        >
          <BarChart2 size={15} aria-hidden="true" />
          <span>Project</span>
        </button>
      </nav>

      <div className="app-navbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={`account-button ${activePage === "account" || activePage === "plugins" ? "active" : ""}`}
          onClick={() => onSelectPage("account")}
          aria-label="Account"
        >
          <span className="account-avatar" aria-hidden="true">JL</span>
          <span>Account</span>
        </button>
      </div>
    </header>
  );
}

export default App;
