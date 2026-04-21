# 参数配置管理

## 接口列表

### 1. 查询参数配置列表

**接口**: `GET /system/config/list`

**说明**: 分页查询参数配置列表

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| pageNum | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认10 |
| configName | string | 否 | 参数名称（模糊查询） |
| configKey | string | 否 | 参数键名（模糊查询） |
| configType | string | 否 | 系统内置（Y是 N否） |

**响应示例**:
```json
{
  "total": 20,
  "rows": [
    {
      "configId": 1,
      "configName": "主框架页-默认皮肤样式名称",
      "configKey": "sys.index.skinName",
      "configValue": "skin-blue",
      "configType": "Y",
      "remark": "若依系统默认皮肤"
    }
  ]
}
```

### 2. 获取参数配置详情

**接口**: `GET /system/config/{configId}`

**说明**: 根据参数ID获取详情

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configId | long | 是 | 参数ID |

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "configId": 1,
    "configName": "主框架页-默认皮肤样式名称",
    "configKey": "sys.index.skinName",
    "configValue": "skin-blue",
    "configType": "Y"
  }
}
```

### 3. 根据键名查询参数

**接口**: `GET /system/config/configKey/{configKey}`

**说明**: 根据参数键名查询参数值

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configKey | string | 是 | 参数键名 |

**响应示例**:
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": "skin-blue"
}
```

### 4. 创建参数配置

**接口**: `POST /system/config`

**说明**: 新增参数配置

**请求体**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configName | string | 是 | 参数名称（最大100字符） |
| configKey | string | 是 | 参数键名（最大100字符） |
| configValue | string | 是 | 参数键值（最大500字符） |
| configType | string | 否 | 系统内置（Y是 N否） |
| remark | string | 否 | 备注 |

**请求示例**:
```json
{
  "configName": "用户管理-初始密码",
  "configKey": "sys.user.initPassword",
  "configValue": "123456",
  "configType": "Y",
  "remark": "初始化密码 123456"
}
```

### 5. 修改参数配置

**接口**: `PUT /system/config`

**说明**: 修改参数配置

**请求体**: 与创建相同，需包含 `configId`

### 6. 删除参数配置

**接口**: `DELETE /system/config/{configIds}`

**说明**: 删除参数配置

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configIds | string | 是 | 参数ID（多个ID用逗号分隔） |

### 7. 刷新参数缓存

**接口**: `DELETE /system/config/refreshCache`

**说明**: 刷新参数缓存

## Python 调用示例

```python
from scripts.client import create_client

api = create_client()

# 查询参数配置列表
result = api.list_configs({
    'pageNum': 1,
    'pageSize': 10,
    'configType': 'Y'
})

# 根据键名获取参数值
skin = api.get_config_by_key('sys.index.skinName')
print(skin.get('data'))  # 输出: skin-blue

# 创建参数配置
api.create_config({
    'configName': '用户管理-初始密码',
    'configKey': 'sys.user.initPassword',
    'configValue': '123456',
    'configType': 'Y',
    'remark': '初始化密码'
})

# 修改参数配置
api.update_config({
    'configId': 1,
    'configValue': 'skin-red'
})

# 删除参数配置
api.delete_config('1,2,3')

# 刷新缓存
api.refresh_config_cache()
```

## 命令行使用

```bash
# 查询参数配置列表
python3 scripts/client.py list-configs --params '{"pageNum":1,"pageSize":10}'

# 获取参数详情
python3 scripts/client.py get-config --id 1

# 根据键名获取参数值
python3 scripts/client.py get-config-by-key --config-key sys.index.skinName

# 创建参数配置
python3 scripts/client.py create-config --data '{"configName":"测试参数","configKey":"test.key","configValue":"test_value"}'

# 修改参数配置
python3 scripts/client.py update-config --data '{"configId":1,"configValue":"new_value"}'

# 删除参数配置
python3 scripts/client.py delete-config --id 1
```

## 数据结构 (SysConfig)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| configId | long | 否（创建时） | 参数ID |
| configName | string | 是 | 参数名称（最大100字符） |
| configKey | string | 是 | 参数键名（最大100字符） |
| configValue | string | 是 | 参数键值（最大500字符） |
| configType | string | 否 | 系统内置（Y是 N否） |
| remark | string | 否 | 备注 |
| createBy | string | 否 | 创建者 |
| createTime | datetime | 否 | 创建时间 |
| updateBy | string | 否 | 更新者 |
| updateTime | datetime | 否 | 更新时间 |

## 常见系统参数

以下是一些常见的若依系统参数（仅供参考）：

| 参数键名 | 说明 | 默认值 |
|---------|------|--------|
| sys.user.initPassword | 用户管理-初始密码 | 123456 |
| sys.user.passwordUpdateTime | 用户管理-密码更新周期 | 0 |
| sys.index.skinName | 主框架页-默认皮肤样式名称 | skin-blue |
| sys.user.initPassword | 用户管理-初始密码 | 123456 |
| sys.account.captchaEnabled | 账户自助-验证码开关 | true |
| sys.account.registerUser | 账户自助-用户注册开关 | false |
