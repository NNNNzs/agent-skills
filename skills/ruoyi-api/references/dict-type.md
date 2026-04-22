# 字典类型管理 API

## 查询字典类型列表

**接口**：`GET /system/dict/type/list`

**请求参数**：
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "dictName": "用户性别（可选，模糊查询）",
  "dictType": "sys_user_sex（可选，模糊查询）",
  "status": "0（可选，0正常 1停用）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "rows": [
    {
      "dictId": 1,
      "dictName": "用户性别",
      "dictType": "sys_user_sex",
      "status": "0",
      "remark": "用户性别列表"
    }
  ],
  "total": 100
}
```

## 获取字典类型详情

**接口**：`GET /system/dict/type/{dictId}`

**路径参数**：
- `dictId`: 字典 ID（必填），从 [查询字典类型列表](#查询字典类型列表) 的返回结果中获取

## 创建字典类型

**接口**：`POST /system/dict/type`

**请求参数**：
```json
{
  "dictName": "用户状态",
  "dictType": "sys_user_status",
  "status": "0",
  "remark": "用户状态列表"
}
```

**必填字段**：
- `dictName`: 字典名称（最大100字符）
- `dictType`: 字典类型（小写字母开头，只能包含小写字母、数字、下划线，正则：`^[a-z][a-z0-9_]*$`）

## 修改字典类型

**接口**：`PUT /system/dict/type`

请求体与创建相同，需包含 `dictId`。

## 删除字典类型

**接口**：`DELETE /system/dict/type/{dictIds}`

**路径参数**：
- `dictIds`: 字典 ID，多个用逗号分隔，从 [查询字典类型列表](#查询字典类型列表) 的返回结果中获取

## 刷新字典缓存

**接口**：`DELETE /system/dict/type/refreshCache`
