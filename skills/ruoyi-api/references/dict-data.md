# 字典数据管理

## 接口列表

### 1. 查询字典数据列表

**接口**: `GET /system/dict/data/list`

**说明**: 分页查询字典数据列表

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| pageNum | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认10 |
| dictType | string | 是 | 字典类型 |
| dictLabel | string | 否 | 字典标签（模糊查询） |
| status | string | 否 | 状态（0正常 1停用） |

**响应示例**:
```json
{
  "total": 50,
  "rows": [
    {
      "dictCode": 1,
      "dictSort": 1,
      "dictLabel": "男",
      "dictValue": "0",
      "dictType": "sys_user_sex",
      "cssClass": "",
      "listClass": "primary",
      "isDefault": "Y",
      "status": "0"
    }
  ]
}
```

### 2. 根据字典类型查询数据

**接口**: `GET /system/dict/data/type/{dictType}`

**说明**: 根据字典类型查询字典数据（不分页，返回所有数据）

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictType | string | 是 | 字典类型 |

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "dictCode": 1,
      "dictLabel": "男",
      "dictValue": "0"
    },
    {
      "dictCode": 2,
      "dictLabel": "女",
      "dictValue": "1"
    }
  ]
}
```

### 3. 获取字典数据详情

**接口**: `GET /system/dict/data/{dictCode}`

**说明**: 根据字典数据ID获取详情

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictCode | long | 是 | 字典数据ID |

### 4. 创建字典数据

**接口**: `POST /system/dict/data`

**说明**: 新增字典数据

**请求体**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictSort | int | 是 | 字典排序 |
| dictLabel | string | 是 | 字典标签（最大100字符） |
| dictValue | string | 是 | 字典键值（最大100字符） |
| dictType | string | 是 | 字典类型 |
| cssClass | string | 否 | CSS样式（最大100字符） |
| listClass | string | 否 | 回显样式（primary、success、info、warning、danger） |
| isDefault | string | 否 | 是否默认（Y是 N否） |
| status | string | 否 | 状态（0正常 1停用） |
| remark | string | 否 | 备注 |
| default | boolean | 否 | 是否默认 |

**请求示例**:
```json
{
  "dictSort": 1,
  "dictLabel": "正常",
  "dictValue": "0",
  "dictType": "sys_user_status",
  "cssClass": "",
  "listClass": "primary",
  "isDefault": "Y",
  "status": "0",
  "remark": "正常状态"
}
```

### 5. 修改字典数据

**接口**: `PUT /system/dict/data`

**说明**: 修改字典数据

**请求体**: 与创建相同，需包含 `dictCode`

### 6. 删除字典数据

**接口**: `DELETE /system/dict/data/{dictCodes}`

**说明**: 删除字典数据

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictCodes | string | 是 | 字典数据ID（多个ID用逗号分隔） |

## Python 调用示例

```python
from scripts.client import create_client

api = create_client()

# 查询字典数据列表
result = api.list_dict_data({
    'pageNum': 1,
    'pageSize': 10,
    'dictType': 'sys_user_sex'
})

# 根据字典类型获取数据（不分页）
data = api.get_dict_data_by_type('sys_user_sex')

# 创建字典数据
api.create_dict_data({
    'dictSort': 1,
    'dictLabel': '正常',
    'dictValue': '0',
    'dictType': 'sys_user_status',
    'listClass': 'primary',
    'isDefault': 'Y',
    'status': '0'
})

# 修改字典数据
api.update_dict_data({
    'dictCode': 1,
    'dictLabel': '男',
    'dictValue': '0',
    'dictType': 'sys_user_sex'
})

# 删除字典数据
api.delete_dict_data('1,2,3')
```

## 命令行使用

```bash
# 查询字典数据列表
python3 scripts/client.py list-dict-data --params '{"dictType":"sys_user_sex","pageNum":1}'

# 根据类型获取数据
python3 scripts/client.py get-dict-data-by-type --dict-type sys_user_sex

# 创建字典数据
python3 scripts/client.py create-dict-data --data '{"dictSort":1,"dictLabel":"正常","dictValue":"0","dictType":"sys_user_status"}'

# 修改字典数据
python3 scripts/client.py update-dict-data --data '{"dictCode":1,"dictLabel":"男"}'

# 删除字典数据
python3 scripts/client.py delete-dict-data --id 1
```

## 数据结构 (SysDictData)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dictCode | long | 否（创建时） | 字典编码 |
| dictSort | int | 否 | 字典排序 |
| dictLabel | string | 是 | 字典标签（最大100字符） |
| dictValue | string | 是 | 字典键值（最大100字符） |
| dictType | string | 是 | 字典类型（最大100字符） |
| cssClass | string | 否 | CSS样式（最大100字符） |
| listClass | string | 否 | 回显样式 |
| isDefault | string | 否 | 是否默认（Y是 N否） |
| status | string | 否 | 状态（0正常 1停用） |
| remark | string | 否 | 备注 |
| default | boolean | 否 | 是否默认 |
| createBy | string | 否 | 创建者 |
| createTime | datetime | 否 | 创建时间 |
| updateBy | string | 否 | 更新者 |
| updateTime | datetime | 否 | 更新时间 |

## 回显样式说明

| 样式值 | 颜色 |
|--------|------|
| primary | 蓝色 |
| success | 绿色 |
| info | 灰色 |
| warning | 黄色 |
| danger | 红色 |
