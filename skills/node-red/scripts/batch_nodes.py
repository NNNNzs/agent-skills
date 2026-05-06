#!/usr/bin/env python3
"""
Batch operations on Node-RED flows.
Usage:
  python batch_nodes.py <flow.json> --find --type <type> [--list]
  python batch_nodes.py <flow.json> --find --name <pattern> [--list]
  python batch_nodes.py <flow.json> --enable --type <type>
  python batch_nodes.py <flow.json> --disable --name <pattern>
  python batch_nodes.py <flow.json> --delete --type <type>
  python batch_nodes.py <flow.json> --rename --type <type> --prefix <prefix>
  python batch_nodes.py <flow.json> --export --type <type> [--output export.json]
"""

import json
import sys
import re
from typing import Dict, List, Optional, Callable


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


def write_flow(flow: List[Dict], output_path: str):
    """Write flow to file."""
    with open(output_path, "w") as f:
        json.dump(flow, f, indent=2)
    print(f"✓ Flow saved to: {output_path}")


def find_nodes_by_type(flow: List[Dict], node_type: str) -> List[Dict]:
    """Find all nodes of a specific type."""
    return [node for node in flow if node.get("type") == node_type]


def find_nodes_by_name(flow: List[Dict], pattern: str) -> List[Dict]:
    """Find nodes matching a name pattern."""
    regex = re.compile(pattern, re.IGNORECASE)
    return [node for node in flow if regex.search(node.get("name", ""))]


def find_nodes_by_tab(flow: List[Dict], tab_id: str) -> List[Dict]:
    """Find all nodes in a specific tab."""
    return [node for node in flow if node.get("z") == tab_id]


def find_disabled_nodes(flow: List[Dict]) -> List[Dict]:
    """Find all disabled nodes."""
    return [node for node in flow if node.get("disabled", False)]


def find_function_nodes_with_pattern(flow: List[Dict], pattern: str) -> List[Dict]:
    """Find function nodes containing a pattern in their code."""
    regex = re.compile(pattern, re.IGNORECASE)
    matches = []

    for node in flow:
        if node.get("type") == "function" and "func" in node:
            if regex.search(node["func"]):
                matches.append(node)

    return matches


def print_node_summary(node: Dict):
    """Print a brief summary of a node."""
    node_id = node.get("id", "N/A")
    node_type = node.get("type", "N/A")
    node_name = node.get("name", "unnamed")
    tab_id = node.get("z", "N/A")

    print(f"  - [{node_type}] {node_name} (id: {node_id}, tab: {tab_id})")


def list_nodes(flow: List[Dict], nodes: List[Dict]):
    """List found nodes."""
    print(f"Found {len(nodes)} node(s):")
    for node in nodes:
        print_node_summary(node)


def enable_nodes(flow: List[Dict], nodes: List[Dict]) -> int:
    """Enable a list of nodes."""
    count = 0
    for node in nodes:
        if node.get("disabled", False):
            node["disabled"] = False
            count += 1
            print(f"✓ Enabled: {node.get('name', node['id'])}")
    return count


def disable_nodes(flow: List[Dict], nodes: List[Dict]) -> int:
    """Disable a list of nodes."""
    count = 0
    for node in nodes:
        if not node.get("disabled", False):
            node["disabled"] = True
            count += 1
            print(f"✓ Disabled: {node.get('name', node['id'])}")
    return count


def delete_nodes(flow: List[Dict], nodes: List[Dict]) -> int:
    """Delete a list of nodes and update connections."""
    count = 0
    node_ids = {node["id"] for node in nodes}

    # Remove nodes
    for node in nodes:
        node_id = node["id"]
        for i, n in enumerate(flow):
            if n.get("id") == node_id:
                flow.pop(i)
                count += 1
                print(f"✓ Deleted: {node.get('name', node_id)}")
                break

    # Clean up wire connections
    for node in flow:
        if "wires" in node:
            new_wires = []
            for wire_list in node["wires"]:
                cleaned = [w for w in wire_list if w not in node_ids]
                new_wires.append(cleaned)
            node["wires"] = new_wires

    return count


def rename_nodes(flow: List[Dict], nodes: List[Dict], prefix: str = "", suffix: str = "", replace: Optional[Dict[str, str]] = None) -> int:
    """Rename nodes with prefix, suffix, or replacement."""
    count = 0
    for node in nodes:
        old_name = node.get("name", "")
        if not old_name:
            continue

        new_name = old_name

        if replace:
            # Replacement
            for old, new in replace.items():
                new_name = new_name.replace(old, new)
        else:
            # Prefix and suffix
            new_name = f"{prefix}{old_name}{suffix}"

        if new_name != old_name:
            node["name"] = new_name
            count += 1
            print(f"✓ Renamed: '{old_name}' -> '{new_name}'")

    return count


def export_nodes(flow: List[Dict], nodes: List[Dict], output_path: str):
    """Export nodes to a separate file."""
    exported = [node for node in nodes]

    # Also export any referenced config nodes
    config_nodes = set()
    for node in exported:
        for key, value in node.items():
            if isinstance(value, str) and not key.startswith("_"):
                # This might be a reference to a config node
                for n in flow:
                    if n.get("id") == value and n.get("type", "").endswith("-config"):
                        if n not in exported:
                            exported.append(n)
                            config_nodes.add(n["id"])

    with open(output_path, "w") as f:
        json.dump(exported, f, indent=2)

    print(f"✓ Exported {len(exported)} node(s) to: {output_path}")
    if config_nodes:
        print(f"  (including {len(config_nodes)} config node(s))")


def main():
    if len(sys.argv) < 2:
        print("Usage: python batch_nodes.py <flow.json> [options]")
        print("\nFind operations:")
        print("  --find --type <type> [--list]          Find nodes by type")
        print("  --find --name <pattern> [--list]       Find nodes by name pattern")
        print("  --find --tab <tab_id> [--list]         Find nodes in a tab")
        print("  --find --disabled [--list]             Find all disabled nodes")
        print("  --find --pattern <code> [--list]       Find function nodes with code pattern")
        print("\nModify operations:")
        print("  --enable --type <type>                 Enable all nodes of type")
        print("  --disable --name <pattern>             Disable nodes matching name pattern")
        print("  --delete --type <type>                 Delete all nodes of type")
        print("\nRename operations:")
        print("  --rename --type <type> [--prefix <p>] [--suffix <s>]")
        print("  --rename --name <pattern> --replace <old>,<new>")
        print("\nExport operations:")
        print("  --export --type <type> [--output file.json]")
        print("\nOutput options:")
        print("  --output <file.json>                   Specify output file")
        print("  --list                                List matched nodes (for find)")
        print("\nExamples:")
        print("  python batch_nodes.py flows.json --find --type mqtt in --list")
        print("  python batch_nodes.py flows.json --disable --name test")
        print("  python batch_nodes.py flows.json --enable --type debug")
        print("  python batch_nodes.py flows.json --rename --type function --prefix 'New - '")
        print("  python batch_nodes.py flows.json --delete --type comment")
        sys.exit(1)

    flow_path = sys.argv[1]
    output_path = flow_path

    if "--output" in sys.argv:
        idx = sys.argv.index("--output")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --output requires a filename")
            sys.exit(1)
        output_path = sys.argv[idx + 1]

    flow = read_flow(flow_path)
    matched_nodes = []

    # Parse action
    if "--find" in sys.argv:
        # Find nodes
        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --type requires a node type")
                sys.exit(1)
            node_type = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_type(flow, node_type)
            print(f"Found {len(matched_nodes)} node(s) of type '{node_type}'")

        elif "--name" in sys.argv:
            idx = sys.argv.index("--name")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --name requires a pattern")
                sys.exit(1)
            pattern = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_name(flow, pattern)
            print(f"Found {len(matched_nodes)} node(s) matching '{pattern}'")

        elif "--tab" in sys.argv:
            idx = sys.argv.index("--tab")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --tab requires a tab ID")
                sys.exit(1)
            tab_id = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_tab(flow, tab_id)
            print(f"Found {len(matched_nodes)} node(s) in tab '{tab_id}'")

        elif "--disabled" in sys.argv:
            matched_nodes = find_disabled_nodes(flow)
            print(f"Found {len(matched_nodes)} disabled node(s)")

        elif "--pattern" in sys.argv:
            idx = sys.argv.index("--pattern")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --pattern requires a code pattern")
                sys.exit(1)
            pattern = sys.argv[idx + 1]
            matched_nodes = find_function_nodes_with_pattern(flow, pattern)
            print(f"Found {len(matched_nodes)} function node(s) containing '{pattern}'")

        else:
            print("ERROR: --find requires --type, --name, --tab, --disabled, or --pattern")
            sys.exit(1)

        if "--list" in sys.argv:
            list_nodes(flow, matched_nodes)

    elif "--enable" in sys.argv:
        # Enable nodes
        if "--type" not in sys.argv:
            print("ERROR: --enable requires --type")
            sys.exit(1)

        idx = sys.argv.index("--type")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --type requires a node type")
            sys.exit(1)

        node_type = sys.argv[idx + 1]
        matched_nodes = find_nodes_by_type(flow, node_type)

        if not matched_nodes:
            print(f"No nodes found of type '{node_type}'")
            sys.exit(0)

        count = enable_nodes(flow, matched_nodes)
        print(f"✓ Enabled {count} node(s)")
        write_flow(flow, output_path)

    elif "--disable" in sys.argv:
        # Disable nodes
        if "--name" not in sys.argv and "--type" not in sys.argv:
            print("ERROR: --disable requires --name or --type")
            sys.exit(1)

        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --type requires a node type")
                sys.exit(1)
            node_type = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_type(flow, node_type)
        else:
            idx = sys.argv.index("--name")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --name requires a pattern")
                sys.exit(1)
            pattern = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_name(flow, pattern)

        if not matched_nodes:
            print("No nodes found to disable")
            sys.exit(0)

        count = disable_nodes(flow, matched_nodes)
        print(f"✓ Disabled {count} node(s)")
        write_flow(flow, output_path)

    elif "--delete" in sys.argv:
        # Delete nodes
        if "--type" not in sys.argv:
            print("ERROR: --delete requires --type")
            sys.exit(1)

        idx = sys.argv.index("--type")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --type requires a node type")
            sys.exit(1)

        node_type = sys.argv[idx + 1]
        matched_nodes = find_nodes_by_type(flow, node_type)

        if not matched_nodes:
            print(f"No nodes found of type '{node_type}'")
            sys.exit(0)

        # Confirm before deleting
        print(f"About to delete {len(matched_nodes)} node(s) of type '{node_type}'")
        response = input("Continue? (yes/no): ").strip().lower()
        if response != "yes":
            print("Cancelled")
            sys.exit(0)

        count = delete_nodes(flow, matched_nodes)
        print(f"✓ Deleted {count} node(s)")
        write_flow(flow, output_path)

    elif "--rename" in sys.argv:
        # Rename nodes
        if "--type" not in sys.argv and "--name" not in sys.argv:
            print("ERROR: --rename requires --type or --name")
            sys.exit(1)

        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --type requires a node type")
                sys.exit(1)
            node_type = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_type(flow, node_type)
        else:
            idx = sys.argv.index("--name")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --name requires a pattern")
                sys.exit(1)
            pattern = sys.argv[idx + 1]
            matched_nodes = find_nodes_by_name(flow, pattern)

        if not matched_nodes:
            print("No nodes found to rename")
            sys.exit(0)

        # Parse rename options
        prefix = ""
        suffix = ""
        replace = None

        if "--replace" in sys.argv:
            idx = sys.argv.index("--replace")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --replace requires old,new format")
                sys.exit(1)
            replacement = sys.argv[idx + 1]
            if "," not in replacement:
                print("ERROR: --replace requires old,new format")
                sys.exit(1)
            old, new = replacement.split(",", 1)
            replace = {old: new}
        else:
            if "--prefix" in sys.argv:
                idx = sys.argv.index("--prefix")
                if idx + 1 >= len(sys.argv):
                    print("ERROR: --prefix requires a string")
                    sys.exit(1)
                prefix = sys.argv[idx + 1]

            if "--suffix" in sys.argv:
                idx = sys.argv.index("--suffix")
                if idx + 1 >= len(sys.argv):
                    print("ERROR: --suffix requires a string")
                    sys.exit(1)
                suffix = sys.argv[idx + 1]

        count = rename_nodes(flow, matched_nodes, prefix, suffix, replace)
        print(f"✓ Renamed {count} node(s)")
        write_flow(flow, output_path)

    elif "--export" in sys.argv:
        # Export nodes
        if "--type" not in sys.argv:
            print("ERROR: --export requires --type")
            sys.exit(1)

        idx = sys.argv.index("--type")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --type requires a node type")
            sys.exit(1)

        node_type = sys.argv[idx + 1]
        matched_nodes = find_nodes_by_type(flow, node_type)

        if not matched_nodes:
            print(f"No nodes found of type '{node_type}'")
            sys.exit(0)

        export_nodes(flow, matched_nodes, output_path)

    else:
        print("ERROR: No action specified. Use --find, --enable, --disable, --delete, --rename, or --export")
        sys.exit(1)


if __name__ == "__main__":
    main()
