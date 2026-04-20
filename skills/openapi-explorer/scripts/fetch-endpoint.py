#!/usr/bin/env python3
"""
获取特定路径的接口详情
用法: python fetch-endpoint.py <swagger-url> <path> [method]
"""

import sys
import json
import urllib.request
import urllib.error

def fetch_endpoint(swagger_url, endpoint_path, method=None):
    """获取指定路径的接口详情"""
    try:
        print(f"正在获取接口 {endpoint_path} 的详情...", file=sys.stderr)
        with urllib.request.urlopen(swagger_url) as response:
            doc = json.loads(response.read().decode('utf-8'))

        path_data = doc.get("paths", {}).get(endpoint_path)

        if not path_data:
            print(f"错误: 找不到路径 {endpoint_path}", file=sys.stderr)
            sys.exit(1)

        if method:
            result = path_data.get(method.lower())
            if not result:
                print(f"错误: 找不到方法 {method.upper()}", file=sys.stderr)
                sys.exit(1)
        else:
            result = path_data

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
    if len(sys.argv) < 3:
        print("用法: python fetch-endpoint.py <swagger-url> <path> [method]", file=sys.stderr)
        sys.exit(1)

    method = sys.argv[3] if len(sys.argv) > 3 else None
    fetch_endpoint(sys.argv[1], sys.argv[2], method)
