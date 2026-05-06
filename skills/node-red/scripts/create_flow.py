#!/usr/bin/env python3
"""
Create new Node-RED flows or add nodes to existing flows.
Usage:
  python create_flow.py --new --name <name> [--output flows.json]
  python create_flow.py --add --type <type> --tab <tab_id> --name <name> [--input flows.json] [--output flows.json]
  python create_flow.py --template <template_name> [--output flows.json]
"""

import json
import sys
import uuid
from typing import Dict, List, Optional


def generate_id() -> str:
    """Generate Node-RED compatible ID."""
    return str(uuid.uuid4()).replace("-", "")


def create_tab(label: str, info: str = "", tab_id: str = None) -> Dict:
    """Create a new tab node."""
    return {
        "id": tab_id if tab_id else generate_id(),
        "type": "tab",
        "label": label,
        "disabled": False,
        "info": info
    }


def create_inject_node(tab_id: str, name: str = "Inject", payload: str = "", topic: str = "") -> Dict:
    """Create an inject node."""
    node = {
        "id": generate_id(),
        "type": "inject",
        "z": tab_id,
        "name": name,
        "props": [
            {"p": "payload"},
            {"p": "topic", "vt": "str"}
        ],
        "repeat": "",
        "crontab": "",
        "once": False,
        "onceDelay": 0.1,
        "topic": topic,
        "payload": payload,
        "payloadType": "str",
        "x": 100,
        "y": 100,
        "wires": [[]]
    }
    return node


def create_debug_node(tab_id: str, name: str = "Debug") -> Dict:
    """Create a debug node."""
    return {
        "id": generate_id(),
        "type": "debug",
        "z": tab_id,
        "name": name,
        "active": True,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 300,
        "y": 100,
        "wires": []
    }


def create_function_node(tab_id: str, name: str, func_code: str) -> Dict:
    """Create a function node."""
    return {
        "id": generate_id(),
        "type": "function",
        "z": tab_id,
        "name": name,
        "func": func_code,
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 200,
        "y": 100,
        "wires": [[]]
    }


def create_comment_node(tab_id: str, name: str, info: str = "") -> Dict:
    """Create a comment node."""
    return {
        "id": generate_id(),
        "type": "comment",
        "z": tab_id,
        "name": name,
        "info": info,
        "x": 100,
        "y": 20,
        "wires": []
    }


def create_change_node(tab_id: str, name: str, rules: List[Dict]) -> Dict:
    """Create a change node with rules."""
    return {
        "id": generate_id(),
        "type": "change",
        "z": tab_id,
        "name": name,
        "rules": rules,
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": False,
        "x": 200,
        "y": 100,
        "wires": [[]]
    }


def create_template(template_name: str) -> List[Dict]:
    """Create flow from template."""
    tab_id = generate_id()

    if template_name == "simple":
        return [
            create_tab("Simple Flow", "Basic inject -> debug flow", tab_id=tab_id),
            create_comment_node(tab_id, "Simple Flow", "Basic flow with inject and debug nodes"),
            create_inject_node(tab_id, "Test Input", payload="Hello World"),
            create_debug_node(tab_id, "Output")
        ]

    elif template_name == "mqtt":
        return [
            create_tab("MQTT Flow", "MQTT publish/subscribe pattern", tab_id=tab_id),
            create_comment_node(tab_id, "MQTT Integration", "MQTT broker and pub/sub nodes"),
            {
                "id": generate_id(),
                "type": "mqtt-broker",
                "name": "MQTT Broker",
                "broker": "localhost",
                "port": "1883",
                "clientid": "",
                "autoConnect": True,
                "usetls": False,
                "protocolVersion": "4",
                "keepalive": "60",
                "cleansession": True,
                "birthTopic": "",
                "birthQos": "0",
                "birthPayload": "",
                "birthMsg": {},
                "closeTopic": "",
                "closeQos": "0",
                "closePayload": "",
                "closeMsg": {},
                "willTopic": "",
                "willQos": "0",
                "willPayload": "",
                "willMsg": {}
            },
            {
                "id": generate_id(),
                "type": "mqtt in",
                "z": tab_id,
                "name": "Subscribe",
                "topic": "test/topic",
                "qos": "2",
                "datatype": "json",
                "broker": "",
                "x": 100,
                "y": 100,
                "wires": [["debug-out"]]
            },
            {
                "id": generate_id(),
                "type": "debug",
                "z": tab_id,
                "name": "Output",
                "active": True,
                "tosidebar": True,
                "console": False,
                "tostatus": False,
                "complete": "payload",
                "targetType": "msg",
                "statusVal": "",
                "statusType": "auto",
                "x": 300,
                "y": 100,
                "wires": []
            }
        ]

    elif template_name == "http":
        return [
            create_tab("HTTP Flow", "HTTP request/response pattern", tab_id=tab_id),
            create_comment_node(tab_id, "HTTP API", "HTTP in/out nodes for REST API"),
            {
                "id": generate_id(),
                "type": "http in",
                "z": tab_id,
                "name": "API Endpoint",
                "url": "/api/test",
                "method": "get",
                "upload": False,
                "swaggerDoc": "",
                "x": 100,
                "y": 100,
                "wires": [["process"]]
            },
            {
                "id": generate_id(),
                "type": "function",
                "z": tab_id,
                "name": "Process",
                "func": "// Process request\nmsg.payload = {\n    status: 'success',\n    message: 'Hello from Node-RED'\n};\nreturn msg;",
                "outputs": 1,
                "noerr": 0,
                "initialize": "",
                "finalize": "",
                "libs": [],
                "x": 250,
                "y": 100,
                "wires": [["response"]]
            },
            {
                "id": generate_id(),
                "type": "http response",
                "z": tab_id,
                "name": "Send Response",
                "statusCode": "",
                "headers": {},
                "x": 400,
                "y": 100,
                "wires": []
            }
        ]

    else:
        print(f"Unknown template: {template_name}")
        print("Available templates: simple, mqtt, http")
        sys.exit(1)


def read_flow(flow_path: str) -> List[Dict]:
    """Read existing flow file."""
    try:
        with open(flow_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {flow_path}")
        print(f"  {e}")
        sys.exit(1)


def write_flow(flow: List[Dict], output_path: str):
    """Write flow to file."""
    with open(output_path, "w") as f:
        json.dump(flow, f, indent=2)
    print(f"✓ Flow saved to: {output_path}")


def find_tab_by_name(flow: List[Dict], tab_name: str) -> Optional[Dict]:
    """Find a tab by label or ID."""
    for node in flow:
        if node.get("type") == "tab" and node.get("label", node["id"]) == tab_name:
            return node
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python create_flow.py [options]")
        print("\nOptions:")
        print("  --new --name <name> [--output flows.json]")
        print("        Create a new empty flow with a tab")
        print("  --template <name> [--output flows.json]")
        print("        Create flow from template (simple, mqtt, http)")
        print("  --add --type <type> --tab <tab_id> --name <name>")
        print("        Add a node to existing flow")
        print("    [--input flows.json] [--output flows.json]")
        print("\nNode types: inject, debug, function, change, comment")
        sys.exit(1)

    args = sys.argv[1:]
    output_file = "flows.json"
    input_file = "flows.json"

    # Parse arguments
    if "--output" in args:
        idx = args.index("--output")
        if idx + 1 >= len(args):
            print("ERROR: --output requires a filename")
            sys.exit(1)
        output_file = args[idx + 1]

    if "--input" in args:
        idx = args.index("--input")
        if idx + 1 >= len(args):
            print("ERROR: --input requires a filename")
            sys.exit(1)
        input_file = args[idx + 1]

    flow = []

    if "--new" in args:
        idx = args.index("--new")
        if idx + 1 >= len(args) or args[idx + 1] != "--name":
            print("ERROR: --new requires --name")
            sys.exit(1)
        idx += 1  # Move to --name
        name_idx = idx + 1
        if name_idx >= len(args):
            print("ERROR: --name requires a flow name")
            sys.exit(1)

        flow_name = args[name_idx]
        flow = [create_tab(flow_name, f"Created: {flow_name}")]
        write_flow(flow, output_file)
        print(f"✓ Created new flow: {flow_name}")

    elif "--template" in args:
        idx = args.index("--template")
        if idx + 1 >= len(args):
            print("ERROR: --template requires a template name")
            sys.exit(1)
        template_name = args[idx + 1]

        flow = create_template(template_name)
        write_flow(flow, output_file)
        print(f"✓ Created flow from template: {template_name}")

    elif "--add" in args:
        if "--type" not in args or "--tab" not in args or "--name" not in args:
            print("ERROR: --add requires --type, --tab, and --name")
            sys.exit(1)

        type_idx = args.index("--type") + 1
        tab_idx = args.index("--tab") + 1
        name_idx = args.index("--name") + 1

        if type_idx >= len(args) or tab_idx >= len(args) or name_idx >= len(args):
            print("ERROR: Missing required arguments for --add")
            sys.exit(1)

        node_type = args[type_idx]
        tab_id = args[tab_idx]
        node_name = args[name_idx]

        flow = read_flow(input_file)

        # Find the tab
        tab_node = None
        for node in flow:
            if node.get("id") == tab_id:
                tab_node = node
                break
        if not tab_node:
            tab_node = find_tab_by_name(flow, tab_id)

        if not tab_node or tab_node.get("type") != "tab":
            print(f"ERROR: Tab not found: {tab_id}")
            sys.exit(1)

        # Create the node
        if node_type == "inject":
            new_node = create_inject_node(tab_node["id"], node_name)
        elif node_type == "debug":
            new_node = create_debug_node(tab_node["id"], node_name)
        elif node_type == "function":
            func_code = "// Add your function code here\nreturn msg;"
            new_node = create_function_node(tab_node["id"], node_name, func_code)
        elif node_type == "comment":
            new_node = create_comment_node(tab_node["id"], node_name)
        elif node_type == "change":
            new_node = create_change_node(tab_node["id"], node_name, [])
        else:
            print(f"ERROR: Unknown node type: {node_type}")
            print("Available types: inject, debug, function, comment, change")
            sys.exit(1)

        flow.append(new_node)
        write_flow(flow, output_file)
        print(f"✓ Added {node_type} node: {node_name}")

    else:
        print("ERROR: No action specified. Use --new, --template, or --add")
        sys.exit(1)


if __name__ == "__main__":
    main()
