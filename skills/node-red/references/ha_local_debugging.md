# Debugging HA Data Without API Access

When Node-RED's HA integration works but you need to inspect entity/device/area data directly (e.g. to find camera entity IDs, verify user mappings, or check attribute structures).

## HA Storage Paths (fnOS / Docker)

```bash
HA_CONFIG="/vol2/1000/docker_v/homeassistant/config"
```

## Entity Registry

**Path:** `$HA_CONFIG/.storage/core.entity_registry`

```python
import json
with open(f"{HA_CONFIG}/.storage/core.entity_registry") as f:
    data = json.load(f)
for e in data['data']['entities']:
    if 'camera' in e['entity_id']:
        print(f"{e['entity_id']} | {e.get('original_name','')} | {e.get('platform','')}")
```

## Device Registry

**Path:** `$HA_CONFIG/.storage/core.device_registry`

Device fields: `id`, `name`, `name_by_user`, `model`, `manufacturer`, `area_id`

⚠️ `area_id` can be `None` for unassigned devices — handle with `d.get('area_id') or ''`.

## Area Registry

**Path:** `$HA_CONFIG/.storage/core.area_registry`

⚠️ Area ID field is `id` (not `area_id` — inconsistent with device registry):
```python
area_map = {a['id']: a['name'] for a in areas['data']['areas']}
```

## Auth & Long-Lived Access Tokens

**Path:** `$HA_CONFIG/.storage/auth`

Long-lived tokens are under `data.refresh_tokens` with `token_type: "long_lived_access_token"`.

```python
for rt in data['data']['refresh_tokens']:
    if rt.get('token_type') == 'long_lived_access_token':
        print(f"Client: {rt['client_name']}, Token: {rt['token']}")
```

⚠️ These raw tokens may not work directly as Bearer tokens — Node-RED's HA integration encrypts its own credentials in `flows_cred.json`.

## Node-RED Log Analysis for Lock Events

When debugging lock event flows, parse Node-RED logs to reconstruct event history:

```bash
docker logs nodered 2>&1 > /tmp/nodered.log
```

Then use Python to extract clean event records from `new_state` blocks — look for `"last_changed"` and nearby `操作ID`/`锁动作` attributes. Note that the logs mix `old_state` and `new_state`, so filter carefully or parse only `new_state` blocks.

## Quick: Find Camera Switch Entities

```python
# Find all camera power switches (chuangmi = xiaomi camera brand)
for e in entities:
    if 'chuangmi' in e['entity_id'] and 'on_p_2_1' in e['entity_id']:
        print(e['entity_id'])
```

Cross-reference with device registry to get area assignment.
