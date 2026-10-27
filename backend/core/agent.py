"""The chat model and structured output, shared by the email pipeline and the agents.

Structured output works by tool calling: the model is forced to call a tool named after the
Pydantic schema, and its arguments are parsed into that schema. Now and then the model answers in
plain text instead, or calls the tool with arguments the schema rejects; the result is then None.
Asking again usually works, so each call gets STRUCTURED_ATTEMPTS tries before it fails.
"""

import os

STRUCTURED_ATTEMPTS = 2  # one retry: a third try costs a full call and rarely helps


def config_model():
    """The DeepSeek chat model, temperature 0, with thinking off so tool calls are forced."""
    from langchain_deepseek import ChatDeepSeek

    if not os.getenv("DEEPSEEK_API_KEY"):
        raise ValueError("DEEPSEEK_API_KEY is required")
    return ChatDeepSeek(
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        temperature=0,
        extra_body={"thinking": {"type": "disabled"}},
    )


class StructuredOutputError(RuntimeError):
    """The model did not return valid structured output in STRUCTURED_ATTEMPTS tries.

    Callers decide what that means: the email scanner marks the email as failed and retries it on
    the next scan; the risk agent keeps the run and records the error as `report_error`.
    """


def invoke_structured(model, schema, prompt):
    """Ask the model for `schema` and return it as a `schema` instance; raises StructuredOutputError."""
    structured = model.with_structured_output(schema)
    for _ in range(STRUCTURED_ATTEMPTS):
        result = structured.invoke(prompt)
        if result is not None:
            return result if isinstance(result, schema) else schema.model_validate(result)
    raise StructuredOutputError(f"The model returned no valid {schema.__name__} after {STRUCTURED_ATTEMPTS} attempts")


async def ainvoke_structured(model, schema, prompt, replies: list | None = None):
    """Async invoke_structured. Appends each raw model reply to `replies` (for token counts), and
    the error names the last validation problem, so a failure says why."""
    structured = model.with_structured_output(schema, include_raw=True)
    error = None
    for _ in range(STRUCTURED_ATTEMPTS):
        output = await structured.ainvoke(prompt)
        if replies is not None:
            replies.append(output["raw"])
        result, error = output["parsed"], output["parsing_error"] or error
        if result is not None:
            return result if isinstance(result, schema) else schema.model_validate(result)
    reason = f" (last error: {str(error)[:300]})" if error else ""
    raise StructuredOutputError(
        f"The model returned no valid {schema.__name__} after {STRUCTURED_ATTEMPTS} attempts{reason}")
