import React, { useEffect, useState } from "react";
import { BarChart2, MessageSquare, Moon, Sun } from "lucide-react";
import ChatPage from "./ChatPage.jsx";
import AccountPage from "./AccountPage.jsx";
import ProjectsPage from "./ProjectsPage.jsx";
import projectEngineerLogo from "./assets/logo.png";

function getInitialPage() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/projects")) {
    return "projects";
  }
  if (typeof window !== "undefined" && (window.location.pathname.startsWith("/account") || window.location.pathname.startsWith("/plugins"))) {
    return "account";
  }

  return "chat";
}

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function App() {
  const [activePage, setActivePage] = useState(getInitialPage);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const syncPageFromPath = () => setActivePage(getInitialPage());
    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const handleSelectPage = (page) => {
    setActivePage(page);
    const path = page === "projects" ? "/projects" : page === "account" || page === "plugins" ? "/account" : "/";
    window.history.pushState(null, "", path);
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
        {activePage === "projects" ? (
          <ProjectsPage />
        ) : activePage === "account" || activePage === "plugins" ? (
          <AccountPage />
        ) : (
          <ChatPage />
        )}
      </main>
    </div>
  );
}

function AppNavbar({ activePage, onSelectPage, theme, onToggleTheme }) {
  return (
    <header className="app-navbar" aria-label="Primary navigation">
      <div className="app-brand" aria-label="Project Engineer home">
        <img className="app-brand-mark" src={projectEngineerLogo} alt="" aria-hidden="true" />
        <span className="app-brand-name">OIL AGENT</span>
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
