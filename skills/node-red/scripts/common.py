"""Shared utilities for Node-RED flow scripts."""

import json
import sys
import uuid
from typing import List, Dict


def generate_id() -> str:
    return str(uuid.uuid4()).replace("-", "")


def read_flow(flow_path: str) -> List[Dict]:
    try:
        with open(flow_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {flow_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {flow_path}\n  {e}")
        sys.exit(1)


def write_flow(flow: List[Dict], output_path: str):
    with open(output_path, "w") as f:
        json.dump(flow, f, indent=2)
    print(f"Saved to: {output_path}")
