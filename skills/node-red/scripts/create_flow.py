#!/usr/bin/env python3
"""
Create new Node-RED flows or add nodes to existing flows.
Usage:
  python create_flow.py --new --name <name> [--output flows.json]
  python create_flow.py --template <template_name> [--output flows.json]
  python create_flow.py --add --type <type> --tab <tab_id> --name <name> [--input flows.json] [--output flows.json]
Templates: simple, mqtt, http, http-api, data-pipeline, error-handler
"""

import json
import sys
from typing import Dict, List, Optional

from common import generate_id, write_flow
import common


def read_or_empty(flow_path: str) -> list:
    try:
        return common.read_flow(flow_path)
    except SystemExit:
        return []


def create_tab(label: str, info: str = "", tab_id: str = None) -> Dict:
    return {
        "id": tab_id or generate_id(),
        "type": "tab",
        "label": label,
        "disabled": False,
        "info": info
    }


def create_inject_node(tab_id: str, name: str = "Inject", payload: str = "", topic: str = "") -> Dict:
    return {
        "id": generate_id(), "type": "inject", "z": tab_id, "name": name,
        "props": [{"p": "payload"}, {"p": "topic", "vt": "str"}],
        "repeat": "", "crontab": "", "once": False, "onceDelay": 0.1,
        "topic": topic, "payload": payload, "payloadType": "str",
        "x": 100, "y": 100, "wires": [[]]
    }


def create_debug_node(tab_id: str, name: str = "Debug") -> Dict:
    return {
        "id": generate_id(), "type": "debug", "z": tab_id, "name": name,
        "active": True, "tosidebar": True, "console": False, "tostatus": False,
        "complete": "payload", "targetType": "msg", "statusVal": "", "statusType": "auto",
        "x": 300, "y": 100, "wires": []
    }


def create_function_node(tab_id: str, name: str, func_code: str, x: int = 200) -> Dict:
    return {
        "id": generate_id(), "type": "function", "z": tab_id, "name": name,
        "func": func_code, "outputs": 1, "noerr": 0, "initialize": "", "finalize": "", "libs": [],
        "x": x, "y": 100, "wires": [[]]
    }


def create_comment_node(tab_id: str, name: str, info: str = "") -> Dict:
    return {
        "id": generate_id(), "type": "comment", "z": tab_id, "name": name,
        "info": info, "x": 100, "y": 20, "wires": []
    }


def create_change_node(tab_id: str, name: str, rules: List[Dict]) -> Dict:
    return {
        "id": generate_id(), "type": "change", "z": tab_id, "name": name,
        "rules": rules, "action": "", "property": "", "from": "", "to": "", "reg": False,
        "x": 200, "y": 100, "wires": [[]]
    }


# --- Templates ---

def _tpl_simple():
    tab = generate_id()
    return [
        create_tab("Simple Flow", "Basic inject -> debug flow", tab),
        create_comment_node(tab, "Simple Flow"),
        create_inject_node(tab, "Test Input", payload="Hello World"),
        create_debug_node(tab, "Output")
    ]


def _tpl_mqtt():
    tab = generate_id()
    broker_id = generate_id()
    sub_id = generate_id()
    debug_id = generate_id()
    return [
        create_tab("MQTT Flow", "MQTT publish/subscribe pattern", tab),
        create_comment_node(tab, "MQTT Integration"),
        {
            "id": broker_id, "type": "mqtt-broker", "name": "MQTT Broker",
            "broker": "localhost", "port": "1883", "clientid": "",
            "autoConnect": True, "usetls": False, "protocolVersion": "4",
            "keepalive": "60", "cleansession": True,
            "birthTopic": "", "birthQos": "0", "birthPayload": "", "birthMsg": {},
            "closeTopic": "", "closeQos": "0", "closePayload": "", "closeMsg": {},
            "willTopic": "", "willQos": "0", "willPayload": "", "willMsg": {}
        },
        {
            "id": sub_id, "type": "mqtt in", "z": tab, "name": "Subscribe",
            "topic": "sensors/+/temperature", "qos": "2", "datatype": "json",
            "broker": "", "x": 100, "y": 100, "wires": [[debug_id]]
        },
        {
            "id": debug_id, "type": "debug", "z": tab, "name": "Output",
            "active": True, "tosidebar": True, "console": False, "tostatus": False,
            "complete": "payload", "targetType": "msg", "statusVal": "", "statusType": "auto",
            "x": 300, "y": 100, "wires": []
        }
    ]


def _tpl_http():
    tab = generate_id()
    http_in = generate_id()
    func = generate_id()
    resp = generate_id()
    return [
        create_tab("HTTP Flow", "HTTP request/response pattern", tab),
        create_comment_node(tab, "HTTP API"),
        {
            "id": http_in, "type": "http in", "z": tab, "name": "API Endpoint",
            "url": "/api/test", "method": "get", "upload": False, "swaggerDoc": "",
            "x": 100, "y": 100, "wires": [[func]]
        },
        create_function_node(tab, "Process",
            "// Process request\nmsg.payload = {\n    status: 'success',\n    message: 'Hello from Node-RED'\n};\nreturn msg;", x=250),
        {
            "id": resp, "type": "http response", "z": tab, "name": "Send Response",
            "statusCode": "", "headers": {}, "x": 400, "y": 100, "wires": []
        }
    ]


def _tpl_http_api():
    tab = generate_id()
    http_in = generate_id()
    func = generate_id()
    resp = generate_id()
    return [
        create_tab("REST API", "REST API endpoint template", tab),
        {
            "id": http_in, "type": "http in", "z": tab, "name": "API Endpoint",
            "url": "/api/v1/data", "method": "get", "upload": False, "swaggerDoc": "",
            "x": 120, "y": 100, "wires": [[func]]
        },
        create_function_node(tab, "Process Request",
            "const query = msg.req.query;\nlet response = {\n    status: 'success',\n    timestamp: new Date().toISOString(),\n    data: {}\n};\nmsg.payload = response;\nreturn msg;", x=300),
        {
            "id": resp, "type": "http response", "z": tab, "name": "Send Response",
            "statusCode": "", "headers": {}, "x": 500, "y": 100, "wires": []
        }
    ]


def _tpl_data_pipeline():
    tab = generate_id()
    inject = generate_id()
    transform = generate_id()
    filter_id = generate_id()
    output = generate_id()
    return [
        create_tab("Data Pipeline", "Data processing pipeline template", tab),
        {
            "id": inject, "type": "inject", "z": tab, "name": "Data Source",
            "props": [{"p": "payload"}, {"p": "topic", "vt": "str"}],
            "repeat": "60", "crontab": "", "once": False, "onceDelay": 0.1,
            "topic": "data", "payload": "[1,2,3,4,5]", "payloadType": "json",
            "x": 130, "y": 100, "wires": [[transform]]
        },
        create_function_node(tab, "Transform Data",
            "if (Array.isArray(msg.payload)) {\n    msg.payload = msg.payload.map(item => ({\n        value: item,\n        timestamp: Date.now(),\n        processed: true\n    }));\n}\nreturn msg;", x=320),
        create_function_node(tab, "Filter Results",
            "if (Array.isArray(msg.payload)) {\n    msg.payload = msg.payload.filter(item =>\n        item.processed && item.value > 2\n    );\n}\nreturn msg;", x=510),
        {
            "id": output, "type": "debug", "z": tab, "name": "Pipeline Output",
            "active": True, "tosidebar": True, "console": False, "tostatus": False,
            "complete": "payload", "targetType": "msg", "statusVal": "", "statusType": "auto",
            "x": 700, "y": 100, "wires": []
        }
    ]


def _tpl_error_handler():
    tab = generate_id()
    inject = generate_id()
    try_id = generate_id()
    catch_id = generate_id()
    log = generate_id()
    return [
        create_tab("Error Handler", "Error handling pattern template", tab),
        {
            "id": inject, "type": "inject", "z": tab, "name": "Trigger",
            "props": [{"p": "payload"}], "repeat": "", "crontab": "",
            "once": False, "onceDelay": 0.1, "topic": "", "payload": "test", "payloadType": "str",
            "x": 110, "y": 100, "wires": [[try_id]]
        },
        create_function_node(tab, "Try Operation",
            "try {\n    if (Math.random() > 0.5) {\n        throw new Error('Random failure');\n    }\n    msg.payload = { status: 'success' };\n    return msg;\n} catch (error) {\n    node.error(error.message, msg);\n    return null;\n}", x=280),
        {
            "id": catch_id, "type": "catch", "z": tab, "name": "Catch Errors",
            "scope": [try_id], "uncaught": False, "x": 110, "y": 200, "wires": [[log]]
        },
        create_function_node(tab, "Log & Recover",
            "const details = {\n    timestamp: new Date().toISOString(),\n    error: msg.error.message,\n    source: msg.error.source.id\n};\nnode.warn(JSON.stringify(details));\nmsg.payload = { status: 'error', details };\nreturn msg;", x=300),
    ]


TEMPLATES = {
    "simple": _tpl_simple,
    "mqtt": _tpl_mqtt,
    "http": _tpl_http,
    "http-api": _tpl_http_api,
    "data-pipeline": _tpl_data_pipeline,
    "error-handler": _tpl_error_handler,
}

NODE_TYPES = {
    "inject": lambda tab, name: create_inject_node(tab, name),
    "debug": lambda tab, name: create_debug_node(tab, name),
    "function": lambda tab, name: create_function_node(tab, name, "// Add your code here\nreturn msg;"),
    "comment": lambda tab, name: create_comment_node(tab, name),
    "change": lambda tab, name: create_change_node(tab, name, []),
}


def find_tab(flow: List[Dict], tab_id: str) -> Optional[Dict]:
    for node in flow:
        if node.get("type") == "tab" and node.get("label", node["id"]) == tab_id:
            return node
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python create_flow.py [options]")
        print("  --new --name <name> [--output flows.json]")
        print("  --template <name> [--output flows.json]  Templates: " + ", ".join(TEMPLATES))
        print("  --add --type <type> --tab <tab_id> --name <name> [--input] [--output]")
        print("  Node types: " + ", ".join(NODE_TYPES))
        sys.exit(1)

    args = sys.argv[1:]
    output_file = "flows.json"
    input_file = "flows.json"

    if "--output" in args:
        idx = args.index("--output")
        if idx + 1 >= len(args):
            print("ERROR: --output requires a filename"); sys.exit(1)
        output_file = args[idx + 1]
    if "--input" in args:
        idx = args.index("--input")
        if idx + 1 >= len(args):
            print("ERROR: --input requires a filename"); sys.exit(1)
        input_file = args[idx + 1]

    if "--new" in args:
        if "--name" not in args:
            print("ERROR: --new requires --name"); sys.exit(1)
        name = args[args.index("--name") + 1]
        write_flow([create_tab(name)], output_file)
        print(f"Created new flow: {name}")

    elif "--template" in args:
        tpl = args[args.index("--template") + 1]
        if tpl not in TEMPLATES:
            print(f"ERROR: Unknown template '{tpl}'. Available: {', '.join(TEMPLATES)}"); sys.exit(1)
        write_flow(TEMPLATES[tpl](), output_file)
        print(f"Created flow from template: {tpl}")

    elif "--add" in args:
        for flag in ("--type", "--tab", "--name"):
            if flag not in args:
                print(f"ERROR: --add requires {flag}"); sys.exit(1)
        node_type = args[args.index("--type") + 1]
        tab_id = args[args.index("--tab") + 1]
        node_name = args[args.index("--name") + 1]

        if node_type not in NODE_TYPES:
            print(f"ERROR: Unknown type '{node_type}'. Available: {', '.join(NODE_TYPES)}"); sys.exit(1)

        flow = read_or_empty(input_file)
        tab = None
        for node in flow:
            if node.get("id") == tab_id:
                tab = node; break
        if not tab:
            tab = find_tab(flow, tab_id)
        if not tab or tab.get("type") != "tab":
            print(f"ERROR: Tab not found: {tab_id}"); sys.exit(1)

        flow.append(NODE_TYPES[node_type](tab["id"], node_name))
        write_flow(flow, output_file)
        print(f"Added {node_type} node: {node_name}")

    else:
        print("ERROR: No action specified. Use --new, --template, or --add"); sys.exit(1)


if __name__ == "__main__":
    main()
