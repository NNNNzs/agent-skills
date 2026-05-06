#!/usr/bin/env python3
"""
Deploy Node-RED flows via Admin API.
Usage:
  python deploy_flow.py --url <url> --flows <flows.json> [--token <token>] [--username <user> --password <pass>]
  python deploy_flow.py --url <url> --get [--save output.json]
  python deploy_flow.py --url <url> --validate <flows.json>
"""

import json
import sys
import requests
from typing import Dict, Optional


def get_auth_headers(token: Optional[str] = None, username: Optional[str] = None, password: Optional[str] = None) -> Dict[str, str]:
    """Get authentication headers."""
    headers = {"Content-Type": "application/json"}

    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif username and password:
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers["Authorization"] = f"Basic {credentials}"

    return headers


def get_flows(url: str, headers: Dict[str, str]) -> Dict:
    """Get current flows from Node-RED."""
    response = requests.get(f"{url}/flows", headers=headers)
    response.raise_for_status()
    return response.json()


def deploy_flows(url: str, flows: list, deployment_type: str = "full", headers: Optional[Dict[str, str]] = None, rev: Optional[str] = None) -> Dict:
    """Deploy flows to Node-RED."""
    if headers is None:
        headers = {"Content-Type": "application/json"}

    headers["Node-RED-Deployment-Type"] = deployment_type

    payload = {"flows": flows}
    if rev:
        payload["rev"] = rev

    response = requests.post(f"{url}/flows", json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def validate_flows(url: str, flows: list, headers: Dict[str, str]) -> bool:
    """Validate flows without deploying."""
    try:
        deploy_flows(url, flows, deployment_type="flows", headers=headers)
        return True
    except requests.exceptions.HTTPError as e:
        print(f"Validation failed: {e}")
        try:
            error_data = e.response.json()
            print(f"Error details: {error_data}")
        except:
            print(f"Response: {e.response.text}")
        return False


def get_token(url: str, username: str, password: str) -> str:
    """Get authentication token."""
    payload = {
        "client_id": "node-red-editor",
        "grant_type": "password",
        "username": username,
        "password": password,
        "scope": "read write"
    }

    response = requests.post(f"{url}/auth/token", json=payload)
    response.raise_for_status()
    return response.json()["access_token"]


def main():
    if len(sys.argv) < 2:
        print("Usage: python deploy_flow.py [options]")
        print("\nOptions:")
        print("  --url <url>                 Node-RED base URL (e.g., http://localhost:1880)")
        print("\nActions:")
        print("  --get [--save <file>]       Get current flows and optionally save to file")
        print("  --deploy --flows <file>     Deploy flows from file")
        print("  --validate --flows <file>   Validate flows without deploying")
        print("\nAuthentication (optional):")
        print("  --token <token>            Bearer token")
        print("  --username <user>           Username for basic auth or token request")
        print("  --password <pass>           Password")
        print("\nDeployment options:")
        print("  --type <type>               Deployment type: full, nodes, flows, reload (default: full)")
        print("\nExamples:")
        print("  python deploy_flow.py --url http://localhost:1880 --get --save backup.json")
        print("  python deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json")
        print("  python deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json --username admin --password secret")
        print("  python deploy_flow.py --url http://localhost:1880 --validate --flows flows.json")
        sys.exit(1)

    args = sys.argv[1:]

    # Parse required arguments
    if "--url" not in args:
        print("ERROR: --url is required")
        sys.exit(1)

    url_idx = args.index("--url")
    if url_idx + 1 >= len(args):
        print("ERROR: --url requires a URL")
        sys.exit(1)

    base_url = args[url_idx + 1].rstrip("/")

    # Parse authentication
    token = None
    username = None
    password = None

    if "--token" in args:
        idx = args.index("--token")
        if idx + 1 >= len(args):
            print("ERROR: --token requires a token")
            sys.exit(1)
        token = args[idx + 1]

    if "--username" in args and "--password" in args:
        user_idx = args.index("--username")
        pass_idx = args.index("--password")
        if user_idx + 1 >= len(args) or pass_idx + 1 >= len(args):
            print("ERROR: --username and --password require values")
            sys.exit(1)
        username = args[user_idx + 1]
        password = args[pass_idx + 1]

    # Get token if username/password provided but no token
    if username and password and not token:
        print(f"Getting authentication token...")
        token = get_token(base_url, username, password)
        print(f"✓ Token obtained")

    # Build headers
    headers = get_auth_headers(token, username, password)

    # Parse actions
    if "--get" in args:
        print(f"Getting flows from {base_url}...")
        config = get_flows(base_url, headers)

        # Save to file if specified
        if "--save" in args:
            idx = args.index("--save")
            if idx + 1 >= len(args):
                print("ERROR: --save requires a filename")
                sys.exit(1)

            output_file = args[idx + 1]
            with open(output_file, "w") as f:
                json.dump(config, f, indent=2)
            print(f"✓ Flows saved to: {output_file}")
        else:
            print(f"✓ Current flows: {len(config['flows'])} nodes")
            print(f"  Revision: {config.get('rev', 'N/A')}")

    elif "--deploy" in args:
        if "--flows" not in args:
            print("ERROR: --deploy requires --flows")
            sys.exit(1)

        idx = args.index("--flows")
        if idx + 1 >= len(args):
            print("ERROR: --flows requires a filename")
            sys.exit(1)

        flows_file = args[idx + 1]

        # Read flows file
        try:
            with open(flows_file, "r") as f:
                flows_data = json.load(f)
        except FileNotFoundError:
            print(f"ERROR: Flows file not found: {flows_file}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in flows file: {e}")
            sys.exit(1)

        # Determine if file is full config or just flows array
        if isinstance(flows_data, dict):
            flows = flows_data.get("flows", [])
            rev = flows_data.get("rev")
        else:
            flows = flows_data
            rev = None

        # Get deployment type
        deployment_type = "full"
        if "--type" in args:
            idx = args.index("--type")
            if idx + 1 >= len(args):
                print("ERROR: --type requires a type")
                sys.exit(1)
            deployment_type = args[idx + 1]
            if deployment_type not in ["full", "nodes", "flows", "reload"]:
                print(f"ERROR: Invalid deployment type: {deployment_type}")
                sys.exit(1)

        print(f"Deploying {len(flows)} nodes to {base_url}...")
        print(f"  Deployment type: {deployment_type}")

        try:
            result = deploy_flows(base_url, flows, deployment_type, headers, rev)
            print(f"✓ Deployment successful")
            print(f"  New revision: {result.get('rev', 'N/A')}")
        except requests.exceptions.HTTPError as e:
            print(f"✗ Deployment failed: {e}")
            try:
                error_data = e.response.json()
                print(f"  Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"  Response: {e.response.text}")
            sys.exit(1)

    elif "--validate" in args:
        if "--flows" not in args:
            print("ERROR: --validate requires --flows")
            sys.exit(1)

        idx = args.index("--flows")
        if idx + 1 >= len(args):
            print("ERROR: --flows requires a filename")
            sys.exit(1)

        flows_file = args[idx + 1]

        # Read flows file
        try:
            with open(flows_file, "r") as f:
                flows_data = json.load(f)
        except FileNotFoundError:
            print(f"ERROR: Flows file not found: {flows_file}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in flows file: {e}")
            sys.exit(1)

        # Determine if file is full config or just flows array
        if isinstance(flows_data, dict):
            flows = flows_data.get("flows", [])
        else:
            flows = flows_data

        print(f"Validating {len(flows)} nodes against {base_url}...")

        if validate_flows(base_url, flows, headers):
            print(f"✓ Flow validation passed")
        else:
            print(f"✗ Flow validation failed")
            sys.exit(1)

    else:
        print("ERROR: No action specified. Use --get, --deploy, or --validate")
        sys.exit(1)


if __name__ == "__main__":
    main()
