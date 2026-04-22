---
name: ruoyi-api
description: 若依(RuoYi)系统管理 API 调用工具。当用户需要操作若依系统的用户、角色、菜单、部门、字典、参数配置时激活。触发词："若依"、"ruoyi"、"创建用户"、"分配角色"、"创建菜单"、"字典类型"、"参数配置"、"岗位管理"。需要配置 .env 文件（RUOYI_BASE_URL、RUOYI_TOKEN）。
---

# ruoyi-api

直接调用若依系统管理接口的工具。

## 配置

在项目根目录创建 `.env` 文件：

```bash
# 前端代理地址（包含二级路径）
RUOYI_BASE_URL=http://localhost:3700/dev-api
# 后端接口地址（无二级路径）
# RUOYI_BASE_URL=http://localhost:8080

RUOYI_TOKEN=your_bearer_token_here
```

获取 Token：登录若依 → 浏览器 Network → 请求头 `Authorization` 中 `Bearer ` 后的值。

## 使用前验证

首次调用 `create_client()` 时自动验证连通性和配置（检测二级路径、网络、接口 404、Token 有效性）。验证失败会给出具体提示，无需手动排查。

## API 文档

按模块分类，按需查阅：

- **用户管理** - [references/user.md](references/user.md)
- **角色管理** - [references/role.md](references/role.md)
- **菜单管理** - [references/menu.md](references/menu.md)
- **部门管理** - [references/dept.md](references/dept.md)
- **字典类型管理** - [references/dict-type.md](references/dict-type.md)
- **字典数据管理** - [references/dict-data.md](references/dict-data.md)
- **参数配置管理** - [references/config.md](references/config.md)

## 快速开始

```python
from scripts.client import create_client

api = create_client()

# 查询用户
api.list_users({'pageNum': 1, 'pageSize': 10})

# 创建用户
api.create_user({'userName': 'test', 'nickName': '测试', 'password': '123456', 'deptId': 100})

# 创建角色
api.create_role({'roleName': '测试角色', 'roleKey': 'test', 'roleSort': 10})

# 创建字典类型
api.create_dict_type({'dictName': '用户状态', 'dictType': 'sys_user_status', 'status': '0'})

# 获取参数配置
api.get_config_by_key('sys.index.skinName')
```

命令行用法见 [references/cli-usage.md](references/cli-usage.md)。
