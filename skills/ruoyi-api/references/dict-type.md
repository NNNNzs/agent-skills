# 字典类型管理

## 接口列表

### 1. 查询字典类型列表

**接口**: `GET /system/dict/type/list`

**说明**: 分页查询字典类型列表

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| pageNum | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认10 |
| dictName | string | 否 | 字典名称（模糊查询） |
| dictType | string | 否 | 字典类型（模糊查询） |
| status | string | 否 | 状态（0正常 1停用） |

**响应示例**:
```json
{
  "total": 100,
  "rows": [
    {
      "dictId": 1,
      "dictName": "用户性别",
      "dictType": "sys_user_sex",
      "status": "0",
      "remark": "用户性别列表",
      "createTime": "2024-01-01 12:00:00"
    }
  ]
}
```

### 2. 获取字典类型详情

**接口**: `GET /system/dict/type/{dictId}`

**说明**: 根据字典ID获取详情

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictId | long | 是 | 字典ID |

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "dictId": 1,
    "dictName": "用户性别",
    "dictType": "sys_user_sex",
    "status": "0",
    "remark": "用户性别列表"
  }
}
```

### 3. 创建字典类型

**接口**: `POST /system/dict/type`

**说明**: 新增字典类型

**请求体**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictName | string | 是 | 字典名称（最大100字符） |
| dictType | string | 是 | 字典类型（小写字母开头，只能包含小写字母、数字、下划线） |
| status | string | 否 | 状态（0正常 1停用），默认0 |
| remark | string | 否 | 备注 |

**请求示例**:
```json
{
  "dictName": "用户状态",
  "dictType": "sys_user_status",
  "status": "0",
  "remark": "用户状态列表"
}
```

### 4. 修改字典类型

**接口**: `PUT /system/dict/type`

**说明**: 修改字典类型

**请求体**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictId | long | 是 | 字典ID |
| dictName | string | 是 | 字典名称 |
| dictType | string | 是 | 字典类型 |
| status | string | 否 | 状态 |
| remark | string | 否 | 备注 |

### 5. 删除字典类型

**接口**: `DELETE /system/dict/type/{dictIds}`

**说明**: 删除字典类型

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictIds | string | 是 | 字典ID（多个ID用逗号分隔） |

### 6. 刷新字典缓存

**接口**: `DELETE /system/dict/type/refreshCache`

**说明**: 刷新字典缓存

## Python 调用示例

```python
from scripts.client import create_client

api = create_client()

# 查询字典类型列表
result = api.list_dict_types({
    'pageNum': 1,
    'pageSize': 10,
    'dictName': '用户'
})

# 创建字典类型
api.create_dict_type({
    'dictName': '用户状态',
    'dictType': 'sys_user_status',
    'status': '0',
    'remark': '用户状态列表'
})

# 修改字典类型
api.update_dict_type({
    'dictId': 1,
    'dictName': '用户性别',
    'dictType': 'sys_user_sex',
    'status': '0'
})

# 删除字典类型
api.delete_dict_type('1,2,3')

# 刷新缓存
api.refresh_dict_cache()
```

## 命令行使用

```bash
# 查询字典类型列表
python3 scripts/client.py list-dict-types --params '{"pageNum":1,"pageSize":10}'

# 获取字典类型详情
python3 scripts/client.py get-dict-type --id 1

# 创建字典类型
python3 scripts/client.py create-dict-type --data '{"dictName":"用户状态","dictType":"sys_user_status","status":"0"}'

# 修改字典类型
python3 scripts/client.py update-dict-type --data '{"dictId":1,"dictName":"用户性别","dictType":"sys_user_sex"}'

# 删除字典类型
python3 scripts/client.py delete-dict-type --id 1
```

## 数据结构 (SysDictType)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictId | long | 否（创建时） | 字典ID |
| dictName | string | 是 | 字典名称（最大100字符） |
| dictType | string | 是 | 字典类型（最大100字符，正则：`^[a-z][a-z0-9_]*$`） |
| status | string | 否 | 状态（0正常 1停用） |
| remark | string | 否 | 备注 |
| createBy | string | 否 | 创建者 |
| createTime | datetime | 否 | 创建时间 |
| updateBy | string | 否 | 更新者 |
| updateTime | datetime | 否 | 更新时间 |
