# 角色管理 API

## 查询角色列表

**接口**：`GET /system/role/list`

**请求参数**：
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "roleName": "角色名称（可选）",
  "roleKey": "角色键（可选）",
  "status": "状态（可选）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "rows": [
    {
      "roleId": 1,
      "roleName": "管理员",
      "roleKey": "admin",
      "roleSort": 1,
      "status": "0",
      "dataScope": "1"
    }
  ],
  "total": 10
}
```

## 获取角色详情

**接口**：`GET /system/role/{roleId}`

**路径参数**：
- `roleId`: 角色 ID

**返回结果**：
```json
{
  "code": 200,
  "data": {
    "roleId": 1,
    "roleName": "管理员",
    "roleKey": "admin",
    "roleSort": 1,
    "dataScope": "1",
    "status": "0",
    "menuIds": [1, 2, 3],
    "deptIds": [100, 101]
  }
}
```

## 创建角色

**接口**：`POST /system/role`

**请求参数**：
```json
{
  "roleName": "测试角色",
  "roleKey": "test",
  "roleSort": 10,
  "dataScope": "1",
  "status": "0",
  "menuIds": [1, 2, 3],
  "deptIds": [100, 101],
  "remark": "角色描述"
}
```

**必填字段**：
- `roleName`: 角色名称
- `roleKey`: 角色键
- `roleSort`: 显示顺序

**数据范围**：
- `1`: 全部数据
- `2`: 自定义数据
- `3`: 本部门数据
- `4`: 本部门及以下数据
- `5`: 仅本人数据

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新角色

**接口**：`PUT /system/role`

**请求参数**：
```json
{
  "roleId": 1,
  "roleName": "管理员",
  "roleKey": "admin",
  "roleSort": 1,
  "dataScope": "1",
  "status": "0",
  "menuIds": [1, 2, 3],
  "deptIds": [100, 101]
}
```

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 删除角色

**接口**：`DELETE /system/role/{roleIds}`

**路径参数**：
- `roleIds`: 角色 ID，多个用逗号分隔

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 修改角色状态

**接口**：`PUT /system/role/changeStatus`

**请求参数**：
```json
{
  "roleId": 1,
  "status": "0"
}
```

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 修改数据权限

**接口**：`PUT /system/role/dataScope`

**请求参数**：
```json
{
  "roleId": 1,
  "dataScope": "2",
  "deptIds": [100, 101, 102]
}
```

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```
