"""Risk agent: historical risk analysis.

Built step by step; see "Risk assessment" in CLAUDE.md.

Step 2, the agent loop. The state is the conversation (a list of messages). The `agent` node sends
it to the model, which either answers or asks for tools (`tool_calls`). If it asked, the `tools`
node runs them and appends each result as a ToolMessage, then the loop goes back to `agent`.
When the model answers without asking for tools, the run ends.

    START -> agent --(tool calls?)--> tools --> agent ... --(no tool calls)--> END
                   \--(limit hit)--> stop --> END

Step 3, real data: risk_agent_tools() adds the database MCP's read-only tools (mcp_tools.py) to
the calculator tools. The loop doesn't change; it just has more tools to choose from.

Step 5, limits: a run may use at most `max_tool_calls` tool calls, `max_seconds` seconds and
`max_tokens` tokens (Limits). They are checked before each model call and each batch of tools,
and every model or tool call only gets the time that is left. When one is hit the run goes to
`stop`, which answers the tool calls that did not run (so the conversation stays valid for the
model) and the state keeps `stopped_reason`. A run that ends on its own has stopped_reason None.

Step 6, the trace: `state["trace"]` gets one entry per model call and one per tool call, in order.
    model: {"type": "model", "turn", "status": "ok"|"timed_out", "started_at", "duration_ms",
            "tokens", "tool_calls": [names asked for]}
    tool:  {"type": "tool", "turn", "call_id", "tool", "args", "status", "result", "started_at",
            "duration_ms"}, status "ok", "error" (the tool failed), "timed_out" (cut off by the
            time limit) or "not_run" (a limit stopped the run before it ran).
`turn` is the model call that asked for the tool; `started_at` is seconds since the run started.
Each tool call is timed on its own (ToolNode runs a turn's calls in parallel) by a callback, and
`result` is shortened to MAX_TRACE_RESULT_CHARS; the full result stays in the ToolMessage.

Step 7, the report: every run ends in `report`, whether the model answered or a limit stopped it.
It asks the model, without tools, for a RiskReport (findings with evidence, calculations,
precedents, mitigation and confidence, plus the gaps it did not check) through structured output.
A run stopped by a limit still gets a report of what it found. The report has its own time limit
(`report_seconds`), outside the run's; if it fails, `report` is None and `report_error` says why.

    START -> agent --(tool calls?)--> tools --> agent ... --(no tool calls)--> report --> validate --> END
                   \--(limit hit)--> stop --> report

Step 8, validation: `validate` (code only, validation.py) checks the report against this run's tool
results: cited records must have been read with their project, calculations must match a calculator
call, and numbers in statements must come from a tool result. Problems become `warnings` on the
finding or on the report; findings are never dropped. A failed report is left as it is.

Step 9, a real run: the prompts live in prompts/risk.md, and every run records PROMPT_VERSION (a
sha256 prefix of that file) and the model's name, so results can be compared across prompt and
model changes. run_risk_agent(project_id, question) opens the database MCP, gives the agent its read
tools and the DeepSeek model, and returns the final state; run_result() turns that into plain JSON.
The CLI does one run:

    python backend/agents/risk.py PRJ-2401 "What could delay the next milestone?" [--json]
"""

import argparse
import asyncio
import copy
import hashlib
import json
import operator
import os
import re
import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Annotated, Literal, TypedDict

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables.config import merge_configs
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel, Field

# Add backend directory to sys.path so the CLI runs as a script
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from .calculator import CALCULATOR_TOOLS
    from .mcp_tools import langchain_tools
    from .validation import validate_report
except ImportError:  # Supports `uvicorn --app-dir backend`.
    from agents.calculator import CALCULATOR_TOOLS
    from agents.mcp_tools import langchain_tools
    from agents.validation import validate_report
try:
    from ..core.agent import StructuredOutputError, ainvoke_structured, config_model
    from ..mcp_servers.client import database_session
except ImportError:
    from backend.core.agent import StructuredOutputError, ainvoke_structured, config_model
    from mcp_servers.client import database_session


PROMPT_FILE = Path(__file__).resolve().parent / "prompts" / "risk.md"


def _load_prompts(path: Path) -> tuple[dict[str, str], str]:
    """The file's `## ` sections by name (lowercase), and its version: a sha256 prefix of the file."""
    text = path.read_text(encoding="utf-8")
    sections = re.split(r"^## +(.+)$", text, flags=re.MULTILINE)  # [intro, name, body, name, body, ...]
    prompts = {name.strip().lower(): body.strip() for name, body in zip(sections[1::2], sections[2::2])}
    return prompts, hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


_PROMPTS, PROMPT_VERSION = _load_prompts(PROMPT_FILE)
SYSTEM_PROMPT = _PROMPTS["system"]
REPORT_PROMPT = _PROMPTS["report"]
STOPPED_NOTE = _PROMPTS["stopped"]
DEFAULT_QUESTION = "What are this project's main delivery, schedule, cost and resource risks?"

MAX_TRACE_RESULT_CHARS = 500
CALCULATOR_NAMES = frozenset(calculator_tool.name for calculator_tool in CALCULATOR_TOOLS)


class RecordRef(BaseModel):
    project_id: str
    record_id: str = Field(description="The record's ID as the tools returned it, e.g. TSK-103, M-006, RSK-001")
    note: str = Field(default="", description="What this record shows, in a few words")


class Calculation(BaseModel):
    description: str = Field(description="What was calculated, e.g. 'M-006 cost overrun'")
    tool: str = Field(description="The calculator tool that produced the result")
    result: str = Field(description="The tool's result, exactly as it returned it")


class Finding(BaseModel):
    statement: str
    evidence: list[RecordRef] = Field(default_factory=list)
    calculations: list[Calculation] = Field(default_factory=list)
    historical_precedents: list[RecordRef] = Field(default_factory=list)
    suggested_mitigation: str = ""
    confidence: Literal["high", "medium", "low"]


class RiskReport(BaseModel):
    """The agent's findings. Findings, not risk register items: a later step turns them into those."""

    summary: str = Field(description="Two or three sentences on the project's main risks")
    findings: list[Finding] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list, description="What was not checked or not finished")


@dataclass(frozen=True)
class Limits:
    max_tool_calls: int = 20
    max_seconds: float = 180
    max_tokens: int = 200_000
    report_seconds: float = 60  # the report's own time, so a run stopped by time still gets one


class AgentState(TypedDict):
    # add_messages appends what a node returns instead of replacing the list.
    messages: Annotated[list[AnyMessage], add_messages]
    started_at: float  # clock() when the run started
    tool_calls: int  # tool calls run so far
    tokens: int  # model tokens used so far (input + output)
    stopped_reason: str | None  # "tool_calls", "time" or "tokens" when a limit stopped the run
    trace: Annotated[list[dict], operator.add]  # nodes return new entries; they are appended
    report: dict | None  # RiskReport as a dict plus validation `warnings`; None if the report failed
    report_error: str | None
    model: str  # the model's name, e.g. deepseek-chat
    prompt_version: str  # PROMPT_VERSION when the run started


def _tokens(reply: AIMessage) -> int:
    return (reply.usage_metadata or {}).get("total_tokens", 0)


def _short(text: str) -> str:
    if len(text) <= MAX_TRACE_RESULT_CHARS:
        return text
    return f"{text[:MAX_TRACE_RESULT_CHARS]}... ({len(text)} characters)"


class _ToolTimer(BaseCallbackHandler):
    """Records when each tool call starts and ends, by tool call ID."""

    run_inline = True  # called in the event loop, not a worker thread

    def __init__(self, clock):
        self.clock = clock
        self.started: dict[str, float] = {}
        self.ended: dict[str, float] = {}
        self._call_ids: dict = {}  # LangChain run ID -> tool call ID

    def on_tool_start(self, serialized, input_str, *, run_id, tool_call_id=None, **kwargs):
        if tool_call_id:
            self._call_ids[run_id] = tool_call_id
            self.started[tool_call_id] = self.clock()

    def _end(self, run_id):
        if run_id in self._call_ids:
            self.ended[self._call_ids[run_id]] = self.clock()

    def on_tool_end(self, output, *, run_id, **kwargs):
        self._end(run_id)

    def on_tool_error(self, error, *, run_id, **kwargs):
        self._end(run_id)


def build_agent_graph(model, tools=CALCULATOR_TOOLS, limits: Limits = Limits(), clock=time.monotonic):
    """Compile the loop for a chat model that supports tool calling."""
    model_with_tools = model.bind_tools(tools)  # sends the tools' names, descriptions and schemas
    # handle_tool_errors: a tool's error goes back to the model as text so it can retry,
    # instead of crashing the run.
    tool_node = ToolNode(tools, handle_tool_errors=True)

    def seconds_left(state: AgentState) -> float:
        return limits.max_seconds - (clock() - state["started_at"])

    def since_start(state: AgentState, moment: float) -> float:
        return round(moment - state["started_at"], 3)

    def turn(state: AgentState) -> int:
        """The number of model replies so far, i.e. the turn of the latest one."""
        return sum(isinstance(message, AIMessage) for message in state["messages"])

    def tool_entry(state, call, status, result="", timer=None) -> dict:
        start = timer.started.get(call["id"]) if timer else None
        end = timer.ended.get(call["id"], clock()) if start is not None else None
        return {"type": "tool", "turn": turn(state), "call_id": call["id"], "tool": call["name"],
                "args": call["args"], "status": status, "result": _short(result),
                "started_at": since_start(state, start) if start is not None else None,
                "duration_ms": round((end - start) * 1000) if start is not None else None}

    async def agent(state: AgentState) -> dict:
        if seconds_left(state) <= 0:
            return {"stopped_reason": "time"}
        started = clock()
        entry = {"type": "model", "turn": turn(state) + 1, "started_at": since_start(state, started)}
        try:
            reply = await asyncio.wait_for(model_with_tools.ainvoke(state["messages"]), seconds_left(state))
        except TimeoutError:
            entry.update(status="timed_out", duration_ms=round((clock() - started) * 1000), tokens=0, tool_calls=[])
            return {"stopped_reason": "time", "trace": [entry]}
        entry.update(status="ok", duration_ms=round((clock() - started) * 1000), tokens=_tokens(reply),
                     tool_calls=[call["name"] for call in reply.tool_calls])
        update = {"messages": [reply], "tokens": state["tokens"] + _tokens(reply), "trace": [entry]}
        if reply.tool_calls:  # an answer always ends the run; only further work is limited
            if update["tokens"] >= limits.max_tokens:
                update["stopped_reason"] = "tokens"
            elif state["tool_calls"] + len(reply.tool_calls) > limits.max_tool_calls:
                update["stopped_reason"] = "tool_calls"
        return update

    async def run_tools(state: AgentState, config) -> dict:
        calls = state["messages"][-1].tool_calls
        if seconds_left(state) <= 0:
            return {"stopped_reason": "time"}
        timer = _ToolTimer(clock)
        try:
            result = await asyncio.wait_for(
                tool_node.ainvoke(state, merge_configs(config, {"callbacks": [timer]})), seconds_left(state))
        except TimeoutError:
            # Calls that had started were cut off; stop() records the rest as not run.
            return {"stopped_reason": "time", "trace": [tool_entry(state, call, "timed_out", timer=timer)
                                                         for call in calls if call["id"] in timer.started]}
        replies = {message.tool_call_id: message for message in result["messages"]}
        trace = []
        for call in calls:
            reply = replies[call["id"]]
            trace.append(tool_entry(state, call, "error" if reply.status == "error" else "ok",
                                    str(reply.content), timer))
        return {**result, "tool_calls": state["tool_calls"] + len(calls), "trace": trace}

    def stop(state: AgentState) -> dict:
        """Answer the tool calls that did not run, so every tool call has a result."""
        last = state["messages"][-1]
        pending = last.tool_calls if isinstance(last, AIMessage) else []
        note = f"Not run: the run stopped at its {state['stopped_reason']} limit."
        traced = {entry["call_id"] for entry in state["trace"] if entry["type"] == "tool" and entry["turn"] == turn(state)}
        return {
            "messages": [ToolMessage(note, tool_call_id=call["id"], name=call["name"], status="error") for call in pending],
            "trace": [tool_entry(state, call, "not_run") for call in pending if call["id"] not in traced],
        }

    async def report(state: AgentState) -> dict:
        """Ask for the structured report; a failure is recorded, never raised."""
        prompt = REPORT_PROMPT
        if state["stopped_reason"]:
            prompt += "\n\n" + STOPPED_NOTE.format(reason=state["stopped_reason"])
        started, replies = clock(), []
        result = {"report": None, "report_error": None}
        try:
            report_model = await asyncio.wait_for(
                ainvoke_structured(model, RiskReport, state["messages"] + [HumanMessage(prompt)], replies),
                limits.report_seconds)
            result["report"] = report_model.model_dump()
        except TimeoutError:
            result["report_error"] = f"The report took longer than {limits.report_seconds:g} seconds"
        except StructuredOutputError as exc:
            result["report_error"] = str(exc)
        tokens = sum(_tokens(reply) for reply in replies if isinstance(reply, AIMessage))
        entry = {"type": "report", "status": "ok" if result["report"] else "failed",
                 "started_at": since_start(state, started), "duration_ms": round((clock() - started) * 1000),
                 "tokens": tokens, "findings": len(result["report"]["findings"]) if result["report"] else 0,
                 "error": result["report_error"]}
        return {**result, "tokens": state["tokens"] + tokens, "trace": [entry]}

    def validate(state: AgentState) -> dict:
        """Check the report against this run's tool results; problems become warnings."""
        started = clock()
        entry = {"type": "validate", "status": "skipped", "warnings": 0, "started_at": since_start(state, started)}
        update = {"trace": [entry]}
        if state["report"] is not None:
            report = copy.deepcopy(state["report"])  # a node returns a new value instead of changing the state
            entry.update(status="ok", warnings=validate_report(report, state["messages"], CALCULATOR_NAMES))
            update["report"] = report
        entry["duration_ms"] = round((clock() - started) * 1000)
        return update

    def after_agent(state: AgentState) -> str:
        """Run the tools the model asked for, stop at a limit, or report when it answered."""
        if state["stopped_reason"]:
            return "stop"
        return "tools" if state["messages"][-1].tool_calls else "report"

    def after_tools(state: AgentState) -> str:
        return "stop" if state["stopped_reason"] else "agent"

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent)
    graph.add_node("tools", run_tools)
    graph.add_node("stop", stop)
    graph.add_node("report", report)
    graph.add_node("validate", validate)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", after_agent, ["tools", "stop", "report"])
    graph.add_conditional_edges("tools", after_tools, ["agent", "stop"])
    graph.add_edge("stop", "report")
    graph.add_edge("report", "validate")
    graph.add_edge("validate", END)
    return graph.compile()


async def risk_agent_tools(session) -> list:
    """Everything the risk agent may use: the calculator tools and the database MCP's read tools."""
    return CALCULATOR_TOOLS + await langchain_tools(session)


def _model_name(model) -> str:
    return getattr(model, "model_name", None) or getattr(model, "model", None) or model._llm_type


async def run_agent(question: str, model, tools=CALCULATOR_TOOLS, limits: Limits = Limits(),
                    clock=time.monotonic) -> AgentState:
    """Run the loop on one question; returns the final state (conversation, usage, trace, report)."""
    graph = build_agent_graph(model, tools, limits, clock)
    state = {"messages": [SystemMessage(SYSTEM_PROMPT), HumanMessage(question)],
             "started_at": clock(), "tool_calls": 0, "tokens": 0, "stopped_reason": None, "trace": [],
             "report": None, "report_error": None, "model": _model_name(model), "prompt_version": PROMPT_VERSION}
    # Every tools step runs at least one tool call, so a run takes at most 2 * max_tool_calls + 4
    # steps (agent and tools per call, a last agent, stop, report, validate); LangGraph's default
    # recursion limit (25) would cut a long run off with an error.
    return await graph.ainvoke(state, {"recursion_limit": 2 * limits.max_tool_calls + 5})


async def run_risk_agent(project_id: str, question: str = DEFAULT_QUESTION, model=None,
                         limits: Limits = Limits(), open_session=database_session) -> AgentState:
    """One risk agent run on a project, with the database MCP read tools and (by default) DeepSeek."""
    project_id = project_id.strip()
    if not project_id:
        raise ValueError("project_id is required")  # never default to a project
    if model is None:
        model = config_model()
    async with open_session() as session:
        tools = await risk_agent_tools(session)
        return await run_agent(f"Project: {project_id}\n\n{question.strip() or DEFAULT_QUESTION}", model, tools, limits)


def run_result(state: AgentState) -> dict:
    """The run as plain JSON: everything but the conversation (the trace already lists the calls)."""
    return {key: state[key] for key in ("model", "prompt_version", "stopped_reason", "tool_calls", "tokens",
                                        "report", "report_error", "trace")}


def _print_run(state: AgentState) -> None:
    print(f"Model {state['model']} | prompt {state['prompt_version']} | {state['tool_calls']} tool calls | "
          f"{state['tokens']} tokens | stopped: {state['stopped_reason'] or 'no'}")
    report = state["report"]
    if report is None:
        print(f"\nNo report: {state['report_error']}")
        return
    print(f"\n{report['summary']}")
    for warning in report["warnings"]:
        print(f"  ! {warning}")
    for number, finding in enumerate(report["findings"], 1):
        print(f"\n{number}. [{finding['confidence']}] {finding['statement']}")
        for ref in finding["evidence"]:
            print(f"   evidence: {ref['project_id']} {ref['record_id']} {ref['note']}".rstrip())
        for calculation in finding["calculations"]:
            print(f"   calc: {calculation['description']} = {calculation['result']} ({calculation['tool']})")
        for ref in finding["historical_precedents"]:
            print(f"   precedent: {ref['project_id']} {ref['record_id']} {ref['note']}".rstrip())
        if finding["suggested_mitigation"]:
            print(f"   mitigation: {finding['suggested_mitigation']}")
        for warning in finding["warnings"]:
            print(f"   ! {warning}")
    if report["gaps"]:
        print("\nNot checked:")
        for gap in report["gaps"]:
            print(f"  - {gap}")


def _load_env() -> None:
    """Read the repo's .env into the environment; variables already set (e.g. DATABASE_URL) win."""
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


async def _main() -> int:
    parser = argparse.ArgumentParser(description="Run the risk agent once on a project")
    parser.add_argument("project_id")
    parser.add_argument("question", nargs="?", default=DEFAULT_QUESTION)
    parser.add_argument("--json", action="store_true", help="print the full run (report and trace) as JSON")
    args = parser.parse_args()
    _load_env()
    state = await run_risk_agent(args.project_id, args.question)
    if args.json:
        print(json.dumps(run_result(state), indent=2, default=str))
    else:
        _print_run(state)
    return 0 if state["report"] is not None else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
