# 用户管理 API

## 查询用户列表

**接口**：`GET /system/user/list`

**请求参数**：
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "userName": "用户名（可选）",
  "phonenumber": "手机号（可选）",
  "status": "状态（可选）",
  "deptId": 100
}
```

**返回结果**：
```json
{
  "code": 200,
  "msg": "查询成功",
  "rows": [
    {
      "userId": 1,
      "userName": "admin",
      "nickName": "管理员",
      "email": "admin@example.com",
      "phonenumber": "13800138000",
      "status": "0",
      "deptId": 100
    }
  ],
  "total": 100
}
```

## 获取用户详情

**接口**：`GET /system/user/{userId}`

**路径参数**：
- `userId`: 用户 ID（必填）

**返回结果**：
```json
{
  "code": 200,
  "data": {
    "userId": 1,
    "userName": "admin",
    "nickName": "管理员",
    "email": "admin@example.com",
    "phonenumber": "13800138000",
    "sex": "0",
    "avatar": "头像URL",
    "status": "0",
    "deptId": 100,
    "roleIds": [1, 2]
  }
}
```

## 创建用户

**接口**：`POST /system/user`

**请求参数**：
```json
{
  "userName": "testuser",
  "nickName": "测试用户",
  "password": "123456",
  "deptId": 100,
  "phonenumber": "13800138000",
  "email": "test@example.com",
  "sex": "0",
  "status": "0",
  "roleIds": [2]
}
```

**必填字段**：
- `userName`: 用户名
- `nickName`: 昵称
- `password`: 密码
- `deptId`: 部门 ID

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 更新用户

**接口**：`PUT /system/user`

**请求参数**：
```json
{
  "userId": 1,
  "userName": "admin",
  "nickName": "管理员",
  "email": "admin@example.com",
  "phonenumber": "13800138000",
  "sex": "0",
  "status": "0",
  "deptId": 100,
  "roleIds": [1, 2]
}
```

**必填字段**：
- `userId`: 用户 ID

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 删除用户

**接口**：`DELETE /system/user/{userIds}`

**路径参数**：
- `userIds`: 用户 ID，多个用逗号分隔

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 重置密码

**接口**：`PUT /system/user/resetPwd`

**请求参数**：
```json
{
  "userId": 1,
  "password": "123456"
}
```

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```

## 修改用户状态

**接口**：`PUT /system/user/changeStatus`

**请求参数**：
```json
{
  "userId": 1,
  "status": "0"
}
```

**状态说明**：
- `0`: 正常
- `1`: 停用

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功"
}
```
