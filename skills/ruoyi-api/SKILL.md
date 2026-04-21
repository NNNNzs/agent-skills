---
name: ruoyi-api
description: 直接调用若依系统 API 进行用户、角色、菜单、部门等管理操作。使用场景：(1) 创建/更新/删除用户 (2) 管理角色和权限 (3) 创建菜单和部门 (4) 批量操作系统数据。需要先配置项目根目录 .env 文件，包含 RUOYI_BASE_URL 和 RUOYI_TOKEN。
---

# ruoyi-api

直接调用若依系统管理接口的工具。

## 配置

在项目根目录创建 `.env` 文件：

```bash
RUOYI_BASE_URL=http://localhost:3700
RUOYI_TOKEN=your_bearer_token_here
```

获取 Token：登录若依系统 → 浏览器开发者工具 → Network → 请求头中的 `Authorization` 字段（复制 `Bearer ` 后面的值）

## 使用方法

调用 `scripts/client.py` 中的 API 方法：

```python
from scripts.client import create_client

api = create_client()

# 用户管理
api.list_users(params)
api.create_user({'userName': 'test', 'nickName': '测试', 'password': '123456', 'deptId': 100})
api.update_user({'userId': 1, 'nickName': '新昵称'})
api.delete_user('1,2')
api.reset_password(1, 'newpass')

# 角色管理
api.list_roles(params)
api.create_role({'roleName': '测试角色', 'roleKey': 'test', 'roleSort': 10})
api.update_role(data)
api.delete_role('1')
api.change_role_status(1, '0')

# 菜单管理
api.list_menus(params)
api.create_menu({'menuName': '系统监控', 'parentId': 0, 'orderNum': 10, 'path': '/monitor', 'menuType': 'C'})
api.update_menu(data)
api.delete_menu(1)

# 部门管理
api.list_depts(params)
api.create_dept({'parentId': 100, 'deptName': '测试部', 'orderNum': 10})
api.update_dept(data)
api.delete_dept(103)
```

## 命令行使用

```bash
python3 scripts/client.py list-users
python3 scripts/client.py create-user --data '{"userName":"test","password":"123456"}'
python3 scripts/client.py delete-user --id 1
```

## 参数说明

**创建用户**：userName, nickName, password, deptId (必填)
**创建角色**：roleName, roleKey, roleSort (必填)
**创建菜单**：menuName, parentId, orderNum, path, menuType (必填)
