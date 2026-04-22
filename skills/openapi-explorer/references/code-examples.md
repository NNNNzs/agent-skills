# 代码生成示例

根据接口定义（method、path、parameters、requestBody、schemas）生成对应代码。

## TypeScript (fetch)

```typescript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'test', email: 'test@example.com' })
});
const data = await response.json();
```

## Python (requests)

```python
import requests

response = requests.post('/api/users', json={'name': 'test', 'email': 'test@example.com'})
data = response.json()
```

## cURL

```bash
curl -X POST '/api/users' \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","email":"test@example.com"}'
```

## 注意事项

- 将 `{path}` 替换为实际接口路径，保留路径参数如 `{userId}`
- 根据接口定义的 security 要求添加认证头
- 查询参数拼接为 URL query string
