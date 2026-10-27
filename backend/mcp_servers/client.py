"""Client side of the database MCP server, shared by the email pipeline and the agents."""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

DB_SERVER_FILE = Path(__file__).resolve().parent / "mcp_db_server.py"


@asynccontextmanager
async def database_session():
    """Start the database MCP server as a subprocess and yield an initialised ClientSession."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    params = StdioServerParameters(command=sys.executable, args=[str(DB_SERVER_FILE)], env=dict(os.environ))
    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            yield session
