#!/usr/bin/env python3
"""
若依系统 API 客户端
支持直接调用若依系统的管理接口
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import urllib.request
import urllib.error
import urllib.parse


class RuoyiClient:
    """若依系统 API 客户端"""

    def __init__(self, config_path: str = None):
        self.config = self._load_config(config_path)
        self.base_url = self.config.get('baseUrl', 'http://localhost:3700')
        self.token = self.config.get('token', '')
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def _load_config(self, config_path: str = None) -> Dict:
        """加载配置文件"""
        # 优先从环境变量读取
        base_url = os.getenv('RUOYI_BASE_URL')
        token = os.getenv('RUOYI_TOKEN')

        if base_url and token:
            return {'baseUrl': base_url, 'token': token}

        # 从 .env 文件读取
        env_file = Path.cwd() / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('RUOYI_BASE_URL='):
                        base_url = line.split('=', 1)[1].strip()
                    elif line.startswith('RUOYI_TOKEN='):
                        token = line.split('=', 1)[1].strip()
            if base_url and token:
                return {'baseUrl': base_url, 'token': token}

        raise FileNotFoundError(
            "找不到若依配置。请在项目根目录创建 .env 文件：\n"
            "RUOYI_BASE_URL=http://localhost:3700\n"
            "RUOYI_TOKEN=your_bearer_token_here\n\n"
                '  "baseUrl": "http://localhost:3700",\n'
                '  "token": "your_bearer_token_here"\n'
                '}'
            )

        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _request(self, method: str, path: str, data: Any = None, params: Dict = None) -> Dict:
        """发送 HTTP 请求"""
        url = f"{self.base_url}{path}"

        # 构建查询参数
        if params:
            query_string = urllib.parse.urlencode(params)
            url = f"{url}?{query_string}"

        # 准备请求
        req_data = None
        if data is not None:
            req_data = json.dumps(data).encode('utf-8')

        req = urllib.request.Request(
            url,
            data=req_data,
            headers=self.headers,
            method=method.upper()
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data) if response_data else {}
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            return {
                'error': True,
                'status': e.code,
                'message': error_msg
            }
        except Exception as e:
            return {
                'error': True,
                'message': str(e)
            }

    def get(self, path: str, params: Dict = None) -> Dict:
        """GET 请求"""
        return self._request('GET', path, params=params)

    def post(self, path: str, data: Any = None) -> Dict:
        """POST 请求"""
        return self._request('POST', path, data=data)

    def put(self, path: str, data: Any = None) -> Dict:
        """PUT 请求"""
        return self._request('PUT', path, data=data)

    def delete(self, path: str) -> Dict:
        """DELETE 请求"""
        return self._request('DELETE', path)


class RuoyiAPI:
    """若依系统 API 操作"""

    def __init__(self, client: RuoyiClient):
        self.client = client

    # ==================== 用户管理 ====================

    def list_users(self, params: Dict = None) -> Dict:
        """查询用户列表"""
        return self.client.get('/system/user/list', params)

    def get_user(self, user_id: int) -> Dict:
        """获取用户详情"""
        return self.client.get(f'/system/user/{user_id}')

    def create_user(self, user_data: Dict) -> Dict:
        """
        创建用户

        参数示例：
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
        """
        return self.client.post('/system/user', user_data)

    def update_user(self, user_data: Dict) -> Dict:
        """更新用户信息"""
        return self.client.put('/system/user', user_data)

    def delete_user(self, user_ids: str) -> Dict:
        """删除用户（多个ID用逗号分隔）"""
        return self.client.delete(f'/system/user/{user_ids}')

    def reset_password(self, user_id: int, password: str) -> Dict:
        """重置用户密码"""
        return self.client.put('/system/user/resetPwd', {
            'userId': user_id,
            'password': password
        })

    def change_user_status(self, user_id: int, status: str) -> Dict:
        """修改用户状态（0正常 1停用）"""
        return self.client.put('/system/user/changeStatus', {
            'userId': user_id,
            'status': status
        })

    # ==================== 角色管理 ====================

    def list_roles(self, params: Dict = None) -> Dict:
        """查询角色列表"""
        return self.client.get('/system/role/list', params)

    def get_role(self, role_id: int) -> Dict:
        """获取角色详情"""
        return self.client.get(f'/system/role/{role_id}')

    def create_role(self, role_data: Dict) -> Dict:
        """
        创建角色

        参数示例：
        {
            "roleName": "测试角色",
            "roleKey": "test",
            "roleSort": 10,
            "status": "0",
            "remark": "测试角色描述"
        }
        """
        return self.client.post('/system/role', role_data)

    def update_role(self, role_data: Dict) -> Dict:
        """更新角色信息"""
        return self.client.put('/system/role', role_data)

    def delete_role(self, role_ids: str) -> Dict:
        """删除角色"""
        return self.client.delete(f'/system/role/{role_ids}')

    def change_role_status(self, role_id: int, status: str) -> Dict:
        """修改角色状态"""
        return self.client.put('/system/role/changeStatus', {
            'roleId': role_id,
            'status': status
        })

    def update_data_scope(self, role_id: int, data_scope: str, dept_ids: List[int] = None) -> Dict:
        """修改角色数据权限"""
        data = {
            'roleId': role_id,
            'dataScope': data_scope
        }
        if dept_ids:
            data['deptIds'] = dept_ids
        return self.client.put('/system/role/dataScope', data)

    # ==================== 菜单管理 ====================

    def list_menus(self, params: Dict = None) -> Dict:
        """查询菜单列表"""
        return self.client.get('/system/menu/list', params)

    def get_menu(self, menu_id: int) -> Dict:
        """获取菜单详情"""
        return self.client.get(f'/system/menu/{menu_id}')

    def create_menu(self, menu_data: Dict) -> Dict:
        """
        创建菜单

        参数示例：
        {
            "menuName": "系统监控",
            "parentId": 0,
            "orderNum": 10,
            "path": "/monitor",
            "component": "monitor/index",
            "menuType": "C",
            "visible": "0",
            "status": "0"
        }
        """
        return self.client.post('/system/menu', menu_data)

    def update_menu(self, menu_data: Dict) -> Dict:
        """更新菜单信息"""
        return self.client.put('/system/menu', menu_data)

    def delete_menu(self, menu_id: int) -> Dict:
        """删除菜单"""
        return self.client.delete(f'/system/menu/{menu_id}')

    # ==================== 部门管理 ====================

    def list_depts(self, params: Dict = None) -> Dict:
        """查询部门列表"""
        return self.client.get('/system/dept/list', params)

    def get_dept(self, dept_id: int) -> Dict:
        """获取部门详情"""
        return self.client.get(f'/system/dept/{dept_id}')

    def create_dept(self, dept_data: Dict) -> Dict:
        """
        创建部门

        参数示例：
        {
            "parentId": 100,
            "deptName": "测试部门",
            "orderNum": 10,
            "leader": "张三",
            "phone": "13800138000",
            "email": "test@example.com"
        }
        """
        return self.client.post('/system/dept', dept_data)

    def update_dept(self, dept_data: Dict) -> Dict:
        """更新部门信息"""
        return self.client.put('/system/dept', dept_data)

    def delete_dept(self, dept_id: int) -> Dict:
        """删除部门"""
        return self.client.delete(f'/system/dept/{dept_id}')

    # ==================== 岗位管理 ====================

    def list_posts(self, params: Dict = None) -> Dict:
        """查询岗位列表"""
        return self.client.get('/system/post/list', params)

    def create_post(self, post_data: Dict) -> Dict:
        """创建岗位"""
        return self.client.post('/system/post', post_data)

    def update_post(self, post_data: Dict) -> Dict:
        """更新岗位信息"""
        return self.client.put('/system/post', post_data)

    def delete_post(self, post_ids: str) -> Dict:
        """删除岗位"""
        return self.client.delete(f'/system/post/{post_ids}')

    # ==================== 字典类型管理 ====================

    def list_dict_types(self, params: Dict = None) -> Dict:
        """
        查询字典类型列表

        参数示例：
        {
            "pageNum": 1,
            "pageSize": 10,
            "dictName": "状态",  # 可选，字典名称
            "dictType": "sys_status",  # 可选，字典类型
            "status": "0"  # 可选，状态（0正常 1停用）
        }
        """
        return self.client.get('/system/dict/type/list', params)

    def get_dict_type(self, dict_id: int) -> Dict:
        """获取字典类型详情"""
        return self.client.get(f'/system/dict/type/{dict_id}')

    def create_dict_type(self, dict_data: Dict) -> Dict:
        """
        创建字典类型

        参数示例：
        {
            "dictName": "用户状态",
            "dictType": "sys_user_status",
            "status": "0",
            "remark": "用户状态列表"
        }

        字典类型命名规范：以小写字母开头，只能包含小写字母、数字、下划线
        """
        return self.client.post('/system/dict/type', dict_data)

    def update_dict_type(self, dict_data: Dict) -> Dict:
        """更新字典类型"""
        return self.client.put('/system/dict/type', dict_data)

    def delete_dict_type(self, dict_ids: str) -> Dict:
        """删除字典类型（多个ID用逗号分隔）"""
        return self.client.delete(f'/system/dict/type/{dict_ids}')

    def refresh_dict_cache(self) -> Dict:
        """刷新字典缓存"""
        return self.client.delete('/system/dict/type/refreshCache')

    # ==================== 字典数据管理 ====================

    def list_dict_data(self, params: Dict = None) -> Dict:
        """
        查询字典数据列表

        参数示例：
        {
            "pageNum": 1,
            "pageSize": 10,
            "dictType": "sys_user_status",  # 字典类型
            "dictLabel": "正常"  # 可选，字典标签
        }
        """
        return self.client.get('/system/dict/data/list', params)

    def get_dict_data_by_type(self, dict_type: str) -> Dict:
        """根据字典类型查询字典数据（返回所有数据，不分页）"""
        return self.client.get(f'/system/dict/data/type/{dict_type}')

    def get_dict_data(self, dict_code: int) -> Dict:
        """获取字典数据详情"""
        return self.client.get(f'/system/dict/data/{dict_code}')

    def create_dict_data(self, dict_data: Dict) -> Dict:
        """
        创建字典数据

        参数示例：
        {
            "dictSort": 1,
            "dictLabel": "正常",
            "dictValue": "0",
            "dictType": "sys_user_status",
            "cssClass": "",
            "listClass": "primary",
            "isDefault": "Y",
            "status": "0",
            "remark": "正常状态"
        }
        """
        return self.client.post('/system/dict/data', dict_data)

    def update_dict_data(self, dict_data: Dict) -> Dict:
        """更新字典数据"""
        return self.client.put('/system/dict/data', dict_data)

    def delete_dict_data(self, dict_codes: str) -> Dict:
        """删除字典数据（多个ID用逗号分隔）"""
        return self.client.delete(f'/system/dict/data/{dict_codes}')

    # ==================== 参数配置管理 ====================

    def list_configs(self, params: Dict = None) -> Dict:
        """
        查询参数配置列表

        参数示例：
        {
            "pageNum": 1,
            "pageSize": 10,
            "configName": "主框架",  # 可选，参数名称
            "configKey": "sys.index",  # 可选，参数键名
            "configType": "Y"  # 可选，系统内置（Y是 N否）
        }
        """
        return self.client.get('/system/config/list', params)

    def get_config(self, config_id: int) -> Dict:
        """获取参数配置详情"""
        return self.client.get(f'/system/config/{config_id}')

    def get_config_by_key(self, config_key: str) -> Dict:
        """根据参数键名查询参数值"""
        return self.client.get(f'/system/config/configKey/{config_key}')

    def create_config(self, config_data: Dict) -> Dict:
        """
        创建参数配置

        参数示例：
        {
            "configName": "主框架页-默认皮肤样式名称",
            "configKey": "sys.index.skinName",
            "configValue": "skin-blue",
            "configType": "Y",
            "remark": "若依系统默认皮肤"
        }
        """
        return self.client.post('/system/config', config_data)

    def update_config(self, config_data: Dict) -> Dict:
        """更新参数配置"""
        return self.client.put('/system/config', config_data)

    def delete_config(self, config_ids: str) -> Dict:
        """删除参数配置（多个ID用逗号分隔）"""
        return self.client.delete(f'/system/config/{config_ids}')

    def refresh_config_cache(self) -> Dict:
        """刷新参数缓存"""
        return self.client.delete('/system/config/refreshCache')


def create_client(config_path: str = None) -> RuoyiAPI:
    """创建 API 客户端"""
    client = RuoyiClient(config_path)
    return RuoyiAPI(client)


def main():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(description='若依系统 API 客户端')
    parser.add_argument('action', help='操作类型', choices=[
        'list-users', 'get-user', 'create-user', 'delete-user',
        'list-roles', 'get-role', 'create-role', 'delete-role',
        'list-menus', 'get-menu', 'create-menu', 'delete-menu',
        'list-depts', 'get-dept', 'create-dept', 'delete-dept',
        'list-dict-types', 'get-dict-type', 'create-dict-type', 'update-dict-type', 'delete-dict-type',
        'list-dict-data', 'get-dict-data', 'create-dict-data', 'update-dict-data', 'delete-dict-data',
        'list-configs', 'get-config', 'get-config-by-key', 'create-config', 'update-config', 'delete-config'
    ])
    parser.add_argument('--config', '-c', help='配置文件路径')
    parser.add_argument('--id', type=int, help='ID')
    parser.add_argument('--data', '-d', help='JSON 数据')
    parser.add_argument('--params', '-p', help='查询参数')

    args = parser.parse_args()

    try:
        api = create_client(args.config)
        result = None

        # 解析 JSON 参数
        data = json.loads(args.data) if args.data else None
        params = json.loads(args.params) if args.params else None

        # 执行操作
        if args.action == 'list-users':
            result = api.list_users(params)
        elif args.action == 'get-user' and args.id:
            result = api.get_user(args.id)
        elif args.action == 'create-user' and data:
            result = api.create_user(data)
        elif args.action == 'delete-user' and args.id:
            result = api.delete_user(str(args.id))
        elif args.action == 'list-roles':
            result = api.list_roles(params)
        elif args.action == 'get-role' and args.id:
            result = api.get_role(args.id)
        elif args.action == 'create-role' and data:
            result = api.create_role(data)
        elif args.action == 'delete-role' and args.id:
            result = api.delete_role(str(args.id))
        elif args.action == 'list-menus':
            result = api.list_menus(params)
        elif args.action == 'get-menu' and args.id:
            result = api.get_menu(args.id)
        elif args.action == 'create-menu' and data:
            result = api.create_menu(data)
        elif args.action == 'delete-menu' and args.id:
            result = api.delete_menu(args.id)
        elif args.action == 'list-depts':
            result = api.list_depts(params)
        elif args.action == 'get-dept' and args.id:
            result = api.get_dept(args.id)
        elif args.action == 'create-dept' and data:
            result = api.create_dept(data)
        elif args.action == 'delete-dept' and args.id:
            result = api.delete_dept(args.id)
        # 字典类型管理
        elif args.action == 'list-dict-types':
            result = api.list_dict_types(params)
        elif args.action == 'get-dict-type' and args.id:
            result = api.get_dict_type(args.id)
        elif args.action == 'create-dict-type' and data:
            result = api.create_dict_type(data)
        elif args.action == 'update-dict-type' and data:
            result = api.update_dict_type(data)
        elif args.action == 'delete-dict-type' and args.id:
            result = api.delete_dict_type(str(args.id))
        # 字典数据管理
        elif args.action == 'list-dict-data':
            result = api.list_dict_data(params)
        elif args.action == 'get-dict-data' and args.id:
            result = api.get_dict_data(args.id)
        elif args.action == 'create-dict-data' and data:
            result = api.create_dict_data(data)
        elif args.action == 'update-dict-data' and data:
            result = api.update_dict_data(data)
        elif args.action == 'delete-dict-data' and args.id:
            result = api.delete_dict_data(str(args.id))
        # 参数配置管理
        elif args.action == 'list-configs':
            result = api.list_configs(params)
        elif args.action == 'get-config' and args.id:
            result = api.get_config(args.id)
        elif args.action == 'create-config' and data:
            result = api.create_config(data)
        elif args.action == 'update-config' and data:
            result = api.update_config(data)
        elif args.action == 'delete-config' and args.id:
            result = api.delete_config(str(args.id))

        if result:
            print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
