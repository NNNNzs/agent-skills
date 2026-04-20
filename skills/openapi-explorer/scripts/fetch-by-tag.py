#!/usr/bin/env python3
"""
按标签获取接口列表
用法: python fetch-by-tag.py <swagger-url> <tag-name>
"""

import sys
import json
import urllib.request
import urllib.error

def fetch_by_tag(swagger_url, tag_name):
    """获取指定标签的所有接口"""
    try:
        print(f"正在获取标签 '{tag_name}' 的接口...", file=sys.stderr)
        with urllib.request.urlopen(swagger_url) as response:
            doc = json.loads(response.read().decode('utf-8'))

        paths = doc.get("paths", {})
        endpoints = []

        for path, methods in paths.items():
            for method, details in methods.items():
                if "tags" in details and tag_name in details["tags"]:
                    endpoints.append({
                        "path": path,
                        "method": method.upper(),
                        "summary": details.get("summary", ""),
                        "description": details.get("description", "")
                    })

        print(json.dumps(endpoints, indent=2, ensure_ascii=False))

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
        print("用法: python fetch-by-tag.py <swagger-url> <tag-name>", file=sys.stderr)
        sys.exit(1)

    fetch_by_tag(sys.argv[1], sys.argv[2])
