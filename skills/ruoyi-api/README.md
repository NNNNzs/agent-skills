# ruoyi-api

若依系统 API 直接调用工具 - 让大模型能够直接操作若依系统。

## 功能特性

- 🚀 直接调用若依系统 API，无需手动操作
- 👤 用户管理 - 创建、更新、删除、重置密码
- 🔐 角色管理 - 创建角色、分配权限
- 📋 菜单管理 - 动态创建菜单
- 🏢 部门管理 - 组织架构维护
- 📊 其他模块 - 岗位、字典、通知等

## 快速开始

### 1. 安装技能

```bash
npx skills add NNNNzs/agent-skills --skill ruoyi-api
```

### 2. 配置访问信息

创建配置文件 `~/.ruoyi-config.json`：

```bash
cat > ~/.ruoyi-config.json << 'EOF'
{
  "baseUrl": "http://localhost:3700",
  "token": "your_bearer_token_here"
}
EOF
```

**获取 Token 的方式：**

1. 登录若依系统
2. 打开浏览器开发者工具（F12）
3. 切换到 Network 标签
4. 刷新页面，找到任意请求
5. 查看请求头中的 `Authorization` 字段
6. 复制 `Bearer ` 后面的 token 值

或者通过登录接口获取：

```bash
curl -X POST http://localhost:3700/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. 使用

在 Claude Code 中直接使用自然语言操作若依系统：

```
请使用 ruoyi-api 创建一个测试用户，用户名为 testuser，密码 123456
```

```
使用 ruoyi-api 查询所有角色列表
```

```
请用 ruoyi-api 创建一个管理员角色
```

## 可用操作

### 用户管理

| 操作 | 示例 |
|------|------|
| 查询用户 | 查询所有用户 |
| 创建用户 | 创建用户 zhangsan，密码 123456，属于技术部 |
| 更新用户 | 将用户 zhangsan 的邮箱改为 zhang@example.com |
| 删除用户 | 删除用户 1001 |
| 重置密码 | 将用户 zhangsan 的密码重置为 123456 |
| 启用/禁用 | 禁用用户 zhangsan |

### 角色管理

| 操作 | 示例 |
|------|------|
| 查询角色 | 查询所有角色 |
| 创建角色 | 创建角色"测试人员"，角色键 test |
| 更新角色 | 更新角色 2 的权限 |
| 删除角色 | 删除角色 5 |
| 修改状态 | 停用角色 3 |

### 菜单管理

| 操作 | 示例 |
|------|------|
| 查询菜单 | 查询所有菜单 |
| 创建菜单 | 创建菜单"系统监控"，路径 /monitor |
| 更新菜单 | 修改菜单 10 的排序 |
| 删除菜单 | 删除菜单 20 |

### 部门管理

| 操作 | 示例 |
|------|------|
| 查询部门 | 查询所有部门 |
| 创建部门 | 创建部门"测试部"，上级部门为技术部 |
| 更新部门 | 更新部门 103 的信息 |
| 删除部门 | 删除部门 105 |

## 命令行使用

```bash
# 查询用户列表
python3 skills/ruoyi-api/client.py list-users

# 查询用户详情
python3 skills/ruoyi-api/client.py get-user --id 1

# 创建用户
python3 skills/ruoyi-api/client.py create-user \
  --data '{"userName":"test","nickName":"测试","password":"123456"}'

# 删除用户
python3 skills/ruoyi-api/client.py delete-user --id 100

# 查询角色列表
python3 skills/ruoyi-api/client.py list-roles

# 创建角色
python3 skills/ruoyi-api/client.py create-role \
  --data '{"roleName":"测试角色","roleKey":"test","roleSort":10}'
```

## Python API 使用

```python
from skills.ruoyi-api.client import create_client

# 创建客户端
api = create_client()

# 查询用户
users = api.list_users()
print(users)

# 创建用户
result = api.create_user({
    'userName': 'testuser',
    'nickName': '测试用户',
    'password': '123456',
    'deptId': 100,
    'status': '0'
})

# 重置密码
api.reset_password(1, 'newpassword')
```

## 注意事项

1. **Token 有效期** - 若依系统的 Token 可能会过期，需要定期更新
2. **权限要求** - 某些操作需要管理员权限
3. **删除操作** - 删除操作不可恢复，请谨慎使用
4. **数据验证** - 创建数据时请确保参数正确

## 安全建议

- 不要将配置文件提交到版本控制系统
- 定期更新 Token
- 使用具有适当权限的账号
- 敏感操作前先备份数据

## 许可证

MIT
