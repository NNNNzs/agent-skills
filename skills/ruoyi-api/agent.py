#!/usr/bin/env python3
"""
若依系统 API 生成 Agent
供 Claude Code 直接调用的接口
"""

import json
import sys
from pathlib import Path

# 添加技能目录到 Python 路径
skill_dir = Path(__file__).parent
sys.path.insert(0, str(skill_dir))

from parser import RuoyiAPIParser


def load_spec(spec_path: str = None) -> RuoyiAPIParser:
    """加载 OpenAPI 规范"""
    if spec_path is None:
        # 默认查找文档目录
        doc_paths = [
            skill_dir / 'docs' / 'ruoyi-api.json',
            skill_dir / 'ruoyi-api.json',
            Path('/tmp/ruoyi-system-api.json'),
        ]
        for path in doc_paths:
            if path.exists():
                spec_path = str(path)
                break

    if spec_path is None or not Path(spec_path).exists():
        raise FileNotFoundError(f"找不到 API 文档，请先下载: curl -s http://localhost:3700/v3/api-docs/system > {skill_dir}/docs/ruoyi-api.json")

    return RuoyiAPIParser(spec_path)


def list_modules(spec_path: str = None) -> dict:
    """列出所有可用模块"""
    parser = load_spec(spec_path)
    modules = parser.get_modules()

    result = {
        "modules": [
            {
                "name": name,
                "count": len(apis),
                "apis": [
                    {
                        "path": api['path'],
                        "method": api['method'],
                        "summary": api.get('summary', '')
                    }
                    for api in apis[:5]  # 只显示前5个
                ]
            }
            for name, apis in sorted(modules.items())
        ],
        "total": len(modules)
    }

    return result


def generate_api(module: str, spec_path: str = None, format: str = 'typescript') -> dict:
    """生成指定模块的 API 代码"""
    parser = load_spec(spec_path)
    apis = parser.get_module_apis(module)

    if not apis:
        return {
            "success": False,
            "error": f"未找到模块: {module}"
        }

    if format == 'typescript':
        from parser import generate_typescript_api
        code = generate_typescript_api(module, apis, parser)
    else:
        return {
            "success": False,
            "error": f"不支持的格式: {format}"
        }

    return {
        "success": True,
        "module": module,
        "format": format,
        "apis_count": len(apis),
        "code": code
    }


def get_module_info(module: str, spec_path: str = None) -> dict:
    """获取模块详细信息"""
    parser = load_spec(spec_path)
    apis = parser.get_module_apis(module)

    if not apis:
        return {
            "success": False,
            "error": f"未找到模块: {module}"
        }

    return {
        "success": True,
        "module": module,
        "count": len(apis),
        "apis": [
            {
                "path": api['path'],
                "method": api['method'],
                "summary": api.get('summary', ''),
                "description": api.get('description', ''),
                "operationId": api.get('operationId', '')
            }
            for api in apis
        ]
    }


def main():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(description='若依系统 API 生成工具')
    parser.add_argument('command', choices=['list', 'generate', 'info'], help='命令')
    parser.add_argument('--module', '-m', help='模块名称')
    parser.add_argument('--spec', '-s', help='OpenAPI 规范文件路径')
    parser.add_argument('--format', '-f', default='typescript', help='输出格式')

    args = parser.parse_args()

    try:
        if args.command == 'list':
            result = list_modules(args.spec)
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.command == 'generate':
            if not args.module:
                print("错误: 请指定模块名称 (--module)")
                sys.exit(1)
            result = generate_api(args.module, args.spec, args.format)
            if result['success']:
                print(result['code'])
            else:
                print(f"错误: {result['error']}", file=sys.stderr)
                sys.exit(1)

        elif args.command == 'info':
            if not args.module:
                print("错误: 请指定模块名称 (--module)")
                sys.exit(1)
            result = get_module_info(args.module, args.spec)
            print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    # 如果作为模块直接调用
    if len(sys.argv) == 1:
        # 默认列出所有模块
        result = list_modules()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        main()
