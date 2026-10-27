import asyncio
import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool

from backend.agents.calculator import (
    CALCULATOR_TOOLS, add_days, calculate, days_between, percent_change, schedule_slip,
)
from backend.agents.mcp_tools import MAX_RESULT_CHARS, READ_TOOLS, langchain_tools
from backend.agents.risk import (
    DEFAULT_QUESTION, MAX_TRACE_RESULT_CHARS, PROMPT_FILE, PROMPT_VERSION, REPORT_PROMPT, SYSTEM_PROMPT, Limits,
    _load_prompts, _print_run, risk_agent_tools, run_agent, run_result, run_risk_agent,
)
from backend.mcp_servers.client import database_session


class CalculatorToolTest(unittest.TestCase):
    """The agent calls tools with tool.invoke({...}); the tests do the same."""

    def test_calculate_does_arithmetic_and_allowed_functions(self):
        self.assertAlmostEqual(calculate.invoke({"expression": "(15100000 - 14200000) / 14200000 * 100"}), 6.338, places=3)
        self.assertEqual(calculate.invoke({"expression": "round(sum([1.25, 2.5, -0.5]), 1)"}), 3.2)
        self.assertEqual(calculate.invoke({"expression": "max(3, 7) ** 2 % 10"}), 9)

    def test_calculate_rejects_anything_but_arithmetic(self):
        for expression in ("__import__('os').system('dir')", "x + 1", "(1).real", "open('a')",
                           "round(1.5, ndigits=0)", "2 ** 1000", "1 / 0", "1 +", "1" * 201):
            with self.subTest(expression=expression[:30]):
                with self.assertRaises(ValueError):
                    calculate.invoke({"expression": expression})

    def test_dates(self):
        self.assertEqual(days_between.invoke({"start": "2026-09-21", "end": "2026-10-01"}), 10)
        self.assertEqual(days_between.invoke({"start": "2026-10-01", "end": "2026-09-21"}), -10)
        self.assertEqual(add_days.invoke({"day": "2026-09-30", "days": 3}), "2026-10-03")
        with self.assertRaises(ValueError):
            days_between.invoke({"start": "21/9/2026", "end": "2026-10-01"})

    def test_percent_change(self):
        self.assertEqual(percent_change.invoke({"baseline": 14200000, "actual": 15100000}), 6.3)
        self.assertEqual(percent_change.invoke({"baseline": 200, "actual": 150}), -25.0)
        with self.assertRaises(ValueError):
            percent_change.invoke({"baseline": 0, "actual": 10})

    def test_schedule_slip_uses_float(self):
        args = {"planned_end": "2026-09-21", "forecast_end": "2026-10-01"}
        self.assertEqual(schedule_slip.invoke(args), {"slip_days": 10, "net_delay_days": 10})
        self.assertEqual(schedule_slip.invoke({**args, "float_days": 4}), {"slip_days": 10, "net_delay_days": 6})
        self.assertEqual(schedule_slip.invoke({**args, "float_days": 15}), {"slip_days": 10, "net_delay_days": 0})

    def test_every_tool_describes_itself_to_the_model(self):
        for calculator_tool in CALCULATOR_TOOLS:
            with self.subTest(tool=calculator_tool.name):
                self.assertTrue(calculator_tool.description)
                self.assertTrue(calculator_tool.args)


def ask_tools(*calls):
    """A model reply that asks for tools: (name, args) pairs."""
    return AIMessage(content="", tool_calls=[
        {"name": name, "args": args, "id": f"call_{index}"} for index, (name, args) in enumerate(calls)
    ])


def report_reply(summary="No risks found.", findings=(), gaps=()):
    """A model reply to the report call: structured output is a call to the RiskReport tool."""
    return AIMessage(content="", tool_calls=[{
        "name": "RiskReport", "id": "report",
        "args": {"summary": summary, "findings": list(findings), "gaps": list(gaps)},
    }])


class ScriptedModel(BaseChatModel):
    """Stands in for DeepSeek: replays scripted replies and records what it was sent each turn.

    The report call (structured output) gets an empty report once the scripted replies run out.
    """

    replies: list
    bound_tools: list = []
    turns: list = []
    on_turn: object = None  # called on every model call, e.g. to move a fake clock
    structured: bool = False

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools, **kwargs):
        if "tool_choice" in kwargs:  # with_structured_output: the report call
            self.structured = True
        else:
            self.bound_tools = [tool.name for tool in tools]
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        self.turns.append(list(messages))
        if self.on_turn:
            self.on_turn()
        reply = self.replies.pop(0) if self.replies or not self.structured else report_reply()
        return ChatResult(generations=[ChatGeneration(message=reply)])


class HangingModel(ScriptedModel):
    """A model call that never comes back in time."""

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        await asyncio.sleep(5)


@tool
async def hanging_lookup(record_id: str) -> str:
    """A tool call that never comes back in time."""
    await asyncio.sleep(5)
    return record_id


@tool
async def slow_lookup(record_id: str, seconds: float) -> str:
    """A tool call that takes `seconds` to answer."""
    await asyncio.sleep(seconds)
    return record_id


@tool
def long_report(record_id: str) -> str:
    """A tool with a long result."""
    return record_id * 1000


def with_usage(message, total_tokens):
    message.usage_metadata = {"input_tokens": total_tokens - 10, "output_tokens": 10, "total_tokens": total_tokens}
    return message


class AgentLoopTest(unittest.IsolatedAsyncioTestCase):
    async def test_loop_runs_the_requested_tool_and_returns_the_result_to_the_model(self):
        model = ScriptedModel(replies=[
            ask_tools(("percent_change", {"baseline": 14200000, "actual": 15100000})),
            AIMessage(content="M-006 is 6.3% over budget."),
        ])

        messages = (await run_agent("How far over budget is M-006?", model))["messages"]

        self.assertEqual([type(m) for m in messages],
                         [SystemMessage, HumanMessage, AIMessage, ToolMessage, AIMessage])
        self.assertEqual(messages[3].content, "6.3")          # our code ran the tool
        self.assertEqual(messages[3].tool_call_id, "call_0")  # and matched it to the request
        self.assertEqual(messages[-1].content, "M-006 is 6.3% over budget.")
        self.assertEqual(len(model.turns), 3)                 # asked twice, then for the report
        self.assertIn(messages[3], model.turns[1])            # and saw the result the second time
        self.assertEqual(model.bound_tools, [tool.name for tool in CALCULATOR_TOOLS])

    async def test_a_tool_error_goes_back_to_the_model_so_it_can_retry(self):
        model = ScriptedModel(replies=[
            ask_tools(("percent_change", {"baseline": 0, "actual": 10})),
            ask_tools(("calculate", {"expression": "10 - 0"})),
            AIMessage(content="Spend rose by 10 from nothing."),
        ])

        messages = (await run_agent("Change from 0 to 10?", model))["messages"]

        error, retry = messages[3], messages[5]
        self.assertEqual(error.status, "error")
        self.assertIn("Baseline is 0", error.content)
        self.assertEqual(retry.content, "10")
        self.assertEqual(messages[-1].content, "Spend rose by 10 from nothing.")

    async def test_several_tools_in_one_turn_all_run(self):
        model = ScriptedModel(replies=[
            ask_tools(("days_between", {"start": "2026-09-21", "end": "2026-10-01"}),
                      ("add_days", {"day": "2026-09-30", "days": 3})),
            AIMessage(content="Done."),
        ])

        messages = (await run_agent("Two date questions", model))["messages"]

        self.assertEqual([m.content for m in messages if isinstance(m, ToolMessage)], ["10", "2026-10-03"])

    async def test_an_answer_without_tool_calls_ends_the_loop(self):
        model = ScriptedModel(replies=[AIMessage(content="No calculation needed.")])

        messages = (await run_agent("Hello", model))["messages"]

        self.assertEqual(len(messages), 3)
        self.assertEqual(len(model.turns), 2)  # the answer, then the report


def not_run(messages):
    return [m for m in messages if isinstance(m, ToolMessage) and m.content.startswith("Not run")]


class LimitsTest(unittest.IsolatedAsyncioTestCase):
    async def test_a_run_that_answers_has_no_stopped_reason_and_counts_its_usage(self):
        model = ScriptedModel(replies=[
            with_usage(ask_tools(("days_between", {"start": "2026-09-21", "end": "2026-10-01"}),
                                 ("add_days", {"day": "2026-09-30", "days": 3})), 1200),
            with_usage(AIMessage(content="Done."), 1500),
        ])

        state = await run_agent("Two date questions", model)

        self.assertIsNone(state["stopped_reason"])
        self.assertEqual((state["tool_calls"], state["tokens"]), (2, 2700))

    async def test_a_model_that_never_stops_is_cut_off_at_the_tool_call_limit(self):
        """Also proves a full-length run fits in LangGraph's recursion limit."""
        model = ScriptedModel(replies=[ask_tools(("add_days", {"day": "2026-09-30", "days": 1})) for _ in range(21)])

        state = await run_agent("Loop forever", model)

        self.assertEqual(state["stopped_reason"], "tool_calls")
        self.assertEqual(state["tool_calls"], Limits().max_tool_calls)
        self.assertEqual(len(model.turns), 22)  # the 21st request was refused, not run; then the report
        self.assertEqual(len(not_run(state["messages"])), 1)
        self.assertIn("tool_calls limit", state["messages"][-1].content)

    async def test_a_batch_that_would_pass_the_limit_does_not_run_at_all(self):
        model = ScriptedModel(replies=[
            ask_tools(("add_days", {"day": "2026-09-30", "days": 1}), ("add_days", {"day": "2026-09-30", "days": 2})),
            ask_tools(("add_days", {"day": "2026-09-30", "days": 3}), ("add_days", {"day": "2026-09-30", "days": 4})),
        ])

        state = await run_agent("Dates", model, limits=Limits(max_tool_calls=3))

        self.assertEqual((state["stopped_reason"], state["tool_calls"]), ("tool_calls", 2))
        # Every tool call has a result, so the conversation is still valid for the model.
        self.assertEqual([m.tool_call_id for m in state["messages"] if isinstance(m, ToolMessage)],
                         ["call_0", "call_1", "call_0", "call_1"])
        self.assertEqual(len(not_run(state["messages"])), 2)

    async def test_the_token_limit_stops_further_work(self):
        model = ScriptedModel(replies=[
            with_usage(ask_tools(("add_days", {"day": "2026-09-30", "days": 1})), 150_000),
            with_usage(ask_tools(("add_days", {"day": "2026-09-30", "days": 2})), 60_000),
        ])

        state = await run_agent("Dates", model)

        self.assertEqual((state["stopped_reason"], state["tokens"], state["tool_calls"]), ("tokens", 210_000, 1))
        self.assertEqual(len(not_run(state["messages"])), 1)

    async def test_an_answer_over_the_token_limit_still_ends_normally(self):
        model = ScriptedModel(replies=[with_usage(AIMessage(content="Long answer."), 250_000)])

        state = await run_agent("Hello", model)

        self.assertIsNone(state["stopped_reason"])
        self.assertEqual(state["messages"][-1].content, "Long answer.")

    async def test_the_time_limit_is_checked_before_each_step(self):
        now = [0.0]
        model = ScriptedModel(
            replies=[ask_tools(("add_days", {"day": "2026-09-30", "days": 1})) for _ in range(2)],
            on_turn=lambda: now.__setitem__(0, now[0] + 100),  # each model call takes 100 s
        )

        state = await run_agent("Dates", model, clock=lambda: now[0])

        # Turn 1 ends at 100 s and its tool runs; turn 2 ends at 200 s, past 180 s, so its tool doesn't.
        self.assertEqual((state["stopped_reason"], state["tool_calls"], len(model.turns)), ("time", 1, 3))
        self.assertEqual(len(not_run(state["messages"])), 1)

    async def test_a_hanging_model_call_is_cut_off_at_the_time_limit(self):
        state = await asyncio.wait_for(
            run_agent("Hello", HangingModel(replies=[]), limits=Limits(max_seconds=0.2, report_seconds=0.2)), 2)

        self.assertEqual(state["stopped_reason"], "time")
        self.assertEqual(len(state["messages"]), 2)  # no reply was added

    async def test_a_hanging_tool_call_is_cut_off_at_the_time_limit(self):
        model = ScriptedModel(replies=[ask_tools(("hanging_lookup", {"record_id": "M-006"}))])

        state = await asyncio.wait_for(
            run_agent("Look it up", model, [hanging_lookup], limits=Limits(max_seconds=0.2)), 2)

        self.assertEqual((state["stopped_reason"], state["tool_calls"]), ("time", 0))
        self.assertEqual(len(not_run(state["messages"])), 1)


def tool_entries(state):
    return [entry for entry in state["trace"] if entry["type"] == "tool"]


class TraceTest(unittest.IsolatedAsyncioTestCase):
    async def test_every_model_and_tool_call_is_traced_in_order(self):
        model = ScriptedModel(replies=[
            with_usage(ask_tools(("days_between", {"start": "2026-09-21", "end": "2026-10-01"}),
                                 ("add_days", {"day": "2026-09-30", "days": 3})), 1200),
            with_usage(AIMessage(content="Done."), 1500),
        ])

        state = await run_agent("Two date questions", model)

        trace = state["trace"]
        self.assertEqual([(e["type"], e.get("turn")) for e in trace],
                         [("model", 1), ("tool", 1), ("tool", 1), ("model", 2), ("report", None), ("validate", None)])
        self.assertEqual({k: trace[0][k] for k in ("status", "tokens", "tool_calls")},
                         {"status": "ok", "tokens": 1200, "tool_calls": ["days_between", "add_days"]})
        self.assertEqual(trace[3]["tool_calls"], [])
        self.assertEqual({k: trace[1][k] for k in ("call_id", "tool", "args", "status", "result")},
                         {"call_id": "call_0", "tool": "days_between", "status": "ok", "result": "10",
                          "args": {"start": "2026-09-21", "end": "2026-10-01"}})
        self.assertEqual((trace[2]["tool"], trace[2]["result"]), ("add_days", "2026-10-03"))
        for entry in trace:
            self.assertIsInstance(entry["duration_ms"], int)
            self.assertGreaterEqual(entry["started_at"], 0)

    async def test_parallel_tool_calls_are_timed_separately(self):
        model = ScriptedModel(replies=[
            ask_tools(("slow_lookup", {"record_id": "M-006", "seconds": 0.05}),
                      ("slow_lookup", {"record_id": "M-007", "seconds": 0.3})),
            AIMessage(content="Done."),
        ])

        fast, slow = tool_entries(await run_agent("Look up", model, [slow_lookup]))

        self.assertEqual((fast["result"], slow["result"]), ("M-006", "M-007"))
        self.assertLess(fast["duration_ms"], 200)
        self.assertGreaterEqual(slow["duration_ms"], 300)
        self.assertLess(abs(fast["started_at"] - slow["started_at"]), 0.1)  # they ran side by side

    async def test_a_tool_error_is_traced_as_error(self):
        model = ScriptedModel(replies=[ask_tools(("percent_change", {"baseline": 0, "actual": 10})),
                                       AIMessage(content="Cannot compute.")])

        [entry] = tool_entries(await run_agent("Change?", model))

        self.assertEqual(entry["status"], "error")
        self.assertIn("Baseline is 0", entry["result"])

    async def test_calls_stopped_by_a_limit_are_traced_as_not_run(self):
        model = ScriptedModel(replies=[
            ask_tools(("add_days", {"day": "2026-09-30", "days": 1})),
            ask_tools(("add_days", {"day": "2026-09-30", "days": 2}), ("add_days", {"day": "2026-09-30", "days": 3})),
        ])

        state = await run_agent("Dates", model, limits=Limits(max_tool_calls=2))

        self.assertEqual([(e["turn"], e["status"]) for e in tool_entries(state)], [(1, "ok"), (2, "not_run"), (2, "not_run")])
        self.assertEqual({(e["started_at"], e["duration_ms"]) for e in tool_entries(state)[1:]}, {(None, None)})

    async def test_cut_off_calls_are_traced_as_timed_out(self):
        model = ScriptedModel(replies=[ask_tools(("hanging_lookup", {"record_id": "M-006"}))])

        state = await run_agent("Look it up", model, [hanging_lookup], limits=Limits(max_seconds=0.2))

        [entry] = tool_entries(state)
        self.assertEqual(entry["status"], "timed_out")
        self.assertGreaterEqual(entry["duration_ms"], 100)

        state = await run_agent("Hello", HangingModel(replies=[]), limits=Limits(max_seconds=0.2, report_seconds=0.2))
        self.assertEqual([(e["type"], e["status"]) for e in state["trace"]], [("model", "timed_out"), ("report", "failed"), ("validate", "skipped")])

    async def test_long_results_are_shortened_in_the_trace_only(self):
        model = ScriptedModel(replies=[ask_tools(("long_report", {"record_id": "M-006"})), AIMessage(content="Done.")])

        state = await run_agent("Report", model, [long_report])

        [entry] = tool_entries(state)
        self.assertEqual(len(entry["result"]), MAX_TRACE_RESULT_CHARS + len("... (5000 characters)"))
        self.assertTrue(entry["result"].endswith("... (5000 characters)"))
        self.assertEqual(len([m for m in state["messages"] if isinstance(m, ToolMessage)][0].content), 5000)


OVERRUN = {
    "statement": "M-006 is 6.3% over budget and its envelope task is still in progress.",
    "evidence": [{"project_id": "PRJ-2401", "record_id": "M-006", "note": "actual 15.1M vs planned 14.2M"}],
    "calculations": [{"description": "M-006 cost overrun", "tool": "percent_change", "result": "6.3"}],
    "historical_precedents": [{"project_id": "PRJ-03", "record_id": "RSK-001"}],
    "suggested_mitigation": "Review remaining envelope commitments.",
    "confidence": "high",
}


class ReportTest(unittest.IsolatedAsyncioTestCase):
    async def test_an_answered_run_ends_with_a_structured_report(self):
        model = ScriptedModel(replies=[
            ask_tools(("percent_change", {"baseline": 14200000, "actual": 15100000})),
            AIMessage(content="M-006 is 6.3% over budget."),
            with_usage(report_reply("One cost risk.", [OVERRUN], ["Schedule not checked"]), 900),
        ])

        state = await run_agent("Budget risks on PRJ-2401?", model)

        self.assertIsNone(state["report_error"])
        self.assertEqual(state["report"]["summary"], "One cost risk.")
        [finding] = state["report"]["findings"]
        self.assertEqual(finding["evidence"][0], {"project_id": "PRJ-2401", "record_id": "M-006",
                                                  "note": "actual 15.1M vs planned 14.2M"})
        self.assertEqual(finding["calculations"][0]["result"], "6.3")
        self.assertEqual(finding["historical_precedents"][0]["note"], "")  # optional fields get defaults
        self.assertEqual(state["report"]["gaps"], ["Schedule not checked"])
        # The report call saw the whole conversation plus the report instruction.
        report_call = model.turns[-1]
        self.assertIn("6.3", [m.content for m in report_call if isinstance(m, ToolMessage)])
        self.assertIn("write your risk report", report_call[-1].content)
        self.assertNotIn("stopped", report_call[-1].content)
        self.assertEqual(state["trace"][-2] | {"started_at": 0, "duration_ms": 0},
                         {"type": "report", "status": "ok", "tokens": 900, "findings": 1, "error": None,
                          "started_at": 0, "duration_ms": 0})
        self.assertEqual(state["tokens"], 900)

    async def test_a_run_stopped_by_a_limit_still_reports_and_is_told_why(self):
        model = ScriptedModel(replies=[ask_tools(("add_days", {"day": "2026-09-30", "days": 1})) for _ in range(3)]
                              + [report_reply("Partial.", gaps=["Costs not checked"])])

        state = await run_agent("Dates", model, limits=Limits(max_tool_calls=2))

        self.assertEqual(state["stopped_reason"], "tool_calls")
        self.assertEqual(state["report"]["gaps"], ["Costs not checked"])
        self.assertIn("stopped at its tool_calls limit", model.turns[-1][-1].content)
        # The unrun call was answered before the report, so the conversation is valid.
        self.assertTrue(model.turns[-1][-2].content.startswith("Not run"))

    async def test_an_invalid_report_is_retried_once(self):
        bad = {**OVERRUN, "confidence": "very high"}
        model = ScriptedModel(replies=[AIMessage(content="Done."), report_reply(findings=[bad]),
                                       report_reply("Fixed.", [OVERRUN])])

        state = await run_agent("Risks?", model)

        self.assertEqual(state["report"]["summary"], "Fixed.")
        self.assertEqual(len(model.turns), 3)

    async def test_a_failed_report_is_recorded_not_raised(self):
        bad = {**OVERRUN, "confidence": "very high"}
        model = ScriptedModel(replies=[AIMessage(content="Done."), AIMessage(content="Here is my report in prose."),
                                       report_reply(findings=[bad])])

        state = await run_agent("Risks?", model)

        self.assertIsNone(state["report"])
        self.assertIn("after 2 attempts", state["report_error"])
        self.assertIn("confidence", state["report_error"])  # the last validation error says why
        self.assertEqual(state["trace"][-2]["status"], "failed")
        self.assertEqual(state["messages"][-1].content, "Done.")  # the conversation is kept

    async def test_a_hanging_report_is_cut_off_at_its_own_limit(self):
        state = await asyncio.wait_for(
            run_agent("Hello", HangingModel(replies=[]), limits=Limits(max_seconds=0.2, report_seconds=0.3)), 2)

        self.assertEqual(state["report_error"], "The report took longer than 0.3 seconds")


@tool
def records(project_id: str) -> str:
    """Stands in for a database read tool: M-006 and TSK-102 on PRJ-2401, RSK-001 on PRJ-03."""
    if project_id == "PRJ-03":
        return json.dumps({"status": "ok", "project_id": "PRJ-03", "risks": [{"risk_id": "RSK-001"}]})
    if project_id != "PRJ-2401":
        raise ValueError(f"Unknown project {project_id!r}")
    return json.dumps({"status": "ok", "project_id": "PRJ-2401", "entities": {
        "milestone": [{"milestone_id": "M-006", "planned_amount": "14200000.00", "actual_amount": "15100000.00",
                       "planned_date": "2026-09-21"}],
        "task": [{"task_id": "TSK-102", "name": "Envelope"}],
    }})


@tool
def document() -> str:
    """Stands in for a read tool whose result is not JSON and names no project."""
    return "Site diary: M-006 delayed by rain."


VALIDATION_TOOLS = CALCULATOR_TOOLS + [records, document]


def finding(statement="M-006 is 6.3% over budget.", evidence=(("PRJ-2401", "M-006"),), calculations=(),
            precedents=()):
    return {"statement": statement, "confidence": "high",
            "evidence": [{"project_id": project, "record_id": record} for project, record in evidence],
            "historical_precedents": [{"project_id": project, "record_id": record} for project, record in precedents],
            "calculations": [{"description": f"result {index}", "tool": name, "result": result}
                             for index, (name, result) in enumerate(calculations)]}


async def validated(*findings, summary="Cost risk.", calls=(), question="Risks?"):
    """Run the agent: one turn of tool calls, an answer, then a report with these findings."""
    replies = ([ask_tools(*calls)] if calls else []) + [AIMessage(content="Done."), report_reply(summary, findings)]
    return await run_agent(question, ScriptedModel(replies=replies), VALIDATION_TOOLS)


def warnings(state, index=0):
    return state["report"]["findings"][index]["warnings"]


READ_PRJ_2401 = ("records", {"project_id": "PRJ-2401"})
OVERRUN_CALL = ("percent_change", {"baseline": 14200000, "actual": 15100000})


class ValidationTest(unittest.IsolatedAsyncioTestCase):
    async def test_a_report_backed_by_its_tool_results_has_no_warnings(self):
        state = await validated(
            finding("M-006 is 6.3% over budget (planned 14,200,000; due 2026-09-21).",
                    evidence=[("PRJ-2401", "M-006"), ("PRJ-2401", "TSK-102")],
                    calculations=[("percent_change", "6.3")], precedents=[("PRJ-03", "RSK-001")]),
            summary="One cost risk in the next 30 days.",
            calls=[READ_PRJ_2401, ("records", {"project_id": "PRJ-03"}), OVERRUN_CALL],
            question="Risks on PRJ-2401 in the next 30 days?")

        self.assertEqual(state["report"]["warnings"], [])
        self.assertEqual(warnings(state), [])
        self.assertEqual({k: state["trace"][-1][k] for k in ("type", "status", "warnings")},
                         {"type": "validate", "status": "ok", "warnings": 0})

    async def test_a_cited_id_must_be_in_a_tool_result_whole_and_with_its_project(self):
        state = await validated(
            finding("Envelope work is late.", evidence=[("PRJ-2401", "TSK-10"), ("PRJ-2401", "TSK-999"),
                                                        ("PRJ-03", "M-006")],
                    precedents=[("PRJ-2401", "RSK-001")]),
            calls=[READ_PRJ_2401, ("records", {"project_id": "PRJ-03"})])

        self.assertEqual(warnings(state), [
            "Evidence TSK-10 is not in any tool result",  # TSK-102 was read, not TSK-10
            "Evidence TSK-999 is not in any tool result",
            "Evidence M-006 was read in PRJ-2401, not PRJ-03",
            "Precedent RSK-001 was read in PRJ-03, not PRJ-2401",
        ])
        self.assertEqual(state["trace"][-1]["warnings"], 4)

    async def test_text_without_a_project_counts_only_if_it_names_the_project(self):
        state = await validated(finding("Rain delays M-006."), calls=[("document", {})])

        self.assertEqual(warnings(state), ["Evidence M-006 is not in any tool result"])

    async def test_a_failed_tool_call_is_not_a_source(self):
        # The error message quotes the arguments, but an error is never evidence.
        state = await validated(finding("Overrun."), calls=[("records", {"project_id": "PRJ-2401 M-006"})])

        self.assertEqual(warnings(state), ["Evidence M-006 is not in any tool result"])

    async def test_a_calculation_must_match_a_calculator_call_from_this_run(self):
        state = await validated(
            finding("Overrun.", calculations=[("percent_change", "6.3"), ("percent_change", "6.4"),
                                              ("days_between", "10"), ("records", "14200000"),
                                              ("calculate", "6.34"), ("calculate", "6.3%"),
                                              ("calculate", "about six percent")]),
            calls=[READ_PRJ_2401, OVERRUN_CALL,
                   ("calculate", {"expression": "(15100000 - 14200000) / 14200000 * 100"})])

        self.assertEqual(warnings(state), [  # 6.34 and 6.3 are 6.338... rounded
            "Calculation 'result 1': '6.4' is not a result percent_change returned",
            "Calculation 'result 2': days_between was not called in this run",
            "Calculation 'result 3': records is not a calculator tool",
            "Calculation 'result 6': 'about six percent' is not a result calculate returned",
        ])

    async def test_numbers_in_statements_and_summary_must_come_from_a_tool(self):
        state = await validated(
            finding("M-006 is 15.1M against 14.2M planned, 6.3% over, 25% under on P-02, due 2026-09-30."),
            summary="Two risks, 12 days of slip.",
            calls=[READ_PRJ_2401, OVERRUN_CALL, ("percent_change", {"baseline": 200, "actual": 150})])

        # 15.1M is the model scaling 15100000 itself; -25.0 may be written as "25% under".
        self.assertEqual(warnings(state), ["Numbers in the statement that no tool returned: 2026-09-30, 15.1, 14.2"])
        self.assertEqual(state["report"]["warnings"], ["Numbers in the summary that no tool returned: 12"])

    async def test_a_failed_report_is_not_validated(self):
        model = ScriptedModel(replies=[AIMessage(content="Done."), AIMessage(content="prose"), AIMessage(content="prose")])

        state = await run_agent("Risks?", model)

        self.assertIsNone(state["report"])
        self.assertEqual(state["trace"][-1]["type"], "validate")
        self.assertEqual(state["trace"][-1]["status"], "skipped")

    async def test_a_run_stopped_by_a_limit_is_still_validated(self):
        replies = [ask_tools(READ_PRJ_2401), ask_tools(OVERRUN_CALL),
                   report_reply("Partial.", [finding(calculations=[("percent_change", "6.3")])])]

        state = await run_agent("Risks?", ScriptedModel(replies=replies), VALIDATION_TOOLS, Limits(max_tool_calls=1))

        self.assertEqual(state["stopped_reason"], "tool_calls")
        self.assertEqual(warnings(state), ["Calculation 'result 0': percent_change was not called in this run",
                                           "Numbers in the statement that no tool returned: 6.3"])


def mcp_tool(name, **properties):
    return SimpleNamespace(name=name, description=f"{name} description",
                           input_schema={"type": "object", "properties": properties, "required": list(properties)})


def mcp_result(text, is_error=False):
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)], is_error=is_error)


class FakeMcpSession:
    """Stands in for the database MCP client session: lists tools and answers calls from a dict."""

    def __init__(self, answers):
        self.answers = answers
        self.calls = []

    async def list_tools(self):
        return SimpleNamespace(tools=[
            mcp_tool("get_project_records", project_id={"type": "string"}),
            mcp_tool("list_projects"),
            mcp_tool("read_only_sql_query", query={"type": "string"}),
            mcp_tool("apply_project_entity_action", action={"type": "object"}),
        ])

    async def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        return self.answers[name](arguments)


class McpToolsTest(unittest.IsolatedAsyncioTestCase):
    async def test_only_allowlisted_read_tools_are_exposed(self):
        tools = await langchain_tools(FakeMcpSession({}))

        self.assertEqual(sorted(tool.name for tool in tools), ["get_project_records", "list_projects"])
        self.assertEqual(tools[0].description, "get_project_records description")
        self.assertIn("project_id", tools[0].args)

    async def test_a_call_is_forwarded_to_the_mcp_server(self):
        session = FakeMcpSession({"get_project_records": lambda args: mcp_result('{"status": "ok"}')})
        [records, _] = await langchain_tools(session)

        self.assertEqual(await records.ainvoke({"project_id": "PRJ-2401"}), '{"status": "ok"}')
        self.assertEqual(session.calls, [("get_project_records", {"project_id": "PRJ-2401"})])

    async def test_long_results_are_truncated_and_errors_raise(self):
        session = FakeMcpSession({
            "get_project_records": lambda args: mcp_result("x" * (MAX_RESULT_CHARS + 50)),
            "list_projects": lambda args: mcp_result("database unavailable", is_error=True),
        })
        records, projects = await langchain_tools(session)

        text = await records.ainvoke({"project_id": "PRJ-2401"})
        self.assertTrue(text.startswith("x" * MAX_RESULT_CHARS))
        self.assertIn("truncated", text)
        with self.assertRaises(Exception):
            await projects.ainvoke({})

    async def test_the_loop_reads_data_then_calculates(self):
        record = {"milestone_id": "M-006", "planned_amount": "14200000.00", "actual_amount": "15100000.00"}
        session = FakeMcpSession({"get_project_records": lambda args: mcp_result(json.dumps({"records": [record]}))})
        model = ScriptedModel(replies=[
            ask_tools(("get_project_records", {"project_id": "PRJ-2401"})),
            ask_tools(("percent_change", {"baseline": 14200000, "actual": 15100000})),
            AIMessage(content="M-006 is 6.3% over budget."),
        ])

        messages = (await run_agent("Budget risks on PRJ-2401?", model, await risk_agent_tools(session)))["messages"]

        tool_results = [m for m in messages if isinstance(m, ToolMessage)]
        self.assertEqual([m.name for m in tool_results], ["get_project_records", "percent_change"])
        self.assertIn("M-006", tool_results[0].content)
        self.assertEqual(tool_results[1].content, "6.3")
        self.assertIn("apply_project_entity_action", [t.name for t in (await FakeMcpSession({}).list_tools()).tools])
        self.assertNotIn("apply_project_entity_action", model.bound_tools)


class PromptFileTest(unittest.TestCase):
    def test_prompts_come_from_the_file_by_section(self):
        self.assertTrue(SYSTEM_PROMPT.startswith("You are a project risk engineer"))
        self.assertTrue(REPORT_PROMPT.startswith("Stop calling tools"))
        self.assertNotIn("## ", SYSTEM_PROMPT + REPORT_PROMPT)
        self.assertEqual(PROMPT_VERSION, hashlib.sha256(PROMPT_FILE.read_bytes()).hexdigest()[:12])

    def test_any_edit_gives_a_new_version(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "risk.md"
            path.write_text("# Title\n\n## System\nBe careful.\n\n## Report\nReport.\n", encoding="utf-8")
            prompts, version = _load_prompts(path)
            path.write_text("# Title\n\n## System\nBe very careful.\n\n## Report\nReport.\n", encoding="utf-8")
            _, edited = _load_prompts(path)

        self.assertEqual(prompts, {"system": "Be careful.", "report": "Report."})
        self.assertNotEqual(version, edited)


@contextlib.asynccontextmanager
async def fake_session(session):
    yield session


class RunRiskAgentTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        record = {"milestone_id": "M-006", "planned_amount": "14200000.00", "actual_amount": "15100000.00"}
        self.session = FakeMcpSession({"get_project_records": lambda args: mcp_result(
            json.dumps({"status": "ok", "project_id": args["project_id"], "records": [record]}))})

    async def test_a_run_reads_the_project_and_records_its_prompt_and_model(self):
        model = ScriptedModel(replies=[
            ask_tools(("get_project_records", {"project_id": "PRJ-2401"})),
            ask_tools(OVERRUN_CALL),
            AIMessage(content="Done."),
            report_reply("One cost risk.", [finding(calculations=[("percent_change", "6.3")])]),
        ])

        state = await run_risk_agent(" PRJ-2401 ", "Cost risks?", model, open_session=lambda: fake_session(self.session))

        self.assertEqual(model.turns[0][1].content, "Project: PRJ-2401\n\nCost risks?")
        self.assertEqual(model.turns[0][0].content, SYSTEM_PROMPT)
        self.assertIn("get_project_records", model.bound_tools)
        self.assertIn("percent_change", model.bound_tools)
        self.assertEqual(self.session.calls, [("get_project_records", {"project_id": "PRJ-2401"})])
        self.assertEqual((state["model"], state["prompt_version"]), ("scripted", PROMPT_VERSION))
        self.assertEqual(warnings(state), [])

        result = json.loads(json.dumps(run_result(state)))  # plain JSON, no messages
        self.assertEqual(set(result), {"model", "prompt_version", "stopped_reason", "tool_calls", "tokens",
                                       "report", "report_error", "trace"})
        self.assertEqual(result["tool_calls"], 2)

    async def test_the_default_question_is_used_when_none_is_given(self):
        model = ScriptedModel(replies=[AIMessage(content="Done.")])

        await run_risk_agent("PRJ-2401", "  ", model, open_session=lambda: fake_session(self.session))

        self.assertEqual(model.turns[0][1].content, f"Project: PRJ-2401\n\n{DEFAULT_QUESTION}")

    async def test_a_project_id_is_required(self):
        with self.assertRaises(ValueError):
            await run_risk_agent(" ", model=ScriptedModel(replies=[]), open_session=lambda: fake_session(self.session))

    async def test_the_cli_output_shows_findings_and_their_warnings(self):
        model = ScriptedModel(replies=[
            AIMessage(content="Done."),
            report_reply("Cost risk of 9%.", [finding(calculations=[("percent_change", "6.3")])], ["Schedule"]),
        ])
        state = await run_agent("Risks?", model)

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            _print_run(state)

        text = output.getvalue()
        self.assertIn(f"prompt {PROMPT_VERSION}", text)
        self.assertIn("1. [high] M-006 is 6.3% over budget.", text)
        self.assertIn("evidence: PRJ-2401 M-006", text)
        self.assertIn("! Evidence M-006 is not in any tool result", text)
        self.assertIn("! Numbers in the summary that no tool returned: 9", text)
        self.assertIn("  - Schedule", text)


class RealMcpServerTest(unittest.IsolatedAsyncioTestCase):
    async def test_real_database_mcp_server_exposes_only_read_tools(self):
        """Starts the real database MCP server (listing tools needs no database)."""
        async with database_session() as session:
            tools = await langchain_tools(session)

        self.assertEqual({tool.name for tool in tools}, READ_TOOLS)

    async def test_a_tool_that_raises_comes_back_as_an_mcp_error(self):
        """Bad input is rejected before any database access, so this needs no database either."""
        async with database_session() as session:
            result = await session.call_tool("get_project_records", {"project_id": "PRJ-2401", "entity": "session"})

        self.assertTrue(result.is_error)
        self.assertIn("Unsupported entity", result.content[0].text)


if __name__ == "__main__":
    unittest.main()
