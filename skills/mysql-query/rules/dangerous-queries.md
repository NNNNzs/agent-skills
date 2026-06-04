# 危险操作确认规则

## 为什么重要

SQL 中涉及数据删除、表结构变更等操作不可逆或影响范围大，必须确保用户明确知情并主动确认后才能执行。

## 危险操作定义

以下类型的 SQL 语句被视为危险操作，**必须**在执行前向用户确认：

| 类别 | 关键字 | 示例 |
|------|--------|------|
| 删除数据 | `DELETE`, `TRUNCATE` | `DELETE FROM users WHERE id = 1` |
| 删除表 | `DROP TABLE` | `DROP TABLE temp_data` |
| 删除数据库 | `DROP DATABASE` | `DROP DATABASE old_db` |
| 修改表结构 | `ALTER TABLE ... DROP`, `ALTER TABLE ... MODIFY`, `ALTER TABLE ... CHANGE` | `ALTER TABLE users DROP COLUMN email` |
| 覆盖更新 | `UPDATE`（无条件 WHERE 或全表更新） | `UPDATE users SET status = 0` |
| 清空表数据 | `TRUNCATE TABLE` | `TRUNCATE TABLE logs` |

## 正确做法

当用户请求执行包含上述关键字的 SQL 时：

1. **识别危险操作** — 检查 SQL 是否包含危险关键字
2. **展示影响范围** — 如果是 DELETE/UPDATE，先用 SELECT COUNT 或 EXPLAIN 展示影响行数
3. **等待用户明确确认** — 向用户说明将要执行的操作和影响范围，等待用户明确回复"确认"或"执行"
4. **收到确认后才执行** — 用户明确同意后再执行

### 确认话术示例

```
即将执行危险操作：

SQL: DELETE FROM users WHERE status = 0
影响: 将删除 15 条记录

请确认是否执行？（回复"确认"继续）
```

## 错误做法

**直接执行危险操作而不确认。**

```python
# 错误：跳过确认直接执行
execute_query(project_dir, "DELETE FROM users WHERE status = 0")
```

**改进：** 先评估影响，再请求确认。

```python
# 正确：先评估影响
execute_query(project_dir, "SELECT COUNT(*) FROM users WHERE status = 0")
# 等待用户确认后再执行
execute_query(project_dir, "DELETE FROM users WHERE status = 0")
```

## 额外上下文

- `DROP` 和 `TRUNCATE` 操作不可回滚（在非事务引擎下），需要特别谨慎
- 建议对重要数据表在操作前使用 `CREATE TABLE ... LIKE` 做备份
- 带有 `WHERE` 条件的 `DELETE`/`UPDATE` 需要确认 WHERE 条件是否合理
