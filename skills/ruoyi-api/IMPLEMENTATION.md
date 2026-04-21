# ruoyi-api 技能实现总结

## 技能概述

ruoyi-api 是一个让大模型能够直接调用若依系统 API 的技能。通过配置 Token，大模型可以直接执行用户管理、角色管理、菜单管理、部门管理等操作，无需手动创建。

## 文件结构

```
skills/ruoyi-api/
├── SKILL.md              # 技能定义（Claude Code 读取）
├── README.md             # 技能说明文档
├── QUICKSTART.md         # 快速开始指南
├── EXAMPLES.md           # 详细使用示例
├── IMPLEMENTATION.md     # 本文件 - 实现总结
├── metadata.json         # 技能元数据
├── config.example.json   # 配置文件示例
├── client.py             # API 客户端（核心）
├── test.py               # 测试脚本
├── agent.py              # 旧版代码生成器（已弃用）
├── parser.py             # 旧版解析器（已弃用）
└── docs/
    └── ruoyi-api.json    # 若依 OpenAPI 文档
```

## 核心功能

### 1. API 客户端（client.py）

提供直接调用若依系统 API 的能力：

- **用户管理**：创建、更新、删除、重置密码、启用/禁用
- **角色管理**：创建、更新、删除、权限分配、数据范围
- **菜单管理**：创建、更新、删除、排序
- **部门管理**：创建、更新、删除、树形结构
- **其他模块**：岗位、字典、通知、配置

### 2. 配置管理

支持两种配置方式：
1. 全局配置：`~/.ruoyi-config.json`
2. 项目配置：`项目根目录/.ruoyi-config.json`

配置格式：
```json
{
  "baseUrl": "http://localhost:3700",
  "token": "your_bearer_token_here"
}
```

### 3. 命令行支持

```bash
# 查询用户
python3 skills/ruoyi-api/client.py list-users

# 创建用户
python3 skills/ruoyi-api/client.py create-user \
  --data '{"userName":"test","password":"123456"}'

# 删除用户
python3 skills/ruoyi-api/client.py delete-user --id 100
```

### 4. 测试工具

提供完整的测试脚本验证配置和连接：

```bash
python3 skills/ruoyi-api/test.py
```

## 使用方式

### 在 Claude Code 中

```
请使用 ruoyi-api 创建一个测试用户，用户名为 testuser
```

```
使用 ruoyi-api 查询所有角色
```

```
请用 ruoyi-api 为用户 testuser 分配管理员角色
```

### Python API

```python
from skills.ruoyi-api.client import create_client

api = create_client()

# 查询用户
users = api.list_users()

# 创建用户
api.create_user({
    'userName': 'testuser',
    'nickName': '测试用户',
    'password': '123456'
})
```

## 技术实现

### 依赖

- 仅使用 Python 标准库（urllib、json、pathlib）
- 无需安装第三方依赖
- 跨平台支持

### 安全考虑

1. 配置文件不纳入版本控制（已添加到 .gitignore）
2. Token 通过 Bearer 认证传输
3. 敏感操作需要管理员权限
4. 错误信息不泄露敏感数据

### 错误处理

- 配置文件缺失提示
- API 错误统一处理
- 详细的错误信息反馈
- 测试工具帮助诊断问题

## 已弃用功能

以下文件为旧版本的代码生成功能，已弃用但保留用于参考：
- `agent.py` - 旧版代码生成器
- `parser.py` - 旧版 OpenAPI 解析器

新版本专注于直接 API 调用，不生成代码。

## 未来改进方向

1. 支持更多若依版本
2. 添加批量操作
3. 支持事务操作
4. 添加数据验证
5. 支持更多认证方式

## 相关文档

- [SKILL.md](./SKILL.md) - 技能定义
- [README.md](./README.md) - 使用说明
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [EXAMPLES.md](./EXAMPLES.md) - 使用示例
- [test.py](./test.py) - 测试工具

## 许可证

MIT
