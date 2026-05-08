# Node-RED Admin API Reference

## Authentication

```bash
# Basic Auth
curl -u admin:password http://localhost:1880/flows
# Bearer Token
curl -H "Authorization: Bearer <token>" http://localhost:1880/flows
```

## Flow Management

### GET /flows
获取所有流程。返回：`{"flows": [...], "rev": "abc123"}`

### POST /flows
部署流程。Header: `Node-RED-Deployment-Type: full|nodes|flows|reload`
```json
{"flows": [...], "rev": "abc123"}  // rev 可选，用于冲突检测
```

### POST /flow
添加新流程/tab。`{"id": "optional-id", "label": "Flow Name"}`

### GET /flow/:id
### PUT /flow/:id
### DELETE /flow/:id — 返回 `{"removed": ["node-id-1", ...]}`

## Node Management

### GET /nodes — 列出所有已安装节点
### POST /nodes — 安装节点模块 `{"module": "node-red-contrib-example"}`
### DELETE /nodes/:module — 卸载

## Context Store

### GET /context/:scope — 获取 context 数据
- `global`、`flow/:flowId`、`node/:nodeId`
- Query: `?store=file`（指定 store）

### GET /context/:scope/:key
### DELETE /context/:scope/:key

## Authentication Endpoints

### POST /auth/token
```json
{"client_id": "node-red-editor", "grant_type": "password", "username": "admin", "password": "pass", "scope": "read write"}
// 返回 {"access_token": "...", "expires_in": 604800}
```

## Execution Control

### POST /inject/:nodeId — 触发 inject 节点
### GET /diagnostics — 系统诊断信息

## Error Responses

```json
{"code": "error_code", "message": "...", "details": {}}
```
常见错误码：`invalid_flow`、`module_not_found`、`not_found`、`permission_denied`、`conflict`
