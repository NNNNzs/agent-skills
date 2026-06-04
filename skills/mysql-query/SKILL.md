---
name: mysql-query
version: 1.0.0
description: MySQL 数据库查询工具。使用项目目录下的 .env 文件自动读取数据库配置，通过 mysql 命令行工具执行查询。适用场景：(1) 排查数据库结构问题 - 查看表结构、索引、约束等 (2) 排查数据问题 - 查询、统计、验证数据一致性 (3) 调试 SQL 相关问题 - 验证查询结果、检查数据状态 (4) 数据分析 - 统计报表、数据汇总。当用户需要查询数据库、检查数据、排查数据库相关问题时使用此技能。
---

# MySQL Query

MySQL 数据库查询工具，通过项目 .env 文件自动连接数据库并执行查询。

## 脚本路径

所有脚本位于 `{SKILL_DIR}/scripts/`，使用 Python 3 标准库（零依赖）。

## 快速开始

执行查询：

```bash
python3 {SKILL_DIR}/scripts/mysql_query.py <项目目录> "<SQL查询>"
```

示例：

```bash
# 查看所有表
python3 {SKILL_DIR}/scripts/mysql_query.py /path/to/project "SHOW TABLES"

# 查看表结构
python3 {SKILL_DIR}/scripts/mysql_query.py /path/to/project "DESCRIBE logistics_order"

# 查询数据
python3 {SKILL_DIR}/scripts/mysql_query.py /path/to/project "SELECT * FROM logistics_order LIMIT 10"
```

## .env 文件配置

按以下优先级查找 `.env` 文件：

1. **指定配置文件**：`export DB_CONFIG_PATH=/path/to/.env`
2. **项目目录**：`<项目目录>/.env`

脚本支持以下配置格式：

**格式 1: JDBC URL（推荐）**

```env
DB_URL=jdbc:mysql://host:port/database?params...
DB_USERNAME=username
DB_PASSWORD=password
```

**格式 2: 分离配置**

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=username
DB_PASSWORD=password
```

## 常用查询示例

### 结构排查

```sql
-- 查看表结构
DESCRIBE table_name;

-- 查看建表语句
SHOW CREATE TABLE table_name;

-- 查看索引
SHOW INDEX FROM table_name;

-- 查看所有表
SHOW TABLES;
```

### 数据排查

```sql
-- 统计记录数
SELECT COUNT(*) FROM table_name;

-- 查看重复数据
SELECT column, COUNT(*) as count
FROM table_name
GROUP BY column
HAVING count > 1;

-- 查看最近记录
SELECT * FROM table_name ORDER BY create_time DESC LIMIT 10;
```

### 关联查询

```sql
-- 多表关联
SELECT a.*, b.name
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id
WHERE a.status = '1';
```

## 安全规则

- **dangerous-queries** - 涉及数据删除、结构变更等危险操作必须先向用户确认，详见 [rules/dangerous-queries.md](rules/dangerous-queries.md)

## 注意事项

1. 脚本会在命令行中显示密码警告，这是正常行为
2. 确保 .env 文件存在且包含正确的数据库配置
3. 查询结果会直接输出到终端
