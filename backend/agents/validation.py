"""Checks an agent's report against what its tools actually returned in that run. Code only, no model.

- Every cited record (evidence and historical precedents) must appear in a tool result, with its
  project: IDs repeat across projects. IDs match whole, so TSK-10 does not match TSK-102. In a JSON
  result a value belongs to the nearest enclosing `project_id`; text with no project (not JSON, or
  no project_id above it) counts only if it names the project too.
- Every calculation must name a calculator tool that ran in this run and returned its result.
- Every number and date in a statement or the summary must appear in a tool result or the question.
  A number written with fewer decimals matches when the source rounds to it (6.34 matches
  6.338...); a sign is ignored ("25% under" for -25.0); "15.1M" for 15100000 does not match,
  because scaling it is arithmetic the model did itself.

Problems become warnings on the finding (or the report); a finding is never dropped. Tool calls
that failed or did not run are not sources.
"""

import json
import re

from langchain_core.messages import HumanMessage, ToolMessage

_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
# Numbers as written in a statement: not part of an ID like M-006 or PRJ-2401 or a word like Q3.
_WRITTEN_NUMBER = re.compile(r"(?<![\w.-])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\d])")
# Numbers in a source: any run of digits, so a value inside an ID or a date still counts.
_SOURCE_NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _id_pattern(record_id: str) -> re.Pattern:
    return re.compile(rf"(?<![\w-]){re.escape(record_id)}(?![\w-])")


def _contexts(text: str) -> list[tuple[str | None, str]]:
    """(project_id, text) for every string in a tool result; the whole text when it isn't JSON."""
    try:
        data = json.loads(text)
    except ValueError:
        return [(None, text)]
    found = []

    def walk(value, project):
        if isinstance(value, dict):
            if isinstance(value.get("project_id"), str):
                project = value["project_id"]
            for item in value.values():
                walk(item, project)
        elif isinstance(value, list):
            for item in value:
                walk(item, project)
        elif isinstance(value, str):
            found.append((project, value))

    walk(data, None)
    return found


def _written_values(text: str) -> list[str]:
    """Dates and numbers as written, in order."""
    dates = _DATE.findall(text)
    return dates + _WRITTEN_NUMBER.findall(_DATE.sub(" ", text))


def _source_values(text: str) -> tuple[set[str], set[float]]:
    return set(_DATE.findall(text)), {float(number) for number in _SOURCE_NUMBER.findall(text)}


def _matches(written: str, dates: set[str], numbers: set[float]) -> bool:
    if _DATE.fullmatch(written):
        return written in dates
    value = float(written.replace(",", ""))
    places = len(written.split(".")[1]) if "." in written else 0
    return any(round(source, places) == value for source in numbers)


class _Sources:
    """What the run's tools returned, split into calculator results and everything else."""

    def __init__(self, messages, calculator_names):
        self.contexts: list[tuple[str | None, str]] = []
        self.calculator_results: dict[str, list[str]] = {}
        self.dates: set[str] = set()
        self.numbers: set[float] = set()
        for message in messages:
            if isinstance(message, ToolMessage) and message.status != "error":
                text = str(message.content)
                if message.name in calculator_names:
                    self.calculator_results.setdefault(message.name, []).append(text)
                else:
                    self.contexts += _contexts(text)
            elif isinstance(message, HumanMessage):  # the question: "the next 30 days"
                text = str(message.content)
            else:
                continue
            dates, numbers = _source_values(text)
            self.dates |= dates
            self.numbers |= numbers

    def check_record(self, ref: dict, kind: str) -> str | None:
        pattern = _id_pattern(ref["record_id"])
        projects = {project for project, text in self.contexts if pattern.search(text)
                    and (project is not None or _id_pattern(ref["project_id"]).search(text))}
        if not projects:
            return f"{kind} {ref['record_id']} is not in any tool result"
        if ref["project_id"] not in projects and None not in projects:
            seen = ", ".join(sorted(projects))
            return f"{kind} {ref['record_id']} was read in {seen}, not {ref['project_id']}"
        return None

    def check_calculation(self, calculation: dict, calculator_names) -> str | None:
        name, result = calculation["tool"], calculation["result"]
        label = f"Calculation '{calculation['description']}'"
        if name not in calculator_names:
            return f"{label}: {name} is not a calculator tool"
        if name not in self.calculator_results:
            return f"{label}: {name} was not called in this run"
        written = _written_values(result)
        for output in self.calculator_results[name]:
            dates, numbers = _source_values(output)
            if written and all(_matches(value, dates, numbers) for value in written):
                return None
        return f"{label}: {result!r} is not a result {name} returned"

    def check_numbers(self, text: str, where: str) -> str | None:
        missing = [value for value in _written_values(text) if not _matches(value, self.dates, self.numbers)]
        if missing:
            return f"Numbers in the {where} that no tool returned: {', '.join(dict.fromkeys(missing))}"
        return None


def validate_report(report: dict, messages, calculator_names) -> int:
    """Add `warnings` to each finding and to the report, in place; returns how many there are."""
    sources = _Sources(messages, set(calculator_names))
    for finding in report["findings"]:
        warnings = [sources.check_record(ref, "Evidence") for ref in finding["evidence"]]
        warnings += [sources.check_record(ref, "Precedent") for ref in finding["historical_precedents"]]
        warnings += [sources.check_calculation(calc, calculator_names) for calc in finding["calculations"]]
        warnings.append(sources.check_numbers(finding["statement"], "statement"))
        finding["warnings"] = [warning for warning in warnings if warning]
    summary_warning = sources.check_numbers(report["summary"], "summary")
    report["warnings"] = [summary_warning] if summary_warning else []
    return len(report["warnings"]) + sum(len(finding["warnings"]) for finding in report["findings"])
