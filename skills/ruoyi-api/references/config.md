# 参数配置管理 API

## 查询参数配置列表

**接口**：`GET /system/config/list`

**请求参数**：
```json
{
  "pageNum": 1,
  "pageSize": 10,
  "configName": "皮肤（可选，模糊查询）",
  "configKey": "sys.index（可选，模糊查询）",
  "configType": "Y（可选，Y系统内置 N非内置）"
}
```

**返回结果**：
```json
{
  "code": 200,
  "rows": [
    {
      "configId": 1,
      "configName": "主框架页-默认皮肤样式名称",
      "configKey": "sys.index.skinName",
      "configValue": "skin-blue",
      "configType": "Y",
      "remark": "若依系统默认皮肤"
    }
  ],
  "total": 20
}
```

## 获取参数配置详情

**接口**：`GET /system/config/{configId}`

**路径参数**：
- `configId`: 参数 ID（必填），从 [查询参数配置列表](#查询参数配置列表) 的返回结果中获取

## 根据键名查询参数

**接口**：`GET /system/config/configKey/{configKey}`

**路径参数**：
- `configKey`: 参数键名（必填）

**返回结果**：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": "skin-blue"
}
```

## 创建参数配置

**接口**：`POST /system/config`

**请求参数**：
```json
{
  "configName": "用户管理-初始密码",
  "configKey": "sys.user.initPassword",
  "configValue": "123456",
  "configType": "Y",
  "remark": "初始化密码"
}
```

**必填字段**：
- `configName`: 参数名称（最大100字符）
- `configKey`: 参数键名（最大100字符）
- `configValue`: 参数键值（最大500字符）

**可选字段**：
- `configType`: 系统内置（Y是 N否）
- `remark`: 备注

## 修改参数配置

**接口**：`PUT /system/config`

请求体与创建相同，需包含 `configId`。

## 删除参数配置

**接口**：`DELETE /system/config/{configIds}`

**路径参数**：
- `configIds`: 参数 ID，多个用逗号分隔，从 [查询参数配置列表](#查询参数配置列表) 的返回结果中获取

## 刷新参数缓存

**接口**：`DELETE /system/config/refreshCache`
