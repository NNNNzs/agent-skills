# ruoyi-api 技能更新日志

## 2026-04-21 - 新增字典和参数配置管理

### 新增功能

#### 1. 字典类型管理
- ✅ 查询字典类型列表（支持分页、模糊搜索）
- ✅ 获取字典类型详情
- ✅ 创建字典类型（支持验证规则）
- ✅ 修改字典类型
- ✅ 删除字典类型（支持批量）
- ✅ 刷新字典缓存

#### 2. 字典数据管理
- ✅ 查询字典数据列表（支持分页、筛选）
- ✅ 根据字典类型获取数据（不分页）
- ✅ 获取字典数据详情
- ✅ 创建字典数据
- ✅ 修改字典数据
- ✅ 删除字典数据（支持批量）

#### 3. 参数配置管理
- ✅ 查询参数配置列表（支持分页、筛选）
- ✅ 获取参数配置详情
- ✅ 根据键名获取参数值
- ✅ 创建参数配置
- ✅ 修改参数配置
- ✅ 删除参数配置（支持批量）
- ✅ 刷新参数缓存

### 新增文档

- `references/dict-type.md` - 字典类型管理 API 文档
- `references/dict-data.md` - 字典数据管理 API 文档
- `references/config.md` - 参数配置管理 API 文档

### 使用示例

#### Python API 调用

```python
from scripts.client import create_client

api = create_client()

# 字典类型管理
api.list_dict_types({'pageNum': 1, 'pageSize': 10})
api.create_dict_type({'dictName': '用户状态', 'dictType': 'sys_user_status'})
api.update_dict_type({'dictId': 1, 'dictName': '用户性别'})
api.delete_dict_type('1,2,3')
api.refresh_dict_cache()

# 字典数据管理
api.list_dict_data({'dictType': 'sys_user_sex'})
api.get_dict_data_by_type('sys_user_sex')
api.create_dict_data({'dictSort': 1, 'dictLabel': '正常', 'dictValue': '0', 'dictType': 'sys_user_status'})
api.update_dict_data({'dictCode': 1, 'dictLabel': '男'})
api.delete_dict_data('1,2,3')

# 参数配置管理
api.list_configs({'pageNum': 1, 'pageSize': 10})
api.get_config_by_key('sys.index.skinName')
api.create_config({'configName': '测试参数', 'configKey': 'test.key', 'configValue': 'test_value'})
api.update_config({'configId': 1, 'configValue': 'new_value'})
api.delete_config('1,2,3')
api.refresh_config_cache()
```

#### 命令行调用

```bash
# 字典类型
python3 scripts/client.py list-dict-types --params '{"pageNum":1}'
python3 scripts/client.py create-dict-type --data '{"dictName":"用户状态","dictType":"sys_user_status"}'

# 字典数据
python3 scripts/client.py list-dict-data --params '{"dictType":"sys_user_sex"}'
python3 scripts/client.py create-dict-data --data '{"dictSort":1,"dictLabel":"正常","dictValue":"0","dictType":"sys_user_status"}'

# 参数配置
python3 scripts/client.py list-configs --params '{"pageNum":1}'
python3 scripts/client.py get-config-by-key --config-key sys.index.skinName
```

### 数据结构说明

#### SysDictType（字典类型）
- dictId: 字典ID
- dictName: 字典名称（必填）
- dictType: 字典类型（必填，小写字母开头，只能包含小写字母、数字、下划线）
- status: 状态（0正常 1停用）
- remark: 备注

#### SysDictData（字典数据）
- dictCode: 字典编码
- dictSort: 排序
- dictLabel: 字典标签（必填）
- dictValue: 字典键值（必填）
- dictType: 字典类型（必填）
- cssClass: CSS样式
- listClass: 回显样式（primary/success/info/warning/danger）
- isDefault: 是否默认（Y是 N否）
- status: 状态（0正常 1停用）
- remark: 备注

#### SysConfig（参数配置）
- configId: 参数ID
- configName: 参数名称（必填）
- configKey: 参数键名（必填）
- configValue: 参数键值（必填）
- configType: 系统内置（Y是 N否）
- remark: 备注

### API 来源

所有接口信息来自若依系统官方 OpenAPI 文档：
- http://localhost:3700/v3/api-docs/system

通过 openapi-explorer 技能解析获取。
