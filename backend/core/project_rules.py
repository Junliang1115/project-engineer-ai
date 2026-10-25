"""Status rules and activity categories shared by the database MCP and email reconciliation."""

from typing import Literal

# Categories the email classifier and agents assign to their work; they become activity_log.activity_type.
ACTIVITY_CATEGORIES = ("daily_update", "technical_query", "change_order", "other")
ActivityCategory = Literal[ACTIVITY_CATEGORIES]

# Allowed status changes: current status -> statuses it may move to.
TASK_STATUS_TRANSITIONS = {
    "planned": ["in_progress", "blocked"],
    "in_progress": ["completed", "blocked"],
    "blocked": ["in_progress"],
}
MILESTONE_STATUS_TRANSITIONS = {
    "planned": ["in_progress", "blocked"],
    "in_progress": ["completed", "blocked"],
    "blocked": ["in_progress"],
}
REQUEST_STATUS_TRANSITIONS = {
    "open": ["review", "closed"],
    "review": ["approved", "closed"],
}


def is_allowed_transition(transitions: dict, before: str | None, after: str) -> bool:
    return after == before or after in transitions.get(before, [])
