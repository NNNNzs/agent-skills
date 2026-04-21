# 菜单管理 API

## 查询菜单列表

**接口**：`GET /system/menu/list`

**请求参数**：
```json
{
  "menuName": "菜单名称（可选）",
  "status": "状态（可选）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "data": [
    {
      "menuId": 1,
      "menuName": "系统管理",
      "parentId": 0,
      "orderNum": 1,
      "path": "/system",
      "component": null,
      "menuType": "M",
      "visible": "0",
      "status": "0",
      "children": []
    }
  ]
}
```

## 获取菜单详情

**接口**：`GET /system/menu/{menuId}`

**路径参数**：
- `menuId`: 菜单 ID，从 [查询菜单列表](#查询菜单列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "data": {
    "menuId": 1,
    "menuName": "系统管理",
    "parentId": 0,
    "orderNum": 1,
    "path": "/system",
    "component": null,
    "menuType": "M",
    "visible": "0",
    "status": "0"
  }
}
```

## 创建菜单

**接口**：`POST /system/menu`

**请求参数**：
```json
{
  "menuName": "系统监控",
  "parentId": 0,
  "orderNum": 10,
  "path": "/monitor",
  "component": "monitor/index",
  "menuType": "C",
  "visible": "0",
  "status": "0",
  "icon": "monitor",
  "perms": "monitor:list"
}
```

**必填字段**：
- `menuName`: 菜单名称
- `parentId`: 父菜单 ID（0 为根菜单），从 [查询菜单列表](#查询菜单列表) 的返回结果中获取
- `orderNum`: 显示顺序
- `path`: 路由地址
- `menuType`: 类型

**菜单类型**：
- `M`: 目录
- `C`: 菜单
- `F`: 按钮

**显示状态**：
- `0`: 显示
- `1`: 隐藏

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新菜单

**接口**：`PUT /system/menu`

**请求参数**：
```json
{
  "menuId": 1,
  "menuName": "系统管理",
  "parentId": 0,
  "orderNum": 1,
  "path": "/system",
  "menuType": "M",
  "visible": "0",
  "status": "0"
}
```

**字段说明**：
- `menuId`: 菜单 ID，从 [查询菜单列表](#查询菜单列表) 的返回结果中获取
- `parentId`: 父菜单 ID，从 [查询菜单列表](#查询菜单列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 删除菜单

**接口**：`DELETE /system/menu/{menuId}`

**路径参数**：
- `menuId`: 菜单 ID，从 [查询菜单列表](#查询菜单列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新菜单排序

**接口**：`PUT /system/menu/updateSort`

**请求参数**：
```json
{
  "menuId": 1,
  "orderNum": 10
}
```

**字段说明**：
- `menuId`: 菜单 ID，从 [查询菜单列表](#查询菜单列表) 的返回结果中获取

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```
