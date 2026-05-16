# Home Assistant × Node-RED Integration Pitfalls

## Event Entity State is Always a Timestamp

HA `event.*` entities have `state` = ISO 8601 timestamp of the event (e.g. `"2026-05-16T03:47:09.984789+00:00"`), **NOT** the action name. Common mistake:

```json
// ❌ WRONG — this condition never matches
"ifState": "unlock"

// ✅ CORRECT — check attributes in a function node
const lockAction = msg.data.new_state.attributes["锁动作"];  // 1=unlock, 2=lock
if (lockAction === 1) { ... }
```

The `server-state-changed` node's `ifState` filter is useless for event entities — always leave it empty and filter in a function node.

## api-get-history Has a Timing Gap

When a `server-state-changed` event fires and you immediately query `api-get-history` for the same entity, the current event **may not yet be written** to HA's history database. This causes "last event" calculations to skip the trigger event itself.

**Fix:** Use `flow.set()` / `flow.get()` context to track timestamps instead of querying history. This is faster, more reliable, and works across restarts with persistent context.

```js
// Write last unlock time
const contextKey = `last_unlock_${opId}`;
const lastTime = flow.get(contextKey);
flow.set(contextKey, eventTime);
```

**Enable persistent context** in `/data/settings.js`:
```js
contextStorage: {
    default: {
        module: "localfilesystem"
    },
},
```

## Chinese Smart Lock Attribute Names (Xiaomi Aqara/Loock)

Xiaomi smart locks exposed via `xiaomi_home` integration use Chinese attribute names:

| Attribute | Meaning | Values |
|-----------|---------|--------|
| `操作ID` | User ID | Numeric (e.g. 0, 505) |
| `锁动作` | Lock action | `1` = unlock, `2` = lock |
| `操作方式` | Method | `1` = face, `2` = password, `5` = key, `16` = fingerprint |
| `操作位置` | Position | Side of door |

Auto-lock events (physical door close) may still report a non-zero `操作ID` (e.g. 501, 505) — these are system-assigned, not real users. Filter by `锁动作` only, not by `操作ID`.

## HA Entity/Area Registry File Names

- Entity registry: `core.entity_registry` (NOT `entity_registry`)
- Device registry: `core.device_registry`
- Area registry: `core.area_registry`
- Area objects use `id` field (NOT `area_id`)

## Dangerous sed on settings.js

Never use broad `sed` patterns like `s|//    },|    },|` on Node-RED `settings.js`. This uncomments ALL matching lines across the file, breaking JS syntax and crash-looping the container. Always modify settings.js via targeted line edits or full-file replacement with syntax validation (`node -c settings.js`).

## HA Camera Switch Entities (Xiaomi)

Xiaomi cameras use `switch.<model>_on_p_2_1` to turn the camera on/off. To find the right entity, check the device's area assignment in `core.device_registry` + `core.area_registry`.
