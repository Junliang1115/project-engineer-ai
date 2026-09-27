import React, { useEffect, useState } from "react";
import { BarChart2, MessageSquare } from "lucide-react";
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

function App() {
  const [activePage, setActivePage] = useState(getInitialPage);

  useEffect(() => {
    const syncPageFromPath = () => setActivePage(getInitialPage());
    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, []);

  const handleSelectPage = (page) => {
    setActivePage(page);
    const path = page === "projects" ? "/projects" : page === "account" || page === "plugins" ? "/account" : "/";
    window.history.pushState(null, "", path);
  };

  return (
    <div className="app-shell">
      <AppNavbar activePage={activePage} onSelectPage={handleSelectPage} />
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

function AppNavbar({ activePage, onSelectPage }) {
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

      <button
        type="button"
        className={`account-button ${activePage === "account" || activePage === "plugins" ? "active" : ""}`}
        onClick={() => onSelectPage("account")}
        aria-label="Account"
      >
        <span className="account-avatar" aria-hidden="true">JL</span>
        <span>Account</span>
      </button>
    </header>
  );
}

export default App;
