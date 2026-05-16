# HA Event Entity Data Structure Patterns

## Critical: event entities ≠ state entities

HA event entities (e.g. `event.loock_*_lock_event_*`) have fundamentally different data shapes than state entities. Confusing them causes silent logic failures.

### State is always a timestamp

```json
{
  "state": "2026-05-16T01:15:08.405+00:00",  // ISO timestamp, NOT an action string
  "attributes": {
    "锁动作": 1,       // actual action lives here
    "操作方式": 16,
    "操作ID": 0
  }
}
```

**Pitfall:** Setting `ifState: "unlock"` on a `server-state-changed` node for an event entity **will never trigger** because state is a timestamp. Filter by attributes in a function node instead.

### server-state-changed `outputProperties` mapping

| Property | `valueType` | What you get |
|----------|-------------|--------------|
| `entityState` | `msg.payload` | The state string (timestamp for events) |
| `eventData` | `msg.data` | The **attributes** object (NOT `event.data`) |
| `lastUpdated` | `msg.last_updated` | ISO timestamp string |

⚠️ `eventData` maps to `attributes`, not some nested `data` key. In function nodes, access via `msg.data`.

## 小米/鹿客智能门锁 event entity attribute keys

These locks use Chinese attribute names (translated by the HA integration):

| Attribute | Type | Meaning |
|-----------|------|---------|
| `锁动作` | int | 1 = unlock, 2 = lock |
| `操作方式` | int | Method code (fingerprint, password, etc.) |
| `操作ID` | int | User ID slot |
| `操作位置` | int | Lock position/slot |
| `当前时间` | int | Unix timestamp of the event |
| `event_type` | str | Event type string ("锁事件") |
| `event_types` | array | All event types this entity tracks |

## Common mistakes in Node-RED flows

### 1. Wrong trigger filter
```js
// ❌ BROKEN: event state is a timestamp, never equals "unlock"
ifState: "unlock"

// ✅ CORRECT: No ifState filter, use function node to check attributes
// In function node:
const lockAction = msg.data?.['锁动作'];
if (lockAction !== 1) return null;  // 1 = unlock
```

### 2. Wrong field names for user identification
```js
// ❌ BROKEN: English field names don't exist on these events
const userId = eventData.user_id || eventData.userId;

// ✅ CORRECT: Use Chinese attribute keys
const userId = msg.data?.['操作ID'];
const lockAction = msg.data?.['锁动作'];
```

### 3. Wrong history filtering
```js
// ❌ BROKEN: history state is also a timestamp
eventState === 'unlock'

// ✅ CORRECT: Check attributes in history records
history.filter(e => (e.attributes?.['锁动作'] ?? e.data?.['锁动作']) === 1)
```

### 4. Wrong data access in history records
`api-get-history` returns records where event data is in `state.attributes` (or `attributes` at the top level of each record), NOT in `event.data`.

## Debugging tip

To inspect live event structure, use a `server-state-changed` → `function` (JSON stringify) → `debug` pattern:
```js
node.warn('=== Event data ===');
node.warn(JSON.stringify(msg.data, null, 2));
```
