# Node-RED Function Node Code Snippets

完整模板见 `assets/boilerplate/function_async.js` 和 `function_context.js`，此处仅保留速查片段。

## Message Manipulation

### 多输出
```javascript
let msg1 = RED.util.cloneMessage(msg);
let msg2 = RED.util.cloneMessage(msg);
msg1.payload = "Output 1";
msg2.payload = "Output 2";
return [msg1, msg2];
```

### 条件路由
```javascript
if (msg.payload > 100) return [msg, null, null];
else if (msg.payload > 50) return [null, msg, null];
else return [null, null, msg];
```

## Asynchronous Operations

```javascript
// 简单延迟
setTimeout(() => { node.send(msg); node.done(); }, 1000);
return null;

// 异步 HTTP 请求
const https = require('https');
const data = await new Promise((resolve, reject) => {
    https.get('https://api.example.com/data', res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
});
msg.payload = data;
```

## Context Storage

```javascript
// node 级别
let count = context.get('count') || 0;
context.set('count', ++count);

// flow 级别
let shared = flow.get('sharedData') || {};
shared[msg.topic] = msg.payload;
flow.set('sharedData', shared);

// global 级别
const config = global.get('appConfig') || { apiUrl: 'https://api.example.com' };

// 持久化（需在 settings.js 配置 file store）
context.set('key', value, 'file');
```

## Error Handling

```javascript
try {
    let data = JSON.parse(msg.payload);
    return msg;
} catch (error) {
    node.error("Parse error: " + error.message, msg);
    return null;
}
```

### 带错误输出的验证
```javascript
const errors = [];
if (!msg.payload) errors.push("Payload is required");
if (errors.length > 0) {
    msg.payload = { error: true, messages: errors };
    node.error("Validation failed", msg);
    return [null, msg];
}
return [msg, null];
```

### 重试逻辑
```javascript
let retries = context.get('retries') || 0;
try {
    // operation
    context.set('retries', 0);
    return msg;
} catch (error) {
    if (++retries < 3) {
        context.set('retries', retries);
        setTimeout(() => node.send(msg), 1000 * retries);
    } else {
        node.error(`Failed after 3 attempts`, msg);
        context.set('retries', 0);
    }
    return null;
}
```

## Data Transformation

```javascript
// 数组处理
if (Array.isArray(msg.payload)) {
    msg.payload = msg.payload
        .filter(item => item.active)
        .map(item => ({ id: item.id, value: item.value * 1.1 }));
}

// CSV → JSON
const [headers, ...rows] = msg.payload.split('\n').map(l => l.split(','));
msg.payload = rows.map(r => Object.fromEntries(headers.map((h, i) => [h.trim(), r[i]?.trim()])));
```

## Time-based Operations

```javascript
// 简单限流
const last = context.get('lastTime') || 0;
if (Date.now() - last < 1000) return null;
context.set('lastTime', Date.now());

// 时间窗口聚合
let buffer = context.get('buffer') || [];
let start = context.get('windowStart') || Date.now();
buffer.push(msg.payload);
if (Date.now() - start > 5000) {
    msg.payload = { count: buffer.length, data: buffer };
    context.set('buffer', []); context.set('windowStart', Date.now());
    return msg;
}
context.set('buffer', buffer);
return null;
```

## Advanced Patterns

### 状态机
```javascript
const S = { IDLE: 'idle', PROCESSING: 'processing', ERROR: 'error', COMPLETE: 'complete' };
let state = context.get('state') || S.IDLE;
if (state === S.IDLE && msg.topic === 'start') state = S.PROCESSING;
else if (state === S.PROCESSING && msg.topic === 'complete') state = S.COMPLETE;
else if (state === S.PROCESSING && msg.topic === 'error') state = S.ERROR;
else if ((state === S.ERROR || state === S.COMPLETE) && msg.topic === 'reset') state = S.IDLE;
context.set('state', state);
msg.state = state;
return msg;
```

### 熔断器
```javascript
const CLOSED = 'closed', OPEN = 'open', HALF = 'half_open';
let st = context.get('cb') || { state: CLOSED, fails: 0, lastFail: 0 };
if (st.state === OPEN && Date.now() - st.lastFail > 60000) st.state = HALF;
if (st.state === OPEN) return [null, msg];
try {
    // operation
    if (st.state === HALF) { st.state = CLOSED; st.fails = 0; }
    context.set('cb', st);
    return [msg, null];
} catch (e) {
    if (++st.fails >= 3) { st.state = OPEN; st.lastFail = Date.now(); }
    context.set('cb', st);
    return [null, msg];
}
```
