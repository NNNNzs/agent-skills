# 部门管理 API

## 查询部门列表

**接口**：`GET /system/dept/list`

**请求参数**：
```json
{
  "deptName": "部门名称（可选）",
  "status": "状态（可选）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "data": [
    {
      "deptId": 100,
      "parentId": 0,
      "deptName": "公司总部",
      "orderNum": 1,
      "leader": "张三",
      "phone": "13800138000",
      "email": "company@example.com",
      "status": "0",
      "children": [
        {
          "deptId": 101,
          "parentId": 100,
          "deptName": "技术部",
          "orderNum": 1
        }
      ]
    }
  ]
}
```

## 获取部门详情

**接口**：`GET /system/dept/{deptId}`

**路径参数**：
- `deptId`: 部门 ID，从 [查询部门列表](#查询部门列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "data": {
    "deptId": 100,
    "parentId": 0,
    "ancestors": "0",
    "deptName": "公司总部",
    "orderNum": 1,
    "leader": "张三",
    "phone": "13800138000",
    "email": "company@example.com",
    "status": "0"
  }
}
```

## 创建部门

**接口**：`POST /system/dept`

**请求参数**：
```json
{
  "parentId": 100,
  "deptName": "技术部",
  "orderNum": 10,
  "leader": "李四",
  "phone": "13800138001",
  "email": "tech@example.com",
  "status": "0"
}
```

**必填字段**：
- `parentId`: 父部门 ID（0 为根部门），从 [查询部门列表](#查询部门列表) 的返回结果中获取
- `deptName`: 部门名称
- `orderNum`: 显示顺序

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新部门

**接口**：`PUT /system/dept`

**请求参数**：
```json
{
  "deptId": 103,
  "parentId": 100,
  "deptName": "技术部",
  "orderNum": 10,
  "leader": "李四",
  "phone": "13800138001",
  "email": "tech@example.com",
  "status": "0"
}
```

**字段说明**：
- `deptId`: 部门 ID，从 [查询部门列表](#查询部门列表) 的返回结果中获取
- `parentId`: 父部门 ID，从 [查询部门列表](#查询部门列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 删除部门

**接口**：`DELETE /system/dept/{deptId}`

**路径参数**：
- `deptId`: 部门 ID，从 [查询部门列表](#查询部门列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```
