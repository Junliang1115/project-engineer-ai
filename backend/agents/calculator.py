"""Calculator tools for the agents: every number in a finding comes from here, never from the model.

Each function is a LangChain tool. The model only sees a tool's name, its docstring (the
description) and its argument types (the schema); our code runs the function and returns the
result to the model. A tool that raises returns the error message to the model instead, so it can
correct itself.
"""

import ast
import operator
from datetime import date, timedelta

from langchain_core.tools import tool

MAX_EXPRESSION_CHARS = 200
MAX_EXPONENT = 100

_OPERATORS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow,
    ast.USub: operator.neg, ast.UAdd: operator.pos,
}
_FUNCTIONS = {"round": round, "min": min, "max": max, "abs": abs, "sum": sum}


def _evaluate(node):
    """Check the parsed expression through binary tree, allowing only numbers, arithmetic and a few functions."""
    if isinstance(node, ast.Expression):
        return _evaluate(node.body)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return node.value
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_evaluate(item) for item in node.elts]
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPERATORS:
        return _OPERATORS[type(node.op)](_evaluate(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _OPERATORS:
        left, right = _evaluate(node.left), _evaluate(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > MAX_EXPONENT:
            raise ValueError(f"Exponent larger than {MAX_EXPONENT} is not allowed")
        return _OPERATORS[type(node.op)](left, right)
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _FUNCTIONS
            and not node.keywords):
        return _FUNCTIONS[node.func.id](*[_evaluate(arg) for arg in node.args])
    raise ValueError(f"Not allowed in an expression: {ast.dump(node)[:60]}")


def _parse_day(value: str, name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValueError(f"{name} must be a date as YYYY-MM-DD, got {value!r}") from None


@tool
def calculate(expression: str) -> float:
    """Evaluate an arithmetic expression, e.g. "(15100000 - 14200000) / 14200000 * 100".

    Allowed: numbers, + - * / // % **, parentheses, and round, min, max, abs, sum
    (sum takes a list: sum([1, 2, 3])). Use this for any arithmetic instead of doing it yourself.
    """
    if len(expression) > MAX_EXPRESSION_CHARS:
        raise ValueError(f"Expression longer than {MAX_EXPRESSION_CHARS} characters")
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError:
        raise ValueError(f"Not a valid expression: {expression!r}") from None
    try:
        return _evaluate(tree)
    except ZeroDivisionError:
        raise ValueError("Division by zero") from None


@tool
def days_between(start: str, end: str) -> int:
    """Number of days from start to end (dates as YYYY-MM-DD). Negative when end is before start.

    Use it for days late (planned date → today) or durations.
    """
    return (_parse_day(end, "end") - _parse_day(start, "start")).days


@tool
def add_days(day: str, days: int) -> str:
    """The date `days` after `day` (YYYY-MM-DD); use a negative number to go back."""
    return (_parse_day(day, "day") + timedelta(days=days)).isoformat()


@tool
def percent_change(baseline: float, actual: float) -> float:
    """Percentage change from baseline to actual, rounded to 1 decimal.

    E.g. planned cost 14200000, actual 15100000 -> 6.3 (6.3% over). Negative means under baseline.
    """
    if baseline == 0:
        raise ValueError("Baseline is 0, so a percentage change is undefined")
    return round((actual - baseline) / baseline * 100, 1)


@tool
def schedule_slip(planned_end: str, forecast_end: str, float_days: int = 0) -> dict:
    """Schedule slip of an activity: forecast end vs planned end (YYYY-MM-DD).

    float_days is the slack before the slip delays the next activity or milestone.
    Returns slip_days (how late the activity is) and net_delay_days (slip left after the float,
    never below 0; this is the delay that reaches the milestone).
    """
    slip = (_parse_day(forecast_end, "forecast_end") - _parse_day(planned_end, "planned_end")).days
    return {"slip_days": slip, "net_delay_days": max(0, slip - max(0, float_days))}


CALCULATOR_TOOLS = [calculate, days_between, add_days, percent_change, schedule_slip]
