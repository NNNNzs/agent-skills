# 字典数据管理 API

## 查询字典数据列表

**接口**：`GET /system/dict/data/list`

**请求参数**：
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "dictType": "sys_user_sex（必填）",
  "dictLabel": "正常（可选，模糊查询）",
  "status": "0（可选，0正常 1停用）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "rows": [
    {
      "dictCode": 1,
      "dictSort": 1,
      "dictLabel": "男",
      "dictValue": "0",
      "dictType": "sys_user_sex",
      "listClass": "primary",
      "isDefault": "Y",
      "status": "0"
    }
  ],
  "total": 50
}
```

## 根据字典类型查询数据

**接口**：`GET /system/dict/data/type/{dictType}`

不分页，返回该类型的所有字典数据。

**路径参数**：
- `dictType`: 字典类型（必填），从 [字典类型管理 API - 查询字典类型列表](dict-type.md#查询字典类型列表) 获取

## 获取字典数据详情

**接口**：`GET /system/dict/data/{dictCode}`

**路径参数**：
- `dictCode`: 字典数据 ID（必填），从 [查询字典数据列表](#查询字典数据列表) 的返回结果中获取

## 创建字典数据

**接口**：`POST /system/dict/data`

**请求参数**：
```json
{
  "dictSort": 1,
  "dictLabel": "正常",
  "dictValue": "0",
  "dictType": "sys_user_status",
  "listClass": "primary",
  "isDefault": "Y",
  "status": "0"
}
```

**必填字段**：
- `dictSort`: 排序
- `dictLabel`: 字典标签（最大100字符）
- `dictValue`: 字典键值（最大100字符）
- `dictType`: 字典类型

**可选字段**：
- `cssClass`: CSS 样式
- `listClass`: 回显样式（primary/success/info/warning/danger）
- `isDefault`: 是否默认（Y是 N否）
- `status`: 状态（0正常 1停用）

## 修改字典数据

**接口**：`PUT /system/dict/data`

请求体与创建相同，需包含 `dictCode`。

## 删除字典数据

**接口**：`DELETE /system/dict/data/{dictCodes}`

**路径参数**：
- `dictCodes`: 字典数据 ID，多个用逗号分隔，从 [查询字典数据列表](#查询字典数据列表) 的返回结果中获取
