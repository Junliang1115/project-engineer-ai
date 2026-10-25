from typing import Any
from pydantic import BaseModel, Field


class PhaseUpdateRequest(BaseModel):
    status: str = Field(..., description="New phase status: planned, active, completed, or on_hold")
    progress_percent: float | None = Field(None, ge=0, le=100, description="Optional progress percentage (0-100)")


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., description="approve or reject")
    changes: dict[str, Any] | None = Field(None, description="Edited field values; omit to approve the proposal as-is")
    record_id: str | None = Field(None, description="Corrected record ID for an update")
    note: str = Field("", description="Reviewer note; required to reject")


class SharePointDocumentRequest(BaseModel):
    path: str = Field(..., min_length=1, description="SharePoint / OneDrive path of a PDF, e.g. Projects/PRJ-2401/TQ-0913.pdf")
    project_id: str | None = Field(None, description="Project the document belongs to")


class ReviewCloseRequest(BaseModel):
    note: str = Field("", description="Required when undecided changes remain; they are rejected with it")


class PhaseResponse(BaseModel):
    id: str
    project_id: str
    name: str
    phase_order: int
    status: str
    progress_percent: float
    current_project_phase: str | None = None

