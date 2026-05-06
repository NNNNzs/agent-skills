#!/usr/bin/env python3
"""
Modify existing Node-RED flows.
Usage:
  python modify_flow.py <flow.json> --node <id> --property <prop> --value <value>
  python modify_flow.py <flow.json> --node <id> --rename <new_name>
  python modify_flow.py <flow.json> --node <id> --move <x>,<y>
  python modify_flow.py <flow.json> --tab <id> --label <new_label>
  python modify_flow.py <flow.json> --disable --node <id>
  python modify_flow.py <flow.json> --enable --node <id>
  python modify_flow.py <flow.json> --delete --node <id>
"""

import json
import sys
from typing import Dict, List, Optional


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


def find_node(flow: List[Dict], node_id: str) -> Optional[Dict]:
    """Find a node by ID."""
    for node in flow:
        if node.get("id") == node_id:
            return node
    return None


def find_nodes_by_name(flow: List[Dict], name: str) -> List[Dict]:
    """Find nodes by name."""
    return [node for node in flow if node.get("name") == name]


def set_property(node: Dict, property_path: str, value):
    """Set a nested property on a node."""
    # Handle nested properties like "func.code" or "wires[0]"
    parts = property_path.split(".")
    current = node

    for i, part in enumerate(parts[:-1]):
        if part not in current:
            current[part] = {}
        current = current[part]

    # Convert value to appropriate type
    if value.lower() == "true":
        value = True
    elif value.lower() == "false":
        value = False
    elif value.lower() == "null":
        value = None
    elif value.startswith("{") or value.startswith("["):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            pass  # Keep as string
    elif value.isdigit():
        value = int(value)

    current[parts[-1]] = value


def delete_node(flow: List[Dict], node_id: str) -> bool:
    """Delete a node and update wire connections."""
    # Remove the node
    for i, node in enumerate(flow):
        if node.get("id") == node_id:
            flow.pop(i)
            break
    else:
        return False

    # Remove wire connections to this node
    for node in flow:
        if "wires" in node:
            new_wires = []
            for wire_list in node["wires"]:
                cleaned = [w for w in wire_list if w != node_id]
                new_wires.append(cleaned)
            node["wires"] = new_wires

    return True


def update_wire_connections(flow: List[Dict], old_id: str, new_id: str):
    """Update wire connections when changing node ID."""
    for node in flow:
        if "wires" in node:
            for wire_list in node["wires"]:
                for i, wire_id in enumerate(wire_list):
                    if wire_id == old_id:
                        wire_list[i] = new_id


def main():
    if len(sys.argv) < 2:
        print("Usage: python modify_flow.py <flow.json> [options]")
        print("\nOptions:")
        print("  --node <id>")
        print("    --property <prop> --value <value>     Set node property")
        print("    --rename <new_name>                   Rename node")
        print("    --move <x>,<y>                        Move node to coordinates")
        print("    --disable                              Disable node")
        print("    --enable                               Enable node")
        print("    --delete                               Delete node")
        print("\n  --tab <id>")
        print("    --label <new_label>                   Rename tab")
        print("\nExamples:")
        print("  python modify_flow.py flows.json --node abc123 --name NewName")
        print("  python modify_flow.py flows.json --node abc123 --move 200,300")
        print("  python modify_flow.py flows.json --node abc123 --property func.code --value 'return msg;'")
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
    modified = False

    # Check if we're working with a tab or node
    if "--tab" in sys.argv:
        idx = sys.argv.index("--tab")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --tab requires an ID")
            sys.exit(1)

        tab_id = sys.argv[idx + 1]
        tab_node = None

        for node in flow:
            if node.get("id") == tab_id:
                tab_node = node
                break

        if not tab_node or tab_node.get("type") != "tab":
            print(f"ERROR: Tab not found: {tab_id}")
            sys.exit(1)

        if "--label" in sys.argv:
            idx = sys.argv.index("--label")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --label requires a label")
                sys.exit(1)

            old_label = tab_node.get("label", "")
            new_label = sys.argv[idx + 1]
            tab_node["label"] = new_label
            print(f"✓ Tab '{old_label}' renamed to '{new_label}'")
            modified = True

    elif "--node" in sys.argv:
        idx = sys.argv.index("--node")
        if idx + 1 >= len(sys.argv):
            print("ERROR: --node requires an ID")
            sys.exit(1)

        node_id = sys.argv[idx + 1]
        node = find_node(flow, node_id)

        if not node:
            print(f"ERROR: Node not found: {node_id}")
            sys.exit(1)

        # Delete node
        if "--delete" in sys.argv:
            if delete_node(flow, node_id):
                print(f"✓ Deleted node: {node_id}")
                modified = True
            else:
                print(f"ERROR: Could not delete node: {node_id}")
                sys.exit(1)

        # Rename node
        elif "--rename" in sys.argv:
            idx = sys.argv.index("--rename")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --rename requires a new name")
                sys.exit(1)

            old_name = node.get("name", "")
            new_name = sys.argv[idx + 1]
            node["name"] = new_name
            print(f"✓ Node '{old_name}' renamed to '{new_name}'")
            modified = True

        # Move node
        elif "--move" in sys.argv:
            idx = sys.argv.index("--move")
            if idx + 1 >= len(sys.argv):
                print("ERROR: --move requires coordinates")
                sys.exit(1)

            try:
                coords = sys.argv[idx + 1].split(",")
                if len(coords) != 2:
                    raise ValueError()
                x, y = int(coords[0]), int(coords[1])
                node["x"] = x
                node["y"] = y
                print(f"✓ Node moved to ({x}, {y})")
                modified = True
            except (ValueError, IndexError):
                print("ERROR: --move requires coordinates in format x,y (e.g., 200,300)")
                sys.exit(1)

        # Disable node
        elif "--disable" in sys.argv:
            node["disabled"] = True
            print(f"✓ Node disabled: {node.get('name', node['id'])}")
            modified = True

        # Enable node
        elif "--enable" in sys.argv:
            node["disabled"] = False
            print(f"✓ Node enabled: {node.get('name', node['id'])}")
            modified = True

        # Set property
        elif "--property" in sys.argv and "--value" in sys.argv:
            prop_idx = sys.argv.index("--property")
            val_idx = sys.argv.index("--value")

            if prop_idx + 1 >= len(sys.argv) or val_idx + 1 >= len(sys.argv):
                print("ERROR: --property and --value require arguments")
                sys.exit(1)

            property_path = sys.argv[prop_idx + 1]
            value = sys.argv[val_idx + 1]

            old_value = node.get(property_path, "not set")
            set_property(node, property_path, value)
            print(f"✓ Node property '{property_path}' changed: '{old_value}' -> '{value}'")
            modified = True

        else:
            print("ERROR: No action specified for node")
            print("Use --property, --rename, --move, --disable, --enable, or --delete")
            sys.exit(1)

    else:
        print("ERROR: No target specified. Use --node or --tab")
        sys.exit(1)

    if modified:
        write_flow(flow, output_path)
    else:
        print("No changes made")


if __name__ == "__main__":
    main()
