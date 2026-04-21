---
name: ruoyi-api
description: 若依(RuoYi)系统管理 API 调用工具。当用户需要操作若依系统的用户、角色、菜单、部门、字典、参数配置时激活。触发词："若依"、"ruoyi"、"创建用户"、"分配角色"、"创建菜单"、"字典类型"、"参数配置"。需要配置 .env 文件（RUOYI_BASE_URL、RUOYI_TOKEN）。
---

# ruoyi-api

直接调用若依系统管理接口的工具。

## 配置

在项目根目录创建 `.env` 文件：

```bash
# 如果是前端代理地址（需要包含二级路径）
RUOYI_BASE_URL=http://localhost:3700/dev-api

# 如果是后端接口地址（不需要二级路径）
# RUOYI_BASE_URL=http://localhost:8080

RUOYI_TOKEN=your_bearer_token_here
```

### 如何判断 base_url 格式

查看浏览器 Network 面板的实际请求 URL：

- 前端代理地址：`http://localhost:3700/dev-api/system/user/list`
  - ✅ 配置：`http://localhost:3700/dev-api`
  - ❌ 配置：`http://localhost:3700`

- 后端接口地址：`http://localhost:8080/system/user/list`
  - ✅ 配置：`http://localhost:8080`
  - ❌ 配置：`http://localhost:8080/dev-api`

### 获取 Token

登录若依系统 → 浏览器开发者工具 → Network → 任意请求 → 请求头中的 `Authorization` 字段（复制 `Bearer ` 后面的值）

### 使用前验证

⚠️ **执行任何操作前，必须先验证网络连通性和配置正确性**：

```python
from scripts.client import create_client

# 创建客户端时会自动验证
api = create_client()
```

验证会自动检测：
1. base_url 是否包含二级路径（提示信息，非强制）
2. 网络连通性
3. 接口是否正确返回（404 提示可能需要添加二级路径）
4. Token 有效性

如果验证失败，请根据提示检查 `.env` 配置。

## API 文档

详细接口文档按模块分类，按需查阅：

- **用户管理** - 见 [references/user.md](references/user.md)
- **角色管理** - 见 [references/role.md](references/role.md)
- **菜单管理** - 见 [references/menu.md](references/menu.md)
- **部门管理** - 见 [references/dept.md](references/dept.md)
- **字典类型管理** - 见 [references/dict-type.md](references/dict-type.md)
- **字典数据管理** - 见 [references/dict-data.md](references/dict-data.md)
- **参数配置管理** - 见 [references/config.md](references/config.md)

## 快速开始

```python
from scripts.client import create_client

api = create_client()

# 查询用户
api.list_users({'pageNum': 1, 'pageSize': 10})

# 创建用户
api.create_user({
    'userName': 'test',
    'nickName': '测试',
    'password': '123456',
    'deptId': 100
})

# 创建角色
api.create_role({
    'roleName': '测试角色',
    'roleKey': 'test',
    'roleSort': 10
})

# 创建字典类型
api.create_dict_type({
    'dictName': '用户状态',
    'dictType': 'sys_user_status',
    'status': '0'
})

# 创建字典数据
api.create_dict_data({
    'dictSort': 1,
    'dictLabel': '正常',
    'dictValue': '0',
    'dictType': 'sys_user_status'
})

# 获取参数配置
config = api.get_config_by_key('sys.index.skinName')
```

## 命令行使用

```bash
# 用户管理
python3 scripts/client.py list-users
python3 scripts/client.py create-user --data '{"userName":"test","password":"123456","deptId":100}'

# 字典类型管理
python3 scripts/client.py list-dict-types --params '{"pageNum":1}'
python3 scripts/client.py create-dict-type --data '{"dictName":"用户状态","dictType":"sys_user_status"}'

# 字典数据管理
python3 scripts/client.py list-dict-data --params '{"dictType":"sys_user_sex"}'
python3 scripts/client.py create-dict-data --data '{"dictSort":1,"dictLabel":"正常","dictValue":"0","dictType":"sys_user_status"}'

# 参数配置管理
python3 scripts/client.py list-configs --params '{"pageNum":1}'
python3 scripts/client.py get-config-by-key --config-key sys.index.skinName

# 跳过连通性验证（用于自动化脚本）
python3 scripts/client.py list-users --skip-validation
```
