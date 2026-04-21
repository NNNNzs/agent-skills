# ruoyi-api 快速开始指南

## 第一步：获取 Token

### 方法 1：从浏览器获取（推荐）

1. 登录你的若依系统（如 http://localhost:3700）
2. 按 F12 打开浏览器开发者工具
3. 切换到 **Network**（网络）标签
4. 刷新页面或进行任意操作
5. 在网络请求列表中找到任意请求
6. 点击该请求，查看 **Headers**（请求头）
7. 找到 `Authorization` 字段，值格式为 `Bearer eyJhbGciOiJIUzUxMiJ9...`
8. 复制 `Bearer ` 后面的部分

### 方法 2：通过 API 获取

```bash
curl -X POST http://localhost:3700/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

返回结果中的 `token` 字段值就是你需要的内容。

## 第二步：配置

### 选项 A：全局配置（推荐）

创建或编辑文件 `~/.ruoyi-config.json`：

```bash
cat > ~/.ruoyi-config.json << 'EOF'
{
  "baseUrl": "http://localhost:3700",
  "token": "这里粘贴你的token"
}
EOF
```

### 选项 B：项目配置

在项目根目录创建 `.ruoyi-config.json`（不要提交到 Git）：

```bash
cat > .ruoyi-config.json << 'EOF'
{
  "baseUrl": "http://localhost:3700",
  "token": "这里粘贴你的token"
}
EOF

# 添加到 .gitignore
echo ".ruoyi-config.json" >> .gitignore
```

## 第三步：测试

在 Claude Code 中输入：

```
使用 ruoyi-api 查询所有用户
```

如果返回用户列表，说明配置成功！

## 第四步：开始使用

现在你可以直接让大模型操作若依系统了：

```
请使用 ruoyi-api 创建一个测试用户：
- 用户名：testuser
- 密码：123456
- 昵称：测试用户
```

```
使用 ruoyi-api 创建一个测试部门
```

```
请用 ruoyi-api 为用户 testuser 分配管理员角色
```

## 常见问题

### Token 失效怎么办？

Token 有有效期限制，失效后重新获取并更新配置文件即可。

### 提示权限不足？

确保你使用的账号具有相应权限，建议使用管理员账号获取 Token。

### 找不到配置文件？

配置文件会按以下优先级查找：
1. 项目根目录的 `.ruoyi-config.json`
2. 用户主目录的 `~/.ruoyi-config.json`

### 如何验证配置是否正确？

```bash
# 测试连接
python3 skills/ruoyi-api/client.py list-users
```

## 安全提示

⚠️ **重要**：
- 不要将配置文件提交到版本控制系统
- 定期更新 Token
- 使用具有适当权限的账号
- 敏感操作前先备份数据
