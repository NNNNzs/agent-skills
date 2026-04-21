# ruoyi-api 使用演示

## 配置 Token

1. 登录若依系统
2. 打开浏览器开发者工具（F12）
3. 找到请求头中的 Authorization 字段
4. 复制 Token 值

5. 创建配置文件：

```bash
cat > ~/.ruoyi-config.json << 'EOF'
{
  "baseUrl": "http://localhost:3700",
  "token": "这里粘贴你的token"
}
EOF
```

## 使用示例

### 示例 1：创建用户

在 Claude Code 中输入：

```
请使用 ruoyi-api 创建一个测试用户：
- 用户名：testuser
- 昵称：测试用户
- 密码：123456
- 手机号：13800138000
```

Claude 会自动：
1. 读取配置文件获取 Token
2. 调用 client.py 创建用户
3. 返回操作结果

### 示例 2：查询用户

```
使用 ruoyi-api 查询所有用户
```

### 示例 3：创建角色

```
请用 ruoyi-api 创建一个角色：
- 角色名称：测试人员
- 角色键：test
- 显示顺序：10
```

### 示例 4：创建菜单

```
使用 ruoyi-api 创建菜单：
- 菜单名称：系统监控
- 路由路径：/monitor
- 组件路径：monitor/index
- 显示顺序：10
```

### 示例 5：批量操作

```
使用 ruoyi-api 批量创建 3 个测试用户：
用户名为 test1, test2, test3，密码都是 123456
```

## 测试连接

```bash
cd /Users/nnnnzs/project/agent-skills
python3 skills/ruoyi-api/test.py
```

## 命令行使用

```bash
# 查询用户列表
python3 skills/ruoyi-api/client.py list-users

# 查询角色列表
python3 skills/ruoyi-api/client.py list-roles

# 查询部门列表
python3 skills/ruoyi-api/client.py list-depts

# 创建用户
python3 skills/ruoyi-api/client.py create-user \
  --data '{"userName":"test","nickName":"测试","password":"123456"}'
```

## 常用操作参数

### 创建用户必需参数
- userName: 用户名（必填）
- nickName: 昵称（必填）
- password: 密码（必填）
- deptId: 部门ID（必填）

### 创建角色必需参数
- roleName: 角色名称（必填）
- roleKey: 角色键（必填）
- roleSort: 显示顺序（必填）

### 创建菜单必需参数
- menuName: 菜单名称（必填）
- parentId: 父菜单ID（必填，0为根菜单）
- orderNum: 显示顺序（必填）
- path: 路由地址（必填）
- menuType: 类型（必填，M目录/C菜单/F按钮）

## 注意事项

1. 确保 Token 有效且具有相应权限
2. 删除操作不可恢复，请谨慎使用
3. 批量操作前建议先查询确认
4. 敏感操作需要管理员权限

## 错误排查

如果遇到错误：

1. 检查配置文件是否存在
2. 检查 Token 是否正确
3. 检查 baseUrl 是否可访问
4. 运行测试脚本诊断问题

```bash
python3 skills/ruoyi-api/test.py
```
