#!/usr/bin/env python3
"""
ruoyi-api 技能测试脚本
用于验证技能是否正常工作
"""

import sys
import json
from pathlib import Path

# 添加技能目录到 Python 路径
skill_dir = Path(__file__).parent
sys.path.insert(0, str(skill_dir))


def test_config():
    """测试配置文件"""
    print("📋 测试配置文件...")
    try:
        from client import RuoyiClient
        client = RuoyiClient()
        print(f"✅ 配置文件加载成功")
        print(f"   Base URL: {client.base_url}")
        print(f"   Token: {client.token[:20]}..." if len(client.token) > 20 else f"   Token: {client.token}")
        return client
    except FileNotFoundError as e:
        print(f"❌ 配置文件未找到")
        print(f"   {e}")
        return None
    except Exception as e:
        print(f"❌ 配置文件错误: {e}")
        return None


def test_connection(client):
    """测试连接"""
    print("\n🌐 测试 API 连接...")
    if not client:
        print("❌ 无法测试连接（客户端未初始化）")
        return False

    try:
        api = __import__('client', fromlist=['RuoyiAPI']).RuoyiAPI(client)
        result = api.list_users()
        if result.get('error'):
            print(f"❌ API 连接失败")
            print(f"   状态码: {result.get('status')}")
            print(f"   错误信息: {result.get('message')}")
            return False
        else:
            print(f"✅ API 连接成功")
            return True
    except Exception as e:
        print(f"❌ API 连接异常: {e}")
        return False


def test_operations(client):
    """测试基本操作"""
    print("\n🔧 测试基本操作...")
    if not client:
        print("❌ 无法测试操作（客户端未初始化）")
        return

    api = __import__('client', fromlist=['RuoyiAPI']).RuoyiAPI(client)

    # 测试查询用户
    print("\n  📋 查询用户列表...")
    result = api.list_users()
    if result.get('error'):
        print(f"     ❌ 查询失败: {result.get('message')}")
    else:
        total = result.get('total', 0)
        print(f"     ✅ 查询成功，共 {total} 个用户")

    # 测试查询角色
    print("\n  📋 查询角色列表...")
    result = api.list_roles()
    if result.get('error'):
        print(f"     ❌ 查询失败: {result.get('message')}")
    else:
        total = result.get('total', 0)
        print(f"     ✅ 查询成功，共 {total} 个角色")

    # 测试查询部门
    print("\n  📋 查询部门列表...")
    result = api.list_depts()
    if result.get('error'):
        print(f"     ❌ 查询失败: {result.get('message')}")
    else:
        print(f"     ✅ 查询成功")


def main():
    """主测试函数"""
    print("=" * 50)
    print("ruoyi-api 技能测试")
    print("=" * 50)

    # 测试配置
    client = test_config()
    if not client:
        print("\n💡 提示：请先创建配置文件")
        print("   参考：skills/ruoyi-api/QUICKSTART.md")
        return

    # 测试连接
    if not test_connection(client):
        print("\n💡 提示：请检查配置文件中的 Token 是否正确")
        return

    # 测试操作
    test_operations(client)

    print("\n" + "=" * 50)
    print("测试完成！")
    print("=" * 50)


if __name__ == '__main__':
    main()
