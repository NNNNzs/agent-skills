---
name: node-red
description: 编辑、分析、创建 Node-RED 流程，通过操作 flows.json 文件、理解节点类型和应用 Node-RED 最佳实践。当用户提到 Node-RED、flows.json、流程开发或需要修改 Node-RED 配置时激活。触发词："Node-RED"、"flows.json"、"流程开发"、"部署流程"、"MQTT"、"HTTP API"。
license: MIT
metadata:
  author: NNNNzs
  version: "1.0.0"
---
# Node-RED Flow Development

This skill provides comprehensive support for Node-RED development, including flow creation, modification, validation, and deployment through the Admin API.

## When to Use This Skill

Use this skill when:
- Creating or modifying Node-RED flows (flows.json files)
- Building MQTT, HTTP API, or data pipeline integrations
- Debugging or validating flow configurations
- Working with function nodes and context storage
- Deploying flows via the Node-RED Admin API
- Converting requirements into Node-RED flow implementations

## Available Resources

### Scripts (scripts/)

Execute these Python scripts for common Node-RED operations:

#### Reading & Analysis

- **read_flow.py** - Read and analyze flow files
  ```bash
  python scripts/read_flow.py <flow.json> --summary
  python scripts/read_flow.py <flow.json> --node <id>
  python scripts/read_flow.py <flow.json> --type <type>
  ```

#### Creation & Modification

- **create_flow.py** - Create new flows or add nodes to existing flows
  ```bash
  python scripts/create_flow.py --new --name <flow_name> --output flows.json
  python scripts/create_flow.py --template <simple|mqtt|http> --output flows.json
  python scripts/create_flow.py --add --type <type> --tab <tab_id> --name <name> --input flows.json
  ```

- **modify_flow.py** - Modify existing flow properties
  ```bash
  python scripts/modify_flow.py <flow.json> --node <id> --rename <new_name>
  python scripts/modify_flow.py <flow.json> --node <id> --property <prop> --value <val>
  python scripts/modify_flow.py <flow.json> --node <id> --move <x>,<y>
  python scripts/modify_flow.py <flow.json> --node <id> --disable
  python scripts/modify_flow.py <flow.json> --tab <tab_id> --label <new_label>
  ```

#### Batch Operations

- **batch_nodes.py** - Perform batch operations on multiple nodes
  ```bash
  python scripts/batch_nodes.py <flow.json> --find --type <type> --list
  python scripts/batch_nodes.py <flow.json> --enable --type <type>
  python scripts/batch_nodes.py <flow.json> --delete --type <type>
  python scripts/batch_nodes.py <flow.json> --rename --type <type> --prefix "New - "
  python scripts/batch_nodes.py <flow.json> --export --type <type> --output export.json
  ```

#### Validation & Deployment

- **validate_flow.py** - Validate flow JSON structure and wire connections
  ```bash
  python scripts/validate_flow.py <flow.json>
  ```

- **deploy_flow.py** - Deploy flows via Node-RED Admin API
  ```bash
  python scripts/deploy_flow.py --url http://localhost:1880 --get --save backup.json
  python scripts/deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json
  python scripts/deploy_flow.py --url http://localhost:1880 --validate --flows flows.json
  ```

#### Utilities

- **generate_uuid.py** - Generate valid Node-RED node IDs
  ```bash
  python scripts/generate_uuid.py [count]
  ```

- **wire_nodes.py** - Connect nodes programmatically
  ```bash
  python scripts/wire_nodes.py <flow.json> <source_id> <target_id> [output_port]
  ```

- **create_flow_template.py** - Generate boilerplate flows
  ```bash
  python scripts/create_flow_template.py <mqtt|http-api|data-pipeline|error-handler> [output.json]
  ```

### References (references/)

Consult these detailed references as needed:

- **node_schemas.md** - Complete schemas for all Node-RED node types
- **api_reference.md** - Node-RED Admin API documentation with examples
- **function_snippets.md** - Reusable function node code patterns

### Assets (assets/)

Use these templates and boilerplate files:

- **templates/mqtt_flow.json** - Complete MQTT pub/sub flow with error handling
- **templates/http_api_flow.json** - REST API with CRUD operations and authentication
- **boilerplate/function_async.js** - Async function node patterns
- **boilerplate/function_context.js** - Context storage examples

## Core Workflow

### Creating a New Flow

**Quick creation with scripts:**
1. Create a new flow from scratch or template
   ```bash
   python scripts/create_flow.py --new --name "My Flow" --output flows.json
   python scripts/create_flow.py --template mqtt --output flows.json
   ```
2. Add nodes to the flow as needed
   ```bash
   python scripts/create_flow.py --add --type inject --tab <tab_id> --name "Input" --input flows.json
   ```
3. Validate the flow
   ```bash
   python scripts/validate_flow.py flows.json
   ```
4. Deploy to Node-RED
   ```bash
   python scripts/deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json
   ```

**Or use traditional method:**
1. Determine the flow type needed (MQTT, HTTP API, data processing, etc.)
2. Generate a template using `scripts/create_flow_template.py`
3. Modify the template to match requirements
4. Validate the flow using `scripts/validate_flow.py`
5. Deploy via Admin API or save as flows.json

### Reading and Analyzing Flows

Use `read_flow.py` to inspect flow structure:

```bash
# Get flow summary
python scripts/read_flow.py flows.json --summary

# Read specific node
python scripts/read_flow.py flows.json --node <node_id>

# Find all nodes of a type
python scripts/read_flow.py flows.json --type "mqtt in"

# List all nodes in a tab
python scripts/read_flow.py flows.json --tab <tab_id>
```

### Modifying Existing Flows

**Single node modifications:**
1. Read the flow to find node IDs
   ```bash
   python scripts/read_flow.py flows.json --summary
   ```
2. Modify node properties
   ```bash
   # Rename a node
   python scripts/modify_flow.py flows.json --node <id> --rename "New Name"
   
   # Move a node
   python scripts/modify_flow.py flows.json --node <id> --move 200,300
   
   # Set a property
   python scripts/modify_flow.py flows.json --node <id> --property func --value "return msg;"
   
   # Disable/enable a node
   python scripts/modify_flow.py flows.json --node <id> --disable
   ```
3. Validate changes
   ```bash
   python scripts/validate_flow.py flows.json
   ```
4. Deploy
   ```bash
   python scripts/deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json
   ```

**Batch modifications:**
```bash
# Find all debug nodes
python scripts/batch_nodes.py flows.json --find --type debug --list

# Enable all mqtt in nodes
python scripts/batch_nodes.py flows.json --enable --type "mqtt in"

# Rename all function nodes with a prefix
python scripts/batch_nodes.py flows.json --rename --type function --prefix "Updated - "

# Delete all comment nodes
python scripts/batch_nodes.py flows.json --delete --type comment
```

### Working with Function Nodes

For function nodes, reference:
- `assets/boilerplate/function_async.js` for async operations
- `assets/boilerplate/function_context.js` for context storage
- `references/function_snippets.md` for specific patterns

Available objects in function nodes:
- `msg` - Message object
- `node` - Node API (send, done, error, warn, log, status)
- `context` - Node-scoped storage
- `flow` - Flow-scoped storage
- `global` - Global storage
- `RED` - Runtime API
- `env` - Environment variables

### Deploying Flows

To deploy flows via the Admin API:

1. Retrieve current configuration:
   ```bash
   GET /flows
   ```

2. Modify the configuration as needed

3. Deploy with appropriate deployment type:
   ```bash
   POST /flows
   Headers: Node-RED-Deployment-Type: full|nodes|flows|reload
   ```

4. Verify deployment success

## Common Patterns

### Message Flow Structure

Every Node-RED message follows this pattern:
- Primary data in `msg.payload`
- Topic/category in `msg.topic`
- Unique ID in `msg._msgid`
- Additional properties as needed

### Error Handling

Implement error handling using:
1. Try-catch blocks in function nodes
2. Catch nodes to intercept errors
3. Status nodes to monitor node states
4. Dedicated error output wires

### Environment Variables

Use environment variables for configuration:
- In node properties: `$(ENV_VAR_NAME)`
- In function nodes: `env.get("ENV_VAR_NAME")`
- Via Docker: `-e KEY=value`

### Context Storage Levels

Choose appropriate context level:
- **Node context**: Local to single node
- **Flow context**: Shared within flow/tab
- **Global context**: System-wide sharing
- **Persistent**: Survives restarts (configure in settings.js)

## Validation Checklist

Before deploying flows, verify:
- [ ] JSON syntax is valid
- [ ] All wire connections reference existing node IDs
- [ ] Tab references (`z` property) are correct
- [ ] Function node JavaScript is syntactically valid
- [ ] Required configuration nodes exist (MQTT brokers, etc.)
- [ ] Environment variables are properly referenced
- [ ] Error handling is implemented

## Quick Commands

### Reading & Analysis
```bash
# Get flow summary
python scripts/read_flow.py flows.json --summary

# Find all MQTT nodes
python scripts/read_flow.py flows.json --type "mqtt in"

# Find nodes by name pattern
python scripts/batch_nodes.py flows.json --find --name "sensor" --list
```

### Creation
```bash
# Create new flow
python scripts/create_flow.py --new --name "My Flow" --output flows.json

# Create from template
python scripts/create_flow.py --template mqtt --output flows.json

# Add a node to existing flow
python scripts/create_flow.py --add --type inject --tab <tab_id> --name "Test" --input flows.json
```

### Modification
```bash
# Rename a node
python scripts/modify_flow.py flows.json --node <id> --rename "New Name"

# Move a node
python scripts/modify_flow.py flows.json --node <id> --move 200,300

# Disable all debug nodes
python scripts/batch_nodes.py flows.json --disable --type debug

# Delete all comment nodes
python scripts/batch_nodes.py flows.json --delete --type comment
```

### Validation & Deployment
```bash
# Validate locally
python scripts/validate_flow.py flows.json

# Validate against running instance
python scripts/deploy_flow.py --url http://localhost:1880 --validate --flows flows.json

# Deploy to Node-RED
python scripts/deploy_flow.py --url http://localhost:1880 --deploy --flows flows.json

# Backup current flows
python scripts/deploy_flow.py --url http://localhost:1880 --get --save backup.json
```

### Utilities
```bash
# Generate UUIDs
python scripts/generate_uuid.py 5

# Wire nodes together
python scripts/wire_nodes.py flows.json inject-node-id debug-node-id

# Create template
python scripts/create_flow_template.py mqtt my-mqtt-flow.json
```

## Node-RED Configuration

### Default File Locations
- Flows: `~/.node-red/flows_<hostname>.json`
- Settings: `~/.node-red/settings.js`
- Custom nodes: `~/.node-red/node_modules/`

### Running Node-RED
- Normal mode: `node-red`
- Safe mode (no flow execution): `node-red --safe`
- Custom flow file: `node-red myflows.json`

## Best Practices

1. **Use appropriate node types**: Prefer change nodes over function nodes for simple transformations
2. **Implement error handling**: Always include catch nodes for critical paths
3. **Document flows**: Use comment nodes and node descriptions
4. **Organize with tabs**: Separate flows by logical function or system
5. **Version control**: Store flows.json in git with meaningful commit messages
6. **Test incrementally**: Deploy and test small changes frequently
7. **Monitor performance**: Use status nodes and debug output wisely
8. **Use scripts for automation**: Leverage the Python scripts for repetitive tasks
9. **Backup before deployment**: Always get current flows before deploying changes
10. **Validate locally first**: Use `validate_flow.py` before deploying to running instance

## Troubleshooting

For common issues:
- **Invalid JSON**: Use `scripts/validate_flow.py` to find syntax errors
- **Broken wires**: Check that all wired node IDs exist
- **Missing configurations**: Ensure broker/server configs are included
- **Function errors**: Test JavaScript in isolation first
- **API deployment fails**: Verify authentication and check revision conflicts
- **Can't find a node**: Use `read_flow.py --summary` to see all nodes and their types
- **Batch operation didn't work**: Check that your type/name pattern matches exactly what's in the flow

## Additional Resources

For detailed specifications and examples:
- Consult `references/node_schemas.md` for node property details
- Review `references/api_reference.md` for API operations
- Use `references/function_snippets.md` for tested code patterns
- Copy templates from `assets/templates/` as starting points