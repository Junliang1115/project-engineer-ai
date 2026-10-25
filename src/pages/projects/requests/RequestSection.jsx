import React, { useMemo, useState } from "react";
import { FileDiff, FileQuestion } from "lucide-react";
import { ListRow } from "../../../components/ListRow.jsx";
import { Tag } from "../../../components/Tag.jsx";
import { FilterBar, FilterSegment } from "../../../components/FilterBar.jsx";
import "./RequestSection.css";

const categories = ["All", "Technical Query", "Change Order"];

function RequestCard({ request, onSelect }) {
  const isTechnicalQuery = request.category === "Technical Query";
  const RequestIcon = isTechnicalQuery ? FileQuestion : FileDiff;
  const kindClass = isTechnicalQuery ? "is-query" : "is-change";

  return (
    <ListRow
      as="button"
      className="request-card-summary"
      onClick={onSelect}
      disabled={!onSelect}
      aria-label={`Open request ${request.title}`}
      leading={
        <span className={`request-type-icon ${kindClass}`}>
          <RequestIcon size={16} aria-hidden="true" />
        </span>
      }
      meta={
        <>
          <Tag type={isTechnicalQuery ? "blue" : "gold"} size="sm">{request.category}</Tag>
          <span className="request-id technical-id">{request.id}</span>
          {request.createdAt && <span>{new Date(request.createdAt).toLocaleDateString()}</span>}
        </>
      }
      title={request.title}
      description={request.description}
      trailing={
        <span className={`request-status status-${String(request.status).toLowerCase().replaceAll(" ", "-")}`}>{request.status}</span>
      }
    />
  );
}

export default function RequestSection({ project, onSelectRequest }) {
  const requests = project?.requests || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesCategory = category === "All" || request.category === category;
      const matchesSearch = !query || [request.id, request.title, request.description, request.category]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [requests, searchTerm, category]);

  return (
    <div className="requests-page">
      <div className="section-page-header">
        <div>
          <h1>Requests</h1>
          <p>Technical queries and change orders requiring engineering review.</p>
        </div>
        <span className="section-header-badge">{requests.length} requests</span>
      </div>

      <section className="request-register" aria-label="Project requests">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search request title or ID"
          ariaLabel="Search requests"
          count={filteredRequests.length}
        >
          <FilterSegment
            label="Filter requests by category"
            value={category}
            onChange={setCategory}
            options={categories}
          />
        </FilterBar>

        <div className="request-list">
          {filteredRequests.map((request) => <RequestCard key={request.id} request={request} onSelect={onSelectRequest ? () => onSelectRequest(request.id) : null} />)}
          {filteredRequests.length === 0 && <div className="request-empty">No requests match the selected filters.</div>}
        </div>
      </section>
    </div>
  );
}
