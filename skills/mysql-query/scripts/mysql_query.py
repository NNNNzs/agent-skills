#!/usr/bin/env python3
"""
MySQL Query Script for Skill
Reads database credentials from .env file and executes MySQL queries.
"""

import os
import subprocess
import sys
from pathlib import Path


def parse_jdbc_url(jdbc_url: str) -> dict:
    """Parse JDBC URL to extract host, port, and database."""
    # Remove jdbc:mysql:// prefix
    url = jdbc_url.replace("jdbc:mysql://", "")

    # Split query parameters
    if "?" in url:
        host_part, query_part = url.split("?", 1)
    else:
        host_part = url
        query_part = ""

    # Extract host, port, database
    parts = host_part.split("/")
    host_port = parts[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "3306"

    database = parts[1] if len(parts) > 1 else ""

    return {
        "host": host,
        "port": port,
        "database": database
    }


def read_env_file(project_dir: str) -> dict:
    """Read .env file from config path or project directory."""
    config_path = os.environ.get("DB_CONFIG_PATH")
    env_path = Path(config_path) if config_path else Path(project_dir) / ".env"

    if not env_path.exists():
        print(f"Error: .env file not found at {env_path}", file=sys.stderr)
        sys.exit(1)

    env_vars = {}
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env_vars[key.strip()] = value.strip()

    return env_vars


def build_mysql_command(env_vars: dict) -> list:
    """Build mysql command from environment variables."""
    # Support both DB_URL and individual DB_ variables
    if "DB_URL" in env_vars:
        parsed = parse_jdbc_url(env_vars["DB_URL"])
        host = parsed["host"]
        port = parsed["port"]
        database = parsed["database"]
    else:
        host = env_vars.get("DB_HOST", "localhost")
        port = env_vars.get("DB_PORT", "3306")
        database = env_vars.get("DB_DATABASE", env_vars.get("DB_NAME", ""))

    username = env_vars.get("DB_USERNAME", env_vars.get("DB_USER", "root"))
    password = env_vars.get("DB_PASSWORD", "")

    cmd = [
        "mysql",
        f"-h{host}",
        f"-P{port}",
        f"-u{username}",
        f"-p{password}",
    ]

    if database:
        cmd.append(database)

    return cmd


def execute_query(project_dir: str, query: str = None) -> None:
    """
    Execute MySQL query.

    Args:
        project_dir: Path to project directory containing .env file
        query: SQL query to execute (if None, runs in interactive mode)
    """
    env_vars = read_env_file(project_dir)
    cmd = build_mysql_command(env_vars)

    if query:
        cmd.extend(["-e", query])

    result = subprocess.run(cmd, capture_output=False, text=True)

    if result.returncode != 0:
        sys.exit(result.returncode)


def main():
    if len(sys.argv) < 2:
        print("Usage: mysql_query.py <project_dir> [query]", file=sys.stderr)
        print("  project_dir: Path to project directory containing .env file", file=sys.stderr)
        print("  query: Optional SQL query to execute", file=sys.stderr)
        sys.exit(1)

    project_dir = sys.argv[1]
    query = sys.argv[2] if len(sys.argv) > 2 else None

    execute_query(project_dir, query)


if __name__ == "__main__":
    main()
