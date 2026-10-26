"""Database MCP tools for the agents: an allowlist of read-only tools, wrapped as LangChain tools.

The MCP server describes each tool with a name, a description and a JSON schema for its
arguments. For every allowed tool we build a LangChain tool with the same three things, whose
function forwards the call to the MCP server. The model sees them exactly like the calculator
tools; it never knows they run in another process.

Only tools in READ_TOOLS are exposed. Write tools (apply_project_entity_action and
record_email_decision) are never given to an agent.
"""

from langchain_core.tools import StructuredTool, ToolException

# Agents only see what PROJECT_ENTITY_POLICIES allows: get_project_entity_schema describes the
# policy entities only. read_only_sql_query stays off the list until a read-only database role
# limits it to agent views (step 4d); hiding the schema alone wouldn't stop SQL reading any table.
READ_TOOLS = frozenset({
    "list_projects",
    "get_project_entity_schema",
    "get_project_records",
    "query_records",
    "aggregate_records",
    "list_project_documents",
    "get_document_text",
})
MAX_RESULT_CHARS = 20_000


def _result_text(result) -> str:
    """Join the text blocks of an MCP tool result, cut to MAX_RESULT_CHARS so one call can't flood the context."""
    text = "\n".join(block.text for block in result.content if getattr(block, "type", "") == "text")
    if len(text) > MAX_RESULT_CHARS:
        text = text[:MAX_RESULT_CHARS] + f"\n... [truncated: result was {len(text)} characters; narrow the query]"
    return text


def _wrap(session, mcp_tool) -> StructuredTool:
    async def call(**arguments) -> str:
        result = await session.call_tool(mcp_tool.name, arguments)
        text = _result_text(result)
        if result.is_error:
            raise ToolException(text or f"{mcp_tool.name} failed")  # returned to the model as an error message
        return text

    return StructuredTool.from_function(
        coroutine=call,
        name=mcp_tool.name,
        description=mcp_tool.description or mcp_tool.name,
        args_schema=mcp_tool.input_schema,  # the MCP JSON schema, passed to the model as-is
    )


async def langchain_tools(session, allowed=READ_TOOLS) -> list[StructuredTool]:
    """The MCP server's tools that are on the allowlist, as LangChain tools."""
    listed = await session.list_tools()
    return [_wrap(session, mcp_tool) for mcp_tool in listed.tools if mcp_tool.name in allowed]
