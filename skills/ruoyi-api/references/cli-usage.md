# 命令行使用

```bash
# 用户管理
python3 scripts/client.py list-users --params '{"pageNum":1,"pageSize":10}'
python3 scripts/client.py get-user --id 1
python3 scripts/client.py create-user --data '{"userName":"test","password":"123456","deptId":100}'
python3 scripts/client.py update-user --data '{"userId":1,"nickName":"新昵称"}'
python3 scripts/client.py delete-user --id 1
python3 scripts/client.py reset-password --id 1 --data '{"password":"new_password"}'
python3 scripts/client.py change-user-status --id 1 --data '{"status":"1"}'

# 角色管理
python3 scripts/client.py list-roles --params '{"pageNum":1}'
python3 scripts/client.py get-role --id 1
python3 scripts/client.py create-role --data '{"roleName":"测试角色","roleKey":"test","roleSort":10}'
python3 scripts/client.py update-role --data '{"roleId":1,"roleName":"新角色名"}'
python3 scripts/client.py delete-role --id 1
python3 scripts/client.py change-role-status --id 1 --data '{"status":"1"}'
python3 scripts/client.py update-data-scope --id 1 --data '{"dataScope":"2","deptIds":[100,101]}'

# 菜单管理
python3 scripts/client.py list-menus --params '{"menuType":"C"}'
python3 scripts/client.py get-menu --id 1
python3 scripts/client.py create-menu --data '{"menuName":"系统监控","parentId":0,"orderNum":10,"menuType":"C"}'
python3 scripts/client.py update-menu --data '{"menuId":1,"menuName":"新菜单名"}'
python3 scripts/client.py delete-menu --id 1
python3 scripts/client.py update-menu-sort --id 1 --data '{"orderNum":5}'

# 部门管理
python3 scripts/client.py list-depts
python3 scripts/client.py get-dept --id 1
python3 scripts/client.py create-dept --data '{"parentId":100,"deptName":"测试部门","orderNum":10}'
python3 scripts/client.py update-dept --data '{"deptId":101,"deptName":"新部门名"}'
python3 scripts/client.py delete-dept --id 1

# 岗位管理
python3 scripts/client.py list-posts --params '{"pageNum":1}'
python3 scripts/client.py get-post --id 1
python3 scripts/client.py create-post --data '{"postCode":"dev","postName":"开发工程师","postSort":1}'
python3 scripts/client.py update-post --data '{"postId":1,"postName":"高级开发"}'
python3 scripts/client.py delete-post --id 1

# 字典类型
python3 scripts/client.py list-dict-types --params '{"pageNum":1}'
python3 scripts/client.py get-dict-type --id 1
python3 scripts/client.py create-dict-type --data '{"dictName":"用户状态","dictType":"sys_user_status"}'
python3 scripts/client.py update-dict-type --data '{"dictId":1,"dictName":"用户性别"}'
python3 scripts/client.py delete-dict-type --id 1
python3 scripts/client.py refresh-dict-cache

# 字典数据
python3 scripts/client.py list-dict-data --params '{"dictType":"sys_user_sex"}'
python3 scripts/client.py get-dict-data --id 1
python3 scripts/client.py get-dict-data-by-type --id sys_user_status
python3 scripts/client.py create-dict-data --data '{"dictSort":1,"dictLabel":"正常","dictValue":"0","dictType":"sys_user_status"}'
python3 scripts/client.py update-dict-data --data '{"dictCode":1,"dictLabel":"男"}'
python3 scripts/client.py delete-dict-data --id 1

# 参数配置
python3 scripts/client.py list-configs --params '{"pageNum":1}'
python3 scripts/client.py get-config --id 1
python3 scripts/client.py get-config-by-key --id sys.index.skinName
python3 scripts/client.py create-config --data '{"configName":"测试参数","configKey":"test.key","configValue":"test_value"}'
python3 scripts/client.py update-config --data '{"configId":1,"configValue":"new_value"}'
python3 scripts/client.py delete-config --id 1
python3 scripts/client.py refresh-config-cache

# 跳过连通性验证（用于自动化脚本）
python3 scripts/client.py list-users --skip-validation
```
