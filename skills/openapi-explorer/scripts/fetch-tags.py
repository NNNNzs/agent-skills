#!/usr/bin/env python3
"""
获取 OpenAPI 文档的所有标签（模块）
用法: python fetch-tags.py <swagger-url>
"""

import sys
import json
import urllib.request
import urllib.error

def fetch_tags(swagger_url):
    """获取文档的所有标签"""
    try:
        print(f"正在从 {swagger_url} 获取标签...", file=sys.stderr)
        with urllib.request.urlopen(swagger_url) as response:
            doc = json.loads(response.read().decode('utf-8'))

        result = {
            "title": doc.get("info", {}).get("title", "Unknown"),
            "version": doc.get("info", {}).get("version", "Unknown"),
            "tags": [tag.get("name") for tag in doc.get("tags", [])]
        }

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
        print("用法: python fetch-tags.py <swagger-url>", file=sys.stderr)
        sys.exit(1)

    fetch_tags(sys.argv[1])
