# 代码生成示例

## TypeScript (fetch)

```typescript
interface {SchemaName} {
  // 根据 schema 生成接口定义
}

async function apiCall(params: {SchemaName}) {
  const response = await fetch('{url}', {
    method: '{method}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}
```

## Python (requests)

```python
import requests
from typing import Optional

def api_call():
    url = "{url}"
    headers = {"Content-Type": "application/json"}
    response = requests.{method.lower()}(url, json=params, headers=headers)
    return response.json()
```

## cURL

```bash
curl -X {method} "{url}" \
  -H "Content-Type: application/json" \
  -d '{...}'
```
