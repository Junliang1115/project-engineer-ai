import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Folder,
  FolderOpen,
  Layers,
  Lightbulb,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCw,
  Send,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

const plusActions = [
  {
    id: "upload-docs",
    label: "Upload project documents",
    icon: FileText,
    detail: "Specifications, contracts, and QA logs",
  },
  {
    id: "add-design-files",
    label: "Add design files",
    icon: Layers,
    detail: "CAD, BIM, and structural drawings",
  },
  {
    id: "run-risk-analysis",
    label: "Run risk analysis",
    icon: AlertTriangle,
    detail: "Material delays, price movement & staffing",
  },
  {
    id: "run-compliance-review",
    label: "Run compliance review",
    icon: CheckCircle2,
    detail: "Regulatory standards and safety evidence",
  },
  {
    id: "ask-knowledge-bank",
    label: "Ask from knowledge bank",
    icon: BookOpen,
    detail: "Lesson register, risk register & precedents",
  },
  {
    id: "create-lesson-learned",
    label: "Create or update a lesson learned",
    icon: Lightbulb,
    detail: "Record engineering lessons for future projects",
  },
];

const projectSnapshot = {
  confidence: 82,
  agents: [
    { id: "macro", name: "Reconciliation Agent", confidence: 84 },
    { id: "technical", name: "Risk Estimation Agent", confidence: 78 },
    { id: "fundamental", name: "Compliance Agent", confidence: 81 },
    { id: "arbitration", name: "Orchestration Agent", confidence: 86 },
  ],
  messages: [
    {
      id: 1,
      role: "user",
      name: "Project Engineer",
      body: "Analyze design timeline risk for Harbor Link Station milestone M-04.",
    },
    {
      id: 2,
      role: "agent arbitration",
      name: "Orchestration Agent",
      body: "I coordinated the reconciliation, risk, and compliance checks. The main concern is facade package delay against structural handover, with budget pressure from revised aluminum pricing.",
      confidence: 86,
    },
    {
      id: 3,
      role: "agent macro",
      name: "Reconciliation Agent",
      body: "Timeline and spend do not fully match. Procurement shows facade material arriving 8 days after the planned installation window, while milestone cost drawdown is already at 64%.",
      confidence: 84,
    },
    {
      id: 4,
      role: "agent technical",
      name: "Risk Estimation Agent",
      body: "Delay likelihood is medium-high. Key drivers are material delivery, workforce availability for night shift, and international price movement on aluminum and fire-rated assemblies.",
      confidence: 78,
    },
    {
      id: 5,
      role: "agent fundamental",
      name: "Compliance Agent",
      body: "Compliance Notes: any facade material substitution needs fire certificate validation and safety review before approval. Similar Questions: Project Meridian used resequencing to reduce the same facade delay pattern.",
      confidence: 81,
    },
  ],
};

const conversationProjects = [
  { id: "harbor-link", name: "Harbor Link Station" },
  { id: "tower-b", name: "Tower B Facade Package" },
  { id: "depot-expansion", name: "Depot Expansion Works" },
];

const conversationTopics = [
  {
    id: "m04-design-risk",
    projectId: "harbor-link",
    title: "M-04 design risk",
    detail: "Timeline, material, and workforce exposure",
  },
  {
    id: "facade-compliance",
    projectId: "harbor-link",
    title: "Facade compliance review",
    detail: "Material standards and safety evidence",
  },
  {
    id: "cost-milestone",
    projectId: "tower-b",
    title: "Milestone cost tracking",
    detail: "Spend variance against planned progress",
  },
  {
    id: "shipping-variance",
    projectId: "tower-b",
    title: "Shipping & QA variance",
    detail: "Factory release and logistics risk",
  },
  {
    id: "groundwork-readiness",
    projectId: "depot-expansion",
    title: "Groundwork readiness",
    detail: "Permit review and equipment staging",
  },
  {
    id: "knowledge-bank",
    projectId: "depot-expansion",
    title: "Knowledge Bank design queries",
    detail: "Lessons, risk register, and similar questions",
  },
];

function ChatPage() {
  const [projects] = useState(conversationProjects);
  const [topics, setTopics] = useState(conversationTopics);
  const [selectedTopicId, setSelectedTopicId] = useState(conversationTopics[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState(() => {
    return conversationProjects.reduce((acc, p) => ({ ...acc, [p.id]: true }), {});
  });
  const [messagesByTopic, setMessagesByTopic] = useState({
    [conversationTopics[0].id]: projectSnapshot.messages,
    "facade-compliance": [
      {
        id: 1,
        role: "user",
        name: "Project Engineer",
        body: "Check compliance notes and fire ratings for substituted facade panels.",
      },
      {
        id: 2,
        role: "agent",
        name: "Project Engineer AI",
        body: "Compliance Notes: Fire safety certificate equivalence must be validated before installation. Similar Questions: Project Meridian successfully substituted comparable assemblies following third-party lab review.",
        confidence: 84,
      },
    ],
    "cost-milestone": [
      {
        id: 1,
        role: "user",
        name: "Project Engineer",
        body: "Review milestone cost tracking and spend variance for Tower B.",
      },
      {
        id: 2,
        role: "agent",
        name: "Project Engineer AI",
        body: "Cost drawdown is currently at +9.8% with schedule variance of 14 days due to overseas fabrication adjustments.",
        confidence: 81,
      },
    ],
  });
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerDraft, setHeaderDraft] = useState("");
  const headerInputRef = useRef(null);

  useEffect(() => {
    if (isEditingHeader && headerInputRef.current) {
      headerInputRef.current.focus();
      headerInputRef.current.select();
    }
  }, [isEditingHeader]);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const activeProject =
    projects.find((p) => p.id === selectedTopic?.projectId) ?? projects[0];
  const currentMessages = messagesByTopic[selectedTopic?.id] || [];

  function handleNewChat(targetProjectId = null) {
    const projectId = targetProjectId || selectedTopic?.projectId || projects[0].id;
    const newId = `convo-${Date.now()}`;
    const newTopic = {
      id: newId,
      projectId,
      title: "Untitled",
      detail: "New project conversation",
    };
    setTopics((prev) => [newTopic, ...prev]);
    setSelectedTopicId(newId);
    setMessagesByTopic((prev) => ({ ...prev, [newId]: [] }));
    setIsEditingHeader(false);
    setExpandedProjects((prev) => ({ ...prev, [projectId]: true }));
  }

  function handleRenameTopic(topicId, newTitle) {
    const finalTitle = (newTitle || "").trim() || "Untitled";
    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === topicId ? { ...topic, title: finalTitle } : topic
      )
    );
  }

  function startEditingHeader() {
    setHeaderDraft(selectedTopic.title);
    setIsEditingHeader(true);
  }

  function commitHeaderRename() {
    handleRenameTopic(selectedTopic.id, headerDraft);
    setIsEditingHeader(false);
  }

  function handleUpdateMessages(newMessages) {
    setMessagesByTopic((prev) => ({
      ...prev,
      [selectedTopic.id]:
        typeof newMessages === "function"
          ? newMessages(prev[selectedTopic.id] || [])
          : newMessages,
    }));
  }

  function handleToggleProject(projectId) {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }

  return (
    <section className={`chat-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        projects={projects}
        topics={topics}
        selectedTopicId={selectedTopic.id}
        expandedProjects={expandedProjects}
        onToggleProject={handleToggleProject}
        onSelectTopic={setSelectedTopicId}
        onNewChat={handleNewChat}
        onRenameTopic={handleRenameTopic}
      />
      <div className="chat-main-area">
        <header className="chat-top-header" aria-label="Conversation header">
          <div className="chat-header-copy">
            {!isSidebarOpen && (
              <button type="button" className="sidebar-expand-btn" onClick={() => setIsSidebarOpen(true)} title="Expand sidebar" aria-label="Expand sidebar">
                <PanelLeftOpen size={16} aria-hidden="true" />
              </button>
            )}
            <div className="header-breadcrumbs">
              <span className="header-project-pill" title={activeProject.name}>
                <Building2 size={12} aria-hidden="true" />
                <span>{activeProject.name}</span>
              </span>
              <span className="header-breadcrumb-separator" aria-hidden="true">/</span>
              <span className="header-topic-icon-wrap" aria-hidden="true">
                <MessageSquare size={13} />
              </span>
              {isEditingHeader ? (
                <div className="header-rename-wrap">
                  <input
                    ref={headerInputRef}
                    type="text"
                    className="header-rename-input"
                    value={headerDraft}
                    onChange={(event) => setHeaderDraft(event.target.value)}
                    onBlur={commitHeaderRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitHeaderRename();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        setIsEditingHeader(false);
                      }
                    }}
                    aria-label="Rename conversation topic"
                  />
                  <button type="button" className="header-rename-save-btn" onClick={commitHeaderRename} title="Save title" aria-label="Save title">
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <div className="header-title-container">
                  <h1 onClick={startEditingHeader} title="Click to rename topic">
                    {selectedTopic.title}
                  </h1>
                  <button type="button" className="header-rename-trigger" onClick={startEditingHeader} title="Rename conversation topic" aria-label="Rename conversation topic">
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <FullChat
          key={selectedTopic.id}
          messages={currentMessages}
          onUpdateMessages={handleUpdateMessages}
        />
      </div>
    </section>
  );
}

function FullChat({ messages, onUpdateMessages }) {
  const [draft, setDraft] = useState("");
  const [selectedActions, setSelectedActions] = useState([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target)) {
        setIsPlusMenuOpen(false);
      }
    }
    if (isPlusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isPlusMenuOpen]);

  const visibleMessages = messages.filter((message) => {
    return message.role === "user" || message.role === "agent" || message.role.includes("arbitration");
  });

  function addPrompt(promptText) {
    onUpdateMessages([
      ...messages,
      { id: messages.length + 1, role: "user", name: "Project Engineer", body: promptText },
      {
        id: messages.length + 2,
        role: "agent",
        name: "Project Engineer AI",
        body: `Analysis for "${promptText}": Reviewing criteria, project dependencies, risk register, lesson register, and compliance evidence for the active project.`,
        confidence: projectSnapshot.confidence,
      },
    ]);
  }

  function handleSelectAction(action) {
    if (!selectedActions.some((a) => a.id === action.id)) {
      setSelectedActions((prev) => [...prev, action]);
    }
    setIsPlusMenuOpen(false);
    inputRef.current?.focus();
  }

  function handleRemoveAction(actionId) {
    setSelectedActions((prev) => prev.filter((a) => a.id !== actionId));
    inputRef.current?.focus();
  }

  function handleSubmit(event) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body && selectedActions.length === 0) return;

    const actionLabels = selectedActions.map((a) => a.label);
    let promptText = "";
    if (actionLabels.length > 0 && body) {
      promptText = `${actionLabels.map((l) => `[${l}]`).join(" ")} ${body}`;
    } else if (actionLabels.length > 0) {
      promptText = actionLabels.join(", ");
    } else {
      promptText = body;
    }

    addPrompt(promptText);
    setDraft("");
    setSelectedActions([]);
  }

  function handleKeyDown(event) {
    if (event.key === "Backspace" && !draft && selectedActions.length > 0) {
      setSelectedActions((prev) => prev.slice(0, -1));
    }
  }

  function handleRetry() {
    onUpdateMessages([
      ...messages,
      {
        id: messages.length + 1,
        role: "agent",
        name: "Project Engineer AI",
        body: `Regenerated analysis: Rechecking criteria against design timeline, milestone cost, risk exposure, and compliance status.`,
        confidence: projectSnapshot.confidence,
      },
    ]);
  }

  return (
    <section className="chat-panel" aria-label="Conversation transcript">
      <div className="message-list">
        {visibleMessages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <SquarePen size={28} aria-hidden="true" />
            </div>
            <h2>New Conversation</h2>
            <p>Ask about design analysis, risk analysis, milestone tracking, or the Knowledge Bank.</p>
            <div className="chat-starter-prompts">
              <button type="button" className="starter-prompt-btn" onClick={() => addPrompt("Analyze design timeline and workforce skill mix")}>
                Analyze design timeline and workforce skill mix
              </button>
              <button type="button" className="starter-prompt-btn" onClick={() => addPrompt("Run risk analysis for material delivery and hiring gaps")}>
                Run risk analysis for material delivery and hiring gaps
              </button>
              <button type="button" className="starter-prompt-btn" onClick={() => addPrompt("Check compliance notes and similar questions")}>
                Check compliance notes and similar questions
              </button>
            </div>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <ChatMessage key={message.id} message={message} onRetry={handleRetry} />
          ))
        )}
      </div>

      <form className="chat-input-container" onSubmit={handleSubmit} noValidate>
        <div className="chat-input-bar">
          <div className="input-action-wrapper" ref={plusMenuRef}>
            <button
              type="button"
              className={`input-action-btn ${isPlusMenuOpen ? "active" : ""}`}
              onClick={() => setIsPlusMenuOpen((prev) => !prev)}
              aria-label="Add project action or attachment"
              title="Add action or attachment"
              aria-haspopup="true"
              aria-expanded={isPlusMenuOpen}
            >
              <Plus size={18} className={`plus-icon ${isPlusMenuOpen ? "open" : ""}`} aria-hidden="true" />
            </button>

            {isPlusMenuOpen && (
              <div className="plus-dropdown-menu" role="menu" aria-label="Action options">
                <div className="plus-dropdown-header">
                  <span>Quick project actions</span>
                </div>
                {plusActions.map((action) => {
                  const isSelected = selectedActions.some((a) => a.id === action.id);
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`plus-dropdown-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectAction(action)}
                      role="menuitem"
                    >
                      <span className="plus-item-icon-box" aria-hidden="true">
                        <ActionIcon size={14} />
                      </span>
                      <div className="plus-item-content">
                        <span className="plus-item-label">{action.label}</span>
                        <span className="plus-item-detail">{action.detail}</span>
                      </div>
                      {isSelected && <Check size={13} className="plus-item-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="chat-input-content">
            {selectedActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <span key={action.id} className="input-action-chip">
                  <ActionIcon size={12} className="action-chip-icon" aria-hidden="true" />
                  <span className="action-chip-text">{action.label}</span>
                  <button
                    type="button"
                    className="action-chip-remove"
                    onClick={() => handleRemoveAction(action.id)}
                    aria-label={`Remove ${action.label}`}
                    title={`Remove ${action.label}`}
                  >
                    <X size={11} aria-hidden="true" />
                  </button>
                </span>
              );
            })}

            <input
              ref={inputRef}
              id="full-chat-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedActions.length > 0
                  ? "Add specific details or press Enter..."
                  : "Ask project engineering criteria, design analysis, risk analysis, or compliance review"
              }
            />
          </div>

          <button
            type="submit"
            className={`input-send-btn ${(draft.trim() || selectedActions.length > 0) ? "active" : ""}`}
            aria-label="Send message"
            disabled={!draft.trim() && selectedActions.length === 0}
          >
            <Send size={15} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}

function ConversationSidebar({
  isOpen = true,
  onToggle,
  projects,
  topics,
  selectedTopicId,
  expandedProjects,
  onToggleProject,
  onSelectTopic,
  onNewChat,
  onRenameTopic,
}) {
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingTopicId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTopicId]);

  function startRename(topic, event) {
    event?.stopPropagation();
    setEditingTopicId(topic.id);
    setRenameValue(topic.title);
  }

  function commitRename(topicId) {
    onRenameTopic?.(topicId, renameValue);
    setEditingTopicId(null);
  }

  return (
    <aside className={`conversation-sidebar ${isOpen ? "open" : "collapsed"}`} aria-label="Conversation topics" aria-hidden={!isOpen}>
      <div className="sidebar-top-actions">
        {onToggle && (
          <button type="button" className="sidebar-collapse-btn" onClick={onToggle} title="Collapse sidebar" aria-label="Collapse sidebar">
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="sidebar-nav-item sidebar-new-chat-action" onClick={() => onNewChat()} title="New chat in active project">
          <SquarePen size={16} className="sidebar-nav-icon" aria-hidden="true" />
          <span className="sidebar-nav-title">New chat</span>
        </button>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-heading">
        <span className="sidebar-label">Project Workspace</span>
      </div>

      <div className="sidebar-projects-container">
        {projects.map((project) => {
          const projectTopics = topics.filter((t) => t.projectId === project.id);
          const isExpanded = expandedProjects[project.id] !== false;
          const hasActive = projectTopics.some((t) => t.id === selectedTopicId);

          return (
            <div key={project.id} className={`project-convo-group ${hasActive ? "contains-active" : ""}`}>
              <div
                className={`project-group-header ${isExpanded ? "expanded" : "collapsed"}`}
                onClick={() => onToggleProject(project.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onToggleProject(project.id);
                  }
                }}
                aria-expanded={isExpanded}
                title={`${project.name} (${projectTopics.length} conversations)`}
              >
                <ChevronDown size={13} className={`project-chevron ${isExpanded ? "open" : ""}`} aria-hidden="true" />
                {isExpanded ? (
                  <FolderOpen size={14} className="project-folder-icon" aria-hidden="true" />
                ) : (
                  <Folder size={14} className="project-folder-icon" aria-hidden="true" />
                )}
                <span className="project-group-title">{project.name}</span>
                <span className="project-group-badge">{projectTopics.length}</span>
                <button
                  type="button"
                  className="project-add-convo-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewChat(project.id);
                  }}
                  title={`New conversation in ${project.name}`}
                  aria-label={`New conversation in ${project.name}`}
                >
                  <Plus size={13} aria-hidden="true" />
                </button>
              </div>

              {isExpanded && (
                <div className="project-convo-list" role="list">
                  {projectTopics.length === 0 ? (
                    <div className="project-empty-convos">
                      <span>No conversations</span>
                      <button
                        type="button"
                        className="project-create-first-btn"
                        onClick={() => onNewChat(project.id)}
                      >
                        <Plus size={11} />
                        <span>Start chat</span>
                      </button>
                    </div>
                  ) : (
                    projectTopics.map((topic) => {
                      const isActive = topic.id === selectedTopicId;
                      const isEditing = editingTopicId === topic.id;

                      if (isEditing) {
                        return (
                          <div key={topic.id} className={`conversation-topic editing ${isActive ? "active" : ""}`} onClick={(event) => event.stopPropagation()}>
                            <MessageSquare size={13} className="conversation-topic-icon" aria-hidden="true" />
                            <input
                              ref={inputRef}
                              type="text"
                              className="conversation-rename-input"
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              onBlur={() => commitRename(topic.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitRename(topic.id);
                                } else if (event.key === "Escape") {
                                  event.preventDefault();
                                  setEditingTopicId(null);
                                }
                              }}
                              aria-label="Rename conversation"
                            />
                            <button type="button" className="topic-action-btn topic-save-btn" onClick={() => commitRename(topic.id)} title="Save title" aria-label="Save title">
                              <Check size={13} aria-hidden="true" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={topic.id}
                          className={`conversation-topic ${isActive ? "active" : ""}`}
                          onClick={() => onSelectTopic(topic.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              onSelectTopic(topic.id);
                            }
                          }}
                          aria-pressed={isActive}
                          title={topic.detail || topic.title}
                        >
                          <MessageSquare size={13} className="conversation-topic-icon" aria-hidden="true" />
                          <span className="conversation-topic-title" onDoubleClick={(event) => startRename(topic, event)}>
                            {topic.title}
                          </span>
                          <button
                            type="button"
                            className="topic-action-btn topic-rename-btn"
                            onClick={(event) => startRename(topic, event)}
                            title="Rename conversation"
                            aria-label={`Rename ${topic.title}`}
                          >
                            <Pencil size={11} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ChatMessage({ message, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isUser = message.role === "user";

  function handleCopy() {
    navigator.clipboard?.writeText(message.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <article className="chat-turn user-turn">
        <div className="user-message-bubble">
          <p>{message.body}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="chat-turn agent-turn">
      <div className="agent-turn-header">
        <div className="agent-turn-identity">
          <span className="agent-turn-name">{message.name}</span>
          {typeof message.confidence === "number" ? (
            <span className="agent-turn-confidence">{message.confidence}% confidence</span>
          ) : null}
        </div>
      </div>

      <div className="agent-turn-content">
        <p>{message.body}</p>
      </div>

      <div className="agent-turn-actions" role="toolbar" aria-label="Message actions">
        <button type="button" className={`turn-action-btn ${copied ? "active" : ""}`} onClick={handleCopy} title={copied ? "Copied to clipboard!" : "Copy response"} aria-label={copied ? "Copied" : "Copy response"}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </button>
        <button type="button" className="turn-action-btn" onClick={onRetry} title="Retry response" aria-label="Retry response">
          <RotateCw size={14} aria-hidden="true" />
        </button>
        <button type="button" className={`turn-action-btn ${feedback === "good" ? "active-good" : ""}`} onClick={() => setFeedback((current) => (current === "good" ? null : "good"))} title="Good response" aria-label="Good response" aria-pressed={feedback === "good"}>
          <ThumbsUp size={14} aria-hidden="true" />
        </button>
        <button type="button" className={`turn-action-btn ${feedback === "bad" ? "active-bad" : ""}`} onClick={() => setFeedback((current) => (current === "bad" ? null : "bad"))} title="Bad response" aria-label="Bad response" aria-pressed={feedback === "bad"}>
          <ThumbsDown size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default ChatPage;
