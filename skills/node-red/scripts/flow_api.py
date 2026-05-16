#!/usr/bin/env python3
"""
Node-RED v4 Single Flow API client.
Operates on individual flows via /flow/:id endpoints — LLM-friendly, no full JSON needed.

Usage:
  python flow_api.py --url <url> list                    # List all flows (id + label + node count)
  python flow_api.py --url <url> get <flow_id>           # Get single flow JSON
  python flow_api.py --url <url> get <flow_id> --save f.json  # Save to file
  python flow_api.py --url <url> update <flow.json>      # Update flow from file
  python flow_api.py --url <url> create <flow.json>      # Create new flow from file
  python flow_api.py --url <url> delete <flow_id>        # Delete a flow
  python flow_api.py --url <url> backup [--dir ./bk]     # Backup all flows to separate files
"""

import json
import sys
import os
import requests
from datetime import datetime
from typing import Dict, Optional


def get_headers(token: Optional[str] = None, username: Optional[str] = None, password: Optional[str] = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif username and password:
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers["Authorization"] = f"Basic {credentials}"
    return headers


def list_flows(base_url: str, headers: Dict[str, str]) -> list:
    """List all flows with id, label, node count, size."""
    resp = requests.get(f"{base_url}/flows", headers=headers)
    resp.raise_for_status()
    data = resp.json()
    flows = data if isinstance(data, list) else data.get("flows", [])
    
    tabs = [f for f in flows if f.get("type") == "tab"]
    result = []
    for tab in tabs:
        # Get full flow detail via individual API
        try:
            detail = requests.get(f"{base_url}/flow/{tab['id']}", headers=headers).json()
            node_count = len(detail.get("nodes", []))
            result.append({
                "id": tab["id"],
                "label": tab.get("label", "unnamed"),
                "disabled": tab.get("disabled", False),
                "node_count": node_count,
            })
        except Exception:
            # Fallback: count from flat array
            node_count = sum(1 for f in flows if f.get("z") == tab["id"])
            result.append({
                "id": tab["id"],
                "label": tab.get("label", "unnamed"),
                "disabled": tab.get("disabled", False),
                "node_count": node_count,
            })
    return result


def get_flow(base_url: str, flow_id: str, headers: Dict[str, str]) -> dict:
    """Get a single flow by ID."""
    resp = requests.get(f"{base_url}/flow/{flow_id}", headers=headers)
    resp.raise_for_status()
    return resp.json()


def create_flow(base_url: str, flow_data: dict, headers: Dict[str, str]) -> dict:
    """Create a new flow."""
    resp = requests.post(f"{base_url}/flow", json=flow_data, headers=headers)
    resp.raise_for_status()
    return resp.json()


def update_flow(base_url: str, flow_id: str, flow_data: dict, headers: Dict[str, str]) -> dict:
    """Update an existing flow."""
    resp = requests.put(f"{base_url}/flow/{flow_id}", json=flow_data, headers=headers)
    resp.raise_for_status()
    return resp.json()


def delete_flow(base_url: str, flow_id: str, headers: Dict[str, str]) -> dict:
    """Delete a flow."""
    resp = requests.delete(f"{base_url}/flow/{flow_id}", headers=headers)
    resp.raise_for_status()
    return resp.json()


def backup_flows(base_url: str, headers: Dict[str, str], output_dir: str = "./backup") -> list:
    """Backup all flows to separate JSON files."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    flows = list_flows(base_url, headers)
    saved = []
    
    for flow_info in flows:
        fid = flow_info["id"]
        label = flow_info["label"]
        detail = get_flow(base_url, fid, headers)
        
        # Sanitize label for filename
        safe_label = "".join(c if c.isalnum() or c in "-_" else "_" for c in label)
        filename = f"{timestamp}_{safe_label}_{fid[:8]}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(detail, f, indent=2, ensure_ascii=False)
        
        saved.append({"label": label, "file": filepath, "nodes": flow_info["node_count"]})
    
    return saved


def print_flow_summary(flow: dict):
    """Print a human-readable summary of a flow."""
    print(f"Label: {flow.get('label', 'unnamed')}")
    print(f"ID: {flow.get('id')}")
    print(f"Disabled: {flow.get('disabled', False)}")
    
    nodes = flow.get("nodes", [])
    print(f"Nodes: {len(nodes)}")
    print()
    
    for i, node in enumerate(nodes):
        ntype = node.get("type", "?")
        name = node.get("name", "")
        nid = node.get("id", "?")
        wires = node.get("wires", [])
        
        info_parts = [f"[{ntype}"]
        if name:
            info_parts.append(f' "{name}"')
        info_parts.append(f"] ({nid[:12]})")
        info_parts.append(f" → {len(wires)} output(s)")
        
        # Show function code snippet
        if ntype == "function" and node.get("func"):
            code_lines = node["func"].strip().split("\n")
            snippet = code_lines[0][:80] if code_lines else ""
            info_parts.append(f"\n    CODE: {snippet}")
        
        # Show entity for HA nodes
        if "entities" in node and isinstance(node["entities"], dict):
            entity_list = node["entities"].get("entity", [])
            if entity_list:
                info_parts.append(f"\n    ENTITY: {entity_list[0][:60]}")
        
        print(f"  {i+1}. {' '.join(info_parts)}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    args = sys.argv[1:]
    
    # Parse --url
    if "--url" not in args:
        print("ERROR: --url is required")
        sys.exit(1)
    url_idx = args.index("--url")
    if url_idx + 1 >= len(args):
        print("ERROR: --url requires a value")
        sys.exit(1)
    base_url = args[url_idx + 1].rstrip("/")
    
    # Parse auth
    token = None
    username = None
    password = None
    for arg_name, var_name in [("--token", "token"), ("--username", "username"), ("--password", "password")]:
        if arg_name in args:
            idx = args.index(arg_name)
            if idx + 1 < len(args):
                if var_name == "token":
                    token = args[idx + 1]
                elif var_name == "username":
                    username = args[idx + 1]
                else:
                    password = args[idx + 1]
    
    headers = get_headers(token, username, password)
    
    # Parse action - first positional arg
    action = None
    action_idx = 0
    skip_next = False
    for i, a in enumerate(args):
        if skip_next:
            skip_next = False
            continue
        if a.startswith("--"):
            skip_next = True  # skip the value
            continue
        if action is None:
            action = a
            action_idx = i
            break
    
    if not action:
        print("ERROR: No action specified")
        sys.exit(1)
    
    try:
        if action == "list":
            flows = list_flows(base_url, headers)
            print(f"Found {len(flows)} flow(s):\n")
            for f in flows:
                status = " [DISABLED]" if f["disabled"] else ""
                print(f"  {f['label']}{status}")
                print(f"    ID: {f['id']}  |  Nodes: {f['node_count']}")
                print()
        
        elif action == "get":
            remaining = [a for a in args[1:] if not a.startswith("--") and args.index(a) > 0]
            # Find flow_id (first non-flag arg after action)
            flow_id = None
            for i, a in enumerate(args):
                if i > 0 and a == "get":
                    flow_id = args[i + 1] if i + 1 < len(args) and not args[i + 1].startswith("--") else None
                    break
            if not flow_id:
                print("ERROR: get requires a flow ID")
                sys.exit(1)
            
            flow = get_flow(base_url, flow_id, headers)
            
            if "--save" in args:
                save_idx = args.index("--save")
                save_path = args[save_idx + 1] if save_idx + 1 < len(args) else f"flow_{flow_id[:8]}.json"
                with open(save_path, "w", encoding="utf-8") as f:
                    json.dump(flow, f, indent=2, ensure_ascii=False)
                print(f"✓ Saved to {save_path}")
            else:
                print_flow_summary(flow)
        
        elif action == "create":
            remaining = [a for a in args[1:] if not a.startswith("--")]
            file_path = None
            for a in remaining:
                if a.endswith(".json"):
                    file_path = a
                    break
            if not file_path:
                print("ERROR: create requires a JSON file path")
                sys.exit(1)
            
            with open(file_path, "r", encoding="utf-8") as f:
                flow_data = json.load(f)
            
            result = create_flow(base_url, flow_data, headers)
            print(f"✓ Flow created: {result}")
        
        elif action == "update":
            remaining = [a for a in args[1:] if not a.startswith("--")]
            file_path = None
            for a in remaining:
                if a.endswith(".json"):
                    file_path = a
                    break
            if not file_path:
                print("ERROR: update requires a JSON file path")
                sys.exit(1)
            
            with open(file_path, "r", encoding="utf-8") as f:
                flow_data = json.load(f)
            
            flow_id = flow_data.get("id")
            if not flow_id:
                print("ERROR: Flow JSON must have an 'id' field for update")
                sys.exit(1)
            
            result = update_flow(base_url, flow_id, flow_data, headers)
            print(f"✓ Flow updated: {result}")
        
        elif action == "delete":
            remaining = [a for a in args[1:] if not a.startswith("--")]
            flow_id = remaining[0] if remaining else None
            if not flow_id:
                print("ERROR: delete requires a flow ID")
                sys.exit(1)
            
            result = delete_flow(base_url, flow_id, headers)
            print(f"✓ Flow deleted: {result}")
        
        elif action == "backup":
            backup_dir = "./backup"
            if "--dir" in args:
                dir_idx = args.index("--dir")
                if dir_idx + 1 < len(args):
                    backup_dir = args[dir_idx + 1]
            
            saved = backup_flows(base_url, headers, backup_dir)
            print(f"✓ Backed up {len(saved)} flow(s) to {backup_dir}/")
            for s in saved:
                print(f"  {s['label']} ({s['nodes']} nodes) → {s['file']}")
        
        else:
            print(f"ERROR: Unknown action '{action}'")
            print(__doc__)
            sys.exit(1)
    
    except requests.exceptions.HTTPError as e:
        print(f"✗ API Error: {e}")
        try:
            error_data = e.response.json()
            print(f"  Message: {error_data.get('message', 'Unknown')}")
            print(f"  Code: {error_data.get('code', 'N/A')}")
        except Exception:
            print(f"  Response: {e.response.text[:500]}")
        sys.exit(1)
    
    except requests.exceptions.ConnectionError:
        print(f"✗ Cannot connect to Node-RED at {base_url}")
        print("  Is Node-RED running?")
        sys.exit(1)


if __name__ == "__main__":
    main()
