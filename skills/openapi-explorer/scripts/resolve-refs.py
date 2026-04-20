#!/usr/bin/env python3
"""
从接口定义中提取并解析所有 $ref 引用
用法: cat endpoint.json | python resolve-refs.py <swagger-url>
或: python resolve-refs.py <swagger-url} < endpoint.json
"""

import sys
import json
import urllib.request
import urllib.error

def extract_refs(obj, refs=None):
    """递归提取所有 $ref 值"""
    if refs is None:
        refs = set()

    if not isinstance(obj, dict):
        return refs

    for key, value in obj.items():
        if key == "$ref" and isinstance(value, str):
            # 从 #/components/schemas/SchemaName 提取 SchemaName
            schema_name = value.replace("#/components/schemas/", "")
            refs.add(schema_name)
        elif isinstance(value, (dict, list)):
            extract_refs(value, refs)

    return refs

def resolve_refs(swagger_url, endpoint_data):
    """解析接口定义中的所有 $ref 引用"""
    try:
        # 提取所有 $ref
        refs = extract_refs(endpoint_data)

        if not refs:
            print("未找到 $ref 引用", file=sys.stderr)
            print("{}")
            return

        print(f"正在解析引用的 schemas: {', '.join(refs)}", file=sys.stderr)

        # 获取文档
        with urllib.request.urlopen(swagger_url) as response:
            doc = json.loads(response.read().decode('utf-8'))

        schemas = doc.get("components", {}).get("schemas", {})

        # 提取需要的 schemas
        result = {}
        for ref_name in refs:
            if ref_name in schemas:
                result[ref_name] = schemas[ref_name]
            else:
                print(f"警告: 找不到 Schema {ref_name}", file=sys.stderr)

        print(json.dumps(result, indent=2, ensure_ascii=False))

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
    if len(sys.argv) < 2:
        print("用法: cat endpoint.json | python resolve-refs.py <swagger-url>", file=sys.stderr)
        sys.exit(1)

    # 从 stdin 读取接口定义
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print("错误: 未检测到输入数据", file=sys.stderr)
            sys.exit(1)

        endpoint_data = json.loads(input_data)
        resolve_refs(sys.argv[1], endpoint_data)

    except json.JSONDecodeError as e:
        print(f"JSON 解析错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)
