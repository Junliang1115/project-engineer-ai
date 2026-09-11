import React, { useState } from "react";
import { BarChart2, MessageSquare } from "lucide-react";
import ChatPage from "./ChatPage.jsx";
import ProjectsPage from "./ProjectsPage.jsx";

function App() {
  const [activePage, setActivePage] = useState("chat");

  return (
    <div className="app-shell">
      <AppNavbar activePage={activePage} onSelectPage={setActivePage} />
      <main className="page page-chat">
        {activePage === "projects" ? <ProjectsPage /> : <ChatPage />}
      </main>
    </div>
  );
}

function AppNavbar({ activePage, onSelectPage }) {
  return (
    <header className="app-navbar" aria-label="Primary navigation">
      <div className="app-brand" aria-label="Project Engineer home">
        <span className="app-brand-mark" aria-hidden="true">PE</span>
        <span className="app-brand-name">Project Engineer</span>
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

      <button type="button" className="account-button" aria-label="Account">
        <span className="account-avatar" aria-hidden="true">JL</span>
        <span>Account</span>
      </button>
    </header>
  );
}

export default App;
