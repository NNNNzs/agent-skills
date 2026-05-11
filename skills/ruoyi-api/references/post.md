# 岗位管理 API

## 查询岗位列表

**接口**：`GET /system/post/list`

**请求参数**：
```json
{
  "postCode": "岗位编码（可选）",
  "postName": "岗位名称（可选）",
  "status": "状态（可选）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "data": [
    {
      "postId": 1,
      "postCode": "ceo",
      "postName": "董事长",
      "postSort": 1,
      "status": "0",
      "remark": "董事长"
    }
  ],
  "total": 1
}
```

## 获取岗位详情

**接口**：`GET /system/post/{postId}`

**路径参数**：
- `postId`: 岗位 ID，从 [查询岗位列表](#查询岗位列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "data": {
    "postId": 1,
    "postCode": "ceo",
    "postName": "董事长",
    "postSort": 1,
    "status": "0",
    "remark": "董事长"
  }
}
```

## 创建岗位

**接口**：`POST /system/post`

**请求参数**：
```json
{
  "postCode": "hr",
  "postName": "人力资源",
  "postSort": 2,
  "status": "0",
  "remark": "人力资源岗位"
}
```

**必填字段**：
- `postCode`: 岗位编码
- `postName`: 岗位名称
- `postSort`: 显示顺序

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新岗位

**接口**：`PUT /system/post`

**请求参数**：
```json
{
  "postId": 1,
  "postCode": "ceo",
  "postName": "董事长",
  "postSort": 1,
  "status": "0",
  "remark": "董事长"
}
```

**字段说明**：
- `postId`: 岗位 ID，从 [查询岗位列表](#查询岗位列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 删除岗位

**接口**：`DELETE /system/post/{postIds}`

**路径参数**：
- `postIds`: 岗位 ID，多个用逗号分隔（如 `1,2,3`），从 [查询岗位列表](#查询岗位列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```
