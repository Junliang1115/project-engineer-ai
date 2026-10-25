import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Globe,
  Mail,
  MessageSquare,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import teamsLogo from "../../assets/data-sources/teams.png";
import sharepointLogo from "../../assets/data-sources/sharepoint.png";
import outlookLogo from "../../assets/data-sources/outlook.png";
import googleDriveLogo from "../../assets/data-sources/google-drive.png";

const initialSources = [
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "Communication",
    detail: "Team channels, site query transcripts & safety updates",
    logo: teamsLogo,
    enabled: true,
    refresh: "12 min",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    email: "project.engineer@gmail.com",
    detail: "Subcontractor correspondence & procurement approvals",
    logo: "https://cdn.simpleicons.org/gmail/EA4335",
    enabled: true,
    refresh: "28 min",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    category: "Documents",
    email: "project.engineer@example.com",
    detail: "Project drawings, specs (PMS-A1A) & revision packs",
    logo: sharepointLogo,
    enabled: true,
    refresh: "60 min",
  },
  {
    id: "outlook",
    name: "Outlook",
    category: "Email",
    email: "project.engineer@example.com",
    detail: "RFI logs, change order notices & milestone agendas",
    logo: outlookLogo,
    enabled: false,
    refresh: "3 hr",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    category: "Documents",
    email: "project.engineer@gmail.com",
    detail: "Civil survey logs, soil test PDFs & drone imagery",
    logo: googleDriveLogo,
    enabled: true,
    refresh: "45 min",
  },
];

export default function AccountPage() {
  const [dataSources, setDataSources] = useState(initialSources);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState("");

  function toggleSource(name) {
    setDataSources((current) =>
      current.map((source) =>
        source.name === name ? { ...source, enabled: !source.enabled } : source
      )
    );
  }

  function handleSyncAll() {
    setIsSyncingAll(true);
    setSyncFeedback("Syncing all active project sources...");
    setTimeout(() => {
      setDataSources((current) =>
        current.map((s) => (s.enabled ? { ...s, refresh: "Just now" } : s))
      );
      setIsSyncingAll(false);
      setSyncFeedback("All data sources refreshed successfully!");
      setTimeout(() => setSyncFeedback(""), 3500);
    }, 1200);
  }

  return (
    <main className="page plugin-page account-page">
      {/* 1. Profile & Organization Banner */}
      <section className="account-hero-card">
        <div className="account-hero-main">
          <div className="account-hero-avatar">
            <span>JL</span>
            <span className="account-avatar-status" title="Active session" aria-hidden="true" />
          </div>
          <div className="account-hero-info">
            <div className="account-hero-title-row">
              <h1>Jun Liang</h1>
              <span className="account-badge admin-badge">Lead Project Engineer</span>
              <span className="account-badge verified-badge">
                <CheckCircle2 size={12} aria-hidden="true" /> Verified Staff
              </span>
            </div>
            <p className="account-hero-meta">
              <span>Capital Delivery & Infrastructure Group</span>
              <span className="meta-separator">•</span>
              <span>Workspace Admin</span>
              <span className="meta-separator">•</span>
              <span className="account-id-chip technical-id">EMP-8842</span>
            </p>
          </div>
        </div>

        <div className="account-hero-actions">
          <button
            type="button"
            className={`account-sync-btn ${isSyncingAll ? "loading" : ""}`}
            onClick={handleSyncAll}
            disabled={isSyncingAll}
          >
            <RefreshCw size={14} className={isSyncingAll ? "spin-icon" : ""} aria-hidden="true" />
            <span>{isSyncingAll ? "Syncing..." : "Sync All Sources"}</span>
          </button>
        </div>
      </section>

      {syncFeedback && (
        <div className="account-sync-feedback" role="status">
          <Check size={14} aria-hidden="true" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* 2. Connected Data Sources & Plugins Section */}
      <section className="account-connectors-section">
        <div className="section-header-row">
          <div>
            <div className="section-title-wrap">
              <h2>Data Source Integrations</h2>
            </div>
            <p className="section-subtitle">
              Manage real-time indexing for specifications, BIM drawings, change orders, and site messages.
            </p>
          </div>
        </div>

        {/* List of Data Sources */}
        <section className="plugin-source-list account-source-list" aria-label="Data source list">
          {dataSources.map((source) => (
            <article className={`plugin-source-card account-source-card ${source.enabled ? "is-enabled" : "is-disabled"}`} key={source.name}>
              <div className="plugin-source-main">
                <span className="plugin-logo">
                  <img
                    src={source.logo}
                    alt=""
                    aria-hidden="true"
                    className="plugin-logo-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                  <span className="plugin-logo-fallback" style={{ display: "none" }}>
                    {source.name.slice(0, 2).toUpperCase()}
                  </span>
                </span>
                <div className="plugin-source-details">
                  <div className="plugin-source-title-line">
                    <strong className="source-title">{source.name}</strong>
                    <span className="account-category-tag">{source.category}</span>
                    <span className={`status-pill ${source.enabled ? "status-connected" : "status-disconnected"}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {source.enabled ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  {source.email && <div className="account-source-email">{source.email}</div>}
                  <p className="source-description">{source.detail}</p>
                  <div className="account-source-status-row">
                    <span className="source-refresh-time">
                      Latest refresh: {source.refresh}
                    </span>
                  </div>
                </div>
              </div>

              <div className="plugin-source-actions">
                <label className="plugin-toggle" htmlFor={`toggle-${source.id}`}>
                  <input
                    id={`toggle-${source.id}`}
                    type="checkbox"
                    role="switch"
                    aria-checked={source.enabled}
                    checked={source.enabled}
                    onChange={() => toggleSource(source.name)}
                  />
                  <span className="slider" />
                </label>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

