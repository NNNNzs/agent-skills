#!/usr/bin/env python3
"""
Read and parse Node-RED flow files.
Usage:
  python read_flow.py <flow.json>                    # Read entire flow
  python read_flow.py <flow.json> --node <id>       # Read specific node
  python read_flow.py <flow.json> --tab <id>         # Read specific tab
  python read_flow.py <flow.json> --type <type>     # Filter by node type
  python read_flow.py <flow.json> --summary         # Show flow summary
"""

import json
import sys
from typing import List, Dict, Optional


def read_flow(flow_path: str) -> List[Dict]:
    """Read and parse a Node-RED flow file."""
    try:
        with open(flow_path, "r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {flow_path}")
        print(f"  {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"ERROR: File not found: {flow_path}")
        sys.exit(1)


def get_node_by_id(flow: List[Dict], node_id: str) -> Optional[Dict]:
    """Find a specific node by ID."""
    for node in flow:
        if node.get("id") == node_id:
            return node
    return None


def get_nodes_by_type(flow: List[Dict], node_type: str) -> List[Dict]:
    """Get all nodes of a specific type."""
    return [node for node in flow if node.get("type") == node_type]


def get_tab_nodes(flow: List[Dict], tab_id: str) -> List[Dict]:
    """Get all nodes in a specific tab."""
    return [node for node in flow if node.get("z") == tab_id]


def get_tabs(flow: List[Dict]) -> List[Dict]:
    """Get all tab definitions."""
    return [node for node in flow if node.get("type") == "tab"]


def print_summary(flow: List[Dict]):
    """Print a summary of the flow."""
    tabs = get_tabs(flow)
    nodes_by_type = {}

    for node in flow:
        node_type = node.get("type", "unknown")
        nodes_by_type[node_type] = nodes_by_type.get(node_type, 0) + 1

    print(f"Flow Summary:")
    print(f"  Total nodes: {len(flow)}")
    print(f"  Tabs: {len(tabs)}")

    if tabs:
        print(f"\nTabs:")
        for tab in tabs:
            tab_nodes = get_tab_nodes(flow, tab["id"])
            print(f"  - {tab.get('label', tab['id'])} ({len(tab_nodes)} nodes)")

    print(f"\nNode Types:")
    for node_type, count in sorted(nodes_by_type.items()):
        print(f"  {node_type}: {count}")


def print_node(node: Dict, indent: int = 0):
    """Pretty print a node."""
    prefix = "  " * indent
    print(f"{prefix}ID: {node.get('id', 'N/A')}")
    print(f"{prefix}Type: {node.get('type', 'N/A')}")
    print(f"{prefix}Name: {node.get('name', 'N/A')}")

    if node.get("type") == "tab":
        print(f"{prefix}Label: {node.get('label', 'N/A')}")
        print(f"{prefix}Disabled: {node.get('disabled', False)}")
        if node.get("info"):
            print(f"{prefix}Info: {node['info']}")
    else:
        print(f"{prefix}Tab: {node.get('z', 'N/A')}")
        if "x" in node and "y" in node:
            print(f"{prefix}Position: ({node['x']}, {node['y']})")

        if "wires" in node:
            print(f"{prefix}Wires: {len(node['wires'])} output(s)")
            for i, wire in enumerate(node["wires"]):
                print(f"{prefix}  Output {i}: {len(wire)} connection(s)")

        if node.get("type") == "function" and "func" in node:
            func_code = node["func"]
            lines = func_code.split("\n")
            if len(lines) <= 5:
                print(f"{prefix}Code:")
                for line in lines:
                    print(f"{prefix}    {line}")
            else:
                print(f"{prefix}Code: {len(lines)} lines (truncated)")


def main():
    if len(sys.argv) < 2:
        print("Usage: python read_flow.py <flow.json> [options]")
        print("\nOptions:")
        print("  --node <id>       Read specific node")
        print("  --tab <id>        Read all nodes in a tab")
        print("  --type <type>     Filter by node type")
        print("  --summary         Show flow summary")
        print("\nExamples:")
        print("  python read_flow.py flows.json --summary")
        print("  python read_flow.py flows.json --type mqtt in")
        print("  python read_flow.py flows.json --node abc123")
        sys.exit(1)

    flow_path = sys.argv[1]
    flow = read_flow(flow_path)

    # Parse options
    options = sys.argv[2:]
    if "--summary" in options:
        print_summary(flow)
    elif "--node" in options:
        idx = options.index("--node")
        if idx + 1 >= len(options):
            print("ERROR: --node requires an ID")
            sys.exit(1)
        node_id = options[idx + 1]
        node = get_node_by_id(flow, node_id)
        if node:
            print_node(node)
        else:
            print(f"ERROR: Node not found: {node_id}")
            sys.exit(1)
    elif "--tab" in options:
        idx = options.index("--tab")
        if idx + 1 >= len(options):
            print("ERROR: --tab requires an ID")
            sys.exit(1)
        tab_id = options[idx + 1]
        nodes = get_tab_nodes(flow, tab_id)
        print(f"Tab {tab_id} ({len(nodes)} nodes):")
        for node in nodes:
            print_node(node, indent=1)
            print()
    elif "--type" in options:
        idx = options.index("--type")
        if idx + 1 >= len(options):
            print("ERROR: --type requires a type name")
            sys.exit(1)
        node_type = options[idx + 1]
        nodes = get_nodes_by_type(flow, node_type)
        print(f"Nodes of type '{node_type}' ({len(nodes)} found):")
        for node in nodes:
            print_node(node, indent=1)
            print()
    else:
        # Print entire flow
        print(f"Flow: {flow_path} ({len(flow)} nodes)\n")
        for node in flow:
            print_node(node)
            print()


if __name__ == "__main__":
    main()
