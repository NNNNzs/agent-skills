#!/usr/bin/env python3
"""
获取 Schema 定义
用法: python fetch-schema.py <swagger-url> <schema-name>
"""

import sys
import json
import urllib.request
import urllib.error

def fetch_schema(swagger_url, schema_name):
    """获取指定 Schema 的定义"""
    try:
        print(f"正在获取 Schema '{schema_name}' 的定义...", file=sys.stderr)
        with urllib.request.urlopen(swagger_url) as response:
            doc = json.loads(response.read().decode('utf-8'))

        schema = doc.get("components", {}).get("schemas", {}).get(schema_name)

        if not schema:
            print(f"错误: 找不到 Schema {schema_name}", file=sys.stderr)
            sys.exit(1)

        print(json.dumps(schema, indent=2, ensure_ascii=False))

    except urllib.error.HTTPError as e:
        print(f"HTTP 错误: {e.code} - {e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URL 错误: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python fetch-schema.py <swagger-url> <schema-name>", file=sys.stderr)
        sys.exit(1)

    fetch_schema(sys.argv[1], sys.argv[2])
